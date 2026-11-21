/* Plan-area looks (Tristan: "let's try a handful of things here, really it's like this is an interactive graphic").
   ?look=a … e swaps only the pricing stage; without ?look nothing here runs and the page is exactly as it was.
   A shop inside the ticket · B hand of cards · C holo ticket · D pick your look · E alpenglow.
   Same prices and copy in every look; reduced motion: each look is still (no cycling, tilt, shimmer or flights). */
(() => {
const look = (new URLSearchParams(location.search).get('look') || '').toLowerCase();
const LOOKS = ['a', 'b', 'c', 'd', 'e'];
if (!LOOKS.includes(look)) return;
const stage = document.querySelector('[data-stage]'), ticket = stage && stage.querySelector('.plan.care');
if (!stage || !ticket) return;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.dataset.look = look;
const IMG = '/preview/assets/work/bunny-world/';
// the nine shops, from the page's own Bunny World tickets (name, face), with a bright accent each for tinting
const ACCENT = { 'bunny-burritos': '#E8693C', 'hare-today': '#D8D0C2', 'hopwell-chiro': '#CFA57A', 'bunny-auto': '#73A7DB', 'warren-bakehouse': '#DDA066',
  'hop-along': '#F0C233', 'cottontail-farm': '#E58C3F', 'burrow-and-bough': '#CF8462', 'long-ears': '#86B6DD' };
const GROUND = { 'bunny-burritos': '#4C2619', 'hare-today': '#333030', 'hopwell-chiro': '#382F24', 'bunny-auto': '#28323C', 'warren-bakehouse': '#422B1A',
  'hop-along': '#373012', 'cottontail-farm': '#432A16', 'burrow-and-bough': '#472818', 'long-ears': '#253241' };
const shops = [...document.querySelectorAll('#bunny-world .ticket[data-shop]')].map(t => ({ slug: t.dataset.shop, name: t.dataset.name, face: t.dataset.face, weight: t.dataset.weight || '700',
  line: t.dataset.line, accent: ACCENT[t.dataset.shop] || '#D17C66', ground: GROUND[t.dataset.shop] || '#332739' }));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// the picker: A–E, plus the page as it is
const picker = el('nav', 'look-picker');
picker.setAttribute('aria-label', 'Try a look for the plans');
picker.innerHTML = '<span>Look</span>' + LOOKS.map(k => `<a href="?look=${k}#plans"${k === look ? ' aria-current="true"' : ''}>${k.toUpperCase()}</a>`).join('') + '<a href="./#plans">Off</a>';
document.body.append(picker);

// a window at the top of the ticket, onto a shop (used by A and B)
function makeWindow() {
  const w = el('div', 'look-window');
  w.innerHTML = '<img alt="" class="lw-a"><img alt="" class="lw-b"><span class="lw-name"></span>';
  ticket.prepend(w);
  const fit = () => { const b = ticket.querySelector(':scope > .btn.pill'); if (b) ticket.style.setProperty('--win-h', (b.offsetTop + b.offsetHeight + 22) + 'px'); };
  fit(); addEventListener('resize', fit); document.fonts && document.fonts.ready.then(fit);
  let front = w.querySelector('.lw-a'), back = w.querySelector('.lw-b');
  const show = (s, instant) => {
    back.src = IMG + 'shot-' + s.slug + '-960.webp'; back.alt = '';
    w.querySelector('.lw-name').textContent = s.name;
    const swap = () => { back.classList.add('on'); front.classList.remove('on'); [front, back] = [back, front]; };
    if (instant || back.complete) swap(); else back.onload = swap;
  };
  return { w, show };
}
function tint(s) { ticket.style.setProperty('--shop', s.accent); ticket.dataset.shop = s.slug; }

// ---- A: shop inside the ticket, cycling slowly through the nine ----
if (look === 'a') {
  const win = makeWindow(); let i = 0;
  win.show(shops[0], true);
  if (!still) setInterval(() => { if (document.hidden) return; i = (i + 1) % shops.length; win.show(shops[i]); }, 3600);
}

// ---- B: hand of cards; drag or flick through, click one to put it in the ticket's window ----
if (look === 'b') {
  const mid = Math.floor(shops.length / 2), win = makeWindow(); win.show(shops[mid], true); tint(shops[mid]);
  const hand = el('div', 'look-hand'); hand.setAttribute('role', 'group'); hand.setAttribute('aria-label', 'The nine Bunny World shops: drag through them, pick one');
  shops.forEach((s, n) => { const b = el('button', 'card'); b.type = 'button'; b.dataset.n = n; b.setAttribute('aria-label', 'Show ' + s.name);
    b.innerHTML = `<img src="${IMG}poster-${s.slug}-phone.webp" alt="" width="390" height="844" loading="lazy" draggable="false">`; hand.append(b); });
  stage.append(hand);
  const cards = [...hand.children]; let k = mid, v = 0, raf = 0, drag = null, moved = 0;
  const lay = () => cards.forEach((c, n) => { const d = n - k, a = Math.abs(d);
    c.style.transform = `translateX(${(d * 46).toFixed(1)}px) translateY(${(a * a * 3).toFixed(1)}px) rotate(${(d * 7).toFixed(1)}deg)`;
    c.style.zIndex = String(100 - Math.round(a * 10)); c.style.opacity = a > 4.6 ? '0' : '1'; });
  const settle = () => { const t = Math.max(0, Math.min(cards.length - 1, Math.round(k)));
    const step = () => { v *= .82; k += v; const dd = t - k; if (Math.abs(v) < .02) { k += dd * .2; } lay();
      raf = Math.abs(dd) > .002 || Math.abs(v) > .002 ? requestAnimationFrame(step) : 0; if (!raf) { k = t; lay(); } };
    if (still) { k = t; v = 0; lay(); return; } cancelAnimationFrame(raf); raf = requestAnimationFrame(step); };
  hand.addEventListener('pointerdown', e => { drag = { x: e.clientX, k, t: performance.now() }; moved = 0; v = 0; cancelAnimationFrame(raf); hand.setPointerCapture(e.pointerId); });
  hand.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx));
    const nk = Math.max(-.4, Math.min(cards.length - .6, drag.k - dx / 46)); v = (nk - k) * .6; k = nk; lay(); });
  const up = () => { if (!drag) return; drag = null; settle(); };
  hand.addEventListener('pointerup', up); hand.addEventListener('pointercancel', up);
  hand.addEventListener('click', e => { const c = e.target.closest('.card'); if (!c || moved > 6) return; const n = +c.dataset.n, s = shops[n];
    k = n; v = 0; settle(); tint(s);
    if (still) { win.show(s, true); return; }
    // the card flies into the ticket's window
    const from = c.getBoundingClientRect(), to = win.w.getBoundingClientRect(), fly = c.querySelector('img').cloneNode();
    fly.className = 'look-fly'; Object.assign(fly.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' }); document.body.append(fly);
    fly.animate([{ left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', opacity: 1, borderRadius: '12px' },
      { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px', opacity: .2, borderRadius: '18px' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.2,1)' })
      .onfinish = () => { fly.remove(); win.show(s, true); };
  });
  hand.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { k = Math.max(0, Math.min(cards.length - 1, Math.round(k) + (e.key === 'ArrowRight' ? 1 : -1))); settle(); cards[k].focus(); e.preventDefault(); } });
  lay();
}

