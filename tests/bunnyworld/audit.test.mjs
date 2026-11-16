// AI-UI checklist audit (notes/bunny-world/ai-ui-checklist.md), automated.
// Runs every checkable item on the Bunny World landing and all nine shops at 360, 390 and 1440.
// AUDIT_OUT=dir also writes findings.json and a screenshot per failing item (red box on the offender).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startSite, ROOT } from '../lib/site.mjs';

export const PAGES = ['/bunnyworld/', ...['hare-today', 'hop-along', 'hopwell-chiro', 'cottontail-farm', 'burrow-and-bough', 'bunny-burritos', 'bunny-auto', 'warren-bakehouse', 'long-ears'].map(s => `/bunnyworld/${s}/`)];
const WIDTHS = [360, 390, 1440];
const ONLY = process.env.AUDIT_PAGE; // e.g. AUDIT_PAGE=hop-along
const OUT = process.env.AUDIT_OUT;
if (OUT) fs.mkdirSync(OUT, { recursive: true });

let site;
const all = [];
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); if (OUT) fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(all, null, 1)); });

// ---- the checks that run inside the page; each returns [{item, detail, rect}] ----
function inPageChecks(phone) {
  const out = [];
  const add = (item, detail, el) => { const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; out.push({ item, detail, rect: r && { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } }); };
  const vis = e => { if (e.closest('[hidden],[inert],[aria-hidden="true"]')) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const sr = e => !!e.closest('.sr,.sr-only,.visually-hidden');
  const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]')].filter(e => vis(e) && !sr(e));
  const actions = targets.filter(e => e.matches('a[href], button, [role=button], [role=tab]'));
  const zone = e => e.closest('.demo') || e.closest('.want') || e.closest('header') || e.closest('footer') || e.closest('nav') || e.closest('main > section, body > section') || document.body;

  // Duplication: the same action twice in one view (same zone, same label)
  const seen = new Map();
  // the same button on each card of a list is one action per item
  const item = e => e.closest('li, article, tr, [class*="card"], [data-item], [data-sku]');
  for (const a of actions) { const t = text(a).toLowerCase(); if (!t || t.length > 60) continue; const it = item(a); const k = t + (it ? '|' + [...(it.parentElement?.children || [])].indexOf(it) : ''); const z = zone(a); if (!seen.has(z)) seen.set(z, new Map()); const m = seen.get(z); if (m.has(k)) add('dup-action', `"${text(a)}" twice in ${z.className || z.tagName}`, a); else m.set(k, a); }
  // Duplication: two schedulers
  const sched = document.querySelectorAll('[data-slots]'); if (sched.length > 1) add('dup-block', `${sched.length} scheduling blocks`, sched[1]);
  // Duplication: the same link at the top and the bottom of the page
  const norm = h => { try { const u = new URL(h, location.href); return u.origin + u.pathname + u.search + u.hash; } catch { return h; } };
  const top = actions.filter(a => a.href && (a.closest('header') || a.closest('.demo'))), bottom = actions.filter(a => a.href && (a.closest('footer') || a.closest('.want')));
  for (const b of bottom) { const t = top.find(a => norm(a.href) === norm(b.href) && !/^tel:|^mailto:/.test(b.href)); if (t) add('dup-header-footer', `"${text(b)}" repeats "${text(t)}" (${new URL(b.href).pathname})`, b); }

  // Copy: counts that don't match
  const N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  const shopLinks = new Set([...document.querySelectorAll('a[href]')].map(a => { const m = new URL(a.href, location.href).pathname.match(/^\/bunnyworld\/([a-z-]+)\/$/); return m && m[1] !== 'brand' ? m[1] : null; }).filter(Boolean));
  for (const e of document.querySelectorAll('h1,h2,h3,p,li,figcaption,button,a')) {
    if (!vis(e) || [...e.children].some(c => /^(P|LI|H\d)$/.test(c.tagName))) continue;
    for (const m of text(e).toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|[1-9]\d*)\s+(?:[a-z-]+\s+){0,2}?(questions?|shops?|steps?)\b/g)) {
      const n = N[m[1]] ?? +m[1]; const sec = e.closest('section, main') || document.body; let real = null;
      if (m[2].startsWith('question')) { const q = sec.querySelectorAll('.q, [data-q]').length || document.querySelectorAll('.hook .q').length; real = q || null; }
      if (m[2].startsWith('shop') && location.pathname === '/bunnyworld/') real = document.querySelectorAll('[role=tab][data-shop]').length || shopLinks.size;
      if (m[2].startsWith('step')) { const ol = sec.querySelector('ol'); real = ol ? ol.children.length : null; }
      if (real !== null && real !== n) add('copy-count', `"${m[0]}" but ${real} on the page`, e);
    }
  }
  // Copy: mixed title forms inside one set
  const groups = [];
  document.querySelectorAll('[data-steps]').forEach(f => groups.push([...f.querySelectorAll('.q-h')].filter(h => h.closest('[data-steps]') === f)));
  document.querySelectorAll('.panel, .hook').forEach(p => groups.push([...p.querySelectorAll('.q .t')]));
  for (const g of groups) { const ts = g.map(h => text(h).replace(/^\d+\s*/, '')).filter(Boolean); const q = ts.filter(t => t.endsWith('?')); if (q.length && q.length < ts.length) add('copy-mixed-titles', `mixed: ${JSON.stringify(ts)}`, g[ts.findIndex(t => !t.endsWith('?'))]); const words = ts.map(t => t.split(' ').length); if (q.length === ts.length && Math.min(...words) < 2 && Math.max(...words) >= 3) add('copy-mixed-titles', `short beside full questions: ${JSON.stringify(ts)}`, g[words.indexOf(Math.min(...words))]); }
  // Copy: placeholder or invented-sounding text, vague labels
  const body = document.body.innerText;
  for (const re of [/lorem ipsum/i, /john doe|jane doe/i, /updated (just now|\d+ min(ute)?s? ago)/i, /\bTODO\b|\bTBD\b|\bFIXME\b/]) { const m = body.match(re); if (m) { const el = [...document.querySelectorAll('body *')].find(x => x.children.length === 0 && re.test(x.textContent)); add('copy-placeholder', `"${m[0]}"`, el); } }
  for (const a of actions) if (/^(submit|click here|ok|go)$/i.test(text(a))) add('copy-vague-button', `"${text(a)}"`, a);

  // Effects: blurred shadows, gradients, blur filters (the design is flat).
  // A page may opt into neumorphism with two tokens (--neu-up, --neu-in): those shadows pass when they sit on the
  // rounded element itself (not a pseudo-element) and the glow (blur + spread + offset) fits inside its radius.
  const probe = document.createElement('i'); probe.style.display = 'block'; document.body.appendChild(probe);
  const tok = v => { probe.style.boxShadow = ''; probe.style.boxShadow = `var(${v})`; const s = getComputedStyle(probe).boxShadow; return s && s !== 'none' ? s : null; };
  const NEU = [tok('--neu-up'), tok('--neu-in')].filter(Boolean); probe.remove();
  const neuOk = (e, c) => { if (!NEU.includes(c.boxShadow)) return false; const r = e.getBoundingClientRect(); const rad = Math.min(parseFloat(c.borderTopLeftRadius), parseFloat(c.borderBottomRightRadius), r.height / 2, r.width / 2); if (!(rad > 0)) return false;
    const reach = Math.max(0, ...c.boxShadow.split(/,(?![^(]*\))/).filter(l => !/inset/.test(l)).map(l => { const n = l.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat); return (n[2] || 0) + (n[3] || 0) + Math.max(Math.abs(n[0] || 0), Math.abs(n[1] || 0)); })); return reach <= rad + 0.5; };
  for (const e of document.querySelectorAll('body *')) {
    if (!e.getBoundingClientRect().width) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const c = getComputedStyle(e, pseudo); if (pseudo && (c.content === 'none' || c.content === 'normal')) continue;
      const label = (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()) + (pseudo || '');
      if (c.boxShadow !== 'none' && !(pseudo === null && neuOk(e, c))) { const blurred = c.boxShadow.split(/,(?![^(]*\))/).some(s => { const n = s.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).filter(x => x.endsWith('px')).map(parseFloat); return (n[2] || 0) > 0; }); if (blurred) add('fx-shadow', `${label}: ${c.boxShadow.slice(0, 80)}`, e); }
      if (c.textShadow !== 'none' && c.textShadow.split(/,(?![^(]*\))/).some(s => (s.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat)[2] || 0) > 0)) add('fx-shadow', `${label}: text-shadow ${c.textShadow.slice(0, 60)}`, e);
      const hardStops = g => { const ps = g.match(/\d+(\.\d+)?%/g) || []; return ps.length >= 2 && ps.every(p => ps.filter(q => q === p).length >= 2); };
      if (/gradient\(/.test(c.backgroundImage) && !hardStops(c.backgroundImage)) add('fx-gradient', `${label}: ${c.backgroundImage.slice(0, 60)}`, e);
      if (/blur\(/.test(c.filter) || /blur\(/.test(c.backdropFilter || '')) add('fx-blur', `${label}: ${c.filter} ${c.backdropFilter || ''}`.trim(), e);
    }
  }
  // Effects: things left invisible after load (opacity 0 and taking space)
  for (const e of document.querySelectorAll('main *, body > section *')) { const r = e.getBoundingClientRect(); if (r.width * r.height < 2500 || e.closest('[hidden],[aria-hidden="true"]') || e.matches('input,select,textarea')) continue;
    const stacked = [...(e.parentElement?.children || [])].some(o => o !== e && +getComputedStyle(o).opacity > 0.5 && Math.abs(o.getBoundingClientRect().width - r.width) < 2 && Math.abs(o.getBoundingClientRect().top - r.top) < 2); if (stacked) continue; const c = getComputedStyle(e); if (+c.opacity === 0 && c.visibility !== 'hidden' && !e.closest('[inert]')) { add('fx-invisible', `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]} stays at opacity 0`, e); } }

  // Layout: sideways scroll
  const over = document.documentElement.scrollWidth - innerWidth; if (over > 0) add('layout-sideways', `${over}px wider than the screen`, [...document.querySelectorAll('body *')].find(e => e.getBoundingClientRect().right > innerWidth + 1));
  // Layout: tap targets overlapping, too small, too close
  // a target's hit area includes an absolutely placed ::before/::after (e.g. a 16px dot with a 40px invisible ring)
  const hitRect = e => { let r = e.getBoundingClientRect(), { left, top, right, bottom } = r;
    for (const ps of ['::before', '::after']) { const c = getComputedStyle(e, ps); if (c.content === 'none' || c.position !== 'absolute') continue; const w = parseFloat(c.width), h = parseFloat(c.height); if (w > r.width || h > r.height) { const cx = (left + right) / 2, cy = (top + bottom) / 2; left = Math.min(left, cx - w / 2); right = Math.max(right, cx + w / 2); top = Math.min(top, cy - h / 2); bottom = Math.max(bottom, cy + h / 2); } }
    return { left, top, right, bottom, width: right - left, height: bottom - top }; };
  const R = targets.map(e => ({ e, r: hitRect(e) }));
  const inlineText = e => e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && text(e.parentElement).length > text(e).length + 3;
  for (let i = 0; i < R.length; i++) {
    const a = R[i];
    if (phone && !inlineText(a.e) && !a.e.matches('input[type=checkbox],input[type=radio],input[type=range]') && (a.r.height < 39.5 || a.r.width < 39.5)) add('layout-small-target', `${Math.round(a.r.width)}×${Math.round(a.r.height)} "${text(a.e).slice(0, 30) || a.e.getAttribute('aria-label') || a.e.tagName}"`, a.e);
    for (let j = i + 1; j < R.length; j++) {
      const b = R[j]; if (a.e.contains(b.e) || b.e.contains(a.e) || (a.e.closest('label') && a.e.closest('label') === b.e.closest('label'))) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 2 && iy > 2) add('layout-overlap', `"${text(a.e).slice(0, 24) || a.e.tagName}" overlaps "${text(b.e).slice(0, 24) || b.e.tagName}"`, a.e);
      else if (phone && !inlineText(a.e) && !inlineText(b.e) && ((ix > 0 && iy > -8 && iy <= 2 && Math.min(a.r.height, b.r.height) < 44) || (iy > 0 && ix > -8 && ix <= 2 && Math.min(a.r.width, b.r.width) < 44))) add('layout-close-targets', `"${text(a.e).slice(0, 24) || a.e.tagName}" and "${text(b.e).slice(0, 24) || b.e.tagName}" ${Math.round(-Math.max(ix, iy) < 0 ? Math.max(-ix, -iy) : 0)}px apart`, a.e);
    }
  }
  // Layout: floating buttons and badges (position: fixed, not a full-width bar) sit over the page content on phones
  if (phone) for (const e of document.querySelectorAll('body *')) {
    const c = getComputedStyle(e); if (c.position !== 'fixed' || !vis(e) || e.closest('[hidden]')) continue;
    const r = e.getBoundingClientRect(); if (r.width >= innerWidth * 0.95 || r.width * r.height < 100) continue;
    add('layout-floating-cover', `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]} "${text(e).slice(0, 24)}" floats over the content`, e);
  }
  // Layout: inputs under 16px on phones (iOS zooms)
  if (phone) for (const e of targets.filter(e => e.matches('input,select,textarea'))) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 16 && !e.matches('[type=checkbox],[type=radio],[type=range]')) add('layout-input-font', `${fs}px ${e.tagName.toLowerCase()}`, e); }

  // Works: links to nowhere
  for (const a of document.querySelectorAll('a[href]')) { const h = a.getAttribute('href'); if (h === '#' || h === '' || /^javascript:/i.test(h)) { if (!a.hasAttribute('data-demo-link')) add('link-nowhere', `"${text(a)}" → "${h}"`, a); } else if (h.startsWith('#') && h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))) add('link-nowhere', `"${text(a)}" → missing ${h}`, a); }
  // Consistency: og:image present
  const og = document.querySelector('meta[property="og:image"]'); if (!og) add('og-missing', 'no og:image', null);
  return { out, internal: [...new Set([...document.querySelectorAll('a[href]')].map(a => new URL(a.href, location.href)).filter(u => u.origin === location.origin).map(u => u.pathname))], og: og && og.content };
}

