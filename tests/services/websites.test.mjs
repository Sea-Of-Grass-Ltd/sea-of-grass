// Websites page: a normal page in the rhythm of Dribbble Hiring (Refero 0797edc6), dressed in the Dope Security treatment
// (Refero style e2324e47, adapted; Tristan approved the sketch: "Approve both, build them"). Syne for display, Bricolage for
// section heads; glass only in distinctive shapes (a notched ticket, pills, a receipt); a photo ticket rail and a split-flap board.
// On Tristan's word (2026-11-19):
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
      assert.ok(await care.evaluate(e => e.classList.contains('ticket-shape') && !!e.querySelector('.stub.founding')), 'Care is a notched glass ticket with a perforated founding stub');
      assert.ok(await sites.evaluate(e => { const c = getComputedStyle(e); return c.backgroundColor === 'rgba(0, 0, 0, 0)' && parseFloat(c.borderLeftWidth) === 0; }), 'Sites is open type, not another box');
      assert.ok(await plans.locator('.btn.pill').count() >= 2, 'the buy buttons are glass pills');
      assert.ok(await plans.locator('.btn.pill').first().evaluate(e => parseFloat(getComputedStyle(e).borderTopLeftRadius) >= 999), 'pill-shaped');
      const board = page.locator('.flapboard .flap');
      assert.equal(await board.count(), 4, 'a split-flap board');
      assert.deepEqual((await board.locator('.flap-w').allTextContents()).map(x => x.replace(/\s/g, '')), ['HOSTING', 'CHANGES', 'ORDERS', 'HOURS'], 'spelling out what care includes');
      const unsure = page.locator('a', { hasText: 'Not sure yet? Watch it work' });
      assert.ok(await unsure.count() === 1 && (await unsure.getAttribute('href')) === '#bunny-world', 'the unsure path goes to the demo inside Bunny World');
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

  test(`${w}px · Bunny World: a photo ticket rail, and the Sold out demo inside Bunny Burritos`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const bw = page.locator('#bunny-world');
      assert.ok(await bw.locator('img[src*="/bunnyworld/brand/mark"]').count() === 1, 'led by the Bunny World mark');
      assert.equal(await text(bw.locator('h2')), 'Nine shops we built to show you.', 'the heading');
      const tickets = bw.locator('.ticket');
      assert.equal(await tickets.count(), 9, 'nine tickets');
      assert.equal(await tickets.locator('img').count(), 9, 'each ticket is the shop\'s own photo');
      assert.match(await text(tickets.first().locator('.t-lab')), /^01 · /, 'indexed');
      const faces = await bw.locator('.t-name').evaluateAll(ms => ms.map(m => getComputedStyle(m).fontFamily.split(',')[0].replace(/"/g, '').trim()));
      assert.ok(new Set(faces).size >= 6, `each shop named in its own type (${[...new Set(faces)].join(', ')})`);
      assert.ok(await bw.locator('.tickets').evaluate(r => r.scrollWidth > r.clientWidth + 20), 'the rail runs sideways');
      assert.match(await text(bw), /demo shops|no real business/i, 'honestly labelled as demo shops');
      assert.equal(await tickets.first().getAttribute('aria-pressed'), 'true', 'Bunny Burritos is open first');

      const stage = bw.locator('.open-stage');
      await stage.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('#bunny-world .open-stage iframe')?.contentDocument?.querySelector('button[data-add="Horchata, large"]'), null, { timeout: 8000 });
      assert.equal(await text(stage.locator('h3')), 'Go on. Tap Sold out.', 'the demo heading');
      const reg = stage.locator('.register');
      assert.ok(await reg.evaluate(e => getComputedStyle(e).clipPath !== 'none'), 'the register is shaped like a receipt');
      const shop = await (await stage.locator('iframe').elementHandle()).contentFrame();
      await stage.locator('[data-act="soldout"]').click(); await page.waitForTimeout(300);
      assert.match(await shop.locator('button[data-add="Horchata, large"]').textContent(), /Sold out/i, 'the live shop flips to Sold out');
      assert.equal(await text(stage.locator('[data-caption]')), "That's the whole job. You never log in to anything.", 'the after-tap caption');

      await tickets.nth(1).click(); await page.waitForTimeout(400);
      assert.equal(await tickets.nth(1).getAttribute('aria-pressed'), 'true', 'tapping a ticket selects it');
      assert.match(await stage.locator('iframe').getAttribute('src'), /hare-today/, 'and opens that shop\'s live page');
      assert.ok(!(await reg.isVisible()), 'the register belongs to Bunny Burritos only');
      assert.ok(await stage.locator('a[href="/bunnyworld/hare-today/"]').count() === 1, 'with a way into that shop');
      await tickets.first().click(); await page.waitForTimeout(400);
      assert.ok(await reg.isVisible(), 'back to Bunny Burritos, the register returns');
      assert.ok(await bw.locator('a[href="/bunnyworld/"]').count() >= 1, 'a way into Bunny World');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · the pitch: fewer calls and hooking up, a few key words each`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      assert.equal(await page.locator('#demo').count(), 0, 'the demo now lives inside Bunny World');
      const calls = page.locator('#calls');
      assert.equal(await text(calls.locator('h2')), "One less call asking what's left.", 'the calls heading');
      assert.equal(await calls.locator('button').count(), 0, 'the calls are plain text');
      const slot = calls.locator('[data-embed-slot="rotary-phone"]');
      assert.equal(await slot.count(), 1, 'the picture sits in a slot ready for the 3D phone');
      assert.ok(await slot.locator('img[src*="card3-phone"], source[srcset*="card3-phone"]').count() >= 1, 'with the counter-phone picture for now');
      const ct = await text(calls);
      for (const x of ['Are you open?', 'Open until 9.', 'Any horchata left?', 'Sold out, back tomorrow.', "Don't need more business?", 'Then keep it to menu and hours.']) assert.ok(ct.includes(x), `reads: ${x}`);

      const hook = page.locator('#hookup');
      assert.equal(await text(hook.locator('h2')), 'Hooking up, plainly.', 'the hookup heading');
      const pts = (await hook.locator('.points li').allTextContents()).map(t => t.replace(/’/g, "'").trim());
      assert.deepEqual(pts, ["Two minutes, on Square's own page.", 'Nothing changes at the counter.', 'One click in Square undoes it.'], 'three one-line points');
      assert.ok((await text(hook)).includes('Change your mind at the hookup, and you owe nothing.'), 'the owe-nothing line');
      const see = hook.locator('details');
      assert.match(await text(see.locator('summary')), /see/i, 'what we can and never see sits behind a toggle');
      await see.locator('summary').click();
      assert.match(await text(see), /never see/i, 'and opens to read');
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
      assert.ok(await close.locator('a.btn.pill', { hasText: /^Book/ }).count() === 1, 'the closing Book is a glass pill');
      assert.ok(await close.locator('[data-live-grass]').count() === 1, 'over the meadow');
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

  test(`${w}px · one headline system: Syne for display, Bricolage for section heads`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      assert.match(await fam(page, 'h1'), /Syne/, 'the headline in Syne');
      assert.match(await fam(page, '#start h2'), /Syne/, 'the closing line in Syne');
      const heads = await page.$$eval('main h2:not(#start h2), .plan .amt', hs => hs.map(h => getComputedStyle(h).fontFamily));
      assert.ok(heads.length >= 5 && heads.every(f => /Bricolage/.test(f)), `section heads and prices in Bricolage (${[...new Set(heads.map(f => f.split(',')[0]))].join(', ')})`);
      assert.match(await fam(page, '.kick'), /Plex Mono/, 'mono only for labels');
      assert.match(await fam(page, '.hero .sub'), /Bricolage|Inter/, 'no third headline face');
    } finally { await ctx.close(); }
  });
}

// Palette swap-ready (Tristan, 2026-11-19: "Remove the blue color absolutely, work with Refero to find me a new palette").
// Every colour lives in :root custom properties, so the chosen palette is one edit; no colour literal outside :root.
test('every colour is a custom property, set once in :root', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  const i = css.indexOf(':root{'), j = css.indexOf('}', i);
  const outside = (css.slice(0, i) + css.slice(j + 1)).replace(/\/\*[\s\S]*?\*\//g, '');
  const lits = outside.match(/#[0-9a-f]{3,8}\b|rgba?\(\s*\d[^)]*\)|hsla?\(\s*\d[^)]*\)/gi) || [];
  assert.deepEqual(lits, [], 'colour literals outside :root');
  for (const t of ['--ground', '--text', '--poppy', '--card-tint-rgb', '--grass']) assert.ok(css.slice(i, j).includes(t + ':'), `${t} is defined`);
  const html = fs.readFileSync(path.join(ROOT, 'preview/services/websites/index.html'), 'utf8');
  assert.deepEqual(html.match(/style="[^"]*(#[0-9a-f]{3,8}|rgba?\()[^"]*"/gi) || [], [], 'no inline colours in the page');
});

// The approved palette, "Night meadow with poppies" (Tristan, 2026-11-19; PALETTE.md in the shared notes). Colour only.
const PALETTE = { '--ground': '#1F1F35', '--navy': '#272C4B', '--navy-line': '#39406A', '--moss': '#263535', '--grass': '#3F6550', '--sage': '#7F917F',
  '--plum': '#332739', '--plum-mute': '#61465C', '--poppy': '#D17C66', '--poppy-deep': '#A8564D', '--gold': '#C8B27B', '--soft': '#9B97B1', '--text': '#DAD1CD' };
const hexRgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const SKY = /509DFC|7DB5FF|0058D6|6DA7FF|A7CAFF|80,\s*157,\s*252|0,\s*88,\s*214|150,\s*190,\s*255|120,\s*170,\s*255/i;
test('palette: the exact approved tokens, and no sky blue left in the page files', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
  for (const [k, v] of Object.entries(PALETTE)) assert.ok(new RegExp(k + ':\\s*' + v, 'i').test(root), `${k} is ${v}`);
  for (const f of ['websites.css', 'index.html', 'page.js', 'register.js'])
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'preview/services/websites', f), 'utf8'), SKY, `no sky blue in ${f}`);
});
for (const w of WIDTHS) {
  test(`${w}px · palette: sections take turns, poppy is the only CTA, gold only on eyebrows, 2–4 borrowed touches per section`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const grounds = [PALETTE['--navy'], PALETTE['--moss'], PALETTE['--plum']].map(hexRgb);
      const bgs = await page.$$eval('body > section, main > section', ss => ss.map(s => [s.id || s.className, getComputedStyle(s).backgroundColor]));
      for (const [n, bg] of bgs) assert.ok(grounds.includes(bg), `${n} sits on navy, moss or plum (${bg})`);
      for (let i = 1; i < bgs.length; i++) assert.notEqual(bgs[i][1], bgs[i - 1][1], `${bgs[i][0]} takes a turn after ${bgs[i - 1][0]}`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), hexRgb(PALETTE['--ground']), 'page ground');
      const poppy = hexRgb(PALETTE['--poppy']);
      const ctas = await page.$$eval('.btn.pill, header.top a.book', bs => bs.map(b => getComputedStyle(b).backgroundColor));
      assert.ok(ctas.length >= 4 && ctas.every(c => c === poppy), `every CTA is poppy (${[...new Set(ctas)].join(', ')})`);
      const others = await page.$$eval('main *, .hero *', (es, p) => es.filter(e => !e.matches('.btn.pill,.reg-out[aria-pressed="true"]') && getComputedStyle(e).backgroundColor === p).map(e => e.className), poppy);
      assert.deepEqual(others, [], 'poppy fills nothing but buttons');
      const gold = hexRgb(PALETTE['--gold']);
      const golds = await page.$$eval('body *', (es, g) => es.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(e).color === g && !e.closest('.kick')).map(e => e.className || e.tagName), gold);
      assert.deepEqual(golds, [], 'gold only on small eyebrow labels');
      for (const sec of await page.$$('body > section, main > section')) {
        const name = await sec.evaluate(s => s.id || s.className);
        const n = await sec.$$eval('.touch', ts => ts.filter(t => t.getBoundingClientRect().width > 0).length);
        assert.ok(n >= 2 && n <= 4, `${name} borrows 2–4 touches from the others (${n})`);
      }
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
