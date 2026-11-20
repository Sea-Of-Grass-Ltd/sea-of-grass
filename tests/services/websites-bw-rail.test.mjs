// Websites page: the Bunny World ticket row pins and scrolls sideways. Tristan (2026-11-20): "On Dope security, they'd have
// the scroll function make you quickly cause this to scroll from left to right" — "this" being the nine-ticket row.
// On 768 px and up, with motion allowed: when the row's block (heading, line, tickets) reaches the top it holds in place, and
// scrolling down runs the row from ticket 01 to 09 in about 1 to 1.5 screen heights; then the page carries on. Scrolling back
// up runs it back. No jump at either end, no sideways page scroll, nothing after it overlaps, ticket clicks still work, and
// the seed's sprout beside "Bunny World" stays with its word. Phones and reduced motion keep the plain swipeable row.
// Then: "in Dope Security, the background would do something like shift hues as it happens." While the row runs, the section
// crossfades through flat colours pulled from each ticket's photo (01 rust, 02 charcoal, 03 tan ... 09), darkened so the cream
// text and the softer line both pass AA at every stop; when the row lets go it eases back to the page's purple.
// Run:  cd tests && npm install && node --test services/websites-bw-rail.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const read = page => page.evaluate(() => {
  const row = document.querySelector('#bunny-world .tickets'), h = document.querySelector('#h-bw').getBoundingClientRect();
  const t = [...row.querySelectorAll('.ticket')].map(e => e.getBoundingClientRect());
  const word = document.querySelector('.bw-word').getBoundingClientRect(), sp = document.querySelector('[data-sprout]');
  const parts = sp ? [...sp.querySelectorAll('path')].map(e => e.getBoundingClientRect()).filter(q => q.height > .5) : [];
  const after = document.querySelector('#bunny-world .pin').getBoundingClientRect();
  return { y: scrollY, sl: row.scrollLeft, max: row.scrollWidth - row.clientWidth, hTop: h.top, rowBottom: row.getBoundingClientRect().bottom,
    first: t[0], last: t[t.length - 1], vw: innerWidth, vh: innerHeight, pageW: document.documentElement.scrollWidth, afterTop: after.top,
    word: { right: word.right, bottom: word.bottom }, sprout: parts.length ? { bottom: Math.max(...parts.map(q => q.bottom)), left: Math.min(...parts.map(q => q.left)), h: Math.max(...parts.map(q => q.bottom)) - Math.min(...parts.map(q => q.top)) } : null };
});
const PLUM = [0x33, 0x27, 0x39];
const TONES = ['#4C2619', '#333030', '#382F24', '#28323C', '#422B1A', '#373012', '#432A16', '#472818', '#253241'].map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
const lum = c => c.map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const near = (a, b, d = 6) => a.every((v, i) => Math.abs(v - b[i]) <= d);
const bg = page => page.evaluate(() => { const c = getComputedStyle(document.querySelector('#bunny-world')).backgroundColor.match(/[\d.]+/g).map(Number);
  const n = getComputedStyle(document.querySelector('.ticket'), '::before').backgroundColor.match(/[\d.]+/g).map(Number);
  const row = document.querySelector('.tickets'); return { c: c.slice(0, 3), notch: n.slice(0, 3), sl: row.scrollLeft, max: row.scrollWidth - row.clientWidth }; });
const to = async (page, y, wait = 60) => { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(wait); return read(page); };

