// Bunny World hero smoke (notes/bunny-world/smoke-hero-spec.md, Tristan 2026-11-16).
// At rest the hero background measures flat; press and drag parts the smoke and shows colour; it closes again within a
// few seconds; nothing shifts layout; reduced motion is plain flat colour with no canvas; the loop pauses off screen and
// in a hidden tab; on a phone a vertical swipe still scrolls the page while a sideways drag parts the smoke.
// SMOKE_URL picks the page (default: the landing, where it is mounted; the bench is /bunnyworld/smoke-demo.html).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = process.env.SMOKE_URL || '/bunnyworld/';
let site;
before(async () => { site = await startSite({ webgl: true }); });
after(async () => { await site?.close(); });

// hide the hero's content so only its background (and the smoke canvas) is measured
const HIDE = '.hero *:not(canvas){visibility:hidden !important}';
// measure the hero's painted background: how far any pixel is from the section colour, and how many are saturated colour
async function measure(page) {
  const box = await page.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, innerHeight - r.y) }; });
  const png = await page.screenshot({ clip: box, scale: 'css' });
  return page.evaluate(async b64 => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const bg = getComputedStyle(document.querySelector('.hero')).backgroundColor.match(/\d+/g).map(Number);
    // the hero's content boxes (copy lines, links, buttons), in screenshot pixels: colour must never show inside them
    const hr = document.querySelector('.hero').getBoundingClientRect(), k = img.width / hr.width, boxes = [], rg = document.createRange();
    const tw = document.createTreeWalker(document.querySelector('.hero'), NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('.sr') ? 1 : 2 });
    for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); boxes.push(...rg.getClientRects()); }
    document.querySelectorAll('.hero a, .hero button').forEach(e => boxes.push(e.getBoundingClientRect()));
    const inBox = (x, y) => boxes.some(b => x >= (b.left - hr.left) * k && x < (b.right - hr.left) * k && y >= (b.top - hr.top) * k && y < (b.bottom - hr.top) * k);
    let dev = 0, colour = 0, onCopy = 0, off = 0;
    for (let i = 0; i < d.length; i += 4) {
      const dv = Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])); dev = Math.max(dev, dv); if (dv > 24) off++;
      if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) { colour++; const p = i / 4; if (inBox(p % img.width, Math.floor(p / img.width))) onCopy++; }
    }
    return { dev, colour, onCopy, off, px: d.length / 4 };
  }, png.toString('base64'));
}
// ink-rim pixels (dark: only the sparkles' rims are dark once the content is hidden), and how many of them have no gap
// colour within 10px, i.e. were drawn over closed smoke
async function rims(page) {
  const box = await page.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, innerHeight - r.y) }; });
  const png = await page.screenshot({ clip: box, scale: 'css' });
  return page.evaluate(async b64 => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const W = img.width, H = img.height, d = x.getImageData(0, 0, W, H).data;
    const bg = getComputedStyle(document.querySelector('.hero')).backgroundColor.match(/\d+/g).map(Number);
    const off = (i) => Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) > 6;
    let rimsN = 0, outside = 0;
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const i = (y * W + X) * 4; if (d[i] + d[i + 1] + d[i + 2] > 240) continue;
      rimsN++; let gap = 0;
      for (let k = -10; k <= 10 && !gap; k += 2) for (let j = -10; j <= 10; j += 2) { const yy = y + k, xx = X + j; if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue; const q = (yy * W + xx) * 4;
        if (d[q] + d[q + 1] + d[q + 2] > 240 && off(q)) { gap = 1; break; } }
      if (!gap) outside++; }
    return { rims: rimsN, outside };
  }, png.toString('base64'));
}
async function drag(page, { from = .15, to = .85, y = .55, steps = 24, ms = 700, release = true } = {}) {
  const r = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return [b.x, b.y, b.width, Math.min(b.height, innerHeight - b.y)]; });
  const Y = r[1] + r[3] * y;
  await page.mouse.move(r[0] + r[2] * from, Y); await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(r[0] + r[2] * (from + (to - from) * i / steps), Y + Math.sin(i / 3) * 30); await page.waitForTimeout(ms / steps); }
  if (release) await page.mouse.up();
}
const rects = page => page.evaluate(() => ['.hero', '.hero h1', '.hero .lede', '.hero .lh-go', '#prices'].map(s => { const e = document.querySelector(s); if (!e) return s + ': missing'; const r = e.getBoundingClientRect(); return `${s} ${[r.x, r.y + scrollY, r.width, r.height].map(Math.round)}`; }));

