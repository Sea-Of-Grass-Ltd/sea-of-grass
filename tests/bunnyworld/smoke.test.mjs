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
    let dev = 0, colour = 0, onCopy = 0;
    for (let i = 0; i < d.length; i += 4) {
      dev = Math.max(dev, Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
      if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) { colour++; const p = i / 4; if (inBox(p % img.width, Math.floor(p / img.width))) onCopy++; }
    }
    return { dev, colour, onCopy, px: d.length / 4 };
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
      await drag(page, { from: .03, to: .3, y: .5, release: false });   // through the open space beside the centred copy
      const open = await measure(page);
      await page.mouse.up();
      const t0 = Date.now();
      assert.ok(open.colour > open.px * .005, `the drag reveals colour (${open.colour} of ${open.px} px)`);
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
      await page.evaluate(() => { window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
      assert.deepEqual(await rects(page), base, 'same layout as the plain page');
      await drag(page, { release: false });
      assert.deepEqual(await rects(page), base, 'same layout mid-drag');
      await page.mouse.up(); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.__cls), 0, 'no layout shift');
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
