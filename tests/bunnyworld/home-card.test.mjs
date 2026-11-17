// Home page Work section: the Bunny World card's tile is a live title card (Tristan, 2026-11-16), not a video.
// The bunny mark does the dance (bounce + choreographed icon morphs, the globe at hold exactly as the live logo) and
// "Bunny World." under it gets a colour sweep through the five looks that lands on the beat. It starts only when the
// card is near the screen, pauses off screen and in a hidden tab, is static under reduced motion, and never shifts layout.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const CARD = 'a.cb-feature[href="/bunnyworld/"]';
const info = card => {
  const a = document.querySelector(card), tile = a?.querySelector('.cb-tile'), svg = tile?.querySelector('svg.bw-card');
  const r = tile?.getBoundingClientRect();
  return {
    video: !!tile?.querySelector('video'), svg: !!svg, state: svg?.dataset.state, frames: +(svg?.dataset.frames || 0),
    word: [...(svg?.querySelectorAll('.bw-word tspan') || [])].map(t => t.textContent).join(''),
    lines: svg?.querySelectorAll('[data-lines] path').length || 0,
    box: r ? [r.width, r.height].map(Math.round).join('x') : '', top: r ? Math.round(r.top + scrollY) : 0,
    title: a?.querySelector('b')?.textContent.replace(/\s+/g, ' ').trim(), type: a?.querySelector('.cb-type')?.textContent,
    line: a?.querySelector('.cb-line')?.textContent, href: a?.getAttribute('href'),
  };
};
const toCard = async page => { await page.evaluate(c => document.querySelector(c).scrollIntoView({ block: 'center', behavior: 'instant' }), CARD); await page.waitForTimeout(700); };

for (const w of [390, 1440]) test(`the tile is a live title card (no video), lazy until near, link and text unchanged @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open('/', w);
  try {
    const top = await page.evaluate(info, CARD);
    assert.equal(top.video, false, 'no video in the tile');
    assert.ok(top.svg, 'an SVG title card sits in the tile');
    assert.equal(top.word, 'Bunny World.', 'the wordmark reads "Bunny World."');
    assert.equal(top.frames, 0, `nothing animates before the card is near (frames ${top.frames}, state ${top.state})`);
    assert.equal(top.href, '/bunnyworld/'); assert.equal(top.title, 'Bunny World 01'); assert.equal(top.type, 'Web demos');
    assert.equal(top.line, 'Nine bunny-run shops, each a working site in its own style.');
    const [tw, th] = top.box.split('x').map(Number);
    assert.ok(Math.abs(tw / th - 1.6) < 0.02, `tile keeps the 1560x1040 shape (${top.box})`);
    await toCard(page);
    const a = await page.evaluate(info, CARD); await page.waitForTimeout(1200); const b = await page.evaluate(info, CARD);
    assert.equal(a.state, 'playing', 'plays once on screen');
    assert.ok(b.frames >= a.frames + 10, `frames keep coming while on screen (capped at 30 a second, none in the still middle of a hold) (${a.frames} → ${b.frames})`);
    assert.ok(b.lines >= 1, 'icon lines are drawn');
    assert.equal(a.box, top.box, `no layout shift when it starts (${top.box} → ${a.box})`);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('the globe at hold is the live logo, and the dance changes icons on the beat', async () => {
  const { ctx, page } = await site.open('/', 1440);
  try {
    await toCard(page);
    const at = t => page.evaluate(t => { const s = document.querySelector('svg.bw-card'); s.__bw.renderAt(t); return [...s.querySelectorAll('[data-lines] path')].map(p => p.getAttribute('d')).join('|'); }, t);
    const globe = await at(0.1);
    assert.equal(globe, ['M-39.4 -25H39.4', 'M-46.67 0H46.67', 'M-39.4 25H39.4', 'M0 -46.67V46.67', 'M0 -46.67A70 70 0 0 0 0 46.67', 'M0 -46.67A70 70 0 0 1 0 46.67'].join('|'), 'globe hold = the live logo lines');
    assert.notEqual(await at(2.0), globe, 'the next beat holds a different icon');
    assert.equal(await at(19.1), globe, 'the cycle comes back to the globe');
  } finally { await ctx.close(); }
});

test('the word sweep lands on the beat: flat ink at hold, the five looks while the bunny is in the air', async () => {
  const { ctx, page } = await site.open('/', 1440);
  try {
    await toCard(page);
    const fills = t => page.evaluate(t => { const s = document.querySelector('svg.bw-card'); s.__bw.renderAt(t); return [...s.querySelectorAll('.bw-word tspan')].map(e => getComputedStyle(e).fill); }, t);
    const hold = await fills(0.6), air = await fills(1.45), landed = await fills(1.9 + 0.3);
    assert.equal(new Set(hold).size, 1, `one flat ink at hold: ${[...new Set(hold)]}`);
    assert.ok(new Set(air).size >= 3, `mid-hop the letters run through the looks' colours: ${[...new Set(air)]}`);
    assert.deepEqual(new Set(landed), new Set(hold), 'back to flat ink after landing');
  } finally { await ctx.close(); }
});

