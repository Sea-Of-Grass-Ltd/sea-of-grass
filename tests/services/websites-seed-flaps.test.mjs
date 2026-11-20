// Websites page: the seed threads the Care flaps and lands in Bunny World. Tristan (2026-11-20): the full-page dashed line
// "feels cheap and ineffective, I do like it though, it feels like should go into something on the next page", then
// "Into Bunny World, these notches are an obvious place for it to go through."
// So: no line down the whole page. The seed's path shows only around the Care board: it runs along each row's split seam,
// turns outside the row and drops to the next one, and after the last row it falls into the Bunny World section and lands
// beside the "Bunny World" word, where a sprout comes up. Scroll drives it; reduced motion shows the drawing still.
// Phones (≤ 767 px) have none of it (websites-no-phone-line.test.mjs).
// Run:  cd tests && npm install && node --test services/websites-seed-flaps.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// the path in page coordinates, plus the boxes it has to respect
const geometry = page => page.evaluate(() => {
  const path = document.querySelector('[data-through] .trail'), d = path?.getAttribute('d') || '', len = d ? path.getTotalLength() : 0;
  const svg = path.ownerSVGElement.getBoundingClientRect(), ox = svg.left, oy = svg.top + scrollY;
  const n = Math.max(2, Math.ceil(len / 2)), pts = Array.from({ length: n + 1 }, (_, i) => { const q = path.getPointAtLength(len * i / n); return [q.x + ox, q.y + oy]; });
  const box = e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY }; };
  const texts = [...document.querySelectorAll('#bunny-world h2, #bunny-world p, #bunny-world .bw-word, #bunny-world .bw-head img, #care .kick')].map(box);
  return { d, len, pts, care: box(document.querySelector('#care')), bw: box(document.querySelector('#bunny-world')), head: box(document.querySelector('.bw-head')),
    flaps: [...document.querySelectorAll('.flap')].map(box), texts };
});

