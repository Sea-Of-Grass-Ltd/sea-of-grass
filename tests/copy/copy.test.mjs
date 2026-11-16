// Sales copy voice test (Tristan, 2026-11-16): full, warm sentences; it should be obvious a real person is on the other end.
// Flags, in visible body copy: sentences under 6 words (telegraphic fragments) and em-dash asides.
// Pages: the Bunny World landing, the Sea of Grass home page and the Websites page. The made-up shop pages keep their own voices.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';
import { copyFindings } from '../lib/copy-rules.mjs';

const PAGES = process.env.COPY_PAGES ? process.env.COPY_PAGES.split(',') : ['/bunnyworld/', '/', '/preview/services/websites/'];
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// the rules live in ../lib/copy-rules.mjs so the shop copy test (shops.test.mjs) reads by the same ones
export { copyFindings };

for (const url of PAGES) {
  test(`copy voice · ${url}`, async () => {
    const { ctx, page } = await site.open(url, 1440);
    try {
      await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true)); // FAQ answers count too
      const f = await page.evaluate(copyFindings);
      assert.deepEqual(f.map(x => `${x.rule}: "${x.text}"`), [], 'telegraphic fragments or em-dashes in the copy');
    } finally { await ctx.close(); }
  });
}
