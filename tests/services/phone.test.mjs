// Counter phone, live 3D: journey in phone.journey.md (written before the build).
// Run:  cd tests && npm install && node --test services/phone.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const DEMO = '/preview/services/websites/phone/demo.html';
const GLB = path.join(ROOT, 'preview/services/websites/phone/phone.glb');
const WIDTHS = [390, 1440];

let site;
before(async () => { site = await startSite({ webgl: true }); });
after(async () => { await site?.close(); });

async function open(w, opts = {}) {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile,
    reducedMotion: opts.reduce ? 'reduce' : 'no-preference', deviceScaleFactor: mobile ? 2 : 1 });
  const offsite = [];
  await ctx.route(u => !u.href.startsWith(site.base), r => { offsite.push(r.request().url()); r.abort(); });
  if (opts.init) await ctx.addInitScript(opts.init);
  // record layout shifts from the very start
  await ctx.addInitScript(() => {
    window.__shift = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.goto(site.base + DEMO, { waitUntil: 'load' });
  return { ctx, page, errors, requests, offsite, mobile };
}

const state = page => page.evaluate(() => document.querySelector('sog-phone')?.dataset.state || 'missing');
const num = (page, k) => page.evaluate(k => +(document.querySelector('sog-phone')?.dataset[k] || 0), k);
const box = page => page.evaluate(() => { const r = document.querySelector('sog-phone').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY) }; });
const pointOf = (page, name) => page.evaluate(n => document.querySelector('sog-phone').pointOf(n), name);

async function scrollIn(page) {
  await page.evaluate(() => document.querySelector('sog-phone').scrollIntoView({ block: 'center' }));
}
async function untilLive(page, ms = 15000) {
  await page.waitForFunction(() => ['live', 'failed'].includes(document.querySelector('sog-phone')?.dataset.state), null, { timeout: ms });
  return state(page);
}
async function waitFor(page, fn, arg, ms = 4000) {
  try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; }
}

test('the model is under 2 MB and carries both controls', () => {
  assert.ok(fs.existsSync(GLB), 'phone.glb exists');
  const buf = fs.readFileSync(GLB);
  assert.ok(buf.length < 2 * 1024 * 1024, `phone.glb is ${(buf.length / 1048576).toFixed(2)} MB`);
  // the JSON chunk follows the 12-byte header and the 8-byte chunk header
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const names = (json.animations || []).map(a => a.name);
  for (const n of ['handset_lift', 'dial']) assert.ok(names.includes(n), `animation ${n} in [${names}]`);
});

for (const w of WIDTHS) {
  test(`${w}px · still first, then the live phone in the same box, no layout shift`, async () => {
    const { ctx, page, errors, offsite } = await open(w);
    const before = await box(page);
    assert.ok(before.h > 100, 'the box has the picture\'s height before anything loads');
    assert.equal(await page.evaluate(() => !!document.querySelector('sog-phone img')?.complete), true, 'the still picture is there');
    await scrollIn(page);
    assert.equal(await untilLive(page), 'live');
    const after = await box(page);
    assert.deepEqual({ w: after.w, h: after.h }, { w: before.w, h: before.h }, 'same box before and after');
    assert.equal(await page.evaluate(() => { const c = document.querySelector('sog-phone canvas'); return !!c && getComputedStyle(c).opacity === '1'; }), true, 'canvas shown');
    assert.ok(await page.evaluate(() => window.__shift) < 0.001, 'no layout shift');
    assert.deepEqual(offsite, [], 'nothing from other sites');
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · the handset lifts and settles`, async () => {
    const { ctx, page, errors, mobile } = await open(w);
    await scrollIn(page);
    assert.equal(await untilLive(page), 'live');
    const p = await pointOf(page, 'handset');
    assert.ok(p, 'handset has a point on screen');
    if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);   // click or tap picks it up (2026-11-20)
    assert.ok(await waitFor(page, () => +document.querySelector('sog-phone').dataset.lift > 0.95), 'lifted');
    { const q = await pointOf(page, 'handset'); if (mobile) await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y); }   // and again hangs up
    assert.ok(await waitFor(page, () => +document.querySelector('sog-phone').dataset.lift < 0.05), 'settled back');
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · the dial follows a drag and runs back`, async () => {
    const { ctx, page, errors, mobile } = await open(w);
    await scrollIn(page);
    assert.equal(await untilLive(page), 'live');
    const c = await pointOf(page, 'dial');
    const h = await pointOf(page, 'dial-hole');           // the 0 hole, furthest from the stop
    assert.ok(c && h, 'dial has points on screen');
    const r = Math.hypot(h.x - c.x, h.y - c.y), a0 = Math.atan2(h.y - c.y, h.x - c.x);
    // drag clockwise on screen (y down, so increasing angle) through 200 degrees
    const pts = Array.from({ length: 21 }, (_, i) => { const a = a0 + (i / 20) * (200 * Math.PI / 180); return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }; });
    if (mobile) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
      for (const q of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] });
      assert.ok(await num(page, 'dial') > 0.4, `wheel follows (${await num(page, 'dial')})`);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
      for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y);
      assert.ok(await num(page, 'dial') > 0.4, `wheel follows (${await num(page, 'dial')})`);
      await page.mouse.up();
    }
    assert.ok(await waitFor(page, () => +document.querySelector('sog-phone').dataset.dial < 0.01), 'runs back to rest');
    assert.ok(await num(page, 'lift') < 0.05, 'dialling does not lift the handset');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('reduced motion · the still picture only, nothing 3D downloaded', async () => {
  const { ctx, page, errors, requests } = await open(390, { reduce: true });
  await scrollIn(page);
  await page.waitForTimeout(1500);
  assert.equal(await state(page), 'still');
  assert.equal(await page.evaluate(() => !document.querySelector('sog-phone canvas')), true, 'no canvas');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('sog-phone picture')).visibility), 'visible');
  assert.deepEqual(requests.filter(u => /phone\.glb|three|vendor/.test(u)), [], 'no 3D files fetched');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('no WebGL · the still picture stays, no errors', async () => {
  const init = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; };
  const { ctx, page, errors } = await open(1440, { init });
  await scrollIn(page);
  await page.waitForTimeout(2500);
  assert.notEqual(await state(page), 'live');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('sog-phone picture')).visibility), 'visible');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('model fails to load · the still picture stays', async () => {
  const { ctx, page, errors } = await open(1440);
  await page.evaluate(() => { document.querySelector('sog-phone').dataset.glb = '/preview/services/websites/phone/missing.glb'; });   // read when it scrolls in
  await scrollIn(page);
  assert.equal(await untilLive(page), 'failed');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('sog-phone picture')).visibility), 'visible');
  assert.deepEqual(errors.filter(e => !/missing\.glb|404|Failed to load/.test(e)), []);
  await ctx.close();
});