for (const w of [768, 1024, 1440]) {
  test(`${w}px · the seed's path lives only around the Care board, threads every seam, and lands in Bunny World`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w);
    try {
      await page.waitForFunction(() => document.querySelector('[data-through] .trail')?.getTotalLength() > 0, null, { timeout: 5000 });
      const g = await geometry(page);
      assert.equal((g.d.match(/M/gi) || []).length, 1, 'one unbroken path');
      const ys = g.pts.map(p => p[1]), xs = g.pts.map(p => p[0]);
      assert.ok(Math.min(...ys) >= g.care.top - 2, `no line above the Care board (starts at ${Math.min(...ys).toFixed(0)}, board from ${g.care.top.toFixed(0)})`);
      assert.ok(Math.max(...ys) <= g.head.bottom + 4, `no line below the Bunny World heading (ends at ${Math.max(...ys).toFixed(0)}, heading to ${g.head.bottom.toFixed(0)})`);
      assert.ok(Math.min(...xs) >= 6 && Math.max(...xs) <= w - 6, 'it stays on screen, sideways');
      for (const [i, f] of g.flaps.entries()) {
        const seam = (f.top + f.bottom) / 2, bins = new Set();
        for (const [x, y] of g.pts) if (Math.abs(y - seam) <= 1.5 && x >= f.left && x <= f.right) bins.add(Math.floor((x - f.left) / 10));
        const cover = bins.size / Math.ceil((f.right - f.left) / 10);
        assert.ok(cover >= 0.95, `it runs the whole split seam of row ${i + 1} (${(cover * 100).toFixed(0)}%)`);
        const stray = g.pts.filter(([x, y]) => x > f.left + 1 && x < f.right - 1 && y > f.top && y < f.bottom && Math.abs(y - seam) > 2);
        assert.equal(stray.length, 0, `inside row ${i + 1} it is only ever in the seam (turns happen outside the row)`);
      }
      const end = g.pts[g.pts.length - 1];
      assert.ok(end[1] > g.bw.top && end[1] < g.head.bottom + 4, 'it lands in the Bunny World section, by its heading');
      const hit = g.texts.filter(t => end[0] > t.left - 6 && end[0] < t.right + 6 && end[1] > t.top - 6 && end[1] < t.bottom + 6);
      assert.equal(hit.length, 0, 'the landing spot is clear of every word and the mark');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · scroll draws the trail behind the seed, and it lands with a sprout`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await page.waitForFunction(() => document.querySelector('[data-through] .trail')?.getTotalLength() > 0, null, { timeout: 5000 });
      const state = () => page.evaluate(() => {
        const svg = document.querySelector('[data-through]'), path = svg.querySelector('.trail'), len = path.getTotalLength(), r = svg.getBoundingClientRect();
        const seed = document.querySelector('[data-traveller]'), t = seed.getBoundingClientRect(), cx = t.left + t.width / 2, cy = t.top + t.height / 2;
        let best = 1e9, at = 0; const n = Math.ceil(len / 2);
        for (let i = 0; i <= n; i++) { const q = path.getPointAtLength(len * i / n), dd = Math.hypot(q.x + r.left - cx, q.y + r.top - cy); if (dd < best) { best = dd; at = len * i / n; } }
        // the sprout's size is what has grown of its stem and leaves
        const sp = document.querySelector('[data-sprout]'), parts = sp ? [...sp.querySelectorAll('path')].map(e => e.getBoundingClientRect()).filter(q => q.height > .5) : [];
        const sr = parts.length ? { left: Math.min(...parts.map(q => q.left)), right: Math.max(...parts.map(q => q.right)), top: Math.min(...parts.map(q => q.top)), bottom: Math.max(...parts.map(q => q.bottom)) } : { left: 0, right: 0, top: 0, bottom: 0 };
        sr.width = sr.right - sr.left; sr.height = sr.bottom - sr.top;
        const end = path.getPointAtLength(len);
        return { drawn: +svg.dataset.drawn, len, best, at, seedShown: !seed.hidden && getComputedStyle(seed).display !== 'none' && (+getComputedStyle(seed).opacity > .5 || seed.classList.contains('under')), // behind a letter tile it is out of sight on purpose
          inView: t.top >= 0 && t.bottom <= innerHeight, sprout: sr && getComputedStyle(sp).display !== 'none' ? { h: sr.height, x: sr.left + sr.width / 2, y: sr.bottom, ex: end.x + r.left, ey: end.y + r.top } : null };
      });
      const careTop = await page.evaluate(() => document.querySelector('#care').getBoundingClientRect().top + scrollY);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
      const a = await state();
      assert.ok(a.drawn <= 0.01 * a.len, 'before the Care board, no trail is drawn');
      assert.ok(!a.sprout || a.sprout.h < 4, 'and nothing has sprouted');
      // halfway down the board
      const mid = await page.evaluate(() => { const f = [...document.querySelectorAll('.flap')]; const y = (f[1].getBoundingClientRect().bottom + f[2].getBoundingClientRect().top) / 2 + scrollY; return y - innerHeight * .5; });
      await page.evaluate(y => scrollTo(0, y), mid); await page.waitForTimeout(700);
      const b = await state();
      assert.ok(b.drawn > 0.15 * b.len && b.drawn < 0.9 * b.len, `partway down the board, part of the trail is drawn (${(b.drawn / b.len * 100).toFixed(0)}%)`);
      assert.ok(b.seedShown && b.best <= 4, `the seed rides the path (${b.best.toFixed(1)}px off)`);
      assert.ok(Math.abs(b.at - b.drawn) <= 12, 'the trail is drawn up to the seed, not ahead of it');
      assert.ok(b.inView, 'the seed is on screen while it threads the board');
      // scroll on: more is drawn
      await page.evaluate(y => scrollTo(0, y + 160), mid); await page.waitForTimeout(700);
      const c = await state();
      assert.ok(c.drawn > b.drawn + 0.05 * c.len, 'scrolling on draws more of the trail');
      // the landing
      const land = await page.evaluate(() => { const r = document.querySelector('.bw-head').getBoundingClientRect(); return r.top + scrollY - innerHeight * .35; });
      await page.evaluate(y => scrollTo(0, y), land); await page.waitForTimeout(2000);
      const d = await state();
      assert.ok(d.drawn >= d.len - 2, 'past the board, the whole trail is drawn');
      assert.ok(d.sprout && d.sprout.h >= 12, `a sprout comes up where it lands (${d.sprout?.h?.toFixed(1)}px tall)`);
      assert.ok(Math.abs(d.sprout.x - d.sprout.ex) <= 6 && d.sprout.y >= d.sprout.ey && d.sprout.y - d.sprout.ey <= 16, `the sprout grows from the landing spot (${JSON.stringify(d.sprout)})`);
      // and back up: it undoes
      await page.evaluate(y => scrollTo(0, y), mid); await page.waitForTimeout(1000);
      const e = await state();
      assert.ok(e.drawn < 0.9 * e.len && (!e.sprout || e.sprout.h < 4), 'scrolling back up takes the trail and the sprout back');
      assert.ok(careTop > 0);
    } finally { await ctx.close(); }
  });

  test(`${w}px · reduced motion: the path is a still drawing, landed sprout, no moving seed`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      await page.waitForFunction(() => document.querySelector('[data-through] .trail')?.getTotalLength() > 0, null, { timeout: 5000 });
      await page.evaluate(() => scrollTo(0, document.querySelector('#care').getBoundingClientRect().top + scrollY - 100)); await page.waitForTimeout(400);
      const r = await page.evaluate(() => { const svg = document.querySelector('[data-through]'), len = svg.querySelector('.trail').getTotalLength(), sp = document.querySelector('[data-sprout]');
        const parts = sp ? [...sp.querySelectorAll('path')].map(e => e.getBoundingClientRect()) : [];
        return { drawn: +svg.dataset.drawn, len, seed: document.querySelector('[data-traveller]').hidden, sprout: sp && getComputedStyle(sp).display !== 'none' && parts.length ? Math.max(...parts.map(q => q.bottom)) - Math.min(...parts.map(q => q.top)) : 0 }; });
      assert.ok(r.drawn >= r.len - 2, 'the whole path is drawn');
      assert.ok(r.seed, 'the seed stays out of the way');
      assert.ok(r.sprout >= 12, 'the sprout is simply there');
    } finally { await ctx.close(); }
  });
}
