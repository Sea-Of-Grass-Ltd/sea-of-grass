// Websites page, the through-line on phones (≤ 767 px). Tristan on the live page: the line is "mostly off screen" and should be
// "more dynamic in how it interacted with the page". On a phone there is no margin to hide in, so the line lives in the 16 px
// side gutter inside each section and swings across the whole width in every gap between sections. It meets the page at its
// moments: it threads to the register's Sold out button (and the seed taps it), dips through the meadow at the foot of the top,
// and ends at the Book button under "Talk to Tristan or Bryce". It never crosses text. Desktop keeps its margin line untouched.
// Run:  cd tests && npm install && node --test services/websites-phone-line.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const EDGE = 12;
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const ready = page => page.waitForFunction(() => document.querySelector('[data-through] path')?.getTotalLength() > 0, null, { timeout: 5000 });
// the path, sampled every ~2 px, in page coordinates
const samples = page => page.evaluate(() => {
  const path = document.querySelector('[data-through] path'), len = path.getTotalLength(), svg = path.ownerSVGElement.getBoundingClientRect();
  const n = Math.ceil(len / 2), ox = svg.left, oy = svg.top + scrollY;
  return Array.from({ length: n + 1 }, (_, i) => { const q = path.getPointAtLength(len * i / n); return [q.x + ox, q.y + oy]; });
});

