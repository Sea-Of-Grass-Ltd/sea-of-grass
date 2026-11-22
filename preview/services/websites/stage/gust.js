// The gust's debris (Tristan 2026-11-22). The light beams are gone ("Why is it coming from this direction, these beams look
// cheap too": five lines shot across the headline into the till). The wind now shows only in the till itself (stage.js
// leans and shakes it, rattles its keys, flutters its flags, and its straw charge comes from inside it) and in a few
// grass blades and blue grama heads, lifted from the ground at the till's feet and tumbling close around and behind it.
// Nothing travels into the words' column: every path stays within the till's side of the stage. No lines, no dots.

const ease = x => x * x * (3 - 2 * x);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const span = (t, a, b) => ease(clamp((t - a) / (b - a)));

export function makeGust(T, scene, P, S) {
  // the till's own frame: x across (its half-width is about 0.12), y up from its base, z toward the camera
  const at = (x, y, z) => new T.Vector3(P.x + x * S, P.y + y * S, P.z + z * S);
  const bladeGeo = (() => { const pos = [], idx = [], N = 6;
    for (let i = 0; i <= N; i++) { const k = i / N, w = 0.0032 * (1 - k * 0.9), y = k * 0.075, x = 0.012 * k * k;
      pos.push(x - w, y, 0, x + w, y, 0); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.translate(0, -0.037, 0); return g; })();
  const gramaTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.strokeStyle = '#e4d7bf'; x.lineCap = 'round';
    x.lineWidth = 5; x.beginPath(); x.moveTo(20, 70); x.quadraticCurveTo(120, 20, 236, 34); x.stroke();
    x.lineWidth = 2.2;
    for (let i = 0; i < 22; i++) { const k = 0.18 + 0.78 * i / 21, px = 20 + 216 * k, py = 70 - 50 * Math.sin(k * 1.4) + 6 * k;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - 6, py + 20 - 6 * k); x.stroke(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const bladeMats = [0x7d9479, 0x5f7a63, 0x98a98b].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.85, side: T.DoubleSide }));
  const gramaMat = new T.MeshBasicMaterial({ map: gramaTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, depthWrite: false });
  const gramaGeo = new T.PlaneGeometry(0.07, 0.026);
  const pieces = [];
  // a piece flies a + (c pulled) to b between t0 and t1, tumbling by spin; fall pieces drift down and rest a beat
  const fly = (geo, mat, t0, t1, a, c, b, spin, fall) => { const m = new T.Mesh(geo, mat); m.visible = false; m.frustumCulled = false;
    scene.add(m); pieces.push({ m, t0, t1, a: at(...a), c: at(...c), b: at(...b), spin: new T.Vector3(...spin), fall, ph: pieces.length * 1.37 }); };
  // the gust: lifted off the ground just left of the till, around it (most of them behind it), out past its right side,
  // never above the till's top (0.26): on phones the words sit right above it
  fly(bladeGeo, bladeMats[0], 0.115, 0.215, [-0.24, 0.00, 0.06], [-0.05, 0.24, -0.18], [0.34, 0.24, -0.10], [5, 3, 7], false);
  fly(bladeGeo, bladeMats[1], 0.135, 0.235, [-0.22, 0.01, -0.12], [0.02, 0.22, -0.26], [0.36, 0.20, -0.20], [3, 6, 4], false);
  fly(gramaGeo, gramaMat, 0.150, 0.270, [-0.25, 0.02, 0.10], [-0.02, 0.24, 0.14], [0.32, 0.24, 0.04], [2, 4, 3], false);
  fly(bladeGeo, bladeMats[2], 0.170, 0.260, [-0.20, 0.00, 0.12], [0.06, 0.16, 0.16], [0.38, 0.12, 0.02], [6, 2, 8], false);
  fly(bladeGeo, bladeMats[0], 0.195, 0.290, [-0.23, 0.01, -0.04], [0.00, 0.24, -0.22], [0.34, 0.24, -0.16], [4, 7, 3], false);
  fly(gramaGeo, gramaMat, 0.215, 0.300, [-0.24, 0.02, -0.16], [0.04, 0.24, -0.24], [0.36, 0.24, -0.14], [3, 2, 5], false);
  fly(bladeGeo, bladeMats[1], 0.235, 0.300, [-0.21, 0.00, 0.04], [0.04, 0.24, 0.10], [0.37, 0.24, 0.00], [7, 4, 6], false);
  // the calm: a grama head and a blade drift down beside the phone's spot and fade out in the air, well above it and well
  // before it lands (one used to land under the phone and stay parked there, Tristan 11-22: "what's up with these parts")
  fly(gramaGeo, gramaMat, 0.37, 0.50, [-0.10, 0.62, 0.06], [-0.02, 0.48, 0.12], [-0.20, 0.34, 0.16], [0.6, 1.5, 0.8], true);
  fly(bladeGeo, bladeMats[2], 0.39, 0.52, [0.24, 0.66, -0.06], [0.30, 0.50, -0.02], [0.36, 0.36, 0.04], [1, 2, 1.5], true);
  const q = new T.Vector3();
  return t => {
    for (const d of pieces) {
      const k = (t - d.t0) / (d.t1 - d.t0), on = k > 0 && k < 1;   // every piece is gone at the end of its own path: nothing stays parked
      d.m.visible = on; if (!on) continue;
      const u = d.fall ? ease(clamp(k)) : clamp(k), w = 1 - u;
      q.copy(d.a).multiplyScalar(w * w).addScaledVector(d.c, 2 * w * u).addScaledVector(d.b, u * u);
      if (d.fall && k < 1) q.x += 0.025 * S * Math.sin(k * 9 + d.ph);
      d.m.position.copy(q);
      const sp = Math.min(k, 1);
      d.m.rotation.set(d.spin.x * sp + d.ph, d.spin.y * sp, d.spin.z * sp);
      d.m.scale.setScalar(S * (d.fall ? 1 - span(k, 0.6, 1) : 1));      // the drifting ones shrink away over the last part of their fall
    }
  };
}
