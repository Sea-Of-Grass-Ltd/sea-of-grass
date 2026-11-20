// Websites page, two paths (Fable's plan, approved 2026-11-19: "Approved, build Fable's page").
// A normal, naturally scrolling page: decided buyers buy or book straight away and can read the fine print;
// unsure visitors get an optional pitch below. Written from websites.journey.md before the build.
// Run:  cd tests && npm install && node --test services/websites.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [360, 390, 1440];
const WEEK = '$1,200 works out to about $23 a week for a year, roughly what a couple of online orders bring in.';
const BUSINESS = "Don't need more business? Then we keep it simple: menu and hours, or ordering you switch off when busy.";
const HYPE = /\b(transform\w*|revolution\w*|next level|grow your|growth|skyrocket\w*|supercharg\w*|boost\w*|game.chang\w*|unlock\w*|empower\w*|dominat\w*|explod\w*|10x|level up|cutting.edge|world.class)\b/gi;
const STYLE_FACES = /Syne|Instrument Serif|Libre Caslon Display|Archivo|Bricolage Grotesque/;

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// typographic apostrophes read the same as straight ones in the exact-wording checks
const text = loc => loc.evaluate(e => e.textContent.replace(/\s+/g, ' ').replace(/’/g, "'").trim());
const inView = loc => loc.evaluate(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; });
const fam = (page, sel) => page.evaluate(s => getComputedStyle(document.querySelector(s)).fontFamily, sel);
// how many Book buttons a visitor can see right now
const booksInView = page => page.evaluate(() => [...document.querySelectorAll('a')].filter(a => /^Book/.test(a.textContent.trim())).filter(a => {
  const r = a.getBoundingClientRect(), s = getComputedStyle(a); let v = s.visibility !== 'hidden' && +s.opacity > .05;
  for (let p = a.parentElement; p && v; p = p.parentElement) { const ps = getComputedStyle(p); if (ps.visibility === 'hidden' || +ps.opacity <= .05 || ps.display === 'none') v = false; }
  return v && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }).length);
const inkOf = sel => { const cv = document.querySelector(sel + ' canvas'); if (!cv) return -1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; };

