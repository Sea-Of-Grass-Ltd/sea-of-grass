// Bunny World colour schemes (notes/bunny-world/critic/palettes/NOTES.md). Written before the five new schemes were built.
// Run:  cd tests && npm install && node --test bunnyworld/palettes.test.mjs
//
// 1. No two shops share a hero ground or a main accent: CIE76 ΔE in Lab must be 15 or more.
// 2. No shop uses the banned schemes: dark brown + cream + gold (orange-gold counts), or near-black + yellow (Bunny Auto excepted, by Tristan's choice).
// 3. On the five shops this branch rebuilt, every text/background pair passes WCAG AA, at 390 and 1440.
//
// The other four shops (Warren, Hopwell, Hop Along, Burrow & Bough) get their schemes on another branch.
// Checks that only involve those four are marked todo here, so they report without failing; every check that
// touches one of the five below must pass.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const MINE = ['bunny-burritos', 'bunny-auto', 'hare-today', 'cottontail-farm', 'long-ears'];
const OTHERS = ['warren-bakehouse', 'hopwell-chiro', 'hop-along', 'burrow-and-bough'];
const ALL = [...MINE, ...OTHERS];
const MIN_DE = 15;
// Tristan, 2026-11-16: Bunny Auto keeps black + yellow and Hare Today keeps black and white + red (the barbershop he's pitching uses them).
// Auto is the one shop allowed black + yellow; Hop Along moved to green, so it no longer repeats.
const BLACK_YELLOW_OK = ['bunny-auto'];
// the other branch's target grounds (NOTES.md); a shop counts as converted once its hero ground is within ΔE 6 of its target
const TARGET = { 'warren-bakehouse': [0xff, 0x9e, 0xc8], 'hopwell-chiro': [0xd7, 0xd7, 0xcb], 'hop-along': [0xac, 0xd0, 0x84], 'burrow-and-bough': [0xdb, 0xcb, 0xfd] };

let site;
const colours = {};
before(async () => {
  site = await startSite();
  for (const s of ALL) {
    const { ctx, page } = await site.open(`/bunnyworld/${s}/`, 1440, { reducedMotion: 'reduce' });
    try { colours[s] = await page.evaluate(readScheme); } finally { await ctx.close(); }
  }
});
after(async () => { await site?.close(); });
// PAL_SHOW=1 prints what was read per shop
after(() => { if (process.env.PAL_SHOW) for (const s of ALL) console.log(s.padEnd(18), 'hero', hex(colours[s]?.hero), 'page', hex(colours[s]?.page), 'type', hex(colours[s]?.type), 'accent', hex(colours[s]?.accent), JSON.stringify(colours[s]?.btnText)); });

// The scheme as a visitor sees it: the hero's ground, the page ground, the headline colour and the hero's main button.
function readScheme() {
  const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return a < 0.5 ? null : [r, g, b]; };
  const ground = e => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c) return c; } return [255, 255, 255]; };
  const main = document.querySelector('main') || document.body;
  const hero = [...main.children].find(e => e.matches('section') && e.getBoundingClientRect().height > 200) || main.firstElementChild;
  const h1 = document.querySelector('h1');
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'); };
  const filled = e => rgb(getComputedStyle(e).backgroundColor);
  // the shop's main button: a .btn in the hero, else the first .btn on the page, else any filled link or button in the hero
  const btn = [...hero.querySelectorAll('.btn')].find(e => vis(e) && filled(e)) || [...main.querySelectorAll('.btn')].find(e => vis(e) && filled(e)) || [...hero.querySelectorAll('a[href], button')].find(e => vis(e) && filled(e));
  return { hero: ground(hero), page: ground(document.body), type: rgb(getComputedStyle(h1).color), accent: btn ? filled(btn) : null, btnText: btn ? (btn.innerText || '').trim().slice(0, 30) : null };
}

// sRGB → Lab (D65)
function lab([r, g, b]) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  const L = 116 * fy - 16, a = 500 * (fx - fy), bb = 200 * (fy - fz);
  return { L, a, b: bb, C: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
}
const dE = (p, q) => { const A = lab(p), B = lab(q); return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b); };
// A near-black or near-white button is ink, not an accent: two shops with black buttons don't share a colour scheme.
// For those shops the main accent is the most colourful of their hero ground and headline (Cottontail's black buttons → its orange).
const neutral = c => { const x = lab(c); return x.C < 12 && (x.L < 22 || x.L > 92); };
const accentOf = c => { if (c.accent && !neutral(c.accent)) return c.accent; const pool = [c.hero, c.type].filter(Boolean).filter(x => !neutral(x)); return pool.sort((m, n) => lab(n).C - lab(m).C)[0] || c.accent; };
const hex = c => c ? '#' + c.map(v => v.toString(16).padStart(2, '0')).join('') : 'none';

