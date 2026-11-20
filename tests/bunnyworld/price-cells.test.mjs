// Bunny World landing price strip (Tristan, 2026-11-16): each of the four price cells opens like the site's other
// dropdowns (the switching FAQ's accordion), shows that package in full, and has an Add to cart that really works.
// Journey: see the four prices → tap one → read everything about it → add it → the cart count goes up → checkout shows it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const URL = '/bunnyworld/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });
const txt = s => (s || '').replace(/\s+/g, ' ').trim();

// what each panel must say (the terms already on the site; nothing invented) and what its button adds
const PACKS = [
  { key: 'fix', price: /\$250/, must: [/from \$250/i, /after it’s done/i, /checked/i, /a few days/i, /flat fee/i, /before any work/i, /nothing up front/i], add: ['fix'] },
  { key: 'starter', price: /\$100/, must: [/\$100\/mo/i, /× 12/, /\$1,000 once/, /first year of care/i, /after #12/i, /30%/, /first draft/i, /no interest/i, /billed monthly/i, /rest at launch/i, /round of changes/i], add: ['starter-monthly', 'starter'] },
  { key: 'site', price: /\$2,500/, must: [/from \$2,500/i, /30%/, /first draft/i, /rest at launch/i, /fixed price in writing/i, /nothing to start/i, /domain, email, Google listing/i], add: ['bw-site-bunny-burritos'] },
  { key: 'care', price: /\$50/, must: [/\$50\/mo/i, /hosting/i, /security/i, /30 minutes/i, /bigger jobs/i, /cancel any month/i, /text Tristan or Bryce/i, /after launch/i], add: ['care'] },
];
const state = page => page.evaluate(() => [...document.querySelectorAll('#prices [aria-controls]')].map(b => {
  const p = document.getElementById(b.getAttribute('aria-controls')), r = p.getBoundingClientRect();
  return { id: b.id, exp: b.getAttribute('aria-expanded'), tag: b.tagName, open: r.height > 20 && !p.hidden && getComputedStyle(p).visibility !== 'hidden', text: p.innerText };
}));

for (const w of [390, 1440]) test(`price cells @ ${w}: each opens, shows its package in full, one open at a time`, async () => {
  const { ctx, page, errors } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    let s = await state(page);
    assert.equal(s.length, 4, 'four price cells are buttons that control a panel');
    assert.ok(s.every(x => x.tag === 'BUTTON' && x.exp === 'false' && !x.open), 'all closed to start');
    for (const [i, pk] of PACKS.entries()) {
      await page.locator('#prices [aria-controls]').nth(i).click();
      await page.waitForTimeout(150);
      s = await state(page);
      assert.deepEqual(s.map(x => x.exp), s.map((_, j) => String(j === i)), `only ${pk.key} is expanded`);
      assert.deepEqual(s.map(x => x.open), s.map((_, j) => j === i), `only ${pk.key}'s panel is open`);
      for (const re of pk.must) assert.match(txt(s[i].text), re, `${pk.key} says ${re}`);
    }
    // tapping the open one closes it
    await page.locator('#prices [aria-controls]').nth(3).click(); await page.waitForTimeout(150);
    assert.ok((await state(page)).every(x => x.exp === 'false' && !x.open));
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('price cells: keyboard works (Enter, Space, Escape) and focus stays put', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    const b = page.locator('#prices [aria-controls]').nth(1);
    await b.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    assert.equal(await b.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape'); await page.waitForTimeout(120);
    assert.equal(await b.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-controls')), await b.getAttribute('aria-controls'), 'focus back on the cell');
    await page.keyboard.press('Space'); await page.waitForTimeout(120);
    assert.equal(await b.getAttribute('aria-expanded'), 'true');
  } finally { await ctx.close(); }
});

test('price cells @ 390: the panel opens right under its own cell', async () => {
  const { ctx, page } = await site.open(URL, 390, { reducedMotion: 'reduce' });
  try {
    await page.locator('#prices [aria-controls]').nth(1).click(); await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const bs = [...document.querySelectorAll('#prices [aria-controls]')]; const p = document.getElementById(bs[1].getAttribute('aria-controls'));
      return { cell: bs[1].getBoundingClientRect().bottom, top: p.getBoundingClientRect().top, bottom: p.getBoundingClientRect().bottom, next: bs[2].getBoundingClientRect().top }; });
    assert.ok(Math.abs(r.top - r.cell) <= 2, `panel starts at the cell's bottom (${r.top} vs ${r.cell})`);
    assert.ok(r.next >= r.bottom - 1, 'the next cell comes after the panel');
  } finally { await ctx.close(); }
});

for (const w of [390, 1440]) test(`price cells @ ${w}: closed, the strip is exactly its cells (no layout jump)`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => { const s = document.querySelector('#prices'), bs = [...s.querySelectorAll('[aria-controls]')];
      return { strip: s.getBoundingClientRect().bottom, cells: Math.max(...bs.map(b => b.getBoundingClientRect().bottom)), vh: innerHeight }; });
    assert.ok(r.strip - r.cells <= 2, `closed panels take no room (${Math.round(r.strip - r.cells)}px)`);
    if (w >= 900) assert.ok(r.cells <= r.vh, 'all four prices still on the first screen'); // phones: the prices are their own page (mobile-hero.test.mjs)
  } finally { await ctx.close(); }
});

