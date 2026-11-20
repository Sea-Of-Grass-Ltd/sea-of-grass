// Home page: the opening's pinned meadow must never show through the bands after the work list.
// Bug (2026-11-19, Tristan): "you see the grass randomly in that spot" — a strip of meadow behind "How a project goes".
// Cause: the opening (.lf) is a 100vh sticky canvas with margin-bottom:-100vh, so once it stops being pinned it trails a
// whole screen below its section, grass heaped along its bottom edge. On screens taller than the stage plus the work band,
// that edge lands behind the see-through steps band.
// Run:  cd tests && npm install && node --test home/grass-band.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

// desktop sizes from short to tall (the tall ones are where it leaked), plus a phone
const SIZES = [[1280, 800], [1310, 890], [1310, 1100], [1440, 1200], [1920, 1200], [390, 844]];

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

async function open(w, h) {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await ctx.route(u => !u.href.startsWith(site.base), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(site.base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}

// where the opening paints on screen (its box less any clip-path inset at the bottom), and every see-through band after #work
const probe = page => page.evaluate(() => {
  const lf = document.querySelector('main.cb .lf'), r = lf.getBoundingClientRect();
  const m = /inset\(\s*([\d.]+)px\s+([\d.]+)px\s+([\d.]+)px/.exec(getComputedStyle(lf).clipPath || '');
  const vis = getComputedStyle(lf).visibility !== 'hidden' && getComputedStyle(lf).display !== 'none';
  const paintBottom = vis ? r.bottom - (m ? +m[3] : 0) : r.top;
  const bands = [];
  for (let n = document.getElementById('work')?.nextElementSibling; n; n = n.nextElementSibling) {
    const b = n.getBoundingClientRect(), bg = getComputedStyle(n).backgroundColor;
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && b.bottom > 0 && b.top < innerHeight) bands.push({ id: n.id || n.className.split(' ').pop(), top: b.top, bottom: b.bottom });
  }
  return { top: r.top, paintBottom, bands };
});

// grass-green pixels inside the steps band (the band itself is dark with pale words: no green at all)
async function greenIn(page, sel) {
  const box = await page.locator(sel).boundingBox(), vp = page.viewportSize();
  const y0 = Math.max(0, box.y), y1 = Math.min(vp.height, box.y + box.height);
  if (y1 - y0 < 20) return 0;
  const png = await page.screenshot({ clip: { x: 0, y: y0, width: vp.width, height: y1 - y0 } });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (g > 70 && g > r + 25 && g > b + 15) n++; }
    return n / (d.length / 4);
  }, png.toString('base64'));
}

for (const [w, h] of SIZES) {
  test(`${w}x${h} · no meadow behind the bands after the work list, at any scroll`, async () => {
    const { ctx, page, errors } = await open(w, h);
    try {
      const top = await page.evaluate(() => document.getElementById('work').getBoundingClientRect().top + scrollY);
      const end = await page.evaluate(() => { const p = document.getElementById('process'); return p.getBoundingClientRect().bottom + scrollY; });
      for (let y = top - h; y <= end; y += Math.round(h / 5)) {
        await page.evaluate(v => scrollTo(0, v), Math.max(0, y));
        await page.waitForTimeout(250);
        const p = await probe(page);
        for (const b of p.bands) {
          const overlap = Math.min(p.paintBottom, b.bottom) - Math.max(p.top, b.top);
          assert.ok(overlap <= 1, `scroll ${y}: the opening meadow paints ${Math.round(overlap)}px into the see-through band "${b.id}"`);
        }
        const g = await greenIn(page, '#process');
        assert.ok(g < .002, `scroll ${y}: ${(g * 100).toFixed(1)}% of "How a project goes" is grass-green`);
      }
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
