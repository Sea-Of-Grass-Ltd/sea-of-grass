// Docs in Hermes. Journey: Tristan or Bryce taps "Docs" -> sees the documents list -> opens the website owner's guide
// (the one handed to every shop we build for) and reads it on the phone, with the fields to fill for each shop marked.
// Static content, so the app shell is shown without signing in.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

async function openDocs(w) {
  const o = await site.open('/hermes/', w);
  await o.page.evaluate(() => { document.getElementById('gate').hidden = true; document.getElementById('app').hidden = false; });
  await o.page.click('nav.tabs a[data-view="docs"]');
  return o;
}

for (const w of [360, 390, 1440]) {
  test(`at ${w}: the Docs tab holds the website owner's guide`, async () => {
    const { page, errors, ctx } = await openDocs(w);
    assert.equal(await page.isVisible('#v-docs'), true);
    assert.equal(await page.getAttribute('nav.tabs a[data-view="docs"]', 'aria-current'), 'page');
    const guide = page.locator('#doc-owner-guide');
    assert.equal(await guide.isVisible(), true, 'the guide is listed');
    assert.match(await guide.locator('summary').innerText(), /Website owner’s guide/);
    assert.equal(await guide.getAttribute('open'), '', 'opens straight to the guide');
    const text = await guide.innerText();
    assert.match(text, /Your new website: how to get people using it/);
    const heads = await guide.locator('h3').allInnerTexts();
    for (const h of ['The first week', 'At the counter', 'Keep it true', 'Once a month', 'Things you can skip', 'When to call us'])
      assert.ok(heads.some(x => x.startsWith(h)), `section "${h}"`);
    assert.equal(await guide.locator('ol.steps > li').count(), 18, 'all 18 steps');
    assert.match(text, /Set as preferred/);
    assert.match(text, /Never offer a discount or a freebie for a review/);
    assert.ok(await guide.locator('.fill').count() >= 3, 'per-shop fields are marked');
    assert.doesNotMatch(text, /empanad/i, 'no one shop’s details');
    assert.doesNotMatch(text, /\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/, 'no phone numbers');
    assert.doesNotMatch(text, /\$350|Launch Setup/, 'the owner’s guide never sells: Launch Setup lives in the price script, not here');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `no sideways scroll (${over}px)`);
    const tiny = await guide.locator('p, li').evaluateAll(els => els.filter(e => parseFloat(getComputedStyle(e).fontSize) < 15).length);
    assert.equal(tiny, 0, 'readable text');
    assert.deepEqual(errors.filter(e => !/supabase|Sign-in/i.test(e)), []);
    await ctx.close();
  });
}
