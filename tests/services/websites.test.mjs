// Websites page as a Short: journey + page rules. Written from websites.journey.md before the build (storyboard approved 2026-11-19).
// Run:  cd tests && npm install && node --test services/websites.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [360, 390, 1440];
const LINES = ['fixed and looked after', 'hours are wrong', 'register you already use', 'Tap sold out', 'Fewer calls',
  'Nine working shops', 'two minutes', 'owe nothing', '$250', 'founding shops', 'Tristan or Bryce'];
const HYPE = /\b(transform\w*|revolution\w*|next level|grow your|growth|skyrocket\w*|supercharg\w*|boost\w*|game.chang\w*|unlock\w*|empower\w*|dominat\w*|explod\w*|10x|level up|cutting.edge|world.class)\b/gi;

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const text = loc => loc.evaluate(e => e.textContent.replace(/\s+/g, ' ').trim());
const current = page => page.evaluate(() => +document.getElementById('short')?.dataset.current || 0);
const filled = page => page.locator('.progress i.on').count();
const settle = page => page.waitForTimeout(450);

// open with touch available at every width, so the swipe test runs on desktop too
async function open(w, opts = {}) {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: true,
    reducedMotion: opts.motion ? 'no-preference' : 'reduce', deviceScaleFactor: 1 });
  await ctx.route(u => !u.href.startsWith(site.base), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && (m.location().url || '').startsWith(site.base) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(site.base + PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { ctx, page, errors, w, h: mobile ? 844 : 900 };
}
async function next(page) { await page.keyboard.press('ArrowDown'); await settle(page); }
async function goTo(page, n) {
  for (let i = 0; i < 12 && await current(page) < n; i++) await next(page);
  assert.equal(await current(page), n, `reached beat ${n}`);
}
async function swipe(page, w, h, dir) {
  const c = await page.context().newCDPSession(page);
  const x = Math.round(w / 2), a = Math.round(h * (dir === 'up' ? .72 : .28)), b = Math.round(h * (dir === 'up' ? .28 : .72));
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: a }] });
  for (let i = 1; i <= 6; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(a + (b - a) * i / 6) }] });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
}

