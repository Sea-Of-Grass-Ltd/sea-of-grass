// Old Town Marketplace journey tests. Written from otm.journey.md before the page was built.
// Run:  cd tests && npm install && node --test clients/otm.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';
import { copyFindings } from '../lib/copy-rules.mjs';

const PAGE = '/clients/otm/';
const WIDTHS = [360, 390, 1440];
const OPEN_TIME = '2026-11-18T14:00:00-07:00';   // a Wednesday afternoon in Longmont
const CLOSED_TIME = '2026-11-18T21:30:00-07:00'; // the same night, after 7

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const open = (w, time = OPEN_TIME) => site.open(PAGE, w, { reducedMotion: 'reduce', time, timezoneId: 'America/Denver' });

function firstScreen() {
  const vis = e => { if (e.closest('[hidden],[aria-hidden="true"],.draft,.sr')) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  const onScreen = e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const h1 = [...document.querySelectorAll('h1')];
  const strip = document.querySelector('[data-open]');
  const map = document.querySelector('[data-map]');
  return {
    h1s: h1.length,
    h1Shown: h1.filter(e => vis(e) && onScreen(e)).map(e => ({ size: parseFloat(getComputedStyle(e).fontSize) })),
    strip: strip && vis(strip) && onScreen(strip) ? strip.innerText.replace(/\s+/g, ' ').trim() : null,
    mapTop: map ? map.getBoundingClientRect().top : null,
    fields: [...document.querySelectorAll('input, select, textarea')].filter(e => vis(e) && onScreen(e)).length,
  };
}

function layoutFaults() {
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth) out.push(`page is ${document.documentElement.scrollWidth - innerWidth}px wider than the screen`);
  const t = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(e => { if (e.closest('[hidden],.sr,dialog:not([open]),.draft')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i], b = t[j]; if (a.contains(b) || b.contains(a)) continue;
    const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
    const ix = Math.min(r.right, s.right) - Math.max(r.left, s.left), iy = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
    if (ix > 2 && iy > 2) out.push(`"${(a.innerText || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 24)}" overlaps "${(b.innerText || b.getAttribute('aria-label') || b.tagName).trim().slice(0, 24)}"`);
  }
  for (const img of document.images) if (img.complete && !img.naturalWidth) out.push('broken image ' + img.getAttribute('src'));
  return out;
}

// The AI-default palette (dark brown, cream serif, amber button) is banned; the marketplace gets its own.
function palette() {
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; return { h, s, l }; };
  const amber = c => c.h >= 25 && c.h <= 50 && c.s > 0.5 && c.l > 0.35;
  const buttons = [...document.querySelectorAll('.btn, button[data-next]')].map(b => hsl(rgb(getComputedStyle(b).backgroundColor)));
  const bg = hsl(rgb(getComputedStyle(document.body).backgroundColor)), ink = hsl(rgb(getComputedStyle(document.body).color));
  return {
    buttons: buttons.length,
    amberButton: buttons.some(amber),
    creamOnBrown: bg.h >= 25 && bg.h <= 55 && bg.l > 0.85 && ink.h >= 10 && ink.h <= 40 && ink.l < 0.3 && ink.s > 0.15,
    serifHead: /serif/i.test(getComputedStyle(document.querySelector('h1')).fontFamily.replace(/sans-serif/gi, '')),
  };
}

const cardText = page => page.$eval('[data-card]', d => d.open ? d.innerText.replace(/\s+/g, ' ') : null);
const shownShops = page => page.$$eval('[data-directory] [data-shop]', l => l.filter(e => !e.hidden && e.getBoundingClientRect().height > 0).map(e => e.dataset.shop));
const visibleQs = page => page.$$eval('#lease [data-q]', qs => qs.filter(q => !q.hidden && q.getBoundingClientRect().height > 0).map(q => q.dataset.q));

