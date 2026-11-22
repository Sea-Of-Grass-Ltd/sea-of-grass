// The magic gust (Tristan 2026-11-22, "Go, build the magic gust"): a Front Range wind that turns the till into the phone.
// Spec: side-session-notes/.../register-phone-transform-research.md. All of it is keyed to the morph's t:
//   0.10-0.22 the gust arrives: pale streaks sweep in from the left, blades and grama heads lift and tumble past
//   0.22-0.30 it catches the till: the streaks thicken as it lifts and spins
//   0.30-0.36 the magic crest: one wind line warms to gold and rose and its bright crest passes in front of the till; the
//             swap happens under it at 180 deg, and the crest covers that whole stretch of scroll, so a parked scroll
//             never shows the cut
//   0.36-0.57 the wind calms: the streaks thin, the grama heads drift down and the last blade falls as the phone lands
// Eight ribbons (six gust lines, the crest, one calm line), twelve blades and three grama heads, each on its own path. No dots, no swirl, no sky-blue; gold and
// rose only on the crest. Additive light is drawn in order around the smoked glass: ribbons behind the till before the
// glass (renderOrder 1, so the glass smokes them), ribbons and the crest in front after it (renderOrder 6+).

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x * x * (3 - 2 * x);
const span = (t, a, b) => ease(clamp((t - a) / (b - a)));
const bell = (t, a, m, b) => (t <= m ? span(t, a, m) : 1 - span(t, m, b));
// a small seeded random, so every visit gets the same gust
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

