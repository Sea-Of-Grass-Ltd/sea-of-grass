// Abuelita's Empanadas journey tests. Written from abuelitas.journey.md before the page was built.
// Run:  cd tests && npm install && node --test clients/abuelitas.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';
import { copyFindings } from '../lib/copy-rules.mjs';

const PAGE = '/clients/abuelitas/';
const WIDTHS = [360, 390, 1440];
const SQUARE = 'https://square.link/u/test-abuelitas';
const ENDPOINT = '/api/abuelitas-checkout'; // the small server piece that asks Square for a checkout page

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

async function open(w, live) {
  const o = await site.open(PAGE, w, { reducedMotion: 'reduce', initScript: `window.ABUELITAS_CHECKOUT = ${JSON.stringify(live ? ENDPOINT : '')};` });
  o.posted = [];
  // stand in for the server: it gets the cart and answers with a Square checkout link
  await o.ctx.route(u => u.pathname === ENDPOINT, async r => { o.posted.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: SQUARE }) }); });
  return o;
}

function firstScreen() {
  const vis = e => { if (e.closest('[hidden],[aria-hidden="true"],.draft,.sr')) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  const onScreen = e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const shown = sel => [...document.querySelectorAll(sel)].filter(e => vis(e) && onScreen(e));
  const h1 = [...document.querySelectorAll('h1')];
  return {
    h1s: h1.length,
    h1Shown: h1.filter(e => vis(e) && onScreen(e)).map(e => ({ t: text(e), size: parseFloat(getComputedStyle(e).fontSize), font: getComputedStyle(e).fontFamily })),
    actions: shown('a[href], button').map(text),
    fields: shown('input, select, textarea').map(e => e.name || e.tagName),
    bars: document.querySelectorAll('.ann, .quick, [data-drawer]').length,
  };
}

function actionLabels() {
  const vis = e => { if (e.closest('[hidden],[aria-hidden="true"],.draft,.sr')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; };
  return [...document.querySelectorAll('a[href], button')].filter(vis).map(e => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
}

function layoutFaults() {
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth) out.push(`page is ${document.documentElement.scrollWidth - innerWidth}px wider than the screen`);
  const t = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(e => { if (e.closest('[hidden],.sr,[data-cartbar],[data-sticky]')) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i], b = t[j]; if (a.contains(b) || b.contains(a)) continue;
    const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
    const ix = Math.min(r.right, s.right) - Math.max(r.left, s.left), iy = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
    if (ix > 2 && iy > 2) out.push(`"${(a.innerText || a.tagName).trim().slice(0, 20)}" overlaps "${(b.innerText || b.tagName).trim().slice(0, 20)}"`);
  }
  for (const img of document.images) if (img.complete && !img.naturalWidth) out.push('broken image ' + img.getAttribute('src'));
  return out;
}

// The AI-default palette (dark brown, cream serif, amber button) is banned; this shop gets its own.
function palette() {
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; return { h, s, l }; };
  const btn = document.querySelector('[data-order-start]');
  const b = hsl(rgb(getComputedStyle(btn).backgroundColor)), bg = hsl(rgb(getComputedStyle(document.body).backgroundColor)), ink = hsl(rgb(getComputedStyle(document.body).color));
  return {
    amberButton: b.h >= 25 && b.h <= 50 && b.s > 0.5 && b.l > 0.35,
    creamOnBrown: bg.h >= 25 && bg.h <= 55 && bg.l > 0.85 && ink.h >= 10 && ink.h <= 40 && ink.l < 0.3 && ink.s > 0.15,
    serifHead: /serif/i.test(getComputedStyle(document.querySelector('h1')).fontFamily.replace(/sans-serif/gi, '')),
  };
}

const visibleQs = page => page.$$eval('#order [data-q]', qs => qs.filter(q => !q.hidden && q.getBoundingClientRect().height > 0).map(q => q.dataset.q));

for (const w of WIDTHS) {
  test(`${w}px · land, read the menu, find the shop, order today through Square`, async () => {
    const { ctx, page, errors } = await open(w, SQUARE);
    try {
      // 1 land
      const f = await page.evaluate(firstScreen);
      assert.equal(f.h1s, 1, 'one h1 on the page');
      assert.equal(f.h1Shown.length, 1, 'the h1 is on the first screen');
      if (w < 900) assert.ok(f.h1Shown[0].size >= 48, `headline is huge on a phone (${f.h1Shown[0].size}px)`);
      assert.equal(f.actions.length, 2, `two actions on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.ok(f.actions.some(t => /^order for pickup$/i.test(t)), `"Order for pickup" on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.ok(f.actions.some(t => /720.?218.?9808/.test(t)), `call button with the number on the first screen, saw ${JSON.stringify(f.actions)}`);
      assert.deepEqual(f.fields, [], 'nothing to fill in on the first screen');
      assert.equal(f.bars, 0, 'no announcement bar, quick bar or drawer');
      // 4 call
      assert.equal(await page.locator('a[href="tel:+17202189808"]').count(), 1, 'one call link dials 720-218-9808');
      // 2 menu: the real board from the counter (photos 2026-11-17), no prices until the owner sends them
      const items = page.locator('#menu [data-item]');
      assert.ok(await items.count() >= 12, 'all twelve empanadas from the counter board');
      const menu = await page.locator('#menu').innerText();
      for (const n of ['Ground Beef', 'Steak', 'Chile Relleno', 'Ham & Cheese', 'Spicy Chicken', 'Spinach & Cheese', 'Chicken Vegetable', 'Tinga', 'Sweet Potato', 'Pineapple', 'Dulce con leche', 'Apple', 'Combo', 'Horchata', 'Jamaica'])
        assert.ok(menu.toLowerCase().includes(n.toLowerCase()), `the menu lists ${n}`);
      for (let i = 0; i < await items.count(); i++) {
        const it = items.nth(i);
        assert.equal(await it.locator('h4').count(), 1, `menu item ${i + 1} has a name`);
        await it.scrollIntoViewIfNeeded();
        const ph = await it.locator('.photo').evaluate(p => p.tagName !== 'IMG' ? /\.(webp|jpg)$/.test(p.dataset.photo || '') : p.decode().then(() => p.naturalWidth > 0, () => false));
        assert.ok(ph, `menu item ${i + 1}: photo loads, or the slot names the photo it waits for`);
      }
      assert.doesNotMatch(await page.locator('body').innerText(), /\$\s?\d/, 'no prices anywhere until the owner sends them');
      // 3 visit
      const visit = await page.locator('#visit').innerText();
      for (const s of ['Old Town Marketplace', '332 Main St', 'Longmont']) assert.ok(visit.includes(s), `visit block names ${s}`);
      assert.ok(await page.locator('#visit a[href*="maps"]').count() >= 1, 'a directions link');
      assert.equal(await page.locator('#visit [data-hours][data-sample="true"]').count(), 1, 'hours are marked as coming from the bakery');
      // 5 the hero's Order button leads to the menu, where every empanada can be added
      assert.match(await page.locator('[data-order-start]').getAttribute('href'), /#menu$/, 'Order for pickup leads to the menu');
      for (let i = 0; i < await items.count(); i++) assert.equal(await items.nth(i).locator('button[data-add]').count(), 1, `menu item ${i + 1} has an Add button`);
      assert.ok(await page.locator('#menu [data-key] button[data-add]').count() >= 30, 'everything on the menu can be added, desserts, drinks and coffee too');
      // rules
      const labels = await page.evaluate(actionLabels);
      const dups = labels.filter((t, i) => labels.indexOf(t) !== i);
      assert.deepEqual([...new Set(dups)], [], 'no action label repeats');
      const p = await page.evaluate(palette);
      assert.equal(p.amberButton, false, 'the Order button is not amber');
      assert.equal(p.creamOnBrown, false, 'not cream with brown ink');
      assert.equal(p.serifHead, false, 'headline is not a serif');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps, sideways scroll or broken images');
      assert.deepEqual(await page.evaluate(copyFindings), [], 'copy is full sentences, no em-dashes');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · add to the order, review it, pick a time, then pay on Square`, async () => {
    const o = await open(w, true), { ctx, page, errors } = o;
    try {
      const bar = page.locator('[data-cartbar]');
      assert.equal(await bar.isVisible(), false, 'no order bar until something is added');
      await page.locator('[data-key="steak"] button[data-add]').click();
      await page.locator('[data-key="steak"] button[data-more]').click();
      await page.locator('[data-key="pineapple"] button[data-add]').click();
      await page.locator('[data-key="horchata"] button[data-add]').click();
      assert.match(await page.locator('[data-key="steak"] [data-qty]').innerText(), /^2$/, 'the Steak tile shows 2');
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150); // the bar hides while the order itself is on screen
      assert.ok(await bar.isVisible(), 'the order bar appears');
      assert.match(await bar.innerText(), /\b4\b/, `the bar counts 4 items: "${await bar.innerText()}"`);
      await bar.locator('a, button').first().click();
      await page.waitForTimeout(150);
      assert.deepEqual(await visibleQs(page), ['cart'], 'the order opens on the cart, one step at a time');
      const cart = page.locator('#order [data-q="cart"]');
      assert.match(await cart.locator('[data-line="steak"]').innerText(), /steak/i, 'cart lists Steak');
      assert.equal(await cart.locator('[data-line="steak"] .n').innerText(), '2', 'Steak shows 2, once');
      await cart.locator('[data-line="pineapple"] button[data-less]').click();
      assert.doesNotMatch(await cart.innerText(), /pineapple/i, 'taking the pineapple out removes it');
      assert.match(await cart.innerText(), /total[^.]*checkout/i, 'says the total is shown at checkout (no invented prices)');
      await cart.locator('button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['when'], 'then one question: when');
      await page.locator('#order [data-q="when"] select').selectOption({ index: 1 });
      await page.locator('#order [data-q="when"] button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['who'], 'then one question: who is picking it up');
      await page.locator('#order [data-q="who"] button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['who'], 'cannot go on without a name');
      await page.locator('#order [data-q="who"] input[autocomplete="name"]').fill('Rosa Diaz');
      await page.locator('#order [data-q="who"] button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['phone'], 'then one question: the phone number');
      await page.locator('#order [data-q="phone"] button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['phone'], 'cannot go on without a phone number');
      await page.locator('#order [data-q="phone"] input[type="tel"]').fill('7205550142');
      await page.locator('#order [data-q="phone"] button[data-next]').click();
      assert.deepEqual(await visibleQs(page), ['pay'], 'then the review');
      const review = await page.locator('#order [data-q="pay"]').innerText();
      for (const t of [/steak/i, /horchata/i, /rosa/i, /square/i]) assert.match(review, t, `review shows ${t}`);
      assert.doesNotMatch(review, /\$\s?\d/, 'no invented prices in the review');
      assert.equal(await page.locator('#order input[autocomplete*="cc"], #order input[name*="card"]').count(), 0, 'we never ask for card details');
      const nav = page.waitForRequest(r => r.url().startsWith(SQUARE), { timeout: 3000 });
      await page.locator('#order [data-q="pay"] button[data-pay]').click();
      await nav;
      assert.equal(o.posted.length, 1, 'the cart was sent once');
      const sent = o.posted[0];
      assert.deepEqual(sent.items, [{ key: 'steak', qty: 2 }, { key: 'horchata', qty: 1 }], 'the cart sent is Steak x2 and horchata x1');
      assert.equal(sent.name, 'Rosa Diaz'); assert.match(sent.phone, /7205550142/);
      assert.ok(sent.pickup, 'a pickup time is sent');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · an empty order says what to do, and a party order asks how many then offers the call`, async () => {
    const { ctx, page, errors } = await open(w, true);
    try {
      await page.goto(page.url().replace(/#.*$/, '') + '#order');
      await page.waitForTimeout(150);
      const cart = page.locator('#order [data-q="cart"]');
      assert.match(await cart.innerText(), /empty/i, 'an empty cart says so');
      assert.equal(await cart.locator('button[data-next]').isEnabled(), false, 'cannot go on with nothing in it');
      await page.locator('#order button[data-party]').click();
      assert.deepEqual(await visibleQs(page), ['people'], 'one question: how many people');
      await page.locator('#order [data-q="people"] input').fill('30');
      await page.locator('#order [data-q="people"] button[type=submit]').click();
      assert.deepEqual(await visibleQs(page), ['party'], 'then the party hand-off');
      const t = await page.locator('#order [data-q="party"]').innerText();
      assert.match(t, /\b30\b/, 'the hand-off names 30 people');
      assert.ok(await page.locator('#order [data-q="party"] [data-call]').count() >= 1, 'it offers the call');
      assert.deepEqual(await page.evaluate(layoutFaults), [], 'no overlaps or sideways scroll');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · before Square is connected, the last step says draft and still offers the call`, async () => {
    const { ctx, page, errors } = await open(w, false);
    try {
      await page.locator('[data-key="tinga"] button[data-add]').click();
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150);
      await page.locator('[data-cartbar] a, [data-cartbar] button').first().click();
      await page.locator('#order [data-q="cart"] button[data-next]').click();
      await page.locator('#order [data-q="when"] button[data-next]').click();
      await page.locator('#order [data-q="who"] input[autocomplete="name"]').fill('Sam');
      await page.locator('#order [data-q="who"] button[data-next]').click();
      await page.locator('#order [data-q="phone"] input[type="tel"]').fill('7205550199');
      await page.locator('#order [data-q="phone"] button[data-next]').click();
      const step = page.locator('#order [data-q="pay"]');
      assert.match(await step.innerText(), /draft/i, 'says it is a draft');
      assert.equal(await step.locator('button[data-pay]').count(), 0, 'no dead pay button');
      assert.ok(await step.locator('[data-call]').count() >= 1, 'offers the call instead');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}