for (const w of WIDTHS) {
  test(`${w}px · land, check it's open, walk the map, filter, eat, visit`, async () => {
    const { ctx, page, errors, failed } = await open(w);
    try {
      // 1 land
      const f = await page.evaluate(firstScreen);
      assert.equal(f.h1s, 1, 'one h1 on the page');
      assert.equal(f.h1Shown.length, 1, 'the h1 is on the first screen');
      assert.ok(f.h1Shown[0].size >= 40, `h1 is ${f.h1Shown[0].size}px`);
      assert.equal(f.fields, 0, 'nothing to fill in on the first screen');
      assert.ok(f.mapTop !== null && f.mapTop < 844, `the floor map starts on the first screen (top at ${f.mapTop})`);

      // 2 open now
      assert.ok(f.strip, 'the open-now strip is on the first screen');
      assert.match(f.strip, /open now/i);
      assert.match(f.strip, /\b7\b/);
      assert.match(f.strip, /own hours/i, 'the strip says each shop sets its own hours');

      // 3 map
      const tabs = await page.$$eval('[data-level-tab]', t => t.map(e => e.dataset.levelTab));
      assert.deepEqual(tabs, ['main', 'up', 'mezz'], 'three levels on the map');
      await page.click('[data-unit="B3"]');
      let card = await cardText(page);
      assert.ok(card, 'tapping B3 opens a card');
      assert.match(card, /Happy Turtle/);
      assert.match(card, /soap/i);
      assert.match(card, /hours/i);
      assert.ok(await page.$eval('[data-card]', d => [...d.querySelectorAll('a[href]')].some(a => /happyturtleshop\.com/.test(a.href))), 'card links to their website');
      await page.click('[data-card] [data-card-close]');
      assert.equal(await cardText(page), null, 'the × closes the card');
      await page.click('[data-level-tab="mezz"]');
      await page.click('[data-unit="D2"]');
      card = await cardText(page);
      assert.match(card || '', /Broebuck/);
      await page.keyboard.press('Escape');
      assert.equal(await cardText(page), null, 'Escape closes the card');
      const tbc = await page.$$eval('[data-unit][data-tbc]', u => u.length);
      assert.ok(tbc >= 1, 'shops with an unknown unit are marked');
      await page.click('[data-level-tab="main"]');
      await page.click('[data-unit][data-tbc]:not([hidden])');
      assert.match(await cardText(page) || '', /to (be )?confirm/i, 'a dashed unit says its spot is still to confirm');
      await page.keyboard.press('Escape');

      // 4 directory
      for (const k of ['food', 'boutiques', 'art', 'collectibles', 'wellness']) assert.ok(await page.$(`[data-filter="${k}"]`), `filter ${k}`);
      await page.click('[data-filter="food"]');
      let shops = await shownShops(page);
      assert.ok(shops.includes('abuelitas') && shops.includes('colorado-dumplings'), 'food shows both kitchens: ' + shops);
      assert.ok(!shops.includes('happy-turtle'), 'food hides the soap shop');
      await page.click('[data-filter="wellness"]');
      shops = await shownShops(page);
      assert.ok(shops.includes('happy-turtle') && shops.includes('nirvanas-garden'), 'wellness: ' + shops);
      await page.click('[data-directory] [data-shop="nirvanas-garden"] button');
      assert.match(await cardText(page) || '', /Nirvana/, 'a directory row opens the same card');
      await page.keyboard.press('Escape');

      // 5 events
      const ev = await page.$$eval('#events [data-event]', e => e.length);
      assert.ok(ev >= 2, `${ev} events`);
      assert.ok(await page.$$eval('#events a[href]', a => a.some(x => /calendarwiz\.com/.test(x.href))), 'links to the marketplace calendar');

      // 6 food hands off to Abuelita's own ordering
      const hand = await page.$$eval('#food a[href]', a => a.map(x => new URL(x.href)).filter(u => u.pathname === '/clients/abuelitas/' && u.hash === '#order').length);
      assert.ok(hand >= 1, 'food links to /clients/abuelitas/#order');
      assert.equal(await page.$$eval('[data-cart], [data-cartbar]', e => e.length), 0, 'no second cart on this page');

      // 7 visit
      const visit = await page.$eval('#visit', e => ({ t: e.innerText, maps: [...e.querySelectorAll('a[href]')].some(a => /google\.com\/maps|maps\.apple\.com/.test(a.href)) }));
      assert.match(visit.t, /332 Main St/);
      assert.match(visit.t, /Longmont/);
      assert.match(visit.t, /11/);
      assert.match(visit.t, /park/i);
      assert.ok(visit.maps, 'directions link');

      // page rules
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'layout faults');
      const p = await page.evaluate(palette);
      assert.ok(p.buttons > 0, 'buttons found for the palette check');
      assert.ok(!p.amberButton, 'no amber button');
      assert.ok(!p.creamOnBrown, 'no cream page with brown ink');
      assert.ok(!p.serifHead, 'headline is not a serif');
      assert.deepEqual(await page.evaluate(copyFindings), [], 'copy');
      assert.deepEqual(errors, [], 'console errors');
      assert.deepEqual(failed, [], 'failed requests');
    } finally { await ctx.close(); }
  });

  test(`${w}px · after 7 the strip says closed and when it opens`, async () => {
    const { ctx, page } = await open(w, CLOSED_TIME);
    try {
      const s = await page.$eval('[data-open]', e => e.innerText.replace(/\s+/g, ' '));
      assert.match(s, /closed/i);
      assert.match(s, /\b11\b/);
      assert.doesNotMatch(s, /open now/i);
    } finally { await ctx.close(); }
  });

  test(`${w}px · ask about a space, one question at a time`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      await page.locator('#lease').scrollIntoViewIfNeeded();
      assert.deepEqual(await visibleQs(page), ['sell'], 'starts with one question');
      await page.click('#lease [data-q="sell"] [data-next]');
      assert.deepEqual(await visibleQs(page), ['sell'], 'Next waits for an answer');
      await page.fill('#lease [name="sell"]', 'Hand-thrown pottery and a little coffee bar');
      await page.click('#lease [data-q="sell"] [data-next]');
      assert.deepEqual(await visibleQs(page), ['size']);
      await page.click('#lease [data-q="size"] label:first-of-type');
      await page.click('#lease [data-q="size"] [data-next]');
      assert.deepEqual(await visibleQs(page), ['who']);
      await page.fill('#lease [name="name"]', 'Sam');
      await page.fill('#lease [name="reach"]', '720-555-0100');
      await page.click('#lease [data-q="who"] [data-next]');
      assert.deepEqual(await visibleQs(page), ['review']);
      const r = await page.$eval('#lease [data-q="review"]', e => e.innerText);
      assert.match(r, /pottery/);
      assert.match(r, /Sam/);
      assert.match(r, /nothing is sent/i, 'the demo says plainly nothing is sent');
      assert.match(r, /720\D{0,2}680\D?0557/, 'and gives the marketplace phone');
      const sizes = await page.$$eval('#lease input, #lease textarea', i => i.filter(e => e.getBoundingClientRect().height > 0).map(e => parseFloat(getComputedStyle(e).fontSize)));
      assert.ok(sizes.every(s => s >= 16), 'inputs are 16px so phones don\'t zoom');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}

test('shop records live in one reusable JSON file', async () => {
  const res = await fetch(site.base + '/clients/otm/shops.json');
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.ok(Array.isArray(d.shops) && d.shops.length >= 15, 'at least 15 shops');
  for (const s of d.shops) {
    assert.ok(s.id && s.name && s.level && Array.isArray(s.categories) && s.categories.length && s.sells, `record ${s.id || s.name} has id, name, level, categories, sells`);
    assert.equal(typeof s.unitConfirmed, 'boolean', `${s.id} says whether its unit is confirmed`);
  }
});
