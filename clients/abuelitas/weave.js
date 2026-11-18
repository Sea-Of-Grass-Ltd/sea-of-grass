// The woven border slides sideways as you scroll.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  let queued = false;
  const update = () => { queued = false; root.style.setProperty('--weave-x', (scrollY * -0.15).toFixed(1) + 'px'); };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
