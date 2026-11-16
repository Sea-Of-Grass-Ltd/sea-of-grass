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
    // the hero's words, in screenshot pixels: colour must never show behind them (solid things on top, like the logo and the
    // dark button, are opaque, so colour may run right up to them; words on the button's fill and in closed panels don't count)
    const hr = document.querySelector('.hero').getBoundingClientRect(), k = img.width / hr.width, boxes = [], rg = document.createRange();
    const tw = document.createTreeWalker(document.querySelector('.hero'), NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('.sr,.lh-go') && n.parentElement.checkVisibility({ visibilityProperty: true }) ? 1 : 2 });
    for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); boxes.push(...rg.getClientRects()); }
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
      assert.equal(open.onCopy, 0, 'no colour behind the words: the smoke stays thick there');
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

// the carrot wake (Tristan 11-16): whole little carrots pop up behind the pointer, coast, settle, and the smoke closes over
// them oldest first. They live only in the gap: where the smoke is closed, nothing of them is drawn.
for (const w of [390, 1440]) test(`carrots appear only inside the open gap, never over closed smoke @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open(URL, w);
  try {
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(400);
    // a carrot placed where the smoke is closed: across its whole life the hero stays flat
    await page.evaluate(() => { const h = document.querySelector('.hero'), r = h.getBoundingClientRect(); h.__bwSmoke._sparkAt(Math.min(140, r.width * .2), 160); });
    for (const t of [150, 350, 600, 900]) { await page.waitForTimeout(t === 150 ? 150 : 250); const m = await measure(page); assert.ok(m.dev <= 2, `no carrot over closed smoke (${t}ms: max deviation ${m.dev})`); }
    await page.waitForTimeout(1200);
    // a real drag through open space: carrots appear while it goes, and every dark (ink-rim) pixel sits in the gap
    // (on a phone the copy fills the hero; the clear room is the corner right of the logo)
    await drag(page, { from: w < 900 ? .45 : .03, to: w < 900 ? .97 : .3, y: w < 900 ? .07 : .45, steps: 30, ms: 900, release: false });
    const made = await page.evaluate(() => document.querySelector('.hero').__bwSmoke.stats.made);
    await page.mouse.up();
    assert.ok(made > 0, `carrots appeared during the drag (${made})`);
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(200);
      const r = await rims(page);
      assert.equal(r.outside, 0, `carrot rims drawn over closed smoke: ${r.outside} px (of ${r.rims} rim px)`);
    }
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

// at most six to a drag, and never on the copy: drag right across the headline and the tagline as well as open space
for (const w of [390, 1440]) test(`at most 6 carrots per drag, none under the copy @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open(URL, w);
  try {
    await page.waitForTimeout(400);
    const copy = () => page.evaluate(() => {
      const hero = document.querySelector('.hero'), hr = hero.getBoundingClientRect(), out = [], rg = document.createRange();
      const tw = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('.sr') ? 1 : 2 });
      for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) out.push([r.left - hr.left, r.top - hr.top, r.right - hr.left, r.bottom - hr.top]); }
      return out; });
    const ys = w < 900 ? ['.hero h1', '.hero .lede'] : ['.hero h1', '.hero .lede', '.hero .lh-mark'];
    for (const sel of [null, ...ys]) {
      const y = sel ? await page.evaluate(s => { const h = document.querySelector('.hero').getBoundingClientRect(), r = document.querySelector(s).getBoundingClientRect(); return (r.top + r.height / 2 - h.top) / Math.min(h.height, innerHeight - h.top); }, sel) : (w < 900 ? .07 : .3);
      await drag(page, { from: .02, to: .98, y, steps: 40, ms: 1100, release: false });
      const st = await page.evaluate(() => { const s = document.querySelector('.hero').__bwSmoke.stats; return { made: s.made, cars: s.cars }; });
      await page.mouse.up();
      assert.ok(st.made <= 6, `at most 6 carrots in one drag (${st.made}, drag ${sel || 'open space'})`);
      if (!sel) assert.ok(st.made >= (w < 900 ? 1 : 2), `a long drag through open space leaves a wake (${st.made})`);
      const boxes = await copy();
      for (const c of st.cars) {
        const hit = boxes.find(b => c.x > b[0] - c.len / 2 && c.x < b[2] + c.len / 2 && c.y > b[1] - c.len / 2 && c.y < b[3] + c.len / 2);
        assert.ok(!hit, `carrot at ${Math.round(c.x)},${Math.round(c.y)} sits on the copy (${hit && hit.map(Math.round)}, drag ${sel || 'open space'})`);
      }
      await page.waitForTimeout(3500);
    }
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

