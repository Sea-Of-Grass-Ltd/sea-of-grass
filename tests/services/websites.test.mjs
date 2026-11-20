// Websites page: a normal page in the rhythm of Dribbble Hiring (Refero 0797edc6), on Tristan's word (2026-11-19):
// "everything flows with just key words and it does the salespitch ... with just a normal scrollable page".
// Top: headline, one line, two plan cards (Care recommended with the founding five; Sites) and a small Fix / custom line.
// Then a proof row, alternating two-column pitch sections, a benefit row, a short FAQ and a one-line close.
// Key words, not paragraphs: the whole page is held to about half the words it had (1,152).
// Written from websites.journey.md before the build.  Run:  cd tests && npm install && node --test services/websites.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [360, 390, 1440];
const WEEK = '$1,200 works out to about $23 a week for a year, roughly what a couple of online orders bring in.';
const HYPE = /\b(transform\w*|revolution\w*|next level|grow your|growth|skyrocket\w*|supercharg\w*|boost\w*|game.chang\w*|unlock\w*|empower\w*|dominat\w*|explod\w*|10x|level up|cutting.edge|world.class)\b/gi;
const STYLE_FACES = /Syne|Instrument Serif|Libre Caslon Display|Archivo|Bricolage Grotesque/;
const WORDS_BEFORE = 1152, WORD_LIMIT = 600;

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const text = loc => loc.evaluate(e => e.textContent.replace(/\s+/g, ' ').replace(/’/g, "'").trim());
const inView = loc => loc.evaluate(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; });
const fam = (page, sel) => page.evaluate(s => getComputedStyle(document.querySelector(s)).fontFamily, sel);
const booksInView = page => page.evaluate(() => [...document.querySelectorAll('a')].filter(a => /^Book/.test(a.textContent.trim())).filter(a => {
  const r = a.getBoundingClientRect(), s = getComputedStyle(a); let v = s.visibility !== 'hidden' && +s.opacity > .05;
  for (let p = a.parentElement; p && v; p = p.parentElement) { const ps = getComputedStyle(p); if (ps.visibility === 'hidden' || +ps.opacity <= .05 || ps.display === 'none') v = false; }
  return v && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }).length);
const inkOf = sel => { const cv = document.querySelector(sel + ' canvas'); if (!cv) return -1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; };

