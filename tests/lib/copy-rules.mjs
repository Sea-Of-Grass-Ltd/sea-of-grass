// Copy rules shared by the copy tests. Both functions run inside the page (page.evaluate), so they must stay self-contained.

// Sales copy voice (Tristan, 2026-11-16): sentences under 6 words (telegraphic fragments) and em-dash asides, in visible body copy.
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
    const sentences = t.split(/(?<!\b(?:Dr|Mr|Mrs|Ms|St|Rd|Ave|Mt|No)\.)(?<=[.!?])\s+(?=[A-Z“"$0-9])/).map(s => s.trim()).filter(Boolean);
    for (const s of sentences) {
      if (!/[.!?]["”’)]?$/.test(s)) continue; // not a sentence (a label or list item without a full stop)
      const words = s.replace(/[“”"()]/g, '').split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w));
      if (words.length < MIN_WORDS) out.push({ rule: 'short-sentence', text: s, in: t.slice(0, 90) });
    }
  }
  return out;
}

// The critic's section C and B9 (notes/bunny-world/critic/REVIEW.md), for the shop pages:
// three-beat lists, "not X but Y", reviews about the website, invented review counts and stats, numerals set in a serif display face,
// and headings in one set that don't share a form. Reads every visible line of shop copy, quotes and headings included.
export function shopCopyFindings() {
  const out = [];
  const skip = '.demo, .credit, .sr, .sr-only, [aria-hidden="true"], [hidden], script, style, noscript, code, svg';
  const shown = e => { if (e.closest(skip + ', .want')) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden'; };
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const sentencesOf = t => t.split(/(?<!\b(?:Dr|Mr|Mrs|Ms|St|Rd|Ave|Mt|No)\.)(?<=[.!?])\s+(?=[A-Z“"$0-9])/).map(s => s.trim()).filter(Boolean);
  const words = s => s.replace(/[“”"()]/g, '').split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w));

  // every visible text block: the nearest element holding text directly
  const blocks = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.textContent.trim()) continue;
    let e = n.parentElement;
    while (e && e !== document.body && /^(inline|contents)$/.test(getComputedStyle(e).display) && !/^(BUTTON|A|LABEL|Q)$/.test(e.tagName)) e = e.parentElement;
    if (e && shown(e)) blocks.add(e);
  }
  const lines = [...blocks].map(e => ({ e, t: clean(e.innerText) })).filter(x => x.t);

  for (const { e, t } of lines) {
    for (const s of sentencesOf(t)) {
      const body = s.replace(/[.!?]["”’)]*$/, '');
      // three-beat: three or more comma beats of one to three words, no subject ("Flags, smiles, sunscreen." "Honest work, printed prices, real coffee.")
      const beats = body.split(/\s*,\s*(?:and\s+|or\s+)?/).filter(Boolean);
      if (/[.!?]["”’)]*$/.test(s) && beats.length >= 3 && beats.slice(0, -1).every(b => words(b).length <= 3) && !/^(we|i|you|it|they|he|she|our|this|that|there)\b/i.test(beats[0])
          && !/\b(is|are|was|were|has|have)\b/i.test(beats[0]) && !beats.slice(1).some(b => /^then\b/i.test(b))
          && !beats.every(b => /^([A-Z][a-z]+\s?)+$/.test(b.replace(/^(and|or)\s+/, '').replace(/\s(and|or)\s/g, ' '))))
        out.push({ rule: 'three-beat', text: s });
      // "not X, but Y" and its cousins
      if (/\bnot (just|only|merely)\b|\bnot\b[^.!?]{0,60}\bbut\b|,\s*not\s+\w|\b(isn['’]t|aren['’]t)\b[^.!?]{0,40}[,;]\s*(it['’]s|they['’]re)\b/i.test(s))
        out.push({ rule: 'not-x-but-y', text: s });
    }
    if (false && /\b\d(\.\d)?\s*(\/|out of)\s*5\b|\b\d[\d,]*\+?\s*(google |five-star |5-star )?reviews\b|\b\d{1,3}(,\d{3})+\+?\s+(yards|customers|clients|cars|haircuts|cuts|families|patients|homes|visitors|loaves)\b/i.test(t))
      out.push({ rule: 'invented-stat', text: t.slice(0, 120) });
    // numerals in a serif display face (big, in Fraunces, Young Serif, Newsreader or another serif)
    const c = getComputedStyle(e), first = c.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const own = [...e.childNodes].filter(k => k.nodeType === 3).map(k => k.textContent).join('');
    if (/\d/.test(own) && parseFloat(c.fontSize) >= 24 && /^(Fraunces|Young Serif|Newsreader|Georgia|Times|Times New Roman|serif|Playfair|DM Serif|Libre Baskerville|EB Garamond|Cormorant)/i.test(first))
      out.push({ rule: 'serif-numerals', text: `${own.trim().slice(0, 60)} (${first} ${c.fontSize})` });
  }

  // invented review counts and big stats presented as fact (the page read as one line, so a stat row "1,400" over "yards and lots" counts)
  const page = clean(document.body.innerText);
  for (const m of page.matchAll(/\b\d(\.\d)?\s*(\/|out of)\s*5\b[^.]{0,20}|\b\d[\d,]*\+?\s*(google |five-star |5-star )?reviews\b|\b\d{1,3}(,\d{3})+\+?\s+(yards|customers|clients|cars|haircuts|cuts|families|patients|homes|visitors|loaves)\b/gi))
    out.push({ rule: 'invented-stat', text: m[0] });

  // reviews that describe the website instead of the visit
  const quotes = [...document.querySelectorAll('blockquote, q, [data-voice="quote"], .review, .quote, .reviews li')].filter(e => !e.closest(skip) && e.getClientRects().length);
  for (const q of quotes) {
    const t = clean(q.innerText);
    if (/\b(tapped|tap|clicked|click|scroll(ed)?|the form|website|web site|online|the app|button|the page|the site|the slot)\b/i.test(t)) out.push({ rule: 'review-about-website', text: t.slice(0, 140) });
  }

  // headings in one set share one form: same first-letter case, and all questions or none
  const form = h => clean(h.innerText);
  const sets = [];
  sets.push({ name: 'section titles', hs: [...document.querySelectorAll('main h2, body > section h2, h2')].filter(shown) });
  const byParent = new Map();
  for (const h of [...document.querySelectorAll('h3, h4')].filter(shown)) {
    const key = h.parentElement?.parentElement; if (!key) continue;
    (byParent.get(key) || byParent.set(key, []).get(key)).push(h);
  }
  for (const hs of byParent.values()) if (hs.length >= 3 && hs.every(h => h.tagName === hs[0].tagName)) sets.push({ name: 'card titles', hs });
  for (const { name, hs } of sets) {
    const ts = [...new Set(hs.map(form))].filter(t => /^[A-Za-z]/.test(t));
    if (ts.length < 2) continue;
    const lower = ts.filter(t => /^[a-z]/.test(t)), upper = ts.filter(t => /^[A-Z]/.test(t));
    if (lower.length && upper.length) out.push({ rule: 'mixed-title-case', text: `${name}: ${lower.slice(0, 3).join(' | ')} beside ${upper.slice(0, 3).join(' | ')}` });
    const qs = ts.filter(t => /\?$/.test(t)), dots = ts.filter(t => /\.$/.test(t));
    if (name !== 'section titles' && qs.length && qs.length < ts.length) out.push({ rule: 'mixed-title-questions', text: `${name}: ${qs.slice(0, 2).join(' | ')} beside ${ts.filter(t => !/\?$/.test(t)).slice(0, 3).join(' | ')}` });
    if (dots.length && dots.length < ts.length - qs.length) out.push({ rule: 'mixed-title-stops', text: `${name}: ${dots.slice(0, 2).join(' | ')} beside ${ts.filter(t => !/[.?]$/.test(t)).slice(0, 3).join(' | ')}` });
  }
  // short labels in one set share one form ("14 years", "9 years" ... not "22 years, and counting")
  const labelSets = new Map();
  for (const e of [...document.querySelectorAll('small, span, b, strong, em')].filter(shown)) {
    const p = e.parentElement, gp = p?.parentElement; if (!gp) continue;
    const key = gp; const k2 = `${p.tagName}.${p.className}>${e.tagName}.${e.className}`;
    const m = labelSets.get(key) || labelSets.set(key, new Map()).get(key);
    (m.get(k2) || m.set(k2, []).get(k2)).push(clean(e.innerText));
  }
  for (const m of labelSets.values()) for (const ts of m.values()) {
    if (ts.length < 3 || !ts.every(t => /^\d/.test(t))) continue;
    const shape = t => t.replace(/[\d,.:$%]+/g, '#').toLowerCase();
    if (new Set(ts.map(shape)).size > 1 && ts.every(t => t.split(' ').length <= 6)) out.push({ rule: 'mixed-label-form', text: ts.join(' | ') });
  }
  return out;
}
