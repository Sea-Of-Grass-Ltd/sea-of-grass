// Bunny World landing posters: real screenshots of the live shops (2026-11-16).
// Usage (from tests/, which has playwright-core):  node ../notes/bunny-world/posters/capture.mjs OUTDIR [BASE]
// BASE defaults to https://seaofgrass.studio. Writes poster-<shop>-laptop.png (1280x800 page at 0.75 = 960x600)
// and poster-<shop>-phone.png (390x844 phone). Then: cwebp -q 80 -m 6 each into preview/assets/work/bunny-world/.
import { chromium } from 'playwright-core'; import fs from 'fs';
const [,, OUT, BASE = 'https://seaofgrass.studio'] = process.argv;
const SHOPS = ['bunny-burritos', 'bunny-auto', 'warren-bakehouse', 'hare-today', 'hop-along', 'cottontail-farm', 'burrow-and-bough', 'long-ears', 'hopwell-chiro'];
const KINDS = { laptop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75 }, phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } };
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
for (const s of SHOPS) for (const [kind, o] of Object.entries(KINDS)) {
  const ctx = await b.newContext({ ...o, reducedMotion: 'reduce', colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/bunnyworld/${s}/?poster=${Date.now()}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/poster-${s}-${kind}.png` });
  await ctx.close(); console.log('ok', s, kind);
}
await b.close();
