// Bunny World landing on phones (Tristan, 2026-11-16, from his phone screenshots: "awful"). The demo bar is one short
// line, "Bunny World" shows once (the nav keeps the mark, the hero carries the name), the headline is one line at 360-390,
// the logo, headline, line and button form one compact unit, and the shop content is on the first 390x844 screen.
// Desktop stays as approved.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = '/bunnyworld/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// every place "Bunny World" is painted on the first screen (the .sr line and visually hidden text don't count)
const names = () => {
  const shown = e => { if (e.closest('.sr,[aria-hidden="true"]') && !e.closest('.lh-to,.lh-from')) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && r.top < innerHeight && r.bottom > 0 && c.visibility !== 'hidden' && +c.opacity > 0.5 && c.clip !== 'rect(0px, 0px, 0px, 0px)'; };
  const out = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('.hero h1')) continue;
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
    if (/Bunny World/i.test(own) && shown(e)) out.push(e.className || e.tagName);
  }
  // the headline is split into letters: read its painted line
  const h = document.querySelector('.hero h1'); let t = '';
  for (const s of h.querySelectorAll('.lh-to > span, .lh-from > span')) { const c = getComputedStyle(s); if (c.visibility !== 'hidden' && +c.opacity > 0.5) t += s.textContent; }
  if (/Bunny World/.test(t.replace(/\s+/g, ' '))) out.push('h1');
  return out;
};

for (const w of [360, 390]) test(`phone @ ${w}: one short demo bar, the name once, a one-line headline, a compact unit`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(names => {
      const bar = document.querySelector('.credit'), link = bar.querySelector('a[href*="seaofgrass.studio"]');
      const lh = parseFloat(getComputedStyle(bar).lineHeight) || 17;
      const h1 = document.querySelector('.hero h1'), letters = [...h1.querySelectorAll('.lh-to > span, .lh-from > span')].map(e => e.getBoundingClientRect()).filter(b => b.width);
      const m = document.querySelector('.lh-mark').getBoundingClientRect(), go = document.querySelector('.lh-go').getBoundingClientRect();
      const lines = s => new Set([...h1.querySelectorAll(s + ' > span')].map(e => Math.round(e.getBoundingClientRect().top))).size;
      return { barText: bar.innerText.replace(/\s+/g, ' ').trim(), barH: bar.getBoundingClientRect().height, barLines: Math.round((bar.getBoundingClientRect().height - parseFloat(getComputedStyle(bar).paddingTop) - parseFloat(getComputedStyle(bar).paddingBottom)) / lh),
        link: !!link && link.getBoundingClientRect().width > 0, names: (0, eval)(`(${names})`)(), linesTo: lines('.lh-to'), linesFrom: lines('.lh-from'),
        spill: Math.max(...letters.map(b => b.right)) > innerWidth - 8 || Math.min(...letters.map(b => b.left)) < 8, logoH: m.height, goH: go.height, unit: go.bottom - m.top };
    }, names.toString());
    assert.equal(r.barLines, 1, `the demo bar is one line: "${r.barText}" (${Math.round(r.barH)}px)`);
    assert.match(r.barText, /Sea of Grass/); assert.match(r.barText, /nothing is sent/i); assert.ok(r.link, 'the Sea of Grass link stays');
    assert.deepEqual(r.names, ['h1'], `"Bunny World" shows once, in the hero (saw ${r.names.join(', ')})`);
    assert.equal(r.linesTo, 1, '"Bunny World." is one line'); assert.equal(r.linesFrom, 1, '"Hop with style." is one line'); assert.ok(!r.spill, 'and it fits the screen');
    assert.ok(r.logoH <= 130, `the logo is not oversized (${Math.round(r.logoH)}px)`);
    assert.ok(r.goH <= 44, `"Pick your shop" is not oversized (${Math.round(r.goH)}px)`);
    assert.ok(r.unit <= 300, `logo, headline, line and button are one compact unit (${Math.round(r.unit)}px)`);
  } finally { await ctx.close(); }
});

// Tristan (2026-11-16): on phones the landing flows like three pages, each owning its screen: the hero (demo bar, logo,
// "Bunny World.", the line, the button, and a quiet "Fixes from $250" link so prices are never hidden), then the shops,
// then the four prices. The order is one switch (main[data-phone-order]) so it can be swapped for an A/B test. Gentle
// scroll-snap (proximity). Desktop keeps its order: hero, prices, shops.
const pages = () => { const top = e => e.getBoundingClientRect().top + scrollY, nav = document.querySelector('.nav').getBoundingClientRect().height;
  const hero = document.querySelector('.hero'), plans = document.querySelector('#plans'), shops = document.querySelector('#shops');
  const unit = [document.querySelector('.lh-mark'), document.querySelector('.lh-go')].map(e => e.getBoundingClientRect());
  const fix = document.querySelector('.hero a[href="#plans"]');
  return { vh: innerHeight, nav, heroBottom: top(hero) + hero.offsetHeight, heroTop: top(hero), heroMid: top(hero) + hero.offsetHeight / 2, unitMid: (unit[0].top + unit[1].bottom) / 2 + scrollY,
    plans: { top: top(plans), h: plans.offsetHeight, cells: Math.max(...[...plans.querySelectorAll('.pc')].map(e => e.getBoundingClientRect().bottom + scrollY)) - top(plans) }, shops: { top: top(shops), h: shops.offsetHeight },
    fix: fix && { t: fix.innerText.replace(/\s+/g, ' ').trim(), w: fix.getBoundingClientRect().width, h: fix.getBoundingClientRect().height }, snap: getComputedStyle(document.documentElement).scrollSnapType }; };

