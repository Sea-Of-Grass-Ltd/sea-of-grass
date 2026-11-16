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

for (const w of [390, 1440]) test(`hero @ ${w}: one line, one tagline, one button, all four prices on the first screen`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => {
      const hero = document.querySelector('.hero'), h1 = hero.querySelector('h1'), lede = hero.querySelector('.lede');
      const prices = [...hero.querySelectorAll('.prices > div')].map(p => p.getBoundingClientRect());
      const go = hero.querySelector('.lh-go'), mark = hero.querySelector('.lh-mark').getBoundingClientRect(), hr = h1.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(h1).fontSize);
      return {
        lede: lede && lede.innerText, go: go && go.innerText, goHref: go && go.getAttribute('href'),
        question: /what kind of shop/i.test(hero.innerText),
        calls: [...hero.querySelectorAll('a[href]')].filter(a => /cal\.com/.test(a.href)).map(a => a.innerText.trim()),
        pricesBottom: Math.max(...prices.map(p => p.bottom)), priceCount: prices.length, vh: innerHeight,
        h1Lines: Math.round(hr.height / (lh * 1.02)), h1Font: lh, h1: hr, mark: { left: mark.left, top: mark.top, bottom: mark.bottom, w: mark.width, h: mark.height },
      };
    });
    assert.equal(txt(r.lede), 'Imaginary shops, real websites.');
    assert.equal(txt(r.go).replace(/\s*↓/, ' ↓'), 'Pick your shop ↓');
    assert.equal(r.goHref, '#shops');
    assert.equal(r.question, false, 'the shop question moved to Main Street');
    assert.deepEqual(r.calls, [], 'no call link in the hero: the call is in the header');
    assert.equal(r.priceCount, 4);
    assert.ok(r.pricesBottom <= r.vh, `all four prices on the first screen (they end at ${Math.round(r.pricesBottom)}px of ${r.vh})`);
    if (w >= 900) {
      assert.equal(r.h1Lines, 1, `the headline is one line (${Math.round(r.h1.height)}px tall at ${r.h1Font}px)`);
      assert.ok(r.h1Font >= 120, `the headline is bigger (${r.h1Font}px)`);
      assert.ok(r.mark.h <= 420, `the logo is smaller (${Math.round(r.mark.h)}px tall)`);
    } else {
      // phone: the logo sits beside the headline, not above it
      assert.ok(r.mark.left >= r.h1.left + 150 && r.mark.top < r.h1.bottom && r.mark.bottom > r.h1.top, `logo beside the headline: ${JSON.stringify({ mark: r.mark, h1: r.h1 })}`);
      assert.ok(r.mark.h <= 160, `the logo is small on phone (${Math.round(r.mark.h)}px)`);
    }
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
