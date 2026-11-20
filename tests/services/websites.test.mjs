// Websites page as a Short: journey + page rules. Written from websites.journey.md before the build (storyboard approved 2026-11-19).
// Run:  cd tests && npm install && node --test services/websites.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [360, 390, 1440];
const LINES = ['run itself from your register', 'Tap Sold out', 'one less call', 'Nine shops we built', '$50 a month', 'first five shops'];
const SAFETY = "$50 a month, locked for two years, and a free photo shoot. You tap Connect on Square's own page, one click undoes it, and if you back out there you owe nothing.";
const WEEK = '$1,200 works out to about $23 a week for a year, roughly what a couple of online orders bring in.';
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
  test(`${w}px · six cards: one line each, art on every card, bar fills`, async () => {
    const { ctx, page, errors, h } = await open(w);
    try {
      assert.equal(await page.locator('#short .beat').count(), 6, '6 cards');
      assert.equal(await page.locator('.progress i').count(), 6, '6 progress segments');
      assert.equal(await current(page), 1, 'lands on card 1');
      assert.match(await text(page.locator('#short .beat[data-beat="1"]')), /fixed and looked after/i, 'card 1 keeps "fixed and looked after" as its kicker');
      for (let n = 1; n <= 6; n++) {
        if (n > 1) await next(page);
        assert.equal(await current(page), n, `on card ${n}`);
        assert.equal(await filled(page), n, `bar filled to ${n}`);
        const beat = page.locator(`#short .beat[data-beat="${n}"]`);
        assert.equal(await beat.locator('[data-line]').count(), 1, `card ${n} has exactly one line`);
        const line = beat.locator('[data-line]'), t = await text(line);
        assert.ok(t.includes(LINES[n - 1]), `card ${n} line says "${LINES[n - 1]}" (got "${t}")`);
        assert.ok(t.split(/\s+/).length <= 15, `card ${n} line is 15 words or fewer`);
        const r = await line.boundingBox();
        assert.ok(r && r.y >= 0 && r.y + r.height <= h && r.x >= 0 && r.x + r.width <= w, `card ${n} line fits on screen`);
        const art = beat.locator('[data-art]');
        assert.ok(await art.count() >= 1, `card ${n} has art`);
        const ab = await art.first().boundingBox();
        assert.ok(ab && ab.width * ab.height >= w * h * .25, `card ${n} art covers at least a quarter of the screen`);
        const tabbable = await page.evaluate(n => [...document.querySelectorAll('#short .beat')].filter(b => +b.dataset.beat !== n)
          .flatMap(b => [...b.querySelectorAll('a,button,iframe,[tabindex]')]).filter(e => !e.closest('[inert]') && e.tabIndex >= 0).length, n);
        assert.equal(tabbable, 0, `card ${n}: other cards can't be tabbed into`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · move one card at a time by keyboard, tap, wheel and swipe`, async () => {
    const { ctx, page, errors, h } = await open(w, { motion: true });
    try {
      await page.mouse.click(Math.round(w * .88), Math.round(h * .3)); await settle(page);
      assert.equal(await current(page), 2, 'tap right side on card 1 → 2');
      await page.keyboard.press('Space'); await settle(page);
      assert.equal(await current(page), 3, 'Space → 3');
      await page.keyboard.press('PageDown'); await settle(page);
      assert.equal(await current(page), 4, 'PageDown → 4');
      await page.keyboard.press('ArrowUp'); await settle(page);
      assert.equal(await current(page), 3, 'ArrowUp → 3');
      await page.mouse.click(Math.round(w * .1), Math.round(h * .3)); await settle(page);
      assert.equal(await current(page), 2, 'tap left side on card 3 → 2');
      await page.keyboard.press('ArrowDown'); await settle(page);
      assert.equal(await current(page), 3, 'ArrowDown → 3');
      await page.keyboard.press('PageUp'); await settle(page);
      assert.equal(await current(page), 2, 'PageUp → 2');
      await page.mouse.move(Math.round(w / 2), Math.round(h * .15));
      await page.mouse.wheel(0, 400); await page.waitForTimeout(900);
      assert.equal(await current(page), 3, 'one wheel flick down → exactly one card');
      await page.mouse.wheel(0, -400); await page.waitForTimeout(900);
      assert.equal(await current(page), 2, 'one wheel flick up → back one card');
      await swipe(page, w, h, 'up');
      assert.equal(await current(page), 3, 'swipe up → 3');
      await swipe(page, w, h, 'down');
      assert.equal(await current(page), 2, 'swipe down → 2');
      assert.equal(await filled(page), 2, 'bar matches after all that');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · play: tap Sold out, swipe the nine shops`, async () => {
    const { ctx, page, errors, h } = await open(w);
    try {
      assert.ok(await page.locator('[data-beat="2"] iframe').getAttribute('src'), 'the shop is preloaded on card 1');
      await goTo(page, 2);
      const beat = page.locator('#short .beat[data-beat="2"]');
      await page.waitForFunction(() => document.querySelector('[data-beat="2"] iframe')?.contentDocument?.querySelector('button[data-add="Horchata, large"]'), null, { timeout: 8000 });
      const shop = await (await beat.locator('iframe').elementHandle()).contentFrame();
      await beat.locator('[data-item="Horchata, large"] [data-act="soldout"]').click(); await settle(page);
      assert.equal(await current(page), 2, 'tapping the register does not move the card');
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /Sold out/i, 'live shop shows Sold out');
      assert.ok(await shop.locator('button[data-add="Horchata, large"]').isDisabled(), 'live shop button disabled');
      assert.equal(await text(beat.locator('[data-caption]')), "That's the whole job. You never log in to anything.", 'caption swaps after the tap');
      const rb = await beat.locator('.register').boundingBox(), fb = await beat.locator('.phone').boundingBox();
      assert.ok(rb.y + rb.height <= h + 1 && fb.y + fb.height <= h + 1, 'register and shop both fit on the screen');

      await goTo(page, 4);
      const bw = page.locator('#short .beat[data-beat="4"]');
      assert.equal(await bw.locator('.rail .shop').count(), 9, 'all nine shops');
      assert.equal(await bw.locator('.rail .shop iframe').count(), 9, 'each shop is a live page');
      assert.equal(await text(bw.locator('[data-rail-count]')), '1 of 9', 'count starts at 1 of 9');
      await page.waitForFunction(() => document.querySelector('[data-beat="4"] .rail .shop iframe')?.contentDocument?.body?.children.length, null, { timeout: 8000 });
      await bw.locator('.rail').evaluate(r => r.scrollTo({ left: r.querySelectorAll('.shop')[1].offsetLeft - r.offsetLeft, behavior: 'auto' }));
      await page.waitForTimeout(500);
      assert.equal(await text(bw.locator('[data-rail-count]')), '2 of 9', 'count follows the rail');
      const rail = await bw.locator('.rail').boundingBox();
      await page.mouse.click(Math.round(rail.x + rail.width * .9), Math.round(rail.y + rail.height / 2)); await settle(page);
      assert.equal(await current(page), 4, 'touching the rail does not move the card');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · the price, the first five, one button, and the details`, async () => {
    const { ctx, page, errors, h } = await open(w);
    try {
      await goTo(page, 5);
      const pr = page.locator('#short .beat[data-beat="5"]');
      const p = await text(pr);
      for (const x of ['$250', '$1,200', '$2,000']) assert.ok(p.includes(x), `card 5 shows ${x}`);
      assert.ok(!(await pr.locator('[data-week]').isVisible()), 'the $23 line waits for the tap');
      await pr.locator('button', { hasText: '$1,200' }).click(); await settle(page);
      assert.equal(await current(page), 5, 'tapping $1,200 does not move the card');
      assert.equal(await text(pr.locator('[data-week]')), WEEK, 'tapping $1,200 shows the $23-a-week line exactly');
      assert.doesNotMatch(await text(pr), /profit|pays for itself/i, 'no profit or pays-for-itself claims');

      await next(page);
      const fin = page.locator('#short .beat[data-beat="6"]');
      const cfg = await page.evaluate(() => window.SOG_SHOP.founding);
      assert.match(await text(fin), new RegExp(`${cfg.left} of ${cfg.total}`), 'honest spots count');
      assert.equal(await fin.locator('.flower').count(), cfg.total, 'one flower per founding spot');
      assert.equal(await fin.locator('.flower.open').count(), cfg.left, 'open flowers match the spots left');
      const ctas = fin.locator('a.btn, button.btn');
      assert.equal(await ctas.count(), 1, 'one button only');
      assert.match(await text(ctas.first()), /Book 15 minutes with Tristan or Bryce/, 'the one button');
      assert.ok((await text(fin)).includes('303.775.1333'), 'phone number beneath');
      assert.equal(await text(fin.locator('[data-safety]')), SAFETY, 'the safety line, exactly');
      assert.match(await text(fin), /a Bunny World demo photo/i, 'photo captioned honestly');
      assert.ok(!(await page.locator('.top-wrap a.book').isVisible()), "header's Book button hidden on the last card");

      const details = page.locator('#details');
      assert.ok(!(await details.isVisible()), 'details closed until asked for');
      const read = fin.locator('.more-link');
      await read.click(); await settle(page);
      assert.equal(await read.getAttribute('aria-expanded'), 'true', 'Read the details shows expanded');
      assert.ok(await details.isVisible(), 'details open');
      await page.locator('#details #buy .shop-cards').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => /\$\s?\d/.test(document.querySelector('#details #buy .shop-cards')?.textContent || ''), null, { timeout: 5000 });
      const buy = await text(page.locator('#details #buy'));
      assert.equal((buy.match(/\$\d[\d,]*/g) || [])[0], '$2,000', 'full prices, biggest first');
      for (const x of ['$1,200', '$100 a month', '$250', '$50']) assert.ok(buy.includes(x), `full prices show ${x}`);
      assert.match(await text(page.locator('#details')), /hello@seaofgrass\.studio/, 'email lives in the details');
      assert.match(await text(page.locator('#details #founding')), /free photo shoot/i, 'founding offer in the details');
      assert.match(await text(page.locator('#details #hookup')), /Square Dashboard/, 'hookup explained, with the undo');
      const qs = await page.locator('#details #faq summary').allTextContents();
      assert.ok(qs.length >= 8 && qs.filter(q => /register|Square/i.test(q)).length >= 2, 'every question, register ones included');
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.doesNotMatch(body, /first month (is )?free|free (first )?month|month (is )?free|free trial/i, 'no free month anywhere');
      assert.deepEqual(body.match(HYPE) || [], [], 'no oversell words');
      assert.match(body, /less call|fewer calls/i, 'speaks to fewer calls');
      assert.match(body, /never log in/i, 'speaks to less work');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
