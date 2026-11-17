/* Walk-in Log. Ships no prospect data: stops and visits load from Talaria's Supabase after sign-in,
   and only members of the Sea of Grass space can read them (row-level security). */
(() => {
'use strict';
// Public by design: the publishable key only works together with the database's access rules.
const SUPABASE_URL = 'https://ptohzyjklqqnylavapsk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wuJ1nNNRuY8OccYEkt7XZg_73FRk8lA';

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const c of kids) if (c != null) e.append(c); return e; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- sign-in ---------- */
let sb = null;
const gateMsg = $('gateMsg');
function say(text, ok) { gateMsg.textContent = text || ''; gateMsg.className = ok ? 'form-ok' : 'form-error'; }
function showGate() { $('gate').hidden = false; $('app').hidden = true; }
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true, storageKey: 'sog-field-auth' } });
} catch (e) { say('Sign-in couldn’t load. Check your connection and reload.'); }

$('google').addEventListener('click', async () => {
  if (!sb) return;
  say('');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
  if (error) say(error.message);
});
$('emailForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!sb) return;
  const btn = $('emailGo'); btn.disabled = true; say('');
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  btn.disabled = false;
  if (error) say(/not confirmed/i.test(error.message) ? 'Your email isn’t confirmed yet. Click the link in the confirmation email, or ask Tristan to approve your account.' : /invalid login/i.test(error.message) ? 'That email and password don’t match.' : error.message);
  else $('password').value = '';
});
$('signOut').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); location.hash = ''; });
$('notMemberOut').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); });

let started = false;
async function onSession(session) {
  if (!session) { started = false; wipe(); $('notMember').hidden = true; $('gateForms').hidden = false; showGate(); return; }
  if (started) return;
  started = true;
  const { data: member, error } = await sb.rpc('is_sog_member');
  if (error || !member) {
    started = false;
    $('gateForms').hidden = true; $('notMember').hidden = false;
    $('notMemberWho').textContent = session.user.email || 'This account';
    showGate(); return;
  }
  $('gate').hidden = true; $('app').hidden = false;
  $('whoami').textContent = session.user.email || '';
  boot();
}
if (sb) {
  sb.auth.onAuthStateChange((_ev, session) => { setTimeout(() => onSession(session), 0); });
}

/* ---------- static: demo shops, prices, regions ---------- */
const BW = 'https://seaofgrass.studio/bunnyworld/';
const SHOPS = {
  restaurant: ['bunny-burritos', 'Bunny Burritos', 'menu, pickup ordering, table booking'],
  bar: ['hop-along', 'Hop Along', 'tap list, events, back-room requests'],
  bakery: ['warren-bakehouse', 'The Warren Bakehouse', 'today’s case, cake orders'],
  salon: ['long-ears', 'Long Ears', 'salon booking, quotes from photos'],
  barber: ['hare-today', 'Hare Today', 'chair board, booking by barber'],
  clinic: ['hopwell-chiro', 'Hopwell', 'patient booking, online intake'],
  auto: ['bunny-auto', 'Bunny Auto', 'price list, estimates, service booking'],
  shop: ['burrow-and-bough', 'Burrow & Bough', 'online shop, pickup or shipping'],
  farm: ['cottontail-farm', 'Cottontail Farm', 'seasons, timed tickets, farm map'],
};
const PRICE = { fix: ['$250 fix', '$250 fix'], starter: ['$1,200 or $100/mo', '$1,200 starter'], site: ['$2,000 site', '$2,000 site'] };
const KNOWN_REGIONS = [['longmont', 'Longmont'], ['berthoud', 'Berthoud'], ['loveland', 'Loveland'], ['fortcollins', 'Fort Collins'], ['wellington', 'Wellington'], ['golden', 'Golden']];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayLabel(d) { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || ''); if (!m) return d || ''; return WD[new Date(+m[1], +m[2] - 1, +m[3]).getDay()] + ' ' + m[2] + '-' + m[3]; }
function regionName(id) { const k = KNOWN_REGIONS.find(r => r[0] === id); return k ? k[1] : String(id || 'Other').replace(/(^|[-_ ])(\w)/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase()); }