// Form fields (Tristan, Hopwell step 5): nothing runs past its form, checkboxes are styled and at least 24px.
function formChecks() {
  const out = [];
  const rectOf = e => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; };
  const name = e => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''}${e.type ? '[' + e.type + ']' : ''}${e.autocomplete ? '[' + e.autocomplete + ']' : ''}`;
  for (const form of document.querySelectorAll('form')) {
    const fr = form.getBoundingClientRect(); if (!fr.width) continue;
    for (const e of form.querySelectorAll('input:not([type=hidden]), select, textarea, label, .row, .days, .slots, .q-opts, button')) {
      const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      // inside a sideways-scrolling strip, the strip is what must fit
      if (e.parentElement && e.parentElement.closest('form') === form && [...ancestors(e.parentElement, form)].some(a => /auto|scroll/.test(getComputedStyle(a).overflowX))) continue;
      if (r.right > fr.right + 1.5 || r.left < fr.left - 1.5) out.push({ item: 'form-overflow', detail: `${name(e)} runs ${Math.round(Math.max(r.right - fr.right, fr.left - r.left))}px past its form`, rect: rectOf(e) });
      // a field or label must also fit inside the box that holds it (a date input that won't shrink pushes its column past the row and gets clipped)
      const par = e.parentElement;
      if (par && par !== form && e.matches('input, select, textarea, label')) { const pr = par.getBoundingClientRect(); if (pr.width > 1 && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5)) out.push({ item: 'form-overflow', detail: `${name(e)} runs ${Math.round(Math.max(r.right - pr.right, pr.left - r.left))}px past its ${name(par)}`, rect: rectOf(e) }); }
    }
    for (const e of form.querySelectorAll('input[type=checkbox], input[type=radio]')) {
      const r = e.getBoundingClientRect(), c = getComputedStyle(e); if (r.width < 1 || c.visibility === 'hidden' || +c.opacity < .05) continue;
      if (c.appearance !== 'none' && c.webkitAppearance !== 'none') out.push({ item: 'form-native-checkbox', detail: `${name(e)} is the browser's default box`, rect: rectOf(e) });
      else if (r.width < 23.5 || r.height < 23.5) out.push({ item: 'form-native-checkbox', detail: `${name(e)} is ${Math.round(r.width)}px, under 24px`, rect: rectOf(e) });
    }
  }
  function* ancestors(e, stop) { for (let a = e; a && a !== stop; a = a.parentElement) yield a; }
  return out;
}

