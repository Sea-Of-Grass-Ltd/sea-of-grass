// Owner text: the follow-up message Tristan or Bryce sends a shop owner after they say yes.
// Journey: in the Log, pick the shop -> shop name and domain fill in from the log (owner, register and registrar too
// when known) -> the "what I need from you" list matches their register -> one tap copies it -> they paste it into
// Messages themselves. Hermes never sends anything. The template holds no real shop's details.
// The signed-in half runs against a pretend data client (example shops only, never real prospects).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { startSite, ROOT } from '../lib/site.mjs';

const FILE = path.join(ROOT, 'hermes/owner-text.js');
const FOUNDING = 'You’re one of our five founding shops, so your Site Plan is $50 a month instead of $100, locked for two years, and I’ll photograph your food or shop for free.';
const REFERRAL = 'For every shop you send our way that signs up, your next month is on us, and their first month is on us too.';

function lib() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), box);
  return box.window.HermesOwnerText;
}
const base = { shop: 'Example Test Bakery', owner: 'Sam', register: 'square', domain: 'exampletestbakery.test', registrar: 'Example Registrar', me: 'Tristan' };

test('the text keeps the warm voice and both offer lines', () => {
  const t = lib().build(base);
  assert.match(t, /^Hi Sam, it’s Tristan from Sea of Grass\. Thank you again for saying yes, it means a lot to us\./);
  assert.match(t, /first draft of Example Test Bakery’s website is ready/);
  assert.ok(t.includes(FOUNDING), 'founding-five line');
  assert.ok(t.includes(REFERRAL), 'referral line');
  assert.match(t, /The login for exampletestbakery\.test \(it’s with Example Registrar\), so I can point it at the new site\./);
  assert.match(t, /When’s a good time for me to stop by\?$/);
});

test('"what I need from you" follows the register', () => {
  const sq = lib().build(base), sh = lib().build({ ...base, register: 'shopify' }), cl = lib().build({ ...base, register: 'clover' });
  assert.match(sq, /prices, put into your Square items/);
  assert.match(sh, /products set up in Shopify/);
  assert.match(cl, /items set up in Clover/);
  assert.doesNotMatch(sh, /Square|Clover/);
  assert.doesNotMatch(cl, /Square|Shopify/);
  assert.doesNotMatch(sq, /Shopify|Clover/);
  const none = lib().build({ ...base, register: '' });
  assert.doesNotMatch(none, /Square|Shopify|Clover/);
  assert.match(none, /prices/);
});

test('missing details read naturally, never as blanks', () => {
  const t = lib().build({ shop: '', owner: '', register: 'square', domain: '', registrar: '', me: 'Bryce' });
  assert.match(t, /^Hi, it’s Bryce from Sea of Grass\./);
  assert.match(t, /first draft of your website is ready/);
  assert.doesNotMatch(t, /undefined|null|\{|\}|\(it’s with \)|  /);
  assert.match(t, /login for your web address/);
  const noReg = lib().build({ ...base, registrar: '' });
  assert.match(noReg, /The login for exampletestbakery\.test, so I can point it/);
});

test('the template holds no real shop’s details', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  assert.doesNotMatch(src, /empanad|corn chef|namebright|orderabuel/i);
});

// pretend signed-in member + example data (the real list lives behind sign-in)
const FAKE = `(() => {
  const stops = [
    { id: 's1', region: 'golden', business: 'Example Test Bakery', town: 'Golden', kind: 'bakery', url: 'https://www.exampletestbakery.test/', position: 1 },
    { id: 's2', region: 'golden', business: 'Sample Corner Shop', town: 'Golden', kind: 'shop', url: '', register: 'clover', owner_first: 'Robin', position: 2 },
  ];
  const visits = [{ id: 'v1', business: 'Example Test Bakery', how: 'Walk-in', who: 'Owner', result: 'Yes', at: new Date().toISOString(), by_name: 'Tristan', stop_id: 's1', region: 'golden' }];
  const q = data => { const o = { select: () => o, order: () => o, then: (r, j) => Promise.resolve({ data, error: null }).then(r, j) }; return o; };
  const client = {
    auth: { onAuthStateChange(cb) { setTimeout(() => cb('SIGNED_IN', { user: { email: 'member@example.test' } }), 0); return { data: { subscription: { unsubscribe() {} } } }; }, signOut: async () => ({}) },
    rpc: async () => ({ data: true, error: null }),
    from: t => Object.assign(q(t === 'walkin_stops' ? stops : visits), { insert: async () => ({ error: null }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {},
  };
  Object.defineProperty(window, 'supabase', { value: { createClient: () => client }, writable: false });
  window.__copied = [];
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async s => { window.__copied.push(s); } } });
})();`;

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

for (const w of [360, 390]) {
  test(`at ${w}: pick a shop, the text fills in, one tap copies it`, async () => {
    const sent = [];
    const { page, errors, ctx } = await site.open('/hermes/#log', w, { initScript: FAKE });
    page.on('request', r => { if (r.method() !== 'GET') sent.push(r.url()); });
    await page.waitForSelector('#app:not([hidden])');
    await page.click('nav.tabs a[data-view="log"]');
    assert.equal(await page.isVisible('#ownerText'), true, 'the owner text sits in the Log');
    const opts = await page.$$eval('#otShop optgroup', gs => gs.map(g => [g.label, [...g.children].map(o => o.textContent)]));
    assert.deepEqual(opts[0], ['Said yes', ['Example Test Bakery']], 'shops that said yes come first');

    await page.selectOption('#otShop', 's1');
    assert.equal(await page.inputValue('#otDomain'), 'exampletestbakery.test', 'domain fills from the log');
    await page.fill('#otOwner', 'Sam');
    await page.selectOption('#otRegister', 'shopify');
    await page.fill('#otRegistrar', 'Example Registrar');
    const text = await page.inputValue('#otText');
    assert.match(text, /^Hi Sam, it’s Tristan from Sea of Grass/);
    assert.match(text, /Example Test Bakery’s website/);
    assert.match(text, /products set up in Shopify/);
    assert.match(text, /exampletestbakery\.test \(it’s with Example Registrar\)/);

    await page.click('#otCopy');
    assert.deepEqual(await page.evaluate(() => window.__copied), [text], 'one tap copies the finished text');
    assert.match(await page.innerText('#otStatus'), /Copied/);

    await page.selectOption('#otShop', 's2');
    assert.equal(await page.inputValue('#otOwner'), 'Robin', 'owner fills from the log when known');
    assert.equal(await page.inputValue('#otRegister'), 'clover', 'register fills from the log when known');
    assert.match(await page.inputValue('#otText'), /items set up in Clover/);
    await page.selectOption('#otShop', 's1');
    assert.equal(await page.inputValue('#otOwner'), 'Sam', 'details typed once come back for that shop');

    assert.deepEqual(sent, [], 'Hermes sends nothing');
    const small = await page.$$eval('#ownerText input, #ownerText select, #ownerText textarea', els => els.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id));
    assert.deepEqual(small, [], '16px fields');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `no sideways scroll (${over}px)`);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
