// Websites page: the Bunny World ticket row pins and scrolls sideways. Tristan (2026-11-20): "On Dope security, they'd have
// the scroll function make you quickly cause this to scroll from left to right" — "this" being the nine-ticket row.
// On 768 px and up, with motion allowed: when the row's block (heading, line, tickets) reaches the top it holds in place, and
// scrolling down runs the row from ticket 01 to 09 in about 1 to 1.5 screen heights; then the page carries on. Scrolling back
// up runs it back. No jump at either end, no sideways page scroll, nothing after it overlaps, ticket clicks still work, and
// the seed's sprout beside "Bunny World" stays with its word. Phones and reduced motion keep the plain swipeable row.
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
      let prev = null;
      for (let y = start; y < start + 1600; y += 100) {
        const s = await to(page, y, 30);
        assert.ok(s.sl <= 1, 'scrolling the page does not move the row');
        assert.ok(s.pageW <= s.vw, 'no sideways page scroll');
        if (prev) assert.ok(prev.hTop - s.hTop >= 99, 'the block never holds still: no pin');
        prev = s;
      }
    } finally { await ctx.close(); }
  });
}
