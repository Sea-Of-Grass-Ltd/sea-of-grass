// Home opening as a painted night scene built from parts (Tristan, 2026-11-19: "rebuild it out of parts so that it's more
// engaging as you scroll"). Back to front: the painted sky (barely moves), the stars (drift, a few twinkle), the S rising like a
// moon, the far ridge, the near ridge (rises faster), then the live sweepable meadow in front. Phone and desktop crops of the
// same layers; WebP files kept small; reduced motion gets one still composite. No CSS-gradient surfaces.
// Run:  cd tests && npm install && node --test home/night-opening.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const DIR = path.join(ROOT, 'preview/assets/night');
// each file and the most it may weigh (KB)
const FILES = { 'sky-wide.webp': 420, 'sky-tall.webp': 260, 'stars-2400.webp': 160, 'stars-1400.webp': 80,
  'ridge-far-wide.webp': 160, 'ridge-far-tall.webp': 100, 'ridge-near-wide.webp': 420, 'ridge-near-tall.webp': 240,
  'still-wide.webp': 380, 'still-tall.webp': 260 };

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

test('the layers are WebP and kept small', () => {
  for (const [f, kb] of Object.entries(FILES)) {
    const p = path.join(DIR, f);
    assert.ok(fs.existsSync(p), `${f} exists`);
    const b = fs.readFileSync(p);
    assert.equal(b.subarray(8, 12).toString(), 'WEBP', `${f} is WebP`);
    assert.ok(b.length <= kb * 1024, `${f} is ${Math.round(b.length / 1024)} KB (at most ${kb})`);
  }
});

const info = page => page.evaluate(() => window.sogOpening && sogOpening.nightInfo && sogOpening.nightInfo());
const scrollTo = (page, y) => page.evaluate(v => scrollTo(0, v), y);

for (const w of [1440, 390]) {
  test(`${w} · the scene is built from its parts, the right crop for the screen`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await page.waitForFunction(() => window.sogOpening?.nightInfo?.()?.ready, null, { timeout: 8000 });
      const d = await page.evaluate(() => {
        const sky = document.querySelector('.lf .lf-sky img'), stars = document.querySelector('.lf .lf-stars img');
        return { sky: sky && sky.complete && sky.naturalWidth > 0 ? sky.currentSrc : null, stars: stars && stars.complete && stars.naturalWidth > 0 ? stars.currentSrc : null };
      });
      const n = await info(page);
      assert.ok(d.sky, 'the painted sky is loaded');
      assert.ok(d.stars, 'the stars are loaded');
      assert.match(d.sky, w < 900 ? /sky-tall\.webp/ : /sky-wide\.webp/, 'the sky crop fits the screen');
      assert.equal(n.crop, w < 900 ? 'tall' : 'wide', 'the ridges use the matching crop');
      assert.ok(n.ridges, 'both ridges are drawn between the moon and the meadow');
      assert.ok(n.headBottom < n.farCrest, `the headline sits in the sky above the far ridge (${Math.round(n.headBottom)} < ${Math.round(n.farCrest)})`);
      assert.ok(n.moonY < n.nearCrest, 'the S floats above the near ridge like a moon');
      const bg = await page.evaluate(() => [document.querySelector('.lf'), ...document.querySelectorAll('.lf *')].map(e => getComputedStyle(e).backgroundImage).filter(b => /gradient/.test(b)));
      assert.deepEqual(bg, [], 'no CSS-gradient surfaces in the opening');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · scrolling moves each layer at its own pace, back slowest, front fastest`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await page.waitForFunction(() => window.sogOpening?.nightInfo?.()?.ready, null, { timeout: 8000 });
      const h = await page.evaluate(() => innerHeight);
      const a = await info(page);
      await scrollTo(page, Math.round(h * .5)); await page.waitForTimeout(400);
      const b = await info(page);
      const moved = k => a.off[k] - b.off[k]; // upward movement in px
      const m = Object.fromEntries(['sky', 'stars', 'moon', 'far', 'near'].map(k => [k, moved(k)]));
      assert.ok(m.sky > 0 && m.sky < h * .03, `the sky barely moves (${m.sky.toFixed(1)}px)`);
      assert.ok(m.stars > m.sky, `stars move more than the sky (${m.stars.toFixed(1)} > ${m.sky.toFixed(1)})`);
      assert.ok(m.moon > m.stars, `the S rises faster than the stars (${m.moon.toFixed(1)} > ${m.stars.toFixed(1)})`);
      assert.ok(m.far > 0, 'the far ridge rises');
      assert.ok(m.near > m.far, `the near ridge rises faster than the far (${m.near.toFixed(1)} > ${m.far.toFixed(1)})`);
      const tw = await page.evaluate(() => [...document.querySelectorAll('.lf .lf-twinkle')].filter(e => getComputedStyle(e).animationName !== 'none').length);
      assert.ok(tw >= 6, `a few stars twinkle (${tw})`);
      // the painting gives way to the plain ground when the service chapters arrive, and comes back on the way up
      await page.evaluate(() => { const s = document.getElementById('services'); scrollTo(0, s.getBoundingClientRect().top + scrollY + innerHeight * .2); });
      await page.waitForTimeout(400);
      const c = await info(page);
      assert.ok(c.scene < .1, `the scene fades for the chapters (${c.scene})`);
      await scrollTo(page, 0); await page.waitForTimeout(400);
      assert.ok((await info(page)).scene > .95, 'the scene returns at the top');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · reduced motion shows one still composite and nothing moves`, async () => {
    const { ctx, page, errors } = await site.open('/', w, { reducedMotion: 'reduce' });
    try {
      await page.waitForTimeout(800);
      const d = await page.evaluate(() => {
        const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
        const still = document.querySelector('.lf .lf-still img');
        return { still: vis('.lf .lf-still') && still.complete && still.naturalWidth > 0 ? still.currentSrc : null, sky: vis('.lf .lf-sky'), stars: vis('.lf .lf-stars'),
          tw: [...document.querySelectorAll('.lf .lf-twinkle')].filter(e => getComputedStyle(e).animationName !== 'none' && getComputedStyle(e).display !== 'none').length };
      });
      assert.match(d.still || '', w < 900 ? /still-tall\.webp/ : /still-wide\.webp/, 'the still composite is shown, in the right crop');
      assert.equal(d.sky, false, 'the moving sky layer is off');
      assert.equal(d.stars, false, 'the moving star layer is off');
      assert.equal(d.tw, 0, 'no twinkling');
      const n = await info(page);
      assert.equal(n.still, true);
      assert.equal(n.ridges, false, 'the ridges come from the composite, not the canvas');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
