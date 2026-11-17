/* Bunny World landing headline, in Refero's rhythm (Tristan, 2026-11-16): "Hop with style." ⇄ "Bunny World.", each line held
   5.5s in flat ink, each change a ~1.6s letter-by-letter sweep through the five looks' accents (tap order: Clean, Bold, Warm,
   Sunny, Disco). 2026-11-16 fix (Tristan caught "Hop with s" and "rld." painted at once): the old line now sweeps out
   completely before the new one sweeps in, so no frame ever paints letters from both phrases. Runs only while the hero is on screen and the tab is visible; coming back waits a full hold before the next
   change. Every letter is one flat colour at any moment (no gradients), and at rest nothing is animating: the sweep's
   animations are cancelled once it lands. Reduced motion: html.hl-loop is never set, so this does nothing and the CSS shows
   "Bunny World." still. Screen readers read the static .sr line; the animated letters are aria-hidden. */
(() => {
  const root = document.documentElement, h = document.querySelector('.hero h1.lh-h');
  if (!h || !root.classList.contains('hl-loop') || !h.animate) return;
  const HOLD = 5500, OPEN = 1000, OUT_FRONT = 380, OUT = 220, GAP = 40, IN_FRONT = 520, LETTER = 640; // a sweep runs about 1.8s
  const layers = { from: [...h.querySelectorAll('.lh-from>span')], to: [...h.querySelectorAll('.lh-to>span')] };
  const cs = getComputedStyle(root), ACC = ['clean', 'bold', 'warm', 'sunny', 'disco'].map(k => cs.getPropertyValue('--acc-' + k).trim());
  let show = 'from', timer = 0, running = null, onScreen = null;
  const live = () => onScreen && !document.hidden;

  const settle = line => { const r = running; running = null; if (r) r.forEach(a => a.cancel()); show = line; h.dataset.show = line; };
  const schedule = ms => { clearTimeout(timer); timer = 0; if (live()) timer = setTimeout(() => { timer = 0; if (live()) sweep(); }, ms); };
  const pause = () => { clearTimeout(timer); timer = 0; if (running) settle(show === 'from' ? 'to' : 'from'); }; // mid-sweep: land it at once

  const sweep = () => {
    const out = layers[show], next = show === 'from' ? 'to' : 'from', inc = layers[next], ink = getComputedStyle(h).color;
    // a front crosses the whole block left to right twice: first each old letter flashes the first look's colour and goes,
    // then, once every old letter has gone, each new letter lands and runs through the looks to ink. Measured each time:
    // the looks' fonts differ, and the span the letters cover lets a centred line sweep edge to edge.
    const rs = [...out, ...inc].map(l => l.getBoundingClientRect()).filter(b => b.width), x0 = Math.min(...rs.map(b => b.left)), W = (Math.max(...rs.map(b => b.right)) - x0) || 1;
    const at = l => Math.max(0, Math.min(1, (l.getBoundingClientRect().left - x0) / W));
    const IN_AT = OUT_FRONT + OUT + GAP; // the new line starts only after the last old letter is fully gone
    h.dataset.show = 'both';
    const anims = [
      ...out.map(l => l.animate([{ opacity: 1, color: ink }, { opacity: 1, color: ACC[0], offset: .35 }, { opacity: 0, color: ACC[0] }],
        { duration: OUT, delay: at(l) * OUT_FRONT, fill: 'both', easing: 'ease-in' })),
      ...inc.map(l => l.animate([{ opacity: 0, color: ACC[0] }, { opacity: 1, color: ACC[0], offset: .08 }, { color: ACC[1], offset: .26 },
        { color: ACC[2], offset: .44 }, { color: ACC[3], offset: .62 }, { color: ACC[4], offset: .8 }, { opacity: 1, color: ink }],
        { duration: LETTER, delay: IN_AT + at(l) * IN_FRONT, fill: 'both', easing: 'linear' }))];
    running = anims;
    Promise.all(anims.map(a => a.finished)).then(() => { if (running === anims) { settle(next); schedule(HOLD); } }, () => {});
  };

  new IntersectionObserver(([e]) => {
    const first = onScreen === null, was = onScreen; onScreen = e.isIntersecting;
    if (!onScreen) pause(); else if (first) schedule(OPEN); else if (!was) schedule(HOLD);
  }).observe(h);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (onScreen) schedule(HOLD); });
})();
