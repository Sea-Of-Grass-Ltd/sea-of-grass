// The live phone on the Websites page ("One less call asking what's left").
// 2026-11-20, Tristan: "Rather than framing it out, I feel like this area should just be a big phone that you can
// play with." No panel, counter or grass: a big free-standing phone you turn, dial and pick up. Lifting the handset
// lights the questions on the left one by one with their answers (the site answers, so the phone doesn't ring). Run:  cd tests && node --test services/phone-page.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [390, 1440];
let site;
before(async () => { site = await startSite({ webgl: true }); });
after(async () => { await site?.close(); });

async function open(w, opts = {}) {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile,
    reducedMotion: opts.reduce ? 'reduce' : 'no-preference', deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.route(u => !u.href.startsWith(site.base), r => r.abort());
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && (m.location().url || '').startsWith(site.base) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.goto(site.base + PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { ctx, page, errors, requests };
}
const phoneState = page => page.evaluate(() => document.querySelector('#calls sog-phone')?.dataset.state || 'missing');
async function bringIn(page) {
  await page.evaluate(() => document.querySelector('#calls sog-phone').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => ['live', 'failed'].includes(document.querySelector('#calls sog-phone')?.dataset.state), null, { timeout: 15000 });
}

for (const w of WIDTHS) {
  test(`${w}px · the live phone replaces the picture in the same box, no errors`, async () => {
    const { ctx, page, errors } = await open(w);
    assert.notEqual(await phoneState(page), 'missing', 'the section has the phone element');
    const before = await page.evaluate(() => { const r = document.querySelector('#calls sog-phone').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    await bringIn(page);
    assert.equal(await phoneState(page), 'live');
    const afterBox = await page.evaluate(() => { const r = document.querySelector('#calls sog-phone').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    assert.deepEqual(afterBox, before, 'same box');
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · the phone covers no text and the page has no sideways scroll`, async () => {
    const { ctx, page } = await open(w);
    await bringIn(page);
    const hits = await page.evaluate(() => {
      const ph = document.querySelector('#calls sog-phone').getBoundingClientRect();
      const out = [];
      for (const el of document.querySelectorAll('#calls h2, #calls p, #calls dt, #calls dd, #hookup h2, #hookup p, #hookup li, #hookup a, #hookup button')) {
        if (el.closest('sog-phone')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const ix = Math.min(r.right, ph.right) - Math.max(r.left, ph.left), iy = Math.min(r.bottom, ph.bottom) - Math.max(r.top, ph.top);
        if (ix > 1 && iy > 1) out.push(el.tagName + ': ' + el.textContent.trim().slice(0, 40));
      }
      return out;
    });
    assert.deepEqual(hits, [], 'no text under the phone');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
    await ctx.close();
  });

  test(`${w}px · lifting the handset lights the answers one by one`, async () => {
    const { ctx, page, errors } = await open(w);
    await bringIn(page);
    const lit = () => page.evaluate(() => [...document.querySelectorAll('#calls dl.calls > div')].map(d => d.classList.contains('lit')));
    assert.deepEqual(await lit(), [false, false, false], 'nothing lit before the handset is picked up');
    const p = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('handset'));
    if (w < 900) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => +document.querySelector('#calls sog-phone').dataset.lift > 0.9, null, { timeout: 3000 });
    await page.waitForFunction(() => document.querySelector('#calls dl.calls > div').classList.contains('lit'), null, { timeout: 2000 });
    const early = await lit();
    assert.ok(early[0] && !early[2], `lights in order (${early})`);
    await page.waitForFunction(() => [...document.querySelectorAll('#calls dl.calls > div')].every(d => d.classList.contains('lit')), null, { timeout: 4000 });
    await page.waitForTimeout(500);
    const op = await page.evaluate(() => [...document.querySelectorAll('#calls dl.calls dd')].map(d => +getComputedStyle(d).opacity));
    assert.ok(op.every(o => o > 0.95), `answers fully shown (${op})`);
    const q = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('handset'));
    if (w < 900) await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
    await page.waitForFunction(() => +document.querySelector('#calls sog-phone').dataset.lift < 0.05, null, { timeout: 3000 });
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · a big free-standing phone, no framed panel`, async () => {
    const { ctx, page } = await open(w);
    await bringIn(page);
    const r = await page.evaluate(() => {
      const el = document.querySelector('#calls sog-phone'), cs = getComputedStyle(el), st = el.staging();
      const box = el.getBoundingClientRect(), words = document.querySelector('#calls .words').getBoundingClientRect(), sec = document.querySelector('#calls').getBoundingClientRect();
      return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, bg: cs.backgroundColor, scenery: st.scenery, phone: st.phone,
        boxW: box.width, boxTop: box.top, boxLeft: box.left, wordsBottom: words.bottom, wordsRight: words.right,
        phoneBottomPx: box.top + st.phone.b * box.height, secBottom: sec.bottom };
    });
    assert.equal(r.radius, '0px', 'no rounded panel');
    assert.equal(r.shadow, 'none', 'no panel shadow');
    assert.match(r.bg, /rgba\(0, 0, 0, 0\)|transparent/, 'stands on the section background');
    assert.equal(r.scenery, 0, 'no counter, grass or backdrop in the scene');
    const phonePx = (r.phone.r - r.phone.l) * r.boxW;
    assert.ok(phonePx >= (w < 900 ? 300 : 440), `the phone is big (${Math.round(phonePx)}px across)`);
    assert.ok(r.phone.l > 0.02 && r.phone.t > 0.02 && r.phone.b < 0.98, `the phone isn't cut off (${JSON.stringify(r.phone)})`);
    // its base may cross into the next section (the page's art crosses the seams), but never far
    assert.ok(r.phoneBottomPx <= r.secBottom + 160, 'the phone stands at its section, not down in the next one');
    if (w < 900) assert.ok(r.boxTop >= r.wordsBottom - 1, 'on phones it sits under the text');
    else assert.ok(r.boxLeft >= r.wordsRight - 1, 'on wide screens it fills the right side');
    await ctx.close();
  });

  test(`${w}px · drag to turn it${w < 900 ? '; a vertical swipe still scrolls the page' : ''}`, async () => {
    const { ctx, page } = await open(w);
    await bringIn(page);
    const yaw = () => page.evaluate(() => +document.querySelector('#calls sog-phone').dataset.yaw);
    const spot = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('empty'));
    assert.ok(spot, 'an empty spot beside the phone');
    const y0 = await yaw();
    if (w < 900) {
      const cdp = await ctx.newCDPSession(page);
      const drag = async (dx, dy) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: spot.x, y: spot.y }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: spot.x + dx * i / 8, y: spot.y + dy * i / 8 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(500);
      };
      await drag(160, 0);
      assert.ok(Math.abs((await yaw()) - y0) > 0.3, 'a sideways drag turns it');
      const s0 = await page.evaluate(() => scrollY), y1 = await yaw();
      await drag(0, -220);
      assert.ok((await page.evaluate(() => scrollY)) > s0 + 60, 'a vertical swipe on the phone scrolls the page');
      assert.ok(Math.abs((await yaw()) - y1) < 0.15, 'and does not turn it');
    } else {
      await page.mouse.move(spot.x, spot.y); await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(spot.x + 18 * i, spot.y);
      await page.mouse.up();
      assert.ok(Math.abs((await yaw()) - y0) > 0.3, 'dragging turns it');
      assert.equal(+(await page.evaluate(() => document.querySelector('#calls sog-phone').dataset.lift)), 0, 'turning does not lift the handset');
    }
    await ctx.close();
  });

  test(`${w}px · the dial spins under a finger and springs back`, async () => {
    const { ctx, page } = await open(w);
    await bringIn(page);
    const c = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('dial'));
    const h = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('dial-hole'));
    const r = Math.hypot(h.x - c.x, h.y - c.y), a0 = Math.atan2(h.y - c.y, h.x - c.x);
    const pts = Array.from({ length: 19 }, (_, i) => { const a = a0 + (i / 18) * Math.PI; return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }; });
    const dialNow = () => page.evaluate(() => +document.querySelector('#calls sog-phone').dataset.dial);
    if (w < 900) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
      for (const q of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] });
      assert.ok(await dialNow() > 0.3, 'the dial follows the finger');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
      for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y);
      assert.ok(await dialNow() > 0.3, 'the dial follows the mouse');
      await page.mouse.up();
    }
    await page.waitForFunction(() => +document.querySelector('#calls sog-phone').dataset.dial < 0.01, null, { timeout: 4000 });
    await ctx.close();
  });
}

