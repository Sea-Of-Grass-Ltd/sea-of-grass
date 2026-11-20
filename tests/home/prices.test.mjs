// Home price blurbs carry the research prices Tristan approved on 2026-11-20. Static: reads the files, no browser.
//   cd tests && node --test home/prices.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/site.mjs';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('home (index.html): Site Plan, the 60-day fix credit, custom $2,500 or $200/mo, Brand $1,000 / $2,500, Creative tech from $1,500', () => {
  const s = read('index.html');
  assert.match(s, /<i>Site Plan<\/i><span class="cb-amt"><b>\$100<\/b>/);
  assert.match(s, /within 60 days, the fix comes off it/);
  assert.match(s, /starter site is \$1,000 with the first year of care included/, 'the starter is $1,000 once with a year of care (Tristan, 2026-11-20)');
  assert.doesNotMatch(s, /starter site is \$1,200/, 'no $1,200 starter left');
  assert.match(s, /custom sites start at \$2,500, or \$200 a month/);
  assert.match(s, /<i>Refresh<\/i><span class="cb-amt"><b>\$1,000<\/b>/);
  assert.match(s, /<i>New brand<\/i><span class="cb-amt"><b>\$2,500<\/b>/);
  assert.match(s, /<b>\$1,500<\/b><em>from<\/em><\/span><span>We agree a fixed price in writing/);
  assert.doesNotMatch(s, /<b>Fixed quote<\/b>/, 'no bare "Fixed quote" where a number is approved');
  assert.doesNotMatch(s, /\$2,000/, 'no $2,000 custom site left');
});

for (const f of ['preview/index.html', 'preview/scenes/index.html']) test(`${f}: the same prices in the service list`, () => {
  const s = read(f);
  assert.match(s, /<li>The Site Plan, \$100\/mo with care included, or \$1,000 once with a year of care<\/li>/);
  assert.match(s, /<li>Custom sites from \$2,500, or \$200\/mo<\/li>/);
  assert.match(s, /<li>Brand refresh \$1,000, new brand \$2,500<\/li>/);
  assert.match(s, /<li>From \$1,500, with a fixed quote in writing<\/li>/);
  assert.doesNotMatch(s, /\$2,000/);
});
