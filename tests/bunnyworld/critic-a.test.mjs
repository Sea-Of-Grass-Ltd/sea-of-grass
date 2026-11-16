// The critic's section A (notes/bunny-world/critic/REVIEW.md): things that are broken or untrue. One test per item.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

// pretend it is a given Colorado time (for "closed" checks): shifts Date so every clock on the page agrees
async function openAt(url, w, iso) {
  const o = await site.open(url, w, { initScript: iso ? `(()=>{const T=new Date('${iso}').getTime(),D=Date.now(),R=Date;class F extends R{constructor(...a){super(...(a.length?a:[R.now()-D+T]))}static now(){return R.now()-D+T}};globalThis.Date=F;})()` : null });
  return o;
}
const denver = (y, m, d, h, min) => { const s = new Date(Date.UTC(y, m - 1, d, h + 7, min)); return s.toISOString(); }; // MST = UTC-7

test('A1 · Hopwell: date of birth is a plain date field, not next week\'s strip', async () => {
  const { ctx, page } = await site.open('/bunnyworld/hopwell-chiro/', 390);
  try {
    const r = await page.evaluate(() => { const d = document.querySelector('#intake input[type=date]'); return { strip: !!d.closest('[data-q]').querySelector('.q-days, .days'), label: !d.closest('label.sr') }; });
    assert.equal(r.strip, false, 'no day strip in the date-of-birth step');
    assert.equal(r.label, true, 'the date of birth label is visible');
  } finally { await ctx.close(); }
});

// the window runs today to a week from today: an event that is already over today (Sunday run club at 9 pm) shows next week's date
test('A2 · Hop Along: "This week" dates are real dates in the coming week, and no wrong weekday is announced', async () => {
  const { ctx, page } = await site.open('/bunnyworld/hop-along/', 1440);
  try {
    const r = await page.evaluate(() => {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', day: 'numeric' });
      const week = []; for (let k = 0; k <= 7; k++) { const p = Object.fromEntries(fmt.formatToParts(new Date(Date.now() + k * 864e5)).map(x => [x.type, x.value])); week.push(p.weekday + ' ' + p.day); }
      const posters = [...document.querySelectorAll('.posters .poster')].map(p => `${p.querySelector('.day').textContent.trim()} ${p.querySelector('.date').textContent.trim()}`);
      const today = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'long' }).format(new Date());
      const drop = document.querySelector('.drop')?.textContent || '';
      const wrongDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].filter(d => d !== today && drop.includes(d));
      return { week, posters, wrongDay };
    });
    for (const p of r.posters) assert.ok(r.week.some(w => w.toLowerCase() === p.toLowerCase()), `"${p}" is not a date in the coming week (${r.week.join(', ')})`);
    assert.deepEqual(r.wrongDay, [], 'the bar names a different weekday than today');
  } finally { await ctx.close(); }
});

test('A3 · no links to nowhere: real .ics downloads, specific notes, no bare #', async () => {
  for (const url of ['/bunnyworld/hop-along/', '/bunnyworld/bunny-burritos/']) {
    const { ctx, page } = await site.open(url, 1440);
    try {
      const r = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href'), note: a.dataset.demoLink || null, dl: a.getAttribute('download') })));
      for (const a of r) {
        if (/calendar/i.test(a.t)) { assert.ok((/^data:text\/calendar/.test(a.h) || /\.ics$/.test(a.h)) && a.dl && a.dl.endsWith('.ics'), `${url} "${a.t}" downloads a real .ics (got ${a.h.slice(0, 30)})`); continue; }
        if (a.h === '#' || a.h === '') { assert.ok(a.note && /^On your site/.test(a.note) && a.note.length > 30, `${url} "${a.t}" goes nowhere${a.note ? ' (note: ' + a.note + ')' : ''}`); }
      }
    } finally { await ctx.close(); }
  }
});

test('A4 · landing Buy: no developer notes, and nothing "due today" that our terms don\'t ask for', async () => {
  const { ctx, page } = await site.open('/bunnyworld/', 1440, { reducedMotion: 'reduce' });
  try {
    await page.locator('.buy-btn').click();
    await page.locator('.buy-panel [data-add="starter"], .buy-panel .shop-add[data-add="starter"]').first().click();
    await page.waitForTimeout(200);
    const drawer = await page.evaluate(() => document.querySelector('.shop-drawer')?.innerText || '');
    assert.doesNotMatch(drawer, /Due today\s*\$1,200/, 'a starter site is not $1,200 due today (30% at first draft, the rest at launch)');
    assert.match(drawer, /first draft/i, 'the cart says when the site is paid for');
    const co = await site.open('/preview/shop/checkout/', 1440);
    try {
      const t = await co.page.evaluate(() => document.body.innerText);
      assert.doesNotMatch(t, /stands in for|payment links are set up|PLACEHOLDER/i, 'the checkout page speaks to customers, not developers');
    } finally { await co.ctx.close(); }
  } finally { await ctx.close(); }
});

