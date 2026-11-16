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
  test(`${w}px · first screen is one idea: a huge headline, one photo, one button, nothing to operate`, async () => {
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
      assert.ok(s.h1Size >= (w < 900 ? 48 : 96), `headline is huge (${s.h1Size}px)`);
      assert.ok(s.h1Top < 400, `headline starts high on the first screen (top ${Math.round(s.h1Top)}px)`);
      assert.ok(!/\d/.test(s.h1Text.replace(/6:30/g, '')), `headline is words, not a countdown: "${s.h1Text}"`);
      assert.ok(s.acts.length <= 1, `at most one button in the first screen of the shop, got ${JSON.stringify(s.acts)}`);
      assert.equal(s.ctrls, 0, 'no form fields in the first screen');
      assert.ok(s.imgs <= 1, `one photo in the first screen, got ${s.imgs}`);
      // nothing ticks: the first screen reads the same a second later
      const a = await page.evaluate(() => document.querySelector('main').innerText.slice(0, 600));
      await page.waitForTimeout(1300);
      const b = await page.evaluate(() => document.querySelector('main').innerText.slice(0, 600));
      assert.equal(b, a, 'nothing on the first screen changes by itself');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w}px · the competing features are gone`, async () => {
    const { ctx, page } = await open(w);
    try {
      const s = await page.evaluate(() => ({
        clock: !!document.querySelector('[data-clock], .clock'),
        fast: !!document.querySelector('[data-fast]') || /60\s*×/.test(document.body.innerText),
        countdown: /\b\d+h \d+m\b/.test(document.body.innerText),
        dots: document.querySelectorAll('.pips, .pips i').length,
        stamps: document.querySelectorAll('.stampd, .lbl').length,
        ann: !!document.querySelector('.ann'),
        lists: [...document.querySelectorAll('main ul, main ol')].filter(l => l.querySelector(':scope > li [data-add]')).length,
        coffeeSection: !!document.querySelector('#coffee'),
        sticker: !!document.querySelector('.tagline'),
        live: /update live|live as people/i.test(document.body.innerText),
      }));
      assert.equal(s.clock, false, 'no countdown clock');
      assert.equal(s.fast, false, 'no "watch a morning at 60×" simulator');
      assert.equal(s.countdown, false, 'no "00h 00m" text anywhere');
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