// each part of the gap closes on its own clock, from when it was parted: the start of a drag closes before its end
test('an older part of the gap closes before a newer one', async () => {
  const { ctx, page, errors } = await site.open(URL, 1440);
  try {
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(400);
    const hb = await page.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, innerHeight - r.y) }; });
    // off-background pixels in the first and last thirds of the drag's span
    const thirds = async () => { const png = await page.screenshot({ clip: hb, scale: 'css' });
      return page.evaluate(async b64 => {
        const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const W = img.width, H = img.height, d = x.getImageData(0, 0, W, H).data;
        const bg = getComputedStyle(document.querySelector('.hero')).backgroundColor.match(/\d+/g).map(Number);
        const x0 = W * .03, x1 = W * .33, k = (x1 - x0) / 3; let a = 0, b = 0;
        for (let y = 0; y < H; y++) for (let X = Math.floor(x0); X < x1; X++) { const i = (y * W + X) * 4;
          if (Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) > 24) { if (X < x0 + k) a++; else if (X > x1 - k) b++; } }
        return [a, b]; }, png.toString('base64')); };
    await drag(page, { from: .05, to: .31, y: .3, steps: 30, ms: 1300, release: false });
    // keep holding at the end: the start must close on its own clock (1.4-2s after it was parted), the held end stays open
    const t0 = Date.now(), peak = [1, 1]; let gone = null, endNow = 0;
    while (Date.now() - t0 < 2600 && gone === null) {
      const v = await thirds(), t = Date.now() - t0;
      peak[0] = Math.max(peak[0], v[0]); peak[1] = Math.max(peak[1], v[1]); endNow = v[1];
      if (v[0] < peak[0] * .1) gone = t;
      await page.waitForTimeout(60);
    }
    await page.mouse.up();
    assert.ok(gone !== null, `the start of the drag closed while the pointer was still held (start still ${peak[0]} px open after 2.6s)`);
    assert.ok(endNow > peak[1] * .3, `while the newer end, still held, stayed open (${endNow} of ${peak[1]} px)`);
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

