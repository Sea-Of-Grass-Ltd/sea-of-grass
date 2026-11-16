// Cottontail Farm journey + "one bold idea" tests. Written from cottontail-farm.journey.md before the page was simplified.
// Run:  cd tests && npm install && node --test bunnyworld/cottontail-farm.test.mjs
// SITE_ROOT=/path/to/site serves another checkout (used to show the old page failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/bunnyworld/cottontail-farm/';
const WIDTHS = [360, 390, 1440];
// Colorado times (UTC below): Monday 16 Nov 2026 at noon (off-season), Saturday 8 Aug 2026 at 10 am (sunflowers)
const NOV = '2026-11-16T19:00:00Z', AUG = '2026-08-08T16:00:00Z';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

async function open(w, time) {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  await ctx.route(u => !u.href.startsWith(site.base), r => r.abort());
  if (time) await ctx.clock.setFixedTime(new Date(time));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && (m.location().url || '').startsWith(site.base) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(site.base + PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// What is on the first screen of the shop (the Sea of Grass strip and the closing band are shared chrome)
function firstScreen() {
  const vis = e => { if (e.closest('[hidden],[inert],[aria-hidden="true"],.demo,.want,.sr')) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  const onScreen = e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const shown = sel => [...document.querySelectorAll(sel)].filter(e => vis(e) && onScreen(e));
  const h1 = [...document.querySelectorAll('h1')];
  return {
    season: document.body.dataset.season,
    h1s: h1.length, h1Shown: h1.filter(e => vis(e) && onScreen(e)).map(e => ({ t: text(e), size: parseFloat(getComputedStyle(e).fontSize) })),
    actions: shown('a[href], button').filter(e => !e.closest('nav') && !e.classList.contains('logo')).map(text),
    fields: shown('input, select, textarea, [role=tab], button[aria-pressed]').map(e => e.getAttribute('aria-label') || text(e) || e.tagName),
    headerBtn: [...document.querySelectorAll('header .btn, header button')].filter(vis).map(text),
    extras: [...document.querySelectorAll('.wx, .year, .open-now, [role=tablist]')].filter(vis).map(e => e.className),
  };
}

function actionLabels() {
  const vis = e => { if (e.closest('[hidden],[inert],[aria-hidden="true"],.demo,.want,.sr,nav')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; };
  return [...document.querySelectorAll('a[href], button, summary')].filter(e => vis(e) && !e.hasAttribute('aria-pressed') && !e.closest('[data-tdays],[data-tslots],[data-heads],[data-alist],[data-map]'))
    .map(e => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
}

function layoutFaults() {
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth) out.push(`page is ${document.documentElement.scrollWidth - innerWidth}px wider than the screen`);
  const t = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')].filter(e => { if (e.closest('[hidden],[inert],.sr')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i], b = t[j]; if (a.contains(b) || b.contains(a) || (a.closest('label') && a.closest('label') === b.closest('label'))) continue;
    const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
    const ix = Math.min(r.right, s.right) - Math.max(r.left, s.left), iy = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
    if (ix > 2 && iy > 2) out.push(`"${(a.innerText || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 20)}" overlaps "${(b.innerText || b.getAttribute('aria-label') || b.tagName).trim().slice(0, 20)}"`);
  }
  return out;
}

// Body copy: full sentences (six words or more) and no em-dash asides. Same rule as copy/copy.test.mjs, for this shop.
function shortSentences() {
  const skip = 'nav, button, label, select, option, summary, legend, .q-h, .q-sum, .demo, .want, .sr, [aria-hidden="true"], [hidden], script, style, .kick'; // question titles are form labels, checked by the audit
  const out = [];
  for (const e of document.querySelectorAll('main p, main li, main small, main figcaption, main dd')) {
    if (e.closest(skip) || [...e.children].some(c => /^(P|LI|UL|OL)$/.test(c.tagName))) continue;
    const c = getComputedStyle(e), r = e.getBoundingClientRect(); if (!r.width || c.textTransform === 'uppercase' || /mono/i.test(c.fontFamily)) continue;
    const t = (e.innerText || '').replace(/\s+/g, ' ').trim(); if (!t) continue;
    if (/—|\s–\s/.test(t)) out.push('em-dash: ' + t.slice(0, 80));
    for (const s of t.split(/(?<=[.!?])\s+(?=[A-Z“"$0-9])/)) { if (!/[.!?]["”’)]?$/.test(s)) continue; const n = s.replace(/[“”"()]/g, '').split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length; if (n < 6) out.push(`short: "${s}"`); }
  }
  return out;
}

for (const w of WIDTHS) {
  test(`${w}px · November · opens on the festival, tickets work, off-season is one line away`, async () => {
    const { ctx, page, errors } = await open(w, NOV);
    try {
      // 1 land on the festival
      const f = await page.evaluate(firstScreen);
      assert.equal(f.season, 'fall', `opens on the festival in November (saw "${f.season}")`);
      assert.equal(f.h1s, 1, 'one h1 on the page');
      assert.equal(f.h1Shown.length, 1, 'the h1 is on the first screen');
      assert.match(f.h1Shown[0].t, /lost in the maze yet\?/i, 'festival headline');
      if (w < 900) assert.ok(f.h1Shown[0].size >= 48, `headline is huge on a phone (${f.h1Shown[0].size}px)`);
      assert.ok(f.actions.length >= 1 && f.actions.length <= 2, `one or two actions on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.ok(f.actions.some(t => /^get festival tickets$/i.test(t)), `"Get festival tickets" on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.deepEqual(f.fields, [], 'nothing to operate on the first screen');
      assert.deepEqual(f.headerBtn, [], 'no ticket button in the header repeating the hero');
      assert.deepEqual(f.extras, [], 'no weather bar, season tabs, year timeline or open-now list');
      assert.doesNotMatch(await page.locator('body').innerText(), /closed for the season/i, 'nothing says "Closed for the season"');
      // one sign-up
      const signups = await page.locator('form[data-demo="CTN"], .news').count();
      assert.ok(signups <= 1, `one mailing-list sign-up at most, saw ${signups}`);
      // 3 buy tickets
      await page.locator('a', { hasText: /^Get festival tickets$/i }).first().click();
      const day = page.locator('[data-tdays] button:not(:disabled)').first();
      await day.click();
      const slot = page.locator('[data-tslots] button:not(:disabled)').first();
      await slot.click();
      const before_ = await page.locator('[data-ttotal]').innerText();
      await page.locator('[data-heads] button[aria-label="One more Kids"]').click();
      await page.locator('[data-tslots] button:not(:disabled)').first().click();
      assert.notEqual(await page.locator('[data-ttotal]').innerText(), before_, 'total goes up with another kid');
      await page.locator('[data-tbuy]').click();
      assert.match(await page.locator('[data-tdone]').innerText(), /holding these for 10 minutes/i, 'tickets held');
      // 5 jobs are one line that opens the form
      const jobs = page.locator('#jobs summary');
      assert.equal(await jobs.count(), 1, 'jobs is one line that opens');
      assert.ok(!(await page.locator('#jobs form').isVisible()), 'the job form stays folded until asked');
      await jobs.click();
      assert.ok(await page.locator('#jobs form').isVisible(), 'the job form opens');
      // rules
      const labels = await page.evaluate(actionLabels);
      const dups = labels.filter((t, i) => labels.indexOf(t) !== i);
      assert.deepEqual([...new Set(dups)], [], 'no action label repeats on the page');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps or sideways scroll');
      assert.deepEqual(await page.evaluate(shortSentences), [], 'copy is full sentences');
      // 4 off-season, from one quiet line lower down
      const off = page.locator('[data-show-season="off"]');
      assert.equal(await off.count(), 1, 'one control to see the off-season');
      const offTop = await off.evaluate(e => e.getBoundingClientRect().top + scrollY);
      assert.ok(offTop > (w < 900 ? 844 : 900), 'the season control sits below the first screen');
      await off.click();
      assert.equal(await page.evaluate(() => document.body.dataset.season), 'off', 'page shows the off-season');
      assert.match((await page.locator('h1').innerText()).replace(/\s+/g, ' '), /see you in august/i, 'off-season headline');
      assert.ok(await page.locator('[data-tix-off]').isVisible(), 'the mailing-list sign-up takes the place of tickets');
      assert.ok(!(await page.locator('#jobs').isVisible()), 'no jobs off-season');
      assert.deepEqual(await page.evaluate(shortSentences), [], 'off-season copy is full sentences');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · August Saturday · the sunflowers lead`, async () => {
    const { ctx, page, errors } = await open(w, AUG);
    try {
      const f = await page.evaluate(firstScreen);
      assert.equal(f.season, 'summer', 'opens on the sunflowers in August');
      assert.match(f.h1Shown[0]?.t || '', /sunflowers/i, 'sunflower headline');
      assert.ok(f.actions.some(t => /^get sunflower tickets$/i.test(t)), `"Get sunflower tickets" on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.deepEqual(f.fields, [], 'nothing to operate on the first screen');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps or sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}
