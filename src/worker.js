// The Whimsical Pig — shop back end (Cloudflare Worker)
//
// Static pages (index.html, shop.html, admin.html, ...) are served from the repo
// by Cloudflare's asset hosting. This Worker only handles:
//
//   GET  /api/products                  public list of shop items with stock left
//   POST /api/checkout                  { id, qty } -> Square checkout URL
//   POST /api/square-webhook            Square payment notices -> lowers stock
//   GET  /img/:id                       item photos stored in the database
//   POST /api/order-request             "Start an Order" form -> saved for the admin page
//   POST /api/admin/login | logout      admin password login
//   GET/POST/PUT/DELETE /api/admin/...  manage items and view orders
//
// Secrets (Cloudflare dashboard -> Worker -> Settings -> Variables and Secrets):
//   ADMIN_PASSWORD                 password for /admin
//   SQUARE_ACCESS_TOKEN            from the Square Developer app
//   SQUARE_LOCATION_ID             the shop's Square location
//   SQUARE_WEBHOOK_SIGNATURE_KEY   from the Square webhook subscription
//   SQUARE_ENVIRONMENT             "production" (default) or "sandbox" for testing

const SQUARE_VERSION = "2026-05-20";
const HOLD_MINUTES = 30;          // stock is held this long while a customer is paying
const SESSION_DAYS = 7;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_REQUEST_FILES = 8;
const MAX_REQUEST_FILE_BYTES = 1_900_000;   // D1 rows hold up to 2 MB

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     category TEXT NOT NULL DEFAULT '',
     price_cents INTEGER NOT NULL,
     stock INTEGER NOT NULL DEFAULT 0,
     image_id INTEGER,
     active INTEGER NOT NULL DEFAULT 1,
     sort INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS images (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     mime TEXT NOT NULL,
     data BLOB NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
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
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  // Customer uploads are kept apart from shop photos: only the admin can open them.
  `CREATE TABLE IF NOT EXISTS request_files (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     request_id INTEGER NOT NULL,
     name TEXT NOT NULL,
     mime TEXT NOT NULL,
     data BLOB NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     product_id INTEGER NOT NULL,
     product_name TEXT NOT NULL,
     qty INTEGER NOT NULL,
     amount_cents INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     square_order_id TEXT UNIQUE,
     square_payment_id TEXT,
     buyer_email TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     paid_at TEXT
   )`,
];

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
  schemaReady = true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path.startsWith("/api/") || path.startsWith("/img/")) {
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

  if (path === "/api/products" && m === "GET") return listPublicProducts(env);
  if (path === "/api/checkout" && m === "POST") return checkout(request, env, url);
  if (path === "/api/square-webhook" && m === "POST") return squareWebhook(request, env);
  if (path.startsWith("/img/") && m === "GET") return serveImage(env, path.slice(5));
  if (path === "/api/order-request" && m === "POST") return saveOrderRequest(request, env);

  if (path === "/api/admin/login" && m === "POST") return login(request, env);
  if (path === "/api/admin/logout" && m === "POST") return logout();

  if (path.startsWith("/api/admin/")) {
    if (!(await isAdmin(request, env))) return json({ error: "Please log in." }, 401);
    if (path === "/api/admin/me" && m === "GET") return json({ ok: true });
    if (path === "/api/admin/products" && m === "GET") return listAdminProducts(env);
    if (path === "/api/admin/products" && m === "POST") return saveProduct(request, env, null);
    const pm = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (pm && m === "PUT") return saveProduct(request, env, +pm[1]);
    if (pm && m === "DELETE") return deleteProduct(env, +pm[1]);
    if (path === "/api/admin/images" && m === "POST") return uploadImage(request, env);
    if (path === "/api/admin/orders" && m === "GET") return listOrders(env);
    if (path === "/api/admin/requests" && m === "GET") return listRequests(env);
    const rm = path.match(/^\/api\/admin\/requests\/(\d+)$/);
    if (rm && m === "PUT") return updateRequest(request, env, +rm[1]);
    const fm = path.match(/^\/api\/admin\/request-files\/(\d+)$/);
    if (fm && m === "GET") return serveRequestFile(env, +fm[1]);
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------- public shop

// Units held by customers who started checkout in the last HOLD_MINUTES
const HELD_SQL = `COALESCE((SELECT SUM(o.qty) FROM orders o
   WHERE o.product_id = p.id AND o.status = 'pending'
   AND o.created_at > datetime('now', '-${HOLD_MINUTES} minutes')), 0)`;

async function listPublicProducts(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.description, p.category, p.price_cents, p.image_id,
            MAX(p.stock - ${HELD_SQL}, 0) AS available
       FROM products p WHERE p.active = 1 ORDER BY p.sort, p.id`
  ).all();
  return json({ products: results }, 200, { "Cache-Control": "no-store" });
}

async function checkout(request, env, url) {
  const body = await readJson(request);
  const id = parseInt(body.id, 10);
  const qty = Math.min(Math.max(parseInt(body.qty, 10) || 1, 1), 20);
  if (!id) return json({ error: "Missing item." }, 400);
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: "Online checkout isn't set up yet. Please call 315-773-3758 to order." }, 503);
  }

  const product = await env.DB.prepare(
    `SELECT p.id, p.name, p.price_cents, MAX(p.stock - ${HELD_SQL}, 0) AS available
       FROM products p WHERE p.id = ? AND p.active = 1`
  ).bind(id).first();
  if (!product) return json({ error: "That item isn't available anymore." }, 404);
  if (product.available < qty) {
    return json({ error: product.available > 0 ? `Only ${product.available} left.` : "Sorry, that item just sold out." }, 409);
  }

  const amount = product.price_cents * qty;
  const pending = await env.DB.prepare(
    `INSERT INTO orders (product_id, product_name, qty, amount_cents) VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(product.id, product.name, qty, amount).first();

  const res = await squareFetch(env, "/v2/online-checkout/payment-links", {
    idempotency_key: `wp-order-${pending.id}-${crypto.randomUUID()}`,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      reference_id: `WP-${pending.id}`,
      line_items: [{
        name: product.name,
        quantity: String(qty),
        base_price_money: { amount: product.price_cents, currency: "USD" },
      }],
    },
    checkout_options: {
      redirect_url: `${url.origin}/shop.html?thanks=${pending.id}`,
      ask_for_shipping_address: true,
    },
  });

  if (!res.ok || !res.data.payment_link) {
    console.error("Square payment link failed", res.status, JSON.stringify(res.data));
    await env.DB.prepare(`UPDATE orders SET status = 'failed' WHERE id = ?`).bind(pending.id).run();
    return json({ error: "Checkout couldn't start. Please try again or call 315-773-3758." }, 502);
  }
  const link = res.data.payment_link;
  await env.DB.prepare(`UPDATE orders SET square_order_id = ? WHERE id = ?`).bind(link.order_id, pending.id).run();
  return json({ url: link.url });
}

// Square tells us when a payment completes. Verify it really came from Square,
// then mark the order paid and lower stock exactly once.
async function squareWebhook(request, env) {
  const raw = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") || "";
  if (!env.SQUARE_WEBHOOK_SIGNATURE_KEY ||
      !(await validSquareSignature(env.SQUARE_WEBHOOK_SIGNATURE_KEY, request.url, raw, signature))) {
    return json({ error: "Invalid signature" }, 401);
  }
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "Bad JSON" }, 400); }

  const payment = event?.data?.object?.payment;
  if (!payment || payment.status !== "COMPLETED" || !payment.order_id) return json({ ok: true });

  const order = await env.DB.prepare(`SELECT * FROM orders WHERE square_order_id = ?`).bind(payment.order_id).first();
  if (!order) return json({ ok: true });   // not one of ours (e.g. an in-store sale)

  // Only the pending -> paid transition lowers stock, so repeated notices are harmless.
  const done = await env.DB.prepare(
    `UPDATE orders SET status = 'paid', paid_at = datetime('now'), square_payment_id = ?, buyer_email = ?
       WHERE id = ? AND status = 'pending'`
  ).bind(payment.id || null, payment.buyer_email_address || null, order.id).run();
  if (done.meta.changes === 1) {
    await env.DB.prepare(`UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(order.qty, order.product_id).run();
  }
  return json({ ok: true });
}

async function validSquareSignature(key, notificationUrl, body, signature) {
  const mac = await hmac(key, notificationUrl + body);
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(expected, signature);
}

async function squareFetch(env, path, payload) {
  const base = env.SQUARE_API_BASE ||
    (env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com");
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data };
}

async function serveImage(env, idText) {
  const id = parseInt(idText, 10);
  if (!id) return new Response("Not found", { status: 404 });
  const img = await env.DB.prepare(`SELECT mime, data FROM images WHERE id = ?`).bind(id).first();
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
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
       FROM requests r ORDER BY r.id DESC LIMIT 200`
  ).all();
  for (const r of results) r.files = JSON.parse(r.files || "[]");
  return json({ requests: results }, 200, { "Cache-Control": "no-store" });
}

