// Websites page: no through-line on phones. Tristan (2026-11-20): "Remove the line that cuts through the mobile version of the
// website, it just feels wrong." On phones (≤ 767 px) neither the line nor the seed is drawn at any scroll position, with
// motion on; wide screens keep their margin line exactly as before.
// Run:  cd tests && npm install && node --test services/websites-no-phone-line.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const painted = page => page.evaluate(() => {
  const shows = e => { if (!e) return false; for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; }
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const line = document.querySelector('[data-through]'), d = line?.querySelector('path')?.getAttribute('d') || '';
  return { line: shows(line) && d.length > 0, seed: shows(document.querySelector('[data-traveller]')) };
});

for (const w of [360, 390, 767]) {
  test(`${w}px · no through-line and no seed anywhere on the page, with motion on`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w);
    try {
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 0; y <= H + 399; y += 400) {
        await page.evaluate(y => scrollTo(0, y), Math.min(y, H)); await page.waitForTimeout(80);
        const p = await painted(page);
        assert.ok(!p.line, `the line is drawn at scroll ${y}`);
        assert.ok(!p.seed, `the seed shows at scroll ${y}`);
      }
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}

for (const w of [1440]) {
  test(`${w}px · the wide-screen line and seed stay`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      await page.evaluate(() => scrollTo(0, 1600)); await page.waitForTimeout(300);
      const p = await painted(page);
      assert.ok(p.line && p.seed, 'line and seed on wide screens');
    } finally { await ctx.close(); }
  });
}