// the price strip has no panel of its own: colour revealed just above it carries on into it with no hard edge (Tristan 11-16:
// the strip's box cut the colour off in a flat rectangle). Sample 8-16px inside its top border and left end against 24-32px outside, away from the words.
test('colour runs across the price strip\'s edges with no hard step', async () => {
  const { ctx, page, errors } = await site.open(URL, 1440);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addStyleTag({ content: HIDE });
    // without the sparkle carrots: their glints are crisp by design, and this measures only the smoke and its colour
    await page.evaluate(() => { const h = document.querySelector('.hero'); h.__bwSmoke.destroy(); BWSmoke.mount(h, { sparkles: false }); });
    await page.waitForTimeout(700);
    const s = await page.evaluate(() => { const r = document.querySelector('.hero .prices').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const line = async (x0, y0, x1, y1, n = 26) => { await page.mouse.move(x0, y0); await page.mouse.down();
      for (let i = 1; i <= n; i++) { await page.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n + Math.sin(i / 2) * 3); await page.waitForTimeout(22); } await page.mouse.up(); };
    await line(s.x + 20, s.y - 4, s.x + s.w - 20, s.y - 4);          // along the top border
    await line(s.x - 80, s.y + s.h * .5, s.x + 50, s.y + s.h * .5, 12); // across the left end
    await page.waitForTimeout(60);
    const png = await page.screenshot({ scale: 'css' });
    const r = await page.evaluate(async ([b64, s]) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const W = img.width, d = x.getImageData(0, 0, W, img.height).data;
      const px = (X, Y) => { const i = (Math.round(Y) * W + Math.round(X)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      const chroma = (X, Y) => { const p = px(X, Y); return Math.max(0, Math.max(...p) - Math.min(...p) - 16); };   // above the hero colour's own faint tint
      // keep 48px clear of the strip's words, where the smoke is meant to thicken back to white
      const words = [], rg = document.createRange(), tw = document.createTreeWalker(document.querySelector('.hero .prices'), NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() ? 1 : 2 });
      for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); words.push(...rg.getClientRects()); }
      const clear = (X, Y) => !words.some(b => X > b.left - 48 && X < b.right + 48 && Y > b.top - 48 && Y < b.bottom + 48);
      let outT = 0, inT = 0, outL = 0, inL = 0, step = 0, at = null;
      for (let X = s.x + 10; X < s.x + s.w - 10; X++) { if (!clear(X, s.y + 12)) continue;
        for (let k = 8; k <= 16; k++) { outT += chroma(X, s.y - k - 16); inT += chroma(X, s.y + k); }
        for (let Y = s.y - 24; Y < s.y + 24; Y++) { const a = px(X, Y), b = px(X, Y + 1); { const v = Math.max(...a.map((v, i) => Math.abs(v - b[i]))); if (v > step) { step = v; at = [X, Y, a, b]; } } } }
      for (let Y = s.y + 10; Y < s.y + s.h - 10; Y++) { if (!clear(s.x + 12, Y)) continue;
        for (let k = 8; k <= 16; k++) { outL += chroma(s.x - k - 16, Y); inL += chroma(s.x + k, Y); }
        for (let X = s.x - 24; X < s.x + 24; X++) { const a = px(X, Y), b = px(X + 1, Y); { const v = Math.max(...a.map((v, i) => Math.abs(v - b[i]))); if (v > step) { step = v; at = [X, Y, a, b]; } } } }
      return { outT, inT, outL, inL, step, at: JSON.stringify(at) };
    }, [png.toString('base64'), s]);
    assert.ok(r.outT > 2000 && r.outL > 500, `colour is revealed beside the strip (top ${r.outT}, left ${r.outL})`);
    assert.ok(r.inT >= r.outT * .4, `colour carries on inside the strip's top edge (inside ${r.inT} vs outside ${r.outT})`);
    assert.ok(r.inL >= r.outL * .4, `colour carries on inside the strip's left end (inside ${r.inL} vs outside ${r.outL})`);
    assert.ok(r.step <= 48, `no hard step across the strip's edges (largest 1px change ${r.step} at ${r.at})`);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

// solid things on top (the logo, the dark button) need no mask: the colour runs right up to their outline, with no white
// halo hugging it (Tristan 11-16: a white band along the ears). Find the real outline from the ink, drag down beside it,
// and compare the colour just outside it with the colour 30px further out.
for (const w of [390, 1440]) test(`colour runs right up to the logo and the button, no white halo @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open(URL, w);
  try {
    await page.setViewportSize({ width: w, height: w < 900 ? 844 : 1000 });
    await page.evaluate(() => { const h = document.querySelector('.hero'); h.__bwSmoke.destroy(); BWSmoke.mount(h, { sparkles: false }); });
    await page.waitForTimeout(700);
    const shot = async () => (await page.screenshot({ scale: 'css' })).toString('base64');
    // the outline: per row, the first and last ink pixel inside the logo's box (and the button's pill edges)
    const geo = await page.evaluate(async b64 => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const W = img.width, d = x.getImageData(0, 0, W, img.height).data, ink = (X, Y) => { const i = (Y * W + X) * 4; return d[i] + d[i + 1] + d[i + 2] < 200; };
      const m = document.querySelector('.hero .lh-mark').getBoundingClientRect(), rows = [];
      for (let Y = Math.ceil(m.top) + 4; Y < m.top + m.height * .45; Y += 3) { let l = -1, r = -1;   // the ears: the top of the mark
        for (let X = Math.floor(m.left); X < m.right; X++) if (ink(X, Y)) { if (l < 0) l = X; r = X; }
        if (l >= 0) rows.push([Y, l, r]); }
      const b = document.querySelector('.hero .lh-go').getBoundingClientRect();
      const words = [], rg = document.createRange(), tw = document.createTreeWalker(document.querySelector('.hero'), NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('.sr,.lh-go') ? 1 : 2 });
      for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width) words.push([r.left, r.top, r.right, r.bottom]); }
      return { rows, btn: [b.left, b.top, b.right, b.bottom], words, W, H: img.height };
    }, await shot());
    assert.ok(geo.rows.length > 10, `found the ears' outline (${geo.rows.length} rows)`);
    // drag down along each ear's outline, 6px out (the gap then clearly covers it), and down the button's left end
    const along = async pts => { await page.mouse.move(...pts[0]); await page.mouse.down();
      for (const p of pts.slice(1)) { await page.mouse.move(...p); await page.waitForTimeout(16); } await page.mouse.up(); };
    const r0 = geo.rows[0];
    await along([[r0[1] - 6, r0[0] - 20], ...geo.rows.map(([Y, l]) => [l - 6, Y])]);
    await along([[r0[2] + 6, r0[0] - 20], ...geo.rows.map(([Y, , r]) => [r + 6, Y])]);
    await along(Array.from({ length: 12 }, (_, i) => [geo.btn[0] - 6, geo.btn[1] - 10 + (geo.btn[3] - geo.btn[1] + 20) * i / 11]));
    await page.waitForTimeout(60);
    const res = await page.evaluate(async ([b64, geo]) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const W = img.width, d = x.getImageData(0, 0, W, img.height).data;
      const chroma = (X, Y) => { const i = (Math.round(Y) * W + Math.round(X)) * 4; return Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); };
      const nearWords = (X, Y) => geo.words.some(b => X > b[0] - 30 && X < b[2] + 30 && Y > b[1] - 30 && Y < b[3] + 30);   // words keep their soft falloff
      const out = { far: 0, halo: 0, where: [] };
      const check = (X, Y, dir) => { const near = X + dir * 5, far = X + dir * 33; if (nearWords(near, Y) || nearWords(far, Y)) return;
        if (chroma(far, Y) < 50) return; out.far++;
        if (chroma(near, Y) < 15) { out.halo++; if (out.where.length < 4) out.where.push([Math.round(near), Y, chroma(near, Y), chroma(far, Y)]); } };
      for (const [Y, l, r] of geo.rows) { check(l, Y, -1); check(r, Y, 1); }
      for (let Y = geo.btn[1] + 8; Y < geo.btn[3] - 8; Y += 2) check(geo.btn[0], Y, -1);
      return out;
    }, [await shot(), geo]);
    assert.ok(res.far >= 8, `colour is revealed beside the logo and the button (${res.far} rows)`);
    assert.ok(res.halo <= res.far * .1, `no white halo just outside the logo or button: ${res.halo} of ${res.far} rows white next to colour ${JSON.stringify(res.where)}`);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});
