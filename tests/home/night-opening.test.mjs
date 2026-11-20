// Home opening: the painted night Tristan approved in the demo (2026-11-19, "Put this night scene into the real home page").
// Back to front:
//   - sky: the real painted sky, still (Tristan, later the same night: "Remove the liquify effect from this").
//   - stars: his star family as filled vectors (inked six-point, painted five-point), cream with about 1 in 20 orange, 559 of
//     them where the painting's specks were. They sit still; a cursor hit spins one with the swipe, it morphs toward the other
//     shape while spinning, then settles. Redrawn only while something moves.
//   - the far and near ridges rise as you scroll (near faster); the S is a still, fully opaque cream outline; the live meadow.
// Reduced motion: everything drawn once, no spin.
// Run:  cd tests && npm install && node --test home/night-opening.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const DIR = path.join(ROOT, 'preview/assets/night');
const FILES = { 'sky-wide.webp': 420, 'sky-tall.webp': 260, 'ridge-far-wide.webp': 160, 'ridge-far-tall.webp': 100, 'ridge-near-wide.webp': 420, 'ridge-near-tall.webp': 240, 'stars.json': 24 };

let site, gl;
before(async () => { site = await startSite(); gl = await startSite({ webgl: true }); });
after(async () => { await site?.close(); await gl?.close(); });

const info = page => page.evaluate(() => window.sogOpening?.nightInfo?.());
const ready = page => page.waitForFunction(() => window.sogOpening?.nightInfo?.()?.ready, null, { timeout: 10000 });

test('the files are small, and the stars are his family in his places', () => {
  for (const [f, kb] of Object.entries(FILES)) {
    const p = path.join(DIR, f);
    assert.ok(fs.existsSync(p), `${f} exists`);
    const b = fs.readFileSync(p);
    if (f.endsWith('.webp')) assert.equal(b.subarray(8, 12).toString(), 'WEBP', `${f} is WebP`);
    assert.ok(b.length <= kb * 1024, `${f} is ${Math.round(b.length / 1024)} KB (at most ${kb})`);
  }
  const d = JSON.parse(fs.readFileSync(path.join(DIR, 'stars.json'), 'utf8'));
  assert.equal(d.s.length, 559, '559 stars');
  assert.ok(d.s.every(s => s.length === 6 && (s[5] === 5 || s[5] === 6)), 'each star is a five- or six-point');
  const orange = d.s.filter(s => s[4]).length / d.s.length;
  assert.ok(orange > .03 && orange < .08, `about 1 in 20 is orange (${(orange * 100).toFixed(1)}%)`);
});