test('pauses off screen and in a hidden tab, resumes on return', async () => {
  const { ctx, page } = await site.open('/', 1440);
  try {
    await toCard(page);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(500);
    const a = await page.evaluate(info, CARD); await page.waitForTimeout(800); const b = await page.evaluate(info, CARD);
    assert.equal(b.state, 'paused'); assert.equal(b.frames, a.frames, `no frames off screen (${a.frames} → ${b.frames})`);
    await toCard(page);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    const c = await page.evaluate(info, CARD); await page.waitForTimeout(800); const d = await page.evaluate(info, CARD);
    assert.equal(d.state, 'paused'); assert.equal(d.frames, c.frames, 'no frames in a hidden tab');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(600);
    assert.equal((await page.evaluate(info, CARD)).state, 'playing', 'resumes when the tab is back');
  } finally { await ctx.close(); }
});

test('reduced motion: a still mark (the live logo globe) and a still wordmark', async () => {
  const { ctx, page } = await site.open('/', 1440, { reducedMotion: 'reduce' });
  try {
    await toCard(page);
    const a = await page.evaluate(info, CARD); await page.waitForTimeout(1000); const b = await page.evaluate(info, CARD);
    assert.equal(b.state, 'static'); assert.equal(b.frames, a.frames, 'nothing animates');
    assert.equal(b.lines, 6, 'the globe (six lines) shows');
    const fills = await page.evaluate(() => [...document.querySelectorAll('svg.bw-card .bw-word tspan')].map(e => getComputedStyle(e).fill));
    assert.equal(new Set(fills).size, 1, 'the wordmark is one flat ink');
  } finally { await ctx.close(); }
});

// Bunny World landing headline: Tristan caught it mid-swap showing "Hop with s" and "rld." at once.
// A change must never paint letters from both phrases in the same frame.
test('the Bunny World headline never shows two phrases at once', async () => {
  const { ctx, page } = await site.open('/bunnyworld/', 1440);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const mixed = await page.evaluate(() => new Promise(done => {
      const h = document.querySelector('.hero h1'), bad = [], t0 = performance.now();
      const painted = l => { const c = getComputedStyle(l); return c.visibility !== 'hidden' && +c.opacity > 0.02 && +getComputedStyle(l.parentElement).opacity > 0.02 && getComputedStyle(l.parentElement).visibility !== 'hidden'; };
      const tick = () => {
        const from = [...h.querySelectorAll('.lh-from>span')].filter(l => l.textContent.trim() && painted(l)).map(l => l.textContent).join('');
        const to = [...h.querySelectorAll('.lh-to>span')].filter(l => l.textContent.trim() && painted(l)).map(l => l.textContent).join('');
        if (from && to && bad.length < 5) bad.push(`${from} | ${to}`);
        if (performance.now() - t0 < 9000) requestAnimationFrame(tick); else done(bad);
      };
      requestAnimationFrame(tick);
    }));
    assert.deepEqual(mixed, [], `frames painting both phrases: ${mixed.join('  ·  ')}`);
  } finally { await ctx.close(); }
});
