// The live counter phone on the Websites page ("One less call asking what's left"). Written before the swap.
// The section's three lines play the phone's moves: "Are you open?" rings it, "Any horchata left?" lifts the
// handset, "Can I order ahead?" turns the dial. Run:  cd tests && node --test services/phone-page.test.mjs
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

  test(`${w}px · the three lines play ring, lift and dial`, async () => {
    const { ctx, page, errors } = await open(w);
    await bringIn(page);
    const moves = ['ring', 'lift', 'dial'];
    for (let i = 0; i < 3; i++) {
      // tap or hover the line (works whatever the layout puts on screen)
      const line = page.locator('#calls dl.calls > div').nth(i);
      await line.scrollIntoViewIfNeeded();
      if (w < 900) await line.tap(); else await line.hover();
      await page.waitForFunction(m => document.querySelector('#calls sog-phone').dataset.move === m, moves[i], { timeout: 3000 });
    }
    // lift really lifts, dial really turns
    await page.locator('#calls dl.calls > div').nth(1).dispatchEvent('click');
    await page.waitForFunction(() => +document.querySelector('#calls sog-phone').dataset.lift > 0.9, null, { timeout: 3000 });
    await page.locator('#calls dl.calls > div').nth(2).dispatchEvent('click');
    await page.waitForFunction(() => +document.querySelector('#calls sog-phone').dataset.dial > 0.3, null, { timeout: 3000 });
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

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
