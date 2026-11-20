// Home "Three things": the third column is a controller (Tristan, 2026-11-20: "Websites • Branding • Creative Tech as a
// controller that modifies the Websites and Branding columns (similar to how I've done controllers for visual synthesizers)").
// His controller language (Mode / Shape / Color / Effect tabs, a "1 of 3" stepper) now plays the two columns:
//   COLOR shifts them through night-meadow palettes, SHAPE changes their frame, MODE swaps the display type, EFFECT puts the live
//   meadow grass or his stars behind them (in their own strip, never over text). Reset puts it all back. Text stays readable in
//   every state and nothing overlaps. Phones: the controller sits under the columns with touch-sized controls. Reduced motion:
//   no animated effect, colour and shape still work.
// Run:  cd tests && npm install && node --test home/creative-controller.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const go = page => page.evaluate(() => { const s = document.getElementById('services'); scrollTo(0, s.getBoundingClientRect().top + scrollY); });
const state = page => page.evaluate(() => {
  const st = document.querySelector('.cbx-stage'), cols = [...st.querySelectorAll('.cb-col')];
  const L = c => { const m = c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const ground = e => { for (let n = e; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(0,0,0)'; };
  const box = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const fx = st.querySelector('.cbx-fx'), grass = fx.querySelector('[data-live-grass]'), stars = fx.querySelector('.cbx-stars');
  return {
    attrs: { mode: st.dataset.mode, shape: st.dataset.shape, color: st.dataset.color, fx: st.dataset.fx },
    look: cols.map(c => { const s = getComputedStyle(c), h = getComputedStyle(c.querySelector('h3')); return [s.backgroundColor, s.borderRadius, s.clipPath, s.borderTopWidth, h.fontFamily, h.textTransform].join('|'); }),
    contrast: cols.flatMap(c => [...c.querySelectorAll('h3 a, h3 + p, .cb-tier i, .cb-amt b, .cb-amt em, .cb-tier > span:last-child, .cb-note, .cb-more a')].map(e => ({ t: e.textContent.trim().slice(0, 24), r: cr(getComputedStyle(e).color, ground(e)) }))),
    clipped: cols.filter(c => c.scrollHeight > c.clientHeight + 2 || c.scrollWidth > c.clientWidth + 2).length,
    boxes: { a: box(cols[0]), b: box(cols[1]), fx: box(fx), ctl: box(document.querySelector('.cbx')) },
    grass: !!grass && getComputedStyle(grass).visibility === 'visible' && !!grass.querySelector('canvas'),
    stars: !!stars && getComputedStyle(stars).visibility === 'visible',
    twinkling: !!stars && getComputedStyle(stars).visibility === 'visible' && (window.sogCbx?.starsMoving?.() || false),
  };
});
const tab = (page, t) => page.click(`.cbx .vzd-tabs button[data-tab="${t}"]`);
const next = (page, t) => page.click(`.cbx .vzd-p[data-p="${t}"] [data-step="1"]`);
const over = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;

function sane(s, where) {
  for (const c of s.contrast) assert.ok(c.r >= 4.5, `${where}: "${c.t}" contrast ${c.r.toFixed(2)}`);
  assert.equal(s.clipped, 0, `${where}: no text cut off by a frame`);
  const B = s.boxes;
  for (const [x, y] of [['a', 'b'], ['a', 'fx'], ['b', 'fx'], ['a', 'ctl'], ['b', 'ctl'], ['fx', 'ctl']]) assert.ok(!over(B[x], B[y]), `${where}: ${x} and ${y} overlap`);
}

for (const w of [1440, 390]) {
  test(`${w} · Websites, Branding, and Creative tech as a controller with its line, price and links under it`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await go(page);
      const d = await page.evaluate(() => {
        const c3 = document.getElementById('creative-tech'), ctl = c3.querySelector('.cbx'), more = c3.querySelector('.cb-more'), pr = c3.querySelector('.cb-price');
        return { names: [...document.querySelectorAll('#services .cb-col h3, #creative-tech > h3')].map(h => h.textContent.trim()), line: c3.querySelector('h3 + p')?.textContent.trim(),
          tabs: [...ctl.querySelectorAll('.vzd-tabs button')].map(b => b.textContent.trim()), reset: !!ctl.querySelector('.cbx-reset'),
          under: more.getBoundingClientRect().top >= ctl.getBoundingClientRect().bottom - 1 && pr.getBoundingClientRect().top >= ctl.getBoundingClientRect().bottom - 1,
          small: [...ctl.querySelectorAll('button')].filter(b => b.offsetParent).map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)),
          ctlTop: ctl.getBoundingClientRect().top, colsBottom: Math.max(...[...document.querySelectorAll('.cbx-stage .cb-col')].map(c => c.getBoundingClientRect().bottom)) };
      });
      assert.deepEqual(d.names, ['Websites', 'Branding', 'Creative tech']);
      assert.equal(d.line, 'Play with it: this is what we build.');
      assert.deepEqual(d.tabs, ['Mode', 'Shape', 'Color', 'Effect']);
      assert.ok(d.reset, 'there is a reset');
      assert.ok(d.under, 'the price and links sit under the controls');
      if (w < 900) {
        assert.ok(d.ctlTop > d.colsBottom, 'on a phone the controller sits under the two columns');
        assert.ok(d.small.every(x => x >= 44), `touch-sized controls (smallest ${Math.min(...d.small)}px)`);
      }
      sane(await state(page), 'at rest');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · every control visibly restyles both columns, stays readable, and Reset puts it back`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await go(page);
      const s0 = await state(page);
      for (const [t, n] of [['color', 4], ['shape', 4], ['mode', 3]]) {
        await tab(page, t);
        const seen = new Set([s0.look.join('/')]);
        for (let i = 1; i < n; i++) {
          await next(page, t); await page.waitForTimeout(350);
          const s = await state(page);
          assert.notEqual(s.look[0], s0.look[0], `${t} ${i}: the Websites column changes`);
          assert.notEqual(s.look[1], s0.look[1], `${t} ${i}: the Branding column changes`);
          seen.add(s.look.join('/'));
          sane(s, `${t} ${i}`);
        }
        assert.equal(seen.size, n, `${t}: ${n} distinct looks`);
        await next(page, t); await page.waitForTimeout(350);
        assert.deepEqual((await state(page)).look, s0.look, `${t}: stepping round comes back to the start`);
      }
      // effects: the meadow grass, then the stars, each in its own strip under the columns
      await tab(page, 'fx');
      await next(page, 'fx'); await page.waitForTimeout(400);
      let s = await state(page);
      assert.ok(s.grass && !s.stars, 'Grass: the live meadow plays behind the columns');
      sane(s, 'grass');
      await next(page, 'fx'); await page.waitForTimeout(300);
      s = await state(page);
      assert.ok(s.stars && !s.grass, 'Stars: his stars play behind the columns');
      sane(s, 'stars');
      // a mixed state, then reset
      await tab(page, 'color'); await next(page, 'color'); await next(page, 'color');
      await tab(page, 'shape'); await next(page, 'shape');
      await tab(page, 'mode'); await next(page, 'mode');
      sane(await state(page), 'mixed');
      await page.click('.cbx .cbx-reset'); await page.waitForTimeout(350);
      const r = await state(page);
      assert.deepEqual(r.attrs, s0.attrs, 'Reset puts every control back');
      assert.deepEqual(r.look, s0.look, 'and the columns look as they did');
      assert.ok(!r.grass && !r.stars, 'and the effect is off');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · reduced motion: no animated effect, colour and shape still work`, async () => {
    const { ctx, page, errors } = await site.open('/', w, { reducedMotion: 'reduce' });
    try {
      await go(page);
      const s0 = await state(page);
      await tab(page, 'color'); await next(page, 'color'); await page.waitForTimeout(350);
      assert.notEqual((await state(page)).look[0], s0.look[0], 'colour still works');
      await tab(page, 'shape'); await next(page, 'shape'); await page.waitForTimeout(350);
      const s1 = await state(page);
      assert.notEqual(s1.look[0].split('|')[1] + s1.look[0].split('|')[2] + s1.look[0].split('|')[3], s0.look[0].split('|')[1] + s0.look[0].split('|')[2] + s0.look[0].split('|')[3], 'shape still works');
      await tab(page, 'fx'); await next(page, 'fx'); await next(page, 'fx'); await page.waitForTimeout(300);
      const s = await state(page);
      assert.ok(s.stars, 'the stars show');
      assert.equal(s.twinkling, false, 'but nothing animates');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
