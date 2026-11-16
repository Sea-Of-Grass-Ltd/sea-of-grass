// New colour schemes for Warren Bakehouse, Hopwell, Hop Along and Burrow & Bough (Tristan approved, 2026-11-16).
// Spec: notes/bunny-world/critic/palettes/NOTES.md + proposed.png. Written before the build.
// Per shop: the hero ground, big type and accent match the spec roles; every colour the page paints is from that
// shop's set (alpha versions of a set colour count, for hairlines); no gradients; every text/background pair passes
// WCAG AA (4.5:1, or 3:1 for large text). Hop Along: the only yellow is the beer, small.
// Run:  cd tests && node --test bunnyworld/palettes-four.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const SHOPS = {
  'warren-bakehouse': {
    set: ['#FF9EC8', '#5A0C3C', '#FFF6EA', '#14433D', '#008168'],
    roles: [['body', 'bg', '#FFF6EA'], ['.hero', 'bg', '#FF9EC8'], ['.hero h1', 'fg', '#5A0C3C'], ['.hero .btn', 'bg', '#5A0C3C'], ['.cake', 'bg', '#14433D']],
  },
  'hopwell-chiro': {
    set: ['#D7D7CB', '#192830', '#E4E7DA', '#CDD3BB', '#55646B'],
    tap: '.spot[data-spot="neck"]',
    roles: [['body', 'bg', '#D7D7CB'], ['h1', 'fg', '#192830'], ['.mast .btn', 'bg', '#192830'], ['[data-group="long"] .chip', 'bg', '#E4E7DA'], ['#book', 'bg', '#E4E7DA']],
    pressed: ['[data-group="long"] .chip', '#CDD3BB'],
  },
  'hop-along': {
    set: ['#ACD084', '#0E0E0E', '#2B3D73', '#FEF7E6', '#FFD372'],
    roles: [['body', 'bg', '#FEF7E6'], ['.hero .h-title', 'bg', '#ACD084'], ['.hero .h-pic', 'bg', '#ACD084'], ['.hero h1', 'fg', '#0E0E0E'], ['.hero .btn:not(.ghost)', 'bg', '#2B3D73']],
    yellow: '#FFD372',
  },
  'burrow-and-bough': {
    set: ['#DBCBFD', '#220A33', '#9E39E5', '#F7F7F8', '#EFE3ED'],
    roles: [['body', 'bg', '#F7F7F8'], ['.hero', 'bg', '#DBCBFD'], ['.hero h1', 'fg', '#220A33'], ['.hero h1 em', 'fg', '#9E39E5'], ['.promo', 'bg', '#EFE3ED']],
  },
};
const WIDTHS = [390, 1440];

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbOf = s => (s.match(/[\d.]+/g) || []).map(Number);

