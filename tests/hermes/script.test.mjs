// Founding-five script in Hermes. Journey: mid-visit, Tristan or Bryce has the Log open on his phone -> taps "Script" ->
// sees both sides of the pocket card (five steps, then "If they say…") and how many founding spots are really left ->
// one tap back to the Log. The spots count lives in one file (hermes/founding.js) and is never invented by the page.
// The signed-in app needs a real account, so these tests open it with the sign-in card set aside: the Script view and
// the counter are static and don't need data.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { startSite, ROOT } from '../lib/site.mjs';

const PAGE = '/hermes/';
const CONFIG = path.join(ROOT, 'hermes/founding.js');

function readConfig() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(CONFIG, 'utf8'), box);
  return box.window.FOUNDING_FIVE;
}

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

const front0 = s => s.replace(/\s+/g, ' ');
async function openApp(w) {
  const o = await site.open(PAGE, w);
  // stand in for a signed-in member: show the app shell (no data is loaded or needed for the script)
  await o.page.evaluate(() => { document.getElementById('gate').hidden = true; document.getElementById('app').hidden = false; });
  return o;
}

test('the paid founding offer everywhere: no free month left in Hermes', () => {
  for (const f of ['index.html', 'app.js', 'owner-text.js', 'founding.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'hermes', f), 'utf8');
    assert.doesNotMatch(src, /free month|first month (is )?free|month free/i, f);
    assert.doesNotMatch(src, /transform your business/i, f);
  }
});

test('the spots count lives in one place and is honest', () => {
  assert.ok(fs.existsSync(CONFIG), 'hermes/founding.js holds the count');
  const f = readConfig();
  assert.equal(f.total, 5, 'five founding shops');
  assert.ok(Number.isInteger(f.left) && f.left >= 0 && f.left <= f.total, `spots left is a whole number from 0 to ${f.total}`);
  assert.equal(f.left, 5, 'starts at 5 of 5 (no shops signed yet)');
  const html = fs.readFileSync(path.join(ROOT, 'hermes/index.html'), 'utf8');
  assert.match(html, /<script src="founding\.js[^"]*"><\/script>/, 'the page loads the count from founding.js');
  assert.doesNotMatch(html, /\d\s*of\s*5\s*(spots|left)|spots left:\s*\d/i, 'no count typed into the HTML');
});

for (const w of [360, 390]) {
  test(`at ${w}: one tap from the Log to the script, both sides of the card`, async () => {
    const { page, errors, ctx } = await openApp(w);
    await page.click('nav.tabs a[data-view="log"]');
    assert.equal(await page.isVisible('#v-log'), true);
    const toScript = page.locator('#v-log a[href="#script"]').first();
    assert.equal(await toScript.isVisible(), true, 'a Script link sits in the Log view');
    await toScript.click();
    assert.equal(await page.isVisible('#v-script'), true, 'one tap opens the script');
    assert.equal(await page.getAttribute('nav.tabs a[data-view="script"]', 'aria-current'), 'page');

    const steps = await page.$$eval('#v-script .card-front ol > li', lis => lis.map(li => li.querySelector('.k').textContent.replace(/\W+$/, '')));
    assert.deepEqual(steps, ['Opener', 'Hook', 'Ask what they want', 'Offer', 'Show']);
    assert.match(front0(await page.innerText('#v-script .card-front ol > li:nth-child(3)')), /more orders, or fewer phone calls and your menu and hours showing right when people search/);
    assert.match(await page.innerText('#v-script .card-front ol > li:nth-child(5)'), /then close.*put you down as one of the five/s);
    const front = await page.innerText('#v-script .card-front');
    assert.match(front, /locked at \$50 a month for two years/);
    assert.match(front, /photograph your food for free/);
    assert.match(front, /All we ask is an honest review/);
    assert.doesNotMatch(front, /free month|month free|for a year/i);
    assert.match(front, /Bunny World/);
    assert.match(front, /Never push past a no/);
    const answers = await page.locator('#v-script .card-back dt').allInnerTexts();
    assert.equal(answers.length, 6, 'six "If they say…" answers');
    assert.match(answers.join(' | '), /No time.*Facebook.*Don.t need more business.*register.*catch.*Not right now/s);
    assert.match(await page.innerText('#v-script .card-back'), /\$50 a month from day one, cancel any time\. Back out at the hookup and you owe nothing\./);
    assert.doesNotMatch(await page.innerText('#v-script .card-back'), /free month/i);
    assert.match(await page.innerText('#v-script .card-back'), /menu, hours, no ordering, or ordering you switch off when it.s busy/);

    assert.match(await page.innerText('#spotsLeft'), /^5 of 5 spots left$/);

    const back = page.locator('#v-script a[href="#log"]').first();
    assert.equal(await back.isVisible(), true, 'one tap back to the Log');
    await back.click();
    assert.equal(await page.isVisible('#v-log'), true);
    assert.deepEqual(errors.filter(e => !/supabase|Sign-in/i.test(e)), []);
    await ctx.close();
  });

  test(`at ${w}: readable, no sideways scroll, 16px inputs`, async () => {
    const { page, ctx } = await openApp(w);
    for (const v of ['script', 'log', 'stops', 'pitch']) {
      await page.click(`nav.tabs a[data-view="${v}"]`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `${v}: no sideways scroll (${over}px)`);
    }
    const tabs = await page.$$eval('nav.tabs a', as => as.map(a => ({ t: a.textContent.trim(), clip: a.scrollWidth > a.clientWidth + 1, h: a.getBoundingClientRect().height })));
    assert.deepEqual(tabs.map(t => t.t), ['Script', 'Stops', 'Pitch', 'Costs', 'Log']);
    for (const t of tabs) { assert.equal(t.clip, false, `${t.t} tab label fits`); assert.ok(t.h >= 44, `${t.t} tab is a 44px target`); }
    await page.click('nav.tabs a[data-view="log"]');
    const small = await page.$$eval('#app input:not([type=radio]):not([type=range]), #app select, #app textarea', els => els.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.tagName));
    assert.deepEqual(small, [], 'every field is at least 16px (no zoom on iPhone)');
    await page.click('nav.tabs a[data-view="script"]');
    const tiny = await page.$$eval('#v-script dd, #v-script li, #v-script dt', els => els.filter(e => parseFloat(getComputedStyle(e).fontSize) < 15).length);
    assert.equal(tiny, 0, 'script text is at least 15px');
    await ctx.close();
  });
}