test('A5 · Bunny Auto: the estimate never drops below its own "from" prices, and line prices follow the vehicle', async () => {
  const { ctx, page } = await site.open('/bunnyworld/bunny-auto/', 1440);
  try {
    const rest = await page.evaluate(() => document.querySelector('#estimate').innerText);
    assert.doesNotMatch(rest, /\$0\s*[–-]\s*\$0/, 'no "$0 – $0" at rest');
    const r = await page.evaluate(async () => {
      const panel = document.querySelector('#estimate [data-calc]'), boxes = [...panel.querySelectorAll('input[type=checkbox]')];
      const read = () => { const m = panel.innerText.match(/\$([\d,]+)\s*[–-]\s*\$([\d,]+)/); return m ? [+m[1].replace(/,/g, ''), +m[2].replace(/,/g, '')] : null; };
      const fromOf = b => { const l = b.closest('label'); const m = l.innerText.match(/\$([\d,]+)/); return m ? +m[1].replace(/,/g, '') : 0; };
      const out = [];
      const sel = panel.querySelector('select');
      for (let vi = 0; vi < sel.options.length; vi++) {
        sel.selectedIndex = vi; sel.dispatchEvent(new Event('change', { bubbles: true }));
        boxes.forEach(b => { if (!b.checked) b.click(); });
        await new Promise(r => setTimeout(r, 50));
        const est = read(), sum = boxes.reduce((s, b) => s + fromOf(b), 0);
        out.push({ vehicle: sel.options[vi].text, est, sum });
        boxes.forEach(b => { if (b.checked) b.click(); });
      }
      return out;
    });
    for (const v of r) assert.ok(v.est && v.est[0] >= v.sum, `${v.vehicle}: estimate ${v.est} starts below the listed prices, which add up to $${v.sum}`);
    assert.ok(r[r.length - 1].sum > r[0].sum, 'line prices rise with a bigger or European vehicle');
  } finally { await ctx.close(); }
});

test('A6 · Hare Today: Sundays can be booked, and the bar doesn\'t say "open now" while closed', async () => {
  const { ctx, page } = await openAt('/bunnyworld/hare-today/', 1440, denver(2026, 11, 16, 21, 45)); // Monday night, closed
  try {
    const r = await page.evaluate(() => ({ ann: document.querySelector('.ann')?.textContent || '', sundays: [...document.querySelectorAll('[data-days] button')].filter(b => /Sunday/.test(b.getAttribute('aria-label') || '')).map(b => !b.disabled) }));
    assert.doesNotMatch(r.ann, /open now/i, 'no "open now" in the bar');
    assert.ok(r.sundays.length && r.sundays.every(Boolean), 'every Sunday in the booking strip can be picked');
  } finally { await ctx.close(); }
});

test('A7 · closed days can\'t be picked in any date strip', async () => {
  for (const url of ['/bunnyworld/warren-bakehouse/', '/bunnyworld/hop-along/', '/bunnyworld/bunny-burritos/', '/bunnyworld/bunny-auto/', '/bunnyworld/hare-today/']) {
    const { ctx, page } = await site.open(url, 1440);
    try {
      const bad = await page.evaluate(() => {
        const H = JSON.parse(document.querySelector('[data-hours]')?.dataset.hours || 'null'); if (!H) return [];
        const W = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return [...document.querySelectorAll('.q-day, .days button, [data-days] button')].filter(b => !b.disabled && b.getAttribute('aria-disabled') !== 'true').map(b => b.getAttribute('aria-label') || b.dataset.sumText || '').filter(l => { const d = W.findIndex(x => l.includes(x) || l.startsWith(x.slice(0, 3))); return d >= 0 && !H[d]; });
      });
      assert.deepEqual(bad, [], `${url}: closed days offered`);
    } finally { await ctx.close(); }
  }
});