for (const w of [390, 1440]) {
  test(`at rest the hero background is flat; a drag shows colour, then it closes within 4.5s @ ${w}`, async () => {
    const { ctx, page, errors } = await site.open(URL, w);
    try {
      await page.addStyleTag({ content: HIDE });
      await page.waitForTimeout(600);
      const rest = await measure(page);
      assert.ok(rest.dev <= 2, `at rest the hero is flat (max deviation ${rest.dev})`);
      assert.equal(rest.colour, 0, 'no colour at rest');
      assert.ok(await page.$('.hero canvas.bw-smoke'), 'the smoke canvas is mounted');
      await drag(page, { from: .03, to: .3, y: w < 900 ? .5 : .3, release: false });   // through the open space beside the centred copy (desktop: left of the logo, above the headline)
      const open = await measure(page);
      await page.mouse.up();
      const t0 = Date.now();
      assert.ok(open.off > open.px * .01 && open.colour > 0, `the drag opens the smoke onto colour (${open.off} px off the background, ${open.colour} strongly coloured, of ${open.px})`);
      assert.equal(open.onCopy, 0, 'no colour behind the copy, links or buttons: the smoke stays thick there');
      let closed = null;
      while (Date.now() - t0 < 6000) { const m = await measure(page); if (m.colour === 0 && m.dev <= 2) { closed = Date.now() - t0; break; } await page.waitForTimeout(150); }
      assert.ok(closed !== null && closed <= 4500, `closes again within 4.5s of letting go (closed after ${closed ?? '>6000'} ms)`);
      assert.ok(closed > 600, `it lingers before closing, not a snap (${closed} ms)`);
      const s = await page.evaluate(() => { const a = document.querySelector('.hero').__bwSmoke; return { running: a.stats.running, sheet: a.stats.sheet, dpr: a.stats.dpr }; });
      await page.waitForTimeout(Math.max(0, 5000 - (Date.now() - t0)));
      assert.equal((await page.evaluate(() => document.querySelector('.hero').__bwSmoke.stats.running)), false, 'the loop has stopped 5s after letting go');
      assert.ok((await measure(page)).dev <= 2, 'and the hero is flat again');
      assert.ok(Math.max(...s.sheet) <= 220, `the field is low-res (${s.sheet})`);
      assert.ok(s.dpr <= 1.5, `the canvas resolution is capped (${s.dpr})`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`nothing shifts layout, with or without the smoke @ ${w}`, async () => {
    const plain = await site.open(URL, w, { reducedMotion: 'reduce' });
    const base = await rects(plain.page); await plain.ctx.close();
    const { ctx, page, errors } = await site.open(URL, w);
    try {
      // shifts of anything in the hero, since load (buffered, so mounting is covered); the header's Cart button arriving
      // from cart.js during load is the page's own and not the smoke's
      await page.evaluate(() => { window.__cls = 0; const hero = document.querySelector('.hero'); new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput && (e.sources || []).some(x => x.node && hero.contains(x.node))) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
      assert.deepEqual(await rects(page), base, 'same layout as the plain page');
      await drag(page, { release: false });
      assert.deepEqual(await rects(page), base, 'same layout mid-drag');
      await page.mouse.up(); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.__cls), 0, 'no layout shift in the hero');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`reduced motion: plain flat background, no smoke at all @ ${w}`, async () => {
    const { ctx, page, errors } = await site.open(URL, w, { reducedMotion: 'reduce' });
    try {
      await page.addStyleTag({ content: HIDE });
      assert.equal(await page.$('.hero canvas.bw-smoke'), null, 'no canvas');
      await drag(page);
      const m = await measure(page);
      assert.ok(m.dev <= 2 && m.colour === 0, `stays flat after a drag (dev ${m.dev}, colour ${m.colour})`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`pauses off screen and in a hidden tab @ ${w}`, async () => {
    const { ctx, page, errors } = await site.open(URL, w);
    try {
      const frames = () => page.evaluate(() => document.querySelector('.hero').__bwSmoke.stats.frames);
      await drag(page);
      const a = await frames(); await page.waitForTimeout(200);
      assert.ok(await frames() > a, 'runs while open and on screen');
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(200);
      const b = await frames(); await page.waitForTimeout(500);
      assert.equal(await frames(), b, 'no frames while the hero is off screen');
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100);
      await drag(page);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(100);
      const c = await frames(); await page.waitForTimeout(500);
      assert.equal(await frames(), c, 'no frames in a hidden tab');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}

// the sparkle carrots live only in the gap: where the smoke is closed, nothing of them is drawn
for (const w of [390, 1440]) test(`sparkle carrots form inside the open gap during a drag, and never show over closed smoke @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open(URL, w);
  try {
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(400);
    // a carrot placed where the smoke is closed: across its whole life the hero stays flat
    await page.evaluate(() => { const h = document.querySelector('.hero'), r = h.getBoundingClientRect(); h.__bwSmoke._sparkAt(Math.min(140, r.width * .2), 160); });
    for (const t of [150, 350, 600, 900]) { await page.waitForTimeout(t === 150 ? 150 : 250); const m = await measure(page); assert.ok(m.dev <= 2, `no sparkle over closed smoke (${t}ms: max deviation ${m.dev})`); }
    await page.waitForTimeout(1200);
    // a real drag through open space: a carrot is made while the drag is going, and every dark (ink-rim) pixel sits in the gap
    await drag(page, { from: .03, to: w < 900 ? .97 : .3, y: w < 900 ? .55 : .45, steps: 30, ms: 900, release: false });
    const made = await page.evaluate(() => document.querySelector('.hero').__bwSmoke.stats.cars.length);
    await page.mouse.up();
    if (w >= 900) assert.ok(made > 0, 'a sparkle carrot formed during the drag');
    // sample for its life: any pixel darker than the smoke and the gradient (an ink rim) must have colour around it (it's in the gap)
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(200);
      const r = await rims(page);
      assert.equal(r.outside, 0, `sparkle rims drawn over closed smoke: ${r.outside} px (of ${r.rims} rim px)`);
    }
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('phone: a vertical swipe on the hero scrolls the page; a sideways drag parts the smoke', async () => {
  const { ctx, page, errors } = await site.open(URL, 390);
  try {
    await page.addStyleTag({ content: HIDE });
    assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.hero')).touchAction), /pan-y/, 'touch-action leaves vertical panning to the page');
    const cdp = await ctx.newCDPSession(page);
    const r = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return [b.x + b.width / 2, b.y + Math.min(b.height, innerHeight - b.y) * .5]; });
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(r[0] - 120), y: Math.round(r[1]), xDistance: 260, yDistance: 0, gestureSourceType: 'touch', speed: 500, preventFling: true });
    const m = await measure(page);
    assert.ok(m.colour > 0, `a sideways drag shows colour (${m.colour} px)`);
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(r[0]), y: Math.round(r[1] + 100), xDistance: 0, yDistance: -300, gestureSourceType: 'touch', speed: 800, preventFling: true });
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => scrollY) > 150, `the page scrolled (${await page.evaluate(() => scrollY)})`);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});
