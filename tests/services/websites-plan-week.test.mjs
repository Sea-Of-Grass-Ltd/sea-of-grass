// Websites page: the Site Plan says what $100 a month comes to a week. Tristan (2026-11-20): "Yes, add it under the Site
// Plan", then "Drop the glass, keep the old card plus the new line." So the card is as it was, with one line added.
// Run:  cd tests && npm install && node --test services/websites-plan-week.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

for (const w of [1440, 390]) {
  test(`${w}px · the Site Plan says what $100 a month comes to a week, in the $1,200 card's style`, async () => {
    const { ctx, page } = await site.open(PAGE, w);
    try {
      const r = await page.evaluate(() => {
        const amt = document.querySelector('.hero .plan.care .amt'), next = amt.nextElementSibling, other = document.querySelector('.hero .plan.sites .week');
        const st = e => { const c = getComputedStyle(e); return [c.fontSize, c.borderLeftWidth, c.borderLeftStyle, c.paddingLeft, c.maxWidth]; };
        return { cls: next.className, text: next.textContent.trim(), same: JSON.stringify(st(next)) === JSON.stringify(st(other)), other: !!other && other.textContent.includes('$1,200 works out') };
      });
      assert.equal(r.text, "That’s about $23 a week, roughly what a couple of online orders bring in.", 'the line, right under "$100 a month"');
      assert.match(r.cls, /\bweek\b/, 'in the .week style');
      assert.ok(r.same, 'looking like the $1,200 card\'s line');
      assert.ok(r.other, 'and the $1,200 card keeps its own line');
    } finally { await ctx.close(); }
  });
}