for (const w of [360, 390]) {
  test(`${w}px · phone line: the seed is fully on screen at every scroll position`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await ready(page);
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 0; y <= H + 199; y += 200) {
        await page.evaluate(y => scrollTo(0, y), Math.min(y, H)); await page.waitForTimeout(60);
        const s = await page.evaluate(() => { const t = document.querySelector('[data-traveller]'), r = t.getBoundingClientRect();
          return { shown: !t.hidden && r.width > 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2, W: document.documentElement.clientWidth, H: innerHeight }; });
        assert.ok(s.shown, `the seed is showing at scroll ${y}`);
        assert.ok(s.cx >= EDGE - .5 && s.cx <= s.W - EDGE + .5, `the seed's centre is at least ${EDGE}px in from the sides at scroll ${y} (x ${s.cx.toFixed(1)})`);
        assert.ok(s.cy >= EDGE && s.cy <= s.H - EDGE, `the seed is on screen at scroll ${y} (y ${s.cy.toFixed(1)})`);
      }
    } finally { await ctx.close(); }
  });

  test(`${w}px · phone line: a confident stroke, and at least 120px of it on every screenful`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await ready(page);
      const st = await page.evaluate(() => { const p = document.querySelector('[data-through] path'), c = getComputedStyle(p);
        const root = getComputedStyle(document.documentElement), m = c.stroke.match(/[\d.]+/g).map(Number);
        const palette = ['--sage', '--gold', '--poppy', '--grass', '--meadow', '--soft', '--text', '--pop', '--plum-mute'].map(k => root.getPropertyValue(k).trim().toLowerCase());
        const hex = '#' + m.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
        return { width: parseFloat(c.strokeWidth), alpha: (m[3] ?? 1) * +c.strokeOpacity * +c.opacity, hex, palette }; });
      assert.ok(st.width >= 2, `stroke at least 2px (${st.width})`);
      assert.ok(st.alpha >= .8, `stroke nearly opaque (${st.alpha.toFixed(2)})`);
      assert.ok(st.palette.includes(st.hex), `stroke is a palette colour (${st.hex})`);
      const pts = await samples(page), { H, vh, W } = await page.evaluate(() => ({ H: document.documentElement.scrollHeight - innerHeight, vh: innerHeight, W: document.documentElement.clientWidth }));
      for (let y = 0; y <= H + 199; y += 200) {
        const top = Math.min(y, H); let L = 0;
        for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]];
          if (a[1] >= top && b[1] <= top + vh && a[0] >= 0 && b[0] <= W && b[0] >= 0) L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
        assert.ok(L >= 120, `at scroll ${top} only ${L.toFixed(0)}px of the line is on screen`);
      }
      assert.ok(pts.every(p => p[0] >= EDGE - .5 && p[0] <= W - EDGE + .5), 'the line never runs closer than 12px to the screen edges');
    } finally { await ctx.close(); }
  });

  test(`${w}px · phone line: it swings across the width in the gaps (at least 4 sweeps)`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await ready(page);
      const pts = await samples(page), W = await page.evaluate(() => document.documentElement.clientWidth);
      let side = null, sweeps = 0;
      for (const [x] of pts) { const s = x < W * .25 ? 'L' : x > W * .75 ? 'R' : null; if (s && side && s !== side) sweeps++; if (s) side = s; }
      assert.ok(sweeps >= 4, `${sweeps} cross-width sweeps`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · phone line: it never crosses text`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await ready(page);
      const pts = await samples(page);
      const boxes = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p,li,dt,dd,summary,a,button,label,.t-name,.t-lab,.badge,.flap-w,.amt')]
        .filter(e => !e.closest('[aria-hidden="true"],[hidden],.more,footer,[data-through],.topbar,[data-chapters],header') && !(e.closest('details:not([open])') && !e.closest('summary')) && e.textContent.trim() && getComputedStyle(e).visibility !== 'hidden')
        .map(e => { const r = e.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
          for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p);
            if (c.overflowX !== 'visible' || c.overflowY !== 'visible') { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
          return { t: e.textContent.trim().slice(0, 24), L, T: T + scrollY, R, B: B + scrollY }; }).filter(b => b.R - b.L > 0 && b.B - b.T > 0));
      const half = 1.5, hits = [];
      for (const [x, y] of pts) for (const b of boxes) if (x + half > b.L && x - half < b.R && y + half > b.T && y - half < b.B) { hits.push(`「${b.t}」 at ${x.toFixed(0)},${y.toFixed(0)}`); break; }
      assert.deepEqual([...new Set(hits.map(h => h.split(' at ')[0]))].slice(0, 6), [], 'the line crosses text');
    } finally { await ctx.close(); }
  });

  test(`${w}px · phone line: it meets the page at its moments (Sold out, the meadow, the Book button)`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await ready(page);
      const pts = await samples(page);
      const m = await page.evaluate(() => { const box = e => { const r = e.getBoundingClientRect(); return { L: r.left, T: r.top + scrollY, R: r.right, B: r.bottom + scrollY }; };
        return { sold: box(document.querySelector('[data-act="soldout"]')), grass: box(document.querySelector('.hero [data-live-grass]')), book: box(document.querySelector('#start a.btn')) }; });
      const dist = (p, b) => Math.hypot(Math.max(b.L - p[0], 0, p[0] - b.R), Math.max(b.T - p[1], 0, p[1] - b.B));
      assert.ok(Math.min(...pts.map(p => dist(p, m.sold))) <= 10, 'the line threads in to the Sold out button');
      const inGrass = pts.filter(p => p[1] >= m.grass.T && p[1] <= m.grass.B).map(p => p[0]);
      assert.ok(inGrass.length && Math.max(...inGrass) - Math.min(...inGrass) >= w * .5, 'the line swings through the meadow at the foot of the top');
      assert.ok(dist(pts[pts.length - 1], m.book) <= 16, 'the line ends at the Book button under "Talk to Tristan or Bryce"');
      // the seed taps Sold out when it gets there
      await page.evaluate(y => scrollTo(0, y - innerHeight * .55 + 60), (m.sold.T + m.sold.B) / 2); await page.waitForTimeout(500);
      assert.equal(await page.locator('[data-act="soldout"]').getAttribute('aria-pressed'), 'true', 'the seed taps Sold out on its way past');
    } finally { await ctx.close(); }
  });

  test(`${w}px · phone line: reduced motion keeps the drawing, with no seed and no tap`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      await ready(page);
      const pts = await samples(page), W = await page.evaluate(() => document.documentElement.clientWidth);
      assert.ok(pts.some(p => p[0] > W * .75) && pts.some(p => p[0] < W * .25), 'the same sweeping drawing');
      const y = await page.evaluate(() => { const r = document.querySelector('[data-act="soldout"]').getBoundingClientRect(); return r.top + scrollY; });
      await page.evaluate(y => scrollTo(0, y - innerHeight * .5), y); await page.waitForTimeout(400);
      assert.ok(!(await page.locator('[data-traveller]').isVisible()), 'no seed');
      assert.equal(await page.locator('[data-act="soldout"]').getAttribute('aria-pressed'), 'false', 'nothing is tapped for you');
    } finally { await ctx.close(); }
  });
}