for (const w of [768, 1024, 1440]) {
  test(`${w}px · the ticket row pins and runs 01 to 09 sideways, quickly, with no jump`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w);
    try {
      await page.waitForTimeout(400);
      // walk down through the whole section in small steps
      const start = await page.evaluate(() => document.querySelector('#bunny-world').getBoundingClientRect().top + scrollY - innerHeight);
      const end = await page.evaluate(() => document.querySelector('#bunny-world .pin').getBoundingClientRect().top + scrollY);
      const steps = []; for (let y = start; y <= end; y += 20) steps.push(await to(page, y, 20));
      for (const s of steps) assert.ok(s.pageW <= s.vw, `no sideways page scroll (page ${s.pageW} wide at scroll ${s.y})`);
      // continuity: the heading moves at most one step per step (no jump), and the row's position only ever moves forward
      for (let i = 1; i < steps.length; i++) {
        const dy = steps[i].y - steps[i - 1].y, dh = steps[i - 1].hTop - steps[i].hTop;
        assert.ok(dh >= -1 && dh <= dy + 1, `the block does not jump (heading moved ${dh.toFixed(1)}px for ${dy}px of scroll at ${steps[i].y})`);
        assert.ok(steps[i].sl >= steps[i - 1].sl - 1, 'scrolling down only moves the row forward');
      }
      const held = steps.filter(s => s.sl > 1 && s.sl < s.max - 1);
      assert.ok(held.length > 4, 'the row moves sideways as you scroll down');
      const hTops = held.map(s => s.hTop);
      assert.ok(Math.max(...hTops) - Math.min(...hTops) <= 1, 'while the row moves, the block holds still on screen');
      assert.ok(held[0].hTop >= 0 && held[0].rowBottom <= held[0].vh, 'the whole pinned block is on screen');
      const s0 = steps.find(s => s.sl > 1), s1 = [...steps].reverse().find(s => s.sl < s.max - 1);
      const run = s1.y - s0.y, vh = steps[0].vh;
      assert.ok(run >= vh * .95 && run <= vh * 1.55, `the whole row takes about 1 to 1.5 screens of scroll (${(run / vh).toFixed(2)})`);
      const done = steps[steps.length - 1];
      assert.ok(done.sl >= done.max - 1, 'by the end the row has run all the way');
      assert.ok(done.last.right <= done.vw + 1 && done.last.left >= 0, 'ticket 09 ends fully on screen');
      // after the pin lets go, the page carries on and nothing overlaps the row
      const after = steps.filter(s => s.sl >= s.max - 1 && s.y > s1.y);
      assert.ok(after.length >= 2 && after[after.length - 1].hTop < after[0].hTop - 10, 'then the page scrolls on normally');
      for (const s of steps) assert.ok(s.afterTop >= s.rowBottom - 1, `nothing after the row overlaps it (at ${s.y})`);
      // the seed's sprout stays with its word while the block pins
      const mid = held[Math.floor(held.length / 2)];
      for (const s of [held[0], mid]) {
        assert.ok(s.sprout && s.sprout.h >= 12, 'the sprout is up before and during the pin');
        assert.ok(Math.abs(s.sprout.bottom - s.word.bottom) <= 16 && Math.abs(s.sprout.left - s.word.right) <= 24, `the sprout stays beside "Bunny World" (${JSON.stringify([s.sprout, s.word])})`);
      }
      // back up: the row runs back the same way
      const back = await to(page, mid.y, 80);
      assert.ok(Math.abs(back.sl - mid.sl) <= 2, `scrolling back runs the row back (${back.sl.toFixed(0)} vs ${mid.sl.toFixed(0)})`);
      const top = await to(page, start, 80);
      assert.ok(top.sl <= 1, 'above the section the row is back at ticket 01');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · a ticket clicked mid-run still opens its shop, and Tab walks the row`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await page.waitForTimeout(400);
      // scroll until ticket 05 is fully in view while pinned
      const start = await page.evaluate(() => document.querySelector('#bunny-world').getBoundingClientRect().top + scrollY);
      let y = start, ok = false;
      for (; y < start + 4000; y += 40) {
        await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(20);
        ok = await page.evaluate(() => { const r = document.querySelectorAll('.ticket')[4].getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
        if (ok) break;
      }
      assert.ok(ok, 'ticket 05 comes fully into view as you scroll');
      await page.locator('.ticket').nth(4).click(); await page.waitForTimeout(300);
      assert.equal(await page.locator('.ticket').nth(4).getAttribute('aria-pressed'), 'true', 'the click selects it');
      assert.match(await page.locator('[data-stage-kick]').textContent(), /^05/, 'and the stage shows shop 05');
      // keyboard: focusing ticket 09 brings it on screen
      await page.locator('.ticket').nth(8).focus(); await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const r = document.querySelectorAll('.ticket')[8].getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
      assert.ok(r.l >= 0 && r.r <= r.vw + 1 && r.t >= 0 && r.b <= r.vh, `a focused ticket is on screen (${JSON.stringify(r)})`);
    } finally { await ctx.close(); }
  });
}

for (const w of [768, 1440]) {
  test(`${w}px · the background shifts through each shop's colour as the row runs, then eases back to the purple`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await page.waitForTimeout(400);
      const y0 = await page.evaluate(() => { const r = document.querySelector('[data-rail]'); return r.getBoundingClientRect().top + scrollY - parseFloat(r.style.getPropertyValue('--stick-top')); });
      const run = await page.evaluate(() => { const r = document.querySelector('[data-rail]'); return r.offsetHeight - r.querySelector('.bw-stick').offsetHeight; });
      const text = [0xDA, 0xD1, 0xCD], soft = [0x9B, 0x97, 0xB1];
      for (const [i, c] of TONES.entries()) {
        assert.ok(contrast(c, text) >= 4.5 && contrast(c, soft) >= 4.5, `shop ${i + 1}'s colour keeps the text readable (AA)`);
      }
      const seen = [];
      for (let k = 0; k <= 8; k++) {
        const p = Math.min(.985, Math.max(.015, k / 8));
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(y0 + p * run)); await page.waitForTimeout(650);
        const b = await bg(page); seen.push(b.c);
        assert.ok(near(b.c, TONES[k], k === 0 || k === 8 ? 10 : 6), `with ticket ${k + 1} up, the section is its colour (${b.c} vs ${TONES[k]})`);
        assert.ok(near(b.notch, b.c, 2), 'the ticket notches are cut in the same colour');
        assert.ok(contrast(b.c, text) >= 4.5 && contrast(b.c, soft) >= 4.5, `AA at stop ${k + 1}`);
      }
      // between two stops it is a flat mix of the two, not a jump
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(y0 + run * 2.5 / 8)); await page.waitForTimeout(650);
      const mid = (await bg(page)).c, want = TONES[2].map((v, i) => (v + TONES[3][i]) / 2);
      assert.ok(near(mid, want, 4), `between shops 3 and 4 it crossfades (${mid} vs ${want})`);
      // past the pin, and above it: the purple
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(y0 + run + 300)); await page.waitForTimeout(800);
      assert.ok(near((await bg(page)).c, PLUM, 2), 'after the row lets go, back to the purple');
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.round(y0 - 300)); await page.waitForTimeout(800);
      assert.ok(near((await bg(page)).c, PLUM, 2), 'and before it starts, the purple');
    } finally { await ctx.close(); }
  });
}

