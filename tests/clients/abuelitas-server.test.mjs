// Security tests for the shop server (clients/abuelitas/server/server.mjs). Square is faked: no network, no real keys.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sog-shop-'));
const ADMIN = 'a'.repeat(40);
Object.assign(process.env, {
  SQUARE_ENV: 'sandbox', SQUARE_APP_ID: 'app-test', SQUARE_APP_SECRET: 'secret-test',
  PUBLIC_URL: 'https://shop.example.test', VAULT_KEY: '1'.repeat(64), ADMIN_KEY: ADMIN,
  VAULT_PATH: path.join(tmp, 'vault.json'), SHOP_SERVER_NO_LISTEN: '1',
});

// fake Square: whoever finishes OAuth is `merchant`
const square = { merchant: 'M_DAVID', revoked: [] };
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url), body = opts.body ? JSON.parse(opts.body) : {};
  const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o });
  if (u.pathname === '/oauth2/token') return json({ access_token: 'tok-' + square.merchant, refresh_token: 'ref', expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), merchant_id: square.merchant });
  if (u.pathname === '/oauth2/revoke') { square.revoked.push(body.access_token); return json({ success: true }); }
  if (u.pathname === '/v2/locations') return json({ locations: [{ id: 'L1', name: 'Test shop', status: 'ACTIVE' }] });
  if (u.pathname === '/v2/catalog/list') return json({ objects: [
    { id: 'I1', item_data: { name: 'Steak', variations: [{ id: 'V_STEAK' }] } },
    { id: 'I2', item_data: { name: 'Pineapple', variations: [{ id: 'V_PINE' }] } },
  ] });
  if (u.pathname === '/v2/online-checkout/payment-links') return json({ payment_link: { url: 'https://sandbox.square.link/u/test' } });
  return json({ errors: [{ code: 'NOT_FOUND' }] }, 404);
};

const start = async (mod) => { const s = http.createServer(mod.handle); await new Promise(r => s.listen(0, r)); return { s, base: 'http://127.0.0.1:' + s.address().port }; };
const req = (base, p, { method = 'GET', headers = {}, body } = {}) => new Promise((res, rej) => {
  const r = http.request(base + p, { method, headers }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ status: x.statusCode, headers: x.headers, body: d })); });
  r.on('error', rej); if (body) r.write(body); r.end();
});
const auth = { authorization: 'Bearer ' + ADMIN };
const issue = async (base, extra = '') => JSON.parse((await req(base, '/admin/connect-link?shop=abuelitas' + extra, { method: 'POST', headers: auth })).body).url.replace('https://shop.example.test', '');
// walk a link through the owner page, Square, and back
async function finish(base, link) {
  const go = await req(base, link + '&go=1');
  if (go.status !== 302) return go;
  const state = new URL(go.headers.location).searchParams.get('state');
  return req(base, '/connected?state=' + state + '&code=c1');
}

const mod = await import('../../clients/abuelitas/server/server.mjs');
const { s, base } = await start(mod);
const vaultMerchant = () => mod._test.getShop('abuelitas')?.merchant_id;

test('connect needs a signed link; admin endpoints need the Bearer key', async () => {
  assert.equal((await req(base, '/connect?shop=abuelitas')).status, 403);
  assert.equal((await req(base, '/connect?shop=abuelitas&go=1')).status, 403);
  assert.equal((await req(base, '/admin/connect-link?shop=abuelitas', { method: 'POST' })).status, 403);
  assert.equal((await req(base, '/admin/connect-link?shop=abuelitas', { method: 'POST', headers: { authorization: 'Bearer ' + 'b'.repeat(40) } })).status, 403);
  assert.equal((await req(base, '/status?shop=abuelitas&admin=' + ADMIN)).status, 403, 'query-string admin key no longer works');
  assert.equal((await req(base, '/status?shop=abuelitas', { headers: auth })).status, 200);
});