// everything below runs in the page
function inspect({ set, yellow }) {
  const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
  const H = set.map(h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
  const inSet = c => { const [r, g, b, a = 1] = parse(c); if (a === 0) return true; return H.some(([R, G, B]) => Math.abs(R - r) <= 1 && Math.abs(G - g) <= 1 && Math.abs(B - b) <= 1); };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const id = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') + ` "${(e.innerText || '').trim().slice(0, 24)}"`;
  const shop = e => !e.closest('.demo, .want, [aria-hidden="true"], .sr, .sr-only') ;
  const off = [], grad = [], low = [], yellowAt = [];
  // the opaque colour behind an element; null when a picture or a gradient is behind it
  const behind = e => { let layers = [];
    for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n);
      if (c.backgroundImage !== 'none') return null;
      if (n !== e && n.querySelector(':scope > img, :scope > picture') && getComputedStyle(e).position === 'absolute') return null;
      const v = parse(c.backgroundColor); if (v.length && (v[3] ?? 1) > 0) { layers.push(v); if ((v[3] ?? 1) >= 1) break; } }
    if (!layers.length) return [255, 255, 255];
    let base = layers.pop().slice(0, 3); while (layers.length) { const [r, g, b, a] = layers.pop(); base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)]; } return base; };
  for (const e of document.querySelectorAll('body *')) {
    if (!shop(e)) continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const c = getComputedStyle(e); if (c.visibility === 'hidden' || +c.opacity === 0) continue;
    if (/gradient\(/.test(c.backgroundImage) && !e.closest('.p-paper, .sw')) grad.push(id(e)); // wrapping-paper patterns are the product
    const area = r.width * r.height;
    const bgv = parse(c.backgroundColor);
    if (bgv.length && (bgv[3] ?? 1) > 0 && !e.matches('img, picture, svg *, .can.open') && !inSet(c.backgroundColor)) // an open can takes its photo's own backdrop (the can art) off.push(`${id(e)} background ${c.backgroundColor}`);
    if (parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && !inSet(c.borderTopColor)) off.push(`${id(e)} border ${c.borderTopColor}`);
    const text = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || e.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea') || (e.matches('button') && e.innerText.trim());
    if (text && !inSet(c.color)) off.push(`${id(e)} text ${c.color}`);
    if (yellow) { const isY = v => v.length && (v[3] ?? 1) > 0 && Math.abs(v[0] - 255) <= 1 && Math.abs(v[1] - 211) <= 1 && Math.abs(v[2] - 114) <= 1;
      if (isY(bgv)) yellowAt.push({ el: id(e), area: Math.round(area), beer: !!e.closest('[data-beer]') });
      if (text && isY(parse(c.color))) yellowAt.push({ el: id(e) + ' (text)', area: 0, beer: !!e.closest('[data-beer]') }); }
    if (text && !e.disabled && !e.closest('[inert]')) {
      const bg = behind(e); if (!bg) continue;
      const fgv = parse(c.color), a = fgv[3] ?? 1, fg = [0, 1, 2].map(k => fgv[k] * a + bg[k] * (1 - a));
      const size = parseFloat(c.fontSize), bold = +c.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5, got = ratio(fg, bg);
      if (got < need) low.push(`${id(e)} ${got.toFixed(2)}:1 (needs ${need}) ${c.color} on rgb(${bg.map(Math.round)})`);
    }
  }
  return { off: [...new Set(off)], grad: [...new Set(grad)], low: [...new Set(low)], yellowAt };
}

for (const [slug, spec] of Object.entries(SHOPS)) {
  for (const w of WIDTHS) {
    test(`${slug} @ ${w}: hero roles, palette, no gradients, AA contrast`, async () => {
      const { ctx, page } = await site.open(`/bunnyworld/${slug}/`, w);
      try {
        if (spec.tap) { await page.locator(spec.tap).click(); await page.waitForTimeout(150); }
        const roles = await page.evaluate(roles => roles.map(([sel, k]) => { const e = document.querySelector(sel); if (!e) return null; const c = getComputedStyle(e); return k === 'bg' ? c.backgroundColor : c.color; }), spec.roles);
        const bad = [];
        spec.roles.forEach(([sel, k, want], i) => { const got = roles[i]; if (!got) { bad.push(`${sel}: not found`); return; } const [r, g, b] = rgbOf(got), [R, G, B] = hex(want); if (Math.abs(r - R) > 1 || Math.abs(g - G) > 1 || Math.abs(b - B) > 1) bad.push(`${sel} ${k} is ${got}, spec ${want}`); });
        if (spec.pressed) { const [sel, want] = spec.pressed; await page.locator(sel).first().click(); await page.waitForTimeout(400); const got = await page.locator(sel).first().evaluate(e => getComputedStyle(e).backgroundColor); const [r, g, b] = rgbOf(got), [R, G, B] = hex(want); if (Math.abs(r - R) > 1 || Math.abs(g - G) > 1 || Math.abs(b - B) > 1) bad.push(`pressed ${sel} is ${got}, spec ${want}`); }
        assert.deepEqual(bad, [], 'spec roles');
        const r = await page.evaluate(inspect, { set: spec.set, yellow: spec.yellow });
        assert.deepEqual(r.grad, [], 'gradients');
        assert.deepEqual(r.off.slice(0, 15), [], `colours outside the ${slug} set (${r.off.length})`);
        assert.deepEqual(r.low.slice(0, 15), [], `text below WCAG AA (${r.low.length})`);
        if (spec.yellow) {
          const notBeer = r.yellowAt.filter(y => !y.beer);
          assert.deepEqual(notBeer, [], 'yellow only on the beer');
          const total = r.yellowAt.reduce((s, y) => s + y.area, 0);
          assert.ok(total <= 40000, `the beer yellow stays small (${total}px²)`);
        }
      } finally { await ctx.close(); }
    });
  }
}

