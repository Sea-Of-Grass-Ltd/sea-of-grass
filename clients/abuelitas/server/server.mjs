// Sea of Grass shop server: "Connect Square" for each client, and "Pay on Square" for their site's cart.
// One server for every shop in shops.json. Node 18+, no dependencies.
//   node --env-file=.env server.mjs
//
// For us:         POST /admin/connect-link?shop=abuelitas   (Authorization: Bearer ADMIN_KEY)
//                      -> a signed, single-use link that expires in 48 hours; add &rebind=1 to allow a different Square account
// For the owner:  GET  /connect?shop=abuelitas&t=TOKEN  -> Square's own approval page -> back to /connected
//                 (we get a revocable key; we never see their password, bank details or customers' cards)
//                 After the first connect the shop is pinned to that Square merchant; a different one is refused
//                 unless the link was issued with rebind=1. Every connection change is written to the audit log.
// For the site:   POST /checkout?shop=abuelitas  {items:[{key,qty}], pickup, name, phone} -> {url} of Square's checkout page
//                 rate-limited per visitor and per shop; in production, preview and localhost origins are refused
// For us:         GET  /status?shop=abuelitas   (Authorization: Bearer ADMIN_KEY) -> connected?, location, matched items
//
// Settings (.env, never committed):
//   SQUARE_ENV         sandbox | production
//   SQUARE_APP_ID      the Sea of Grass app's Application ID (not secret)
//   SQUARE_APP_SECRET  the app's OAuth Application secret (secret)
//   PUBLIC_URL         where this server is reached, e.g. http://localhost:8787 (its /connected must be the app's Redirect URL)
//   VAULT_KEY          64 hex chars; encrypts the shops' keys at rest in data/vault.json
//   ADMIN_KEY          a long random string for /status and /admin/connect-link (sent as a Bearer header)
//   AUDIT_PATH         append-only log of connection changes (default: next to the vault)
//   VAULT_PATH         where the encrypted vault lives (default ./data/vault.json; outside the app folder in hosting)
//   PORT               defaults to 8787
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const SANDBOX = env.SQUARE_ENV !== 'production';
const API = SANDBOX ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
const VERSION = '2024-10-17';
const SCOPES = ['ITEMS_READ', 'MERCHANT_PROFILE_READ', 'ORDERS_READ', 'ORDERS_WRITE', 'PAYMENTS_WRITE'];
const SHOPS = JSON.parse(fs.readFileSync(path.join(DIR, 'shops.json'), 'utf8'));
const PICKUP_MIN = { asap: 20, 30: 30, 60: 60, 120: 120 };

// ---- the vault: each shop's Square key, encrypted at rest ----
// keep the vault outside the app folder in hosting, so a redeploy never wipes the shops' keys
const VAULT = env.VAULT_PATH || path.join(DIR, 'data', 'vault.json');
const KEY = Buffer.from(env.VAULT_KEY || '', 'hex');
if (KEY.length !== 32) throw new Error('VAULT_KEY must be 64 hex characters');
// each record is sealed with its shop id as associated data, so a record can't be moved to another shop
const seal = (id, obj) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv); c.setAAD(Buffer.from('shop:' + id)); const data = Buffer.concat([c.update(JSON.stringify(obj)), c.final()]); return ['v2', ...[iv, c.getAuthTag(), data].map(b => b.toString('base64'))].join('.'); };
const open = (id, s) => {
  const parts = s.split('.'), v2 = parts[0] === 'v2', [iv, tag, data] = (v2 ? parts.slice(1) : parts).map(x => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv); if (v2) d.setAAD(Buffer.from('shop:' + id)); d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]));
};
// a missing vault is empty; a vault we can't read is an error, never an empty vault (so one bad read can't wipe every shop)
const readVault = () => {
  let raw;
  try { raw = fs.readFileSync(VAULT, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  const v = JSON.parse(raw);
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('vault is not an object');
  return v;
};
const getShop = id => { const v = readVault(); return Object.hasOwn(v, id) ? open(id, v[id]) : null; };
const putShop = (id, rec) => {
  fs.mkdirSync(path.dirname(VAULT), { recursive: true });
  const v = readVault(); v[id] = seal(id, rec);
  const tmp = VAULT + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, VAULT);
};
// ---- audit log + alerts for connection changes ----
const AUDIT = env.AUDIT_PATH || path.join(path.dirname(VAULT), 'audit.log');
const audit = (event, data) => {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...data });
  try { fs.mkdirSync(path.dirname(AUDIT), { recursive: true }); fs.appendFileSync(AUDIT, line + '\n', { mode: 0o600 }); } catch (e) { console.error('audit write failed', e.message); }
  console.error('ALERT ' + line); // shows in the host's error log
};
const clean = s => String(s).replace(/[\u0000-\u001f\u007f]/g, '?').slice(0, 60);