test('low-power device · the picture, no 3D downloaded', async () => {
  const { ctx, page, requests } = await open(390, { init: () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); } });
  await page.evaluate(() => document.querySelector('#calls sog-phone').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  assert.equal(await phoneState(page), 'still');
  assert.deepEqual(requests.filter(u => /phone\.glb|three\.module/.test(u)), []);
  await ctx.close();
});

test('reduced motion · the picture, no 3D downloaded', async () => {
  const { ctx, page, requests } = await open(390, { reduce: true });
  await page.evaluate(() => document.querySelector('#calls sog-phone').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  assert.equal(await phoneState(page), 'still');
  assert.deepEqual(requests.filter(u => /phone\.glb|three\.module/.test(u)), []);
  await ctx.close();
});

test('no WebGL · the picture stays', async () => {
  const init = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; };
  const { ctx, page, errors } = await open(1440, { init });
  await page.evaluate(() => document.querySelector('#calls sog-phone').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2000);
  assert.notEqual(await phoneState(page), 'live');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#calls sog-phone picture')).visibility), 'visible');
  assert.equal(await page.evaluate(() => document.querySelector('#calls sog-phone img').naturalWidth > 0 || !document.querySelector('#calls sog-phone img').complete), true);
  assert.deepEqual(errors.filter(e => !/WebGL/.test(e)), []);
  await ctx.close();
});