let STOPS = [], BY_ID = {}, REGIONS = [];
function setStops(data) {
  STOPS = (data || []).map(r => ({ id: r.id, region: r.region, name: r.business, address: r.address, town: r.town, day: r.day || '', time: r.slot || '', broken: r.problem, pitch: r.pitch, price: r.price, kind: SHOPS[r.kind] ? r.kind : 'shop', url: r.url, notes: r.notes, printout: r.printout, confirm: r.confirm, email: r.email_only }));
  BY_ID = Object.fromEntries(STOPS.map(s => [s.id, s]));
  const ids = KNOWN_REGIONS.map(r => r[0]);
  for (const s of STOPS) if (!ids.includes(s.region)) ids.push(s.region);
  REGIONS = ids.map(id => ({ id, name: regionName(id) }));
}

/* ---------- Costs (filled from vendor pricing pages) ---------- */
const CHECKED = '2026-11-16';
const COSTS = [
  ['Website builders (per month, billed yearly)', 'Squarespace Basic / Core', '$19 / $29', '$25 / $39 billed monthly. Domain free the first year only.', 'https://www.squarespace.com/pricing'],
  ['Website builders (per month, billed yearly)', 'Wix Light / Core / Business', '$17.77 / $29.77 / $39.77', 'Light has no online store. Domain voucher for the first year.', 'https://www.wix.com/plans'],
  ['Website builders (per month, billed yearly)', 'GoDaddy Website Builder', '$9.99–$20.99 intro', 'Renews much higher (Premium about $39.99). Pricing page blocked our check.', 'https://www.godaddy.com/websites/website-builder', 1],
  ['Website builders (per month, billed yearly)', 'Shopify Basic / Grow', '$29 / $79', '$39 / $105 billed monthly, plus card fees of 2.7–2.9% + 30¢.', 'https://www.shopify.com/pricing'],
  ['Website builders (per month, billed yearly)', 'Square Online Free / Plus / Premium', '$0 / $29 / $79', 'Free plan shows Square ads. Prices load by script; read from reviews.', 'https://squareup.com/us/en/online-store/plans', 1],
  ['Website builders (per month, billed yearly)', 'Weebly Personal / Professional', '$13 / $15', 'Still sold, but Square now steers people to Square Online.', 'https://www.weebly.com/pricing'],
  ['WordPress', 'WordPress.com Personal / Premium / Business', '$4 / $8 / $25', '$9 / $18 / $40 billed monthly. Plugins need Business.', 'https://wordpress.com/pricing/'],
  ['WordPress', 'Bluehost WordPress Starter', '$3.99 intro', 'Needs 3 years paid up front; renews at $9.99 a month.', 'https://www.bluehost.com/wordpress/wordpress-hosting'],
  ['WordPress', 'SiteGround StartUp', '$1.99 intro', 'Holiday offer, 12 months up front; renews at $17.99 a month.', 'https://www.siteground.com/wordpress-hosting.htm'],
  ['WordPress', 'WP Engine Essential', 'about $26', 'First year, new customers only. Page showed euros to us.', 'https://wpengine.com/plans/', 1],
  ['Domain name (per year)', '.com domain', '$12–25', 'Registry floor is $11.17 since Nov 1, 2026. Builders charge about $20–25 after the free year.', 'https://domainnamewire.com/2026/04/23/breaking-verisign-raising-wholesale-com-prices/', 1],
  ['Hiring it out', 'Freelancer, small-business site', '$1,500–5,000', 'Upwork’s own cost guide; designers bill about $15–75 an hour.', 'https://www.upwork.com/hire/web-designers/cost/', 1],
  ['Hiring it out', 'Agency, small-business site', '$3,000–10,000', 'Clutch: most web projects under $10,000, $100–149 an hour. GoodFirms 2024 survey: $1,000–7,000 for a small site.', 'https://clutch.co/web-developers/resources/web-development-budget', 1],
  ['Hiring it out', 'Monthly maintenance', '$50–300 a month', 'Vendor blog estimates; no solid survey found.', 'https://www.designrush.com/agency/web-development-companies/trends/small-business-website-cost', 1],
  ['Sea of Grass', 'Fix one broken thing', '$250 once', 'Paid after it’s done and checked.', 'https://seaofgrass.studio/bunnyworld/#prices'],
  ['Sea of Grass', 'Starter site', '$1,200 or $100/mo × 12', 'Same total, no interest.', 'https://seaofgrass.studio/bunnyworld/#prices'],
  ['Sea of Grass', 'Small business site', '$2,000', '30% at the first-draft OK, the rest at launch.', 'https://seaofgrass.studio/bunnyworld/#prices'],
  ['Sea of Grass', 'Care', '$50 a month', 'Hosting, security, up to 30 minutes of changes a month. Cancel any month.', 'https://seaofgrass.studio/bunnyworld/'],
];
const FIRST_YEAR = { diyCash: [210, 350], diyLabel: 'Builder plan for a year', freelance: [1500, 5000], freelanceCare: [600, 3600], agency: [3000, 10000] };