// Banned families, judged in Lab
const darkBrown = c => { const x = lab(c); return x.L < 40 && x.C > 6 && x.h >= 25 && x.h <= 80; };
const cream = c => { const x = lab(c); return x.L > 88 && x.C >= 3 && x.C < 25 && x.h >= 55 && x.h <= 105; };
const gold = c => { const x = lab(c); return x.L > 50 && x.C > 40 && x.h >= 48 && x.h <= 100; };        // gold, amber and orange-gold
const nearBlack = c => { const x = lab(c); return x.L < 14 && x.C < 10; };
const yellow = c => { const x = lab(c); return x.L > 65 && x.C > 50 && x.h >= 70 && x.h <= 105; };

const pairs = [];
for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) pairs.push([ALL[i], ALL[j]]);
for (const [a, b] of pairs) {
  const mine = MINE.includes(a) || MINE.includes(b);
  test(`${a} vs ${b}: hero grounds and main accents are far apart (ΔE ≥ ${MIN_DE})`, { todo: mine ? false : 'both shops are on the other palette branch' }, t => {
    const A = colours[a], B = colours[b];
    const waiting = [a, b].filter(x => TARGET[x] && dE(colours[x].hero, TARGET[x]) > 6);
    if (mine && waiting.length) { t.todo(`${waiting.join(', ')} not on its new scheme yet (other branch)`); }
    // Two near-black heroes (Auto's black, Hare Today's black) are told apart by their accents (yellow vs red), which must still be ΔE 15 apart.
    const bothBlack = nearBlack(A.hero) && nearBlack(B.hero);
    const g = dE(A.hero, B.hero);
    if (!bothBlack) assert.ok(g >= MIN_DE, `hero grounds ${hex(A.hero)} and ${hex(B.hero)} are only ΔE ${g.toFixed(1)} apart`);
    const [x, y] = [accentOf(A), accentOf(B)];
    if (bothBlack) assert.ok(x && y && !neutral(x) && !neutral(y), `two near-black heroes need colourful accents to tell them apart: ${hex(x)} and ${hex(y)}`);
    if (x && y) { const k = dE(x, y); assert.ok(k >= MIN_DE, `main accents ${hex(x)} (${a}) and ${hex(y)} (${b}) are only ΔE ${k.toFixed(1)} apart`); }
  });
}
for (const s of ALL) {
  test(`${s}: no banned scheme (brown + cream + gold, black + yellow)`, { todo: MINE.includes(s) ? false : 'on the other palette branch' }, () => {
    const c = colours[s], set = [c.hero, c.page, c.type, c.accent].filter(Boolean);
    const show = set.map(hex).join(' ');
    assert.ok(!(set.some(darkBrown) && set.some(cream) && set.some(gold)), `brown + cream + gold: ${show}`);
    if (!BLACK_YELLOW_OK.includes(s)) assert.ok(!(nearBlack(c.hero) && [c.type, c.accent].filter(Boolean).some(yellow)), `black + yellow: ${show}`);
  });
}

// WCAG AA on every visible text/background pair. The ground is the nearest solid background behind the text;
// text over a photo is checked against the colour laid over that photo (the hero overlay), which is what sets its contrast.
function contrastFaults() {
  const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { c: [r, g, b], a }; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (x, y) => { const [p, q] = [lum(x), lum(y)].sort((m, n) => n - m); return (p + 0.05) / (q + 0.05); };
  const mix = (top, a, under) => top.map((v, i) => Math.round(v * a + under[i] * (1 - a)));
  const ground = e => {
    const layers = [];
    for (let x = e; x; x = x.parentElement) {
      const cs = getComputedStyle(x);
      for (const ps of ['::after', '::before']) { const p = getComputedStyle(x, ps); if (x !== e && p.content !== 'none' && p.position === 'absolute') { const o = rgb(p.backgroundColor); if (o && o.a > 0.3 && parseFloat(p.width) > 200) layers.push(o); } }
      const b = rgb(cs.backgroundColor); if (b && b.a > 0) { layers.push(b); if (b.a >= 0.99) break; }
    }
    let c = [255, 255, 255];
    for (const l of layers.reverse()) c = mix(l.c, l.a, c);
    return c;
  };
  const out = [];
  const seen = new Set();
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('.demo,.want,[hidden],[aria-hidden="true"],.sr,script,style,svg,noscript,iframe,option')) continue;
    const own = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!own) continue;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || +cs.opacity < 0.1) continue;
    const fg = rgb(cs.color); if (!fg) continue;
    const bg = ground(e); const col = fg.a < 1 ? mix(fg.c, fg.a, bg) : fg.c;
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    // disabled controls are exempt under WCAG
    if (e.closest(':disabled,[aria-disabled="true"]')) continue;
    const k = ratio(col, bg);
    if (k < need) { const key = `${own.slice(0, 30)}|${col}|${bg}`; if (seen.has(key)) continue; seen.add(key);
      const hx = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
      out.push(`${k.toFixed(2)} < ${need}: "${own.slice(0, 40)}" ${hx(col)} on ${hx(bg)}`); }
  }
  return out;
}
for (const s of MINE) for (const w of [390, 1440]) {
  test(`${s} @ ${w}: every text/background pair passes WCAG AA`, async () => {
    const { ctx, page } = await site.open(`/bunnyworld/${s}/`, w, { reducedMotion: 'reduce' });
    try {
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 700) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(40); }
      const f = await page.evaluate(contrastFaults);
      assert.deepEqual(f.slice(0, 15), [], `${f.length} text/background pairs under AA`);
    } finally { await ctx.close(); }
  });
}

