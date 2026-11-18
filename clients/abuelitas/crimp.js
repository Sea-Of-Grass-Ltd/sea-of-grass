// The hero arch already has an empanada's outline; this gives it the crimped rim (repulgue).
// Draws, inside the arch, a red band whose inner edge is a row of pinched lobes, each with one crease.
(() => {
  const arch = document.querySelector('.arch');
  if (!arch) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'crimp'); svg.setAttribute('aria-hidden', 'true');
  arch.appendChild(svg);
  const draw = () => {
    const w = arch.clientWidth, h = arch.clientHeight;
    if (!w || !h) return;
    const cs = getComputedStyle(arch);
    const rr = cs.borderTopLeftRadius.split(' ').pop(), ry = Math.min(h, rr.endsWith('%') ? parseFloat(rr) / 100 * h : parseFloat(rr) || h * .4);
    const rx = w / 2, big = w > 520;
    const lam = big ? 30 : 20, base = big ? 3 : 2, amp = big ? 11 : 8;
    // outer boundary as a dense polyline: up the left side, over the half-ellipse, down the right side
    const pts = [];
    const side = Math.max(0, h - ry);
    for (let y = h; y > ry; y -= 2) pts.push([0, y, 1, 0]);
    for (let i = 0; i <= 400; i++) {
      const a = Math.PI + Math.PI * i / 400, x = rx + rx * Math.cos(a), y = ry + ry * Math.sin(a);
      // inward normal of the ellipse
      let nx = -Math.cos(a) / rx, ny = -Math.sin(a) / ry; const l = Math.hypot(nx, ny); pts.push([x, y, nx / l, ny / l]);
    }
    for (let y = ry; y <= h; y += 2) pts.push([w, y, -1, 0]);
    // arc length, then the scalloped inner edge
    let s = 0; const inner = [];
    const total = pts.reduce((acc, p, i) => i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
    const n = Math.round(total / lam), L = total / n;
    const creases = [];
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const [x, y, nx, ny] = pts[i], ph = (s % L) / L, t = base + amp * Math.sin(Math.PI * ph);
      inner.push(`${(x + nx * t).toFixed(1)} ${(y + ny * t).toFixed(1)}`);
      if (Math.abs(ph - .5) < (2 / L) && !creases.length || (creases.length && Math.floor(s / L) > creases.length - 1 && ph > .45 && ph < .6 && creases.length < Math.floor(s / L) + 1)) {
        // a short diagonal crease across the lobe
        const tx = -ny, ty = nx, a1 = base + amp * .15, a2 = base + amp * .85;
        creases.push(`M${(x + nx * a1 - tx * 4).toFixed(1)} ${(y + ny * a1 - ty * 4).toFixed(1)}L${(x + nx * a2 + tx * 4).toFixed(1)} ${(y + ny * a2 + ty * 4).toFixed(1)}`);
      }
    }
    const outer = pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
    const d = `M${outer.join('L')}L${inner.reverse().join('L')}Z`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `<path class="rim" d="${d}"/><path class="crease" d="${creases.join('')}"/>`;
  };
  new ResizeObserver(draw).observe(arch);
})();