for (const w of [1440, 390]) {
  test(`${w} · the night is built from its parts`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await ready(page);
      const n = await info(page);
      assert.equal(n.sky, 'image', 'the painted sky is a still image');
      const sky = await page.evaluate(() => { const i = document.querySelector('.lf .lf-sky img'); return i && getComputedStyle(i.closest('.lf-sky')).display !== 'none' && i.complete && i.naturalWidth > 0 ? i.currentSrc : null; });
      assert.match(sky || '', w < 900 ? /sky-tall\.webp/ : /sky-wide\.webp/, 'the sky crop fits the screen');
      assert.equal(n.stars, 559, 'all 559 stars are drawn');
      assert.ok(n.orange >= 17 && n.orange <= 45, `some stars are orange (${n.orange})`);
      assert.equal(n.starsMoving, false, 'stars sit still until touched');
      assert.ok(n.ridges, 'both ridges are drawn between the S and the meadow');
      assert.equal(n.crop, w < 900 ? 'tall' : 'wide');
      assert.ok(n.headBottom < n.farCrest, 'the headline sits in the sky above the far ridge');
      assert.equal(n.mark, 'outline', 'the S is a cream outline');
      assert.equal(n.markAlpha, 1, 'the S is fully opaque');
      if (w < 900) assert.ok(n.moonY > n.headBottom, 'on a phone the S sits below the headline');
      else assert.ok(n.moonX > n.headRight, 'on a wide screen the S sits to the right of the headline');
      const dpr = await page.evaluate(() => { const c = document.querySelector('.lf .lf-starc'); return c.width / c.clientWidth; });
      assert.ok(dpr <= 2.01, `the star canvas is capped at 2x (${dpr})`);
      const bg = await page.evaluate(() => [document.querySelector('.lf'), ...document.querySelectorAll('.lf *')].map(e => getComputedStyle(e).backgroundImage).filter(b => /gradient/.test(b)));
      assert.deepEqual(bg, [], 'no CSS-gradient surfaces');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · a swipe spins the star it hits, which morphs and settles; the S stays put`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await ready(page);
      const t = await page.evaluate(() => sogOpening.starTarget());   // a star clear of the headline, the S and the ridges
      assert.ok(t, 'there is a star to touch');
      const s0 = await info(page);
      const mouse = page.mouse;
      await mouse.move(t.x - 60, t.y + 2); await mouse.move(t.x + 60, t.y + 2, { steps: 6 });
      await page.waitForTimeout(120);
      const a = await page.evaluate(i => sogOpening.star(i), t.i);
      assert.ok(Math.abs(a.spin) > .01, `the star spins (${a.spin})`);
      assert.ok(a.morph > .02, `and shifts toward the other shape (${a.morph})`);
      assert.equal((await info(page)).starsMoving, true);
      await page.waitForTimeout(4000);
      const b = await page.evaluate(i => sogOpening.star(i), t.i);
      assert.equal(b.spin, 0, 'it slows to a stop');
      assert.equal(b.morph, 0, 'and goes back to its own shape');
      assert.equal((await info(page)).starsMoving, false, 'and the stars stop redrawing');
      // sweep straight through the S: it does not move
      const m = s0.markBox;
      await mouse.move(m.x0 - 40, (m.y0 + m.y1) / 2); await mouse.move(m.x1 + 40, (m.y0 + m.y1) / 2, { steps: 10 });
      await page.waitForTimeout(300);
      assert.deepEqual((await info(page)).markBox, m, 'the S stays still');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · scrolling raises the ridges, near faster; the next section slides over the night`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await ready(page);
      const h = await page.evaluate(() => innerHeight);
      const a = await info(page);
      await page.evaluate(v => scrollTo(0, v), Math.round(h * .5)); await page.waitForTimeout(400);
      const b = await info(page);
      const far = a.off.far - b.off.far, near = a.off.near - b.off.near, stars = a.off.stars - b.off.stars;
      assert.ok(far > 0, 'the far ridge rises');
      assert.ok(near > far, `the near ridge rises faster (${near.toFixed(1)} > ${far.toFixed(1)})`);
      assert.ok(stars > 0 && stars < far, 'the stars lift a little, less than the ridges');
      assert.equal(b.off.sky, 0, 'the sky stays put');
      // the night stays whole while the Three things section slides up over it (it no longer fades away)
      await page.evaluate(() => { const s = document.getElementById('services'); scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * .5); });
      await page.waitForTimeout(400);
      assert.ok((await info(page)).scene > .95, 'the scene stays as the next section arrives');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · the sky is the still painting even where WebGL works: no liquify`, async () => {
    const { ctx, page, errors } = await gl.open('/', w);
    try {
      await ready(page);
      const n = await info(page);
      assert.equal(n.sky, 'image', 'the sky is the painted image');
      const d = await page.evaluate(() => ({ gl: !!document.querySelector('.lf .lf-skygl'), shader: [...document.scripts].some(s => /webgl2/.test(s.textContent)) }));
      assert.equal(d.gl, false, 'no sky canvas');
      assert.equal(d.shader, false, 'no WebGL shader on the page');
      const p = await page.evaluate(() => ({ x: innerWidth * .5, y: innerHeight * .2 }));
      await page.mouse.move(p.x - 80, p.y); await page.mouse.move(p.x + 80, p.y, { steps: 8 });
      assert.equal(n.smear, undefined, 'nothing smears');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · reduced motion draws it all once: no spin`, async () => {
    const { ctx, page, errors } = await gl.open('/', w, { reducedMotion: 'reduce' });
    try {
      await ready(page);
      const n = await info(page);
      assert.equal(n.still, true);
      assert.equal(n.sky, 'image', 'the still painting');
      assert.equal(n.stars, 559, 'the stars are still drawn');
      assert.ok(n.ridges, 'the ridges are drawn, at rest');
      const t = await page.evaluate(() => sogOpening.starTarget());
      await page.mouse.move(t.x - 60, t.y + 2); await page.mouse.move(t.x + 60, t.y + 2, { steps: 6 });
      await page.waitForTimeout(150);
      assert.equal((await page.evaluate(i => sogOpening.star(i), t.i)).spin, 0, 'a swipe does not spin a star');
      assert.equal((await info(page)).starsMoving, false);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