test('a tampered or expired link is refused', async () => {
  const link = await issue(base);
  assert.equal((await req(base, link.slice(0, -3) + 'xyz')).status, 403);
  const expired = mod._test.signLink({ shop: 'abuelitas', exp: Date.now() - 1000, nonce: 'n-old', rebind: false });
  assert.equal((await req(base, '/connect?shop=abuelitas&t=' + expired)).status, 403);
  const other = mod._test.signLink({ shop: 'someone-else', exp: Date.now() + 1e6, nonce: 'n-x', rebind: false });
  assert.equal((await req(base, '/connect?shop=abuelitas&t=' + other)).status, 403);
});

test('first connect pins the merchant; the link works only once', async () => {
  square.merchant = 'M_DAVID';
  const link = await issue(base);
  assert.equal((await req(base, link)).status, 200);
  assert.equal((await finish(base, link)).status, 200);
  assert.equal(vaultMerchant(), 'M_DAVID');
  assert.equal((await req(base, link)).status, 403, 'used link is dead');
});

test('a different Square account is refused, revoked and logged; the saved keys are untouched', async () => {
  square.merchant = 'M_ATTACKER';
  const r = await finish(base, await issue(base));
  assert.equal(r.status, 403);
  assert.equal(vaultMerchant(), 'M_DAVID');
  assert.ok(square.revoked.includes('tok-M_ATTACKER'));
  const log = fs.readFileSync(path.join(tmp, 'audit.log'), 'utf8');
  assert.match(log, /connect_refused_other_merchant/);
});

test('an admin rebind link may move the shop to a new account, and that is logged', async () => {
  square.merchant = 'M_DAVID_NEW';
  assert.equal((await finish(base, await issue(base, '&rebind=1'))).status, 200);
  assert.equal(vaultMerchant(), 'M_DAVID_NEW');
  assert.match(fs.readFileSync(path.join(tmp, 'audit.log'), 'utf8'), /rebound_new_merchant/);
});

test('names match exactly: Apple is not charged as Pineapple', async () => {
  const rec = mod._test.getShop('abuelitas');
  assert.equal(rec.map.steak, 'V_STEAK');
  assert.ok(!('apple' in rec.map), 'apple must not fall back to Pineapple');
  assert.ok(rec.missing.includes('Apple'));
});

test('checkout is rate-limited per visitor', async () => {
  const order = JSON.stringify({ items: [{ key: 'steak', qty: 1 }], pickup: 'asap', name: 'Test', phone: '3035550123' });
  const h = { origin: 'http://localhost:8742', 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' };
  const codes = [];
  for (let i = 0; i < 10; i++) codes.push((await req(base, '/checkout?shop=abuelitas', { method: 'POST', headers: h, body: order })).status);
  assert.deepEqual(codes.slice(0, 8), Array(8).fill(200));
  assert.equal(codes[8], 429);
});

test('a vault that cannot be read is an error, not an empty vault', async () => {
  const good = fs.readFileSync(process.env.VAULT_PATH, 'utf8');
  fs.writeFileSync(process.env.VAULT_PATH, '{not json');
  assert.throws(() => mod._test.putShop('abuelitas', { x: 1 }));
  assert.equal(fs.readFileSync(process.env.VAULT_PATH, 'utf8'), '{not json', 'nothing overwritten');
  fs.writeFileSync(process.env.VAULT_PATH, good);
});

test('security headers on every response', async () => {
  const r = await req(base, '/');
  assert.match(r.headers['strict-transport-security'], /max-age/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
});

test('in production, preview and localhost origins cannot open a checkout', async () => {
  process.env.SQUARE_ENV = 'production'; process.env.PUBLIC_URL = 'https://shop.seaofgrass.studio';
  const prod = await import('../../clients/abuelitas/server/server.mjs?production');
  const p = await start(prod);
  const order = JSON.stringify({ items: [{ key: 'steak', qty: 1 }], pickup: 'asap', name: 'Test', phone: '3035550123' });
  for (const origin of ['https://shop.seaofgrass.studio', 'http://localhost:8742'])
    assert.equal((await req(p.base, '/checkout?shop=abuelitas', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: order })).status, 403, origin);
  p.s.close(); process.env.SQUARE_ENV = 'sandbox'; process.env.PUBLIC_URL = 'https://shop.example.test';
});

test.after(() => s.close());
