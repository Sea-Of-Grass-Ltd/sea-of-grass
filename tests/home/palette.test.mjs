// Home palette: "Night meadow with poppies", approved by Tristan 2026-11-19 (PALETTE.md in the shared notes).
// Every colour is pre-mixed from one limited palette. Rules checked here:
//   - sections take turns on flat grounds: navy, moss, plum (no CSS gradients); the page ground and footer are --ground;
//   - poppy is the only button colour; gold only on small eyebrow labels;
//   - each section borrows 2-4 single touches of the other sections' colours, each on a real element;
//   - the old sky blue is gone everywhere; text stays readable.
// Run:  cd tests && npm install && node --test home/palette.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

const P = { ground: '#1F1F35', navy: '#272C4B', 'navy-line': '#39406A', moss: '#263535', grass: '#3F6550', sage: '#7F917F', plum: '#332739', 'plum-mute': '#61465C', poppy: '#D17C66', 'poppy-deep': '#A8564D', gold: '#C8B27B', soft: '#9B97B1', text: '#DAD1CD' };
const rgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const SKY = ['#509DFC', '#6DA7FF', '#A7CAFF', '#4CA3FF', '#0068F0', '#00358A', '#0058D6', '#7DB5FF', '#3CE0D0'].map(h => rgb(h).replace(/[()]/g, '\\$&'));
const SKY_RE = new RegExp(SKY.join('|') + '|rgba\\(80, 157, 252|rgba\\(60, 224, 208');

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

for (const w of [1440, 390]) {
  test(`${w} · the tokens, and the sections taking turns on flat grounds`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const tok = await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, getComputedStyle(document.documentElement).getPropertyValue('--p-' + k).trim().toUpperCase()])), Object.keys(P));
      assert.deepEqual(tok, P, 'the palette is set as tokens with the exact values');
      const g = await page.evaluate(() => {
        const bg = s => { const e = document.querySelector(s); return e && getComputedStyle(e).backgroundColor; };
        return { lf: getComputedStyle(document.querySelector('.lf')).getPropertyValue('--lf-ground').trim().toUpperCase(), work: bg('#work'), steps: bg('#process'), thesis: bg('.cb-thesis'), close: bg('#contact'), bar: bg('header.bar'), foot: bg('.cb-foot'), body: bg('body'),
          grads: [document.body, document.querySelector('header.bar'), ...document.querySelectorAll('main.cb > *, main.cb .cb-band, main.cb .cb-open')].map(e => getComputedStyle(e).backgroundImage).filter(b => /gradient/.test(b)) };
      });
      assert.equal(g.lf, P.navy, 'the chapters sit on navy (the opening\'s ground once the night gives way)');
      assert.equal(g.work, rgb(P.moss), 'the work list is moss');
      assert.equal(g.steps, rgb(P.plum), 'how a project goes is plum');
      assert.equal(g.thesis, rgb(P.plum), 'the thesis continues the plum band');
      assert.equal(g.close, rgb(P.navy), 'the close is navy');
      for (const k of ['bar', 'foot', 'body']) assert.equal(g[k], rgb(P.ground), `${k} is the page ground`);
      assert.deepEqual(g.grads, [], 'no CSS-gradient section grounds');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · poppy only on buttons, gold only on small labels, no sky blue anywhere`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const r = await page.evaluate(([poppy, gold, skySrc]) => {
        const sky = new RegExp(skySrc), out = { poppyBg: [], gold: [], sky: [] };
        const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '');
        for (const e of document.querySelectorAll('body *')) {
          const c = getComputedStyle(e);
          if (c.display === 'none') continue;
          if (c.backgroundColor === poppy && !e.closest('.ui')) out.poppyBg.push(name(e));   // the little website pictured in the Websites chapter has its own button
          if (c.color === gold && e.textContent.trim()) out.gold.push({ n: name(e), size: parseFloat(c.fontSize) });
          for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'boxShadow', 'textDecorationColor', 'fill', 'stroke', 'backgroundImage'])
            if (sky.test(c[k])) out.sky.push(name(e) + ' ' + k);
          for (const pe of ['::before', '::after']) { const p = getComputedStyle(e, pe); if (p.content && p.content !== 'none' && (sky.test(p.backgroundColor) || sky.test(p.color))) out.sky.push(name(e) + pe); }
        }
        return out;
      }, [rgb(P.poppy), rgb(P.gold), SKY_RE.source]);
      assert.deepEqual(r.sky, [], 'no sky blue left');
      assert.ok(r.poppyBg.length >= 2, 'the buttons are poppy');
      for (const n of r.poppyBg) assert.match(n, /^a\..*\b(book|cb-book)\b/, `only buttons are poppy (${n})`);
      assert.ok(r.gold.length >= 2, 'gold marks the eyebrow labels');
      for (const g of r.gold) assert.ok(g.size <= 14, `gold only on small labels (${g.n} at ${g.size}px)`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · each section borrows 2-4 touches of the others' colours, on real elements`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const t = await page.evaluate(() => {
        const css = (s, pe, k) => { const e = document.querySelector(s); return e ? getComputedStyle(e, pe || null)[k] : null; };
        return {
          chapters: [css('#services .cb-tier:nth-child(1)', '::before', 'backgroundColor'), css('#services .cb-tier:nth-child(2)', '::before', 'backgroundColor'), css('#services .cb-more a:not(:first-child)', null, 'textDecorationColor')],
          work: [css('.cb-feature > b', '::after', 'backgroundColor'), css('.cb-index li', '::after', 'color')],
          steps: [css('#process li b .fl', null, 'backgroundColor'), css('#process li', '::before', 'backgroundColor'), css('.cb-thesis blockquote em', null, 'color')],
          close: [css('#cb-close-h', '::after', 'backgroundColor'), css('.cb-people li:nth-child(1) i', null, 'borderTopColor'), css('.cb-people li:nth-child(2) i', null, 'borderTopColor')],
        };
      });
      const R = h => rgb(h);
      const own = { chapters: ['navy', 'navy-line', 'soft'], work: ['moss', 'grass', 'sage'], steps: ['plum', 'plum-mute'], close: ['navy', 'navy-line', 'soft'] };
      for (const [sec, cols] of Object.entries(t)) {
        assert.ok(cols.length >= 2 && cols.length <= 4, `${sec}: 2-4 touches`);
        for (const c of cols) {
          assert.ok(c && Object.keys(P).some(k => R(P[k]) === c), `${sec}: ${c} is a palette colour`);
          assert.ok(!own[sec].some(k => R(P[k]) === c), `${sec}: ${c} is borrowed from another section`);
        }
      }
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · text stays readable on every ground`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const pairs = await page.evaluate(() => {
        const L = c => { const m = c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
        const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const ground = e => { for (let n = e; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255,255,255)'; };
        return ['#work .cb-line', '#process li span', '.cb-thesis blockquote span', '#contact .cb-call p', '#contact .cb-book', 'header.bar a.book', '.cb-foot b'].map(s => { const e = document.querySelector(s); const c = getComputedStyle(e); return { s, r: cr(c.color, ground(e)) }; });
      });
      for (const p of pairs) assert.ok(p.r >= 4.5, `${p.s} contrast ${p.r.toFixed(2)}`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
