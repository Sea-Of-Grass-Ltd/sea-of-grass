// The gust's air (Tristan 2026-11-22). The first version drew wind lines, tumbling debris and a gold crest over the till,
// and he said it didn't look good: the wind now shows in the till itself (stage.js leans, shakes and whips it, rattles
// its keys and flutters its flags). All that's left here is the air behind the push: three faint pale streaks passing
// behind the till while the gust blows (t 0.11-0.31). Drawn before the smoked glass (renderOrder 1), so the glass smokes
// them. No dots, no swirl, no colour, no glow.

const ease = x => x * x * (3 - 2 * x);

const VERT = `attribute float aU; attribute float aV; varying float vU; varying float vV;
void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `uniform float uHead, uLen, uAlpha; uniform vec3 uCol; varying float vU; varying float vV;
void main(){
  float s = (vU - (uHead - uLen)) / uLen;                 // 0 at the tail, 1 at the head
  if (s < 0.0 || s > 1.0) discard;
  float a = smoothstep(0.0, 0.5, s) * smoothstep(1.0, 0.8, s) * (1.0 - vV * vV);
  gl_FragColor = vec4(uCol, a * uAlpha);
}`;

export function makeGust(T, scene, P, S, lift = 1) {
  const at = (x, y, z) => new T.Vector3(P.x + x * S, P.y + y * S * (0.4 + 0.6 * lift), P.z + z * S);
  const col = new T.Color(0xe6e2ec);
  const ribbon = (pts, width) => {
    const curve = new T.CatmullRomCurve3(pts), N = 80, pos = [], u = [], v = [], idx = [], zf = new T.Vector3(0, 0, 1);
    for (let i = 0; i <= N; i++) {
      const k = i / N, p = curve.getPointAt(k), n = new T.Vector3().crossVectors(curve.getTangentAt(k), zf).normalize();
      const w = width * (0.3 + 0.7 * Math.sin(Math.PI * k));
      for (const sg of [-1, 1]) { const q = p.clone().addScaledVector(n, sg * w / 2); pos.push(q.x, q.y, q.z); u.push(k); v.push(sg); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new T.Float32BufferAttribute(u, 1));
    g.setAttribute('aV', new T.Float32BufferAttribute(v, 1)); g.setIndex(idx);
    const m = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.AdditiveBlending, uniforms: { uHead: { value: 0 }, uLen: { value: 0.45 }, uAlpha: { value: 0 }, uCol: { value: col } } });
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.visible = false; scene.add(mesh);
    return { mesh, m };
  };
  const line = (y, z, rise, ph) => { const pts = [];
    for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(at(-1.3 + 2.6 * k, y + rise * ease(k) + 0.012 * Math.sin(k * 5 + ph), z)); }
    return pts; };
  // [y, z, rise, width, start t, travel] : all behind the till, each on its own height
  const R = [[0.12, -0.20, 0.05, 0.007, 0.11, 0.09], [0.26, -0.26, 0.04, 0.006, 0.15, 0.10], [0.07, -0.16, 0.10, 0.008, 0.21, 0.10]]
    .map(([y, z, rise, w, t0, dur], i) => ({ ...ribbon(line(y, z, rise, i * 1.9), w * S), t0, dur }));
  return t => {
    for (const r of R) {
      const k = (t - r.t0) / r.dur, on = k > 0 && k < 1;
      r.mesh.visible = on; if (!on) continue;
      r.m.uniforms.uHead.value = k * 1.45; r.m.uniforms.uAlpha.value = 0.22;
    }
  };
}