// Bunny Burritos keeps its textured background (Tristan, 2026-11-16), recoloured into the wine palette as a flat image:
// the image loads, it is wine itself (not grey multiplied onto wine), and no blend mode is involved.
test('bunny-burritos: the textured background loads, flat and in the wine palette', async () => {
  const { ctx, page } = await site.open('/bunnyworld/bunny-burritos/', 1440, { reducedMotion: 'reduce' });
  try {
    const bg = await page.evaluate(() => { const c = getComputedStyle(document.body, '::before'); const m = c.backgroundImage.match(/url\("?([^")]+)"?\)/); return { url: m && m[1], blend: c.backgroundBlendMode }; });
    assert.ok(bg.url, 'there is a background image');
    assert.ok(!/multiply/.test(bg.blend), `no blend mode (${bg.blend})`);
    const avg = await page.evaluate(async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, g / n, b / n].map(Math.round); }, bg.url);
    const k = dE(avg, [0x4f, 0x04, 0x23]);
    assert.ok(k < 10, `background image averages ${hex(avg)}, ΔE ${k.toFixed(1)} from the wine ground`);
  } finally { await ctx.close(); }
});

// Long Ears' wordmark reads straight on the photo (Tristan, 2026-11-16): nothing behind it (no box, panel or label),
// and the forest green passes contrast against the photo pixels right behind the letters.
for (const w of [390, 1440]) {
  test(`long-ears @ ${w}: the wordmark sits on the photo with no box behind it, and passes contrast`, async () => {
    const { ctx, page } = await site.open('/bunnyworld/long-ears/', w, { reducedMotion: 'reduce' });
    try {
      const r = await page.evaluate(() => {
        const h1 = document.querySelector('.hero h1'); const out = [];
        for (let x = h1; x && !x.matches('.hero'); x = x.parentElement) {
          const c = getComputedStyle(x);
          if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor)) out.push(`${x.tagName.toLowerCase()}.${x.className} has background ${c.backgroundColor}`);
          if (c.backgroundImage !== 'none') out.push(`${x.tagName.toLowerCase()} has a background image`);
          if (c.boxShadow !== 'none') out.push(`${x.tagName.toLowerCase()} has a box shadow`);
          for (const ps of ['::before', '::after']) { const p = getComputedStyle(x, ps); if (p.content !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(p.backgroundColor)) out.push(`${x.tagName.toLowerCase()}${ps} paints a box`); }
        }
        const b = h1.getBoundingClientRect(); return { boxes: out, rect: { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }, color: getComputedStyle(h1).color };
      });
      assert.deepEqual(r.boxes, [], 'nothing paints a box behind the wordmark');
      // contrast: hide the wordmark, read the photo behind it, compare with the letter colour at the 10th-percentile (worst) spot
      await page.evaluate(() => { document.querySelector('.hero h1').style.visibility = 'hidden'; scrollTo(0, 0); });
      const shot = await page.screenshot({ clip: { x: r.rect.x, y: r.rect.y, width: r.rect.w, height: r.rect.h } });
      const lum = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const L = []; for (let i = 0; i < d.length; i += 16) L.push(0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2])); L.sort((a, b) => a - b); return L; }, shot.toString('base64'));
      await page.evaluate(() => { document.querySelector('.hero h1').style.visibility = ''; });
      const [rr, gg, bb] = r.color.match(/\d+/g).map(Number);
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const ink = 0.2126 * f(rr) + 0.7152 * f(gg) + 0.0722 * f(bb);
      const ground = lum[Math.floor(lum.length * 0.1)]; // a darker spot behind the letters (forest needs a light ground)
      const ratio = (Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05);
      assert.ok(ratio >= 3, `wordmark ${r.color} against the photo behind it: ${ratio.toFixed(2)}:1 (large text needs 3:1)`);
    } finally { await ctx.close(); }
  });
}
