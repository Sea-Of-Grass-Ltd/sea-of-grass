// Shop copy test (critic's sections C and B9, notes/bunny-world/critic/REVIEW.md; Tristan, 2026-11-16: copy that reads like the owner wrote it).
// On the eight shops in scope (Warren Bakehouse is being edited elsewhere and joins later), every visible line is read for:
// telegraphic fragments (sentences under 6 words) and em-dashes, three-beat lists ("Flags, smiles, sunscreen."), "not X, but Y",
// reviews that describe the website, invented review counts and stats, numerals in a serif display face, and title or label sets in mixed forms.
// Questions are allowed to be short ("Which day?" is how a person asks), and live status lines are state, not copy.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';
import { copyFindings, shopCopyFindings } from '../lib/copy-rules.mjs';

const SHOPS = ['bunny-burritos', 'bunny-auto', 'hare-today', 'cottontail-farm', 'long-ears', 'hop-along', 'burrow-and-bough', 'hopwell-chiro'];
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

for (const shop of SHOPS) {
  test(`shop copy voice · ${shop}`, async () => {
    const { ctx, page } = await site.open(`/bunnyworld/${shop}/`, 1440);
    try {
      await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
      const status = await page.evaluate(() => [...document.querySelectorAll('[role=status], [aria-live]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
      const f = [...await page.evaluate(copyFindings), ...await page.evaluate(shopCopyFindings)]
        .filter(x => !(x.rule === 'short-sentence' && (/\?["”’)]?$/.test(x.text) || status.some(s => s.includes(x.text)))));
      assert.deepEqual(f.map(x => `${x.rule}: "${x.text}"`), [], `machine-sounding copy on ${shop}`);
    } finally { await ctx.close(); }
  });
}

test('B9 · Bunny Auto: one name for booking, and no breadcrumb on a one-page site', async () => {
  const { ctx, page } = await site.open('/bunnyworld/bunny-auto/', 1440);
  try {
    const r = await page.evaluate(() => ({
      books: [...new Set([...document.querySelectorAll('a, button')].filter(e => e.getClientRects().length && /^book\b/i.test(e.textContent.trim()) && !e.closest('.want, .demo, form')).map(e => e.textContent.replace(/[→\s]+$/, '').trim()))],
      crumbs: /Home\s*\/\s*Service/.test(document.body.innerText),
    }));
    assert.equal(r.books.length, 1, `booking is called ${r.books.join(' and ')}`);
    assert.equal(r.crumbs, false, '"Home / Service / Berthoud" breadcrumb');
  } finally { await ctx.close(); }
});
