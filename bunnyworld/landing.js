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
      if (kind === 'laptop' && phoneOnly()) { f.removeAttribute('src'); return; }
      f.onload = () => { if (f.getAttribute('src')) sc.classList.add('live'); };
      f.src = `${k}/`;
      f.title = `${t.dataset.name} demo site${kind === 'phone' ? ' on a phone' : ''}, live`;
    });
  };
  const select = (t, focus) => {
    if (t === cur && seen) return;
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    stage.setAttribute('aria-labelledby', t.id);
    openShop.href = t.dataset.shop + '/'; openShop.querySelector('b').textContent = t.dataset.name; say.textContent = t.dataset.say;
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
  new IntersectionObserver((es, o) => { if (es.some(x => x.isIntersecting)) { seen = true; load(cur); fit(); o.disconnect(); } }, { rootMargin: '300px' }).observe(stage);
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
})();
