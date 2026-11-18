// Sea of Grass shop server: "Connect Square" for each client, and "Pay on Square" for their site's cart.
// One server for every shop in shops.json. Node 18+, no dependencies.
//   node --env-file=.env server.mjs
//
// For the owner:  GET  /connect?shop=abuelitas  -> Square's own approval page -> back to /connected
//                 (we get a revocable key; we never see their password, bank details or customers' cards)
// For the site:   POST /checkout?shop=abuelitas  {items:[{key,qty}], pickup, name, phone} -> {url} of Square's checkout page
// For us:         GET  /status?shop=abuelitas&admin=ADMIN_KEY  -> connected?, location, which menu items matched
//
// Settings (.env, never committed):
//   SQUARE_ENV         sandbox | production
//   SQUARE_APP_ID      the Sea of Grass app's Application ID (not secret)
//   SQUARE_APP_SECRET  the app's OAuth Application secret (secret)
//   PUBLIC_URL         where this server is reached, e.g. http://localhost:8787 (its /connected must be the app's Redirect URL)
//   VAULT_KEY          64 hex chars; encrypts the shops' keys at rest in data/vault.json
//   ADMIN_KEY          a long random string for /status
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
const VAULT = path.join(DIR, 'data', 'vault.json');
const KEY = Buffer.from(env.VAULT_KEY || '', 'hex');
if (KEY.length !== 32) throw new Error('VAULT_KEY must be 64 hex characters');
const seal = obj => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv); const data = Buffer.concat([c.update(JSON.stringify(obj)), c.final()]); return [iv, c.getAuthTag(), data].map(b => b.toString('base64')).join('.'); };
const open = s => { const [iv, tag, data] = s.split('.').map(x => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv); d.setAuthTag(tag); return JSON.parse(Buffer.concat([d.update(data), d.final()])); };
const readVault = () => { try { return JSON.parse(fs.readFileSync(VAULT, 'utf8')); } catch { return {}; } };
const getShop = id => { const v = readVault()[id]; return v ? open(v) : null; };
const putShop = (id, rec) => { fs.mkdirSync(path.dirname(VAULT), { recursive: true }); const v = readVault(); v[id] = seal(rec); fs.writeFileSync(VAULT, JSON.stringify(v, null, 1), { mode: 0o600 }); };

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
  const map = {}, missing = [];
  for (const [key, name] of Object.entries(SHOPS[id].menu)) {
    const n = norm(name), o = byName.get(n) || [...byName].find(([k]) => k.includes(n) || n.includes(k))?.[1];
    const v = o?.item_data?.variations?.[0];
    if (v) map[key] = v.id; else missing.push(name);
  }
  return { map, missing };
}

