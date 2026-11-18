// Papel picado across the top of the hero: cut-paper flags on a slack cord, each swaying on its own.
// Drawn as SVG so the cut-outs are real holes; rebuilt when the width changes.
(() => {
  const box = document.querySelector('[data-picado]');
  if (!box) return;
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['#d8402c', '#149c8e', '#f2c230', '#ee8a1f', '#6b2420'];
  // one flag, 60 x 72, with a zigzag hem and three cut-outs: a flower, two diamonds, a row of holes
  const flag = (c) => {
    let hem = 'M0 0H60V62';
    for (let x = 60; x > 0; x -= 7.5) hem += `L${x - 3.75} 72L${x - 7.5} 62`;
    hem += 'Z';
    const flower = [0, 1, 2, 3, 4, 5].map(i => {
      const a = i * Math.PI / 3, x = 30 + Math.cos(a) * 8, y = 28 + Math.sin(a) * 8;
      return `M${x + 4} ${y}a4 4 0 1 0 -8 0a4 4 0 1 0 8 0Z`;
    }).join('') + 'M33 28a3 3 0 1 0 -6 0a3 3 0 1 0 6 0Z';
    const diamonds = 'M10 22l4 6-4 6-4-6Z M50 22l4 6-4 6-4-6Z';
    const holes = [12, 22, 32, 42, 52].map(x => `M${x + 2} 50a2 2 0 1 0 -4 0a2 2 0 1 0 4 0Z`).join('');
    const ring = 'M30 9l3 3-3 3-3-3Z';
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', hem + flower + diamonds + holes + ring);
    p.setAttribute('fill', c); p.setAttribute('fill-rule', 'evenodd');
    return p;
  };
  const build = () => {
    const w = box.clientWidth, small = w < 600;
    const fw = small ? 22 : 30, gap = small ? 5 : 7, sag = small ? 7 : 12;
    const n = Math.max(5, Math.floor((w + gap) / (fw + gap)));
    const start = (w - (n * fw + (n - 1) * gap)) / 2;
    const h = sag + fw * 1.2 + 8;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
    const cordY = x => 3 + sag * 4 * (x / w) * (1 - x / w);
    const cord = document.createElementNS(NS, 'path');
    cord.setAttribute('d', `M0 3Q${w / 2} ${3 + sag * 2} ${w} 3`);
    cord.setAttribute('class', 'cord'); svg.appendChild(cord);
    for (let i = 0; i < n; i++) {
      const x = start + i * (fw + gap), cx = x + fw / 2, y = cordY(cx);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'flag');
      g.style.transformOrigin = `${cx}px ${y}px`;
      g.style.animationDelay = `${(-i * 0.37) % 3.6}s`;
      g.style.animationDuration = `${3.2 + (i % 3) * 0.45}s`;
      const inner = flag(COLORS[i % COLORS.length]);
      inner.setAttribute('transform', `translate(${x} ${y}) scale(${fw / 60})`);
      g.appendChild(inner); svg.appendChild(g);
    }
    box.replaceChildren(svg);
  };
  let last = 0;
  new ResizeObserver(() => { if (box.clientWidth !== last) { last = box.clientWidth; build(); } }).observe(box);
})();
