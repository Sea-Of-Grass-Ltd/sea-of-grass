/* Bunny World landing headline, in Refero's rhythm (Tristan, 2026-11-16): "Hop in." ⇄ "Find your style.", each line held
   5.5s in flat ink, each change a ~1.6s letter-by-letter sweep through the five looks' accents (tap order: Clean, Bold, Warm,
   Sunny, Disco). Runs only while the hero is on screen and the tab is visible; coming back waits a full hold before the next
   change. Every letter is one flat colour at any moment (no gradients), and at rest nothing is animating: the sweep's
   animations are cancelled once it lands. Reduced motion: html.hl-loop is never set, so this does nothing and the CSS shows
   "Find your style." still. Screen readers read the static .sr line; the animated letters are aria-hidden. */
(() => {
  const root = document.documentElement, h = document.querySelector('.hero h1.lh-h');
  if (!h || !root.classList.contains('hl-loop') || !h.animate) return;
  const HOLD = 5500, OPEN = 1000, FRONT = 850, LETTER = 700, LEAD = 120; // a sweep runs ~1.3s (to "Hop in.") to ~1.6s (to the longer line)
  const layers = { from: [...h.querySelectorAll('.lh-from>span')], to: [...h.querySelectorAll('.lh-to>span')] };
  const cs = getComputedStyle(root), ACC = ['clean', 'bold', 'warm', 'sunny', 'disco'].map(k => cs.getPropertyValue('--acc-' + k).trim());
  let show = 'from', timer = 0, running = null, onScreen = null;
  const live = () => onScreen && !document.hidden;

  const settle = line => { const r = running; running = null; if (r) r.forEach(a => a.cancel()); show = line; h.dataset.show = line; };
  const schedule = ms => { clearTimeout(timer); timer = 0; if (live()) timer = setTimeout(() => { timer = 0; if (live()) sweep(); }, ms); };
  const pause = () => { clearTimeout(timer); timer = 0; if (running) settle(show === 'from' ? 'to' : 'from'); }; // mid-sweep: land it at once

  const sweep = () => {
    const out = layers[show], next = show === 'from' ? 'to' : 'from', inc = layers[next], ink = getComputedStyle(h).color;
    // one front crosses the whole block left to right (both lines at once, like a wipe); each letter changes as the front
    // reaches its spot, so an old letter leaves just before the new one lands there. Measured each time: the looks' fonts differ.
    const rs = [...out, ...inc].map(l => l.getBoundingClientRect()).filter(b => b.width), x0 = Math.min(...rs.map(b => b.left)), W = (Math.max(...rs.map(b => b.right)) - x0) || 1; // the span the letters cover, so a centred line sweeps edge to edge
    const at = l => Math.max(0, Math.min(1, (l.getBoundingClientRect().left - x0) / W)) * FRONT;
    h.dataset.show = 'both';
    const anims = [
      ...out.map((l, i) => l.animate([{ opacity: 1, color: ink }, { opacity: 1, color: ACC[0], offset: .4 }, { opacity: 0, color: ACC[0] }],
        { duration: 260, delay: at(l), fill: 'both', easing: 'ease-in' })),
      ...inc.map((l, i) => l.animate([{ opacity: 0, color: ACC[0] }, { opacity: 1, color: ACC[0], offset: .08 }, { color: ACC[1], offset: .26 },
        { color: ACC[2], offset: .44 }, { color: ACC[3], offset: .62 }, { color: ACC[4], offset: .8 }, { opacity: 1, color: ink }],
        { duration: LETTER, delay: at(l) + LEAD, fill: 'both', easing: 'linear' }))];
    running = anims;
    Promise.all(anims.map(a => a.finished)).then(() => { if (running === anims) { settle(next); schedule(HOLD); } }, () => {});
  };

  new IntersectionObserver(([e]) => {
    const first = onScreen === null, was = onScreen; onScreen = e.isIntersecting;
    if (!onScreen) pause(); else if (first) schedule(OPEN); else if (!was) schedule(HOLD);
  }).observe(h);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (onScreen) schedule(HOLD); });
})();