// ---- Square calls ----
async function sq(method, url, token, body) {
  const r = await fetch(API + url, { method, headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json', 'square-version': VERSION }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`square ${r.status}: ${(data.errors || []).map(x => x.code).join(',') || data.message || 'error'}`); e.status = r.status; throw e; }
  return data;
}
const oauthToken = body => sq('POST', '/oauth2/token', null, { client_id: env.SQUARE_APP_ID, client_secret: env.SQUARE_APP_SECRET, ...body });

// keys last 30 days; renew when under 7 days are left
async function liveKey(id) {
  const rec = getShop(id);
  if (!rec) throw Object.assign(new Error('shop not connected'), { status: 409 });
  if (Date.parse(rec.expires_at) - Date.now() < 7 * 864e5) {
    const t = await oauthToken({ grant_type: 'refresh_token', refresh_token: rec.refresh_token });
    Object.assign(rec, { access_token: t.access_token, refresh_token: t.refresh_token || rec.refresh_token, expires_at: t.expires_at });
    putShop(id, rec);
  }
  return rec;
}

// match the site's menu to the shop's Square items by name, so nobody maps ids by hand
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
async function matchMenu(id, token) {
  const items = [];
  let cursor;
  do { const d = await sq('GET', '/v2/catalog/list?types=ITEM' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), token); items.push(...(d.objects || [])); cursor = d.cursor; } while (cursor);
  const byName = new Map(items.filter(o => !o.is_deleted).map(o => [norm(o.item_data.name), o]));
  const map = {}, names = {}, missing = [];
  for (const [key, name] of Object.entries(SHOPS[id].menu)) {
    const o = byName.get(norm(name)); // exact (normalised) name only; anything else is listed as missing for us to fix by hand
    const v = o?.item_data?.variations?.[0];
    if (v) { map[key] = v.id; names[key] = o.item_data.name; } else missing.push(name);
  }
  return { map, names, missing };
}

// ---- pages for the owner (plain and friendly; they see these once) ----
const page = (res, code, title, body) => {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:18px/1.55 system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 20px;color:#111}h1{font-size:28px;line-height:1.2}a.btn{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600}small{color:#666}</style>
${body}<p><small>Sea of Grass · hello@seaofgrass.studio</small></p>`);
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pending = new Map(); // state -> {shop, until, nonce, rebind}

// admin: Authorization: Bearer ADMIN_KEY, compared in constant time
const isAdmin = req => {
  const got = Buffer.from((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(env.ADMIN_KEY || '');
  return want.length >= 24 && got.length === want.length && crypto.timingSafeEqual(got, want);
};
// connect links: HMAC-signed {shop, exp, nonce, rebind}, single use (used nonces kept next to the vault)
const LINK_KEY = crypto.createHmac('sha256', KEY).update('connect-link').digest();
const b64u = b => Buffer.from(b).toString('base64url');
const signLink = p => { const body = b64u(JSON.stringify(p)); return body + '.' + b64u(crypto.createHmac('sha256', LINK_KEY).update(body).digest()); };
const USED = path.join(path.dirname(VAULT), 'used-links.json');
const usedNonces = () => { try { return JSON.parse(fs.readFileSync(USED, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; } };
const burnNonce = n => { const u = usedNonces(); u[n] = Date.now(); for (const [k, t] of Object.entries(u)) if (Date.now() - t > 30 * 864e5) delete u[k]; const tmp = USED + '.tmp'; fs.mkdirSync(path.dirname(USED), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(u), { mode: 0o600 }); fs.renameSync(tmp, USED); };
const readLink = (t, shop) => {
  const [body, sig] = String(t || '').split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', LINK_KEY).update(body).digest(), got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url')); } catch { return null; }
  if (p.shop !== shop || !(p.exp > Date.now()) || Object.hasOwn(usedNonces(), p.nonce)) return null;
  return p;
};
function connectLink(req, res, q) {
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST' || !isAdmin(req)) return send(403, { error: 'forbidden' });
  const id = q.get('shop');
  if (!Object.hasOwn(SHOPS, id)) return send(404, { error: 'no such shop' });
  const p = { shop: id, exp: Date.now() + 48 * 36e5, nonce: crypto.randomBytes(12).toString('hex'), rebind: q.get('rebind') === '1' };
  audit('link_issued', { shop: id, rebind: p.rebind, exp: new Date(p.exp).toISOString() });
  send(200, { url: (env.PUBLIC_URL || '') + '/connect?shop=' + encodeURIComponent(id) + '&t=' + signLink(p), expires: new Date(p.exp).toISOString() });
}
const revoke = token => sq('POST', '/oauth2/revoke', null, { client_id: env.SQUARE_APP_ID, access_token: token }).catch(() => {});

async function connect(req, res, q) {
  const id = q.get('shop'), shop = Object.hasOwn(SHOPS, id) ? SHOPS[id] : null;
  if (!shop) return page(res, 404, 'Not found', '<h1>We couldn’t find that shop.</h1>');
  const link = readLink(q.get('t'), id);
  if (!link) return page(res, 403, 'Link not valid', '<h1>This link isn’t valid any more.</h1><p>Connect links work once and expire after two days. Please ask Sea of Grass for a new one.</p>');
  if (q.get('go') !== '1')
    return page(res, 200, 'Connect Square', `<h1>Connect ${esc(shop.name)} to Square</h1>
<p>This lets your website send online orders straight to your Square register, where you take payment like any other sale.</p>
<p>On the next page Square asks you to sign in and allow it. You can turn this off any time from your Square Dashboard.</p>
<p><a class="btn" href="/connect?shop=${encodeURIComponent(id)}&t=${encodeURIComponent(q.get('t'))}&go=1">Continue to Square</a></p>`);
  const state = crypto.randomBytes(24).toString('hex');
  pending.set(state, { shop: id, until: Date.now() + 15 * 60e3, nonce: link.nonce, rebind: link.rebind });
  const u = new URL(API + '/oauth2/authorize');
  u.search = new URLSearchParams({ client_id: env.SQUARE_APP_ID, scope: SCOPES.join(' '), session: 'false', state, redirect_uri: env.PUBLIC_URL + '/connected' });
  res.writeHead(302, { location: u.href }); res.end();
}

async function connected(req, res, q) {
  const p = pending.get(q.get('state') || '');
  pending.delete(q.get('state') || '');
  if (!p || p.until < Date.now()) return page(res, 400, 'Try again', '<h1>That link has expired.</h1><p>Please tap the Connect Square link again.</p>');
  if (q.get('error') || !q.get('code')) return page(res, 200, 'Not connected', `<h1>Nothing was connected.</h1><p>That’s fine. If you change your mind, tap the Connect Square link again.</p>`);
  if (Object.hasOwn(usedNonces(), p.nonce)) return page(res, 403, 'Link not valid', '<h1>This link has already been used.</h1><p>Please ask Sea of Grass for a new one.</p>');
  burnNonce(p.nonce);
  const t = await oauthToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: env.PUBLIC_URL + '/connected' });
  const prev = getShop(p.shop);
  if (prev?.merchant_id && prev.merchant_id !== t.merchant_id && !p.rebind) {
    audit('connect_refused_other_merchant', { shop: p.shop, pinned: prev.merchant_id, tried: clean(t.merchant_id) });
    await revoke(t.access_token);
    return page(res, 403, 'Not connected', '<h1>This shop is already connected to a different Square account.</h1><p>Nothing was changed. If the shop has moved to a new Square account, Sea of Grass can send a link that allows it.</p>');
  }
  const locs = (await sq('GET', '/v2/locations', t.access_token)).locations?.filter(l => l.status === 'ACTIVE') || [];
  const { map, names, missing } = await matchMenu(p.shop, t.access_token);
  putShop(p.shop, { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, merchant_id: t.merchant_id, location_id: locs[0]?.id, location_name: locs[0]?.name, map, names, missing, connected_at: new Date().toISOString() });
  audit(prev ? (prev.merchant_id === t.merchant_id ? 'reconnected_same_merchant' : 'rebound_new_merchant') : 'connected', { shop: p.shop, merchant: t.merchant_id, previous: prev?.merchant_id || null, matched: Object.keys(map).length, missing: missing.length });
  page(res, 200, 'Connected', `<h1>You’re connected.</h1><p>Online orders from the ${esc(SHOPS[p.shop].name)} website will now arrive in your Square, with the customer’s name and pickup time.</p><p>You can close this page.</p>`);
}

async function checkout(req, res, q) {
  const id = q.get('shop'), shop = Object.hasOwn(SHOPS, id) ? SHOPS[id] : null;
  const origin = req.headers.origin || '';
  let allowed = !!shop && shop.origins.includes(origin);
  // in production, previews (served from this server) and localhost can never open a real checkout
  if (!SANDBOX && (/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin) || (env.PUBLIC_URL && origin === new URL(env.PUBLIC_URL).origin))) allowed = false;
  const cors = { 'access-control-allow-origin': allowed ? origin : 'null', 'access-control-allow-headers': 'content-type', vary: 'origin' };
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') return send(204, {});
  if (!allowed) return send(403, { error: 'wrong site' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  if (!limit('ip:' + ip, 8, 10 * 60e3) || !limit('shop:' + id, 120, 60 * 60e3)) return send(429, { error: 'too many tries, please call the bakery' });
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 10000) return send(413, { error: 'too big' }); }
  try {
    const { items, pickup, name, phone } = JSON.parse(raw);
    const rec = await liveKey(id);
    if (!Array.isArray(items) || !items.length || items.length > 40) throw new Error('empty order');
    const line_items = items.map(({ key, qty }) => {
      const v = typeof key === 'string' && Object.hasOwn(rec.map, key) ? rec.map[key] : null, n = Math.round(+qty);
      if (!v || !(n >= 1 && n <= 99)) throw new Error('item not on the menu: ' + clean(key));
      return { catalog_object_id: v, quantity: String(n) };
    });
    const who = String(name || '').trim().slice(0, 80), digits = String(phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (!who || digits.length !== 10) throw new Error('name and phone needed');
    const d = await sq('POST', '/v2/online-checkout/payment-links', rec.access_token, {
      idempotency_key: crypto.randomUUID(),
      order: { location_id: rec.location_id, line_items, fulfillments: [{ type: 'PICKUP', state: 'PROPOSED', pickup_details: {
        recipient: { display_name: who, phone_number: '+1' + digits },
        schedule_type: pickup === 'asap' ? 'ASAP' : 'SCHEDULED',
        pickup_at: new Date(Date.now() + (PICKUP_MIN[pickup] ?? 20) * 60e3).toISOString(),
        note: 'Ordered on the website' } }] },
      checkout_options: { redirect_url: origin + '/?ordered=1', ask_for_shipping_address: false },
      pre_populated_data: { buyer_phone_number: '+1' + digits },
    });
    send(200, { url: d.payment_link.url });
  } catch (e) { console.error(clean(id), clean(e.message)); send(e.status === 409 ? 409 : 400, { error: 'could not start checkout' }); }
}

function status(req, res, q) {
  if (!isAdmin(req)) { res.writeHead(403); return res.end(); }
  const id = q.get('shop'), rec = Object.hasOwn(SHOPS, id) ? getShop(id) : null;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(rec ? { connected: true, sandbox: SANDBOX, location: rec.location_name, merchant: rec.merchant_id, matched: Object.keys(rec.map).length, matched_names: rec.names || null, missing: rec.missing, expires_at: rec.expires_at, connected_at: rec.connected_at } : { connected: false }, null, 2));
}

// Unlisted client previews: /preview/<shop>/... serves the static draft from ./preview/<shop>/, never indexed.
const PREVIEW_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
function preview(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean).slice(1);
  if (!parts.length || parts.some(p => p.startsWith('.') || p.includes('\\'))) { res.writeHead(404); return res.end(); }
  if (parts.length === 1 && !pathname.endsWith('/')) { res.writeHead(301, { location: pathname + '/' }); return res.end(); }
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'preview');
  let file = path.join(root, ...parts);
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(root + path.sep)) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'x-robots-tag': 'noindex, nofollow' }); return res.end(); }
    res.writeHead(200, { 'content-type': PREVIEW_TYPES[path.extname(file)] || 'application/octet-stream', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-cache' });
    res.end(buf);
  });
}

// small in-memory rate limiter: n requests per window per bucket
const buckets = new Map();
function limit(key, n, windowMs) {
  const now = Date.now(), b = buckets.get(key) || [];
  const recent = b.filter(t => now - t < windowMs);
  if (recent.length >= n) { buckets.set(key, recent); return false; }
  recent.push(now); buckets.set(key, recent);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some(t => now - t < 36e5)) buckets.delete(k);
  return true;
}

const SECURITY = { 'strict-transport-security': 'max-age=31536000', 'x-content-type-options': 'nosniff', 'content-security-policy': "frame-ancestors 'none'", 'referrer-policy': 'strict-origin-when-cross-origin' };

export async function handle(req, res) {
  for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v);
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/admin/connect-link') return connectLink(req, res, u.searchParams);
    if (u.pathname === '/connect') return await connect(req, res, u.searchParams);
    if (u.pathname === '/connected') return await connected(req, res, u.searchParams);
    if (u.pathname === '/checkout') return await checkout(req, res, u.searchParams);
    if (u.pathname === '/status') return status(req, res, u.searchParams);
    if (u.pathname.startsWith('/preview/')) return preview(req, res, u.pathname);
    if (u.pathname === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /\n'); }
    if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('Sea of Grass shop server'); }
    res.writeHead(404); res.end();
  } catch (e) { console.error(e.message); if (!res.headersSent) page(res, 500, 'Something went wrong', '<h1>Something went wrong on our side.</h1><p>Please try again in a minute, or call Sea of Grass.</p>'); }
}
export const _test = { signLink, readLink, getShop, putShop, readVault, limit };

// always listen, except when the tests import this file (they set SHOP_SERVER_NO_LISTEN); hosts may start us through a wrapper
if (!env.SHOP_SERVER_NO_LISTEN)
  http.createServer(handle).listen(+env.PORT || 8787, () => console.log(`shop server on ${env.PUBLIC_URL || 'http://localhost:' + (env.PORT || 8787)} (${SANDBOX ? 'sandbox' : 'PRODUCTION'})`));