async function shoot(page, f, file) {
  if (!OUT || !f.rect) return;
  await page.evaluate(r => { const d = document.createElement('div'); d.id = '__audit_box'; Object.assign(d.style, { position: 'absolute', left: r.x - 4 + 'px', top: r.y - 4 + 'px', width: r.w + 8 + 'px', height: r.h + 8 + 'px', outline: '3px solid #e00', zIndex: 99999, pointerEvents: 'none' }); document.body.appendChild(d); }, f.rect);
  const vw = page.viewportSize().width, y = Math.max(0, f.rect.y - 160);
  await page.screenshot({ path: path.join(OUT, file), fullPage: true, clip: { x: 0, y, width: vw, height: Math.max(200, Math.min(700, f.rect.h + 320)) } }).catch(() => {});
  await page.evaluate(() => document.getElementById('__audit_box')?.remove());
}

for (const url of PAGES.filter(u => !ONLY || u.includes(ONLY))) {
  const slug = url.split('/').filter(Boolean).pop();
  for (const w of WIDTHS) {
    test(`${slug} @ ${w}`, async t => {
      const { ctx, page, errors, failed } = await site.open(url, w);
      try {
        // scroll through so lazy and reveal-on-scroll content has its chance to show
        const h = await page.evaluate(() => document.body.scrollHeight);
        for (let y = 0; y < h; y += 500) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(60); }
        await page.waitForTimeout(700); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
        const { out, internal, og } = await page.evaluate(inPageChecks, w < 900);
        // internal links and og image must resolve
        for (const p of internal) { const r = await page.request.get(site.base + p).catch(() => null); if (!r || r.status() >= 400) out.push({ item: 'link-nowhere', detail: `link to ${p} is ${r ? r.status() : 'unreachable'}` }); }
        if (og) { const local = og.replace(/^https:\/\/seaofgrass\.studio/, ''); if (!fs.existsSync(path.join(ROOT, local))) out.push({ item: 'og-missing', detail: `og:image file not found: ${local}` }); }
        const shots = {};
        // forms, on a fresh copy of the page with every step opened (step-by-step forms hide later steps)
        {
          const fp = await site.open(url, w);
          try {
            // open them the way the engine does (its own .on class), so open steps get their real padding
            await fp.page.addStyleTag({ content: '.reveal{transition:none!important}' });
            await fp.page.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => e.classList.add('on')); document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });
            await fp.page.waitForTimeout(100);
            const ff = await fp.page.evaluate(formChecks);
            // focus each text field the way a keyboard user would and check its ring
            const fields = await fp.page.$$('form input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), form select, form textarea');
            for (const el of fields) {
              if (!(await el.isVisible())) continue;
              await el.focus();
              const bad = await el.evaluate(e => {
                const c = getComputedStyle(e), id = `${e.tagName.toLowerCase()}${e.name ? '[name=' + e.name + ']' : ''}${e.autocomplete ? '[' + e.autocomplete + ']' : ''}`;
                const layers = c.boxShadow === 'none' ? [] : c.boxShadow.split(/,(?![^(]*\))/);
                const blurred = layers.some(l => { const n = l.replace(/rgba?\([^)]*\)|inset/g, '').trim().split(/\s+/).map(parseFloat); return (n[2] || 0) > 0; });
                const outline = c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 && c.outlineColor !== 'rgba(0, 0, 0, 0)';
                const border = parseFloat(c.borderTopWidth) > 0;
                const probs = [];
                if (layers.length > 1) probs.push(`${layers.length} stacked shadows`);
                if (blurred && !layers.every(l => /inset/.test(l))) probs.push('a blurred glow');
                if (outline && (layers.length || (border && parseFloat(c.outlineOffset) > 0))) probs.push(`an outline${parseFloat(c.outlineOffset) > 0 ? ' offset ' + c.outlineOffset : ''} on top of its ${layers.length ? 'shadow' : 'border'}`);
                return probs.length ? `${id} when focused has ${probs.join(' and ')}` : null;
              });
              if (bad) ff.push({ item: 'form-focus-ring', detail: bad, rect: await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; }) });
            }
            for (const f of ff) { out.push(f); if (f.rect && !shots[f.item]) { shots[f.item] = `${slug}-${w}-${f.item}.png`; await shoot(fp.page, f, shots[f.item]); } }
          } finally { await fp.ctx.close(); }
        }
        for (const e of errors) out.push({ item: 'console-error', detail: e });
        for (const f of failed) out.push({ item: 'failed-load', detail: f });
        // screenshot the first offender of each item now, before any clicking moves the layout
        for (const f of out) if (f.rect && !shots[f.item]) { shots[f.item] = `${slug}-${w}-${f.item}.png`; await shoot(page, f, shots[f.item]); }
        // toggles, tabs and chips must change something besides themselves
        const toggles = await page.$$('[role=tab], button[aria-pressed]:not(:disabled), button[aria-expanded]');
        for (const b of toggles.slice(0, 40)) {
          if (!(await b.isVisible())) continue;
          const changed = await b.evaluate(async el => {
            if (el.getAttribute('aria-pressed') === 'true' && !el.closest('[data-multi]')) return true; // already chosen: clicking again is a no-op by design
            let hit = false; const mo = new MutationObserver(ms => { if (ms.some(m => !el.contains(m.target) || m.target === el && m.attributeName !== 'aria-pressed')) hit = true; });
            mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
            el.click(); await new Promise(r => setTimeout(r, 250)); mo.disconnect(); return hit; });
          if (!changed) { const label = (await b.innerText()).trim().slice(0, 30); const f = { item: 'toggle-does-nothing', detail: `"${label}" changes nothing else`, rect: await b.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; }) }; out.push(f); if (!shots[f.item]) { shots[f.item] = `${slug}-${w}-${f.item}.png`; await shoot(page, f, shots[f.item]); } }
        }
        const byItem = {};
        for (const f of out) (byItem[f.item] ||= []).push(f);
        for (const [item, fs_] of Object.entries(byItem)) {
          all.push({ page: url, width: w, item, count: fs_.length, details: [...new Set(fs_.map(f => f.detail))].slice(0, 12), screenshot: OUT ? shots[item] || null : null });
        }
        await t.test('no checklist failures', () => assert.deepEqual(Object.fromEntries(Object.entries(byItem).map(([k, v]) => [k, [...new Set(v.map(f => f.detail))].slice(0, 6)])), {}));
      } finally { await ctx.close(); }
    });
  }
}
