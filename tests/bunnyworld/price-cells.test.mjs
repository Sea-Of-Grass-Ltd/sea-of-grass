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
  { key: 'fix', price: /\$250/, must: [/from \$250/i, /after it’s done/i, /checked/i], add: ['fix'] },
  { key: 'starter', price: /\$100/, must: [/\$100 a month/i, /12 months|12 payments/i, /\$1,200/, /payment 12/i, /30%/, /first draft/i], add: ['starter-monthly', 'starter'] },
  { key: 'site', price: /\$2,000/, must: [/from \$2,000/i, /30%/, /first draft/i, /the rest at launch/i], add: ['bw-site-bunny-burritos'] },
  { key: 'care', price: /\$50/, must: [/\$50 a month/i, /hosting/i, /security/i, /30 minutes/i, /bigger jobs/i, /cancel any month/i], add: ['care'] },
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
    assert.ok(r.cells <= r.vh, 'all four prices still on the first screen');
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
    assert.deepEqual(r.P, { fix: 250, starter: 1200, monthly: 100, site: 2000, care: 50 });
    assert.match(r.cells[0], /\$250/); assert.match(r.cells[1], /\$100/); assert.match(r.cells[1], /\$1,200/); assert.match(r.cells[2], /\$2,000/); assert.match(r.cells[3], /\$50/);
    assert.ok(r.buy.some(t => /\$250/.test(t)) && r.buy.some(t => /\$1,200/.test(t)) && r.buy.some(t => /\$100/.test(t)) && r.buy.some(t => /\$2,000/.test(t)) && r.buy.some(t => /\$50/.test(t)), 'the Buy menu agrees');
  } finally { await ctx.close(); }
});
