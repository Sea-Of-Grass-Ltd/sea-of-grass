// Fails the build if any walk-in prospect's business name appears anywhere in the repo's text files.
// The list lives in Supabase behind sign-in (Tristan's standing rule: prospect data never in the public repo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/site.mjs';
import { findIn, textFiles, normName, fingerprint } from './prospects.mjs';

const { prints } = JSON.parse(fs.readFileSync(new URL('./prospect-hashes.json', import.meta.url), 'utf8'));

test('the guard itself finds a fingerprinted name inside other text', () => {
  const fake = fingerprint(['Example Test Bakery']);
  assert.equal(findIn('Visit “Example Test Bakery”, 1 Main St.', fake).length, 1);
  assert.equal(findIn('example-test-bakery', fake).length, 1);
  assert.equal(findIn('Example Bakery', fake).length, 0);
  assert.equal(normName("Example's Tacos"), 'examplestacos');
});

test('no prospect name appears in any text file in the repo', () => {
  const hits = [];
  for (const f of textFiles(ROOT)) {
    if (f.endsWith('prospect-hashes.json')) continue;
    const found = findIn(fs.readFileSync(f, 'utf8'), prints);
    if (found.length) hits.push(`${path.relative(ROOT, f)} (${found.length} match${found.length > 1 ? 'es' : ''})`);
  }
  assert.deepEqual(hits, [], 'prospect names found; move them to Supabase:\n' + hits.join('\n'));
});