test(`key words, not paragraphs: about half the words (${WORDS_BEFORE} before, ${WORD_LIMIT} at most now)`, () => {
  let s = fs.readFileSync(path.join(ROOT, 'preview/services/websites/index.html'), 'utf8');
  s = s.slice(s.indexOf('<body')).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<header class="top">[\s\S]*?<\/header>/, ' ').replace(/<div class="in">\s*<section class="more"[\s\S]*/, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, "'");
  const n = (s.match(/[A-Za-z0-9$][\w$,.'-]*/g) || []).length;
  assert.ok(n <= WORD_LIMIT, `the page has ${n} words; it should be ${WORD_LIMIT} or fewer`);
});

for (const w of WIDTHS) {
  test(`${w}px · top: the line, two plan cards and a Buy button on the first screen`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      assert.equal(await text(page.locator('h1')), 'Your website can run itself from your register.', 'the headline');
      const plans = page.locator('#plans');
      assert.equal(await plans.locator('.plan').count(), 2, 'two plan cards side by side, Dribbble-style');
      const care = plans.locator('.plan.care'), sites = plans.locator('.plan.sites');
      assert.match(await text(care.locator('.badge')), /Recommended/, 'Care is the recommended card');
      assert.match(await text(care), /\$50/, 'Care $50 a month'); assert.match(await text(sites), /\$1,200/, 'Sites from $1,200');
      assert.ok(await care.locator('.ticks li').count() >= 3 && await sites.locator('.ticks li').count() >= 3, 'check-marked lines on each card');
      assert.ok(await inView(plans.locator('[data-add]').first()), 'a Buy button on the first screen, with no taps');
      const small = await text(plans.locator('.also'));
      assert.match(small, /Fix/); assert.match(small, /\$250/); assert.match(small, /custom from \$2,000/i);
      assert.ok(await plans.locator('.also [data-add="fix"]').count() === 1, 'the fix can be bought from the small line');
      assert.equal(await page.locator('[data-add]').count(), await plans.locator('[data-add]').count(), 'Buy lives only in the plans');
      assert.equal(await page.locator('[data-add="starter-monthly"]').count(), 0, 'no $100-a-month option until Tristan confirms it');
      const unsure = page.locator('a', { hasText: 'Not sure yet? Watch it work' });
      assert.ok(await unsure.count() === 1 && (await unsure.getAttribute('href')) === '#demo', 'the unsure path');
      assert.ok(await page.evaluate(inkOf, '.hero [data-live-grass]') > 1000, 'the live meadow at the foot of the top');
      assert.equal(await booksInView(page), 1, 'one Book in view on landing');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · the plans hold every term: founding five, the $23 line, the fine-print jump`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const cfg = await page.evaluate(() => window.SOG_SHOP.founding);
      const f = await text(page.locator('#plans .plan.care .founding'));
      assert.match(f, new RegExp(`${cfg.left} of ${cfg.total}`), 'the real spots count');
      for (const re of [/\$50 a month/i, /locked for two years/i, /free photo shoot/i, /owe nothing/i, /honest review/i]) assert.match(f, re, `founding: ${re}`);
      const week = page.locator('#plans .plan.sites [data-week]');
      assert.ok(await week.isVisible(), 'the $23 line without any interaction');
      assert.equal(await text(week), WEEK, 'the $23 line, exactly');
      const jump = page.locator('#plans .jump');
      assert.ok(await jump.locator('a[href="#hookup"]').count() === 1 && await jump.locator('a[href="#faq"]').count() === 1, 'jump to the hookup and the questions');
    } finally { await ctx.close(); }
  });

  test(`${w}px · the page scrolls like a page; nothing is left from the Short`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      for (const gone of ['#short', '.track', '.progress', '[data-count]', '[data-meadow-line]', '.skip', '[inert]', '[data-weeks]', '.flower', '.ask', '[data-later]'])
        assert.equal(await page.locator(gone).count(), 0, `no ${gone}`);
      await page.mouse.move(Math.round(w / 2), 300);
      await page.mouse.wheel(0, 700); await page.waitForTimeout(400);
      const y1 = await page.evaluate(() => scrollY);
      assert.ok(y1 > 400, `the wheel scrolls the page (scrollY ${y1})`);
      await page.keyboard.press('PageDown'); await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => scrollY) > y1, 'Page Down scrolls the page');
    } finally { await ctx.close(); }
  });

  test(`${w}px · proof row: the nine demo shops, honestly labelled, each in its own type`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const row = page.locator('.proof');
      assert.equal(await row.locator('.mark').count(), 9, 'nine shop marks');
      assert.match(await text(row), /demo shops/i, 'labelled as our demo shops');
      assert.doesNotMatch(await text(row), /client|trusted by|customers/i, 'never presented as clients');
      const faces = await row.locator('.mark').evaluateAll(ms => ms.map(m => getComputedStyle(m).fontFamily.split(',')[0].replace(/"/g, '').trim()));
      assert.ok(new Set(faces).size >= 6, `each mark in its shop's own face (${[...new Set(faces)].join(', ')})`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · the pitch: alternating sections, a few key words each`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const demo = page.locator('#demo');
      assert.equal(await text(demo.locator('h2')), 'Go on. Tap Sold out.', 'the demo heading');
      await demo.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('#demo iframe')?.contentDocument?.querySelector('button[data-add="Horchata, large"]'), null, { timeout: 8000 });
      const shop = await (await demo.locator('iframe').elementHandle()).contentFrame();
      await demo.locator('[data-act="soldout"]').click(); await page.waitForTimeout(300);
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /Sold out/i, 'the live shop flips');
      assert.equal(await text(demo.locator('[data-caption]')), "That's the whole job. You never log in to anything.", 'the after-tap caption');
      const panel = demo.locator('.panel');
      assert.ok(await panel.locator('img[src*="burritos-hero"], source[srcset*="burritos-hero"]').count() >= 1, 'the burrito photo as a big rounded panel');
      assert.ok(await panel.locator('.phone iframe').count() === 1 && await panel.locator('.register').count() === 1, 'the live phone and the register sit on the panel');
      assert.ok(await panel.evaluate(e => parseFloat(getComputedStyle(e.querySelector('picture')).borderTopLeftRadius) >= 24), 'rounded panel corners');

      const calls = page.locator('#calls');
      assert.equal(await text(calls.locator('h2')), "One less call asking what's left.", 'the calls heading');
      assert.equal(await calls.locator('button').count(), 0, 'the calls are plain text');
      assert.ok(await calls.locator('img[src*="card3-phone"], source[srcset*="card3-phone"]').count() >= 1, 'the counter-phone picture');
      const ct = await text(calls);
      for (const s of ['Are you open?', 'Open until 9.', 'Any horchata left?', 'Sold out, back tomorrow.', "Don't need more business?", 'Then keep it to menu and hours.']) assert.ok(ct.includes(s), `reads: ${s}`);

      const bw = page.locator('#bunny-world');
      assert.equal(await text(bw.locator('h2')), 'Nine shops we built to show you.', 'the Bunny World heading');
      assert.equal(await bw.locator('.rail .shop iframe').count(), 9, 'all nine as live pages');
      assert.ok(await bw.locator('a[href="/bunnyworld/"]').count() >= 1, 'a way into Bunny World');

      const hook = page.locator('#hookup');
      assert.equal(await text(hook.locator('h2')), 'Hooking up, plainly.', 'the hookup heading');
      const pts = (await hook.locator('.points li').allTextContents()).map(t => t.replace(/’/g, "'").trim());
      assert.deepEqual(pts, ["Two minutes, on Square's own page.", 'Nothing changes at the counter.', 'One click in Square undoes it.'], 'three one-line points');
      assert.ok((await text(hook)).includes('Change your mind at the hookup, and you owe nothing.'), 'the owe-nothing line');
      const see = hook.locator('details');
      assert.match(await text(see.locator('summary')), /see/i, 'what we can and never see sits behind a toggle');
      await see.locator('summary').click();
      assert.match(await text(see), /never see/i, 'and opens to read');

      if (w >= 1440) {
        const side = async (sec, vis) => page.evaluate(([s, v]) => { const a = document.querySelector(s + ' ' + v).getBoundingClientRect(), t = document.querySelector(s + ' h2').getBoundingClientRect(); return a.left < t.left ? 'left' : 'right'; }, [sec, vis]);
        const d = await side('#demo', '.visual'), c = await side('#calls', '.visual');
        assert.notEqual(d, c, `the pitch alternates sides (demo picture ${d}, calls picture ${c})`);
      }
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · benefits, a short FAQ and a one-line close`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const ben = (await page.locator('.benefits li').allTextContents()).map(t => t.trim());
      assert.deepEqual(ben, ['Two-minute hookup', 'Owe nothing if you back out', 'Fixed price in writing', 'Cancel any time'], 'the benefit row');
      assert.equal(await page.locator('.benefits li svg').count(), 4, 'an icon on each benefit');

      const top = page.locator('#faq .qs > details');
      const n = await top.count();
      assert.ok(n >= 6 && n <= 8, `6 to 8 questions owners really ask (${n})`);
      const qs = (await top.locator('summary').allTextContents()).join(' | ').replace(/’/g, "'");
      for (const q of ["What's the catch?", 'We already have a Facebook page.', "I don't have time for this."]) assert.ok(qs.includes(q), `includes "${q}"`);
      await page.evaluate(() => document.querySelectorAll('#faq details').forEach(d => d.open = true));
      const answers = await top.locator('p').allTextContents();
      for (const a of answers) assert.ok((a.match(/[.!?](\s|$)/g) || []).length <= 2, `answers are one or two sentences: "${a.slice(0, 60)}…"`);
      assert.match(await text(page.locator('#faq')), /what shows up when people search/i, 'the Facebook answer');
      assert.match(await text(page.locator('#faq')), /no catch/i, 'the catch answer');

      const close = page.locator('#start');
      assert.equal(await text(close.locator('h2')), 'Talk to Tristan or Bryce.', 'a one-line close');
      assert.equal(await close.locator('a', { hasText: /^Book/ }).count(), 1, 'one Book button');
      assert.ok((await text(close)).includes('303.775.1333'), 'the phone number as text');
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.doesNotMatch(body, /first month (is )?free|free (first )?month|month (is )?free|free trial/i, 'no free month');
      assert.deepEqual(body.match(HYPE) || [], [], 'no oversell words');
    } finally { await ctx.close(); }
  });

  test(`${w}px · never two Book buttons in one view`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      let headerSeen = false;
      for (let y = 0; y <= H; y += Math.round((w < 900 ? 844 : 900) * .45)) {
        await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(250);
        const n = await booksInView(page);
        assert.ok(n <= 1, `at scroll ${y}: ${n} Book buttons in view`);
        if (y > 1400 && await page.locator('header.top a.book').evaluate(a => getComputedStyle(a).visibility !== 'hidden')) headerSeen = true;
      }
      assert.ok(headerSeen, 'the header Book shows once you scroll into the page');
    } finally { await ctx.close(); }
  });

  test(`${w}px · faces: Dew's Manrope for the buying path, the site's style faces for the pitch`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      for (const s of ['h1', '#start h2', '#faq h2']) assert.match(await fam(page, s), /Manrope/, `${s} in Manrope`);
      const pitch = await Promise.all(['#demo h2', '#calls h2', '#bunny-world h2', '#hookup h2'].map(s => fam(page, s)));
      assert.ok(pitch.every(f => STYLE_FACES.test(f)), `pitch in the site's style faces (${pitch.map(f => f.split(',')[0]).join(', ')})`);
      assert.ok(new Set(pitch.map(f => f.split(',')[0])).size >= 3, 'the pitch sections differ');
      assert.match(await fam(page, '.kick'), /Plex Mono/, 'mono only for labels');
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