for (const pk of PACKS) test(`price cells: ${pk.key} adds ${pk.add.join(' / ')} to the cart, the count updates and checkout shows it`, async () => {
  const { ctx, page, errors } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    const i = PACKS.indexOf(pk);
    for (const id of pk.add) {
      await page.evaluate(() => localStorage.removeItem('sog-cart')); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
      await page.locator('#prices [aria-controls]').nth(i).click(); await page.waitForTimeout(150);
      const panel = page.locator(`#${await page.locator('#prices [aria-controls]').nth(i).getAttribute('aria-controls')}`);
      await panel.locator(`[data-add="${id}"]`).click();
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => ({ cart: JSON.parse(localStorage.getItem('sog-cart') || '{}'), n: document.querySelector('.shop-cartbtn .shop-n')?.textContent.trim() }));
      assert.deepEqual(r.cart, { [id]: 1 }, `${id} in the cart`);
      assert.equal(r.n, '1', 'cart count shows 1');
      const name = await page.evaluate(id => window.SOG_SHOP.products[id].name, id);
      await page.goto(site.base + '/preview/shop/checkout/', { waitUntil: 'load' });
      assert.match(txt(await page.locator('main').innerText()), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `checkout lists ${name}`);
      await page.goto(site.base + URL, { waitUntil: 'load' });
    }
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('price cells: the site panel adds the look of the shop chosen on Main Street', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    await page.evaluate(() => localStorage.removeItem('sog-cart'));
    await page.locator('#shops [role=tab]', { hasText: /barber/i }).click();
    await page.locator('#prices [aria-controls]').nth(2).click(); await page.waitForTimeout(150);
    const add = page.locator('#prices [data-add^="bw-site-"]');
    assert.equal(await add.getAttribute('data-add'), 'bw-site-hare-today');
    assert.match(txt(await add.locator('xpath=ancestor::*[@role="region"][1]').innerText()), /Hare Today/);
  } finally { await ctx.close(); }
});

test('prices match everywhere they appear: strip, panels, Buy menu and the shop', async () => {
  const { ctx, page } = await site.open(URL, 1440, { reducedMotion: 'reduce' });
  try {
    const r = await page.evaluate(() => {
      const P = window.SOG_SHOP.products, cells = [...document.querySelectorAll('#prices [aria-controls]')].map(b => b.innerText.replace(/\s+/g, ' '));
      const buy = [...document.querySelectorAll('.buy-row')].map(x => x.innerText.replace(/\s+/g, ' '));
      return { P: { fix: P.fix.price, starter: P.starter.price, monthly: P['starter-monthly'].price, site: P['bw-site-bunny-burritos'].price, care: P.care.price }, cells, buy };
    });
    assert.deepEqual(r.P, { fix: 250, starter: 1000, monthly: 100, site: 2500, care: 50 }); // the starter: $1,000 once with a year of care (Tristan, 2026-11-20)
    assert.match(r.cells[0], /\$250/); assert.match(r.cells[1], /\$100/); assert.match(r.cells[1], /\$1,000 once/); assert.match(r.cells[2], /\$2,500/); assert.match(r.cells[3], /\$50/);
    assert.ok(r.buy.some(t => /\$250/.test(t)) && r.buy.some(t => /\$1,000/.test(t)) && r.buy.some(t => /\$100/.test(t)) && r.buy.some(t => /\$2,500/.test(t)) && r.buy.some(t => /\$50/.test(t)), 'the Buy menu agrees');
  } finally { await ctx.close(); }
});