for (const w of [360, 390]) test(`phone @ ${w}x844: three pages, hero, then shops, then prices; each owns its screen`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(pages);
    assert.ok(Math.abs(r.heroBottom - r.vh) <= 2, `the hero page fills the first screen exactly (ends at ${Math.round(r.heroBottom)} of ${r.vh})`);
    assert.ok(Math.abs(r.unitMid - (r.heroTop + r.vh) / 2) <= 60 && Math.abs(r.unitMid - r.heroMid) <= 40, `the unit sits balanced in the screen (${Math.round(r.unitMid)} vs ${Math.round(r.heroMid)})`);
    assert.ok(r.fix && /^Fixes from \$250/.test(r.fix.t) && r.fix.h >= 40, `a quiet "Fixes from $250" link to the prices (${JSON.stringify(r.fix)})`);
    assert.ok(r.shops.top < r.plans.top, 'shops come before prices on phones');
    assert.ok(Math.abs(r.shops.top - r.heroBottom) <= 1, 'the shops start right under the hero');
    assert.ok(r.shops.h >= r.vh - r.nav - 2, `the shops own a screen (${r.shops.h})`);
    assert.ok(r.plans.h >= r.vh - r.nav - 2, `the prices own a screen (${r.plans.h})`);
    assert.ok(r.plans.cells <= r.vh - r.nav, `all four closed prices fit one screen under the bar (${Math.round(r.plans.cells)} of ${r.vh - r.nav})`);
    assert.match(r.snap, /^y( proximity)?$/, 'gentle scroll-snap (proximity is the default and serialises as "y"; never mandatory)');
    // the "Fixes from $250" link lands on the prices page
    await page.locator('.hero a[href="#plans"]').click(); await page.waitForTimeout(700);
    const landed = await page.evaluate(() => { const b = document.querySelector('#plans .pc').getBoundingClientRect(); return { top: b.top, bottom: Math.max(...[...document.querySelectorAll('#plans .pc')].map(e => e.getBoundingClientRect().bottom)) }; });
    assert.ok(landed.top > 0 && landed.bottom <= r.vh, `the link shows all four prices (${Math.round(landed.top)}-${Math.round(landed.bottom)})`);
  } finally { await ctx.close(); }
});

test('phone: the page order is one switch (main[data-phone-order]): prices-first puts prices before shops', async () => {
  const { ctx, page } = await site.open(URL, 390, { reducedMotion: 'reduce' });
  try {
    assert.equal(await page.evaluate(() => document.querySelector('main').dataset.phoneOrder), 'shops-first');
    await page.evaluate(() => { document.querySelector('main').dataset.phoneOrder = 'prices-first'; });
    const r = await page.evaluate(pages);
    assert.ok(r.plans.top < r.shops.top && Math.abs(r.plans.top - r.heroBottom) <= 1, 'prices right under the hero, shops after');
  } finally { await ctx.close(); }
});

test('phone: a price card opens inside its page without the snap pulling it away', async () => {
  const { ctx, page } = await site.open(URL, 390);
  try {
    await page.locator('.hero a[href="#plans"]').click(); await page.waitForTimeout(800);
    const before = await page.evaluate(() => document.querySelector('#pc-starter').getBoundingClientRect().top);
    await page.locator('#pc-starter').click(); await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ top: document.querySelector('#pc-starter').getBoundingClientRect().top, open: document.querySelector('#pc-starter').getAttribute('aria-expanded') }));
    assert.equal(after.open, 'true');
    assert.ok(Math.abs(after.top - before) <= 2, `the cell stays put while its card opens (${Math.round(before)} then ${Math.round(after.top)})`);
  } finally { await ctx.close(); }
});

test('desktop 1440 stays as approved: full demo bar, the nav wordmark, the big unit', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => ({ bar: document.querySelector('.credit').innerText.replace(/\s+/g, ' ').trim(), word: document.querySelector('.nav .logo span').getBoundingClientRect().width,
      logo: document.querySelector('.lh-mark').getBoundingClientRect().height, font: parseFloat(getComputedStyle(document.querySelector('.hero h1')).fontSize) }));
    assert.match(r.bar, /A demo by .*Sea of Grass.* every shop works, nothing is sent/);
    assert.ok(r.word > 40, 'the nav wordmark shows on desktop');
    assert.ok(Math.abs(r.logo - 306) <= 1 && Math.abs(r.font - 144) <= 1, `logo 306px, headline 144px (${r.logo}, ${r.font})`);
    const o = await page.evaluate(() => ({ plans: document.querySelector('#plans').getBoundingClientRect().top, shops: document.querySelector('#shops').getBoundingClientRect().top, fix: document.querySelector('.hero a[href="#plans"]')?.getBoundingClientRect().width || 0, snap: getComputedStyle(document.documentElement).scrollSnapType }));
    assert.ok(o.plans < o.shops, 'desktop order: prices before shops'); assert.equal(o.fix, 0, 'no extra prices link on desktop'); assert.equal(o.snap, 'none', 'no snapping on desktop');
  } finally { await ctx.close(); }
});
