// The Whimsical Pig — website back end (Cloudflare Worker)
//
// Static pages (index.html, shop.html, admin.html, ...) are served from the repo
// by Cloudflare's asset hosting. This Worker handles:
//
//   GET  /api/products                  shop items from Square, with stock left
//   POST /api/quote                     cart -> subtotal, shipping, tax and total from Square
//   POST /api/pay                       cart + card token -> Square order and payment, on our page
//   POST /api/checkout                  cart -> Square's own checkout page (used if there's
//                                       no SQUARE_APPLICATION_ID for the on-page card form)
//   POST /api/square-webhook            Square notices: payments, stock and item changes
//   POST /api/order-request             "Start an Order" form -> saved for the admin page
//   POST /api/admin/login | logout      admin password login
//   ... /api/admin/*                    admin page: requests, online orders, items, stock, setup check
//
// Square is the one place for shop items, prices, photos and stock. Anything in
// the Square category named SQUARE_SHOP_CATEGORY ("Website" unless set) shows in
// the online shop, so in-store and online sales come out of the same stock count.
//
// Secrets (Cloudflare dashboard -> Worker -> Settings -> Variables and Secrets):
//   ADMIN_PASSWORD                 password for /admin
//   SQUARE_ACCESS_TOKEN            from the Square Developer app
//   SQUARE_LOCATION_ID             the shop's Square location
// Settings (wrangler.jsonc "vars", not secret):
//   SQUARE_APPLICATION_ID          the Square app's Application ID; turns on the card
//                                  form on our own page
//   SQUARE_LOCATION_ID, SHIPPING_FEE  see below
// Optional:
//   SQUARE_WEBHOOK_SIGNATURE_KEY   from a Square webhook subscription; only needed to
//                                  record payments made on Square's own checkout page
//   SQUARE_ENVIRONMENT             "sandbox" while testing (default: production)
//   SQUARE_SHOP_CATEGORY           Square category shown online (default "Website")
//   SHIPPING_FEE                   flat shipping charge in dollars, e.g. "12.95".
//                                  Not set = pick up at the shop only.
//   SQUARE_WEBHOOK_URL             the webhook URL as typed in Square, if the site
//                                  is reached through a different address

const SQUARE_VERSION = "2026-05-20";
const HOLD_MINUTES = 30;          // stock is held this long while a customer is paying
const CATALOG_SECONDS = 60;       // how long the shop list from Square is reused
const SESSION_DAYS = 7;
const MAX_CART_LINES = 20;
const MAX_QTY = 20;
const LOGIN_TRIES = 8;            // wrong passwords allowed per 15 minutes
const MAX_REQUEST_FILES = 8;
const MAX_REQUEST_FILE_BYTES = 1_900_000;   // D1 rows hold up to 2 MB