// Burrow & Bough: the gift finder's later steps (bundle, wrap) keep to the palette and pass AA too
test('burrow-and-bough @ 1440: the gift finder through to "Wrap it" keeps the palette and AA', async () => {
  const { ctx, page } = await site.open('/bunnyworld/burrow-and-bough/', 1440, { reducedMotion: 'reduce' });
  try {
    for (let i = 0; i < 4; i++) { await page.locator('#finder .f-opt:visible, #finder .btn:visible').first().click(); await page.waitForTimeout(300); }
    assert.match(await page.locator('#finder').innerText(), /Wrap it/i, 'reached the wrap step');
    const r = await page.evaluate(inspect, { set: SHOPS['burrow-and-bough'].set });
    assert.deepEqual(r.grad, [], 'gradients');
    assert.deepEqual(r.off.slice(0, 15), [], 'colours outside the set');
    assert.deepEqual(r.low.slice(0, 15), [], 'text below WCAG AA');
    const sh = await page.evaluate(() => [...document.querySelectorAll('#finder *')].filter(e => { if (!e.getBoundingClientRect().width) return false; const v = getComputedStyle(e).boxShadow; if (v === 'none') return false;
      return v.split(/,(?![^(]*\))/).some(l => (l.replace(/rgba?\([^)]*\)|inset/g, '').trim().split(/\s+/).map(parseFloat)[2] || 0) > 0); }).map(e => e.className));
    assert.deepEqual(sh, [], 'no blurred shadows in the wrap preview (1px rings are fine)');
  } finally { await ctx.close(); }
});

// Hop Along: the panels that open on tap (a tap's details, a can's sheet, the back-room steps) keep the palette and AA
test('hop-along @ 1440: opened panels keep the palette and AA', async () => {
  const { ctx, page } = await site.open('/bunnyworld/hop-along/', 1440, { reducedMotion: 'reduce' });
  try {
    const bad = [];
    const check = async label => { const r = await page.evaluate(inspect, { set: SHOPS['hop-along'].set, yellow: '#FFD372' });
      for (const k of ['grad', 'off', 'low']) for (const x of r[k].slice(0, 6)) bad.push(`${label}: ${k} ${x}`);
      for (const y of r.yellowAt.filter(y => !y.beer)) bad.push(`${label}: yellow off the beer ${y.el}`); };
    await page.locator('.taplist .more').first().click(); await page.waitForTimeout(300); await check('tap details');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const can = page.locator('#cans a, #cans button, .can').first(); if (await can.count()) { await can.click(); await page.waitForTimeout(300); await check('can sheet'); await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
    await page.locator('#party').scrollIntoViewIfNeeded(); const nx = page.locator('#party .q-next:visible').first(); if (await nx.count()) { await nx.click(); await page.waitForTimeout(300); }
    await check('back room');
    assert.deepEqual(bad, []);
  } finally { await ctx.close(); }
});

test('warren and hopwell @ 390: opened states keep the palette and AA', async () => {
  const bad = [];
  const run = async (slug, act) => { const { ctx, page } = await site.open(`/bunnyworld/${slug}/`, 390, { reducedMotion: 'reduce' });
    try { await act(page); await page.waitForTimeout(300); const r = await page.evaluate(inspect, { set: SHOPS[slug].set });
      for (const k of ['grad', 'off', 'low']) for (const x of r[k].slice(0, 6)) bad.push(`${slug}: ${k} ${x}`); } finally { await ctx.close(); } };
  await run('warren-bakehouse', async page => { await page.locator('main li [data-add]').first().click(); await page.locator('form[data-demo="WBC"] .q-opt').first().click(); });
  await run('hopwell-chiro', async page => { await page.locator('.spot[data-spot="low"]').click(); await page.locator('[data-group="long"] .chip').first().click(); await page.locator('[data-group="worse"] .chip').first().click(); await page.locator('#book .q-opt').first().click(); });
  assert.deepEqual(bad, []);
});
