// Walk-in Log (unlisted page): a signed-out visit shows only the sign-in card and gives nothing away.
// Journey: Tristan or Bryce opens the bookmarked link -> sees "Sign in with Google" (or email + password) -> after
// sign-in the stops and visits load from Supabase. Only the signed-out half can run here (no real account in tests);
// the signed-in half is checked by hand in the browser pane before each PR.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';
import { findIn, textFiles } from './prospects.mjs';

const DIR = fs.readdirSync(path.join(ROOT, 'field')).find(d => fs.statSync(path.join(ROOT, 'field', d)).isDirectory());
const PAGE = `/field/${DIR}/`;
const { prints } = JSON.parse(fs.readFileSync(new URL('./prospect-hashes.json', import.meta.url), 'utf8'));

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

test('the page lives at an unguessable path', () => {
  assert.ok(DIR && /^[a-z0-9]{10}$/.test(DIR), 'field/<10-char slug>/ exists');
});

for (const w of [390, 1440]) {
  test(`signed out at ${w}: only the sign-in card shows`, async () => {
    const { page, errors, failed, ctx } = await site.open(PAGE, w);
    const supa = [];
    page.on('request', r => { if (/supabase\.co/.test(r.url())) supa.push(r.url()); });
    await page.waitForTimeout(600);
    assert.equal(await page.isVisible('#gate'), true);
    assert.equal(await page.isVisible('#app'), false);
    assert.equal(await page.getByRole('button', { name: 'Sign in with Google' }).isVisible(), true);
    assert.equal(await page.isVisible('#email'), true, 'email + password sign-in, as Talaria has');
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /Log visit|Not visited|Printout ready/);
    assert.equal(await page.locator('.stop').count(), 0, 'no stop cards are built');
    assert.deepEqual(findIn(await page.content(), prints), [], 'no prospect names in the rendered page');
    assert.deepEqual(supa.filter(u => /\/rest\//.test(u)), [], 'no data requests without a session');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `no sideways scroll (${over}px)`);
    assert.deepEqual(failed, []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('it is hidden from search engines', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'field', DIR, 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('the slug is not linked from anywhere else in the site (no robots.txt or sitemap entry)', () => {
  const where = textFiles(ROOT).filter(f => !f.startsWith(path.join(ROOT, 'field', DIR) + path.sep) && !f.includes(path.sep + 'tests' + path.sep))
    .filter(f => fs.readFileSync(f, 'utf8').includes(DIR));
  assert.deepEqual(where.map(f => path.relative(ROOT, f)), []);
});

test('the page ships only code: no prospect names in its HTML or scripts', () => {
  for (const f of textFiles(path.join(ROOT, 'field'))) assert.deepEqual(findIn(fs.readFileSync(f, 'utf8'), prints), [], path.relative(ROOT, f));
});