// The strip on the hero's unit (critic's spec, 2026-11-16, notes/bunny-world/critic/hero-ratio/NOTES.md "The price strip"):
// three styles only (name Inter 600 16px; price Inter 800 2u; small Inter 400 16px muted), "from" and "/mo" inline on the
// price's line, one terms line in every cell, centred cells on desktop, a plain plus (no circle, no purple), the open cell
// marked by a 4px ink bar, the panel a centred 28u column with hero-sized buttons.
const CELLS = [['Fix one broken thing', 'from', '$250', '', 'paid after it’s done'], ['A starter site', '', '$100', '/mo', '12 months, $1,200 total'],
  ['A small business site', 'from', '$2,500', '', '30% at first draft'], ['Care plan', '', '$50', '/mo', 'cancel any month']];
const strip = page => page.evaluate(() => {
  const u = document.querySelector('.lh-mark').getBoundingClientRect().height / 12.75;
  const st = e => { const c = getComputedStyle(e); return { fam: c.fontFamily, size: parseFloat(c.fontSize), weight: c.fontWeight, tt: c.textTransform, color: c.color, r: e.getBoundingClientRect() }; };
  return { u, soft: getComputedStyle(document.querySelector('.hero .lede')).color, ink: getComputedStyle(document.querySelector('.hero h1')).color,
    cells: [...document.querySelectorAll('#prices .pc')].map(b => ({ r: b.getBoundingClientRect(), name: st(b.querySelector('.pc-name')), nameT: b.querySelector('.pc-name').innerText.trim(),
      price: st(b.querySelector('.pc-price b')), line: b.querySelector('.pc-price').getBoundingClientRect(), priceT: b.querySelector('.pc-price b').innerText.trim(),
      pre: b.querySelector('.pc-pre') && { ...st(b.querySelector('.pc-pre')), t: b.querySelector('.pc-pre').innerText.trim() }, post: b.querySelector('.pc-post') && { ...st(b.querySelector('.pc-post')), t: b.querySelector('.pc-post').innerText.trim() },
      terms: st(b.querySelector('.pc-terms')), termsT: b.querySelector('.pc-terms').innerText.trim(),
      mark: (() => { const m = b.querySelector('.pc-ch'), c = getComputedStyle(m); return { w: m.getBoundingClientRect().width, border: c.borderTopWidth, bg: c.backgroundColor }; })(),
      bar: parseFloat(getComputedStyle(b, '::after').height) || 0, barShown: getComputedStyle(b, '::after').content !== 'none' && getComputedStyle(b, '::after').opacity !== '0' })) };
});
for (const w of [390, 1440]) test(`price strip @ ${w}: three styles on the hero's unit, "from" and "/mo" inline, one terms line per cell`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    const s = await strip(page), near = (a, b, t = 1) => Math.abs(a - b) <= t;
    s.cells.forEach((c, i) => {
      const [name, pre, price, post, terms] = CELLS[i];
      assert.equal(c.nameT, name); assert.equal(c.priceT, price); assert.equal(c.termsT, terms);
      assert.equal(c.pre ? c.pre.t : '', pre); assert.equal(c.post ? c.post.t : '', post);
      assert.ok(/Inter/.test(c.name.fam) && !/Mono/.test(c.name.fam) && c.name.tt === 'none', `${name}: name in the lockup's sans, sentence case`);
      assert.ok(near(c.name.size, 16) && c.name.weight === '600', `${name}: name 16px 600 (${c.name.size} ${c.name.weight})`);
      assert.ok(near(c.price.size, Math.max(32, 2 * s.u)) && c.price.weight === '800', `${name}: price 2u, 800 (${c.price.size} ${c.price.weight})`);
      for (const sm of [c.terms, c.pre, c.post].filter(Boolean)) assert.ok(near(sm.size, 16) && sm.weight === '400' && sm.color === s.soft, `${name}: small style 16px 400 muted`);
      for (const sm of [c.pre, c.post].filter(Boolean)) assert.ok(sm.r.top >= c.price.r.top - 2 && sm.r.bottom <= c.price.r.bottom + 2, `${name}: "${sm.t}" sits on the price's line`);
      assert.ok(c.mark.w <= 16 && c.mark.border === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(c.mark.bg), `${name}: a plain plus, no circle`);
      if (w >= 900) { const mid = (c.r.left + c.r.right) / 2; for (const r of [c.name.r, c.line, c.terms.r]) assert.ok(near((r.left + r.right) / 2, mid, 2), `${name}: centred in its cell`); /* the price line ("from $250") is centred as one unit */ }
      else { assert.ok(c.name.r.left < c.price.r.left && c.r.height <= 96, `${name}: a row, name left and price right (${Math.round(c.r.height)}px tall)`); }
    });
  } finally { await ctx.close(); }
});
for (const w of [390, 1440]) test(`price strip @ ${w}: the open cell is marked by an ink bar or a minus, the panel is hero-sized`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    await page.locator('#pc-starter').click(); await page.waitForTimeout(200);
    const s = await strip(page);
    if (w >= 900) { assert.ok(s.cells[1].barShown && Math.abs(s.cells[1].bar - 4) <= 0.5, 'a 4px bar under the open cell'); assert.ok(!s.cells[0].barShown || s.cells[0].bar === 0, 'no bar under closed cells'); }
    const r = await page.evaluate(() => { const p = document.querySelector('#pc-starter-a .pc-in'), b = p.getBoundingClientRect(), s = document.querySelector('#prices').getBoundingClientRect();
      const btn = [...p.querySelectorAll('.pc-add')].map(x => ({ h: x.getBoundingClientRect().height, f: parseFloat(getComputedStyle(x).fontSize) }));
      const para = getComputedStyle(p.querySelector('li')); return { w: b.width, mid: (b.left + b.right) / 2, smid: (s.left + s.right) / 2, btn, pf: parseFloat(para.fontSize), pw: para.fontWeight }; });
    if (w >= 900) { assert.ok(r.w <= 28 * s.u + 2, `panel column 28u wide (${r.w})`); assert.ok(Math.abs(r.mid - r.smid) <= 2, 'centred under the strip'); }
    assert.ok(r.btn.every(b => Math.abs(b.h - 48) <= 1 && b.f === 16), `buttons match the hero button: ${JSON.stringify(r.btn)}`);
    assert.ok(r.pf === 16 && r.pw === '400', 'panel text in the small style');
  } finally { await ctx.close(); }
});

