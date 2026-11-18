// The counter board's label, drawn to each box's real size so its curves never stretch:
// scooped corners, a soft rise in the middle of the top and bottom edges, a gold line inset from the black.
(() => {
  const GOLD = '#d9b44a', INK = '#111111';
  const path = (w, h, i, r, b) => {
    const cx = w / 2, bw = Math.min(w * 0.42, 260), R = r + i;
    const top = b + i, bot = h - b - i;
    return [
      `M${i},${top + r} A${R},${R} 0 0 0 ${r + i},${top}`,
      `L${cx - bw / 2},${top} C${cx - bw / 4},${top} ${cx - bw * 0.22},${i} ${cx},${i} C${cx + bw * 0.22},${i} ${cx + bw / 4},${top} ${cx + bw / 2},${top}`,
      `L${w - r - i},${top} A${R},${R} 0 0 0 ${w - i},${top + r}`,
      `L${w - i},${bot - r} A${R},${R} 0 0 0 ${w - r - i},${bot}`,
      `L${cx + bw / 2},${bot} C${cx + bw / 4},${bot} ${cx + bw * 0.22},${h - i} ${cx},${h - i} C${cx - bw * 0.22},${h - i} ${cx - bw / 4},${bot} ${cx - bw / 2},${bot}`,
      `L${r + i},${bot} A${R},${R} 0 0 0 ${i},${bot - r}Z`,
    ].join(' ');
  };
  const draw = el => {
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    const big = w > 420;
    const r = big ? 30 : 18, b = big ? 14 : 9, gap = big ? 9 : 7, line = big ? 2.6 : 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="${path(w, h, 0, r, b)}" fill="${INK}"/>` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc87"/><stop offset=".35" stop-color="${GOLD}"/><stop offset=".55" stop-color="#9c7a22"/><stop offset=".8" stop-color="#e8c766"/><stop offset="1" stop-color="#b48d2c"/></linearGradient></defs>` +
      `<path d="${path(w, h, gap, r, b)}" fill="none" stroke="url(#g)" stroke-width="${line}"/></svg>`;
    el.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    el.style.setProperty('--bump', b + 'px');
  };
  const els = document.querySelectorAll('.frame');
  const ro = new ResizeObserver(es => es.forEach(e => draw(e.target)));
  els.forEach(el => { draw(el); ro.observe(el); });
})();