/* ---------- helpers ---------- */
function localISO(d = new Date()) { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function timeKey(t) { const m = /^(\d+):(\d+)/.exec(t || ''); if (!m) return 9999; let h = +m[1]; if (h < 7) h += 12; return h * 60 + +m[2]; }
function mapsUrl(s) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.address || s.name, s.town, 'CO'].filter(Boolean).join(', ')); }
function fmt(ts) { try { return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

/* ---------- views (hash routes) ---------- */
const VIEWS = ['stops', 'pitch', 'costs', 'log'];
function show(v) { if (!VIEWS.includes(v)) v = 'stops'; VIEWS.forEach(n => { $('v-' + n).hidden = n !== v; }); document.querySelectorAll('nav.tabs a').forEach(a => { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
let curView = 'stops';
function go(v) { if (!VIEWS.includes(v)) v = 'stops'; const changed = v !== curView; curView = v; show(v); if (changed) window.scrollTo(0, 0); try { if (location.hash.slice(1) !== v) location.hash = v; } catch (e) {} }
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== curView) go(v); });
document.querySelectorAll('nav.tabs a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.view); }));

/* ---------- visits state ---------- */
let rows = [], loaded = false;
function latestFor(s) { let best = null; for (const r of rows) { if (r.stopId ? r.stopId === s.id : norm(r.business) === norm(s.name)) { if (!best || (r.at || 0) > (best.at || 0)) best = r; } } return best; }
function badgeFor(s) { const r = latestFor(s); if (!r) return ['Not visited', 'none'];
  const m = { 'Yes': ['Yes', 'yes'], 'Interested': ['Interested', 'int'], 'Left page': ['Left page', 'left'], 'Has someone': ['Has someone', 'no'], 'Not interested': ['Not interested', 'no'] }; return m[r.result] || [r.result || 'Visited', 'left']; }

/* ---------- stops ---------- */
let filter = store.get('wl.filter') || 'today';
function todayInfo() {
  const t = localISO(); const days = [...new Set(STOPS.map(s => s.day).filter(Boolean))].sort();
  if (days.includes(t)) return { day: t, isToday: true };
  const next = days.find(d => d > t); return { day: next || null, isToday: false };
}
function renderChips() {
  const box = $('regionChips'); box.innerHTML = '';
  const ti = todayInfo();
  const opts = [['today', 'Today', ti.day ? STOPS.filter(s => s.day === ti.day).length : 0], ['all', 'All', STOPS.length]].concat(REGIONS.map(r => [r.id, r.name, STOPS.filter(s => s.region === r.id).length]));
  for (const [id, label, n] of opts) box.append(el('button', { class: 'chipbtn', type: 'button', 'aria-pressed': String(filter === id), onclick: () => { filter = id; store.set('wl.filter', id); renderStops(); } }, label, el('small', { text: String(n) })));
}
function card(s) {
  const [bt, bc] = badgeFor(s);
  const shop = SHOPS[s.kind] || SHOPS.shop;
  const flags = el('div', { class: 'flags' });
  if (s.printout) flags.append(el('span', { class: 'flag', text: 'Printout ready' }));
  if (s.confirm) flags.append(el('span', { class: 'flag', text: 'Confirm open first' }));
  if (s.email) flags.append(el('span', { class: 'flag', text: 'Email only' }));
  const meta = el('dl', { class: 'meta' },
    el('dt', { text: 'Where' }), el('dd', {}, el('a', { href: mapsUrl(s), target: '_blank', rel: 'noopener noreferrer', text: (s.address ? s.address + ', ' : '') + s.town })),
    el('dt', { text: 'When' }), el('dd', { text: [s.day ? dayLabel(s.day) : 'Not scheduled', s.time].filter(Boolean).join(' · ') }));
  if (s.url) meta.append(el('dt', { text: 'Site' }), el('dd', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: host(s.url) })));
  return el('li', { class: 'stop', id: 'stop-' + s.id },
    el('div', { class: 'top' }, el('div', {}, el('h3', { text: s.name }), flags.childNodes.length ? flags : null), el('span', { class: 'badge ' + bc, text: bt })),
    meta,
    s.broken ? el('p', { class: 'broken', text: s.broken }) : null,
    el('p', { class: 'pitch' }, el('span', { text: s.pitch || 'Pitch to come.' }), el('b', { text: (PRICE[s.price] || PRICE.starter)[0] })),
    s.notes ? el('p', { class: 'note', text: s.notes }) : null,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: () => logFor(s.id) }, 'Log visit'),
      el('a', { class: 'btn ghost', href: BW + shop[0] + '/', target: '_blank', rel: 'noopener', title: shop[2] }, 'Demo: ' + shop[1])));
}
function renderStops() {
  renderChips();
  const list = $('stopList'); list.innerHTML = ''; const lede = $('stopsLede');
  let items, groupBy = 'day';
  if (filter === 'today') {
    const ti = todayInfo();
    if (!ti.day) { lede.textContent = 'No more scheduled days. Pick a region to see its stops.'; items = []; }
    else { items = STOPS.filter(s => s.day === ti.day); lede.textContent = (ti.isToday ? 'Today, ' : 'Nothing scheduled today. Next up: ') + dayLabel(ti.day) + '. Restaurants never 11:30–1:30.'; groupBy = 'none'; }
  } else if (filter === 'all') { items = STOPS.slice(); lede.textContent = STOPS.length + ' stops.'; }
  else { items = STOPS.filter(s => s.region === filter); const r = REGIONS.find(x => x.id === filter); lede.textContent = r ? r.name + ': ' + items.length + ' stops.' : ''; }
  if (filter === 'golden' && !items.length) { list.append(el('p', { class: 'empty', text: 'The Golden list is being put together now. Its stops will show up here as cards, with days and times, as soon as it’s added.' })); return; }
  if (!items.length) { if (filter !== 'today' || todayInfo().day) list.append(el('p', { class: 'empty', text: 'No stops here.' })); return; }
  items.sort((a, b) => (a.day || '9').localeCompare(b.day || '9') || timeKey(a.time) - timeKey(b.time));
  if (groupBy === 'none') { const ul = el('ul', { class: 'cards' }); items.forEach(s => ul.append(card(s))); list.append(ul); return; }
  let cur = null, ul = null;
  for (const s of items) { const k = s.day || ''; if (k !== cur) { cur = k; const n = items.filter(x => (x.day || '') === k).length; list.append(el('div', { class: 'daybar' }, el('h3', { text: k ? dayLabel(k) : 'Not scheduled yet' }), el('span', { text: n + (n === 1 ? ' stop' : ' stops') }))); ul = el('ul', { class: 'cards' }); list.append(ul); } ul.append(card(s)); }
}

