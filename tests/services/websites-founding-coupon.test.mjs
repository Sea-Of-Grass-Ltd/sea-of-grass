// Websites page: the founding five is its own ticket. Quin found one card showing both $100 and $50 a month confusing;
// Tristan (2026-11-20): "Founding five as its own ticket that pops out and shows the number of spots available."
// So the Site Plan card holds only the $100 offer (and its $23-a-week line). The founding five is a small notched ticket
// tucked over the card's corner like a coupon, tilted a few degrees, never covering the price, the button or any words on
// the card; it leads with the real spots count (SOG_SHOP.founding) and has its own button. It pops once the first time it
// is seen, then is still; reduced motion, no animation. On phones it sits just under the card, a smaller tilt, no overlap.
// Then: "You know how Higgsfield has the prices marked out, I feel like Founding Five should be like that." So the price is a
// sale: a small muted struck-through $100, a big bright $50 a month, "locked for two years" right by it, a "Half off" tag;
// screen readers hear "was $100, now $50 a month", not two bare numbers.
// Run:  cd tests && npm install && node --test services/websites-founding-coupon.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const read = page => page.evaluate(() => {
  const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const coupon = document.querySelector('#founding'), care = document.querySelector('.plan.care'), sites = document.querySelector('.plan.sites');
  const m = new DOMMatrix(getComputedStyle(coupon).transform), deg = Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI);
  const spots = coupon.querySelector('[data-spots-left]')?.closest('.c-spots');
  const cb = box(coupon.querySelector('.c-body') || coupon);
  // every word and control on the Site Plan card, and the small line under the plans
  const ink = e => { const g = document.createRange(); g.selectNodeContents(e); const r = g.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };   // where the words are, not the full-width box
  const careBits = [...care.querySelectorAll('.badge,.plan-h,.amt,.week,.btn,.ticks li')].map(e => [e.className || e.tagName, e.matches('.btn,.badge') ? box(e) : ink(e)]);
  // AA for every word on the coupon against its own flat fill
  const rgb = s => s.match(/[\d.]+/g).map(Number), lum = c => c.slice(0, 3).map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  const fill = rgb(getComputedStyle(coupon.querySelector('.c-body')).backgroundColor), low = [];
  for (const e of coupon.querySelectorAll('.c-spots,.kick,p')) { const c = rgb(getComputedStyle(e).color), L = [lum(c), lum(fill)].sort((a, b) => b - a), k = (L[0] + .05) / (L[1] + .05); if (fill[3] !== undefined && fill[3] < 1) low.push('see-through fill'); if (k < 4.5) low.push(e.textContent.trim().slice(0, 20) + ' ' + k.toFixed(2)); }
  const also = [...document.querySelectorAll('.plans .also, .plans .jump')].map(box);
  return { inCare: care.contains(coupon), careText: care.textContent, text: coupon.textContent.replace(/\s+/g, ' ').trim(), deg,
    spots: spots ? { text: spots.textContent.replace(/\s+/g, ' ').trim(), size: parseFloat(getComputedStyle(spots).fontSize) } : null,
    btn: (() => { const b = coupon.querySelector('[data-add]'); return b ? { add: b.dataset.add, founding: 'founding' in b.dataset, shown: b.getBoundingClientRect().width > 0 } : null; })(),
    notched: getComputedStyle(coupon.querySelector('.c-body')).maskImage !== 'none' || getComputedStyle(coupon.querySelector('.c-body')).webkitMaskImage !== 'none',
    onCard: hit(cb, box(care)), covers: careBits.filter(([, b]) => hit(cb, b)).map(([n]) => n), onAlso: also.some(a => hit(cb, a)),
    onSites: hit(cb, box(sites)), low, pageW: document.documentElement.scrollWidth, vw: innerWidth };
});