for (const [w, opts, why] of [[390, {}, 'phones'], [360, {}, 'phones'], [1440, { reducedMotion: 'reduce' }, 'reduced motion']]) {
  test(`${w}px · ${why}: the plain swipeable row, no pin`, async () => {
    const { ctx, page } = await site.open(PAGE, w, opts);
    try {
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => { const row = document.querySelector('#bunny-world .tickets'), c = getComputedStyle(row);
        return { ox: c.overflowX, snap: c.scrollSnapType }; });
      assert.equal(r.ox, 'auto', 'the row swipes');
      assert.match(r.snap, /x/, 'and snaps to tickets');
      const start = await page.evaluate(() => document.querySelector('#bunny-world').getBoundingClientRect().top + scrollY - 200);
      let prev = null, sl0 = null;
      for (let y = start; y < start + 1600; y += 100) {
        const s = await to(page, y, 30);
        if (sl0 === null) sl0 = s.sl;                                  // the snap may rest the first ticket a gutter in
        assert.ok(Math.abs(s.sl - sl0) <= 1, 'scrolling the page does not move the row');
        assert.ok(s.pageW <= s.vw, 'no sideways page scroll');
        if (prev) assert.ok(prev.hTop - s.hTop >= 99, 'the block never holds still: no pin');
        assert.ok(near((await bg(page)).c, PLUM, 2), 'the section stays the purple');
        prev = s;
      }
    } finally { await ctx.close(); }
  });
}