// Tristan (2026-11-16, phone review): "it should be quickly readable as a graphic card, that's what people like".
// Each panel: "What you get" as 3-6 short icon bullets (one line each on a phone), and "How you pay" as option chips,
// two side by side for the starter (monthly or once), one for the others. No paragraphs.
const CARD = { fix: 1, starter: 2, site: 1, care: 1 };
for (const w of [360, 390, 1440]) test(`price cards @ ${w}: a quick graphic card, short icon bullets and pay chips, no paragraphs`, async () => {
  const { ctx, page } = await site.open(URL, w, { reducedMotion: 'reduce' });
  try {
    for (const [k, chips] of Object.entries(CARD)) {
      await page.locator(`#pc-${k}`).click(); await page.waitForTimeout(150);
      const r = await page.evaluate(k => { const p = document.querySelector(`#pc-${k}-a .pc-in`);
        const heads = [...p.querySelectorAll('.pc-k')].map(h => h.innerText.trim());
        const li = [...p.querySelectorAll('.pc-get li')].map(l => { const c = getComputedStyle(l); return { t: l.innerText.trim(), h: l.getBoundingClientRect().height, lh: parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.3, icon: getComputedStyle(l, '::before').content !== 'none' }; });
        const opts = [...p.querySelectorAll('.pc-opt')].map(o => ({ top: Math.round(o.getBoundingClientRect().top), w: o.getBoundingClientRect().width, add: !!o.querySelector('[data-add]'),
          lines: [...o.querySelectorAll('.pc-opt-l li')].map(l => ({ h: l.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(l).lineHeight) })) }));
        const paras = [...p.querySelectorAll('p')].filter(x => !x.classList.contains('pc-note') && x.getBoundingClientRect().height > 0).length;
        return { heads, li, opts, paras }; }, k);
      assert.deepEqual(r.heads, ['What you get', 'How you pay'], `${k}: two labelled parts`);
      assert.ok(r.li.length >= 3 && r.li.length <= 6, `${k}: 3-6 bullets (${r.li.length})`);
      for (const l of r.li) { assert.ok(l.icon, `${k}: "${l.t}" has its icon`); assert.ok(l.h <= l.lh * 1.5, `${k}: "${l.t}" fits one line (${Math.round(l.h)}px)`); assert.ok(l.t.split(/\s+/).length <= 8, `${k}: "${l.t}" is a few words`); }
      assert.equal(r.paras, 0, `${k}: no paragraphs`);
      assert.equal(r.opts.length, chips, `${k}: ${chips} pay option(s)`);
      assert.ok(r.opts.every(o => o.add), `${k}: each option has its Add to cart`);
      if (chips === 2) assert.equal(r.opts[0].top, r.opts[1].top, `${k}: the two options sit side by side`);
      for (const o of r.opts) for (const l of o.lines) assert.ok(l.h <= l.lh * 1.5, `${k}: every chip line fits one line`);
    }
  } finally { await ctx.close(); }
});