const REQUEST_STATUSES = ["new", "quoted", "waiting on items", "in production", "ready", "done"];
const ORDER_STATUSES = ["new", "ready", "done"];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS requests (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ref TEXT NOT NULL,
     type TEXT NOT NULL DEFAULT '',
     name TEXT NOT NULL DEFAULT '',
     email TEXT NOT NULL DEFAULT '',
     phone TEXT NOT NULL DEFAULT '',
     needed_by TEXT NOT NULL DEFAULT '',
     fulfill TEXT NOT NULL DEFAULT '',
     summary TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     note TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  // Customer uploads are kept apart: only the admin can open them.
  `CREATE TABLE IF NOT EXISTS request_files (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     request_id INTEGER NOT NULL,
     name TEXT NOT NULL,
     mime TEXT NOT NULL,
     data BLOB NOT NULL
   )`,
  // Online shop orders. items is JSON: [{ variation_id, name, qty, price_cents }]
  `CREATE TABLE IF NOT EXISTS shop_orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     kind TEXT NOT NULL DEFAULT 'shop',
     items TEXT NOT NULL DEFAULT '[]',
     subtotal_cents INTEGER NOT NULL DEFAULT 0,
     paid_cents INTEGER,
     fulfillment TEXT NOT NULL DEFAULT 'pickup',
     status TEXT NOT NULL DEFAULT 'pending',
     handled TEXT NOT NULL DEFAULT 'new',
     note TEXT NOT NULL DEFAULT '',
     square_order_id TEXT UNIQUE,
     square_payment_id TEXT,
     buyer_name TEXT,
     buyer_email TEXT,
     buyer_phone TEXT,
     ship_to TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     paid_at TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS kv (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     expires_at INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS login_fails (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
];
// Changes to tables that may already exist from an earlier version
const MIGRATIONS = [
  `ALTER TABLE requests ADD COLUMN note TEXT NOT NULL DEFAULT ''`,
  `UPDATE requests SET status = 'in production' WHERE status = 'in progress'`,
];

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
  for (const sql of MIGRATIONS) {
    try { await db.prepare(sql).run(); } catch (e) { /* already applied */ }
  }
  schemaReady = true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path.startsWith("/api/")) {
        await ensureSchema(env.DB);
        return await route(request, env, url, path);
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  },
};

async function route(request, env, url, path) {
  const m = request.method;

  if (path === "/api/products" && m === "GET") return publicProducts(env);
  if (path === "/api/quote" && m === "POST") return quote(request, env);
  if (path === "/api/pay" && m === "POST") return pay(request, env);
  if (path === "/api/checkout" && m === "POST") return checkout(request, env, url);
  if (path === "/api/square-webhook" && m === "POST") return squareWebhook(request, env);
  if (path === "/api/order-request" && m === "POST") return saveOrderRequest(request, env);

  if (path === "/api/admin/login" && m === "POST") return login(request, env);
  if (path === "/api/admin/logout" && m === "POST") return logout();

  if (path.startsWith("/api/admin/")) {
    if (!(await isAdmin(request, env))) return json({ error: "Please log in." }, 401);
    if (path === "/api/admin/me" && m === "GET") return json({ ok: true });
    if (path === "/api/admin/status" && m === "GET") return setupStatus(request, env, url);
    if (path === "/api/admin/products" && m === "GET") return adminProducts(env, url);
    if (path === "/api/admin/stock" && m === "POST") return setStock(request, env);
    if (path === "/api/admin/catalog" && m === "GET") return adminCatalog(env);
    if (path === "/api/admin/items" && m === "POST") return createItem(request, env);
    if (path === "/api/admin/categories" && m === "POST") return createCategory(request, env);
    const im = path.match(/^\/api\/admin\/items\/([A-Za-z0-9_-]{1,64})(\/image)?$/);
    if (im && !im[2] && m === "PUT") return updateItem(request, env, im[1]);
    if (im && im[2] && m === "POST") return uploadItemImage(request, env, im[1]);
    if (path === "/api/admin/orders" && m === "GET") return listOrders(env);
    const om = path.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (om && m === "PUT") return updateOrder(request, env, +om[1]);
    if (path === "/api/admin/requests" && m === "GET") return listRequests(env);
    const rm = path.match(/^\/api\/admin\/requests\/(\d+)$/);
    if (rm && m === "PUT") return updateRequest(request, env, +rm[1]);
    if (rm && m === "DELETE") return deleteRequest(env, +rm[1]);
    const fm = path.match(/^\/api\/admin\/request-files\/(\d+)$/);
    if (fm && m === "GET") return serveRequestFile(env, +fm[1]);
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------- Square catalog

const squareReady = env => !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
const shopCategory = env => (env.SQUARE_SHOP_CATEGORY || "Website").trim();
const shippingCents = env => {
  const n = Math.round(Number(env.SHIPPING_FEE) * 100);
  return env.SHIPPING_FEE && Number.isFinite(n) && n >= 0 ? n : null;
};

// The shop list from Square, reused for CATALOG_SECONDS. If Square can't be
// reached, the last good list is used so the shop keeps working.
async function loadCatalog(env, fresh = false) {
  const cached = await kvGet(env, "catalog");
  if (!fresh && cached && cached.expires_at > Date.now()) return cached.value;
  try {
    const value = await fetchCatalog(env);
    await kvPut(env, "catalog", value, CATALOG_SECONDS);
    return value;
  } catch (err) {
    console.error("Square catalog failed", err.message);
    if (cached) return { ...cached.value, stale: true };
    throw err;
  }
}
const forgetCatalog = env => env.DB.prepare(`DELETE FROM kv WHERE key = 'catalog'`).run();

async function fetchCatalog(env) {
  const loc = env.SQUARE_LOCATION_ID;
  const name = shopCategory(env);
  const found = await squareOk(env, "POST", "/v2/catalog/search", {
    object_types: ["CATEGORY"],
    query: { exact_query: { attribute_name: "name", attribute_value: name } },
  });
  const category = (found.objects || []).find(o => !o.is_deleted);
  if (!category) return { category_found: false, items: [], fetched_at: Date.now() };

  // Every item in the shop category that's sold at this location
  const raw = [];
  let cursor;
  do {
    const page = await squareOk(env, "POST", "/v2/catalog/search-catalog-items", {
      category_ids: [category.id], enabled_location_ids: [loc], limit: 100, ...(cursor ? { cursor } : {}),
    });
    raw.push(...(page.items || []));
    cursor = page.cursor;
  } while (cursor);

  const atLocation = o => !o.is_deleted &&
    !(o.absent_at_location_ids || []).includes(loc) &&
    (o.present_at_all_locations !== false || (o.present_at_location_ids || []).includes(loc));

  const items = [];
  const lookupIds = new Set();
  for (const it of raw) {
    const d = it.item_data || {};
    if (d.is_archived || !atLocation(it)) continue;
    const variations = [];
    for (const v of d.variations || []) {
      const vd = v.item_variation_data || {};
      if (!atLocation(v) || vd.pricing_type === "VARIABLE_PRICING" || !vd.price_money) continue;
      const over = (vd.location_overrides || []).find(o => o.location_id === loc) || {};
      variations.push({
        id: v.id,
        name: vd.name || "",
        price_cents: Number(vd.price_money.amount) || 0,
        tracked: over.track_inventory ?? !!vd.track_inventory,
        sold_out: !!over.sold_out,
        stock: null,
      });
    }
    if (!variations.length) continue;
    const cats = (d.categories || []).map(c => c.id).filter(id => id !== category.id);
    if (d.reporting_category && d.reporting_category.id !== category.id) cats.unshift(d.reporting_category.id);
    const image = (d.image_ids || [])[0] || null;
    if (image) lookupIds.add(image);
    cats.forEach(id => lookupIds.add(id));
    items.push({
      id: it.id,
      name: d.name || "Item",
      description: (d.description_plaintext || "").trim().slice(0, 400),
      ordinal: ((d.categories || []).find(c => c.id === category.id) || {}).ordinal ?? null,
      image, cats, variations,
    });
  }

  // Photo addresses and category names
  const names = {};
  const ids = [...lookupIds];
  for (let i = 0; i < ids.length; i += 1000) {
    const got = await squareOk(env, "POST", "/v2/catalog/batch-retrieve", { object_ids: ids.slice(i, i + 1000) });
    for (const o of got.objects || []) {
      if (o.type === "IMAGE") names[o.id] = (o.image_data || {}).url;
      if (o.type === "CATEGORY") names[o.id] = (o.category_data || {}).name;
    }
  }

  // Stock counts for variations Square tracks
  const counts = await stockCounts(env, items.flatMap(it => it.variations.filter(v => v.tracked).map(v => v.id)));

  for (const it of items) {
    it.image = it.image ? names[it.image] || null : null;
    it.category = it.cats.map(id => names[id]).find(Boolean) || "";
    delete it.cats;
    for (const v of it.variations) if (v.tracked) v.stock = counts[v.id] ?? 0;
  }
  items.sort((a, b) => (a.ordinal ?? 1e9) - (b.ordinal ?? 1e9) || a.name.localeCompare(b.name));
  return { category_found: true, items, fetched_at: Date.now() };
}

// In-stock counts at the shop's location, by variation id
async function stockCounts(env, ids) {
  const counts = {};
  for (let i = 0; i < ids.length; i += 1000) {
    let c;
    do {
      const page = await squareOk(env, "POST", "/v2/inventory/counts/batch-retrieve", {
        catalog_object_ids: ids.slice(i, i + 1000), location_ids: [env.SQUARE_LOCATION_ID], states: ["IN_STOCK"], ...(c ? { cursor: c } : {}),
      });
      for (const n of page.counts || []) counts[n.catalog_object_id] = Math.floor(Number(n.quantity) || 0);
      c = page.cursor;
    } while (c);
  }
  return counts;
}

// Units held by customers who started checkout in the last HOLD_MINUTES
async function heldByVariation(env) {
  const { results } = await env.DB.prepare(
    `SELECT json_extract(j.value, '$.variation_id') AS v, SUM(json_extract(j.value, '$.qty')) AS n
       FROM shop_orders o, json_each(o.items) j
      WHERE o.status = 'pending' AND o.created_at > datetime('now', '-${HOLD_MINUTES} minutes')
      GROUP BY v`
  ).all();
  return Object.fromEntries(results.map(r => [r.v, r.n]));
}

// How many a customer can buy right now: null = no limit (Square isn't counting it)
function available(v, held) {
  if (v.sold_out) return 0;
  if (!v.tracked) return null;
  return Math.max(0, v.stock - (held[v.id] || 0));
}

// ---------------------------------------------------------------- public shop

async function publicProducts(env) {
  const base = { configured: squareReady(env), shipping_fee_cents: shippingCents(env), card: cardForm(env) };
  if (!base.configured) return json({ ...base, products: [] }, 200, { "Cache-Control": "no-store" });
  let catalog;
  try { catalog = await loadCatalog(env); }
  catch { return json({ ...base, products: [], error: "The shop couldn't load. Please try again soon." }, 503); }
  const held = await heldByVariation(env);
  const products = catalog.items.map(it => ({
    id: it.id, name: it.name, description: it.description, category: it.category, image: it.image,
    variations: it.variations.map(v => ({ id: v.id, name: v.name, price_cents: v.price_cents, available: available(v, held) })),
  }));
  return json({ ...base, products }, 200, { "Cache-Control": "no-store" });
}

// Checks a cart against Square's latest prices and stock.
// Returns { items, subtotal, ship, fee }, or { error } with the response to send.
async function readCart(env, body) {
  const wanted = new Map();
  for (const line of Array.isArray(body.items) ? body.items.slice(0, MAX_CART_LINES) : []) {
    const id = String(line && line.variation_id || "");
    const qty = parseInt(line && line.qty, 10);
    if (!id || !(qty > 0)) continue;
    wanted.set(id, Math.min((wanted.get(id) || 0) + qty, MAX_QTY));
  }
  if (!wanted.size) return { error: json({ error: "Your cart is empty." }, 400) };
  const ship = body.fulfillment === "ship";
  const fee = shippingCents(env);
  if (ship && fee === null) return { error: json({ error: "Shipping isn't available online. Please choose pickup or call us." }, 400) };

  // Check against Square's latest stock, not the cached list
  let catalog;
  try { catalog = await loadCatalog(env, true); }
  catch { return { error: json({ error: "Checkout couldn't start. Please try again or call 315-773-3758." }, 502) }; }
  const byId = new Map();
  for (const it of catalog.items) for (const v of it.variations) byId.set(v.id, { item: it, v });
  const held = await heldByVariation(env);

  const items = [];
  for (const [id, qty] of wanted) {
    const hit = byId.get(id);
    if (!hit) return { error: json({ error: "Something in your cart isn't available anymore. Please remove it and try again." }, 409) };
    const label = hit.item.name + (hit.item.variations.length > 1 && hit.v.name ? ` (${hit.v.name})` : "");
    const left = available(hit.v, held);
    if (left !== null && left < qty) {
      return { error: json({ error: left > 0 ? `Only ${left} left of ${label}.` : `Sorry, ${label} just sold out.` }, 409) };
    }
    items.push({ variation_id: id, name: label, qty, price_cents: hit.v.price_cents });
  }
  const subtotal = items.reduce((s, l) => s + l.price_cents * l.qty, 0);
  return { items, subtotal, ship, fee };
}

async function checkout(request, env, url) {
  if (!squareReady(env)) {
    return json({ error: "Online checkout isn't set up yet. Please call 315-773-3758 to order." }, 503);
  }
  const cart = await readCart(env, await readJson(request));
  if (cart.error) return cart.error;
  const { items, subtotal, ship, fee } = cart;

  const pending = await env.DB.prepare(
    `INSERT INTO shop_orders (kind, items, subtotal_cents, fulfillment) VALUES ('shop', ?, ?, ?) RETURNING id`
  ).bind(JSON.stringify(items), subtotal, ship ? "ship" : "pickup").first();

  const res = await squareCall(env, "POST", "/v2/online-checkout/payment-links", {
    idempotency_key: `wp-shop-${pending.id}-${crypto.randomUUID()}`,
    payment_note: `Website order WP-${pending.id} · ${ship ? "Ship" : "Pick up at shop"}`,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      reference_id: `WP-${pending.id}`,
      line_items: items.map(l => ({ catalog_object_id: l.variation_id, quantity: String(l.qty) })),
      pricing_options: { auto_apply_taxes: true, auto_apply_discounts: true },
    },
    checkout_options: {
      redirect_url: `${url.origin}/shop.html?thanks=WP-${pending.id}`,
      ask_for_shipping_address: ship,
      ...(ship ? { shipping_fee: { name: "Shipping", charge: { amount: fee, currency: "USD" } } } : {}),
    },
  });
  return finishPaymentLink(env, res, pending.id);
}

// ---------------------------------------------------------------- paying on our page

// What the shop page needs to show Square's card form (all public values)
function cardForm(env) {
  if (!squareReady(env) || !env.SQUARE_APPLICATION_ID) return null;
  return {
    application_id: env.SQUARE_APPLICATION_ID,
    location_id: env.SQUARE_LOCATION_ID,
    sdk: env.SQUARE_ENVIRONMENT === "sandbox"
      ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js",
  };
}

// A Square order for a cart: items by catalog id (so Square lowers its stock),
// shipping as a service charge, taxes from the items' settings in Square, and,
// when we know the buyer, a pickup or shipment so it shows in Square's Orders.
function squareOrder(env, ref, cart, buyer) {
  const order = {
    location_id: env.SQUARE_LOCATION_ID,
    reference_id: ref,
    line_items: cart.items.map(l => ({ catalog_object_id: l.variation_id, quantity: String(l.qty) })),
    pricing_options: { auto_apply_taxes: true, auto_apply_discounts: true },
  };
  if (cart.ship) {
    order.service_charges = [{
      name: "Shipping", amount_money: { amount: cart.fee, currency: "USD" },
      calculation_phase: "SUBTOTAL_PHASE", taxable: false,
    }];
  }
  if (buyer) {
    const recipient = { display_name: buyer.name, email_address: buyer.email, ...(buyer.phone ? { phone_number: buyer.phone } : {}) };
    order.fulfillments = [cart.ship
      ? { type: "SHIPMENT", state: "PROPOSED", shipment_details: { recipient: { ...recipient, address: buyer.address } } }
      : { type: "PICKUP", state: "PROPOSED", pickup_details: { recipient, schedule_type: "ASAP", note: `Website order ${ref}` } }];
  }
  return order;
}

// Subtotal, shipping, tax and total for the cart, worked out by Square
async function quote(request, env) {
  if (!squareReady(env)) return json({ error: "Online checkout isn't set up yet." }, 503);
  const cart = await readCart(env, await readJson(request));
  if (cart.error) return cart.error;
  const r = await squareCall(env, "POST", "/v2/orders/calculate", { order: squareOrder(env, "quote", cart) });
  if (!r.ok || !r.data.order) {
    console.error("Square calculate failed", r.status, JSON.stringify(r.data));
    return json({ error: "We couldn't total your order. Please try again." }, 502);
  }
  const o = r.data.order;
  return json({
    subtotal_cents: cart.subtotal,
    shipping_cents: Number(o.total_service_charge_money?.amount) || 0,
    tax_cents: Number(o.total_tax_money?.amount) || 0,
    total_cents: Number(o.total_money?.amount) || 0,
  }, 200, { "Cache-Control": "no-store" });
}

// The buyer's details from the checkout form, or an error message
function readBuyer(b, ship) {
  const t = (v, n = 120) => String(v || "").trim().slice(0, n);
  const buyer = { name: t(b.name), email: t(b.email), phone: t(b.phone, 30) };
  if (!buyer.name) return { error: "Please add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) return { error: "Please add a valid email for your receipt." };
  if (buyer.phone.replace(/\D/g, "").length < 7) return { error: "Please add a phone number in case we have a question about your order." };
  if (ship) {
    const a = b.address || {};
    buyer.address = {
      address_line_1: t(a.line1), address_line_2: t(a.line2), locality: t(a.city, 60),
      administrative_district_level_1: t(a.state, 30), postal_code: t(a.zip, 12), country: "US",
    };
    if (!buyer.address.address_line_1 || !buyer.address.locality || !buyer.address.administrative_district_level_1 || !buyer.address.postal_code) {
      return { error: "Please fill in the whole shipping address." };
    }
    if (!buyer.address.address_line_2) delete buyer.address.address_line_2;
  }
  return { buyer };
}

const shipText = (name, a) => a ? [name, a.address_line_1, a.address_line_2,
  [a.locality, a.administrative_district_level_1, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join("\n") : null;

// Plain words for Square's card errors
function cardError(data) {
  const code = ((data && data.errors) || [])[0]?.code || "";
  const words = {
    CARD_DECLINED: "Your card was declined. Please try another card.",
    GENERIC_DECLINE: "Your card was declined. Please try another card.",
    INSUFFICIENT_FUNDS: "Your card was declined for insufficient funds.",
    CVV_FAILURE: "The security code (CVV) didn't match. Please check it and try again.",
    ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card. Please check it and try again.",
    INVALID_EXPIRATION: "The card's expiration date isn't right. Please check it.",
    INVALID_CARD: "That card number isn't valid. Please check it.",
    CARD_EXPIRED: "That card has expired. Please use another card.",
    TRANSACTION_LIMIT: "Your card's limit was reached. Please try another card.",
    CARD_DECLINED_VERIFICATION_REQUIRED: "Your bank needs to verify this payment. Please try again.",
  };
  return words[code] || "The payment didn't go through. Please check your card and try again, or call 315-773-3758.";
}

// Pay for a cart with the card the customer typed into Square's form on our page
async function pay(request, env) {
  if (!cardForm(env)) return json({ error: "Card payments aren't set up yet. Please call 315-773-3758." }, 503);
  const b = await readJson(request);
  const sourceId = String(b.source_id || "");
  if (!sourceId) return json({ error: "Please enter your card details." }, 400);
  const { buyer, error } = readBuyer(b, b.fulfillment === "ship");
  if (error) return json({ error }, 400);
  const cart = await readCart(env, b);
  if (cart.error) return cart.error;

  const pending = await env.DB.prepare(
    `INSERT INTO shop_orders (kind, items, subtotal_cents, fulfillment, buyer_name, buyer_email, buyer_phone, ship_to)
       VALUES ('shop', ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(JSON.stringify(cart.items), cart.subtotal, cart.ship ? "ship" : "pickup", buyer.name, buyer.email,
         buyer.phone || null, cart.ship ? shipText(buyer.name, buyer.address) : null).first();
  const ref = `WP-${pending.id}`;
  const fail = async (status, message) => {
    await env.DB.prepare(`UPDATE shop_orders SET status = 'failed' WHERE id = ?`).bind(pending.id).run();
    return json({ error: message }, status);
  };

  const made = await squareCall(env, "POST", "/v2/orders", {
    idempotency_key: `wp-order-${pending.id}`, order: squareOrder(env, ref, cart, buyer),
  });
  if (!made.ok || !made.data.order) {
    console.error("Square order failed", made.status, JSON.stringify(made.data));
    return fail(502, "Checkout couldn't start. Please try again or call 315-773-3758.");
  }
  const order = made.data.order;
  await env.DB.prepare(`UPDATE shop_orders SET square_order_id = ? WHERE id = ?`).bind(order.id, pending.id).run();

  const paid = await squareCall(env, "POST", "/v2/payments", {
    source_id: sourceId,
    idempotency_key: `wp-pay-${pending.id}`,
    amount_money: order.total_money,
    order_id: order.id,
    location_id: env.SQUARE_LOCATION_ID,
    autocomplete: true,
    reference_id: ref,
    note: `Website order ${ref} · ${cart.ship ? "Ship" : "Pick up at shop"}`,
    buyer_email_address: buyer.email,
    ...(cart.ship ? { shipping_address: buyer.address } : {}),
    ...(b.verification_token ? { verification_token: String(b.verification_token) } : {}),
  });
  const payment = paid.data && paid.data.payment;
  if (!paid.ok || !payment || !["COMPLETED", "APPROVED"].includes(payment.status)) {
    console.error("Square payment failed", paid.status, JSON.stringify(paid.data));
    return fail(402, cardError(paid.data));
  }
  await env.DB.prepare(
    `UPDATE shop_orders SET status = 'paid', paid_at = datetime('now'), square_payment_id = ?, paid_cents = ? WHERE id = ?`
  ).bind(payment.id, Number(payment.total_money?.amount) || Number(order.total_money?.amount) || null, pending.id).run();
  await forgetCatalog(env);
  return json({ ok: true, ref, total_cents: Number(order.total_money?.amount) || 0, receipt_url: payment.receipt_url || null });
}

async function finishPaymentLink(env, res, id) {
  if (!res.ok || !res.data.payment_link) {
    console.error("Square payment link failed", res.status, JSON.stringify(res.data));
    await env.DB.prepare(`UPDATE shop_orders SET status = 'failed' WHERE id = ?`).bind(id).run();
    return json({ error: "Checkout couldn't start. Please try again or call 315-773-3758." }, 502);
  }
  const link = res.data.payment_link;
  await env.DB.prepare(`UPDATE shop_orders SET square_order_id = ? WHERE id = ?`).bind(link.order_id, id).run();
  return json({ url: link.url });
}

// ---------------------------------------------------------------- Square notices

// Square tells us when payments complete and when items or stock change.
// Verify it really came from Square before trusting anything in it.
async function squareWebhook(request, env) {
  const raw = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") || "";
  const notificationUrl = env.SQUARE_WEBHOOK_URL || request.url;
  if (!env.SQUARE_WEBHOOK_SIGNATURE_KEY ||
      !(await validSquareSignature(env.SQUARE_WEBHOOK_SIGNATURE_KEY, notificationUrl, raw, signature))) {
    return json({ error: "Invalid signature" }, 401);
  }
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "Bad JSON" }, 400); }
  await kvPut(env, "last_webhook", { at: Date.now(), type: event.type || "" }, 0);

  const type = String(event.type || "");
  if (type.startsWith("inventory.") || type.startsWith("catalog.")) {
    await forgetCatalog(env);               // the shop shows the change right away
    return json({ ok: true });
  }

  const payment = event?.data?.object?.payment;
  if (!payment || payment.status !== "COMPLETED" || !payment.order_id) return json({ ok: true });
  const order = await env.DB.prepare(`SELECT id FROM shop_orders WHERE square_order_id = ?`).bind(payment.order_id).first();
  if (!order) return json({ ok: true });   // not from the website (e.g. an in-store sale)

  // Square lowers its own stock for the items sold; this just records the sale.
  const a = payment.shipping_address || payment.billing_address || {};
  const name = [a.first_name, a.last_name].filter(Boolean).join(" ");
  const shipTo = payment.shipping_address
    ? [name, a.address_line_1, a.address_line_2, [a.locality, a.administrative_district_level_1, a.postal_code].filter(Boolean).join(" ")]
        .filter(Boolean).join("\n")
    : null;
  await env.DB.prepare(
    `UPDATE shop_orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')), square_payment_id = ?,
            paid_cents = ?, buyer_email = COALESCE(?, buyer_email), buyer_name = COALESCE(buyer_name, ?),
            buyer_phone = COALESCE(?, buyer_phone), ship_to = COALESCE(?, ship_to)
      WHERE id = ?`
  ).bind(payment.id || null, Number(payment.total_money?.amount) || null, payment.buyer_email_address || null,
         name || null, payment.buyer_phone_number || null, shipTo, order.id).run();
  await forgetCatalog(env);
  return json({ ok: true });
}