/* ---------- pitch name toggle ---------- */
function setPitcher(who) {
  document.querySelectorAll('.pName').forEach(n => n.textContent = who);
  document.querySelectorAll('.pTown').forEach(n => n.textContent = who === 'Bryce' ? 'Golden' : 'Berthoud');
}
document.querySelectorAll('input[name=pitchWho]').forEach(i => i.addEventListener('change', () => { setPitcher(i.value); setBy(i.value); }));

/* ---------- costs ---------- */
const money = n => '$' + Math.round(n).toLocaleString('en-US');
function renderCosts() {
  const tb = $('costTable').tBodies[0]; tb.innerHTML = ''; let g = null;
  for (const [group, svc, price, note, url, est] of COSTS) {
    if (group !== g) { g = group; tb.append(el('tr', { class: 'group' }, el('td', { colspan: '3', text: group }))); }
    const p = el('td', { class: 'num' }, price); if (est) p.append(el('span', { class: 'est', text: 'estimate' }));
    tb.append(el('tr', {}, el('td', {}, svc, note ? el('small', { text: note }) : null), p, el('td', {}, el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: 'source' }), el('small', { text: 'checked ' + CHECKED }))));
  }
}
function renderCalc() {
  const rate = +$('rate').value, hours = +$('hours').value;
  $('rateOut').textContent = '$' + rate; $('hoursOut').textContent = hours + ' h';
  const F = FIRST_YEAR, diyCash = (F.diyCash[0] + F.diyCash[1]) / 2, diyTime = rate * hours, ownerSog = 2.5 * rate;
  const opts = [
    { name: 'Do it yourself', parts: [[diyCash, '--bar-diy'], [diyTime, '--bar-time']], total: diyCash + diyTime, sub: F.diyLabel + ' about ' + money(F.diyCash[0]) + '–' + money(F.diyCash[1]) + ', plus ' + hours + ' h of your time. Fixes after that are yours too.' },
    { name: 'Freelancer', parts: [[(F.freelance[0] + F.freelance[1]) / 2, '--bar-free'], [(F.freelanceCare[0] + F.freelanceCare[1]) / 2, '--bar-free']], total: null, range: [F.freelance[0] + F.freelanceCare[0], F.freelance[1] + F.freelanceCare[1]], sub: 'Small-business site ' + money(F.freelance[0]) + '–' + money(F.freelance[1]) + ', plus $50–300 a month upkeep. Estimate.' },
    { name: 'Agency', parts: [[(F.agency[0] + F.agency[1]) / 2, '--bar-free']], total: null, range: F.agency, sub: 'Site only, upkeep extra. Estimate from Clutch and GoodFirms.' },
    { name: 'Sea of Grass $250 fix + care', parts: [[250 + 600, '--bar-sog'], [rate * 1, '--bar-time']], total: 850 + rate, sub: '$250 fix, then $50/mo care (hosting, security, 30 min of changes a month). About an hour of your time.' },
    { name: 'Sea of Grass starter + care', parts: [[1200 + 600, '--bar-sog'], [ownerSog, '--bar-time']], total: 1800 + ownerSog, sub: '$1,200 or $100/mo × 12, plus $50/mo care. About 2–3 h of yours for photos and a review.' },
    { name: 'Sea of Grass site + care', parts: [[2000 + 600, '--bar-sog'], [ownerSog, '--bar-time']], total: 2600 + ownerSog, sub: '$2,000 site plus $50/mo care. About 2–3 h of yours.' },
  ];
  const max = Math.max(...opts.map(o => o.parts.reduce((a, p) => a + p[0], 0)), 1);
  const box = $('bars'); box.innerHTML = '';
  for (const o of opts) {
    const tr = el('div', { class: 'track', 'aria-hidden': 'true' });
    for (const [v, c] of o.parts) tr.append(el('i', { style: 'width:' + (v / max * 100).toFixed(2) + '%;background:var(' + c + ')' }));
    const val = o.total != null ? money(o.total) : money(o.range[0]) + '–' + money(o.range[1]);
    box.append(el('div', { class: 'bar' }, el('div', { class: 'row' }, el('span', { text: o.name }), el('b', { text: val })), tr, el('small', { text: o.sub })));
  }
  $('calcNote').textContent = 'Time counted at your hourly value. Do it yourself costs the least cash: ' + money(diyCash) + ' against $850 for our fix and care. What you buy from us is the ' + hours + ' hours back, a site that works, and someone keeping it that way.';
}
$('rate').addEventListener('input', renderCalc); $('hours').addEventListener('input', renderCalc);

