// The gust as light (Tristan 2026-11-22: "the wind demonstrated with glowing light beams that went inside of the register
// and then the register exploded into parts and did the transformation thing"). Five thin beams come in from off-frame
// left, one after another, and drive into the till through its glass, each stopping inside it (at the linkage, the
// flags, the drawer); they hold while it fills with their light (stage.js warms its metal parts), then go out as it
// bursts. Light with a source and a target, thin and sharp: no blobs, no blur, no dots. Champagne white at the core,
// the site rose at the edges.

const ease = x => x * x * (3 - 2 * x);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const span = (t, a, b) => ease(clamp((t - a) / (b - a)));

const VERT = `attribute float aU; attribute float aV; varying float vU; varying float vV;
void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `uniform float uHead, uAlpha; uniform vec3 uCore, uEdge; varying float vU; varying float vV;
void main(){
  if (vU > uHead) discard;
  float across = 1.0 - abs(vV);
  float head = smoothstep(uHead - 0.18, uHead, vU);          // brightest where it is driving in
  float a = (0.6 + 0.4 * head) * smoothstep(0.0, 0.08, vU) * (0.45 * across + 0.9 * pow(across, 3.0));
  vec3 c = mix(uEdge, uCore, smoothstep(0.2, 0.9, across));
  gl_FragColor = vec4(c, a * uAlpha);
}`;

export function makeGust(T, scene, P, S) {
  const at = (x, y, z) => new T.Vector3(P.x + x * S, P.y + y * S, P.z + z * S);
  const core = new T.Color(0xfff2e8), edge = new T.Color(0xe7aaa2);
  const beam = (pts, width) => {
    const curve = new T.CatmullRomCurve3(pts), N = 90, pos = [], u = [], v = [], idx = [], zf = new T.Vector3(0, 0, 1);
    for (let i = 0; i <= N; i++) {
      const k = i / N, p = curve.getPointAt(k), n = new T.Vector3().crossVectors(curve.getTangentAt(k), zf).normalize();
      const w = width * (1 - 0.55 * k);                        // narrowing as it drives in
      for (const sg of [-1, 1]) { const q = p.clone().addScaledVector(n, sg * w / 2); pos.push(q.x, q.y, q.z); u.push(k); v.push(sg); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new T.Float32BufferAttribute(u, 1));
    g.setAttribute('aV', new T.Float32BufferAttribute(v, 1)); g.setIndex(idx);
    const m = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false,
      side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { uHead: { value: 0 }, uAlpha: { value: 0 }, uCore: { value: core }, uEdge: { value: edge } } });
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.visible = false; scene.add(mesh);
    return { mesh, m };
  };
  // from (x, y, z) off-frame left to a point inside the till (its local frame, metres x hero), through a bend
  const path = (from, bend, to) => [at(...from), at(...bend), at(to[0] * 0.6 + bend[0] * 0.4, to[1] * 0.6 + bend[1] * 0.4, to[2] * 0.6 + bend[2] * 0.4), at(...to)];
  const B = [
    [[-1.5, 0.42, 0.35], [-0.55, 0.30, 0.22], [-0.04, 0.16, 0.00], 0.125],   // into the linkage
    [[-1.5, 0.08, 0.30], [-0.60, 0.10, 0.20], [-0.02, 0.06, 0.02], 0.150],   // into the drawer
    [[-1.4, 0.62, 0.10], [-0.50, 0.38, 0.06], [0.01, 0.22, 0.04], 0.175],    // into the flags
    [[-1.5, 0.26, 0.42], [-0.62, 0.20, 0.28], [0.04, 0.12, 0.02], 0.200],    // into the keys
    [[-1.4, 0.50, 0.26], [-0.48, 0.32, 0.16], [0.03, 0.18, -0.02], 0.225],   // into the flag rods
  ].map(([a, b, c, t0]) => ({ ...beam(path(a, b, c), 0.020 * S), t0 }));
  const TRAVEL = 0.035;
  return t => {
    const out = 1 - span(t, 0.285, 0.31);                     // they go out as the till bursts
    for (const b of B) {
      const k = (t - b.t0) / TRAVEL, on = k > 0 && out > 0.01;
      b.mesh.visible = on; if (!on) continue;
      b.m.uniforms.uHead.value = Math.min(1, ease(clamp(k)) * 1.0001); b.m.uniforms.uAlpha.value = out;
    }
  };
}