async function validSquareSignature(key, notificationUrl, body, signature) {
  const mac = await hmac(key, notificationUrl + body);
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(expected, signature);
}

async function squareCall(env, method, path, payload) {
  const base = env.SQUARE_API_BASE ||
    (env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com");
  const r = await fetch(base + path, {
    method,
    headers: {
      "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  let data = {};
  try { data = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data };
}
// Same, but throws with Square's own message when the call fails
async function squareOk(env, method, path, payload) {
  const r = await squareCall(env, method, path, payload);
  if (!r.ok) {
    const e = (r.data.errors || [])[0] || {};
    throw new Error(`Square ${r.status}: ${e.detail || e.code || "request failed"}`);
  }
  return r.data;
}

// ---------------------------------------------------------------- order requests

async function saveOrderRequest(request, env) {
  let form;
  try { form = await request.formData(); } catch { return json({ error: "Couldn't read the form." }, 400); }
  if (form.get("website")) return json({ ok: true });          // hidden field only bots fill in
  const field = (k, max = 200) => String(form.get(k) || "").trim().slice(0, max);
  const summary = field("summary", 20000);
  const ref = field("ref", 40);
  if (!summary || !ref) return json({ error: "The order was empty." }, 400);

  const files = form.getAll("photos").filter(f => f && typeof f === "object" && f.size > 0);
  if (files.length > MAX_REQUEST_FILES) return json({ error: `Please send ${MAX_REQUEST_FILES} files or fewer.` }, 413);
  for (const f of files) {
    if (f.size > MAX_REQUEST_FILE_BYTES) return json({ error: `"${f.name}" is too large. Please send a smaller copy.` }, 413);
    if (!/^(image\/(jpeg|png|webp|gif|heic|heif)|application\/pdf)$/.test(f.type)) {
      return json({ error: `"${f.name}" isn't a photo or PDF.` }, 415);
    }
  }

  const row = await env.DB.prepare(
    `INSERT INTO requests (ref, type, name, email, phone, needed_by, fulfill, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(ref, field("type", 80), field("name"), field("email"), field("phone", 40),
         field("needed_by", 40), field("fulfill", 80), summary).first();
  for (const f of files) {
    await env.DB.prepare(`INSERT INTO request_files (request_id, name, mime, data) VALUES (?, ?, ?, ?)`)
      .bind(row.id, String(f.name).slice(0, 120), f.type, await f.arrayBuffer()).run();
  }
  return json({ ok: true, id: row.id });
}

async function listRequests(env) {
  const { results } = await env.DB.prepare(
    `SELECT r.*, (SELECT json_group_array(json_object('id', f.id, 'name', f.name, 'mime', f.mime))
                    FROM request_files f WHERE f.request_id = r.id) AS files
       FROM requests r ORDER BY r.id DESC LIMIT 500`
  ).all();
  for (const r of results) r.files = JSON.parse(r.files || "[]");
  return json({ requests: results, statuses: REQUEST_STATUSES }, 200, { "Cache-Control": "no-store" });
}

async function updateRequest(request, env, id) {
  const b = await readJson(request);
  const sets = [], vals = [];
  if (b.status !== undefined) {
    if (!REQUEST_STATUSES.includes(b.status)) return json({ error: "Unknown status." }, 400);
    sets.push("status = ?"); vals.push(b.status);
  }
  if (b.note !== undefined) { sets.push("note = ?"); vals.push(String(b.note).slice(0, 4000)); }
  if (b.needed_by !== undefined) { sets.push("needed_by = ?"); vals.push(String(b.needed_by).slice(0, 40)); }
  if (!sets.length) return json({ error: "Nothing to change." }, 400);
  const r = await env.DB.prepare(`UPDATE requests SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
  if (!r.meta.changes) return json({ error: "Request not found." }, 404);
  return json({ ok: true });
}

async function deleteRequest(env, id) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM request_files WHERE request_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM requests WHERE id = ?`).bind(id),
  ]);
  return json({ ok: true });
}

async function serveRequestFile(env, id) {
  const f = await env.DB.prepare(`SELECT name, mime, data FROM request_files WHERE id = ?`).bind(id).first();
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `inline; filename="${f.name.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ---------------------------------------------------------------- admin

async function login(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Admin password isn't set up yet (ADMIN_PASSWORD)." }, 503);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const since = Date.now() - 15 * 60_000;
  const fails = await env.DB.prepare(`SELECT COUNT(*) AS n FROM login_fails WHERE ip = ? AND at > ?`).bind(ip, since).first();
  if (fails.n >= LOGIN_TRIES) return json({ error: "Too many tries. Please wait 15 minutes." }, 429);

  const body = await readJson(request);
  await new Promise(r => setTimeout(r, 300));     // small delay makes password guessing slower
  if (!timingSafeEqual(String(body.password || ""), env.ADMIN_PASSWORD)) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO login_fails (ip, at) VALUES (?, ?)`).bind(ip, Date.now()),
      env.DB.prepare(`DELETE FROM login_fails WHERE at < ?`).bind(Date.now() - 86400_000),
    ]);
    return json({ error: "That password isn't right." }, 401);
  }
  await env.DB.prepare(`DELETE FROM login_fails WHERE ip = ?`).bind(ip).run();
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  const token = `${expires}.${await sign(env, String(expires))}`;
  return json({ ok: true }, 200, {
    "Set-Cookie": `wp_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`,
  });
}

function logout() {
  return json({ ok: true }, 200, { "Set-Cookie": "wp_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/(?:^|;\s*)wp_admin=(\d+)\.([A-Za-z0-9_-]+)/);
  if (!m || +m[1] < Date.now()) return false;
  return timingSafeEqual(await sign(env, m[1]), m[2]);
}

async function sign(env, value) {
  const mac = await hmac("wp-admin-session:" + env.ADMIN_PASSWORD, value);
  return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Setup checklist for the admin page: what's connected and what's missing
async function setupStatus(request, env, url) {
  const checks = [];
  const add = (key, ok, text) => checks.push({ key, ok, text });
  const sandbox = env.SQUARE_ENVIRONMENT === "sandbox";
  add("password", true, "Admin password is set.");
  add("token", !!env.SQUARE_ACCESS_TOKEN, env.SQUARE_ACCESS_TOKEN
    ? `Square access token is set (${sandbox ? "sandbox, for testing" : "live payments"}).`
    : "Add the Square access token (SQUARE_ACCESS_TOKEN).");
  if (!env.SQUARE_LOCATION_ID) {
    add("location", false, "Add the Square location ID (SQUARE_LOCATION_ID).");
  } else if (env.SQUARE_ACCESS_TOKEN) {
    const r = await squareCall(env, "GET", `/v2/locations/${encodeURIComponent(env.SQUARE_LOCATION_ID)}`);
    add("location", r.ok, r.ok
      ? `Connected to Square location "${r.data.location?.name || env.SQUARE_LOCATION_ID}".`
      : `Square didn't accept the token or location ID (${r.status}). Check both.`);
  }
  if (squareReady(env)) {
    try {
      const c = await loadCatalog(env, true);
      add("category", c.category_found, c.category_found
        ? `${c.items.length} item${c.items.length === 1 ? "" : "s"} in the Square category "${shopCategory(env)}".`
        : `Make a category named "${shopCategory(env)}" in Square and add the items to sell online.`);
    } catch (e) {
      add("category", false, `Couldn't read items from Square: ${e.message}`);
    }
  }
  add("card_form", !!env.SQUARE_APPLICATION_ID, env.SQUARE_APPLICATION_ID
    ? "Customers pay by card right on the shop page."
    : "Add the Square Application ID (SQUARE_APPLICATION_ID) so customers can pay on the shop page instead of on Square's.");
  if (env.SQUARE_APPLICATION_ID) {
    add("webhook_key", true, env.SQUARE_WEBHOOK_SIGNATURE_KEY
      ? "Square webhook is set (optional with on-page payments)."
      : "Square webhook: not needed. Payments on the shop page are recorded right away.");
  } else {
    add("webhook_key", !!env.SQUARE_WEBHOOK_SIGNATURE_KEY, env.SQUARE_WEBHOOK_SIGNATURE_KEY
      ? "Square webhook signature key is set."
      : "Add the webhook signature key (SQUARE_WEBHOOK_SIGNATURE_KEY) so paid orders show up here.");
    const last = await kvGet(env, "last_webhook");
    add("webhook_seen", !!last, last
      ? `Last notice from Square: ${new Date(last.value.at).toISOString().slice(0, 16).replace("T", " ")} UTC (${last.value.type}).`
      : `No notices from Square yet. Webhook URL: ${env.SQUARE_WEBHOOK_URL || url.origin + "/api/square-webhook"}`);
  }
  const fee = shippingCents(env);
  add("shipping", true, fee === null ? "Shop orders are pick up only (set SHIPPING_FEE to offer shipping)."
                                     : `Shipping is offered for $${(fee / 100).toFixed(2)}.`);
  return json({
    checks,
    dashboard: sandbox ? "https://squareupsandbox.com/dashboard" : "https://app.squareup.com/dashboard",
    category: shopCategory(env),
  }, 200, { "Cache-Control": "no-store" });
}

async function adminProducts(env, url) {
  if (!squareReady(env)) return json({ configured: false, items: [] });
  let catalog;
  try { catalog = await loadCatalog(env, url.searchParams.has("fresh")); }
  catch (e) { return json({ error: `Couldn't read items from Square: ${e.message}` }, 502); }
  const held = await heldByVariation(env);
  const items = catalog.items.map(it => ({
    ...it, variations: it.variations.map(v => ({ ...v, held: held[v.id] || 0, available: available(v, held) })),
  }));
  return json({ configured: true, category_found: catalog.category_found, category: shopCategory(env),
                stale: !!catalog.stale, items }, 200, { "Cache-Control": "no-store" });
}

// Set the in-stock count for one shop item in Square
async function setStock(request, env) {
  if (!squareReady(env)) return json({ error: "Square isn't connected yet." }, 503);
  const b = await readJson(request);
  const id = String(b.variation_id || "");
  const count = parseInt(b.count, 10);
  if (!Number.isInteger(count) || count < 0 || count > 100000) return json({ error: "Enter a count of 0 or more." }, 400);
  const catalog = await loadCatalog(env);
  const known = catalog.items.some(it => it.variations.some(v => v.id === id && v.tracked));
  if (!known) return json({ error: "Turn on stock tracking for this item in Square first." }, 400);
  const r = await squareCall(env, "POST", "/v2/inventory/changes/batch-create", {
    idempotency_key: crypto.randomUUID(),
    changes: [{
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: id, location_id: env.SQUARE_LOCATION_ID, state: "IN_STOCK",
        quantity: String(count), occurred_at: new Date().toISOString(),
      },
    }],
  });
  if (!r.ok) {
    const e = (r.data.errors || [])[0] || {};
    return json({ error: `Square didn't save it: ${e.detail || r.status}` }, 502);
  }
  await forgetCatalog(env);
  return json({ ok: true });
}

// ---------------------------------------------------------------- items (admin)
// The admin page adds and edits items here; they're saved in Square, so the
// register and the website stay the same.

const BIG_SIZE = /^(2|3|4|5)\s?X\s?L$|^X{2,5}L$/i;
const cleanText = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

async function searchAll(env, body) {
  const objects = [], related = [];
  let cursor;
  do {
    const page = await squareOk(env, "POST", "/v2/catalog/search", { ...body, ...(cursor ? { cursor } : {}) });
    objects.push(...(page.objects || []));
    related.push(...(page.related_objects || []));
    cursor = page.cursor;
  } while (cursor);
  return { objects, related };
}

// The Square category that puts items on the website, made if it's missing
async function websiteCategoryId(env, make) {
  const found = await squareOk(env, "POST", "/v2/catalog/search", {
    object_types: ["CATEGORY"], query: { exact_query: { attribute_name: "name", attribute_value: shopCategory(env) } },
  });
  const hit = (found.objects || []).find(o => !o.is_deleted && ((o.category_data || {}).name || "").toLowerCase() === shopCategory(env).toLowerCase());
  if (hit || !make) return hit ? hit.id : null;
  const made = await squareOk(env, "POST", "/v2/catalog/object", {
    idempotency_key: crypto.randomUUID(),
    object: { type: "CATEGORY", id: "#website", category_data: { name: shopCategory(env) } },
  });
  return made.catalog_object.id;
}

// Everything in Square (not only what's online), for the admin page
async function adminCatalog(env) {
  if (!squareReady(env)) return json({ configured: false, items: [] });
  try {
    const [{ objects, related }, cats, taxes] = await Promise.all([
      searchAll(env, { object_types: ["ITEM"], include_related_objects: true, limit: 200 }),
      searchAll(env, { object_types: ["CATEGORY"], limit: 1000 }),
      searchAll(env, { object_types: ["TAX"], limit: 1000 }),
    ]);
    const names = {};
    for (const o of [...related, ...cats.objects]) {
      if (o.type === "CATEGORY") names[o.id] = (o.category_data || {}).name;
      if (o.type === "IMAGE") names[o.id] = (o.image_data || {}).url;
    }
    const website = cats.objects.find(c => ((c.category_data || {}).name || "").toLowerCase() === shopCategory(env).toLowerCase());
    const items = objects.filter(o => !o.is_deleted && !(o.item_data || {}).is_archived).map(o => {
      const d = o.item_data || {};
      const catIds = (d.categories || []).map(c => c.id);
      return {
        id: o.id, name: d.name || "Item", description: (d.description_plaintext || d.description || "").trim(),
        image: names[(d.image_ids || [])[0]] || null,
        online: !!website && catIds.includes(website.id),
        categories: catIds.filter(id => !website || id !== website.id).map(id => ({ id, name: names[id] || "" })),
        tax_ids: d.tax_ids || [],
        variations: (d.variations || []).filter(v => !v.is_deleted).map(v => {
          const vd = v.item_variation_data || {};
          const over = (vd.location_overrides || []).find(x => x.location_id === env.SQUARE_LOCATION_ID) || {};
          return { id: v.id, name: vd.name || "", price_cents: vd.price_money ? Number(vd.price_money.amount) : null,
                   tracked: over.track_inventory ?? !!vd.track_inventory, stock: null };
        }),
      };
    });
    const counts = await stockCounts(env, items.flatMap(it => it.variations.filter(v => v.tracked).map(v => v.id)));
    for (const it of items) for (const v of it.variations) if (v.tracked) v.stock = counts[v.id] ?? 0;
    items.sort((a, b) => a.name.localeCompare(b.name));
    const held = await heldByVariation(env);
    for (const it of items) for (const v of it.variations) v.held = held[v.id] || 0;
    return json({
      configured: true, website_category: shopCategory(env), items,
      categories: cats.objects.filter(c => !c.is_deleted && (!website || c.id !== website.id))
        .map(c => ({ id: c.id, name: (c.category_data || {}).name || "" })).sort((a, b) => a.name.localeCompare(b.name)),
      taxes: taxes.objects.filter(t => !t.is_deleted && (t.tax_data || {}).enabled !== false)
        .map(t => ({ id: t.id, name: t.tax_data.name, percentage: t.tax_data.percentage, inclusive: t.tax_data.inclusion_type === "INCLUSIVE" })),
    }, 200, { "Cache-Control": "no-store" });
  } catch (e) {
    return json({ error: `Couldn't read items from Square: ${e.message}` }, 502);
  }
}

// Read and check the add / edit item form
function readItemForm(b, creating) {
  const out = {};
  if (creating || b.name !== undefined) {
    out.name = cleanText(b.name, 120);
    if (!out.name) return { error: "Give the item a name." };
  }
  if (b.description !== undefined) out.description = cleanText(b.description, 1000);
  const money = (v, label) => {
    if (v === undefined || v === null || v === "") return null;
    const c = Math.round(Number(String(v).replace(/[$,\s]/g, "")) * 100);
    if (!Number.isFinite(c) || c < 50 || c > 1000000) throw new Error(`Enter ${label} of at least $0.50.`);
    return c;
  };
  try {
    out.price = money(b.price, "a price");
    out.big_price = money(b.big_price, "a 2XL-and-up price");
  } catch (e) { return { error: e.message }; }
  if (creating && out.price === null && !b.price_at_register) return { error: "Enter a price, or choose \"price entered at the register\"." };
  if (creating) {
    const sizes = (Array.isArray(b.sizes) ? b.sizes : []).map(x => cleanText(x, 30)).filter(Boolean);
    out.sizes = [...new Set(sizes)].slice(0, 20);
    if (!out.sizes.length) out.sizes = ["Regular"];
  }
  return { form: out };
}

async function createItem(request, env) {
  if (!squareReady(env)) return json({ error: "Square isn't connected yet." }, 503);
  const b = await readJson(request);
  const { form, error } = readItemForm(b, true);
  if (error) return json({ error }, 400);
  const objects = [];
  let categoryId = cleanText(b.category_id, 64) || null;
  const newCategory = cleanText(b.new_category, 80);
  if (!categoryId && newCategory) {
    categoryId = "#category";
    objects.push({ type: "CATEGORY", id: "#category", category_data: { name: newCategory } });
  }
  const cats = [];
  if (categoryId) cats.push({ id: categoryId });
  if (b.online) cats.push({ id: await websiteCategoryId(env, true) });
  const track = !!b.track;
  objects.push({
    type: "ITEM", id: "#item", present_at_all_locations: true,
    item_data: {
      name: form.name,
      ...(form.description ? { description: form.description } : {}),
      product_type: "REGULAR",
      ...(cats.length ? { categories: cats } : {}),
      ...(categoryId ? { reporting_category: { id: categoryId } } : {}),
      ...(b.tax_id ? { tax_ids: [cleanText(b.tax_id, 64)] } : {}),
      variations: form.sizes.map((size, i) => {
        const cents = BIG_SIZE.test(size) && form.big_price ? form.big_price : form.price;
        return {
          type: "ITEM_VARIATION", id: `#v${i}`, present_at_all_locations: true,
          item_variation_data: {
            item_id: "#item", name: size, track_inventory: track,
            ...(cents ? { pricing_type: "FIXED_PRICING", price_money: { amount: cents, currency: "USD" } } : { pricing_type: "VARIABLE_PRICING" }),
          },
        };
      }),
    },
  });
  const r = await squareCall(env, "POST", "/v2/catalog/batch-upsert", { idempotency_key: crypto.randomUUID(), batches: [{ objects }] });
  if (!r.ok) {
    const e = (r.data.errors || [])[0] || {};
    return json({ error: `Square didn't save it: ${e.detail || r.status}` }, 502);
  }
  const id = ((r.data.id_mappings || []).find(m => m.client_object_id === "#item") || {}).object_id;
  await forgetCatalog(env);
  return json({ ok: true, id });
}

// A new event or partner category
async function createCategory(request, env) {
  if (!squareReady(env)) return json({ error: "Square isn't connected yet." }, 503);
  const name = cleanText((await readJson(request)).name, 80);
  if (!name) return json({ error: "Name the new event or partner." }, 400);
  const r = await squareCall(env, "POST", "/v2/catalog/object", {
    idempotency_key: crypto.randomUUID(), object: { type: "CATEGORY", id: "#category", category_data: { name } },
  });
  if (!r.ok) {
    const e = (r.data.errors || [])[0] || {};
    return json({ error: `Square didn't save it: ${e.detail || r.status}` }, 502);
  }
  return json({ ok: true, id: r.data.catalog_object.id });
}

// Edit an item: name, description, event, price, on the website or not, stock tracking
async function updateItem(request, env, id) {
  if (!squareReady(env)) return json({ error: "Square isn't connected yet." }, 503);
  const b = await readJson(request);
  const { form, error } = readItemForm(b, false);
  if (error) return json({ error }, 400);
  const got = await squareCall(env, "GET", `/v2/catalog/object/${encodeURIComponent(id)}`);
  const obj = got.data && got.data.object;
  if (!got.ok || !obj || obj.type !== "ITEM") return json({ error: "That item isn't in Square anymore." }, 404);
  const d = obj.item_data;
  if (form.name) d.name = form.name;
  if (form.description !== undefined) {
    d.description = form.description;
    delete d.description_html;
    delete d.description_plaintext;
  }
  const websiteId = b.online !== undefined || b.category_id !== undefined ? await websiteCategoryId(env, !!b.online) : null;
  let cats = (d.categories || []).map(c => c.id);
  if (b.category_id !== undefined) {
    const keep = cats.filter(c => c === websiteId);
    const chosen = cleanText(b.category_id, 64);
    cats = chosen ? [chosen, ...keep] : keep;
    if (chosen) d.reporting_category = { id: chosen }; else delete d.reporting_category;
  }
  if (b.online !== undefined && websiteId) {
    cats = cats.filter(c => c !== websiteId);
    if (b.online) cats.push(websiteId);
  }
  d.categories = cats.map(c => ({ id: c }));
  for (const v of d.variations || []) {
    const vd = v.item_variation_data;
    if (form.price !== null) {
      const cents = BIG_SIZE.test(vd.name || "") && form.big_price ? form.big_price : form.price;
      vd.pricing_type = "FIXED_PRICING";
      vd.price_money = { amount: cents, currency: "USD" };
    }
    if (b.track !== undefined) {
      vd.track_inventory = !!b.track;
      for (const o of vd.location_overrides || []) if (o.location_id === env.SQUARE_LOCATION_ID) o.track_inventory = !!b.track;
    }
  }
  const r = await squareCall(env, "POST", "/v2/catalog/object", { idempotency_key: crypto.randomUUID(), object: obj });
  if (!r.ok) {
    const e = (r.data.errors || [])[0] || {};
    return json({ error: `Square didn't save it: ${e.detail || r.status}` }, 502);
  }
  await forgetCatalog(env);
  return json({ ok: true });
}

// A photo for an item, sent straight on to Square
async function uploadItemImage(request, env, id) {
  if (!squareReady(env)) return json({ error: "Square isn't connected yet." }, 503);
  const type = (request.headers.get("Content-Type") || "").split(";")[0];
  if (!/^image\/(jpeg|png|gif)$/.test(type)) return json({ error: "Use a JPG, PNG or GIF photo." }, 400);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 14_000_000) return json({ error: "That photo is too large." }, 413);
  const fd = new FormData();
  fd.append("request", new Blob([JSON.stringify({
    idempotency_key: crypto.randomUUID(), object_id: id, is_primary: true,
    image: { type: "IMAGE", id: "#image", image_data: { name: "Website photo" } },
  })], { type: "application/json" }));
  fd.append("image_file", new Blob([bytes], { type }), "photo." + type.split("/")[1]);
  const base = env.SQUARE_API_BASE ||
    (env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com");
  const r = await fetch(base + "/v2/catalog/images", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Square-Version": SQUARE_VERSION },
    body: fd,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = (data.errors || [])[0] || {};
    return json({ error: `Square didn't take the photo: ${e.detail || r.status}` }, 502);
  }
  await forgetCatalog(env);
  return json({ ok: true, url: (data.image && data.image.image_data || {}).url || null });
}

async function listOrders(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, kind, items, subtotal_cents, paid_cents, fulfillment, status, handled, note,
            buyer_name, buyer_email, buyer_phone, ship_to, created_at, paid_at
       FROM shop_orders
      WHERE status = 'paid' OR (status = 'pending' AND created_at > datetime('now', '-${HOLD_MINUTES} minutes'))
      ORDER BY id DESC LIMIT 300`
  ).all();
  for (const o of results) o.items = JSON.parse(o.items || "[]");
  return json({ orders: results, statuses: ORDER_STATUSES }, 200, { "Cache-Control": "no-store" });
}

async function updateOrder(request, env, id) {
  const b = await readJson(request);
  const sets = [], vals = [];
  if (b.handled !== undefined) {
    if (!ORDER_STATUSES.includes(b.handled)) return json({ error: "Unknown status." }, 400);
    sets.push("handled = ?"); vals.push(b.handled);
  }
  if (b.note !== undefined) { sets.push("note = ?"); vals.push(String(b.note).slice(0, 4000)); }
  if (!sets.length) return json({ error: "Nothing to change." }, 400);
  const r = await env.DB.prepare(`UPDATE shop_orders SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
  if (!r.meta.changes) return json({ error: "Order not found." }, 404);
  return json({ ok: true });
}

// ---------------------------------------------------------------- helpers

async function kvGet(env, key) {
  const row = await env.DB.prepare(`SELECT value, expires_at FROM kv WHERE key = ?`).bind(key).first();
  return row ? { value: JSON.parse(row.value), expires_at: row.expires_at } : null;
}
function kvPut(env, key, value, seconds) {
  return env.DB.prepare(`INSERT OR REPLACE INTO kv (key, value, expires_at) VALUES (?, ?, ?)`)
    .bind(key, JSON.stringify(value), seconds ? Date.now() + seconds * 1000 : 0).run();
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function hmac(key, message) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
}

function timingSafeEqual(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