// ---- pages for the owner (plain and friendly; they see these once) ----
const page = (res, code, title, body) => {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:18px/1.55 system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 20px;color:#111}h1{font-size:28px;line-height:1.2}a.btn{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600}small{color:#666}</style>
${body}<p><small>Sea of Grass · hello@seaofgrass.studio</small></p>`);
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pending = new Map(); // state -> {shop, until}

async function connect(req, res, q) {
  const id = q.get('shop'), shop = SHOPS[id];
  if (!shop) return page(res, 404, 'Not found', '<h1>We couldn’t find that shop.</h1>');
  if (q.get('go') !== '1')
    return page(res, 200, 'Connect Square', `<h1>Connect ${esc(shop.name)} to Square</h1>
<p>This lets your website send online orders straight to your Square register, where you take payment like any other sale.</p>
<p>On the next page Square asks you to sign in and allow it. You can turn this off any time from your Square Dashboard.</p>
<p><a class="btn" href="/connect?shop=${encodeURIComponent(id)}&go=1">Continue to Square</a></p>`);
  const state = crypto.randomBytes(24).toString('hex');
  pending.set(state, { shop: id, until: Date.now() + 15 * 60e3 });
  const u = new URL(API + '/oauth2/authorize');
  u.search = new URLSearchParams({ client_id: env.SQUARE_APP_ID, scope: SCOPES.join(' '), session: 'false', state, redirect_uri: env.PUBLIC_URL + '/connected' });
  res.writeHead(302, { location: u.href }); res.end();
}

async function connected(req, res, q) {
  const p = pending.get(q.get('state') || '');
  pending.delete(q.get('state') || '');
  if (!p || p.until < Date.now()) return page(res, 400, 'Try again', '<h1>That link has expired.</h1><p>Please tap the Connect Square link again.</p>');
  if (q.get('error') || !q.get('code')) return page(res, 200, 'Not connected', `<h1>Nothing was connected.</h1><p>That’s fine. If you change your mind, tap the Connect Square link again.</p>`);
  const t = await oauthToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: env.PUBLIC_URL + '/connected' });
  const locs = (await sq('GET', '/v2/locations', t.access_token)).locations?.filter(l => l.status === 'ACTIVE') || [];
  const { map, missing } = await matchMenu(p.shop, t.access_token);
  putShop(p.shop, { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, merchant_id: t.merchant_id, location_id: locs[0]?.id, location_name: locs[0]?.name, map, missing, connected_at: new Date().toISOString() });
  console.log(`connected ${p.shop}: ${Object.keys(map).length} items matched, ${missing.length} missing`);
  page(res, 200, 'Connected', `<h1>You’re connected.</h1><p>Online orders from the ${esc(SHOPS[p.shop].name)} website will now arrive in your Square, with the customer’s name and pickup time.</p><p>You can close this page.</p>`);
}

async function checkout(req, res, q) {
  const id = q.get('shop'), shop = SHOPS[id];
  const origin = req.headers.origin || '';
  const allowed = shop && shop.origins.includes(origin);
  const cors = { 'access-control-allow-origin': allowed ? origin : 'null', 'access-control-allow-headers': 'content-type', vary: 'origin' };
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') return send(204, {});
  if (!allowed) return send(403, { error: 'wrong site' });
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 10000) return send(413, { error: 'too big' }); }
  try {
    const { items, pickup, name, phone } = JSON.parse(raw);
    const rec = await liveKey(id);
    if (!Array.isArray(items) || !items.length || items.length > 40) throw new Error('empty order');
    const line_items = items.map(({ key, qty }) => {
      const v = rec.map[key], n = Math.round(+qty);
      if (!v || !(n >= 1 && n <= 99)) throw new Error('item not on the menu: ' + key);
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
  } catch (e) { console.error(id, e.message); send(e.status === 409 ? 409 : 400, { error: 'could not start checkout' }); }
}

function status(req, res, q) {
  if (!env.ADMIN_KEY || q.get('admin') !== env.ADMIN_KEY) { res.writeHead(403); return res.end(); }
  const rec = getShop(q.get('shop'));
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(rec ? { connected: true, sandbox: SANDBOX, location: rec.location_name, matched: Object.keys(rec.map).length, missing: rec.missing, expires_at: rec.expires_at, connected_at: rec.connected_at } : { connected: false }, null, 2));
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/connect') return await connect(req, res, u.searchParams);
    if (u.pathname === '/connected') return await connected(req, res, u.searchParams);
    if (u.pathname === '/checkout') return await checkout(req, res, u.searchParams);
    if (u.pathname === '/status') return status(req, res, u.searchParams);
    res.writeHead(404); res.end();
  } catch (e) { console.error(e.message); if (!res.headersSent) page(res, 500, 'Something went wrong', '<h1>Something went wrong on our side.</h1><p>Please try again in a minute, or call Sea of Grass.</p>'); }
}).listen(+env.PORT || 8787, () => console.log(`shop server on ${env.PUBLIC_URL || 'http://localhost:' + (env.PORT || 8787)} (${SANDBOX ? 'sandbox' : 'PRODUCTION'})`));