async function updateRequest(request, env, id) {
  const b = await readJson(request);
  const status = ["new", "quoted", "in progress", "done"].includes(b.status) ? b.status : null;
  if (!status) return json({ error: "Unknown status." }, 400);
  await env.DB.prepare(`UPDATE requests SET status = ? WHERE id = ?`).bind(status, id).run();
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
    },
  });
}

// ---------------------------------------------------------------- admin

async function login(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Admin password isn't set up yet (ADMIN_PASSWORD)." }, 503);
  const body = await readJson(request);
  // small fixed delay makes password guessing slower
  await new Promise(r => setTimeout(r, 400));
  if (!timingSafeEqual(String(body.password || ""), env.ADMIN_PASSWORD)) {
    return json({ error: "That password isn't right." }, 401);
  }
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

async function listAdminProducts(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.*, ${HELD_SQL} AS held FROM products p ORDER BY p.sort, p.id`
  ).all();
  return json({ products: results }, 200, { "Cache-Control": "no-store" });
}

async function saveProduct(request, env, id) {
  const b = await readJson(request);
  const name = String(b.name || "").trim().slice(0, 120);
  const price = Math.round(Number(b.price) * 100);
  const stock = parseInt(b.stock, 10);
  if (!name) return json({ error: "Give the item a name." }, 400);
  if (!Number.isFinite(price) || price < 50) return json({ error: "Enter a price of at least $0.50." }, 400);
  if (!Number.isInteger(stock) || stock < 0) return json({ error: "Enter how many are in stock (0 or more)." }, 400);
  const vals = [
    name,
    String(b.description || "").trim().slice(0, 300),
    String(b.category || "").trim().slice(0, 40),
    price,
    stock,
    b.image_id ? parseInt(b.image_id, 10) : null,
    b.active === false ? 0 : 1,
    parseInt(b.sort, 10) || 0,
  ];
  if (id) {
    const r = await env.DB.prepare(
      `UPDATE products SET name=?, description=?, category=?, price_cents=?, stock=?, image_id=?, active=?, sort=?,
         updated_at=datetime('now') WHERE id=?`
    ).bind(...vals, id).run();
    if (!r.meta.changes) return json({ error: "Item not found." }, 404);
    return json({ ok: true, id });
  }
  const row = await env.DB.prepare(
    `INSERT INTO products (name, description, category, price_cents, stock, image_id, active, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(...vals).first();
  return json({ ok: true, id: row.id });
}

async function deleteProduct(env, id) {
  // Items with orders are hidden instead of deleted, so order history stays intact.
  const used = await env.DB.prepare(`SELECT 1 FROM orders WHERE product_id = ? LIMIT 1`).bind(id).first();
  if (used) {
    await env.DB.prepare(`UPDATE products SET active = 0 WHERE id = ?`).bind(id).run();
    return json({ ok: true, hidden: true });
  }
  await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

async function uploadImage(request, env) {
  const mime = (request.headers.get("Content-Type") || "").split(";")[0];
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return json({ error: "Use a JPG, PNG or WebP photo." }, 400);
  const data = await request.arrayBuffer();
  if (data.byteLength > MAX_IMAGE_BYTES) return json({ error: "That photo is too large." }, 413);
  const row = await env.DB.prepare(`INSERT INTO images (mime, data) VALUES (?, ?) RETURNING id`)
    .bind(mime, data).first();
  return json({ ok: true, id: row.id });
}

async function listOrders(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, product_name, qty, amount_cents, status, buyer_email, created_at, paid_at
       FROM orders WHERE status = 'paid'
          OR (status = 'pending' AND created_at > datetime('now', '-${HOLD_MINUTES} minutes'))
       ORDER BY id DESC LIMIT 100`
  ).all();
  return json({ orders: results }, 200, { "Cache-Control": "no-store" });
}

// ---------------------------------------------------------------- helpers

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
