/* Bunny World landing: the live showcase (tabs swap a laptop + phone running the real shop) and the switching FAQ. */
(() => {
  const B = '/preview/assets/work/bunny-world';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- device screens: an iframe at its real width, scaled to fit the frame ---- */
  const screens = [...document.querySelectorAll('.stage .screen')];
  const fit = () => screens.forEach(sc => {
    const w = +sc.dataset.w, k = sc.clientWidth / w, f = sc.querySelector('iframe');
    f.style.width = w + 'px'; f.style.height = (sc.clientHeight / k) + 'px'; f.style.transform = `scale(${k})`;
  });
  new ResizeObserver(fit).observe(document.querySelector('.stage'));

  /* only the active shop loads: the frames get their src when the showcase is near the screen, and on each tab change */
  const tabs = [...document.querySelectorAll('.tab')];
  const stage = document.querySelector('.stage');
  /* under the preview: one sentence about the shop and one Open button (Main Street A, 2026-11-16) */
  const openShop = document.querySelector('.show-open'), say = document.querySelector('.show-say');
  let seen = false, cur = tabs[0];
  const phoneOnly = () => matchMedia('(max-width: 760px)').matches;
  const load = (t) => {
    const k = t.dataset.shop;
    screens.forEach(sc => {
      const f = sc.querySelector('iframe'), p = sc.querySelector('.poster');
      const kind = sc.closest('.phone') ? 'phone' : 'laptop';
      p.src = `${B}/poster-${k}-${kind}.webp`; sc.classList.remove('live');
      if (phoneOnly()) { f.removeAttribute('src'); return; }   // phones: the row of previews below runs the chosen shop instead
      f.onload = () => { if (f.getAttribute('src')) sc.classList.add('live'); };
      f.src = `${k}/`;
      f.title = `${t.dataset.name} demo site${kind === 'phone' ? ' on a phone' : ''}, live`;
    });
  };
  let fromRail = false;
  const select = (t, focus) => {
    if (t === cur && seen) return;
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    stage.setAttribute('aria-labelledby', t.id);
    openShop.href = t.dataset.shop + '/'; openShop.querySelector('b').textContent = t.dataset.name; say.textContent = t.dataset.say;
    pcSync(t);
    if (!fromRail) railTo(tabs.indexOf(t)); railLive(t);
    stage.classList.remove('swap'); void stage.offsetWidth; if (!reduce) stage.classList.add('swap');
    cur = t; if (seen) load(t);
    if (focus) t.focus();
    t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', ev => {
      const k = ev.key, n = tabs.length;
      const j = k === 'ArrowDown' || k === 'ArrowRight' ? (i + 1) % n : k === 'ArrowUp' || k === 'ArrowLeft' ? (i - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
      if (j >= 0) { ev.preventDefault(); select(tabs[j], true); }
    });
  });
  new IntersectionObserver((es, o) => { if (es.some(x => x.isIntersecting)) { seen = true; load(cur); fit(); railLive(cur); o.disconnect(); } }, { rootMargin: '300px' }).observe(stage);
  addEventListener('resize', () => { if (seen) { const want = phoneOnly(); const has = !!document.querySelector('.laptop iframe').getAttribute('src'); if (want === has) load(cur); } });

  /* ---- the switching FAQ: a callout that opens in place into an accordion; deep links #faq-… open straight to a question ---- */
  const faq = document.getElementById('faq'), toggles = [...document.querySelectorAll('[data-faq-toggle]')], worry = document.querySelector('.worry');
  const setFaq = (on, then) => {
    if (on === !faq.hidden && !faq.classList.contains('closing')) { then && then(); return; }
    worry.setAttribute('aria-expanded', on);
    if (on) {
      faq.hidden = false; faq.classList.remove('closing');
      requestAnimationFrame(() => { faq.classList.add('open'); });
      const done = () => { then ? then() : faq.querySelector('.q').focus({ preventScroll: true }); };
      reduce ? done() : setTimeout(done, 380);
    } else {
      faq.classList.remove('open'); faq.classList.add('closing');
      setTimeout(() => { faq.hidden = true; faq.classList.remove('closing'); worry.focus(); }, reduce ? 0 : 380);
    }
  };
  toggles.forEach(b => b.addEventListener('click', () => setFaq(faq.hidden)));
  document.querySelectorAll('[data-faq-open]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); setFaq(true, () => faq.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })); }));
  const qs = [...faq.querySelectorAll('.q')];
  const setQ = (q, on) => { q.setAttribute('aria-expanded', on); q.closest('.qa').classList.toggle('on', on); };
  qs.forEach(q => q.addEventListener('click', () => {
    const on = q.getAttribute('aria-expanded') !== 'true'; setQ(q, on);
    if (on) history.replaceState(null, '', '#' + q.id);
  }));
  faq.addEventListener('keydown', ev => {
    const i = qs.indexOf(document.activeElement); if (i < 0) return;
    const j = ev.key === 'ArrowDown' ? (i + 1) % qs.length : ev.key === 'ArrowUp' ? (i - 1 + qs.length) % qs.length : ev.key === 'Home' ? 0 : ev.key === 'End' ? qs.length - 1 : -1;
    if (j >= 0) { ev.preventDefault(); qs[j].focus(); }
    if (ev.key === 'Escape') setFaq(false);
  });
  const deep = () => {
    const h = location.hash.slice(1);
    if (h === 'faq') { setFaq(true, () => faq.scrollIntoView({ block: 'start' })); return; }
    const q = h.startsWith('faq-') && document.getElementById(h);
    if (q && q.classList.contains('q')) setFaq(true, () => { setQ(q, true); q.scrollIntoView({ block: 'center' }); q.focus({ preventScroll: true }); });
  };
  addEventListener('hashchange', deep); deep();

  /* ---- the price cells: open like the switching FAQ, one at a time (Tristan, 2026-11-16). Each panel's Add to cart
     goes through the shared cart (/preview/assets/shop/cart.js adds anything with data-add and opens the drawer). ---- */
  const cells = [...document.querySelectorAll('#prices .pc')], adds = [...document.querySelectorAll('#prices .pc-add')];
  const panelOf = b => document.getElementById(b.getAttribute('aria-controls'));
  const setCell = (b, on) => { b.setAttribute('aria-expanded', on); panelOf(b).classList.toggle('on', on); };
  cells.forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-expanded') !== 'true'; cells.forEach(x => setCell(x, x === b && on)); }));
  document.getElementById('prices').addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return; const o = cells.find(x => x.getAttribute('aria-expanded') === 'true');
    if (o) { ev.preventDefault(); setCell(o, false); o.focus(); }
  });
  /* buttons say what is already in the cart, like the Buy menu */
  function pcStates() { const c = window.sogCart ? window.sogCart.get() : {};
    adds.forEach(a => { const q = c[a.dataset.add] || 0, more = a.dataset.add === 'fix';
      a.classList.toggle('in', q > 0); a.textContent = q ? (more ? 'Add another' : 'In your cart ✓') : a.dataset.label; a.disabled = q > 0 && !more; }); }
  adds.forEach(a => a.addEventListener('click', () => setTimeout(pcStates, 0)));
  addEventListener('storage', e => { if (e.key === 'sog-cart') pcStates(); });
  addEventListener('load', pcStates);
  /* the small business site is built in the look of the shop chosen on Main Street */
  function pcSync(t) { const a = document.querySelector('[data-pc-site]'), n = document.querySelector('[data-pc-look]'); if (!a) return;
    a.dataset.add = 'bw-site-' + t.dataset.shop; n.textContent = t.dataset.name; pcStates(); }

  /* phones: the three "pages" size themselves to the screen minus the demo bar and the sticky bar (brand.css) */
  const topBars = () => { const c = document.querySelector('.credit'), n = document.querySelector('.nav'); if (!c || !n) return;
    document.documentElement.style.setProperty('--nav-h', n.offsetHeight + 'px'); document.documentElement.style.setProperty('--top-h', (c.offsetHeight + (getComputedStyle(n).position === 'fixed' ? 0 : n.offsetHeight)) + 'px'); };
  topBars(); addEventListener('resize', topBars); addEventListener('load', topBars);

  /* ---- phones: a swipeable row of phone previews in place of the trade pills (HQ for Tristan, 2026-11-16) ---- */
  function railBuild() {
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const r = document.createElement('div'); r.className = 'rail'; r.tabIndex = 0; r.setAttribute('role', 'group'); r.setAttribute('aria-label', 'Shops on Main Street: swipe to choose one');
    r.innerHTML = tabs.map((t, i) => `<figure class="rail-s" data-i="${i}"><div class="rail-ph"><div class="screen" data-w="390"><img class="poster" src="${B}/poster-${t.dataset.shop}-phone.webp" alt="" width="390" height="844" loading="lazy"><iframe title="${esc(t.dataset.name)} demo site on a phone, live" tabindex="-1" loading="lazy"></iframe></div></div><figcaption><b>${esc(t.querySelector('.ts').textContent)}</b> ${esc(t.dataset.name)}</figcaption></figure>`).join('');
    stage.insertBefore(r, stage.querySelector('.show-foot'));
    const dots = document.createElement('div'); dots.className = 'rail-dots'; dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = tabs.map(() => '<i></i>').join('');
    stage.insertBefore(dots, stage.querySelector('.show-foot'));
    let tid = 0;
    const settle = () => { const mid = r.scrollLeft + r.clientWidth / 2; let best = 0, d = 1e9;
      r.querySelectorAll('.rail-s').forEach((s, i) => { const c = s.offsetLeft + s.offsetWidth / 2; if (Math.abs(c - mid) < d) { d = Math.abs(c - mid); best = i; } });
      if (tabs[best] !== cur) { fromRail = true; select(tabs[best]); fromRail = false; } else railLive(cur); };
    r.addEventListener('scroll', () => { clearTimeout(tid); tid = setTimeout(settle, 120); }, { passive: true });
    return r;
  }
  const rail = railBuild();
  function railTo(i) { if (!phoneOnly() || i < 0) return; const s = rail.querySelectorAll('.rail-s')[i]; rail.scrollTo({ left: s.offsetLeft - (rail.clientWidth - s.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' }); }
  /* only the chosen slide runs its site live (the others show their posters), and only once the section is near */
  function railLive(t) { const k = tabs.indexOf(t);
    rail.querySelectorAll('.rail-s').forEach((s, i) => { const f = s.querySelector('iframe'), sc = s.querySelector('.screen'), on = i === k; s.classList.toggle('on', on); const d = document.querySelectorAll('#shops .rail-dots i')[i]; if (d) d.classList.toggle('on', on);
      if (on && seen && phoneOnly()) { if (!f.getAttribute('src')) { f.onload = () => sc.classList.add('live'); f.src = t.dataset.shop + '/'; }
        const kk = sc.clientWidth / 390; f.style.width = '390px'; f.style.height = (sc.clientHeight / kk) + 'px'; f.style.transform = `scale(${kk})`; }
      else if (f.getAttribute('src')) { f.removeAttribute('src'); sc.classList.remove('live'); } }); }
  new IntersectionObserver((es, o) => { if (es.some(x => x.isIntersecting)) { railLive(cur); o.disconnect(); } }, { rootMargin: '300px' }).observe(rail);
  railLive(cur);

  /* ---- phones: no nav on the hero page; a slim sticky bar once the hero has gone ---- */
  const heroEl = document.querySelector('.hero');
  /* shown once the hero's bottom reaches where the bar sits (so a page snapped under the bar always has it) */
  let navRaf = 0; const navCheck = () => { navRaf = 0; const n = document.querySelector('.nav'); if (!heroEl || !n) return;
    document.documentElement.classList.toggle('past-hero', heroEl.getBoundingClientRect().bottom <= n.offsetHeight + 1); };
  addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navCheck); }, { passive: true }); addEventListener('resize', navCheck); navCheck();
})();
