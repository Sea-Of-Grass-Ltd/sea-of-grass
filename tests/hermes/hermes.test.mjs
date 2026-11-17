// Walk-in Log at /hermes/ (pairs with /talaria/): a signed-out visit shows only the sign-in card and gives nothing away.
// Journey: Tristan or Bryce opens seaofgrass.studio/hermes/ -> sees "Sign in with Google" (or email + password) -> after
// sign-in the stops and visits load from Supabase. Only the signed-out half can run here (no real account in tests);
// the signed-in half is checked by hand in the browser pane before each PR. The old unlisted path redirects here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';
import { findIn, textFiles } from './prospects.mjs';

const PAGE = '/hermes/';
const OLD = '/field/uenooqa4j3/';
const { prints } = JSON.parse(fs.readFileSync(new URL('./prospect-hashes.json', import.meta.url), 'utf8'));

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

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

test('the old unlisted path sends people to /hermes/', async () => {
  const { page, ctx } = await site.open(OLD + '#log', 390);
  await page.waitForURL(u => new URL(u).pathname === PAGE, { timeout: 3000 });
  assert.equal(new URL(page.url()).hash, '#log', 'keeps the tab they bookmarked');
  const html = fs.readFileSync(path.join(ROOT, 'field/uenooqa4j3/index.html'), 'utf8');
  assert.match(html, /<meta http-equiv="refresh" content="0;url=\/hermes\/">/);
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  await ctx.close();
});

test('it is hidden from search engines', () => {
  const html = fs.readFileSync(path.join(ROOT, 'hermes/index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('it is not in navigation, a sitemap or robots.txt', () => {
  const skip = [path.join(ROOT, 'hermes') + path.sep, path.join(ROOT, 'field') + path.sep, path.join(ROOT, 'tests') + path.sep];
  const where = textFiles(ROOT).filter(f => !skip.some(s => f.startsWith(s)))
    .filter(f => /(href|src)=["'][^"']*\/hermes\b|seaofgrass\.studio\/hermes/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(where.map(f => path.relative(ROOT, f)), []);
});

test('the page ships only code: no prospect names in its HTML or scripts', () => {
  for (const d of ['hermes', 'field']) for (const f of textFiles(path.join(ROOT, d))) assert.deepEqual(findIn(fs.readFileSync(f, 'utf8'), prints), [], path.relative(ROOT, f));
});
