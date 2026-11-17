// Bunny World landing, tightened (Tristan approved Hero A + Main Street A, 2026-11-16; spec notes/bunny-world/critic/hero-tighten.md).
// Journey: land → read one big line, one short tagline, one button → see all four prices without scrolling →
// tap "Pick your shop" → "What kind of shop do you run?" with the nine trades → try one → open it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = '/bunnyworld/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });
const txt = s => (s || '').replace(/\s+/g, ' ').trim();

for (const w of [390, 1440]) test(`hero @ ${w}: logo over a one-line headline as one unit, the line and button smaller, all four prices on the first screen`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => {
      const hero = document.querySelector('.hero'), h1 = hero.querySelector('h1'), lede = hero.querySelector('.lede');
      const prices = [...document.querySelectorAll('#prices .pc')].map(p => p.getBoundingClientRect());
      const go = hero.querySelector('.lh-go'), mark = hero.querySelector('.lh-mark').getBoundingClientRect(), hr = h1.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(h1).fontSize);
      return {
        lede: lede && lede.innerText, go: go && go.innerText, goHref: go && go.getAttribute('href'),
        question: /what kind of shop/i.test(hero.innerText),
        calls: [...hero.querySelectorAll('a[href]')].filter(a => /cal\.com/.test(a.href)).map(a => a.innerText.trim()),
        pricesBottom: Math.max(...prices.map(p => p.bottom)), priceCount: prices.length, vh: innerHeight,
        ledeTop: lede.getBoundingClientRect().top, ledeFont: parseFloat(getComputedStyle(lede).fontSize), ledeMid: (lede.getBoundingClientRect().left + lede.getBoundingClientRect().right) / 2,
        goMid: (go.getBoundingClientRect().left + go.getBoundingClientRect().right) / 2, goW: go.getBoundingClientRect().width, vw: innerWidth,
        h1Lines: Math.round(hr.height / (lh * 1.02)), h1Font: lh, h1: hr, mark: { left: mark.left, top: mark.top, bottom: mark.bottom, w: mark.width, h: mark.height },
      };
    });
    assert.equal(txt(r.lede), 'Imaginary shops, real websites.');
    assert.equal(txt(r.go).replace(/\s*↓/, ' ↓'), 'Pick your shop ↓');
    assert.equal(r.goHref, '#shops');
    assert.equal(r.question, false, 'the shop question moved to Main Street');
    assert.deepEqual(r.calls, [], 'no call link in the hero: the call is in the header');
    assert.equal(r.priceCount, 4);
    // desktop: all four prices under the hero on the first screen. Phones are three pages now (hero, shops, prices; mobile-hero.test.mjs)
    if (w >= 900) assert.ok(r.pricesBottom <= r.vh, `all four prices on the first screen (they end at ${Math.round(r.pricesBottom)}px of ${r.vh})`);
    // the critic's Refero pick (2026-11-16): the logo centred directly above a one-line headline, one big unit;
    // the line and the button centred and smaller below
    // one line from 1000px up; below that both loop lines break onto two (proportion spec)
    assert.equal(r.h1Lines, 1, `headline lines (${Math.round(r.h1.height)}px tall at ${r.h1Font}px)`);
    const big = w >= 1000 ? [300, 310] : [80, 130]; // phones: a compact unit (Tristan, 2026-11-16: the logo was oversized)
    assert.ok(r.mark.h >= big[0] && r.mark.h <= big[1], `the logo is big (${Math.round(r.mark.h)}px tall, want ${big})`);
    if (w >= 900) assert.ok(r.h1Font >= 120, `the headline is big (${r.h1Font}px)`);
    const midMark = r.mark.left + r.mark.w / 2, midH1 = r.h1.left + r.h1.width / 2;
    assert.ok(Math.abs(midMark - midH1) <= 2, `logo centred over the headline (${Math.round(midMark)} vs ${Math.round(midH1)})`);
    const gapUnit = r.h1.top - r.mark.bottom, gapBelow = r.ledeTop - r.h1.bottom;
    assert.ok(gapUnit >= -2 && gapUnit <= r.mark.h * 0.1, `logo sits right on the headline (${Math.round(gapUnit)}px)`);
    assert.ok(gapBelow > gapUnit, `the line below sits further off than the logo (${Math.round(gapBelow)} vs ${Math.round(gapUnit)}px)`);
    assert.ok(r.ledeFont * 2.5 <= r.h1Font, `the line is much smaller than the headline (${r.ledeFont} vs ${r.h1Font}px)`);
    assert.ok(Math.abs(r.ledeMid - midH1) <= 2 && Math.abs(r.goMid - midH1) <= 2, 'the line and the button are centred under it');
    assert.ok(r.goW < r.vw * 0.7, `the button is small, not full width (${Math.round(r.goW)}px)`);
  } finally { await ctx.close(); }
});