for (const w of [1440, 1024, 390]) {
  test(`${w}px · the founding five is its own coupon ticket with the real spots count and its own button`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w);
    try {
      await page.evaluate(() => document.querySelector('#founding').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900);
      const cfg = await page.evaluate(() => window.SOG_SHOP.founding);
      const r = await read(page);
      assert.ok(!r.inCare, 'it is not part of the Site Plan card any more');
      assert.doesNotMatch(r.careText, /\$50/, 'the Site Plan card shows only the $100 offer');
      assert.ok(r.notched, 'the same notched ticket shape, cut out');
      assert.equal(r.spots?.text, `${cfg.left} of ${cfg.total} spots left`, 'it leads with the real spots count');
      assert.ok(r.spots.size >= 28, `and the count is big (${r.spots.size}px)`);
      for (const re of [/founding five/i, /locked for two years/i, /free photo shoot/i, /case study/i, /owe nothing/i]) assert.match(r.text, re, `says ${re}`);
      assert.doesNotMatch(r.text, /review/i, 'never asks for a review');
      const p = await page.evaluate(() => {
        const c = document.querySelector('#founding'), was = c.querySelector('s'), now = c.querySelector('.c-now'), tag = c.querySelector('.c-tag'), price = c.querySelector('.c-price');
        const st = e => { const k = getComputedStyle(e); return { size: parseFloat(k.fontSize), line: k.textDecorationLine, color: k.color, op: +k.opacity }; };
        // what assistive tech reads for the price: hidden parts skipped
        const spoken = n => n.nodeType === 3 ? n.textContent : (n.getAttribute?.('aria-hidden') === 'true' ? '' : [...n.childNodes].map(spoken).join(''));
        return { was: was && { text: was.textContent.trim(), ...st(was) }, now: now && { text: now.textContent.trim(), ...st(now) }, tag: tag?.textContent.trim(),
          spoken: price ? spoken(price).replace(/\s+/g, ' ').trim() : '', near: price?.textContent.includes('locked for two years') };
      });
      assert.ok(p.was && p.was.text === '$100' && /line-through/.test(p.was.line), 'the old $100, struck through');
      assert.ok(p.now && p.now.text === '$50' && p.now.size >= p.was.size * 1.8, `a big $50 (${p.now?.size}px against ${p.was?.size}px)`);
      assert.ok(p.near, '"locked for two years" right by the price');
      assert.match(p.tag || '', /half off|−50%|-50%/i, 'a Half off tag');
      assert.match(p.spoken, /^was \$100, now \$50 a month/i, `screen readers hear "was $100, now $50 a month" (${p.spoken})`);
      assert.deepEqual(r.low, [], 'every word on the coupon passes AA on its flat fill');
      assert.ok(r.btn && r.btn.shown && r.btn.add === 'site-plan' && r.btn.founding, 'its own button, starting the Site Plan flagged as founding');
      assert.ok(r.pageW <= r.vw, 'no sideways page scroll');
      if (w >= 981) {
        assert.ok(r.deg >= 2 && r.deg <= 8, `tilted a few degrees (${r.deg.toFixed(1)})`);
        assert.ok(r.onCard, 'tucked over the Site Plan card');
        assert.deepEqual(r.covers, [], 'without covering the price, the button or any words on the card');
        assert.ok(!r.onAlso && !r.onSites, 'and clear of Pay once and the small line below');
      } else {
        assert.ok(r.deg > 0 && r.deg < 2.5, `a smaller tilt (${r.deg.toFixed(1)})`);
        assert.ok(!r.onCard && !r.onSites && !r.onAlso, 'just under the card, overlapping nothing');
      }
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}

test('1440px · it pops once the first time it is seen, then stays still', async () => {
  const { ctx, page } = await site.open(PAGE, 1440);
  try {
    await page.addInitScript(() => { window.__pops = 0; addEventListener('animationstart', e => { if (e.target.id === 'founding') window.__pops++; }, true); });
    await page.reload(); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#founding').scrollIntoView({ block: 'center' })); await page.waitForTimeout(1200);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#founding').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({ pops: window.__pops, now: document.querySelector('#founding').getAnimations({ subtree: true }).length }));
    assert.equal(r.pops, 1, 'a small pop the first time it is seen, and only then');
    assert.equal(r.now, 0, 'then still');
  } finally { await ctx.close(); }
});

test('1440px · reduced motion: no pop', async () => {
  const { ctx, page } = await site.open(PAGE, 1440, { reducedMotion: 'reduce' });
  try {
    await page.evaluate(() => document.querySelector('#founding').scrollIntoView({ block: 'center' })); await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => document.querySelector('#founding').getAnimations({ subtree: true }).length), 0, 'no animation');
  } finally { await ctx.close(); }
});
