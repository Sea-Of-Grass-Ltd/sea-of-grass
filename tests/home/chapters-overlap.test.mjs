// Home chapters (Websites, Brand, Creative tech) ride over the pinned meadow. Rule (HQ for Tristan, 2026-11-19):
// at any scroll position only one chapter's text is readable — the outgoing text is gone before the incoming text arrives — and the meadow's effects (the lawn, the grown S, the visualizer flower) never draw over text.
// Run:  cd tests && npm install && node --test home/chapters-overlap.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// every block of chapter text on screen that a reader could see, as {who, l, t, r, b}
const blocks = page => page.evaluate(() => {
  const seen = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < .05) return false; } return true; };
  const box = els => { let r = null; for (const e of els) { const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue; r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; } return r; };
  const out = [];
  for (const card of document.querySelectorAll('main.cb .cb-ch .cb-chp')) {
    if (!seen(card)) continue;
    const r = box([...card.children].filter(e => !e.classList.contains('ui') && getComputedStyle(e).display !== 'none'));
    if (r && r.b > 0 && r.t < innerHeight) out.push({ who: card.closest('.cb-ch').id, ...r });
  }
  const t2 = document.querySelector('main.cb .lf-title .cb-h');
  if (t2 && seen(t2)) { const r = box([t2]); if (r && r.b > 0 && r.t < innerHeight) out.push({ who: 'three-things', ...r }); }
  const pr = document.querySelector('main.cb .cb-promise');
  if (pr && seen(pr)) { const r = box([pr]); if (r && r.b > 0 && r.t < innerHeight) out.push({ who: 'promise', ...r }); }
  return out;
});

for (const w of [1440, 390]) {
  test(`${w} · only one chapter's text is readable at any scroll position, and effects stay off text`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const { from, to, h } = await page.evaluate(() => ({ from: document.getElementById('services').getBoundingClientRect().top + scrollY - innerHeight, to: document.querySelector('main.cb .cb-stage').getBoundingClientRect().bottom + scrollY, h: innerHeight }));
      let checked = 0;
      for (let y = Math.max(0, from); y <= to; y += Math.round(h / 8)) {
        await page.evaluate(v => scrollTo(0, v), y);
        await page.waitForTimeout(260);
        const bs = await blocks(page);
        const chapters = bs.filter(b => b.who !== 'promise');
        assert.ok(chapters.length <= 1, `scroll ${y}: ${chapters.map(b => '"' + b.who + '"').join(' and ')} are readable at the same time`);
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {   // and nothing else crowds it: 24px of clear air
          const a = bs[i], b = bs[j], ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          assert.ok(!(ox > -24 && oy > -24), `scroll ${y}: "${a.who}" and "${b.who}" text overlap or touch while both are visible`);
        }
        // the meadow's effects never draw over a readable chapter's text: each one sits on its own opaque plot of ground,
        // and the effect's room (the visualizer, the grown S) is kept clear of it
        const fx = await page.evaluate(() => {
          const lfg = getComputedStyle(document.querySelector('.lf')).getPropertyValue('--lf-ground').trim();
          const probe = document.createElement('i'); probe.style.color = lfg; document.body.appendChild(probe); const want = getComputedStyle(probe).color; probe.remove();
          const n = window.sogOpening.effectInfo ? window.sogOpening.effectInfo() : null;
          return { n, cards: [...document.querySelectorAll('main.cb .cb-ch .cb-chp')].filter(c => parseFloat(getComputedStyle(c).opacity) >= .05 && c.getBoundingClientRect().bottom > 0 && c.getBoundingClientRect().top < innerHeight)
            .map(c => ({ id: c.closest('.cb-ch').id, bg: getComputedStyle(c).backgroundColor, want })) };
        });
        for (const c of fx.cards) assert.equal(c.bg, c.want, `scroll ${y}: "${c.id}" text sits on its own opaque plot (${c.bg})`);
        assert.ok(fx.n, 'the opening reports where its effects play');
        if (fx.n.room && fx.n.text) {
          const a = fx.n.room, b = fx.n.text, ox = Math.min(a.x + a.w, b.r) - Math.max(a.x, b.l), oy = Math.min(a.y + a.h, b.b) - Math.max(a.y, b.t);
          assert.ok(!(ox > 2 && oy > 2), `scroll ${y}: the ${fx.n.field} effect's room overlaps the chapter text`);
        }
        checked++;
      }
      assert.ok(checked > 10, `sampled ${checked} scroll positions`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
