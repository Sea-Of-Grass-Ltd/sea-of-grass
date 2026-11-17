// Home page Work section: the Bunny World card's tile is a live title card (Tristan, 2026-11-16), not a video.
// Revised after two critic reviews: no wordmark (the card title says it); the bunny, centred at about 72-75% of the tile's
// height, does the dance (bounce + choreographed icon morphs, beat about 1.4 s, the icon swapping at the top of the hop);
// each icon lands in its shop's accent colour; the globe at hold is exactly the live logo. It starts only when the card is
// near the screen, pauses off screen and in a hidden tab, is static under reduced motion, and never shifts layout.
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
    word: svg?.querySelector('text')?.textContent || '', bunny: svg ? Math.round(svg.querySelector('[data-body]').getBoundingClientRect().height / r.height * 100) : 0,
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
    assert.equal(top.word, '', 'no wordmark in the tile (the card title below says it)');
    assert.ok(top.bunny >= 70 && top.bunny <= 77, `the bunny fills about 72-75% of the tile's height (${top.bunny}%)`);
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
    assert.notEqual(await at(1.4 + 0.3), globe, 'the next beat (1.4 s on) holds a different icon');
    assert.equal(await at(14 + 0.1), globe, 'the 14 s cycle comes back to the globe');
  } finally { await ctx.close(); }
});

test('each icon lands in its shop colour on the off-white bunny; the globe stays the live logo; the hop is high', async () => {
  const { ctx, page } = await site.open('/', 1440);
  try {
    await toCard(page);
    const at = t => page.evaluate(t => {
      const s = document.querySelector('svg.bw-card'); s.__bw.renderAt(t);
      const tile = s.getBoundingClientRect(), disc = s.querySelector('circle[r="50"]').getBoundingClientRect();
      return { stroke: getComputedStyle(s.querySelector('[data-lines]')).stroke, ground: getComputedStyle(s.querySelector(':scope > rect')).fill,
        bunny: getComputedStyle(s.querySelector('[data-sil]')).fill, top: disc.top, h: tile.height };
    }, t);
    const globe = await at(0.3), auto = await at(7 * 1.4 + 0.3), clinic = await at(3 * 1.4 + 0.3);
    assert.equal(globe.stroke, globe.ground, 'the globe lines are the ground colour, exactly like the live logo cut');
    assert.equal(auto.stroke, 'rgb(255, 192, 0)', 'Bunny Auto icon in its accent');
    assert.notEqual(clinic.stroke, auto.stroke, 'each shop its own colour');
    assert.equal(auto.bunny, 'rgb(244, 241, 232)', 'the bunny stays off-white');
    const rest = await at(0.5), apex = await at(0.84 + 0.28);
    const hop = (rest.top - apex.top) / rest.h;
    assert.ok(hop >= 0.08 && hop <= 0.11, `hop is 8-10% of the tile's height (${(hop * 100).toFixed(1)}%)`);
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

test('reduced motion: a still mark (the live logo globe)', async () => {
  const { ctx, page } = await site.open('/', 1440, { reducedMotion: 'reduce' });
  try {
    await toCard(page);
    const a = await page.evaluate(info, CARD); await page.waitForTimeout(1000); const b = await page.evaluate(info, CARD);
    assert.equal(b.state, 'static'); assert.equal(b.frames, a.frames, 'nothing animates');
    assert.equal(b.lines, 6, 'the globe (six lines) shows');
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