for (const w of WIDTHS) {
  test(`${w}px · land: the promise, every price and both paths, with nothing to tap first`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      assert.equal(await text(page.locator('h1')), 'Your website can run itself from your register.', 'the hero line');
      const prices = page.locator('.hero [data-prices]');
      assert.ok(await inView(prices), 'the price line is on the first screen');
      assert.equal(await text(prices), 'Fixes $250 · care $50 a month · sites from $1,200', 'the price line, exactly');
      const buy = page.locator('.hero a', { hasText: 'See prices and buy' });
      assert.ok(await inView(buy), '"See prices and buy" on the first screen');
      assert.equal(await buy.getAttribute('href'), '#plans', 'it jumps to the plans');
      assert.ok(await inView(page.locator('.hero a', { hasText: 'Book 15 minutes' })), '"Book 15 minutes" on the first screen');
      const unsure = page.locator('.hero a', { hasText: 'Not sure yet? Watch it work' });
      assert.ok(await unsure.count() === 1 && (await unsure.getAttribute('href')) === '#demo', 'the unsure path starts at the demo');
      assert.equal(await page.locator('.hero .hint').count(), 0, 'no hint text in the hero');
      assert.ok(await page.evaluate(inkOf, '.hero [data-live-grass]') > 1000, 'the meadow along the hero foot has drawn');
      const g = await page.evaluate(() => { const h = document.querySelector('h1').getBoundingClientRect(), p = document.querySelector('.hero [data-prices]').getBoundingClientRect(); return p.top - h.bottom; });
      assert.ok(g >= 8, 'the price line sits clear of the headline');
      assert.equal(await booksInView(page), 1, 'one Book button in view on landing');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · a decided buyer reaches Buy in one tap; the page scrolls like a page`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      for (const gone of ['#short', '.track', '.progress', '[data-count]', '[data-meadow-line]', '.skip', '[inert]', '[data-weeks]', '.flower', '.ask', '[data-later]'])
        assert.equal(await page.locator(gone).count(), 0, `no ${gone} left from the Short`);
      await page.locator('.hero a', { hasText: 'See prices and buy' }).click();
      await page.waitForTimeout(400);
      const adds = page.locator('#plans [data-add]');
      assert.ok(await adds.count() >= 3, 'a Buy button on each plan row');
      assert.ok(await inView(adds.first()), 'one tap from landing, a Buy button is on screen');
      assert.equal(await page.locator('[data-add]').count(), await adds.count(), 'Buy lives only in the plan rows');
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(Math.round(w / 2), 300);
      await page.mouse.wheel(0, 700); await page.waitForTimeout(400);
      const y1 = await page.evaluate(() => scrollY);
      assert.ok(y1 > 400, `the wheel scrolls the page itself (scrollY ${y1})`);
      await page.keyboard.press('PageDown'); await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => scrollY) > y1, 'Page Down scrolls the page too');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · plans: every price out in the open, founding five on Care, the $23 line`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const plans = page.locator('#plans');
      assert.equal(await text(plans.locator('h2')), 'Every price, out in the open.', 'the plans heading');
      const rows = await plans.locator('.plan').allTextContents();
      assert.ok(rows.some(r => /Fix/.test(r) && /\$250/.test(r)), 'Fix $250 row');
      assert.ok(rows.some(r => /Care/.test(r) && /\$50/.test(r)), 'Care $50 a month row');
      assert.ok(rows.some(r => /Sites/.test(r) && /\$1,200/.test(r)), 'Sites from $1,200 row');
      assert.match(await text(plans), /custom from \$2,000/i, 'custom from $2,000 beneath');
      const cfg = await page.evaluate(() => window.SOG_SHOP.founding);
      const strip = plans.locator('.plan.care .founding');
      assert.ok(await strip.count() === 1, 'the founding strip is attached to Care');
      const f = await text(strip);
      assert.match(f, new RegExp(`${cfg.left} of ${cfg.total}`), 'the real spots count');
      for (const re of [/\$50 a month from day one/i, /locked for two years/i, /free photo shoot/i, /owe nothing/i, /honest review/i]) assert.match(f, re, `founding terms: ${re}`);
      const week = plans.locator('[data-week]');
      assert.ok(await week.isVisible(), 'the $23 line shows without any interaction');
      assert.equal(await text(week), WEEK, 'the $23 line, exactly');
      const jump = plans.locator('.jump');
      assert.match(await text(jump), /Hookup · Questions/, 'the fine-print jump link');
      assert.ok(await jump.locator('a[href="#hookup"]').count() === 1 && await jump.locator('a[href="#faq"]').count() === 1, 'jumps to the hookup and the questions');
      assert.doesNotMatch(await text(plans), /profit|pays for itself/i, 'no profit claims');
    } finally { await ctx.close(); }
  });

  test(`${w}px · the pitch: the live demo, the calls as plain text, all nine shops`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const demo = page.locator('#demo');
      assert.equal(await text(demo.locator('h2')), 'Go on. Tap Sold out.', 'the demo heading');
      await demo.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('#demo iframe')?.contentDocument?.querySelector('button[data-add="Horchata, large"]'), null, { timeout: 8000 });
      const shop = await (await demo.locator('iframe').elementHandle()).contentFrame();
      await demo.locator('[data-act="soldout"]').click(); await page.waitForTimeout(300);
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /Sold out/i, 'the live shop flips to Sold out');
      assert.equal(await text(demo.locator('[data-caption]')), "That's the whole job. We do the rest, and you never log in to anything.", 'the after-tap caption');
      await demo.locator('[data-act="soldout"]').click(); await page.waitForTimeout(300);
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /\$4\.00/, 'tap again to restock');

      const calls = page.locator('#calls');
      assert.equal(await text(calls.locator('h2')), "That's one less call asking what's left.", 'the calls heading');
      assert.ok(await calls.locator('img[src*="card3-phone"], source[srcset*="card3-phone"]').count() >= 1, 'the counter-phone picture');
      assert.equal(await calls.locator('button').count(), 0, 'nothing to tap: the calls are plain text');
      const ct = await text(calls);
      for (const s of ['Are you open?', 'Open today until 9 pm.', 'Any horchata left?', 'Sold out today, back tomorrow.', 'Can I order ahead?', 'Yes, order for pickup on the site.']) assert.ok(ct.includes(s), `reads: ${s}`);
      assert.ok(ct.includes(BUSINESS), 'the more-business answer, exactly');

      const bw = page.locator('#bunny-world');
      assert.equal(await text(bw.locator('h2')), 'Nine shops we built to show you.', 'the Bunny World heading');
      assert.equal(await bw.locator('.rail .shop').count(), 9, 'all nine shops');
      assert.equal(await bw.locator('.rail .shop iframe').count(), 9, 'each one a live page');
      assert.ok(await bw.locator('.rail').evaluate(r => r.scrollWidth > r.clientWidth + 20), 'the rail scrolls sideways');
      assert.match(await text(bw), /demo shops/i, 'the demo-shops note');
      assert.ok(await bw.locator('a[href="/bunnyworld/"]').count() >= 1, 'a link into Bunny World');
      const faces = await bw.locator('.shop-name b').evaluateAll(bs => bs.map(b => getComputedStyle(b).fontFamily.split(',')[0].replace(/"/g, '').trim()));
      assert.ok(new Set(faces).size >= 6, `each shop is labelled in its own face (${[...new Set(faces)].join(', ')})`);
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · fine print: the hookup, every answer as text, the close`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const hook = page.locator('#hookup');
      const heads = (await hook.locator('h3').allTextContents()).join(' | ');
      for (const h of ['What it involves', 'What changes for you', 'How to undo it']) assert.ok(heads.includes(h), `hookup: "${h}"`);
      const ht = await text(hook);
      assert.match(ht, /can see/i, 'what we can see'); assert.match(ht, /never see/i, 'what we never see');
      assert.ok(ht.includes('Change your mind at the hookup, and you owe nothing.'), 'the owe-nothing line');

      const faq = page.locator('#faq');
      const qs = (await faq.locator('summary').allTextContents()).join(' | ').replace(/’/g, "'");
      for (const q of ["What's the catch?", 'We already have a Facebook page.', "I don't have time for this."]) assert.ok(qs.includes(q), `the questions include "${q}"`);
      await page.evaluate(() => document.querySelectorAll('#faq details').forEach(d => d.open = true));
      const at = await text(faq);
      for (const a of [/no catch[^.]*\. It's \$50 a month from day one, and you can cancel any time/i, /what shows up when people search/i, /we do the work, and the hookup takes about two minutes/i])
        assert.match(at, a, `answer readable as text: ${a}`);

      const close = page.locator('#start');
      assert.equal(await text(close.locator('h2')), 'Talk to Tristan or Bryce.', 'the close');
      assert.equal(await close.locator('a', { hasText: /^Book/ }).count(), 1, 'one Book button in the close');
      assert.ok((await text(close)).includes('303.775.1333'), 'the phone number as text');
      assert.equal(await close.locator('a[href^="tel:"]').count() + await close.locator('button').count(), 0, 'the number is plain text, with no second button');
      await close.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
      assert.ok(await page.evaluate(inkOf, '#start [data-live-grass]') > 500, 'the meadow again at the close');

      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.doesNotMatch(body, /first month (is )?free|free (first )?month|month (is )?free|free trial/i, 'no free month anywhere');
      assert.deepEqual(body.match(HYPE) || [], [], 'no oversell words');
    } finally { await ctx.close(); }
  });

  test(`${w}px · never two Book buttons in one view; the header Book comes in on scroll`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      let headerSeen = false;
      for (let y = 0; y <= H; y += Math.round((w < 900 ? 844 : 900) * .45)) {
        await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(250);
        const n = await booksInView(page);
        assert.ok(n <= 1, `at scroll ${y}: ${n} Book buttons in view`);
        if (y > 1200 && await page.locator('header.top a.book').evaluate(a => getComputedStyle(a).visibility !== 'hidden' && a.getBoundingClientRect().bottom > 0)) headerSeen = true;
      }
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
      assert.ok(await booksInView(page) <= 1, 'at the very bottom: one Book');
      assert.ok(headerSeen, 'the header Book shows once you scroll into the page');
    } finally { await ctx.close(); }
  });

  test(`${w}px · section faces: Dew's Manrope for the buying path, the site's style faces for the pitch`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      for (const s of ['h1', '#plans h2', '#start h2']) assert.match(await fam(page, s), /Manrope/, `${s} in Manrope`);
      const pitch = await Promise.all(['#demo h2', '#calls h2', '#bunny-world h2', '#hookup h2'].map(s => fam(page, s)));
      assert.ok(pitch.every(f => STYLE_FACES.test(f)), `pitch sections use the site's own style faces (${pitch.map(f => f.split(',')[0]).join(', ')})`);
      assert.ok(new Set(pitch.map(f => f.split(',')[0])).size >= 3, 'the pitch sections differ from each other');
      assert.match(await fam(page, '.kick'), /Plex Mono/, 'mono only for the small labels');
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
