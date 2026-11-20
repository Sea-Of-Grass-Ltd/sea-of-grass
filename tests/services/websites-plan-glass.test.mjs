// Websites page: the plan cards take the register receipt's glass. Tristan (2026-11-20), looking at the Site Plan card and the
// REGISTER receipt in the Bunny Burritos demo: "I like the way that this glass looks more." So the Site Plan card gets the
// receipt's own material: its translucent fill, backdrop blur, faint top highlight and drop shadow, from the same CSS values.
// Notches, the dashed tear, the RECOMMENDED badge, layout and text stay. Pay once beside it stays open type (no box), the
// page's standing rule (websites.test.mjs: "Sites is open type, not another box").
// Every word on the glass still passes AA; the receipt itself is untouched.
// Run:  cd tests && npm install && node --test services/websites-plan-glass.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const PAGE = '/preview/services/websites/';
let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

for (const w of [1440, 390]) {
  test(`${w}px · the Site Plan card is the register receipt's glass, and every word on them passes AA`, async () => {
    const { ctx, page, errors } = await site.open(PAGE, w);
    try {
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const css = e => getComputedStyle(e), reg = css(document.querySelector('.register'));
        const mat = c => ({ bg: c.backgroundColor, blur: c.backdropFilter || c.webkitBackdropFilter, shadow: c.boxShadow });
        const rgba = s => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
        const over = (top, base) => top.slice(0, 3).map((v, i) => v * top[3] + base[i] * (1 - top[3]));
        const lum = c => c.map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
        const navy = rgba(css(document.querySelector('.hero')).backgroundColor);
        const cards = [...document.querySelectorAll('.hero .plan')].map(p => {
          const c = css(p), glass = over(rgba(c.backgroundColor), navy), low = [];
          // every bit of text on the card that sits on the glass (the badge and the button carry their own ground)
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          for (let n; (n = walker.nextNode());) {
            const e = n.parentElement; if (!n.textContent.trim() || e.closest('.badge,.btn')) continue;
            const ec = css(e), size = parseFloat(ec.fontSize), bold = +ec.fontWeight >= 700;
            const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5, got = ratio(over(rgba(ec.color), glass), glass);
            if (got < need) low.push(`${n.textContent.trim().slice(0, 24)} ${got.toFixed(2)}`);
          }
          const st = p.querySelector('.stub');
          return { cls: p.className, ...mat(c), radius: c.borderTopLeftRadius, low,
            notch: st ? getComputedStyle(st, '::before').width : null, tear: st ? css(st).borderTopStyle : null, badge: !!p.querySelector('.badge') };
        });
        return { reg: mat(reg), regRadius: reg.borderTopLeftRadius, cards };
      });
      // the receipt is as it was
      assert.equal(r.reg.bg, 'rgba(218, 209, 205, 0.13)', 'the receipt keeps its fill');
      assert.equal(r.reg.blur, 'blur(14px)', 'and its blur');
      assert.equal(r.cards.length, 2, 'two plans');
      const open = r.cards.find(c => !c.badge);
      assert.equal(open.bg, 'rgba(0, 0, 0, 0)', 'Pay once stays open type');
      assert.deepEqual(open.low, [], 'and its words still pass AA');
      for (const c of r.cards.filter(c => c.badge)) {
        assert.equal(c.bg, r.reg.bg, `${c.cls}: the receipt's fill`);
        assert.equal(c.blur, r.reg.blur, `${c.cls}: the receipt's blur`);
        assert.equal(c.shadow, r.reg.shadow, `${c.cls}: the receipt's top highlight and shadow`);
        assert.equal(c.radius, '22px', `${c.cls}: the card's own rounded shape`);
        assert.deepEqual(c.low, [], `${c.cls}: every word passes AA on the glass`);
      }
      const plan = r.cards.find(c => c.badge);
      assert.ok(plan && plan.notch === '32px' && plan.tear === 'dashed', 'the Site Plan keeps its notches, dashed tear and badge');
      assert.deepEqual(errors, [], 'no console errors');
    } finally { await ctx.close(); }
  });
}
