/* Bunny World landing: tap the bunny to change the look of the page (Tristan, 2026-11-15), The shop question is answered once, by the trade tabs on Main Street.
   Each tap: the ears pop, one glint sweeps, the page crossfades to the next look. Looks only re-set CSS variables (brand.css),
   so nothing moves. Reduced motion: instant swap, no pop. The choice is remembered (localStorage, which can be missing). */
(() => {
  const LOOKS = [['disco', 'Disco', '#1B0F2A'], ['clean', 'Clean', '#F5F7F9'], ['bold', 'Bold', '#0B0B0B'], ['warm', 'Warm', '#FFF6EA'], ['sunny', 'Sunny', '#FFE845']];
  const root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const mark = document.querySelector('.lh-mark');
  const nameEl = document.querySelector('[data-look-name]');
  const hint = document.querySelector('.lh-hint'), meta = document.querySelector('meta[name="theme-color"]');
  if (!mark) return;
  let i = Math.max(0, LOOKS.findIndex(l => l[0] === (root.dataset.look || 'disco')));

  const paint = () => {
    const [key, name, theme] = LOOKS[i];
    root.dataset.look = key; nameEl.textContent = name;
    if (meta) meta.content = theme;
  };
  paint();

  /* the opening: the mark pops in and one glint sweeps it. No sparkles: the logo stays clean (Tristan, 2026-11-15) */
  if (reduce) mark.classList.remove('intro');
  else mark.addEventListener('animationend', e => { if (e.animationName === 'lhIn') mark.classList.remove('intro'); });

  /* a callout pointing at the ears, until the first tap; after that it never comes back */
  const hinted = store.get('bw-look-hint');
  if (!hinted) setTimeout(() => hint.classList.add('on'), reduce ? 0 : 900);

  mark.addEventListener('click', () => {
    hint.classList.remove('on'); store.set('bw-look-hint', '1');
    i = (i + 1) % LOOKS.length; store.set('bw-look', LOOKS[i][0]);
    if (reduce || !document.startViewTransition) paint(); else document.startViewTransition(paint);
    if (!reduce) { mark.classList.remove('pop'); void mark.offsetWidth; mark.classList.add('pop'); }
  });
  mark.addEventListener('animationend', e => { if (e.animationName === 'lhPop') mark.classList.remove('pop'); });

})();
