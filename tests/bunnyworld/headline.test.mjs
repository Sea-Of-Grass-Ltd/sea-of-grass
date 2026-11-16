// Bunny World landing headline (2026-11-15): a wave of the five looks' accent colours sweeps letter by letter,
// turning "Hop with style." into "Bunny World.", then settles in flat solid ink. Clean is the default look.
// Journey: open the page → see "Hop with style." → watch the colour wave rewrite it → read "Bunny World." in plain ink
// → tap the bunny (the "style" it points at) → Clean, Bold, Warm, Sunny, Disco, and round again.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = '/bunnyworld/';
const FINAL = 'Bunny World.';
const SETTLED_MS = 3200; // the sweep is over well before this
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// what a sighted visitor sees in the h1: the glyphs that are actually painted (not .sr, not opacity 0 / hidden)
const visibleHeadline = () => {
  const h = document.querySelector('.hero h1');
  // visibility is inherited but a child can turn itself visible again, so only the glyph's own box counts; opacity multiplies down
  const painted = e => { if (e.closest('.sr')) return false; const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none') return false; let o = 1; for (let x = e; x && x !== h.parentElement; x = x.parentElement) o *= +getComputedStyle(x).opacity; return o >= 0.5; };
  const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let s = '', n;
  while ((n = w.nextNode())) { if (n.nodeType === 1) { if (n.tagName === 'BR' && painted(n.parentElement)) s += ' '; continue; } if (painted(n.parentElement)) s += n.textContent; }
  return s.replace(/\s+/g, ' ').trim();
};
const box = () => { const r = document.querySelector('.hero h1').getBoundingClientRect(), l = document.querySelector('.hero .lede').getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height, l.y + scrollY].map(v => Math.round(v * 10) / 10).join(','); };

