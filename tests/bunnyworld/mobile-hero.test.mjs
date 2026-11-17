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

test('phone 390x844: the shop content is on the first screen', async () => {
  const { ctx, page } = await site.open(URL, 390, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => ({ prices: Math.max(...[...document.querySelectorAll('#prices .pc')].map(e => e.getBoundingClientRect().bottom)), worry: document.querySelector('.worry').getBoundingClientRect().top, vh: innerHeight }));
    assert.ok(r.prices <= r.vh, `all four prices on the first screen (${Math.round(r.prices)} of ${r.vh})`);
    assert.ok(r.worry < r.vh, `and the next block peeks in below them (${Math.round(r.worry)})`);
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
  } finally { await ctx.close(); }
});
