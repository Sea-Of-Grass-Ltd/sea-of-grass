// Home page type (Dew), approved by Tristan 2026-11-19 ("Approve both, build them"):
// the characterful faces come back instead of one medium sans everywhere.
//   - Syne sets the big lines: the opening's bold words, the service chapters, the thesis, the close.
//   - Instrument Serif cuts into them: the opening's light and italic words, and "It isn't anymore."
//   - Bricolage Grotesque names things: work items, the people, the phone and email.
//   - LOOK / PLAN / MAKE / CARE are a split-flap board: one opaque flap per letter, split at the middle,
//     riffling into place once (not at all with reduced motion). Screen readers get the plain word.
// Fonts come from Google, which the harness blocks, so these check what the page asks for, not the drawn glyphs.
// Run:  cd tests && npm install && node --test home/type.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const first = f => f.split(',')[0].trim().replace(/["']/g, '');
const face = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return { family: c.fontFamily, style: c.fontStyle, weight: c.fontWeight }; }, sel);

for (const w of [1440, 390]) {
  test(`${w} · the opening headline: Syne words with Instrument Serif cutting in`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const v = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.lf')), g = n => c.getPropertyValue(n).trim(); return { b: g('--lf-face'), bw: g('--lf-b'), t: g('--lf-face-t'), em: g('--lf-face-em'), emv: g('--lf-em') }; });
      assert.equal(first(v.b), 'Syne', 'bold words are Syne');
      assert.equal(v.bw, '800');
      assert.equal(first(v.t), 'Instrument Serif', 'light words ("A", "studio") are the serif');
      assert.equal(first(v.em), 'Instrument Serif', 'connecting words ("and", "for the") are the serif');
      assert.match(v.emv, /italic/, 'connecting words are italic');
      const link = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].some(l => /family=Instrument\+Serif:ital@0;1/.test(l.href) && /family=Syne/.test(l.href)));
      assert.ok(link, 'the page loads Syne and both cuts of Instrument Serif');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · display lines in Syne, the thesis turn in Instrument Serif italic, names in Bricolage`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      for (const sel of ['#websites h3', '#brand h3', '#cb-svc-h', '.cb-thesis blockquote span', '#cb-close-h', '#services .cb-amt b']) {
        const f = await face(page, sel);
        assert.ok(f, `${sel} exists`);
        assert.equal(first(f.family), 'Syne', `${sel} is set in Syne (got ${f.family})`);
      }
      const em = await face(page, '.cb-thesis blockquote em');
      assert.equal(first(em.family), 'Instrument Serif', '"It isn\'t anymore." is the serif');
      assert.equal(em.style, 'italic');
      for (const sel of ['.cb-feature b', '.cb-index b', '.cb-people b', '.cb-reach a']) {
        const f = await face(page, sel);
        assert.equal(first(f.family), 'Bricolage Grotesque', `${sel} is set in Bricolage (got ${f.family})`);
      }
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · the steps are a split-flap board that lands on each word`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      await page.locator('#process ol').scrollIntoViewIfNeeded();
      await page.waitForTimeout(3500); // the riffle runs about two seconds
      const b = await page.evaluate(() => [...document.querySelectorAll('#process li b')].map(b => {
        const fl = [...b.querySelectorAll('.fl')], r = b.getBoundingClientRect(), li = b.closest('li').getBoundingClientRect();
        const c = fl[0] && getComputedStyle(fl[0]);
        return { label: b.getAttribute('aria-label'), shown: fl.map(f => f.textContent).join(''), n: fl.length, hidden: fl.every(f => f.getAttribute('aria-hidden') === 'true'),
          h: fl[0] ? fl[0].getBoundingClientRect().height : 0, bg: c && c.backgroundColor, family: c && c.fontFamily, fits: r.right <= li.right + 1 && r.left >= li.left - 1 };
      }));
      assert.deepEqual(b.map(x => x.label), ['Look', 'Plan', 'Make', 'Care'], 'each word keeps a readable label');
      for (const x of b) {
        assert.equal(x.n, 4, `${x.label}: one flap per letter`);
        assert.equal(x.shown.toUpperCase(), x.label.toUpperCase(), `${x.label}: the flaps land on the word (showed ${x.shown})`);
        assert.ok(x.hidden, `${x.label}: flaps are hidden from screen readers (the label carries the word)`);
        assert.ok(x.h >= (w < 600 ? 40 : 60), `${x.label}: flaps are big enough to read as an object (${Math.round(x.h)}px)`);
        assert.match(x.bg, /^rgb\(/, `${x.label}: flaps are opaque, not glass (${x.bg})`);
        assert.equal(first(x.family), 'IBM Plex Mono', `${x.label}: board lettering is mono`);
        assert.ok(x.fits, `${x.label}: the board fits its column`);
      }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `no sideways scroll (${over}px)`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}

test('reduced motion · the board shows the words straight away, no riffle', async () => {
  const { ctx, page, errors } = await site.open('/', 1440, { reducedMotion: 'reduce' });
  try {
    await page.locator('#process ol').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const shown = await page.evaluate(() => [...document.querySelectorAll('#process li b')].map(b => [...b.querySelectorAll('.fl')].map(f => f.textContent).join('')));
    assert.deepEqual(shown, ['Look', 'Plan', 'Make', 'Care']);
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});