const VERT = `attribute float aU; attribute float aV; varying float vU; varying float vV;
void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `uniform float uHead, uLen, uAlpha, uCharge, uBand, uBandW; uniform vec3 uPale, uGold, uRose;
varying float vU; varying float vV;
void main(){
  float s = (vU - (uHead - uLen)) / uLen;                 // 0 at the tail, 1 at the head
  if (s < 0.0 || s > 1.0) discard;
  float a = smoothstep(0.0, 0.45, s) * smoothstep(1.0, 0.82, s) * (1.0 - vV * vV);
  vec3 c = mix(uPale, mix(uRose, uGold, s), uCharge);
  float band = uCharge * exp(-pow((vU - uBand) / uBandW, 2.0));
  c = mix(c, vec3(1.0, 0.93, 0.84), band * 0.7);
  gl_FragColor = vec4(c, clamp(a * uAlpha * (1.0 + band * 1.6), 0.0, 1.0));
}`;

export function makeGust(T, scene, P, S, lift = 1) {
  // P: the till's resting base (world), S: the hero scale. The gust's frame: x across the screen, y up, z toward you.
  const at = (x, y, z) => new T.Vector3(P.x + x * S, P.y + y * S * lift + y * S * (1 - lift) * 0.6, P.z + z * S);
  const pale = new T.Color(0xece6ee), gold = new T.Color(0xe8b94a), rose = new T.Color(0xd8928a);

  function ribbon(pts, width, front) {
    const curve = new T.CatmullRomCurve3(pts), N = 96, pos = [], u = [], v = [], idx = [];
    const zf = new T.Vector3(0, 0, 1);
    for (let i = 0; i <= N; i++) {
      const k = i / N, p = curve.getPointAt(k), tg = curve.getTangentAt(k), n = new T.Vector3().crossVectors(tg, zf).normalize();
      const w = width * (0.35 + 0.65 * Math.sin(Math.PI * k));               // tapered at both ends
      for (const sgn of [-1, 1]) { const q = p.clone().addScaledVector(n, sgn * w / 2); pos.push(q.x, q.y, q.z); u.push(k); v.push(sgn); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new T.Float32BufferAttribute(u, 1));
    g.setAttribute('aV', new T.Float32BufferAttribute(v, 1)); g.setIndex(idx);
    const m = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.AdditiveBlending, uniforms: { uHead: { value: 0 }, uLen: { value: 0.4 }, uAlpha: { value: 0 }, uCharge: { value: 0 },
        uBand: { value: 0.5 }, uBandW: { value: 0.08 }, uPale: { value: pale }, uGold: { value: gold }, uRose: { value: rose } } });
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = front ? 6 : 1; scene.add(mesh);
    return { mesh, m, curve };
  }
  // a gentle travelling line from off-frame left to off-frame right, rising a little as it passes the till
  const line = (y, z, rise, wave, ph) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const k = i / 8, x = -1.25 + 2.5 * k;
      pts.push(at(x, y + rise * ease(k) + wave * Math.sin(k * Math.PI * 1.6 + ph), z + 0.03 * Math.sin(k * 5 + ph))); }
    return pts;
  };
  // [y, z, rise, wave, width, start t, travel, length, front]
  const R = [
    [0.04, 0.30, 0.10, 0.015, 0.010, 0.100, 0.085, 0.42, true],
    [0.20, -0.22, 0.06, 0.020, 0.008, 0.120, 0.090, 0.38, false],
    [0.11, 0.38, 0.14, 0.012, 0.012, 0.145, 0.080, 0.46, true],
    [0.30, -0.16, 0.08, 0.018, 0.009, 0.170, 0.090, 0.40, false],
    [0.07, 0.26, 0.22, 0.020, 0.016, 0.205, 0.085, 0.52, true],      // the lifting gust: thicker
    [0.24, -0.20, 0.20, 0.022, 0.015, 0.225, 0.090, 0.50, false],
  ].map(([y, z, rise, wave, w, t0, dur, len, front], i) => ({ ...ribbon(line(y, z, rise, wave, i * 1.3), w * S, front), t0, dur, len }));
  // the calm: one thin slow line, low, as the wind dies
  const calm = [[0.12, 0.20, 0.02, 0.010, 0.006, 0.38, 0.17, 0.30, true]]
    .map(([y, z, rise, wave, w, t0, dur, len, front], i) => ({ ...ribbon(line(y, z, rise, wave, 4 + i), w * S, front), t0, dur, len, calm: true }));
  // the crest: one line through the middle of the till, in front of it, whose bright band rides across the till while
  // the swap happens behind it
  const crestPts = [];
  for (let i = 0; i <= 8; i++) { const k = i / 8, x = -1.25 + 2.5 * k; crestPts.push(at(x, 0.10 + 0.20 * ease(k) + 0.02 * Math.sin(k * 6), 0.24)); }
  const crest = ribbon(crestPts, 0.030 * S, true); crest.mesh.renderOrder = 8;
  const crestU = 0.5;                                     // the till sits mid-line
  // a soft rose-gold bloom under the crest, so the swap is never seen bare
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,236,214,1)'); g.addColorStop(0.35, 'rgba(232,185,74,0.55)');
    g.addColorStop(0.7, 'rgba(216,146,138,0.18)'); g.addColorStop(1, 'rgba(216,146,138,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c); })();
  const glowMat = new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 });
  const glow = new T.Sprite(glowMat); glow.renderOrder = 9; glow.scale.set(0.62 * S, 0.62 * S, 1); scene.add(glow);

  // debris: blades (thin tapered curved strips) and blue grama heads (the eyelash: a curved spine, bristles on one side)
  const bladeGeo = (() => { const pos = [], idx = [], N = 6;
    for (let i = 0; i <= N; i++) { const k = i / N, w = 0.0028 * (1 - k * 0.92), y = k * 0.075, x = 0.012 * k * k;
      pos.push(x - w, y, 0, x + w, y, 0); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.translate(0, -0.037, 0); return g; })();
  const gramaTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.strokeStyle = '#e9dccd'; x.lineCap = 'round';
    x.lineWidth = 5; x.beginPath(); x.moveTo(20, 70); x.quadraticCurveTo(120, 20, 236, 34); x.stroke();
    x.lineWidth = 2.2;
    for (let i = 0; i < 22; i++) { const k = 0.18 + 0.78 * i / 21, px = 20 + 216 * k, py = 70 - 50 * Math.sin(k * 1.4) + 6 * k;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - 6, py + 20 - 6 * k); x.stroke(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const bladeMats = [0x8ea38c, 0x6f8a72, 0xa9b89a].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.8, side: T.DoubleSide }));
  const gramaMat = new T.MeshBasicMaterial({ map: gramaTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, depthWrite: false });
  const gramaGeo = new T.PlaneGeometry(0.075, 0.028);
  const pieces = [];
  const fly = (mesh, t0, t1, a, c, b, spin, fall) => { mesh.visible = false; mesh.frustumCulled = false; scene.add(mesh);
    pieces.push({ mesh, t0, t1, a, b, c, spin, fall, ph: rnd(0, 6.28) }); };
  // nine blades and two grama heads blown across in the gust, each lifting from the grass off-frame left
  for (let i = 0; i < 9; i++) {
    const t0 = 0.11 + 0.017 * i + rnd(-0.004, 0.004), dur = rnd(0.07, 0.11), z = rnd(-0.25, 0.36);
    fly(new T.Mesh(bladeGeo, bladeMats[i % 3]), t0, t0 + dur, at(rnd(-1.3, -1.0), rnd(-0.02, 0.06), z), at(rnd(-0.2, 0.2), rnd(0.25, 0.5), z),
      at(rnd(1.05, 1.35), rnd(0.30, 0.65), z + rnd(-0.08, 0.08)), new T.Vector3(rnd(3, 9), rnd(2, 7), rnd(4, 11)), false);
  }
  for (let i = 0; i < 2; i++) {
    const t0 = 0.14 + 0.05 * i, z = i ? -0.18 : 0.32;
    fly(new T.Mesh(gramaGeo, gramaMat), t0, t0 + 0.12, at(-1.25, 0.04, z), at(0, 0.42 + 0.06 * i, z), at(1.3, 0.55, z), new T.Vector3(2, 5, 3), false);
  }
  // the calm: three blades and one grama head drift down around the landing; the last blade settles as the phone lands
  for (let i = 0; i < 3; i++) {
    const t0 = 0.37 + 0.05 * i, x0 = rnd(-0.55, -0.25) + 0.25 * i;
    fly(new T.Mesh(bladeGeo, bladeMats[(i + 1) % 3]), t0, i === 2 ? 0.57 : t0 + 0.14, at(x0, 0.75, rnd(0.05, 0.3)), at(x0 + 0.15, 0.4, 0.2),
      at(x0 + 0.3, i === 2 ? 0.0 : 0.05, rnd(0.1, 0.32)), new T.Vector3(rnd(1, 2), rnd(1, 3), rnd(1, 2)), true);
  }
  fly(new T.Mesh(gramaGeo, gramaMat), 0.38, 0.55, at(-0.15, 0.8, 0.25), at(0.15, 0.45, 0.28), at(0.42, 0.04, 0.3), new T.Vector3(0.6, 1.5, 0.8), true);

  const q = new T.Vector3();
  return t => {
    for (const r of [...R, ...calm]) {
      const k = (t - r.t0) / r.dur;
      r.m.uniforms.uLen.value = r.len; r.m.uniforms.uHead.value = k * (1 + r.len);
      r.m.uniforms.uAlpha.value = k > 0 && k < 1 ? (r.calm ? 0.35 : 0.55) * (1 - 0.6 * span(t, 0.36, 0.5)) : 0;
      r.mesh.visible = k > 0 && k < 1;
    }
    // the crest: in over 0.26-0.30, held through 0.36, gone by 0.40; the band crosses the till slowly while the swap happens
    const ch = span(t, 0.28, 0.31) * (1 - span(t, 0.35, 0.385));
    const cu = crest.m.uniforms;
    cu.uLen.value = 0.75; cu.uHead.value = 0.25 + 1.5 * span(t, 0.255, 0.40);
    cu.uAlpha.value = 0.75 * span(t, 0.255, 0.28) * (1 - span(t, 0.37, 0.40)); cu.uCharge.value = ch;
    cu.uBand.value = crestU - 0.07 + 0.14 * clamp((t - 0.30) / 0.06); cu.uBandW.value = 0.085;
    crest.mesh.visible = cu.uAlpha.value > 0;
    glow.position.copy(at(0, 0.17, 0.26));
    glowMat.opacity = 0.95 * bell(t, 0.295, 0.33, 0.37); glow.visible = glowMat.opacity > 0.002;
    // the debris on their paths, tumbling; the calm pieces sway as they fall and rest a beat, then go
    for (const d of pieces) {
      const k = (t - d.t0) / (d.t1 - d.t0);
      const on = d.fall ? k > 0 && t < 0.60 : k > 0 && k < 1;
      d.mesh.visible = on; if (!on) continue;
      const u = d.fall ? ease(clamp(k)) : clamp(k), w = 1 - u;
      q.copy(d.a).multiplyScalar(w * w).addScaledVector(d.c, 2 * w * u).addScaledVector(d.b, u * u);
      if (d.fall && k < 1) q.x += 0.03 * S * Math.sin(k * 9 + d.ph);
      d.mesh.position.copy(q);
      const sp = d.fall ? Math.min(k, 1) : k;
      d.mesh.rotation.set(d.spin.x * sp + d.ph, d.spin.y * sp, d.spin.z * sp + (d.fall && k >= 1 ? Math.PI / 2 : 0));
      d.mesh.scale.setScalar(S * (d.fall ? 1 - span(t, 0.585, 0.60) : 1));
    }
  };
}
