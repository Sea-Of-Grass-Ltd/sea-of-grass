// Prospect-name guard. The walk-in list (business names, addresses, site problems) lives only in Supabase, behind
// sign-in. This repo is public, so it must never contain a prospect's name, not even in this test. prospect-hashes.json
// holds one-way fingerprints instead: a fast 32-bit rolling hash to find candidates, and SHA-256 to confirm them.
// Names are compared lowercased with everything but a-z and 0-9 removed ("Example's Tacos" -> "examplestacos").
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const B = 131;
export const normName = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
export function roll(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, B) + s.charCodeAt(i)) >>> 0; return h; }
export const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// fingerprint a list of names (one per line) -> { "<length>": [[roll, sha256], ...] }
export function fingerprint(names) {
  const out = {};
  for (const n of new Set(names.map(normName).filter(n => n.length >= 6))) (out[n.length] ||= []).push([roll(n), sha(n)]);
  return out;
}

// every window of `text` (normalised) whose fingerprint matches -> list of matched lengths
export function findIn(text, prints) {
  const t = normName(text), hits = [];
  for (const [lenS, list] of Object.entries(prints)) {
    const L = +lenS; if (t.length < L) continue;
    const rolls = new Map(list.map(([r, s]) => [r, s]));
    let BL = 1; for (let i = 0; i < L - 1; i++) BL = Math.imul(BL, B) >>> 0;
    let h = roll(t.slice(0, L));
    for (let i = 0; ; i++) {
      const s = rolls.get(h);
      if (s && sha(t.slice(i, i + L)) === s) hits.push({ at: i, length: L });
      if (i + L >= t.length) break;
      h = (Math.imul((h - Math.imul(t.charCodeAt(i), BL)) >>> 0, B) + t.charCodeAt(i + L)) >>> 0;
    }
  }
  return hits;
}

const TEXT = /\.(html?|m?js|css|md|json|txt|svg|xml|ya?ml|csv|webmanifest)$/i;
export function textFiles(root, skip = new Set(['node_modules', '.git'])) {
  const out = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (skip.has(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (TEXT.test(e.name)) out.push(p); } })(root);
  return out;
}

// CLI: node hermes/prospects.mjs < names.txt > hermes/prospect-hashes.json   (names never touch the repo)
if (process.argv[1] && import.meta.url === 'file://' + path.resolve(process.argv[1])) {
  const names = fs.readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  process.stdout.write(JSON.stringify({ note: 'One-way fingerprints of walk-in prospect names. See prospects.mjs.', count: names.length, prints: fingerprint(names) }, null, 1) + '\n');
}
