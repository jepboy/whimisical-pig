// The Whimsical Pig — website back end (Cloudflare Worker)
//
// Static pages (index.html, shop.html, admin.html, ...) are served from the repo
// by Cloudflare's asset hosting. This Worker handles:
//
//   GET  /api/products                  shop items from Square, with stock left
//   POST /api/checkout                  cart -> Square checkout page
//   POST /api/quickpay                  amount -> Square checkout page (invoices, deposits)
//   POST /api/square-webhook            Square notices: payments, stock and item changes
//   POST /api/order-request             "Start an Order" form -> saved for the admin page
//   POST /api/admin/login | logout      admin password login
//   ... /api/admin/*                    admin page: requests, online orders, stock, setup check
//
// Square is the one place for shop items, prices, photos and stock. Anything in
// the Square category named SQUARE_SHOP_CATEGORY ("Website" unless set) shows in
// the online shop, so in-store and online sales come out of the same stock count.
//
// Secrets (Cloudflare dashboard -> Worker -> Settings -> Variables and Secrets):
//   ADMIN_PASSWORD                 password for /admin
//   SQUARE_ACCESS_TOKEN            from the Square Developer app
//   SQUARE_LOCATION_ID             the shop's Square location
//   SQUARE_WEBHOOK_SIGNATURE_KEY   from the Square webhook subscription
// Optional:
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
const QUICKPAY_MAX = 10000;       // dollars
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
  if (path === "/api/checkout" && m === "POST") return checkout(request, env, url);
  if (path === "/api/quickpay" && m === "POST") return quickPay(request, env, url);
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
  const tracked = items.flatMap(it => it.variations.filter(v => v.tracked).map(v => v.id));
  const counts = {};
  for (let i = 0; i < tracked.length; i += 1000) {
    let c;
    do {
      const page = await squareOk(env, "POST", "/v2/inventory/counts/batch-retrieve", {
        catalog_object_ids: tracked.slice(i, i + 1000), location_ids: [loc], states: ["IN_STOCK"], ...(c ? { cursor: c } : {}),
      });
      for (const n of page.counts || []) counts[n.catalog_object_id] = Math.floor(Number(n.quantity) || 0);
      c = page.cursor;
    } while (c);
  }

  for (const it of items) {
    it.image = it.image ? names[it.image] || null : null;
    it.category = it.cats.map(id => names[id]).find(Boolean) || "";
    delete it.cats;
    for (const v of it.variations) if (v.tracked) v.stock = counts[v.id] ?? 0;
  }
  items.sort((a, b) => (a.ordinal ?? 1e9) - (b.ordinal ?? 1e9) || a.name.localeCompare(b.name));
  return { category_found: true, items, fetched_at: Date.now() };
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
  const base = { configured: squareReady(env), shipping_fee_cents: shippingCents(env) };
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

async function checkout(request, env, url) {
  if (!squareReady(env)) {
    return json({ error: "Online checkout isn't set up yet. Please call 315-773-3758 to order." }, 503);
  }
  const body = await readJson(request);
  const wanted = new Map();
  for (const line of Array.isArray(body.items) ? body.items.slice(0, MAX_CART_LINES) : []) {
    const id = String(line && line.variation_id || "");
    const qty = parseInt(line && line.qty, 10);
    if (!id || !(qty > 0)) continue;
    wanted.set(id, Math.min((wanted.get(id) || 0) + qty, MAX_QTY));
  }
  if (!wanted.size) return json({ error: "Your cart is empty." }, 400);
  const ship = body.fulfillment === "ship";
  const fee = shippingCents(env);
  if (ship && fee === null) return json({ error: "Shipping isn't available online. Please choose pickup or call us." }, 400);

  // Check against Square's latest stock, not the cached list
  let catalog;
  try { catalog = await loadCatalog(env, true); }
  catch { return json({ error: "Checkout couldn't start. Please try again or call 315-773-3758." }, 502); }
  const byId = new Map();
  for (const it of catalog.items) for (const v of it.variations) byId.set(v.id, { item: it, v });
  const held = await heldByVariation(env);

  const items = [];
  for (const [id, qty] of wanted) {
    const hit = byId.get(id);
    if (!hit) return json({ error: "Something in your cart isn't available anymore. Please remove it and try again." }, 409);
    const label = hit.item.name + (hit.item.variations.length > 1 && hit.v.name ? ` (${hit.v.name})` : "");
    const left = available(hit.v, held);
    if (left !== null && left < qty) {
      return json({ error: left > 0 ? `Only ${left} left of ${label}.` : `Sorry, ${label} just sold out.` }, 409);
    }
    items.push({ variation_id: id, name: label, qty, price_cents: hit.v.price_cents });
  }
  const subtotal = items.reduce((s, l) => s + l.price_cents * l.qty, 0);

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

// Quick Pay: the customer types the amount (invoice balance, deposit, ...)
async function quickPay(request, env, url) {
  if (!squareReady(env)) return json({ error: "Online payment isn't set up yet. Please call 315-773-3758." }, 503);
  const b = await readJson(request);
  const cents = Math.round(Number(String(b.amount || "").replace(/[$,\s]/g, "")) * 100);
  if (!Number.isFinite(cents) || cents < 100) return json({ error: "Enter an amount of at least $1.00." }, 400);
  if (cents > QUICKPAY_MAX * 100) return json({ error: `For payments over $${QUICKPAY_MAX.toLocaleString()}, please call us.` }, 400);
  const who = String(b.name || "").trim().slice(0, 80);
  const forWhat = String(b.reference || "").trim().slice(0, 80);
  const title = ["Quick Pay", forWhat, who].filter(Boolean).join(" · ").slice(0, 255);

  const pending = await env.DB.prepare(
    `INSERT INTO shop_orders (kind, items, subtotal_cents, fulfillment, buyer_name, note)
       VALUES ('quickpay', ?, ?, 'none', ?, ?) RETURNING id`
  ).bind(JSON.stringify([{ name: title, qty: 1, price_cents: cents }]), cents, who || null, forWhat).first();

  const res = await squareCall(env, "POST", "/v2/online-checkout/payment-links", {
    idempotency_key: `wp-quickpay-${pending.id}-${crypto.randomUUID()}`,
    payment_note: `${title} (WP-${pending.id})`,
    quick_pay: { name: title, price_money: { amount: cents, currency: "USD" }, location_id: env.SQUARE_LOCATION_ID },
    checkout_options: { redirect_url: `${url.origin}/shop.html?paid=WP-${pending.id}` },
  });
  return finishPaymentLink(env, res, pending.id);
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
  add("webhook_key", !!env.SQUARE_WEBHOOK_SIGNATURE_KEY, env.SQUARE_WEBHOOK_SIGNATURE_KEY
    ? "Square webhook signature key is set."
    : "Add the webhook signature key (SQUARE_WEBHOOK_SIGNATURE_KEY) so paid orders show up here.");
  const last = await kvGet(env, "last_webhook");
  add("webhook_seen", !!last, last
    ? `Last notice from Square: ${new Date(last.value.at).toISOString().slice(0, 16).replace("T", " ")} UTC (${last.value.type}).`
    : `No notices from Square yet. Webhook URL: ${env.SQUARE_WEBHOOK_URL || url.origin + "/api/square-webhook"}`);
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