for (const w of WIDTHS) {
  test(`${w}px · land, then step through every beat: one line each, on screen, bar fills`, async () => {
    const { ctx, page, errors, h } = await open(w);
    try {
      assert.equal(await page.locator('#short .beat').count(), 11, '11 beats');
      assert.equal(await page.locator('.progress i').count(), 11, '11 progress segments');
      assert.equal(await current(page), 1, 'lands on beat 1');
      assert.equal(await filled(page), 1, 'first segment filled');
      for (let n = 1; n <= 11; n++) {
        if (n > 1) await next(page);
        assert.equal(await current(page), n, `on beat ${n}`);
        assert.equal(await filled(page), n, `bar filled to ${n}`);
        const beat = page.locator(`#short .beat[data-beat="${n}"]`);
        assert.equal(await beat.locator('[data-line]').count(), 1, `beat ${n} has exactly one line`);
        const line = beat.locator('[data-line]');
        const t = await text(line);
        assert.ok(t.includes(LINES[n - 1]), `beat ${n} line says "${LINES[n - 1]}" (got "${t}")`);
        assert.ok(t.split(/\s+/).length <= 15, `beat ${n} line is 15 words or fewer`);
        const r = await line.boundingBox();
        assert.ok(r && r.y >= 0 && r.y + r.height <= h && r.x >= 0 && r.x + r.width <= w, `beat ${n} line fits on screen`);
        const tabbable = await page.evaluate(n => [...document.querySelectorAll('#short .beat')].filter(b => +b.dataset.beat !== n)
          .flatMap(b => [...b.querySelectorAll('a,button,iframe,[tabindex]')]).filter(e => !e.closest('[inert]') && e.tabIndex >= 0).length, n);
        assert.equal(tabbable, 0, `beat ${n}: other beats can't be tabbed into`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · move one beat at a time by keyboard, tap, wheel and swipe`, async () => {
    const { ctx, page, errors, h } = await open(w, { motion: true });
    try {
      await page.keyboard.press('ArrowDown'); await settle(page);
      assert.equal(await current(page), 2, 'ArrowDown → 2');
      await page.keyboard.press('Space'); await settle(page);
      assert.equal(await current(page), 3, 'Space → 3');
      await page.keyboard.press('PageDown'); await settle(page);
      assert.equal(await current(page), 4, 'PageDown → 4');
      await page.keyboard.press('ArrowUp'); await settle(page);
      assert.equal(await current(page), 3, 'ArrowUp → 3');
      await page.keyboard.press('PageUp'); await settle(page);
      assert.equal(await current(page), 2, 'PageUp → 2');
      await page.mouse.click(Math.round(w * .88), Math.round(h * .5)); await settle(page);
      assert.equal(await current(page), 3, 'tap right side → 3');
      await page.mouse.click(Math.round(w * .1), Math.round(h * .5)); await settle(page);
      assert.equal(await current(page), 2, 'tap left side → 2');
      await page.mouse.move(Math.round(w / 2), Math.round(h / 2));
      await page.mouse.wheel(0, 400); await page.waitForTimeout(900);
      assert.equal(await current(page), 3, 'one wheel flick down → exactly one beat');
      await page.mouse.wheel(0, -400); await page.waitForTimeout(900);
      assert.equal(await current(page), 2, 'one wheel flick up → back one beat');
      await swipe(page, w, h, 'up');
      assert.equal(await current(page), 3, 'swipe up → 3');
      await swipe(page, w, h, 'down');
      assert.equal(await current(page), 2, 'swipe down → 2');
      assert.equal(await filled(page), 2, 'bar matches after all that');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · play: the register changes the live shop, Bunny World swipes sideways`, async () => {
    const { ctx, page, errors, h } = await open(w);
    try {
      await goTo(page, 4);
      const beat = page.locator('#short .beat[data-beat="4"]');
      await page.waitForFunction(() => document.querySelector('[data-beat="4"] iframe')?.contentDocument?.querySelector('button[data-add="Horchata, large"]'), null, { timeout: 8000 });
      const shop = await (await beat.locator('iframe').elementHandle()).contentFrame();
      const out = beat.locator('[data-item="Horchata, large"] [data-act="soldout"]');
      await out.click(); await settle(page);
      assert.equal(await current(page), 4, 'tapping the register does not move the beat');
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /Sold out/i, 'live shop shows Sold out');
      assert.ok(await shop.locator('button[data-add="Horchata, large"]').isDisabled(), 'live shop button disabled');
      await beat.locator('[data-item="The Big Carrot burrito"] [data-act="up"]').click(); await settle(page);
      assert.match(await shop.locator('button[data-add="The Big Carrot burrito"]').textContent(), /\$13\.00/, 'live shop shows $13.00');
      const rb = await beat.locator('.register').boundingBox(), fb = await beat.locator('.phone').boundingBox();
      assert.ok(rb.y + rb.height <= h + 1 && fb.y + fb.height <= h + 1, 'register and shop both fit on the screen');

      await goTo(page, 6);
      const bw = page.locator('#short .beat[data-beat="6"]');
      assert.ok(await bw.locator('.rail .shop').count() >= 4, 'at least four shops in the rail');
      assert.ok(await bw.locator('.rail .shop iframe').count() >= 4, 'each shop is a live page');
      await page.waitForFunction(() => document.querySelector('[data-beat="6"] .rail .shop iframe')?.contentDocument?.body?.children.length, null, { timeout: 8000 });
      assert.ok(await bw.locator('.rail').evaluate(r => r.scrollWidth > r.clientWidth + 20), 'rail scrolls sideways');
      const rail = await bw.locator('.rail').boundingBox();
      await page.mouse.click(Math.round(rail.x + rail.width * .9), Math.round(rail.y + rail.height / 2)); await settle(page);
      assert.equal(await current(page), 6, 'touching the rail does not move the beat');
      assert.ok(await bw.locator('a[href="/bunnyworld/"]').count() >= 1, 'link to walk into Bunny World');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · prices, the founding offer and "Read the details"`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      await goTo(page, 9);
      const p = await text(page.locator('#short .beat[data-beat="9"]'));
      for (const x of ['$250', '$50 a month', '$1,200', '$2,000']) assert.ok(p.includes(x), `beat 9 shows ${x}`);
      await next(page);
      const cfg = await page.evaluate(() => window.SOG_SHOP.founding);
      const f = await text(page.locator('#short .beat[data-beat="10"]'));
      assert.match(f, new RegExp(`${cfg.left} of ${cfg.total}`), 'beat 10 shows the honest spots count');
      assert.match(f, /two years/i, 'beat 10 says locked for two years');
      await next(page);
      const details = page.locator('#details');
      assert.ok(!(await details.isVisible()), 'details closed until asked for');
      const read = page.locator('#short .beat[data-beat="11"] button', { hasText: 'Read the details' });
      await read.click(); await settle(page);
      assert.equal(await read.getAttribute('aria-expanded'), 'true', 'Read the details shows expanded');
      assert.ok(await details.isVisible(), 'details open');
      await page.locator('#details #buy .shop-cards').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => /\$\s?\d/.test(document.querySelector('#details #buy .shop-cards')?.textContent || ''), null, { timeout: 5000 });
      const buy = await text(page.locator('#details #buy'));
      assert.equal((buy.match(/\$\d[\d,]*/g) || [])[0], '$2,000', 'full prices, biggest first');
      for (const x of ['$1,200', '$100 a month', '$250', '$50']) assert.ok(buy.includes(x), `full prices show ${x}`);
      const fo = await text(page.locator('#details #founding'));
      assert.match(fo, /\$50 a month from (the first day|day one)/i, 'founding: $50 from day one');
      assert.match(fo, /free photo shoot/i, 'founding: free photo shoot');
      assert.match(fo, /owe nothing/i, 'founding: owe nothing at the hookup');
      assert.match(fo, /honest review/i, 'founding: honest review');
      assert.match(await text(page.locator('#details #hookup')), /Square Dashboard/, 'hookup explained, with the undo');
      const qs = await page.locator('#details #faq summary').allTextContents();
      assert.ok(qs.length >= 8, 'every question is there');
      assert.ok(qs.filter(q => /register|Square/i.test(q)).length >= 2, 'register questions included');
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 1.5), 'details scroll as a normal page');
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.doesNotMatch(body, /first month (is )?free|free (first )?month|month (is )?free|free trial/i, 'no free month anywhere');
      assert.deepEqual(body.match(HYPE) || [], [], 'no oversell words');
      assert.match(body, /fewer (phone )?calls/i, 'speaks to fewer calls');
      assert.match(body, /time back|sav\w* (you )?time/i, 'speaks to saving time');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · "Buy by card" opens the details at the prices`, async () => {
    const { ctx, page, h } = await open(w);
    try {
      await goTo(page, 11);
      await page.locator('#short .beat[data-beat="11"]').getByRole('button', { name: 'Buy by card' }).click();
      await page.waitForTimeout(700);
      assert.ok(await page.locator('#details').isVisible(), 'details open');
      const r = await page.locator('#details #buy').boundingBox();
      assert.ok(r && r.y < h * .5 && r.y + 40 > 0, 'the prices are on screen');
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