// ---- C: holo ticket; tilts toward the cursor, a foil sheen sweeps as it tilts, the screens behind go the other way ----
if (look === 'c') {
  const sheen = el('span', 'look-sheen'); sheen.setAttribute('aria-hidden', 'true'); ticket.append(sheen);
  if (!still) {
    let tx = 0, ty = 0, gx = 0, gy = 0, raf = 0;
    const paint = () => { raf = 0; tx += (gx - tx) * .14; ty += (gy - ty) * .14;
      stage.style.setProperty('--tx', tx.toFixed(3)); stage.style.setProperty('--ty', ty.toFixed(3));
      if (Math.abs(gx - tx) > .001 || Math.abs(gy - ty) > .001) raf = requestAnimationFrame(paint); };
    const aim = (x, y) => { gx = Math.max(-1, Math.min(1, x)); gy = Math.max(-1, Math.min(1, y)); if (!raf) raf = requestAnimationFrame(paint); };
    const fine = matchMedia('(pointer: fine)').matches;
    if (fine) {
      stage.addEventListener('pointermove', e => { const r = ticket.getBoundingClientRect(); aim((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); });
      stage.addEventListener('pointerleave', () => aim(0, 0));
    } else {
      // touch: a gentle drag on the ticket tilts it, and it eases back when let go
      let p0 = null;
      ticket.addEventListener('pointerdown', e => { p0 = [e.clientX, e.clientY]; });
      ticket.addEventListener('pointermove', e => { if (p0) aim((e.clientX - p0[0]) / 120, (e.clientY - p0[1]) / 160); });
      const off = () => { p0 = null; aim(0, 0); }; ticket.addEventListener('pointerup', off); ticket.addEventListener('pointercancel', off);
      addEventListener('deviceorientation', e => { if (p0 || e.gamma == null) return; aim(e.gamma / 30, (e.beta - 45) / 40); });
    }
  }
}

// ---- D: pick your look; swatches reskin a small live site preview inside the ticket ----
if (look === 'd') {
  const picks = ['bunny-burritos', 'hare-today', 'hop-along', 'long-ears', 'warren-bakehouse'].map(sl => shops.find(s => s.slug === sl)).filter(Boolean);
  const box = el('div', 'look-try');
  box.innerHTML = '<p class="lt-kick">Pick a look</p><div class="lt-sw" role="radiogroup" aria-label="Bunny World looks"></div>' +
    '<div class="lt-site" aria-live="polite"><span class="lt-logo"></span><span class="lt-line"></span><span class="lt-btn">Order pickup</span></div>';
  ticket.querySelector('.btn.pill').after(box);
  const sw = box.querySelector('.lt-sw'), site = box.querySelector('.lt-site');
  picks.forEach((s, n) => { const b = el('button', 'lt-chip'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', s.name + ' look');
    b.style.setProperty('--c', s.accent); b.style.setProperty('--g', s.ground); b.innerHTML = `<i style="font-family:${s.face};font-weight:${s.weight}">${s.name[0]}</i>`; b.dataset.n = n; sw.append(b); });
  const pick = n => { const s = picks[n];
    [...sw.children].forEach((b, m) => b.setAttribute('aria-checked', String(m === n)));
    site.style.setProperty('--c', s.accent); site.style.setProperty('--g', s.ground);
    const logo = site.querySelector('.lt-logo'); logo.textContent = s.name; logo.style.fontFamily = s.face; logo.style.fontWeight = s.weight;
    site.querySelector('.lt-line').textContent = s.line;
    if (!still) site.animate([{ opacity: .3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }); };
  sw.addEventListener('click', e => { const b = e.target.closest('.lt-chip'); if (b) pick(+b.dataset.n); });
  pick(0);
}

// ---- E: alpenglow; Longs Peak from the plains (Pixabay 4932504, Pixabay Content License) warmed to pink behind the plans ----
if (look === 'e') {
  const hero = document.querySelector('.hero');
  const sky = el('div', 'look-alpen'); sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<img alt="" src="https://cdn.pixabay.com/photo/2020/03/15/05/33/colorado-4932504_1280.jpg"><span class="la-tint"></span><span class="la-shimmer"></span><span class="la-dim"></span>';
  hero.prepend(sky);
  // the photo has to live in our repo (Pixabay won't serve it to other sites); until it does, the look stays the plain page
  const im = sky.querySelector('img'); const gone = () => sky.remove();
  im.addEventListener('error', gone); if (im.complete && !im.naturalWidth) gone();
}
})();
