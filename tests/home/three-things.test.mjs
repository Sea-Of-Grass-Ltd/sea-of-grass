// Home: "Three things, done properly." as one compact section (Tristan, 2026-11-20): "'Three things, done properly' can be the
// heading, and the 3 things can be 3 columns that list what they are underneath it. That area of the site drags for a long
// time. Then immediately under that it will go into work."
//   - one heading, three columns (Websites | Brand | Creative tech), each keeping its name, line, price and links;
//   - about one screen on a desktop; stacked and short on a phone;
//   - "Nothing goes live until you've said yes." as one small line at the foot;
//   - Work straight after, no gap; none of the long pinned chapter run left.
// Run:  cd tests && npm install && node --test home/three-things.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const LINKS = {
  websites: ['/preview/services/websites/#buy', '/preview/services/websites/', '/preview/services/apps/'],
  brand: ['/preview/services/brand/#buy', '/preview/services/brand/', '/preview/services/illustration/'],
  'creative-tech': ['/preview/services/live-visuals/', '/preview/services/characters/'],
};

for (const w of [1440, 390]) {
  test(`${w} · one heading, three columns, the promise line, then Work`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      const d = await page.evaluate(() => {
        const sec = document.querySelector('main.cb #services'), r = sec && sec.getBoundingClientRect(), y = scrollY;
        const cols = sec ? [...sec.querySelectorAll('.cb-cols > .cb-col, .cbx-stage > .cb-col')].map(c => { const b = c.getBoundingClientRect(); return { id: c.id, name: c.querySelector('h3')?.textContent.trim(), line: c.querySelector('h3 + p')?.textContent.trim(), price: c.querySelector('.cb-price')?.textContent.replace(/\s+/g, ' ').trim(), links: [...c.querySelectorAll('.cb-more a')].map(a => a.getAttribute('href')), top: c.querySelector('h3').getBoundingClientRect().top + y, left: b.left, h: b.height }; }) : [];
        const h2 = sec && sec.querySelector('h2'), pr = sec && sec.querySelector('.cb-promise'), work = document.getElementById('work');
        return { found: !!sec, h2: h2 && h2.textContent.trim(), h2vis: h2 && h2.getBoundingClientRect().height > 20 && getComputedStyle(h2).clipPath === 'none',
          cols, promise: pr && pr.textContent.trim(), promiseLast: pr && cols.length && pr.getBoundingClientRect().top >= Math.max(...[...sec.querySelectorAll('.cb-col')].map(c => c.getBoundingClientRect().bottom)) - 1,
          secTop: r.top + y, secH: r.height, secBottom: r.bottom + y, workTop: work.getBoundingClientRect().top + y, vh: innerHeight, chapters: document.querySelectorAll('main.cb .cb-ch').length };
      });
      assert.ok(d.found, 'the section is there (#services, where the menu points)');
      assert.equal(d.h2, 'Three things, done properly.', 'the heading');
      assert.ok(d.h2vis, 'the heading is a real, visible heading');
      assert.deepEqual(d.cols.map(c => c.name), ['Websites', 'Branding', 'Creative tech'], 'three columns in order');
      assert.match(d.cols[0].line, /fix sites, build new ones and host them/);
      assert.match(d.cols[0].price, /\$250.*\$50/, 'Websites keeps its $250 and $50');
      assert.match(d.cols[1].price, /Fixed quote/); assert.match(d.cols[2].price, /Fixed quote/);
      for (const c of d.cols) assert.deepEqual(c.links, LINKS[c.id], `${c.name} keeps its links`);
      assert.equal(d.promise, 'Nothing goes live until you’ve said yes.', 'the promise line');
      assert.ok(d.promiseLast, 'the promise sits at the foot, under the columns');
      assert.equal(d.chapters, 0, 'the long pinned chapter run is gone');
      assert.ok(Math.abs(d.workTop - d.secBottom) <= 1, `Work starts straight after (${Math.round(d.workTop - d.secBottom)}px)`);
      if (w >= 900) {
        assert.ok(d.cols.every(c => Math.abs(c.top - d.cols[0].top) < 2), 'the columns sit side by side');
        assert.ok(d.secH <= d.vh * 1.1, `the section reads in about one screen (${Math.round(d.secH)} of ${d.vh})`);
      } else {
        assert.ok(d.cols[1].top > d.cols[0].top && d.cols[2].top > d.cols[1].top, 'on a phone the columns stack');
        for (const c of d.cols) assert.ok(c.h <= d.vh * .75, `${c.name} stays short (${Math.round(c.h)}px)`);
      }
      assert.ok(d.workTop <= d.secTop + d.secH + 1 && d.secTop <= d.vh * 2.2, `the page reaches the three things within ~2 screens (${(d.secTop / d.vh).toFixed(2)})`);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });

  test(`${w} · scrolling the real page: the opening, the three things, then Work, with nothing pinned in between`, async () => {
    const { ctx, page, errors } = await site.open('/', w);
    try {
      // scroll down in small steps: from the top to Work, every step moves the section up by the same amount (nothing holds it)
      const workAt = await page.evaluate(() => document.getElementById('work').getBoundingClientRect().top + scrollY);
      const step = Math.round(await page.evaluate(() => innerHeight) / 6);
      let last = null;
      for (let y = 0; y <= workAt; y += step) {
        await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(60);
        const top = await page.evaluate(() => document.querySelector('main.cb #services').getBoundingClientRect().top);
        if (last !== null && top < await page.evaluate(() => innerHeight)) assert.ok(Math.abs((last - top) - step) <= 2, `at ${y} the section moves with the scroll (no pinning)`);
        last = top;
      }
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}
