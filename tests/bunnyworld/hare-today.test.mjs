// Hare Today journey + "one bold idea" tests. Written from hare-today.journey.md before the page was simplified.
// Run:  cd tests && npm install && node --test bunnyworld/hare-today.test.mjs
// SITE_ROOT=/path/to/site serves another checkout (used to show the old page failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/bunnyworld/hare-today/';
const WIDTHS = [360, 390, 1440];
// Colorado times (UTC below): Saturday 21 Nov 2026 at 11:00 am, and Sunday 15 Nov 2026 at 10:00 pm
const SAT_DAY = '2026-11-21T18:00:00Z', SUN_NIGHT = '2026-11-16T05:00:00Z';

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
  const actions = shown('main a[href], main button, header button, header .btn, body > div:not(.demo) a[href]:not(.logo), body > div:not(.demo) button').filter(e => !e.closest('nav'));
  const h1 = [...document.querySelectorAll('h1')];
  const words = document.body.innerText;
  return {
    h1s: h1.length, h1Shown: h1.filter(e => vis(e) && onScreen(e)).map(e => ({ t: text(e), size: parseFloat(getComputedStyle(e).fontSize) })),
    actions: actions.map(text),
    fields: shown('main input, main select, main textarea, [role=tab], button[aria-pressed]').map(e => e.getAttribute('aria-label') || text(e) || e.tagName),
    closed: shown('body *').filter(e => e.children.length === 0 && /\bclosed\b/i.test(text(e))).length,
    status: (document.querySelector('[data-status]')?.innerText || '').trim(),
    headerBook: [...document.querySelectorAll('header button, header .btn')].filter(vis).map(text),
    bars: [...document.querySelectorAll('.ann, .quick, [data-drawer]')].length,
  };
}

