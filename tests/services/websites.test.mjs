// Websites page journey + page rules. Written from websites.journey.md before the rebuild (Tristan approved the structure 2026-11-19).
// Run:  cd tests && npm install && node --test services/websites.test.mjs
// SITE_ROOT=/path/to/site serves another checkout (used to show the old page failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
const WIDTHS = [360, 390, 1440];
const ORDER = ['familiar', 'register', 'bunny-world', 'hookup', 'buy', 'how', 'faq', 'start'];

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const text = loc => loc.evaluate(e => e.textContent.replace(/\s+/g, ' '));

// the demo shop inside the register section, once it has loaded
async function shopFrame(page) {
  const el = page.locator('#register iframe').first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const f = document.querySelector('#register iframe');
    return f && f.contentDocument && f.contentDocument.querySelector('button[data-add="Horchata, large"]');
  }, null, { timeout: 8000 });
  return (await el.elementHandle()).contentFrame();
}

for (const w of WIDTHS) {
  test(`${w}px · journey: land → problem → register → proof → hookup → prices → close`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      // 1 land
      assert.match(await text(page.locator('h1')), /register you already use/i, 'step 1: headline names the register');
      const facts = await text(page.locator('.hero .facts'));
      for (const p of ['$250', '$50', '$1,200']) assert.ok(facts.includes(p), `step 1: hero facts show ${p}`);

      // 2 the problem
      const familiar = await text(page.locator('#familiar'));
      assert.match(familiar, /Sound familiar/i, 'step 2: "Sound familiar?" heading');
      assert.match(familiar, /counter.*(website|site).*old/i, 'step 2: the register quote (changed at the counter, site shows the old one)');

      // 3 the register demo changes the live demo site
      const reg = page.locator('#register');
      const shop = await shopFrame(page);
      const horchata = reg.locator('[data-item="Horchata, large"] [data-act="soldout"]');
      assert.ok(await horchata.isVisible(), 'step 3: horchata "Sold out" control visible');
      await horchata.click();
      assert.equal(await horchata.getAttribute('aria-pressed'), 'true', 'step 3: sold-out control shows pressed');
      const hBtn = shop.locator('button[data-add="Horchata, large"]');
      assert.match(await hBtn.textContent(), /Sold out/i, 'step 3: site button reads Sold out');
      assert.ok(await hBtn.isDisabled(), 'step 3: site button disabled');
      await horchata.click();
      assert.doesNotMatch(await hBtn.textContent(), /Sold out/i, 'step 3: tapping again puts it back');
      assert.ok(!(await hBtn.isDisabled()), 'step 3: site button enabled again');
      const up = reg.locator('[data-item="The Big Carrot burrito"] [data-act="up"]');
      await up.click();
      assert.match(await text(reg.locator('[data-item="The Big Carrot burrito"]')), /\$13\.00/, 'step 3: register shows $13.00');
      assert.match(await shop.locator('button[data-add="The Big Carrot burrito"]').textContent(), /\$13\.00/, 'step 3: site shows $13.00');

      // 4 which registers
      const regText = await text(reg);
      assert.match(regText, /Square[^.]*ready/i, 'step 4: Square is ready now');
      assert.match(regText, /Shopify/, 'step 4: Shopify named');
      assert.match(regText, /Clover/, 'step 4: Clover named');
      assert.match(regText, /set up (for each|per) shop/i, 'step 4: Shopify and Clover are set up per shop');

      // 5 proof
      const bw = page.locator('#bunny-world');
      assert.match(await text(bw.locator('h2')), /Nine working shops/i, 'step 5: Bunny World heading');
      assert.ok(await bw.locator('[role="tab"]').count() >= 4, 'step 5: at least four shops in the showcase');
      assert.ok(await bw.locator('a[href="/bunnyworld/"]').count() >= 1, 'step 5: link to walk into Bunny World');

      // 6 hookup
      const hook = page.locator('#hookup');
      const heads = (await hook.locator('h3').allTextContents()).join(' | ');
      for (const h of ['What it involves', 'What changes for you', 'How to undo it']) assert.ok(heads.includes(h), `step 6: "${h}"`);
      const hookText = await text(hook);
      assert.match(hookText, /Square Dashboard/, 'step 6: undo names the Square Dashboard');
      assert.match(hookText, /can see/i, 'step 6: what we can see');
      assert.match(hookText, /never see|can.t see/i, 'step 6: what we never see');
      assert.match(hookText, /owe nothing/i, 'step 6: the owe-nothing promise');

      // 7 prices, biggest first, after the hookup
      await page.locator('#buy .shop-cards').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => /\$\s?\d/.test(document.querySelector('#buy .shop-cards')?.textContent || ''), null, { timeout: 5000 });
      const buy = await text(page.locator('#buy'));
      const amounts = buy.match(/\$\d[\d,]*/g) || [];
      assert.equal(amounts[0], '$2,000', 'step 7: first price in the buy block is the whole site');
      assert.ok(buy.indexOf('$1,200') > -1 && buy.indexOf('$1,200') < buy.indexOf('$250'), 'step 7: starter before the $250 card');
      assert.ok(buy.includes('$50'), 'step 7: the care plan price is shown');

      // 8 steps, questions, close
      assert.equal(await page.locator('#how .steps > li').count(), 4, 'step 8: four steps');
      const qs = (await page.locator('#faq summary').allTextContents()).join(' | ');
      assert.ok(((qs.match(/register|Square/gi)) || []).length >= 2, 'step 8: register questions in the FAQ');
      const close = await text(page.locator('#start'));
      assert.match(close, /Tristan/, 'step 8: close names Tristan');
      assert.match(close, /Bryce/, 'step 8: close names Bryce');

      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });

  test(`${w}px · page rules: order, tap size, no sideways scroll, no repeated buttons`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const pos = await page.evaluate(ids => {
        const hero = document.querySelector('.hero');
        const all = [...document.querySelectorAll('body *')];
        return [all.indexOf(hero), ...ids.map(id => all.indexOf(document.getElementById(id)))];
      }, ORDER);
      assert.ok(pos.every(p => p >= 0), `every section exists (hero, ${ORDER.join(', ')}): ${pos}`);
      assert.ok(pos.every((p, i) => i === 0 || p > pos[i - 1]), 'sections in the approved order');

      if (w < 900) {
        const small = await page.$$eval('#register .register button', bs => bs.filter(b => b.getBoundingClientRect().height < 44).length);
        assert.equal(small, 0, 'register buttons are at least 44px tall on phones');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');

      const dupes = await page.$$eval('main section', ss => ss.flatMap(s => {
        const t = [...s.querySelectorAll('a.btn, button.btn')].filter(b => !b.closest('.shop-cards, .register')).map(b => b.textContent.trim());
        return t.filter((x, i) => t.indexOf(x) !== i).map(x => `${s.id || s.className}: ${x}`);
      }));
      assert.deepEqual(dupes, [], 'no section repeats a button');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}

// Founding five, paid (Tristan and Bryce, 2026-11-19): no free month anywhere. The first five shops pay $50 a month from day one,
// with the price locked for two years, a free photo shoot, nothing owed if they back out at the hookup, and an honest review in return.
// The spots count lives in SOG_SHOP.founding and is never faked.
for (const w of WIDTHS) {
  test(`${w}px · journey: the founding-five offer and an honest spots count`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      const cfg = await page.evaluate(() => window.SOG_SHOP && window.SOG_SHOP.founding);
      assert.ok(cfg && Number.isInteger(cfg.total) && Number.isInteger(cfg.left), 'SOG_SHOP.founding holds total and left');
      assert.ok(cfg.left >= 0 && cfg.left <= cfg.total, 'spots left is between 0 and the total');

      const offer = page.locator('#buy .founding');
      await offer.scrollIntoViewIfNeeded();
      assert.ok(await offer.isVisible(), 'offer visible inside the prices section');
      const t = await text(offer);
      assert.match(t, /five founding shops/i, 'names the five founding shops');
      assert.match(t, /\$50 a month from (the first day|day one)/i, 'pays $50 a month from day one');
      assert.match(t, /locked[^.]*two years/i, 'price locked for two years');
      assert.match(t, /free photo shoot/i, 'a free photo shoot');
      assert.match(t, /owe nothing[^.]*hookup|hookup[^.]*owe nothing/i, 'owe nothing if they back out at the hookup');
      assert.match(t, /honest review/i, 'an honest review in return');
      const spots = await text(offer.locator('[data-spots]'));
      assert.match(spots, new RegExp(`${cfg.left} of ${cfg.total}`), `spots count reads ${cfg.left} of ${cfg.total}, from SOG_SHOP.founding`);

      const echo = page.locator('#start [data-founding-echo]');
      assert.ok(await echo.isVisible(), 'short echo near the close');
      assert.match(await text(echo), /founding/i, 'echo mentions the founding offer');
      assert.match(await text(echo), new RegExp(`${cfg.left} of ${cfg.total}`), 'echo shows the same count');
      assert.match(await text(echo), /two years/i, 'echo carries the two-year lock');

      // no free month, no free trial, anywhere on the page
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.doesNotMatch(body, /first month (is )?free|free (first )?month|month (is )?free|free trial/i, 'no free month or free trial anywhere');

      // the other public prices are unchanged, and the biggest still comes first
      const buy = await text(page.locator('#buy'));
      assert.equal((buy.match(/\$\d[\d,]*/g) || [])[0], '$2,000', 'whole site is still the first price');
      for (const p of ['$1,200', '$100 a month', '$250']) assert.ok(buy.includes(p), `still shows ${p}`);
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}

// Modest, practical promises (Bryce, 2026-11-19): easier orders and easier to find, never "transform your business".
// Some owners don't want more business, so the page also speaks to saving time and fewer phone calls.
for (const w of WIDTHS) {
  test(`${w}px · copy: modest promises, time saved and fewer calls`, async () => {
    const { ctx, page } = await site.open(PAGE, w, { reducedMotion: 'reduce' });
    try {
      await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      const hype = body.match(/\b(transform\w*|revolution\w*|next level|grow your|growth|skyrocket\w*|supercharg\w*|boost\w*|game.chang\w*|unlock\w*|empower\w*|dominat\w*|explod\w*|10x|level up|cutting.edge|world.class)\b/gi) || [];
      assert.deepEqual(hype, [], 'overselling words on the page');
      assert.match(body, /fewer (phone )?calls/i, 'speaks to fewer phone calls');
      assert.match(body, /sav\w* (you )?time|time back/i, 'speaks to saving time');
      assert.match(body, /easier (to|for)[^.]*(order|find)/i, 'the practical promise: easier to order, easier to find');
      const hero = await text(page.locator('.hero'));
      assert.match(hero, /fewer (phone )?calls|sav\w* (you )?time/i, 'the hero itself mentions time or calls, not only more orders');
    } finally { await ctx.close(); }
  });
}

test('stylesheet uses no CSS gradients as surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview/services/websites/websites.css'), 'utf8');
  assert.doesNotMatch(css, /(linear|radial|conic)-gradient\(/, 'gradient found in websites.css');
});