/* ---------- log ---------- */
const biz = $('biz'), bizOther = $('bizOther'), statusEl = $('status'), list = $('list'), strip = $('strip'), saveBtn = $('save');
function buildSelect() {
  const keep = biz.value; biz.innerHTML = ''; biz.append(el('option', { value: '', text: 'Pick one' }));
  for (const r of REGIONS) { const ss = STOPS.filter(s => s.region === r.id); if (!ss.length) continue; const og = el('optgroup', { label: r.name }); ss.forEach(s => og.append(el('option', { value: s.id, text: s.name }))); biz.append(og); }
  biz.append(el('option', { value: '__other', text: 'Other…' })); biz.value = keep;
}
biz.addEventListener('change', () => { bizOther.hidden = biz.value !== '__other'; if (!bizOther.hidden) bizOther.focus(); const s = BY_ID[biz.value]; if (s) $('price').value = (PRICE[s.price] || PRICE.starter)[1]; });
function setBy(who) { const i = who === 'Bryce' ? $('byB') : $('byT'); i.checked = true; store.set('wl.by', who); const p = who === 'Bryce' ? $('pwB') : $('pwT'); p.checked = true; setPitcher(who); }
document.querySelectorAll('input[name=by]').forEach(i => i.addEventListener('change', () => setBy(i.value)));
function logFor(id) {
  go('log');
  biz.value = id; bizOther.hidden = true; const s = BY_ID[id]; if (s) $('price').value = (PRICE[s.price] || PRICE.starter)[1];
  if (s && s.email) { const e = document.querySelector('input[name=how][value=Email]'); if (e) e.checked = true; } else document.querySelector('input[name=how][value="Walk-in"]').checked = true;
  const f = $('f'); f.scrollIntoView({ block: 'start' }); f.classList.add('flash'); setTimeout(() => f.classList.remove('flash'), 1200);
  statusEl.textContent = s ? 'Logging ' + s.name + '. Pick who you spoke with and the result.' : '';
}
let personFilter = store.get('wl.person') || 'all';
function renderPersonChips() {
  const box = $('personChips'); box.innerHTML = '';
  for (const [id, label] of [['all', 'Everyone'], ['Tristan', 'Tristan'], ['Bryce', 'Bryce']]) {
    const n = id === 'all' ? rows.length : rows.filter(r => r.by === id).length;
    box.append(el('button', { class: 'chipbtn', type: 'button', 'aria-pressed': String(personFilter === id), onclick: () => { personFilter = id; store.set('wl.person', id); renderLog(); } }, label, el('small', { text: String(n) })));
  }
}
function cls(r) { return r === 'Yes' ? 'yes' : r === 'Interested' ? 'int' : r === 'Left page' ? 'left' : 'no'; }
function renderLog() {
  const vis = personFilter === 'all' ? rows : rows.filter(r => r.by === personFilter);
  const n = vis.length, yes = vis.filter(r => r.result === 'Yes').length, int = vis.filter(r => r.result === 'Interested').length, owner = vis.filter(r => r.who === 'Owner' || r.who === 'Manager').length;
  strip.innerHTML = '';
  [[n, 'visits'], [owner, 'reached owner/manager'], [int, 'interested'], [yes, 'said yes'], [Math.max(0, 20 - rows.length), 'to go until re-run']].forEach(([v, l]) => strip.append(el('div', {}, el('b', { text: String(v) }), el('span', { text: l }))));
  renderPersonChips();
  list.innerHTML = '';
  if (!n) { list.append(el('li', { class: 'empty', text: !loaded ? 'Loading your log…' : (rows.length ? 'No visits logged by ' + personFilter + ' yet.' : 'No visits yet. Tap “Log visit” on a stop card, or pick a business above.') })); return; }
  vis.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).forEach(r => {
    const meta = el('div', {}, el('span', { class: 'badge ' + cls(r.result), text: r.result || '—' }), document.createTextNode(' ' + [r.by, r.how, r.who, r.price, r.followUp ? ('follow up ' + r.followUp) : ''].filter(Boolean).join(' · ')));
    const li = el('li', {}, el('div', { class: 'top' }, el('span', { class: 'name', text: r.business }), el('span', { class: 'when', text: fmt(r.at) })), meta);
    if (r.notes) li.append(el('div', { class: 'vnote', text: r.notes }));
    list.append(li);
  });
}
function renderAll() { renderStops(); renderLog(); }

