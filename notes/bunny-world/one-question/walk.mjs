// Walk every data-steps form at phone width, one frame per step, frames saved per form.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2], PHOTO = process.argv[3];
const BASE = 'http://localhost:8765/work/bunny-world/';
const FORMS = [
  ['bunny-auto', 0, 'bunny-auto-booking'], ['bunny-burritos', 0, 'bunny-burritos-pickup'], ['bunny-burritos', 1, 'bunny-burritos-table'],
  ['burrow-and-bough', 0, 'burrow-and-bough-bag'], ['cottontail-farm', 0, 'cottontail-groups'], ['cottontail-farm', 1, 'cottontail-jobs'],
  ['hare-today', 0, 'hare-today-crew'], ['hop-along', 0, 'hop-along-party'], ['hopwell-chiro', 0, 'hopwell-booking'],
  ['hopwell-chiro', 1, 'hopwell-intake'], ['long-ears', 0, 'long-ears-blowout'], ['long-ears', 1, 'long-ears-quote'],
  ['warren-bakehouse', 0, 'warren-hold'], ['warren-bakehouse', 1, 'warren-cake'],
];
const only = process.argv[4];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
for (const [shop, idx, name] of FORMS) {
  if (only && !name.includes(only)) continue;
  const page = await ctx.newPage();
  await page.goto(BASE + shop + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: 'header,.top,[class*=sticky],nav{position:static!important}.toast{display:none!important}' });
  const root = page.locator('[data-steps]').nth(idx);
  // forms behind a bag: put the first thing in it
  if (await root.evaluate(r => !!r.closest('.bag,aside,[class*=cart],[class*=order]') || r.dataset.demo === 'WB')) {
    const add = page.locator('[data-add]').first();
    if (await add.count()) { await add.scrollIntoViewIfNeeded(); await add.click(); await page.waitForTimeout(300); }
  }
  const shots = [];
  const snap = async () => {
    await page.waitForTimeout(450);
    await root.scrollIntoViewIfNeeded();
    const f = `${OUT}/${name}-${String(shots.length).padStart(2, '0')}.png`;
    await root.screenshot({ path: f }); shots.push(f);
  };
  for (let guard = 0; guard < 12; guard++) {
    await snap();
    const step = root.locator(':scope [data-q].q-step.on').filter({ has: page.locator('.q-body.on') }).last();
    if (!(await step.count())) break;
    const body = step.locator('.q-body.on .rv-in').first();
    const auto = await step.getAttribute('data-q-auto');
    const chip = body.locator('.q-opt');
    if (auto) { const b = body.locator(auto + ':not(:disabled)'); await b.nth(Math.min(1, (await b.count()) - 1)).click(); continue; }
    if (await chip.count()) { await chip.first().click(); continue; }
    // fill fields
    for (const el of await body.locator('input:not([type=hidden]),textarea').all()) {
      const t = await el.evaluate(e => ({ type: e.type, ac: e.autocomplete, ph: e.placeholder, val: e.value, min: e.min, req: e.required, lab: (e.closest('label') || {}).textContent || '' }));
      try {
        if (t.type === 'file') { await el.setInputFiles(PHOTO); continue; }
        if (t.type === 'checkbox' && t.req) { await el.check(); continue; }
        if (t.type === 'checkbox' || t.type === 'radio' || t.type === 'range') continue;
        if (t.type === 'number') { if (!t.val) await el.fill(String(Math.max(2, +t.min || 0) * (+t.min >= 100 ? 12 : 1))); continue; }
        if (t.type === 'date') { const d = new Date(Date.now() + 9 * 864e5); const s = d.toISOString().slice(0, 10); await el.fill(t.min && t.min > s ? t.min : s); continue; }
        if (t.val) continue;
        const l = (t.lab + ' ' + t.ac).toLowerCase();
        const v = t.type === 'tel' || /phone|tel/.test(l) && !/email/.test(l) ? '970-555-0142'
          : t.type === 'email' || /email/.test(l) ? 'theo@example.com'
          : t.type === 'url' ? 'https://instagram.com/theo.cuts'
          : /name/.test(l) ? 'Theo Baker'
          : t.ph && !/https?:/.test(t.ph) ? t.ph.replace(/\.\.\.$/, '')
          : /zip/.test(l) ? '80513'
          : /address|street|where/.test(l) ? '412 Mountain Ave'
          : (await el.evaluate(e => e.tagName)) === 'TEXTAREA' ? 'Side gate is unlocked.' : 'Theo';
        if (v) await el.fill(v);
      } catch (e) { console.log(name, 'fill', t.type, e.message.split('\n')[0]); }
    }
    const nx = body.locator('.q-next');
    if (await nx.count()) { await nx.click(); continue; }
    const sub = body.locator('[type=submit]');
    if (await sub.count()) { await sub.click(); await snap(); break; }
    break;
  }
  console.log(name, shots.length, 'frames');
  fs.writeFileSync(`${OUT}/${name}.list`, shots.join('\n'));
  await page.close();
}
await browser.close();
