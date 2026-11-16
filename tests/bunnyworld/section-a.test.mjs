// Critic review, Section A ("broken or untrue"), for the landing Buy flow, the shared form engine (bw.js),
// Hop Along, Bunny Auto, Bunny Burritos, Burrow & Bough and Long Ears. See notes/bunny-world/critic/REVIEW.md.
// Each test failed on main before the fix. Times are pinned to Colorado so "closed" and "this week" are checkable.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const TZ = 'America/Denver';
const SUN_NIGHT = '2026-11-15T21:45:00-07:00';   // Sunday 9:45 pm: the critic's visit, every shop closed
const TUE_NOON = '2026-11-17T12:00:00-07:00';    // Tuesday noon: Burritos open 11 to 9
const at = (url, time, w = 390) => site.open(url, w, { time, timezoneId: TZ, reducedMotion: 'reduce' });
const MINE = ['/bunnyworld/', '/bunnyworld/hop-along/', '/bunnyworld/bunny-auto/', '/bunnyworld/bunny-burritos/', '/bunnyworld/burrow-and-bough/', '/bunnyworld/long-ears/'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------- A2: Hop Along's "This week" ----------
test('A2 Hop Along: "This week" dates are real upcoming dates that match their weekdays', async () => {
  for (const [time, today] of [[SUN_NIGHT, new Date('2026-11-15T12:00:00-07:00')], ['2026-11-19T10:00:00-07:00', new Date('2026-11-19T12:00:00-07:00')]]) {
    const { ctx, page, errors } = await at('/bunnyworld/hop-along/', time);
    try {
      const posters = await page.$$eval('.poster', ps => ps.map(p => ({ day: p.querySelector('.day').textContent.trim(), date: p.querySelector('.date').textContent.trim(), what: p.querySelector('b').textContent })));
      assert.equal(posters.length, 4);
      let last = -1;
      for (const p of posters) {
        // find the date in the next 7 days with this day-of-month
        const k = [...Array(8).keys()].find(k => new Date(today.getTime() + k * 864e5).getUTCDate() === +p.date);
        assert.ok(k !== undefined, `${p.what}: ${p.day} ${p.date} is not in the coming week (${time})`);
        const d = new Date(today.getTime() + k * 864e5);
        assert.equal(p.day.slice(0, 3).toLowerCase(), WD[d.getUTCDay()].toLowerCase(), `${p.what}: ${p.day} ${p.date} names the wrong weekday`);
        assert.ok(k >= last, 'posters run in date order');
        last = k;
      }
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  }
  // on Sunday night the black bar must not shout Friday
  const { ctx, page } = await at('/bunnyworld/hop-along/', SUN_NIGHT);
  try {
    assert.doesNotMatch(await page.textContent('.tonight'), /Friday/i, 'the bar says Friday on a Sunday');
  } finally { await ctx.close(); }
});

test('A3 Hop Along: "+ Calendar" downloads a real .ics for that event', async () => {
  const { ctx, page } = await at('/bunnyworld/hop-along/', SUN_NIGHT);
  try {
    const cals = await page.$$eval('.poster', ps => ps.map(p => { const a = p.querySelector('a'); return { day: p.querySelector('.day').textContent.trim(), href: a.getAttribute('href'), dl: a.hasAttribute('download'), url: a.href }; }));
    for (const c of cals) {
      assert.match(c.href, /\.ics$/, `${c.day}: + Calendar is ${c.href}, not a calendar file`);
      assert.ok(c.dl, `${c.day}: + Calendar should download`);
      const r = await page.request.get(c.url); assert.equal(r.status(), 200, c.url);
      const ics = await r.text();
      assert.match(ics, /BEGIN:VCALENDAR[\s\S]*BEGIN:VEVENT[\s\S]*DTSTART[\s\S]*END:VEVENT[\s\S]*END:VCALENDAR/);
      assert.match(ics, new RegExp('BYDAY=' + c.day.slice(0, 2).toUpperCase()), `${c.day}: the event repeats on the wrong day`);
    }
  } finally { await ctx.close(); }
});

// ---------- A3: links that go nowhere ----------
test('A3 no dead links on the landing and these five shops', async () => {
  for (const url of MINE) {
    const { ctx, page } = await site.open(url, 1440);
    try {
      const links = await page.$$eval('a[href]', as => as.map(a => ({ raw: a.getAttribute('href'), href: a.href, text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 40) })));
      const bad = [];
      for (const l of links) {
        if (l.raw === '#' || l.raw === '' || /^javascript:/i.test(l.raw)) { bad.push(`"${l.text}" → ${l.raw || '(empty)'}`); continue; }
        if (l.raw.startsWith('#') && l.raw.length > 1 && !(await page.$(`[id="${l.raw.slice(1)}"]`))) bad.push(`"${l.text}" → ${l.raw} (no such id)`);
      }
      assert.deepEqual(bad, [], `${url}: links that go nowhere`);
      // same-site pages and files these links point at exist
      const base = new URL(page.url()).origin;
      const local = [...new Set(links.map(l => l.href.split('#')[0]).filter(h => h.startsWith(base) && h !== page.url().split('#')[0]))];
      for (const h of local) { const r = await page.request.get(h); assert.equal(r.status(), 200, `${url}: ${h.slice(base.length)} is missing`); }
    } finally { await ctx.close(); }
  }
});

test('A3 Hop Along: one "tonight\'s taps" button, not three', async () => {
  for (const w of [390, 1440]) {
    const { ctx, page } = await at('/bunnyworld/hop-along/', TUE_NOON, w);
    try {
      const n = await page.$$eval('a, button', es => es.filter(e => /tonight.s taps/i.test(e.textContent) && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length);
      assert.ok(n <= 1, `${n} "tonight's taps" buttons at ${w}`);
    } finally { await ctx.close(); }
  }
});

// ---------- A4: the Buy flow ----------
async function buy(page, add) {
  await page.click('.buy-btn');
  await page.click(`.buy-add[data-add="${add}"]`);
  await page.waitForSelector('.shop-drawer.on');
  return (await page.textContent('.shop-drawer')).replace(/\s+/g, ' ');
}
test('A4 Buy flow: the cart tells the real terms, not "$1,200 due today"', async () => {
  const { ctx, page } = await site.open('/bunnyworld/', 390);
  try {
    let t = await buy(page, 'starter');
    assert.doesNotMatch(t, /Due today \$1,200/, 'starter site shows $1,200 due today');
    assert.match(t, /\$360/, 'shows the 30% deposit ($360)');
    assert.match(t, /first draft/i, 'says when the deposit is due');
    assert.match(t, /\$840/, 'shows the rest ($840)');
    assert.match(t, /launch/i);
    await page.evaluate(() => window.sogCart.clear());
    await page.click('.shop-x');
    await page.waitForTimeout(300);
    t = await buy(page, 'fix');
    assert.match(t, /after it.s done/i, 'a fix is paid after it is done');
    assert.doesNotMatch(t, /Due today \$250/);
    await page.evaluate(() => window.sogCart.clear());
    await page.click('.shop-x');
    await page.waitForTimeout(300);
    t = await buy(page, 'starter-monthly');
    assert.match(t, /12 payments/);
    assert.match(t, /\$100/);
    assert.match(t, /first[^.]*draft/i, 'the first monthly payment is at the draft');
    assert.doesNotMatch(t, /Due today \$100/);
  } finally { await ctx.close(); }
});

test('A4 Buy flow: checkout ends in an honest confirmation, not a note for developers', async () => {
  const { ctx, page } = await site.open('/bunnyworld/', 390);
  try {
    await buy(page, 'starter');
    await page.click('.shop-go');
    await page.waitForLoadState('load');
    const co = (await page.textContent('body')).replace(/\s+/g, ' ');
    assert.doesNotMatch(co, /stands in for Stripe|payment links are set up|placeholder/i, 'checkout talks to developers');
    assert.doesNotMatch(co, /Due today \$1,200/);
    assert.match(co, /\$360/);
    assert.match(co, /nothing is charged|no payment/i);
    const back = await page.getAttribute('.sp-back', 'href');
    assert.match(back, /\/bunnyworld\//, 'Back goes to the page the buyer came from');
    await page.click('.sp-btn');
    await page.waitForLoadState('load');
    const thx = (await page.textContent('body')).replace(/\s+/g, ' ');
    assert.doesNotMatch(thx, /receipt is on its way/i, 'a demo order promises a receipt');
    assert.doesNotMatch(thx, /We.ll call within one business day/i, 'a demo order promises a call');
    assert.match(thx, /demo/i);
    assert.match(thx, /nothing was charged|no payment was taken/i);
  } finally { await ctx.close(); }
});

// ---------- A5: Bunny Auto's estimate ----------
test('A5 Bunny Auto: the estimate starts at the sum of the "from" prices and follows the vehicle', async () => {
  const { ctx, page } = await site.open('/bunnyworld/bunny-auto/', 390);
  try {
    const out = () => page.textContent('#estimate [data-out]');
    assert.doesNotMatch(await out(), /\$0/, 'shows $0 – $0 before anything is ticked');
    await page.check('#estimate input[value="Oil and filter change"]');
    await page.check('#estimate input[value="Brake pads"]');
    let lo = +(await out()).match(/\$(\d[\d,]*)/)[1].replace(',', '');
    assert.ok(lo >= 248, `estimate starts at $${lo}, below $59 + $189`);
    await page.selectOption('#estimate select', { label: 'European or diesel' });
    const lines = await page.$$eval('#estimate .opt', os => os.slice(0, 2).map(o => +o.querySelector('.price').textContent.replace(/[^\d]/g, '')));
    assert.ok(lines[0] > 59 && lines[1] > 189, `line prices stay ${lines} for a European car`);
    lo = +(await out()).match(/\$(\d[\d,]*)/)[1].replace(',', '');
    assert.equal(lo, lines[0] + lines[1], 'low end is the sum of the line prices shown');
  } finally { await ctx.close(); }
});

// ---------- A7 / A9: closed days and closed-shop pickup, in the shared engine ----------
test('A7 a "which date" day row greys out the days the shop is closed (Hop Along: Mondays)', async () => {
  const { ctx, page } = await at('/bunnyworld/hop-along/', SUN_NIGHT);
  try {
    const days = await page.$$eval('#party .q-day', bs => bs.map(b => ({ label: b.getAttribute('aria-label'), off: b.disabled })));
    assert.ok(days.length >= 7);
    const mondays = days.filter(d => /^Monday/.test(d.label));
    assert.ok(mondays.length >= 1);
    assert.ok(mondays.every(d => d.off), 'a Monday can be picked although the taproom is closed Mondays');
    assert.ok(days.filter(d => !/^Monday/.test(d.label)).every(d => !d.off), 'open days stay pickable');
  } finally { await ctx.close(); }
});

test('A9 Burritos pickup: closed means order for the next opening, open means real times before close', async () => {
  let { ctx, page } = await at('/bunnyworld/bunny-burritos/', SUN_NIGHT);
  try {
    const opts = await page.$$eval('#bb-cart select[data-sum="When"] option', os => os.map(o => o.textContent));
    assert.ok(!opts.some(o => /as soon as/i.test(o)), `offers "${opts[0]}" while closed`);
    assert.ok(opts.length >= 1 && opts.every(o => /Tuesday/.test(o)), `closed Sunday and Monday, so every time should be Tuesday: ${opts.join(' | ')}`);
    assert.match(await page.textContent('#bb-cart'), /closed/i, 'says the kitchen is closed');
  } finally { await ctx.close(); }
  ({ ctx, page } = await at('/bunnyworld/bunny-burritos/', TUE_NOON));
  try {
    const opts = await page.$$eval('#bb-cart select[data-sum="When"] option', os => os.map(o => o.textContent));
    assert.match(opts[0], /as soon as/i, 'open: first choice is as soon as it is ready');
    assert.ok(!opts.some(o => /9:30 pm|10 pm|10:00 pm/.test(o)), 'no time after closing');
  } finally { await ctx.close(); }
});

// ---------- A10: copy that miscounts or contradicts itself ----------
test('A10 Hop Along: tap count, timestamp, 4-pack price and the text/email sign-up agree with the page', async () => {
  const { ctx, page } = await at('/bunnyworld/hop-along/', SUN_NIGHT, 1440);
  try {
    const body = (await page.textContent('body')).replace(/\s+/g, ' ');
    assert.doesNotMatch(body, /Updated \d{1,2}:\d\d ?[ap]m/i, 'an invented "updated at" time');
    const head = (await page.textContent('.taps-head .label')).replace(/\s+/g, ' ');
    assert.doesNotMatch(await page.textContent('.taps-head h2'), /pouring now/i, '"Pouring now" while the bar is closed');
    const pouring = await page.$$eval('#ha-taps .row:not(.kicked)', r => r.length);
    const kicked = await page.$$eval('#ha-taps .row.kicked', r => r.length);
    assert.doesNotMatch(head, /\b6 on tap\b/i, `"6 on tap" with ${kicked} kicked`);
    assert.match(head, new RegExp(`\\b(${pouring}|five) pouring`, 'i'), 'says how many are actually pouring');
    const prices = new Set([...body.matchAll(/(?:4-pack[^$]{0,20}|four cans[^$]{0,20})\$(\d+)/gi)].map(m => m[1]));
    assert.equal(prices.size, 1, `a 4-pack has more than one price: ${[...prices]}`);
    const news = await page.$eval('.news', f => ({ label: f.querySelector('label').textContent, type: f.querySelector('input').type }));
    assert.ok(!(/by text/i.test(news.label) && news.type === 'email'), `"${news.label.trim()}" over an email box`);
  } finally { await ctx.close(); }
});

test('A10 Bunny Auto: "we text you" asks for a phone number', async () => {
  const { ctx, page } = await site.open('/bunnyworld/bunny-auto/', 390);
  try {
    const f = await page.$eval('form[data-demo="BA"]', f => ({ ok: f.dataset.ok, step: [...f.querySelectorAll('[data-q]')].pop().dataset.q, inputs: [...f.querySelectorAll('[data-q]:last-of-type input, input[autocomplete]')].map(i => ({ type: i.type, ac: i.autocomplete, label: i.closest('label')?.textContent.trim() })) }));
    const contact = f.inputs.filter(i => i.ac !== 'name');
    assert.ok(/text/i.test(f.ok + f.step));
    assert.ok(contact.length && contact.every(i => i.type === 'tel' && !/email/i.test(i.label)), `texting needs a phone box, got ${JSON.stringify(contact)}`);
  } finally { await ctx.close(); }
});

test('A10 Burrow & Bough: the $40 print is described the same in the gift finder and the shop', async () => {
  const { ctx, page } = await site.open('/bunnyworld/burrow-and-bough/', 1440);
  try {
    const html = await (await page.request.get(new URL('/bunnyworld/burrow-and-bough/', page.url()).href)).text();
    const finder = await (await page.request.get(new URL('/bunnyworld/burrow-and-bough/finder.js', page.url()).href)).text();
    const all = html + finder;
    assert.ok(!(/Risograph/i.test(all) && /Screen-print/i.test(all)), 'risograph in one place, screen-printed in the other');
    assert.doesNotMatch(finder, /short:'Prairie print'/, 'the finder renames the Front Range print');
  } finally { await ctx.close(); }
});

test('A10 no two shops share a phone number (Bunny Auto and Long Ears)', async () => {
  const shops = ['hare-today', 'hop-along', 'hopwell-chiro', 'cottontail-farm', 'burrow-and-bough', 'bunny-burritos', 'bunny-auto', 'warren-bakehouse', 'long-ears'];
  const { ctx, page } = await site.open('/bunnyworld/', 390);
  try {
    const owner = new Map(), clash = [];
    for (const s of shops) {
      const html = await (await page.request.get(new URL(`/bunnyworld/${s}/`, page.url()).href)).text();
      for (const n of new Set([...html.matchAll(/(?:tel|sms):\+?1?(\d{10})/g)].map(m => m[1]))) {
        if (owner.has(n) && owner.get(n) !== s) clash.push(`${n}: ${owner.get(n)} and ${s}`); else owner.set(n, s);
      }
    }
    assert.deepEqual(clash, []);
  } finally { await ctx.close(); }
});