test('A8 · Hopwell starts empty and shows the result only after all three answers', async () => {
  const { ctx, page } = await site.open('/bunnyworld/hopwell-chiro/', 390);
  try {
    let r = await page.evaluate(() => ({ pressed: [...document.querySelectorAll('.panel .q .chip[aria-pressed="true"], .spot[aria-pressed="true"]')].length, card: !document.querySelector('.ans [data-ok]').closest('[hidden]') && document.querySelector('.ans').getBoundingClientRect().height > 0 && getComputedStyle(document.querySelector('.ans')).display !== 'none', from: !document.querySelector('[data-from]').hidden }));
    assert.deepEqual(r, { pressed: 0, card: false, from: false }, 'nothing chosen, no result card and no "Your answers" until the visitor answers');
    await page.locator('.spot[data-spot="neck"]').click();
    await page.locator('[data-group="long"] .chip[data-v="days"]').click();
    r = await page.evaluate(() => getComputedStyle(document.querySelector('.ans')).display !== 'none' && !document.querySelector('.ans').hidden);
    assert.equal(r, false, 'still no result after two answers');
    await page.locator('[data-group="worse"] .chip[data-v="lifting"]').click();
    r = await page.evaluate(() => ({ card: getComputedStyle(document.querySelector('.ans')).display !== 'none' && !document.querySelector('.ans').hidden, from: document.querySelector('[data-from]').textContent }));
    assert.equal(r.card, true, 'the result shows after the third answer');
    assert.match(r.from, /neck/i);
  } finally { await ctx.close(); }
});

test('A9 · closed shops don\'t offer pickup for tonight', async () => {
  const at = denver(2026, 11, 16, 21, 45); // Monday 9:45 pm: Burritos and the Bakehouse are both closed
  for (const url of ['/bunnyworld/bunny-burritos/', '/bunnyworld/warren-bakehouse/']) {
    const { ctx, page } = await openAt(url, 1440, at);
    try {
      const opts = await page.evaluate(() => [...document.querySelectorAll('form select option, form .q-opt')].map(o => o.textContent.trim()));
      const bad = opts.filter(t => /as soon as|within 30 minutes|within \d+ min|tonight|at \d{1,2}:\d\d ?pm today/i.test(t));
      assert.deepEqual(bad, [], `${url}: offers a pickup time that doesn't exist while closed`);
    } finally { await ctx.close(); }
  }
});

test('A10 · copy agrees with itself', async () => {
  const text = async url => { const { ctx, page } = await site.open(url, 1440); try { return await page.evaluate(() => document.body.innerText); } finally { await ctx.close(); } };
  const cot = await text('/bunnyworld/cottontail-farm/');
  const loops = [...new Set([...cot.matchAll(/\b(one|two|three|four)\s+loops\b/gi)].map(m => m[1].toLowerCase()))];
  assert.ok(loops.length <= 1, `Cottontail's maze has ${loops.join(' and ')} loops`);
  const hop = await text('/bunnyworld/hop-along/');
  assert.doesNotMatch(hop, /Updated \d{1,2}:\d\d/i, 'no invented "updated" timestamp');
  const packs = [...new Set([...hop.matchAll(/(?:4-pack|four cans)[^$\n]{0,30}\$(\d+)/gi)].map(m => m[1]))];
  assert.ok(packs.length <= 1, `Hop Along's four-packs cost ${packs.map(p => '$' + p).join(' and ')}`);
  assert.doesNotMatch(hop, /by text\s*\n?\s*Email/i, 'a "by text" offer over an email box');
  const bb = await text('/bunnyworld/burrow-and-bough/');
  assert.ok(!(/Prairie print/i.test(bb) && /Front Range print/i.test(bb)), 'Burrow & Bough names the same print two ways');
  const phone = async url => { const { ctx, page } = await site.open(url, 1440); try { return await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')))]); } finally { await ctx.close(); } };
  const [auto, ears] = [await phone('/bunnyworld/bunny-auto/'), await phone('/bunnyworld/long-ears/')];
  assert.deepEqual(auto.filter(p => ears.includes(p)), [], 'Bunny Auto and Long Ears share a phone number');
  const { ctx, page } = await site.open('/bunnyworld/bunny-auto/', 1440);
  try {
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-q]')].filter(s => /text you/i.test(s.dataset.q)).map(s => [...s.querySelectorAll('label')].map(l => l.textContent.trim()).join(' | ')));
    for (const l of r) assert.doesNotMatch(l, /email/i, '"Where do we text you?" asks for an email');
  } finally { await ctx.close(); }
});
