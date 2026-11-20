// Websites page: the split-flap board reads as a real split flap (Tristan, 2026-11-20, on a crop of the board:
// "it missed fixing the problem here"). The hinge was a faint lighter hairline laid over the middle of every letter and it
// stopped short of the card edges, so it read as a glitch striking through the text.
// Each card: a top half and a bottom half split by a crisp dark gap (about 2 px, darker than the face) running edge to edge;
// the gap cuts every row's letters at the same height; the bottom half sits a touch darker; nothing lighter lies over the glyphs.
// Measured on real pixels.  Run:  cd tests && npm install && node --test services/websites-flap.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// decode a PNG screenshot inside the page and hand back per-pixel luminance rows
const lumaOf = (page, png) => page.evaluate(async b64 => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, L = [];
  for (let y = 0; y < c.height; y++) { const row = []; for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; row.push(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]); } L.push(row); }
  return { w: c.width, h: c.height, L };
}, png.toString('base64'));
const median = a => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };

for (const w of [390, 1440]) {
  test(`${w}px · the flap board: a crisp dark full-width seam, bottom half darker, no lighter line over the letters`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      // the page's through-line is another object; keep it out of the board's pixels
      await page.addStyleTag({ content: '.through,.traveller{display:none!important}' });
      const flaps = page.locator('.flapboard .flap');
      assert.equal(await flaps.count(), 4);
      const dpr = await page.evaluate(() => devicePixelRatio);
      const seamOffsets = [], bad = [], check = (c, m) => { if (!c) bad.push(m); };
      for (let k = 0; k < 4; k++) {
        const f = flaps.nth(k); await f.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
        const geo = await f.evaluate(e => { const r = e.getBoundingClientRect(), wd = e.querySelector('.flap-w').getBoundingClientRect(), ar = e.querySelector('.flap-a').getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, h: r.height, w: r.width, gapX: ((wd.right + ar.left) / 2) - r.left, wordTop: wd.top - r.top }; });
        // the card's own pixels only: a card on a fractional x would otherwise bring a sliver of the section behind it
        const x0 = Math.ceil(geo.left), y0 = Math.ceil(geo.top);
        const clip = { x: x0, y: y0, width: Math.floor(geo.right) - x0, height: Math.floor(geo.bottom) - y0 };
        geo.gapX -= x0 - geo.left; geo.wordTop -= y0 - geo.top;
        const { w: W, h: H, L } = await lumaOf(page, await page.screenshot({ clip }));
        const name = ['HOSTING', 'CHANGES', 'ORDERS', 'HOURS'][k];
        const gx = Math.round(geo.gapX * dpr);                          // a column with no letters on it
        const col = y0 => median(L.slice(Math.round(y0 * H), Math.round((y0 + .15) * H)).map(r => r[gx]));
        const faceTop = col(.15), faceBot = col(.7);
        check(faceBot < faceTop - 1.5, `${name}: the bottom half sits a touch darker (top L ${faceTop.toFixed(1)}, bottom ${faceBot.toFixed(1)})`);
        // seam rows: every pixel across the full card width, border columns included, darker than the face
        const mid = Math.round(H / 2), dark = [];
        for (let y = mid - Math.round(6 * dpr); y <= mid + Math.round(6 * dpr); y++) if (L[y].every(v => v < faceBot - 6)) dark.push(y);
        check(dark.length > 0, `${name}: a dark gap runs edge to edge across the card (none of the middle rows is darker than the face from the left edge to the right edge)`);
        if (!dark.length) {
          const y = Math.round(H / 2); check(Math.max(...L[y]) < faceTop, `${name}: no light stroke crosses the glyphs at the hinge (brightest middle-row L ${Math.max(...L[y]).toFixed(1)} vs face ${faceTop.toFixed(1)}; edge columns L ${L[y][0].toFixed(1)} / ${L[y][W - 1].toFixed(1)})`);
          continue;
        }
        const css = dark.length / dpr;
        check(css >= 1.5 && css <= 3, `${name}: the gap is about 2 px (${css.toFixed(2)} px)`);
        check(dark[dark.length - 1] - dark[0] + 1 === dark.length, `${name}: one crisp gap, not broken lines`);
        // nothing lighter than the face is drawn across the letters at the hinge
        { const hi = Math.max(...dark.map(y => Math.max(...L[y]))); check(hi < faceTop, `${name}: no light stroke crosses the glyphs at the hinge (L ${hi.toFixed(1)} vs face ${faceTop.toFixed(1)})`); }
        // rows just outside the gap: no pale hairline hugging it
        for (const y of [dark[0] - 1, dark[dark.length - 1] + 1]) {
          const line = L[y].slice(Math.round(4 * dpr), W - Math.round(4 * dpr));
          const pale = line.filter(v => v > faceTop + 4).length / line.length;
          check(pale < .5, `${name}: no pale line hugs the seam (${(pale * 100).toFixed(0)}% of the row is lighter than the face)`);
        }
        seamOffsets.push((dark[0] + dark.length / 2) / dpr - geo.wordTop);
      }
      const spread = Math.max(...seamOffsets) - Math.min(...seamOffsets);
      if (seamOffsets.length === 4) check(spread <= 1, `the gap cuts the letters at the same height on every row (offsets ${seamOffsets.map(v => v.toFixed(1)).join(', ')})`);
      assert.deepEqual(bad, [], 'the board reads as a real split flap');
    } finally { await ctx.close(); }
  });
}
