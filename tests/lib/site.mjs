// Shared test harness: a tiny static server over the repo (or SITE_ROOT) and a Chrome page opened offline.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = process.env.SITE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

export async function startSite() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch {}
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  return {
    base, browser,
    async close() { await browser.close(); server.close(); },
    async open(url, w, opts = {}) {
      const mobile = w < 900;
      const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: opts.reducedMotion || 'no-preference', colorScheme: opts.colorScheme || 'light', deviceScaleFactor: opts.scale || (mobile ? 3 : 1) });
      // third-party (fonts, analytics, maps, booking embeds) is not part of the page under test
      await ctx.route(u => !u.href.startsWith(base), r => r.abort());
      const page = await ctx.newPage();
      const errors = [], failed = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && (m.location().url || '').startsWith(base) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(base.length)}`); });
      await page.goto(base + url, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      return { ctx, page, errors, failed };
    },
  };
}
