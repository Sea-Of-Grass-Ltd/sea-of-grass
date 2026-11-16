// Sales copy voice test (Tristan, 2026-11-16): full, warm sentences; it should be obvious a real person is on the other end.
// Flags, in visible body copy: sentences under 6 words (telegraphic fragments) and em-dash asides.
// Pages: the Bunny World landing, the Sea of Grass home page and the Websites page. The made-up shop pages keep their own voices.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGES = process.env.COPY_PAGES ? process.env.COPY_PAGES.split(',') : ['/bunnyworld/', '/', '/preview/services/websites/'];
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// under 6, not 5: the example fragment "Twenty minutes on a call." is exactly five words
export function copyFindings() {
  const MIN_WORDS = 6, out = [];
  // body copy: paragraphs, list items, definitions, quotes and captions, set in a reading face
  const skip = 'nav, button, label, select, option, .demo, .credit, .sr, .sr-only, [aria-hidden="true"], [hidden], script, style, [data-voice="quote"], .tag, .chip, .kick, .mono, .eyebrow, cite, code';
  const prose = [...document.querySelectorAll('p, li, dd, blockquote, figcaption, summary + *')].filter(e => {
    if (e.closest(skip)) return false;
    if ([...e.children].some(c => /^(P|LI|UL|OL|DD)$/.test(c.tagName))) return false; // the leaf block holds the sentence
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || c.visibility === 'hidden') return false;
    if (c.textTransform === 'uppercase' || /mono/i.test(c.fontFamily)) return false; // labels, not prose
    return true;
  });
  // a block whose children are laid out as separate boxes (a bold head beside its line, grid or flex items) is read box by box,
  // so "Talk" + "Twenty minutes on a call." is two pieces, not one five-word sentence
  const pieces = e => {
    const d = getComputedStyle(e).display, laid = /flex|grid/.test(d);
    const kids = [...e.childNodes];
    if (!laid && !kids.some(k => k.nodeType === 1 && /block|flex|grid|list-item|table/.test(getComputedStyle(k).display))) return [e.innerText || ''];
    return kids.flatMap(k => k.nodeType === 3 ? [k.textContent] : k.nodeType === 1 && !k.closest(skip) ? pieces(k) : []);
  };
  for (const t of prose.flatMap(pieces).map(x => x.replace(/\s+/g, ' ').trim())) {
    if (!t) continue;
    if (/—|\s–\s/.test(t)) out.push({ rule: 'em-dash', text: t.slice(0, 140) });
    // a block that is one short label (a price, a name, "Cancel any month") is checked as a sentence only when it ends like one
    const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z“"$0-9])/).map(s => s.trim()).filter(Boolean);
    for (const s of sentences) {
      if (!/[.!?]["”’)]?$/.test(s)) continue; // not a sentence (a label or list item without a full stop)
      const words = s.replace(/[“”"()]/g, '').split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w));
      if (words.length < MIN_WORDS) out.push({ rule: 'short-sentence', text: s, in: t.slice(0, 90) });
    }
  }
  return out;
}

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
