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
  await ctx.addInitScript(p => { window.__callsPace = p; }, opts.pace || 0.5);   // calls run twice as fast in tests
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

  // 2026-11-20, Tristan: "That section just feels like a drag", "link the two phones" (old way vs new way), the phone
  // is NAGGING, "It should make a sound too that's annoying", headline "Tired of annoying calls?".
  test(`${w}px · the old way: copy, nudge and call cards`, async () => {
    const { ctx, page } = await open(w);
    const c = await page.evaluate(() => ({
      kick: document.querySelector('#calls .kick')?.textContent.trim(),
      h2: document.querySelector('#calls h2')?.textContent.replace(/\s+/g, ' ').trim(),
      own: !!document.querySelector('#calls dl.own'),
      nudge: document.querySelector('#calls .calls-nudge a')?.getAttribute('href'),
      nudgeText: document.querySelector('#calls .calls-nudge')?.textContent.trim(),
      cards: [...document.querySelectorAll('#calls dl.calls > div')].map(d => d.dataset.call),
      mute: !!document.querySelector('#calls button.calls-mute'),
    }));
    assert.equal(c.kick, 'The old way');
    assert.equal(c.h2, 'Tired of annoying calls?', 'sentence case, no Title Case');
    assert.equal(c.own, false, 'the "Don’t need more business?" aside is folded away');
    assert.equal(c.nudge, '#demo-stage', 'the nudge points back up at the Sold out demo');
    assert.match(c.nudgeText, /Tap Sold out above and watch/);
    assert.deepEqual(c.cards, ['open', 'horchata', 'ahead']);
    assert.ok(c.mute, 'a mute toggle sits by the phone');
    await ctx.close();
  });

  test(`${w}px · ignored, it nags harder: ring 1, 2, 3, then a long pause`, async () => {
    const { ctx, page, errors } = await open(w);
    await bringIn(page);
    const sec = k => page.evaluate(k => document.querySelector('#calls').dataset[k], k);
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '1', null, { timeout: 4000 });
    assert.equal(await sec('call'), 'horchata', 'the first call is "Any horchata left?"');
    assert.ok(await page.evaluate(() => document.querySelector('#calls [data-call="horchata"]').classList.contains('ringing')));
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '2', null, { timeout: 4000 });
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '3', null, { timeout: 4000 });
    // stage 3 shuffles a little but never leaves its box
    const st = await page.evaluate(() => document.querySelector('#calls sog-phone').staging());
    assert.ok(st.phone.l > 0 && st.phone.r < 1 && st.phone.t > 0 && st.phone.b < 1, `stays in its area (${JSON.stringify(st.phone)})`);
    // never more than three in a row: then a pause, and the call is missed
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '0', null, { timeout: 5000 });
    assert.ok(await page.evaluate(() => document.querySelector('#calls [data-call="horchata"]').classList.contains('missed')), 'ignored three times: a missed call');
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · the new way: tapping Sold out above cuts the ring and the site answers`, async () => {
    const { ctx, page, errors } = await open(w);
    await bringIn(page);
    await page.waitForFunction(() => +document.querySelector('#calls').dataset.stage >= 1, null, { timeout: 4000 });
    const btn = page.locator('#demo-stage [data-act="soldout"]');
    await btn.scrollIntoViewIfNeeded();
    // on wide screens the pinned scene may already have tapped it by itself; the visitor's own tap is what counts
    if ((await btn.getAttribute('aria-pressed')) === 'true') { await btn.click(); await page.waitForTimeout(200); }
    await btn.click();
    await bringIn(page);
    await page.waitForFunction(() => document.querySelector('#calls').dataset.mode === 'new', null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.querySelector('#calls').dataset.stage), '0', 'the ring is cut off');
    const cards = await page.evaluate(() => [...document.querySelectorAll('#calls dl.calls > div')].map(d => ({ site: d.classList.contains('site'), ringing: d.classList.contains('ringing'), ans: d.querySelector('dd').textContent })));
    assert.ok(cards.every(c => c.site && !c.ringing), `every call answered by the site (${JSON.stringify(cards)})`);
    assert.match(cards[1].ans, /Sold out, back tomorrow\./);
    assert.ok(await page.evaluate(() => document.querySelector('#calls sog-phone').dataset.slumped === '1'), 'the phone slumps');
    // and it stays quiet
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => document.querySelector('#calls').dataset.stage), '0', 'no more ringing');
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · lifting the handset answers by hand, but it rings again after a pause`, async () => {
    const { ctx, page, errors } = await open(w);
    await bringIn(page);
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '1', null, { timeout: 4000 });
    const p = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('handset'));
    if (w < 900) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => document.querySelector('#calls').dataset.stage === '0', null, { timeout: 2000 });
    assert.ok(await page.evaluate(() => document.querySelector('#calls [data-call="horchata"]').classList.contains('hand')), 'the owner answered it by hand');
    const q = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('handset'));
    if (w < 900) await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
    await page.waitForFunction(() => +document.querySelector('#calls').dataset.stage >= 1, null, { timeout: 6000 });   // the old way never ends
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px · sound waits for a tap, and the bell can be muted for the visit`, async () => {
    const { ctx, page } = await open(w);
    await bringIn(page);
    await page.waitForFunction(() => +document.querySelector('#calls').dataset.stage >= 1, null, { timeout: 4000 });
    assert.equal(await page.evaluate(() => document.querySelector('#calls').dataset.audio), 'locked', 'silent until the visitor taps something');
    const btn = page.locator('#calls button.calls-mute');
    if (w < 900) await page.locator('#calls h2').tap(); else await page.locator('#calls h2').click();
    await page.waitForFunction(() => document.querySelector('#calls').dataset.audio === 'on', null, { timeout: 2000 });
    await btn.click();
    assert.equal(await page.evaluate(() => document.querySelector('#calls').dataset.audio), 'muted');
    assert.equal(await btn.getAttribute('aria-pressed'), 'true');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#calls button.calls-mute').getAttribute('aria-pressed'), 'true', 'remembered for the visit');
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

test('reduced motion · still picture, calls still play, sound off until unmuted', async () => {
  const { ctx, page } = await open(1440, { reduce: true });
  await page.evaluate(() => document.querySelector('#calls').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => +document.querySelector('#calls').dataset.stage >= 1, null, { timeout: 4000 });
  assert.equal(await phoneState(page), 'still');
  assert.equal(await page.locator('#calls button.calls-mute').getAttribute('aria-pressed'), 'true', 'muted by default');
  await page.locator('#calls [data-call="horchata"]').click();   // without the 3D phone, the ringing card itself picks up
  await page.waitForFunction(() => document.querySelector('#calls [data-call="horchata"]').classList.contains('hand'), null, { timeout: 2000 });
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

test('the call cards keep their height through every state (nothing below them jumps)', async () => {
  for (const w of [390, 1440]) {
    const { ctx, page } = await open(w);
    await bringIn(page);
    const heights = () => page.evaluate(() => [...document.querySelectorAll('#calls dl.calls > div')].map(d => Math.round(d.getBoundingClientRect().height)));
    await page.waitForFunction(() => +document.querySelector('#calls').dataset.stage >= 1, null, { timeout: 4000 });
    const ringing = await heights();
    const p = await page.evaluate(() => document.querySelector('#calls sog-phone').pointOf('handset'));
    if (w < 900) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => document.querySelector('#calls [data-call="horchata"]').classList.contains('hand'), null, { timeout: 2000 });
    assert.deepEqual(await heights(), ringing, `${w}px: answered by hand, same heights`);
    const btn = page.locator('#demo-stage [data-act="soldout"]');
    await btn.scrollIntoViewIfNeeded();
    if ((await btn.getAttribute('aria-pressed')) === 'true') { await btn.click(); await page.waitForTimeout(200); }
    await btn.click();
    await page.waitForFunction(() => document.querySelector('#calls').dataset.mode === 'new', null, { timeout: 2000 });
    assert.deepEqual(await heights(), ringing, `${w}px: answered by the site, same heights`);
    await ctx.close();
  }
});
