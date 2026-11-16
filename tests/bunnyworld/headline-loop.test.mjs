// Bunny World landing headline, Refero's rhythm (Tristan, 2026-11-16: "it happens too fast, on Refero it's like every 5–6 seconds").
// The headline loops "Hop in." ⇄ "Find your style." while the hero is on screen: each line holds 5–6s in flat ink, each change
// is a 1.2–1.6s letter-by-letter sweep through the five looks' accents. It pauses off screen or in a hidden tab and restarts
// cleanly (a full hold before the next change). Reduced motion: no loop, "Find your style." still.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = '/bunnyworld/', FROM = 'Hop in.', TO = 'Find your style.';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// what is painted in the h1 (the .sr line and hidden or faded letters don't count)
const read = () => {
  const h = document.querySelector('.hero h1');
  const painted = e => { if (e.closest('.sr')) return false; const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none') return false; let o = 1; for (let x = e; x && x !== h.parentElement; x = x.parentElement) o *= +getComputedStyle(x).opacity; return o >= 0.5; };
  const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let s = '', n;
  while ((n = w.nextNode())) { if (n.nodeType === 1) { if (n.tagName === 'BR' && painted(n.parentElement)) s += ' '; continue; } if (painted(n.parentElement)) s += n.textContent; }
  const r = h.getBoundingClientRect(), l = document.querySelector('.hero .lede').getBoundingClientRect();
  return { text: s.replace(/\s+/g, ' ').trim(), box: [r.x, r.y + scrollY, r.width, r.height, l.y + scrollY].map(v => Math.round(v)).join(','), anims: h.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length, t: performance.now() };
};
// flat: no gradient or clipped text anywhere in the h1, every painted glyph in the look's ink, nothing animating
const flat = () => {
  const h = document.querySelector('.hero h1'), ink = getComputedStyle(h).color, bad = [];
  for (const e of [h, ...h.querySelectorAll('*')]) {
    const c = getComputedStyle(e);
    if (/gradient\(/.test(c.backgroundImage)) bad.push(`${e.className || e.tagName}: gradient`);
    if (/text/.test(c.backgroundClip + c.webkitBackgroundClip)) bad.push(`${e.className || e.tagName}: background-clip text`);
    if (e.closest('.sr') || c.visibility === 'hidden') continue;
    if (e.childElementCount === 0 && e.textContent.trim() && c.color !== ink) bad.push(`"${e.textContent}" is ${c.color}, ink is ${ink}`);
    if (+c.opacity !== 1) bad.push(`${e.className || e.tagName}: opacity ${c.opacity}`);
  }
  if (h.getAnimations({ subtree: true }).length) bad.push('still animating');
  return bad;
};
// a sweep lasts as long as any letter is animating (the words read early, the colour wave runs on)
const state = s => s.anims > 0 ? 'mid' : s.text === FROM ? 'from' : s.text === TO ? 'to' : 'mid';
// runs of the same state: [{state, start, end}]
const runs = samples => samples.reduce((rs, s) => { const k = state(s); const last = rs[rs.length - 1]; if (last && last.state === k) last.end = s.t; else rs.push({ state: k, start: s.t, end: s.t, text: s.text }); return rs; }, []);

for (const w of [390, 1440]) test(`loops ${FROM} ⇄ ${TO}: each line holds ≥5s flat, each sweep 1–2s, nothing moves @ ${w}`, async () => {
  const { ctx, page, errors } = await site.open(URL, w);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const samples = [], flatChecks = {};
    const t0 = Date.now();
    while (Date.now() - t0 < 17000) {
      const s = await page.evaluate(read); samples.push(s);
      const k = state(s);
      // check flatness once in each settled line, a moment after it settles
      if (k !== 'mid' && !flatChecks[k]) { const prev = samples[samples.length - 4]; if (prev && state(prev) === k) flatChecks[k] = await page.evaluate(flat); }
      await page.waitForTimeout(80);
    }
    const rs = runs(samples);
    const seq = rs.map(r => `${r.state} ${Math.round(r.end - r.start)}ms`).join(' → ');
    // it opens on "Hop in." and changes at least three times in 17s (opening, then back, then again)
    assert.equal(rs[0].state, 'from', `opens on "${FROM}": ${seq}`);
    const settled = rs.filter(r => r.state !== 'mid');
    assert.ok(settled.length >= 3, `alternates: ${seq}`);
    for (let i = 1; i < settled.length; i++) assert.notEqual(settled[i].state, settled[i - 1].state, `each change swaps the line: ${seq}`);
    // every hold that has a change on both sides lasts 5–6.5s
    const inner = rs.slice(1, -1).filter(r => r.state !== 'mid');
    assert.ok(inner.length >= 2, `at least two full holds: ${seq}`);
    for (const r of inner) { const d = r.end - r.start; assert.ok(d >= 5000 && d <= 6500, `a hold of ${Math.round(d)}ms (want 5–6.5s): ${seq}`); }
    // every sweep takes about 1.2–1.6s (sampling slack either side)
    for (const r of rs.filter(r => r.state === 'mid')) { const d = r.end - r.start; assert.ok(d >= 900 && d <= 2000, `a sweep of ${Math.round(d)}ms (want ~1.2–1.6s): ${seq}`); }
    // flat in both settled lines
    assert.deepEqual(flatChecks, { from: [], to: [] }, 'flat solid ink while each line holds');
    // the headline box and the line under it never move
    assert.deepEqual([...new Set(samples.map(s => s.box))].length, 1, `box moved: ${[...new Set(samples.map(s => s.box))].join(' | ')}`);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

// wait until the line is settled on a given text, then return
const settleOn = async (page, text, ms = 12000) => { await page.waitForFunction(([r, t]) => { const s = (0, eval)(`(${r})`)(); return s.text === t && s.anims === 0; }, [read.toString(), text], { timeout: ms, polling: 100 }); };

for (const how of ['scrolled off screen', 'in a hidden tab']) test(`pauses when ${how}, then restarts cleanly with a full hold`, async () => {
  const { ctx, page } = await site.open(URL, 1440);
  try {
    await settleOn(page, TO);
    await page.waitForTimeout(500);
    // record anything that happens to the headline while it should be paused
    await page.evaluate(() => { window.__hl = 0; const h = document.querySelector('.hero h1'); new MutationObserver(() => window.__hl++).observe(h, { subtree: true, attributes: true, childList: true }); window.__hlAnims = 0; window.__hlTick = setInterval(() => { window.__hlAnims += h.getAnimations({ subtree: true }).length; }, 100); });
    if (how === 'scrolled off screen') await page.evaluate(() => scrollTo(0, document.querySelector('#shops').offsetTop + 200));
    else await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(9000); // longer than a hold plus a sweep
    const paused = await page.evaluate(() => ({ changes: window.__hl, anims: window.__hlAnims }));
    assert.deepEqual(paused, { changes: 0, anims: 0 }, 'nothing changes or animates while paused');
    // come back: it is still the settled line, and the next change waits a full hold
    if (how === 'scrolled off screen') await page.evaluate(() => scrollTo(0, 0));
    else await page.evaluate(() => { delete document.visibilityState; delete document.hidden; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    const back = Date.now();
    assert.equal((await page.evaluate(read)).text, TO, 'back on screen it shows the same settled line');
    await page.waitForFunction(r => (0, eval)(`(${r})`)().text !== 'Find your style.', read.toString(), { timeout: 9000, polling: 50 });
    const waited = Date.now() - back;
    assert.ok(waited >= 5000 && waited <= 7000, `the loop resumes after a full hold (waited ${waited}ms)`);
    await settleOn(page, FROM, 4000);
    assert.deepEqual(await page.evaluate(flat), []);
  } finally { await ctx.close(); }
});

test('reduced motion: no loop, "Find your style." still the whole time', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    await page.evaluate(() => { window.__hl = 0; new MutationObserver(() => window.__hl++).observe(document.querySelector('.hero h1'), { subtree: true, attributes: true, childList: true }); });
    const texts = new Set(); let anims = 0; const t0 = Date.now();
    while (Date.now() - t0 < 9000) { const s = await page.evaluate(read); texts.add(s.text); anims += s.anims; await page.waitForTimeout(250); }
    assert.deepEqual([...texts], [TO]);
    assert.equal(anims, 0);
    assert.equal(await page.evaluate(() => window.__hl), 0, 'the headline is never touched');
    assert.deepEqual(await page.evaluate(flat), []);
  } finally { await ctx.close(); }
});