/* ---------- data ---------- */
const visitRow = r => ({ id: r.id, business: r.business, how: r.how, who: r.who, result: r.result, price: r.price, followUp: r.follow_up || '', notes: r.notes, at: Date.parse(r.at) || 0, by: r.by_name, stopId: r.stop_id || '', region: r.region });
async function loadVisits() {
  const { data, error } = await sb.from('walkin_visits').select('*').order('at', { ascending: false });
  if (error) { statusEl.textContent = 'Could not load visits: ' + error.message; return; }
  rows = data.map(visitRow); loaded = true; saveBtn.disabled = false; renderAll();
}
let channel = null;
function teardown() { if (channel && sb) { sb.removeChannel(channel); channel = null; } }
// On sign-out, drop every stop and visit from memory and the page, not just hide them.
function wipe() {
  teardown();
  setStops([]); rows = []; loaded = false;
  ['stopList', 'list', 'strip', 'regionChips', 'personChips'].forEach(id => { $(id).innerHTML = ''; });
  biz.innerHTML = ''; $('stopsLede').textContent = ''; $('whoami').textContent = ''; statusEl.textContent = '';
}
let booted = false;
async function boot() {
  if (!booted) {
    booted = true;
    renderCosts(); renderCalc();
    setBy(store.get('wl.by') === 'Bryce' ? 'Bryce' : 'Tristan');
    curView = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'stops'; show(curView);
  }
  saveBtn.disabled = true;
  $('stopsLede').textContent = 'Loading stops…';
  const { data, error } = await sb.from('walkin_stops').select('*').order('position');
  if (error) { $('stopsLede').textContent = 'Could not load stops: ' + error.message; return; }
  setStops(data); buildSelect(); renderAll();
  await loadVisits();
  teardown();
  channel = sb.channel('walkin-visits').on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_visits' }, () => loadVisits()).subscribe();
}
$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const s = BY_ID[biz.value];
  const name = biz.value === '__other' ? bizOther.value.trim() : (s ? s.name : '');
  if (!name) { statusEl.textContent = 'Pick the business first.'; biz.focus(); return; }
  const v = n => (document.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
  const rec = { business: name, how: v('how'), who: v('who'), result: v('res'), price: $('price').value, follow_up: $('follow').value || null, notes: $('note').value.trim(), by_name: v('by'), stop_id: s ? s.id : null, region: s ? s.region : '' };
  saveBtn.disabled = true; statusEl.textContent = 'Saving…';
  const { error } = await sb.from('walkin_visits').insert(rec);
  if (error) statusEl.textContent = 'Not saved: ' + error.message;
  else {
    statusEl.textContent = 'Saved ' + name + '.';
    $('note').value = ''; $('follow').value = ''; $('price').value = ''; biz.value = ''; bizOther.hidden = true; bizOther.value = '';
    await loadVisits();
  }
  saveBtn.disabled = false;
});
})();
