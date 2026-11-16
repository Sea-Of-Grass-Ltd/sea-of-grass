// Hopwell journey + page-rule tests. Written from hopwell.journey.md before the page fixes.
// Run:  cd tests && npm install && npm run test:hopwell
// SITE_ROOT=/path/to/site serves another checkout (used to show the old page failing).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = process.env.SITE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE = '/bunnyworld/hopwell-chiro/';
const WIDTHS = [360, 390, 1440];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

let server, base, browser;
before(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, p);
    if (f.endsWith('/')) f += 'index.html';
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome' });
});
after(async () => { await browser?.close(); server?.close(); });

async function open(w) {
  const mobile = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  // stay offline: fonts, analytics and the map are third-party and not part of the page under test
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && (m.location().url || '').startsWith(base) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// Elements that belong to the shared Sea of Grass chrome, not the shop
const SHOP = 'body > :not(.demo):not(.want)';

for (const w of WIDTHS) {
  test(`${w}px · journey: land → tap → answer → first visit → answers in booking → book once`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      // 1 land
      assert.ok(await page.locator('h1', { hasText: 'Point to where' }).isVisible(), 'step 1: headline visible');
      assert.ok(await page.locator('.spot[data-spot="mid"]').isVisible(), 'step 1: mid-back tap spot visible');
      // 2 tap where it hurts
      await page.locator('.spot[data-spot="mid"]').click();
      assert.equal(await page.locator('.spot[data-spot="mid"]').getAttribute('aria-pressed'), 'true', 'step 2: spot shows chosen');
      assert.equal(await page.locator('.chip[data-spot="mid"]').getAttribute('aria-pressed'), 'true', 'step 2: Mid-back chip shows chosen');
      // 3 answer the other two questions
      await page.locator('[data-group="long"] .chip[data-v="months"]').click();
      await page.locator('[data-group="worse"] .chip[data-v="mornings"]').click();
      const kicker = (await page.locator('[data-a-k]').textContent()).toLowerCase();
      assert.match(kicker, /mid-back.*months.*mornings/, 'step 3: answer card reflects all three answers');
      // 4 first-visit info
      const card = page.locator('.ans [data-ok]');
      assert.ok(await card.isVisible(), 'step 4: first-visit card visible');
      assert.match(await card.textContent(), /60 min/, 'step 4: shows the visit length');
      assert.match(await card.textContent(), /\$\d+/, 'step 4: shows the price');
      // 5 answers carried into the one booking block
      const book = page.locator('#book');
      assert.match((await book.textContent()).toLowerCase(), /mid-back, months, worse in the mornings/, 'step 5: booking block shows the answers');
      // 6 book once
      await book.locator('.q-opt', { hasText: 'New patient exam' }).click();
      await book.locator('.q-opt', { hasText: 'First available' }).click();
      const slot = book.locator('.slots button:not(:disabled)').first();
      await slot.waitFor({ state: 'visible' });
      await slot.click();
      // the contact step opens once a time is picked
      await page.waitForFunction(() => { const i = document.querySelector('#book input[autocomplete="name"]'); return i && !i.closest('[inert]'); });
      await book.locator('input[autocomplete="name"]').fill('Test Patient');
      await book.locator('input[autocomplete="email"]').fill('test@example.com');
      await book.locator('[type=submit]').click();
      const done = book.locator('.done');
      await done.waitFor({ state: 'visible' });
      assert.match(await done.textContent(), /Booked/, 'step 6: booking confirmed');
      assert.deepEqual(errors, [], 'no console errors from the page');
    } finally { await ctx.close(); }
  });

  test(`${w}px · one scheduling block, no repeated actions`, async () => {
    const { ctx, page } = await open(w);
    try {
      const r = await page.evaluate((SHOP) => {
        const vis = e => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== 'hidden' && !e.closest('[hidden],[inert]'); };
        const shop = [...document.querySelectorAll(SHOP)];
        const inShop = e => shop.some(s => s.contains(e));
        const slots = document.querySelectorAll('[data-slots]').length;
        const timeTalk = [...document.querySelectorAll('body *')].filter(e => inShop(e) && !e.closest('#book') && e.children.length === 0 && vis(e) && /next open|same-day opening|openings/i.test(e.textContent)).map(e => e.textContent.trim());
        // actions that exist on the page, including ones in steps not reached yet (only [hidden] alternatives are skipped)
        const actions = [...document.querySelectorAll('a[href], button')].filter(e => inShop(e) && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && !e.closest('.sr'));
        const text = e => e.textContent.replace(/\s+/g, ' ').trim();
        const bookAll = actions.filter(e => /\bbook\b/i.test(text(e))).map(e => ({ t: text(e), where: e.closest('header') ? 'header' : 'page' }));
        // duplicate action text on screen inside one section (step-by-step forms show one step's Next at a time)
        const dups = [];
        for (const sec of document.querySelectorAll('header, main > section, main > section > .box')) {
          if (!inShop(sec)) continue;
          const seen = {};
          actions.filter(a => vis(a) && sec.contains(a) && (sec.matches('.box') || !a.closest('.box'))).forEach(a => { const t = text(a).toLowerCase(); if (!t) return; seen[t] = (seen[t] || 0) + 1; });
          Object.entries(seen).filter(([, n]) => n > 1).forEach(([t, n]) => dups.push(`${sec.className || sec.tagName}: "${t}" ×${n}`));
        }
        return { slots, timeTalk, bookAll, dups };
      }, SHOP);
      assert.equal(r.slots, 1, 'exactly one scheduling block');
      assert.deepEqual(r.timeTalk, [], 'no open times shown outside the booking block');
      assert.equal(r.bookAll.filter(b => b.where === 'header').length, 1, 'one Book button in the header');
      assert.equal(r.bookAll.filter(b => b.where === 'page').length, 1, `one booking button in the page, got ${JSON.stringify(r.bookAll)}`);
      assert.deepEqual(r.dups, [], 'no section repeats the same action');
    } finally { await ctx.close(); }
  });

  test(`${w}px · tap spots: apart, no halos, labels clear`, async () => {
    const { ctx, page } = await open(w);
    try {
      const spots = page.locator('.spot');
      const n = await spots.count();
      assert.ok(n >= 3 && n <= 5, `3 to 5 tap spots (got ${n})`);
      for (let i = 0; i < n; i++) {
        await spots.nth(i).click();
        const r = await page.evaluate(() => {
          const rect = e => e.getBoundingClientRect();
          const s = [...document.querySelectorAll('.spot')].map(e => ({ n: e.dataset.spot, r: rect(e), sh: getComputedStyle(e).boxShadow }));
          const c = q => ({ x: q.r.x + q.r.width / 2, y: q.r.y + q.r.height / 2 });
          let min = 1e9, pair = '';
          for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const d = Math.hypot(c(s[i]).x - c(s[j]).x, c(s[i]).y - c(s[j]).y); if (d < min) { min = d; pair = s[i].n + '/' + s[j].n; } }
          const hit = (a, b) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
          const labels = [...document.querySelectorAll('.stage .tag, .stage [data-tag]')].filter(e => e.textContent.trim() && rect(e).width);
          const covered = labels.flatMap(l => s.filter(q => hit(rect(l), q.r)).map(q => `${l.textContent.trim()} covers ${q.n}`));
          return { min: Math.round(min), pair, halos: s.filter(q => q.sh !== 'none').map(q => q.n), covered };
        });
        assert.ok(r.min >= 44, `spots at least 44px apart (closest ${r.pair}: ${r.min}px)`);
        assert.deepEqual(r.halos, [], 'spots have no halo shadows');
        assert.deepEqual(r.covered, [], 'labels never cover a spot');
      }
    } finally { await ctx.close(); }
  });

  test(`${w}px · every question title is a full sentence ending in "?"`, async () => {
    const { ctx, page } = await open(w);
    try {
      const titles = await page.evaluate(() => [...document.querySelectorAll('.q .t, .q-h')].map(e => e.textContent.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim()));
      assert.ok(titles.length >= 3, 'found the question titles');
      const bad = titles.filter(t => !t.endsWith('?') || t.split(' ').length < 3);
      assert.deepEqual(bad, [], `titles that aren't full questions: ${JSON.stringify(bad)}`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · copy that counts the questions matches the questions`, async () => {
    const { ctx, page } = await open(w);
    try {
      const r = await page.evaluate(() => {
        const N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
        const asked = document.querySelectorAll('.hook .q').length;
        const claims = [];
        for (const e of document.querySelectorAll('main p, main h1, main h2, main li, main figcaption')) {
          const t = e.textContent.toLowerCase();
          for (const m of t.matchAll(/\b(one|two|three|four|five|six|\d+)\s+(?:\w+\s+){0,2}questions?\b/g)) claims.push({ text: m[0], n: N[m[1]] ?? +m[1] });
        }
        return { asked, claims };
      });
      assert.equal(r.asked, 3, 'the hook asks three questions');
      const wrong = r.claims.filter(c => c.n !== r.asked);
      assert.deepEqual(wrong, [], `copy says a different number of questions than the ${r.asked} asked`);
    } finally { await ctx.close(); }
  });

  test(`${w}px · buttons, chips and spots use only palette tokens, no shadows`, async () => {
    const { ctx, page } = await open(w);
    try {
      // walk the journey a little so chosen and filled states are included
      await page.locator('.spot[data-spot="low"]').click();
      await page.locator('[data-group="flags"] .chip').first().click();
      await page.locator('[data-group="flags"] .chip').first().click();
      const r = await page.evaluate((SHOP) => {
        const probe = document.createElement('i'); document.body.appendChild(probe);
        const norm = v => { probe.style.color = ''; probe.style.color = v; return probe.style.color ? getComputedStyle(probe).color : null; };
        const root = getComputedStyle(document.documentElement), tokens = new Set(['rgba(0, 0, 0, 0)']);
        for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
          for (const rule of rules) if (rule.selectorText === ':root') for (const p of rule.style) if (p.startsWith('--')) { const c = norm(root.getPropertyValue(p).trim()); if (c) tokens.add(c); } }
        probe.remove();
        const shop = [...document.querySelectorAll(SHOP)];
        const els = [...document.querySelectorAll('button, .btn, a.call, .chip, .spot, .q-opt')].filter(e => shop.some(s => s.contains(e)) && e.getBoundingClientRect().width > 0 && !e.closest('[hidden]'));
        const bad = [];
        for (const e of els) {
          const c = getComputedStyle(e), id = (e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 20) + '"';
          const check = (k, v) => { if (!tokens.has(v)) bad.push(`${id} ${k} ${v}`); };
          check('background', c.backgroundColor); check('color', c.color);
          if (parseFloat(c.borderTopWidth) > 0) check('border', c.borderTopColor);
          if (c.boxShadow !== 'none') bad.push(`${id} has box-shadow ${c.boxShadow}`);
          if (c.backgroundImage !== 'none') bad.push(`${id} has background-image`);
        }
        return { n: els.length, bad: [...new Set(bad)] };
      }, SHOP);
      assert.ok(r.n > 10, 'found the controls');
      assert.deepEqual(r.bad, [], 'off-palette colours or shadows');
    } finally { await ctx.close(); }
  });

  test(`${w}px · no sideways scroll, no console errors`, async () => {
    const { ctx, page, errors } = await open(w);
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `page scrolls sideways by ${over}px`);
      assert.deepEqual(errors, [], 'console errors');
    } finally { await ctx.close(); }
  });
}
