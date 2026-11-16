// Bunny World landing posters and share card are real, current screenshots (2026-11-16, after the new shop colours).
// Each poster (the still shown in the laptop and phone while the live shop loads, and the buy-menu thumbnail) must carry
// the same colours as that shop's first screen today: a colour histogram of the poster is compared with a fresh
// screenshot of the shop at the same size. The landing share card must be the Clean look with today's prices.
// Run:  cd tests && node --test bunnyworld/posters.test.mjs
// SITE_ROOT=/path/to/site serves another checkout (used to show the old images failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const SHOPS = ['bunny-burritos', 'bunny-auto', 'warren-bakehouse', 'hare-today', 'hop-along', 'cottontail-farm', 'burrow-and-bough', 'long-ears', 'hopwell-chiro'];
const KINDS = { laptop: { vw: 1280, vh: 800, w: 960, h: 600 }, phone: { vw: 390, vh: 844, w: 390, h: 844 } };
const POSTERS = '/preview/assets/work/bunny-world';
const MATCH = 0.7; // share of the picture whose colour lands in the same bin; old palettes score well under this

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// runs in the page: a 4-level-per-channel colour histogram of an image, as fractions of its area
async function histOf(src) {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = 96; c.height = Math.round(96 * img.naturalHeight / img.naturalWidth);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data, h = new Array(64).fill(0), n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) h[(d[i] >> 6) * 16 + (d[i + 1] >> 6) * 4 + (d[i + 2] >> 6)] += 1 / n;
  return h;
}
const overlap = (a, b) => a.reduce((s, v, i) => s + Math.min(v, b[i]), 0);
const top = h => h.indexOf(Math.max(...h));

for (const shop of SHOPS) {
  for (const [kind, k] of Object.entries(KINDS)) {
    test(`${shop} · ${kind} poster has the shop's current colours`, async () => {
      const file = path.join(ROOT, POSTERS, `poster-${shop}-${kind}.webp`);
      assert.ok(fs.existsSync(file), `poster file exists: ${file}`);
      const { ctx, page } = await site.open(`/bunnyworld/${shop}/`, k.vw, { reducedMotion: 'reduce', scale: 1 });
      try {
        await page.setViewportSize({ width: k.vw, height: k.vh });
        await page.waitForTimeout(600);
        const shot = 'data:image/png;base64,' + (await page.screenshot()).toString('base64');
        const [live, poster, size] = await page.evaluate(async ([fn, a, b]) => {
          const f = eval('(' + fn + ')');
          const img = new Image(); img.src = b; await img.decode();
          return [await f(a), await f(b), [img.naturalWidth, img.naturalHeight]];
        }, [histOf.toString(), shot, `${POSTERS}/poster-${shop}-${kind}.webp`]);
        assert.deepEqual(size, [k.w, k.h], 'poster keeps its size');
        const score = overlap(live, poster);
        assert.ok(score >= MATCH, `colours match the live first screen: ${(score * 100).toFixed(0)}% overlap, need ${MATCH * 100}%`);
        assert.ok(poster[top(live)] >= live[top(live)] * 0.6, `the shop's main colour fills the poster too (${(poster[top(live)] * 100).toFixed(0)}% vs ${(live[top(live)] * 100).toFixed(0)}% live)`);
      } finally { await ctx.close(); }
    });
  }
}

test('landing share card: the Clean look and current prices', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'bunnyworld/index.html'), 'utf8');
  const og = (html.match(/property="og:image" content="([^"]+)"/) || [])[1];
  assert.ok(og, 'og:image is set');
  const tw = (html.match(/name="twitter:image" content="([^"]+)"/) || [])[1];
  assert.equal(tw, og, 'twitter:image is the same picture');
  const rel = new URL(og).pathname, file = path.join(ROOT, rel);
  assert.ok(fs.existsSync(file), `share card file exists: ${rel}`);
  const alt = (html.match(/property="og:image:alt" content="([^"]+)"/) || [])[1] || '';
  assert.ok(!/1,200/.test(alt) && /\$100/.test(alt) && /\$250/.test(alt) && /\$2,000/.test(alt) && /\$50/.test(alt), `alt text names today's prices: "${alt}"`);

  // the card source names today's prices and is drawn in the Clean colours
  const src = fs.readFileSync(path.join(ROOT, 'notes/bunny-world/og-card/card.html'), 'utf8');
  assert.ok(!/1,200/.test(src), 'no $1,200 starter on the card');
  for (const p of ['$250', '$100', '$2,000', '$50']) assert.ok(src.includes(p), `card shows ${p}`);
  for (const t of ['Bunny World.', 'Hop with style.', 'Imaginary shops, real websites.']) assert.ok(src.includes(t), `card carries the hero's words: ${t}`);
  assert.ok(/#F5F7F9/i.test(src) && /#181A1D/i.test(src) && !/#1B0F2A/i.test(src), 'card uses the Clean ground and ink, not Disco');

  // and the published picture is that Clean card: mostly the Clean off-white, almost no Disco purple
  const { ctx, page } = await site.open('/bunnyworld/', 1280, { reducedMotion: 'reduce', scale: 1 });
  try {
    const h = await page.evaluate(async ([fn, u]) => (eval('(' + fn + ')'))(u), [histOf.toString(), rel]);
    const light = h[63], dark = h[0];
    assert.ok(light >= 0.5, `card is mostly the light Clean ground (${(light * 100).toFixed(0)}%)`);
    assert.ok(dark < 0.3, `card is not a dark Disco ground (${(dark * 100).toFixed(0)}% near-black)`);
  } finally { await ctx.close(); }
});