for (const w of [390, 1440]) test(`Main Street @ ${w}: the question, nine plain trades, one sentence and one Open button`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    await page.evaluate(() => document.querySelector('#shops').scrollIntoView());
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const s = document.querySelector('#shops');
      return {
        h2: s.querySelector('h2')?.innerText, sub: s.querySelector('.show-sub')?.innerText,
        numbers: [...s.querySelectorAll('[role=tab] *')].filter(e => e.children.length === 0 && /^\s*0?\d{1,2}\s*$/.test(e.textContent) && e.getBoundingClientRect().width).map(e => e.textContent),
        fullSite: [...s.querySelectorAll('a')].filter(a => /full site/i.test(a.innerText) && a.getBoundingClientRect().width).length,
        opens: [...s.querySelectorAll('a')].filter(a => /^open\s/i.test(a.innerText.trim()) && a.getBoundingClientRect().width).map(a => a.innerText.trim()),
        floating: [...s.querySelectorAll('.callouts, .co, .open-dev')].filter(e => e.getBoundingClientRect().width).length,
        say: s.querySelector('.show-say')?.innerText,
      };
    });
    assert.equal(txt(r.h2), 'What kind of shop do you run?');
    assert.match(txt(r.sub), w < 900 ? /^Tap your trade and its site opens right here\.$/ : /^Pick your trade and its site opens right here for you to try\.$/);
    assert.deepEqual(r.numbers, [], 'no 01–09 numbers');
    assert.equal(r.fullSite, 0, 'no second "Open the full site" link');
    assert.equal(r.floating, 0, 'no pills or buttons laid over the preview');
    assert.deepEqual(r.opens.map(txt), ['Open Bunny Burritos ↗']);
    assert.match(txt(r.say), /^Bunny Burritos has .+\.$/, 'one sentence about the shop');
    // the sentence and the button follow the trade
    await page.locator('#shops [role=tab]', { hasText: /clinic/i }).click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ say: document.querySelector('#shops .show-say').innerText, open: [...document.querySelectorAll('#shops a')].filter(a => /^open\s/i.test(a.innerText.trim()) && a.getBoundingClientRect().width).map(a => [a.innerText.trim(), a.getAttribute('href')]) }));
    assert.match(txt(after.say), /^Hopwell .+\.$/);
    assert.deepEqual(after.open.map(([t, h]) => [txt(t), h]), [['Open Hopwell ↗', 'hopwell-chiro/']]);
  } finally { await ctx.close(); }
});

test('Main Street @ 1440: the phone stands beside the laptop, never over it, and the section fits one screen', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    await page.evaluate(() => scrollTo(0, document.querySelector('#shops').offsetTop));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const box = s => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const s = document.querySelector('#shops');
      return { laptop: box('.laptop'), phone: box('.phone'), h: s.offsetHeight, vh: innerHeight, shadow: getComputedStyle(document.querySelector('.phone')).boxShadow };
    });
    const ix = Math.min(r.laptop.r, r.phone.r) - Math.max(r.laptop.l, r.phone.l), iy = Math.min(r.laptop.b, r.phone.b) - Math.max(r.laptop.t, r.phone.t);
    assert.ok(ix <= 0 || iy <= 0, `devices overlap by ${Math.round(ix)}×${Math.round(iy)}px`);
    assert.ok(r.phone.l - r.laptop.r >= 16, `a clear gap between them (${Math.round(r.phone.l - r.laptop.r)}px)`);
    assert.ok(Math.abs(r.phone.b - r.laptop.b) <= 2, 'bottoms level');
    assert.equal(r.shadow, 'none');
    assert.ok(r.h <= r.vh, `the section fits one screen (${r.h}px of ${r.vh})`);
  } finally { await ctx.close(); }
});

for (const w of [360, 390]) test(`Main Street @ ${w}: the trades are pills you can all see, and the section fits one screen`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => {
      const s = document.querySelector('#shops'), list = s.querySelector('[role=tablist]');
      const tabs = [...s.querySelectorAll('[role=tab]')].map(t => t.getBoundingClientRect());
      const nav = document.querySelector('.nav').getBoundingClientRect().height;
      return { n: tabs.length, offRight: tabs.filter(t => t.right > innerWidth || t.left < 0).length, scrolls: list.scrollWidth - list.clientWidth, rows: new Set(tabs.map(t => Math.round(t.top))).size,
        labels: [...s.querySelectorAll('[role=tab]')].map(t => t.innerText.trim()), h: s.offsetHeight, room: innerHeight - nav };
    });
    assert.equal(r.n, 9);
    assert.equal(r.offRight, 0, 'every trade on screen, no sideways row');
    assert.ok(r.scrolls <= 0, 'the trade list does not scroll sideways');
    assert.ok(r.rows <= 4, `pills wrap into a few rows (${r.rows})`);
    assert.deepEqual(r.labels, ['Restaurant', 'Auto shop', 'Bakery', 'Barber', 'Bar', 'Farm', 'Gift shop', 'Landscaping', 'Clinic']);
    assert.ok(r.h <= r.room, `the section fits one screen under the sticky bar (${r.h}px of ${r.room})`);
  } finally { await ctx.close(); }
});

