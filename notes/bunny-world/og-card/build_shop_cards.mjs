// Bunny World shop share cards, 1200x630, one flat template (2026-11-15).
// Usage: node build_shop_cards.mjs GRABDIR OUTDIR  (GRABDIR holds <shop>-page.png, <shop>-logo.png and info.json from a page grab)
// Flat colours only: each card takes its shop's own page background, ink and accent, its logo and a current screenshot.
import { chromium } from 'playwright-core'; import fs from 'fs';
const [,, G, OUT] = process.argv;
const info = JSON.parse(fs.readFileSync(`${G}/info.json`, 'utf8'));
const LINES = {
  'bunny-burritos': ['A restaurant site', 'Menu filters, pickup ordering, live hours.'],
  'bunny-auto': ['An auto repair site', 'Service prices, an estimate tool, booking.'],
  'warren-bakehouse': ['A bakery site', 'Live bread counts, pickup holds, custom cakes.'],
  'hare-today': ['A barbershop site', 'Walk-in wait times and booking by barber.'],
  'hop-along': ['A taproom site', 'A live tap list, the cans, events and party requests.'],
  'cottontail-farm': ['A farm festival site', 'Seasonal pages, timed tickets, a farm map.'],
  'burrow-and-bough': ['A gift shop site', 'A three-tap gift finder, pickup or shipping, gift wrap.'],
  'long-ears': ['A landscaping site', 'The August Test, turf vs water-wise, blowout booking.'],
  'hopwell-chiro': ['A clinic site', 'Point to where it hurts, insurance check, booking.'],
};
const fam = f => f.split(',')[0].replace(/"/g, '').trim();
const uri = p => fs.existsSync(p) ? 'data:image/png;base64,' + fs.readFileSync(p).toString('base64') : '';
const b = await chromium.launch({ channel: 'chrome' });
for (const [s, r] of Object.entries(info)) {
  const clear = r.accent.startsWith('rgba(0, 0, 0, 0');
  const accent = clear ? r.ink : r.accent, onAccent = clear ? r.bg : r.onAccent;
  const hf = fam(r.hf), q = encodeURIComponent(hf).replace(/%20/g, '+');
  const [kind, line] = LINES[s];
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${q}:wght@400;700;800;900&family=IBM+Plex+Mono:wght@500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>html,body{margin:0}
.c{width:1200px;height:630px;box-sizing:border-box;background:${r.bg};color:${r.ink};display:grid;grid-template-columns:430px 1fr;column-gap:44px;padding:52px 0 0 56px;font-family:Inter,sans-serif;overflow:hidden;position:relative}
.l{display:flex;flex-direction:column;padding-bottom:48px}
.logo{height:64px;max-width:380px;align-self:flex-start;margin-bottom:26px;display:flex;align-items:center}.logo img{max-height:64px;max-width:380px;width:auto;height:auto;display:block}
.k{font:500 14px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px;opacity:.75}
h1{font-family:"${hf}",sans-serif;font-weight:${r.hw};font-size:62px;line-height:.98;letter-spacing:-.02em;margin:0 0 18px}
.d{font:400 23px/1.35 Inter,sans-serif;margin:0;opacity:.85}
.tag{margin-top:auto;display:inline-block;align-self:flex-start;background:${accent};color:${onAccent};font:500 14px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;padding:9px 12px;border-radius:4px}
.shot{align-self:end;height:540px;border:3px solid ${r.ink};border-right:0;border-bottom:0;overflow:hidden;background:${r.bg}}
.shot img{display:block;width:860px;height:auto}
</style></head><body><div class="c"><div class="l">
${r.logo ? `<div class="logo"><img src="${uri(`${G}/${s}-logo.png`)}" alt=""></div>` : ''}
<p class="k">Bunny World · ${kind}</p><h1>${r.title.replace('&', '&amp;')}</h1><p class="d">${line}</p>
<span class="tag">seaofgrass.studio/bunnyworld</span></div>
<div class="shot"><img src="${uri(`${G}/${s}-page.png`)}" alt=""></div></div></body></html>`;
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/bw-${s}-2026-11.jpg`, type: 'jpeg', quality: 86 }); await p.close();
  console.log('ok', s);
}
await b.close();
