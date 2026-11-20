// Websites page: the split-flap board plays when the visitor actually sees it (Tristan, 2026-11-20: "it's the fact that they
// animate before you get to them, it just doesn't land"). Each row (HOSTING / CHANGES / ORDERS / HOURS) scrambles only once it
// is well inside the screen (its middle above about 70% of the screen height), the rows go one after another, and each row
// takes long enough to read as a flap board flipping, not a flicker. Phone and desktop alike. Reduced motion: the final words,
// no scramble.  Measured by scrolling the real page.  Run:  cd tests && npm install && node --test services/websites-flap.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WORDS = ['HOSTING', 'CHANGES', 'ORDERS', 'HOURS'];
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// a frame-by-frame log of each row, kept by the page itself from the first frame
const WATCH = () => {
  const log = window.__flapLog = [];
  const tick = () => {
    const rows = [...document.querySelectorAll('.flapboard .flap')];
    rows.forEach((f, k) => {
      const L = log[k] || (log[k] = { start: null, end: null, startMid: null, startTop: null, startBottom: null, chars: new Set(), sawHidden: false });
      const final = f.getAttribute('aria-label').toUpperCase(), letters = [...f.querySelectorAll('.flap-w i')];
      const shown = letters.map(i => i.textContent).join('');
      const moving = letters.some(i => i.getAnimations().some(a => a.playState === 'running'));
      const hidden = letters.some(i => getComputedStyle(i).visibility === 'hidden' || +getComputedStyle(i).opacity < .05);
      if (hidden && L.start === null) L.sawHidden = true;
      const busy = moving || shown !== final;
      letters.forEach((i, n) => { if (i.textContent !== final[n]) L.chars.add(i.textContent); });
      if (busy && L.start === null) { const r = f.getBoundingClientRect(); L.start = performance.now(); L.startMid = (r.top + r.height / 2) / innerHeight; L.startTop = r.top; L.startBottom = r.bottom - innerHeight; }
      if (!busy && L.start !== null && L.end === null && !hidden) L.end = performance.now();
      if (busy) L.end = null;
    });
    requestAnimationFrame(tick);
  };
  addEventListener('DOMContentLoaded', () => requestAnimationFrame(tick));
};
const readLog = page => page.evaluate(() => window.__flapLog.map(L => ({ ...L, chars: [...L.chars] })));
// scroll down like a reader: small steps, a beat apart, from the top until the board's last row is high on the screen
const scrollThrough = async page => {
  for (let i = 0; i < 400; i++) {
    const done = await page.evaluate(() => { const r = document.querySelectorAll('.flapboard .flap')[3].getBoundingClientRect(); if (r.bottom < innerHeight * .4) return true; scrollBy(0, Math.max(24, innerHeight * .04)); return false; });
    if (done) break; await page.waitForTimeout(60);
  }
  await page.waitForTimeout(3500);
};

for (const w of [390, 1440]) {
  test(`${w}px · each flap row scrambles once it is well on screen, one after another, slow enough to read`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { initScript: WATCH });
    try {
      await page.waitForTimeout(1500);
      let log = await readLog(page);
      log.forEach((L, k) => assert.equal(L.start, null, `${WORDS[k]}: nothing plays before the visitor scrolls to the board`));
      await scrollThrough(page);
      log = await readLog(page);
      const bad = [];
      log.forEach((L, k) => {
        const n = WORDS[k];
        if (L.start === null) { bad.push(`${n}: never played`); return; }
        if (L.startMid > .72) bad.push(`${n}: started with its middle at ${(L.startMid * 100).toFixed(0)}% of the screen height (should be above about 70%)`);
        if (L.startTop < 0 || L.startBottom > 0) bad.push(`${n}: started while not fully on screen`);
        if (L.chars.length < 3) bad.push(`${n}: flips through other letters before landing (saw ${L.chars.length}: ${L.chars.join('')})`);
        if (L.end === null) bad.push(`${n}: never settled on its word`);
        else { const d = L.end - L.start; if (d < 700 || d > 3000) bad.push(`${n}: takes ${Math.round(d)} ms; it should read as a board flipping (0.7-3 s), not a flicker`); }
      });
      for (let k = 1; k < log.length; k++) if (log[k].start !== null && log[k - 1].start !== null && log[k].start - log[k - 1].start < 150)
        bad.push(`${WORDS[k]}: starts ${Math.round(log[k].start - log[k - 1].start)} ms after ${WORDS[k - 1]}; rows go one after another`);
      assert.deepEqual(bad, [], 'the board plays as it is seen');
      assert.deepEqual(await page.locator('.flapboard .flap-w').evaluateAll(es => es.map(e => e.textContent)), WORDS, 'every row lands on its word');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · reduced motion: the board shows its words, no scramble`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce', initScript: WATCH });
    try {
      await scrollThrough(page);
      const log = await readLog(page);
      log.forEach((L, k) => { assert.equal(L.start, null, `${WORDS[k]}: no animation and no other letters`); assert.equal(L.sawHidden, false, `${WORDS[k]}: the word is visible all along`); });
      assert.deepEqual(await page.locator('.flapboard .flap-w').evaluateAll(es => es.map(e => e.textContent)), WORDS);
    } finally { await ctx.close(); }
  });
}
