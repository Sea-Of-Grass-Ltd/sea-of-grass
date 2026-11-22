/* The Site Plan card's motes (Tristan 2026-11-22: "similarly to when the card at the end glows, I want that to happen
   too"): when the card lights up, a few soft points of its own straw light (--glow, --glow-hot) lift off its lit top and
   right edges, drift up and outward a little and fade. Fewer and calmer than the till's: at most ~20 alive, each short
   lived, tight to the card. They are drawn on a small canvas hugging the card's top and right edges only, so they never
   cross the card's text or any words around it. None under reduced motion; the loop runs only while the card is lit and
   on screen. (The till's motes are WebGL points in stage.js; the card is plain HTML, so the same idea on a 2D canvas.) */
(() => {
  const band = document.querySelector('.price-band'), card = band && band.querySelector('.u-card');
  if (!band || !card || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const css = getComputedStyle(document.documentElement);
  const hex = (v, d) => { const s = (css.getPropertyValue(v).trim() || d).replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
  const GLOW = hex('--glow', '#D4B26A'), HOT = hex('--glow-hot', '#F2DFAE');
  const OUT = 46;                                                 // how far beyond the edges the canvas reaches (px)
  const cv = document.createElement('canvas'); cv.className = 'card-motes'; cv.setAttribute('aria-hidden', 'true');
  card.parentElement.style.position = card.parentElement.style.position || 'relative';
  card.parentElement.append(cv);
  const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, cw = 0, ch = 0;
  const place = () => {                                           // the canvas: the card's box grown up and to the right
    const pr = card.parentElement.getBoundingClientRect(), r = card.getBoundingClientRect();
    cw = r.width; ch = r.height; W = cw + OUT; H = ch + OUT; dpr = Math.min(2, devicePixelRatio || 1);
    Object.assign(cv.style, { left: (r.left - pr.left) + 'px', top: (r.top - pr.top - OUT) + 'px', width: W + 'px', height: H + 'px' });
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  const motes = [];
  const spawn = () => {                                           // from a point along the lit top edge or right edge, drifting out
    const top = Math.random() < 0.6, u = Math.random();
    const x = top ? cw * (0.15 + 0.85 * u) : cw, y = top ? OUT : OUT + ch * (0.05 + 0.6 * u);
    motes.push({ x, y, vx: top ? (Math.random() - 0.3) * 6 : 6 + Math.random() * 10, vy: -(10 + Math.random() * 16),
      r: 1.6 + Math.random() * 2.6, life: 1.1 + Math.random() * 1.3, age: 0, hue: Math.random(), wob: Math.random() * 6.28 });
  };
  let raf = 0, last = 0, acc = 0, on = false, seen = false;
  const step = now => {
    raf = 0; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    acc += dt; while (on && acc > 0.16 && motes.length < 20) { acc -= 0.16; spawn(); }
    if (acc > 0.16) acc = 0.16;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]; m.age += dt; const k = m.age / m.life;
      if (k >= 1) { motes.splice(i, 1); continue; }
      m.x += (m.vx + Math.sin(m.age * 3 + m.wob) * 4) * dt; m.y += m.vy * dt;
      const a = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.85, c = GLOW.map((g, j) => Math.round(g + (HOT[j] - g) * m.hue));
      const rr = m.r * (1 - 0.35 * k) * 3, g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); g.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.45})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, Math.PI * 2); ctx.fill();
    }
    if ((on && seen) || motes.length) raf = requestAnimationFrame(step); else last = 0;
  };
  const kick = () => { if (!raf && ((on && seen) || motes.length)) raf = requestAnimationFrame(step); };
  new MutationObserver(() => { const was = on; on = band.classList.contains('lit'); if (on && !was) place(); kick(); }).observe(band, { attributes: true, attributeFilter: ['class'] });
  new IntersectionObserver(es => { seen = es.some(e => e.isIntersecting); if (seen) place(); kick(); }).observe(card);
  addEventListener('resize', () => { place(); });
  on = band.classList.contains('lit'); place(); kick();
})();