// Every visible action on the page, for duplicate labels (choices in a picker are not actions)
function actionLabels() {
  const vis = e => { if (e.closest('[hidden],[inert],[aria-hidden="true"],.demo,.want,.sr,nav')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; };
  return [...document.querySelectorAll('a[href], button')].filter(e => vis(e) && !e.hasAttribute('aria-pressed') && !e.closest('[data-days],[data-slots-own]'))
    .map(e => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
}

// Tap targets that overlap, and sideways scroll
function layoutFaults() {
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth) out.push(`page is ${document.documentElement.scrollWidth - innerWidth}px wider than the screen`);
  const t = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(e => { if (e.closest('[hidden],[inert],.sr')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i], b = t[j]; if (a.contains(b) || b.contains(a)) continue;
    const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
    const ix = Math.min(r.right, s.right) - Math.max(r.left, s.left), iy = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
    if (ix > 2 && iy > 2) out.push(`"${(a.innerText || a.tagName).trim().slice(0, 20)}" overlaps "${(b.innerText || b.tagName).trim().slice(0, 20)}"`);
  }
  return out;
}

// Body copy: full sentences (six words or more) and no em-dash asides. Same rule as copy/copy.test.mjs, for this shop.
function shortSentences() {
  const skip = 'nav, button, label, select, option, .demo, .want, .sr, [aria-hidden="true"], [hidden], script, style, .kick, .note.demo-note';
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
  test(`${w}px · Saturday morning · one idea on the first screen, then book with Dee on a Sunday`, async () => {
    const { ctx, page, errors } = await open(w, SAT_DAY);
    try {
      // 1 land: one idea
      const f = await page.evaluate(firstScreen);
      assert.equal(f.h1s, 1, 'one h1 on the page');
      assert.equal(f.h1Shown.length, 1, 'the h1 is on the first screen');
      if (w < 900) assert.ok(f.h1Shown[0].size >= 48, `headline is huge on a phone (${f.h1Shown[0].size}px)`);
      assert.ok(f.actions.length >= 1 && f.actions.length <= 2, `one or two actions on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.ok(f.actions.some(t => /^book a chair$/i.test(t)), `"Book a chair" on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.deepEqual(f.fields, [], 'nothing to operate on the first screen');
      assert.deepEqual(f.headerBook, [], 'no Book button in the header');
      assert.equal(f.bars, 0, 'no announcement bar, quick bar or booking drawer');
      assert.match(f.status, /open/i, `status line says the shop is open: "${f.status}"`);
      // 3 meet the barbers: faces, names, live status
      const barbers = page.locator('[data-barber]');
      assert.equal(await barbers.count(), 4, 'four barbers');
      for (let i = 0; i < 4; i++) {
        const b = barbers.nth(i);
        // a face photo, or (until the portraits are shot) a deliberate slot naming the photo file it waits for; never a broken image
        assert.equal(await b.locator('.face').count(), 1, `barber ${i + 1} has a face slot`);
        const face = await b.locator('.face').evaluate(f => ({ img: f.tagName === 'IMG', loaded: f.tagName === 'IMG' && f.complete && f.naturalWidth > 0, photo: f.dataset.photo || '' }));
        assert.ok(face.img ? face.loaded : /\.(webp|jpg)$/.test(face.photo), `barber ${i + 1}: the face photo loads, or the slot names the photo it waits for`);
        const broken = await b.locator('img').evaluateAll(xs => xs.filter(x => !(x.complete && x.naturalWidth > 0)).length);
        assert.equal(broken, 0, `barber ${i + 1} has no broken images`);
        assert.doesNotMatch(await b.innerText(), /\bclosed\b/i, `barber ${i + 1} is not shown as Closed`);
      }
      // 4 book with Dee
      await page.locator('[data-barber="dee"] button', { hasText: 'Book with Dee' }).click();
      assert.match(await page.locator('#book h2').innerText(), /book with dee/i, 'booking reads "Book with Dee"');
      // 5 a service, then a Sunday
      await page.locator('.svc', { hasText: 'Scissor' }).or(page.locator('.svc').first()).first().click();
      const sunday = page.locator('[data-days] button[aria-label^="Sunday"]').first();
      assert.ok(await sunday.count(), 'a Sunday is in the day strip');
      assert.ok(await sunday.isEnabled(), 'Sunday can be booked (the shop opens 9 to 3 on Sundays)');
      await sunday.click();
      const slot = page.locator('[data-slots-own] button:not(:disabled)').first();
      assert.ok(await slot.count(), 'the Sunday has free times');
      await slot.click();
      // 6 book once
      await page.locator('#cf-n').fill('Sam Rivera');
      await page.locator('#cf-p').fill('9705550123');
      await page.locator('[data-confirm]').click();
      assert.match(await page.locator('[data-cf-done]').innerText(), /thanks, sam, you’re all booked in/i, 'confirmation shows');
      assert.match(await page.locator('[data-cf-done]').innerText(), /dee/i, 'confirmation names Dee');
      // rules
      const labels = await page.evaluate(actionLabels);
      const dups = labels.filter((t, i) => labels.indexOf(t) !== i);
      assert.deepEqual([...new Set(dups)], [], 'no action label repeats on the page');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps or sideways scroll');
      assert.deepEqual(await page.evaluate(shortSentences), [], 'copy is full sentences');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · Sunday night · no wall of CLOSED, the first chairs tomorrow instead`, async () => {
    const { ctx, page, errors } = await open(w, SUN_NIGHT);
    try {
      const f = await page.evaluate(firstScreen);
      assert.ok(f.closed <= 1, `"Closed" at most once on the first screen, saw ${f.closed}`);
      assert.match(f.status, /tuesday/i, `status line names the next open day (Monday is closed): "${f.status}"`);
      assert.match(f.status, /\d(:\d\d)?\s?am/i, `status line gives a first time: "${f.status}"`);
      assert.deepEqual(f.fields, [], 'nothing to operate on the first screen');
      const rows = await page.locator('[data-barber]').allInnerTexts();
      assert.equal(rows.length, 4, 'four barbers');
      for (const r of rows) assert.doesNotMatch(r, /\bclosed\b/i, `barber row not shown as Closed: "${r.replace(/\s+/g, ' ')}"`);
      assert.ok(rows.filter(r => /\d(:\d\d)?\s?(am|pm)/i.test(r)).length >= 2, 'barbers working next show their first open time');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps or sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}
