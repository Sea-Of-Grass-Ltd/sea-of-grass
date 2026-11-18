// The woven border slides sideways as you scroll, and the tile wall behind the hero drifts slower than the page.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  let queued = false;
  const update = () => { queued = false; root.style.setProperty('--weave-x', (scrollY * -0.6).toFixed(1) + 'px'); root.style.setProperty('--wall-y', Math.min(scrollY * 0.18, 90).toFixed(1) + 'px'); };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