for (const w of [360, 390, 1440]) {
  test(`headline sweeps "Hop with style." into "${FINAL}" without moving @ ${w}`, async () => {
    const { ctx, page, errors } = await site.open(URL, w);
    try {
      // look at the very first paint: reload and read as soon as the document is parsed
      await page.reload({ waitUntil: 'domcontentloaded' });
      const first = await page.evaluate(visibleHeadline);
      assert.equal(first, 'Hop with style.', `opens on "Hop with style."`);
      const boxes = new Set(), seen = new Set([first]);
      const t0 = Date.now();
      while (Date.now() - t0 < SETTLED_MS) { boxes.add(await page.evaluate(box)); seen.add(await page.evaluate(visibleHeadline)); await page.waitForTimeout(40); }
      assert.equal(boxes.size, 1, `headline box moved during the sweep: ${[...boxes].join(' | ')}`);
      assert.ok(seen.size >= 4, `the change happens letter by letter (saw only ${seen.size} states: ${[...seen].join(' | ')})`);
      assert.equal(await page.evaluate(visibleHeadline), FINAL);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`headline is flat solid ink at rest @ ${w}`, async () => {
    const { ctx, page } = await site.open(URL, w);
    try {
      await page.waitForTimeout(SETTLED_MS);
      const r = await page.evaluate(() => {
        const h = document.querySelector('.hero h1'), ink = getComputedStyle(h).color, bad = [];
        for (const e of [h, ...h.querySelectorAll('*')]) {
          const c = getComputedStyle(e);
          if (/gradient\(/.test(c.backgroundImage)) bad.push(`${e.className || e.tagName}: background ${c.backgroundImage.slice(0, 50)}`);
          if (/text/.test(c.backgroundClip + c.webkitBackgroundClip)) bad.push(`${e.className || e.tagName}: background-clip text`);
          if (c.textShadow !== 'none') bad.push(`${e.className || e.tagName}: text-shadow`);
          if (e.closest('.sr') || c.visibility === 'hidden' || +c.opacity === 0 || e.closest('[style*="hidden"]')) continue;
          if (e.childElementCount === 0 && e.textContent.trim() && c.color !== ink) bad.push(`"${e.textContent}" is ${c.color}, ink is ${ink}`);
          if (+c.opacity !== 1 && c.visibility !== 'hidden') bad.push(`${e.className || e.tagName}: opacity ${c.opacity}`);
        }
        const running = h.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length;
        return { bad, running, ink };
      });
      assert.deepEqual(r.bad, []);
      assert.equal(r.running, 0, 'animations still running after the sweep');
      assert.equal(await page.evaluate(visibleHeadline), FINAL);
    } finally { await ctx.close(); }
  });
}

test('the sweep colours are the five looks\' accent colours', async () => {
  const { ctx, page } = await site.open(URL, 1440);
  try {
    // read the colours each letter passes through from the sweep's keyframes, once it has started
    await page.waitForFunction(() => document.querySelector('.hero h1').getAnimations({ subtree: true }).length > 0, null, { timeout: 4000, polling: 50 });
    const cols = await page.evaluate(() => {
      const out = new Set();
      for (const a of document.querySelector('.hero h1').getAnimations({ subtree: true })) for (const k of a.effect.getKeyframes()) if (k.color) out.add(k.color);
      const probe = document.createElement('i'); document.body.appendChild(probe);
      const norm = [...out].map(c => { probe.style.color = ''; probe.style.color = c; return getComputedStyle(probe).color; }); probe.remove(); return norm;
    });
    // Clean violet, Bold orange, Warm tomato, Sunny yellow, Disco pink
    for (const c of ['rgb(167, 114, 249)', 'rgb(255, 76, 0)', 'rgb(210, 56, 31)', 'rgb(255, 232, 69)', 'rgb(255, 51, 134)']) assert.ok(cols.includes(c), `sweep is missing ${c} (has ${cols.join(', ')})`);
  } finally { await ctx.close(); }
});

for (const w of [390, 1440]) test(`reduced motion: no sweep, "${FINAL}" still, screen readers get the line @ ${w}`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    assert.equal(await page.evaluate(visibleHeadline), FINAL);
    const anims = await page.evaluate(() => document.querySelector('.hero h1').getAnimations({ subtree: true }).length);
    assert.equal(anims, 0, 'no animation on the headline');
    const tree = await page.accessibility.snapshot();
    const find = n => n && (n.role === 'heading' && n.level === 1 ? n : (n.children || []).map(find).find(Boolean));
    const h1 = find(tree);
    assert.ok(h1, 'an h1 in the accessibility tree');
    const name = (h1.name || (h1.children || []).map(c => c.name).join(' ')).replace(/\s+/g, ' ').trim();
    assert.equal(name, FINAL);
  } finally { await ctx.close(); }
});

test('screen readers get only the static line while it sweeps', async () => {
  const { ctx, page } = await site.open(URL, 1440);
  try {
    const tree = await page.accessibility.snapshot();
    const find = n => n && (n.role === 'heading' && n.level === 1 ? n : (n.children || []).map(find).find(Boolean));
    const h1 = find(tree);
    const name = (h1.name || (h1.children || []).map(c => c.name).join(' ')).replace(/\s+/g, ' ').trim();
    assert.equal(name, FINAL);
  } finally { await ctx.close(); }
});

test('Clean is the default look, and the bunny cycles Clean → Bold → Warm → Sunny → Disco', async () => {
  const { ctx, page } = await site.open(URL, 1440);
  try {
    const state = () => page.evaluate(() => ({
      name: document.querySelector('[data-look-name]').textContent.trim(),
      bg: getComputedStyle(document.querySelector('.hero')).backgroundColor,
      ink: getComputedStyle(document.querySelector('.hero h1')).color,
      theme: document.querySelector('meta[name="theme-color"]').content.toUpperCase(),
    }));
    const s0 = await state();
    assert.deepEqual(s0, { name: 'Clean', bg: 'rgb(245, 247, 249)', ink: 'rgb(24, 26, 29)', theme: '#F5F7F9' });
    const order = [];
    for (let i = 0; i < 5; i++) { await page.click('.lh-mark'); await page.waitForTimeout(450); order.push((await state()).name); }
    assert.deepEqual(order, ['Bold', 'Warm', 'Sunny', 'Disco', 'Clean']);
  } finally { await ctx.close(); }
});

test('Clean is the default even before the script runs (no flash of another look)', async () => {
  const { ctx, page } = await site.open(URL, 390);
  try {
    // with scripts off the CSS alone decides the look
    await page.route('**/*.js', r => r.abort());
    await page.reload({ waitUntil: 'load' });
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.hero')).backgroundColor);
    assert.equal(bg, 'rgb(245, 247, 249)');
  } finally { await ctx.close(); }
});

for (const w of [360, 390, 1440]) test(`no sideways scroll during or after the sweep @ ${w}`, async () => {
  const { ctx, page } = await site.open(URL, w);
  try {
    let worst = 0; const t0 = Date.now();
    while (Date.now() - t0 < SETTLED_MS) { worst = Math.max(worst, await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)); await page.waitForTimeout(60); }
    assert.ok(worst <= 0, `${worst}px wider than the screen`);
    // the headline itself fits its column (nowrap lines must not spill under overflow-x:hidden)
    const spill = await page.evaluate(() => { const h = document.querySelector('.hero h1'); return h.scrollWidth - h.clientWidth; });
    assert.ok(spill <= 1, `headline spills ${spill}px out of its box`);
  } finally { await ctx.close(); }
});