for (const w of [390, 1440]) test(`hero @ ${w}: "Hop with style." sits centred under the logo, so the swap opens no hole`, async () => {
  const { ctx, page } = await site.open(URL, w);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => {
      const mid = e => { const b = e.getBoundingClientRect(); return (b.left + b.right) / 2; };
      const letters = s => [...document.querySelectorAll(s + ' > span')].map(e => e.getBoundingClientRect()).filter(b => b.width);
      const span = s => { const b = letters(s); return (Math.min(...b.map(x => x.left)) + Math.max(...b.map(x => x.right))) / 2; };
      return { from: span('.lh-from'), to: span('.lh-to'), mark: mid(document.querySelector('.lh-mark')), shown: getComputedStyle(document.querySelector('.lh-from')).visibility };
    });
    assert.equal(r.shown, 'visible', 'opens on "Hop with style."');
    assert.ok(Math.abs(r.from - r.mark) <= 3 && Math.abs(r.to - r.mark) <= 3, `both lines centred under the logo: ${JSON.stringify(r)}`);
  } finally { await ctx.close(); }
});

for (const w of [390, 1440]) test(`hero @ ${w}: sizes follow the logo (u = its stroke): headline 6u in Inter 800, line 1u, button 2u`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => {
      const h = document.querySelector('.hero h1'), c = getComputedStyle(h), m = document.querySelector('.lh-mark').getBoundingClientRect();
      const go = document.querySelector('.lh-go'), lede = document.querySelector('.hero .lede');
      return { u: m.height / 12.75, ratio: m.width / m.height, font: parseFloat(c.fontSize), weight: c.fontWeight, ls: parseFloat(c.letterSpacing) / parseFloat(c.fontSize),
        line: parseFloat(getComputedStyle(lede).fontSize), btnH: go.getBoundingClientRect().height, btnFont: parseFloat(getComputedStyle(go).fontSize) };
    });
    const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
    assert.ok(near(r.ratio, 2 / 3, 0.01), `logo is 2:3 (${r.ratio})`);
    if (w >= 1000) assert.ok(near(r.u, 24, 0.5), `u is 24px on desktop (${r.u})`);
    assert.ok(near(r.font, 6 * r.u), `headline is 6u (${r.font} vs u ${r.u})`);
    assert.equal(r.weight, '800');
    assert.ok(near(r.ls, -0.035, 0.002), `letter-spacing -0.035em (${r.ls})`);
    assert.ok(near(r.line, Math.max(16, r.u)), `the line is 1u, 16px floor (${r.line})`);
    if (w >= 1000) { assert.ok(near(r.btnH, Math.max(48, 2 * r.u)), `button is 2u tall, 48px floor (${r.btnH})`); assert.ok(near(r.btnFont, Math.max(16, r.u * 2 / 3)), `button text 2/3u, 16px floor (${r.btnFont})`); }
    else assert.ok(r.btnH >= 40 && r.btnH <= 44 && r.btnFont === 15, `phones: a smaller button, still a 40px+ tap target (${r.btnH}, ${r.btnFont})`); // Tristan: "Pick your shop" too big on phones
  } finally { await ctx.close(); }
});

// Was: two lines on phones. Tristan (2026-11-16, phone review): the headline must be one line at 360-390, so both loop lines
// are now exactly one line at every width ("Bunny World." and "Hop with style."), same height, so the swap moves nothing
// (old note: on every phone width both loop lines break into exactly two lines ("Bunny / World.",
// "Hop with / style.") with the same block height, so the swap never shifts anything below it
test('phones: both loop lines are exactly one line, same height, at every width from 320 to 820', async () => {
  const bad = [];
  for (const w of [320, 340, 360, 375, 390, 414, 430, 480, 600, 768, 820]) {
    const { ctx, page } = await site.open(URL, w);
    try {
      const r = await page.evaluate(() => {
        const layer = s => { const b = [...document.querySelectorAll(`.hero h1 ${s} > span`)].map(e => e.getBoundingClientRect()).filter(x => x.width);
          const tops = [...new Set(b.map(x => Math.round(x.top)))]; return { lines: tops.length, h: Math.round(Math.max(...b.map(x => x.bottom)) - Math.min(...b.map(x => x.top))), right: Math.max(...b.map(x => x.right)), left: Math.min(...b.map(x => x.left)) }; };
        const h = document.querySelector('.hero h1').getBoundingClientRect();
        return { from: layer('.lh-from'), to: layer('.lh-to'), box: { l: h.left, r: h.right, h: h.height } };
      });
      if (r.from.lines !== 1 || r.to.lines !== 1) bad.push(`${w}: lines from ${r.from.lines}, to ${r.to.lines}`);
      if (Math.abs(r.from.h - r.to.h) > 2) bad.push(`${w}: heights differ (${r.from.h} vs ${r.to.h})`);
      for (const k of ['from', 'to']) if (r[k].left < r.box.l - 1 || r[k].right > r.box.r + 1) bad.push(`${w}: ${k} spills the box`);
    } finally { await ctx.close(); }
  }
  assert.deepEqual(bad, []);
});
