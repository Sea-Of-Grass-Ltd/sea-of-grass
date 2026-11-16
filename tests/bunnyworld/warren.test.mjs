// Warren Bakehouse: one warm idea, then the bread. Written before the rebuild (critic REVIEW.md B3, C2, E, G).
// Run:  cd tests && npm install && node --test bunnyworld/warren.test.mjs
// SITE_ROOT=/path/to/site serves another checkout (used to show the old page failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/bunnyworld/warren-bakehouse/';
const WIDTHS = [360, 390, 1440];
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const open = w => site.open(PAGE, w, { reducedMotion: 'reduce' });
// the next question opens a beat after the answer
const ready = (page, sel) => page.waitForFunction(s => { const e = document.querySelector(s); return e && !e.closest('[inert]'); }, sel);

for (const w of WIDTHS) {
  test(`${w}px · first screen is one idea: the headline and the countdown, one photo, one button, nothing to operate`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      const s = await page.evaluate(() => {
        const H = innerHeight, inView = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.top < H && r.bottom > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        const main = document.querySelector('main');
        const h1s = [...document.querySelectorAll('h1')];
        const h1 = h1s[0];
        const acts = [...main.querySelectorAll('a[href], button')].filter(inView);
        const ctrls = [...main.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(inView);
        const imgs = [...main.querySelectorAll('img')].filter(inView);
        return { h1s: h1s.length, h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, h1Top: h1 ? h1.getBoundingClientRect().top : 9999, h1Text: h1 ? h1.innerText : '',
          acts: acts.map(a => a.innerText.trim()), ctrls: ctrls.length, imgs: imgs.length };
      });
      assert.equal(s.h1s, 1, 'one h1');
      assert.ok(s.h1Size >= (w < 900 ? 40 : 64), `headline is big (${s.h1Size}px)`);
      assert.ok(s.h1Top < 400, `headline starts high on the first screen (top ${Math.round(s.h1Top)}px)`);
      assert.ok(!/\d/.test(s.h1Text.replace(/6:30/g, '')), `headline is words, not a countdown: "${s.h1Text}"`);
      assert.ok(s.acts.length <= 1, `at most one button in the first screen of the shop, got ${JSON.stringify(s.acts)}`);
      assert.equal(s.ctrls, 0, 'no form fields in the first screen');
      assert.ok(s.imgs <= 1, `one photo in the first screen, got ${s.imgs}`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w}px · the competing features are gone (the countdown came back on Tristan's word, 2026-11-16)`, async () => {
    const { ctx, page } = await open(w);
    try {
      const s = await page.evaluate(() => ({
        fast: !!document.querySelector('[data-fast]') || /60\s*×/.test(document.body.innerText),
        dots: document.querySelectorAll('.pips, .pips i').length,
        stamps: document.querySelectorAll('.stampd, .lbl').length,
        ann: !!document.querySelector('.ann'),
        lists: [...document.querySelectorAll('main ul, main ol')].filter(l => l.querySelector(':scope > li [data-add]')).length,
        coffeeSection: !!document.querySelector('#coffee'),
        sticker: !!document.querySelector('.tagline'),
        live: /update live|live as people/i.test(document.body.innerText),
      }));
      assert.equal(s.fast, false, 'no "watch a morning at 60×" simulator');
      assert.equal(s.dots, 0, 'no loaf dot rows');
      assert.equal(s.stamps, 0, 'no wrapper labels or sold-out stamps');
      assert.equal(s.ann, false, 'no announcement bar above the header');
      assert.equal(s.lists, 1, `one list of bread and pastries, got ${s.lists}`);
      assert.equal(s.coffeeSection, false, 'coffee is a line, not a section');
      assert.equal(s.sticker, false, 'no sticker on the photo');
      assert.equal(s.live, false, 'no fake live counts');
    } finally { await ctx.close(); }
  });

  test(`${w}px · copy: the baker has a name, jokes are few, questions are questions`, async () => {
    const { ctx, page } = await open(w);
    try {
      const s = await page.evaluate(() => ({
        anon: /named by the baker/i.test(document.body.innerText),
        baker: /\bHazel\b/.test(document.querySelector('main').innerText),
        jokes: document.querySelectorAll('[data-joke]').length,
        items: document.querySelectorAll('main li [data-add]').length,
        faq: [...document.querySelectorAll('summary')].map(x => x.innerText.trim()),
      }));
      assert.equal(s.anon, false, 'no anonymous "named by the baker"');
      assert.ok(s.baker, 'the baker is named');
      assert.ok(s.items >= 8, `the case still has its bread and pastries (${s.items})`);
      assert.ok(s.jokes >= 1 && s.jokes <= 3, `one to three jokes, marked data-joke (${s.jokes})`);
      for (const q of s.faq) assert.ok(q.endsWith('?') && q.split(' ').length >= 3, `FAQ title is a full question: "${q}"`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · journey: hold a loaf, pick up, done; then order a cake with your words on it`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      await page.locator('main a[href="#bread"]').first().click();
      const add = page.locator('main li [data-add]').first();
      await add.scrollIntoViewIfNeeded(); await add.click();
      assert.equal((await page.locator('[data-cart] [data-count]').first().innerText()).trim(), '1', 'hold count goes to 1');
      const hold = page.locator('form[data-demo="WB"]');
      await hold.locator('.q-opt').first().click();
      await ready(page, 'form[data-demo="WB"] input[name=name]');
      await hold.locator('input[name=name]').fill('June');
      await hold.locator('input[name=tel]').fill('970 555 0142');
      await hold.locator('[type=submit]').click();
      await page.waitForTimeout(200);
      assert.match(await hold.locator('.done').innerText(), /Held/, 'hold confirmed');

      const cake = page.locator('form[data-demo="WBC"]');
      await cake.scrollIntoViewIfNeeded();
      await cake.locator('[data-q="How big?"] .q-opt').nth(1).click();
      await cake.locator('[data-q="Which flavor?"] .q-opt').first().click();
      await cake.locator('input[data-bind=msg]').fill('Happy birthday, June');
      assert.equal((await page.locator('[data-show=msg]').innerText()).trim(), 'Happy birthday, June', 'your words appear on the cake');
      await cake.locator('[data-q="Anything extra?"] .q-next').click();
      await cake.locator('.q-day').first().click();
      await ready(page, 'form[data-demo="WBC"] input[type=tel]');
      await cake.locator('input[autocomplete=name]').fill('June');
      await cake.locator('input[type=tel]').fill('970 555 0142');
      await cake.locator('[type=submit]').click();
      await page.waitForTimeout(200);
      const done = await cake.locator('.done').innerText();
      assert.match(done, /Cake ordered/);
      assert.match(done, /Phone: 970 555 0142/, 'the cake order asks for a phone number');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w}px · layout: no sideways scroll, nothing on the first screen overlaps`, async () => {
    const { ctx, page } = await open(w);
    try {
      const s = await page.evaluate(() => {
        const over = document.documentElement.scrollWidth - innerWidth;
        const hero = document.querySelector('main > section');
        const parts = [...hero.querySelectorAll('h1, p, a, button, img')].filter(e => e.getBoundingClientRect().width > 1);
        const hits = [];
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j]; if (a.contains(b) || b.contains(a)) continue;
          const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
          const ix = Math.min(r.right, q.right) - Math.max(r.left, q.left), iy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
          if (ix > 2 && iy > 2) hits.push(`${a.tagName}.${a.className} × ${b.tagName}.${b.className}`);
        }
        return { over, hits };
      });
      assert.ok(s.over <= 0, `${s.over}px sideways scroll`);
      assert.deepEqual(s.hits, [], 'hero parts overlap');
    } finally { await ctx.close(); }
  });
}

// Tristan, 2026-11-16: "he misses the countdown to the next bake". It comes back as the hero's hook, numerals in a face
// built for figures (lining, tabular), the honest next bake when closed, no layout shift, reduced motion respected.
const parseClock = t => { const m = t.replace(/\s+/g, ' ').match(/(\d+)\s*h\s*(\d+)\s*m(?:\s*(\d+)\s*s)?/); return m ? { h: +m[1], m: +m[2], s: m[3] === undefined ? null : +m[3] } : null; };
async function openAt(time, w = 390, reducedMotion = 'no-preference') {
  const mobile = w < 900;
  const ctx = await site.browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion, timezoneId: 'America/Denver' });
  await ctx.route(u => !u.href.startsWith(site.base), r => r.abort());
  if (time) await ctx.clock.install({ time: new Date(time) });
  const page = await ctx.newPage();
  await page.goto(site.base + PAGE, { waitUntil: 'load' }); await page.waitForTimeout(300);
  return { ctx, page };
}
for (const w of WIDTHS) {
  test(`${w}px · the countdown is the hook: big, in the hero, lining tabular figures in its own face`, async () => {
    const { ctx, page } = await openAt(null, w);
    try {
      const r = await page.evaluate(() => { const c = document.querySelector('.hero [data-countdown]'), h1 = document.querySelector('h1'); if (!c) return null;
        const cs = getComputedStyle(c), b = c.getBoundingClientRect();
        const img = document.querySelector('.hero img').getBoundingClientRect(), u = [...c.children].map(x => x.getBoundingClientRect()), right = Math.max(...u.map(x => x.right));
        return { over: c.scrollWidth - c.clientWidth, right, imgLeft: img.left, imgTop: img.top, imgBottom: img.bottom, cTop: b.top, size: parseFloat(cs.fontSize), num: cs.fontVariantNumeric, feat: cs.fontFeatureSettings, fam: cs.fontFamily, h1fam: getComputedStyle(h1).fontFamily, top: b.top, bottom: b.bottom, h: innerHeight, role: c.getAttribute('role'), text: c.textContent }; });
      assert.ok(r, 'a countdown in the hero');
      assert.ok(r.size >= (w < 900 ? 60 : 110), `the countdown is the biggest thing (${r.size}px)`);
      assert.ok(r.over <= 1, `the digits fit their box (${r.over}px over)`);
      if (r.imgTop < r.bottom && r.imgBottom > r.cTop) assert.ok(r.right <= r.imgLeft, `the digits stop before the photo (${Math.round(r.right)} vs ${Math.round(r.imgLeft)})`);
      assert.match(r.num, /tabular-nums/, 'tabular figures'); assert.match(r.num, /lining-nums/, 'lining figures');
      assert.notEqual(r.fam, r.h1fam, 'numerals use their own face, the serif stays for words');
      assert.ok(r.bottom <= r.h, `the countdown is on the first screen (bottom ${Math.round(r.bottom)} of ${r.h})`);
      assert.equal(r.role, 'timer');
      assert.ok(parseClock(r.text), `reads as hours, minutes, seconds: "${r.text}"`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · it ticks without moving anything`, async () => {
    const { ctx, page } = await openAt(null, w);
    try {
      await page.evaluate(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false }); });
      const snap = () => page.evaluate(() => { const c = document.querySelector('[data-countdown]'), r = c.getBoundingClientRect(), hero = document.querySelector('.hero').getBoundingClientRect(), btn = document.querySelector('.hero .btn').getBoundingClientRect();
        return { t: c.textContent, w: r.width, x: r.left, hh: hero.height, by: btn.top, digits: [...c.querySelectorAll('[data-d]')].map(d => d.getBoundingClientRect().width) }; });
      const seen = [await snap()];
      for (let i = 0; i < 4; i++) { await page.waitForTimeout(700); seen.push(await snap()); }
      assert.ok(new Set(seen.map(s => s.t)).size >= 2, `it ticks: ${seen.map(s => s.t).join(' | ')}`);
      for (const s of seen) {
        assert.ok(Math.abs(s.w - seen[0].w) <= 0.5 && Math.abs(s.x - seen[0].x) <= 0.5, `width holds (${s.w} vs ${seen[0].w})`);
        assert.ok(Math.abs(s.hh - seen[0].hh) <= 0.5 && Math.abs(s.by - seen[0].by) <= 0.5, 'nothing around it moves');
        assert.deepEqual(s.digits.map(Math.round), seen[0].digits.map(Math.round), 'each digit pair keeps its width');
      }
      assert.equal(await page.evaluate(() => window.__cls), 0, 'no layout shift');
    } finally { await ctx.close(); }
  });
}

// Colorado wall-clock times (November = MST, UTC-7). Hours: Sun 6:30-1, Mon closed, Tue-Sat 6:30-2.
const CASES = [
  ['Monday 10 am (closed all day)', '2026-11-16T10:00:00-07:00', /closed/i, /tomorrow at 6:30/i, [20, 30, 0]],
  ['Sunday 3 pm (closed, Monday off)', '2026-11-15T15:00:00-07:00', /closed/i, /Tuesday at 6:30/i, [39, 30, 0]],
  ['Saturday 3 pm (closed, Sunday bakes)', '2026-11-14T15:00:00-07:00', /closed/i, /tomorrow at 6:30/i, [15, 30, 0]],
  ['Tuesday 5 am (before the bake)', '2026-11-17T05:00:00-07:00', /this morning/i, /6:30/, [1, 30, 0]],
  ['Tuesday 9 am (open, bread is out)', '2026-11-17T09:00:00-07:00', /out/i, /tomorrow at 6:30/i, [21, 30, 0]],
];
for (const [name, time, state, when, [h, m, sec]] of CASES) {
  test(`next bake, ${name}: honest label and the right count`, async () => {
    const { ctx, page } = await openAt(time, 390);
    try {
      const label = await page.locator('[data-next]').innerText();
      assert.match(label, state, `label says the state: "${label}"`);
      assert.match(label, when, `label names the next bake: "${label}"`);
      const c = parseClock(await page.locator('[data-countdown]').textContent());
      assert.deepEqual([c.h, c.m], [h, m], `counts down to it (${JSON.stringify(c)})`);
      assert.ok(Math.abs(c.s - sec) <= 1 || Math.abs(c.s - 59) <= 1, `seconds near ${sec}`);
    } finally { await ctx.close(); }
  });
}

test('reduced motion: hours and minutes only, no per-second ticking', async () => {
  const { ctx, page } = await openAt(null, 390, 'reduce');
  try {
    const a = await page.locator('[data-countdown]').textContent();
    const c = parseClock(a);
    assert.ok(c && c.s === null, `no seconds shown: "${a}"`);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('[data-countdown]').textContent(), a, 'nothing ticks each second');
  } finally { await ctx.close(); }
});
