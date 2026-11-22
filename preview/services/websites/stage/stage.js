// <sog-stage>: the Websites opening, a night book-nook stage in real 3D (tools/rotary-phone/build_stage.py, Tristan's
// direction 2026-11-20): painted sky, a long dark counter, the big coral-framed board with the headline (real HTML laid
// over it from here), a wooden toy register and a felt meadow. Scrolling is one continuous shot: the camera glides to the
// register, it crouches and leaps, turns into the rotary phone at the fastest point of the leap (jump-morph), and while it
// flies the stage fades away to show "Tired of annoying calls?" rising underneath (the section tucks under the hero's
// last screen, websites.css). The phone lands on the spot where that section's live <sog-phone> will stand, seen through
// that element's own camera, waits there as the section arrives, and then the real phone takes over.
// Reduced motion: the stage, still, no shot. No WebGL or a low-power device: the still picture inside.
// Test hooks: data-state (still | loading | live | failed), data-p (scroll progress 0-1), data-t (morph 0-1), data-handed.
const HERE = new URL('.', import.meta.url).href;
const VENDOR = new URL('../phone/vendor/', import.meta.url).href;
const css = `
sog-stage{position:absolute;inset:0;display:block;pointer-events:none}
sog-stage picture,sog-stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
sog-stage[data-pending] picture,sog-stage[data-state=live] picture{visibility:hidden}
sog-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .6s ease}
sog-stage.shown canvas{opacity:1}
`;
const PHONE = { phoneYaw: 0.42, lookX: -0.028, lookY: 0.072, pitch: 22, fit: 0.375, drop: 0.09, fov: 30 };   // <sog-phone>'s camera
const COL = { phone: 0xf1e8d8 };
// the jump-morph as a Front Range gust (Tristan 2026-11-22: the old spin "isn't believable"; the first gust drew lines over
// it and he said it didn't look good, so now the wind shows in the till itself). (t, height m, vertical stretch, turn deg,
// lean deg away from the wind): the gust shoves it over twice and it digs in while beams of light pour into it, it lifts,
// bursts into its parts at the turn, the phone's parts fly back together out of the burst, and it lands and settles
const JUMP = [[0, 0, 1, 0, 0], [0.10, 0, 1, 0, 0], [0.125, 0, 0.98, 0, 9], [0.145, 0, 0.97, 0, 3], [0.17, 0, 0.96, 0, 14],
  [0.19, 0, 0.94, 0, 5], [0.205, 0, 0.86, 0, 8], [0.22, 0, 0.76, 0, 0], [0.27, 0.06, 1.22, 20, -6], [0.30, 0.12, 1.28, 80, -4],
  [0.33, 0.18, 1.16, 180, 0], [0.36, 0.25, 1.06, 280, 0], [0.44, 0.30, 0.95, 330, 0], [0.51, 0.21, 1.10, 350, 0], [0.57, 0, 1.18, 360, 0],
  [0.61, 0, 0.74, 360, 0], [0.67, 0, 1.08, 360, 0], [0.72, 0, 0.97, 360, 0], [0.78, 0, 1, 360, 0], [1, 0, 1, 360, 0]];
const SWAP = 0.33;
const SIDE_FOOT = 0.118;                                         // the till's side edge, from its centre (m, before HERO)
const B = (T, x, y, z) => new T.Vector3(x, z, -y);              // Blender Z-up -> glTF Y-up
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x * x * (3 - 2 * x);
const span = (p, a, b) => ease(clamp((p - a) / (b - a)));

function lowPower() {
  const c = navigator.connection;
  return !!(c && c.saveData) || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory && navigator.deviceMemory < 2);
}
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

class SogStage extends HTMLElement {
  connectedCallback() {
    if (!document.getElementById('sog-stage-css')) {
      const s = document.createElement('style'); s.id = 'sog-stage-css'; s.textContent = css; document.head.append(s);
    }
    this.dataset.state = this.dataset.state || 'still';
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lowPower() || !webglOK()) { this.giveUp(); return; }
    const go = () => { if (this.dataset.state === 'still') this.boot(); };
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 600));
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  }
  disconnectedCallback() { this._ro?.disconnect(); removeEventListener('scroll', this._onScroll); cancelAnimationFrame(this._raf); this._renderer?.dispose(); }
  giveUp() {
    this.removeAttribute('data-pending');
    document.documentElement.classList.add('stage-still');       // the page drops the scroll track (websites.css)
    this.handOver(true);
  }
  handOver(on) {                                                  // the real phone shows only once ours has landed on it
    const el = document.querySelector('#calls sog-phone');
    if (el) el.style.opacity = on ? '' : '0';
    this.dataset.handed = on ? '1' : '0';
  }

  async boot() {
    this.dataset.state = 'loading';
    try {
      const [THREE, { GLTFLoader }, { RoomEnvironment }, { MeshoptDecoder }, { makeGust }] = await Promise.all([
        import(VENDOR + 'three.module.min.js'), import(VENDOR + 'loaders/GLTFLoader.js'),
        import(VENDOR + 'environments/RoomEnvironment.js'), import(VENDOR + 'libs/meshopt_decoder.module.js'), import(HERE + 'gust.js')]);
      this._makeGust = makeGust;
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const [gltf, till] = await Promise.all([loader.loadAsync(HERE + 'stage.glb'), loader.loadAsync(HERE + 'till.glb')]);
      this.build(THREE, gltf, RoomEnvironment, till);
    } catch (err) {
      console.warn('sog-stage:', err);
      this.dataset.state = 'failed'; this._canvas?.remove(); this.giveUp();
    }
  }

  build(T, gltf, RoomEnvironment, till) {
    const canvas = this._canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    this.append(canvas);
    const renderer = this._renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);                          // see-through: the page shows wherever the stage has gone
    const env = new T.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;

    // two layers: the stage (fades away) and the actor (the register, then the phone), lit like <sog-phone>
    const stage = new T.Scene(), actor = new T.Scene();
    actor.environment = env; actor.environmentIntensity = 0.5;
    stage.environment = env; stage.environmentIntensity = 0.22;
    // light (Tristan 2026-11-21: the scene was flat for lack of shading): one warm lamp overhead, a little in front, that
    // casts real shadows and falls off into the dark; a cool moon light from behind on the right for rims; low fill
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const LAMP = [-0.25, 2.1, 0.75], MOON = [1.6, 2.0, -1.6];
    actor.add(new T.HemisphereLight(0x55608c, 0x1a1a2e, 0.55));
    const key = new T.DirectionalLight(0xffe2bd, 3.0); key.position.set(...LAMP); actor.add(key);
    const rim = new T.DirectionalLight(0xb4c2ff, 1.6); rim.position.set(...MOON); actor.add(rim);
    stage.add(new T.HemisphereLight(0x46507e, 0x101022, 0.32));
    const lamp = new T.SpotLight(0xffd6a8, 26, 0, 0.75, 0.9, 1.6); lamp.position.set(...LAMP); lamp.target.position.set(-0.05, 0.3, 0.05);
    lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0004; lamp.shadow.normalBias = 0.01; lamp.shadow.radius = 4;
    lamp.shadow.camera.near = 0.5; lamp.shadow.camera.far = 6;
    stage.add(lamp, lamp.target);                                  // the warm pool on the counter and the board, dark beyond it
    const moon = new T.DirectionalLight(0x9fb0ff, 0.9); moon.position.set(...MOON); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.01; moon.shadow.radius = 6;
    Object.assign(moon.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 8 });
    stage.add(moon);

    const root = gltf.scene;
    const regRig = root.getObjectByName('register_rig'), phRig = root.getObjectByName('phone_rig');
    // the Smoked-Glass Till (Tristan 2026-11-22: the wooden toy read as clipart; "everybody likes the effect, just not the
    // register"): its parts go into the register's rig, in the same local frame, so the crouch, leap and morph carry over
    if (till) {
      const tr = till.scene.getObjectByName('till_rig');
      if (tr) {
        for (const c of [...regRig.children]) regRig.remove(c);
        for (const c of [...tr.children]) regRig.add(c);
        const glass = new T.MeshPhysicalMaterial({ color: 0x07060b, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.66,
          clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9, depthWrite: false, side: T.DoubleSide });
        const window_ = glass.clone(); window_.opacity = 0.3;
        regRig.traverse(o => {
          if (!o.isMesh) return;
          const n = o.material?.name || '';
          if (n === 'tl_glass') { o.material = glass; o.renderOrder = 2; }
          else if (n === 'tl_window') { o.material = window_; o.renderOrder = 3; }
          else if (n === 'tl_rose') { o.material = new T.MeshBasicMaterial({ color: 0xffc4bb, toneMapped: false }); }
          else if (o.material && 'envMapIntensity' in o.material) {   // the room light blew the metals out to white: tame it
            const k = { tl_keytop: 0.45, tl_alu: 0.6, tl_satin: 0.35, tl_graphite: 0.5, tl_flag: 0.4, tl_gold: 0.8 }[n];
            if (k !== undefined) o.material.envMapIntensity = k;
            if (o.material.anisotropy) o.material.anisotropy = 0;     // exported without tangents, it drew the brushed metal flat white
            if (n === 'tl_satin') o.material.color.multiplyScalar(0.7);
          }
        });
      }
    }
    root.updateMatrixWorld(true);
    stage.add(root);
    for (const rig of [regRig, phRig]) actor.attach(rig);   // keep their world placement
    actor.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (/cream/.test(o.material?.name || '')) o.material.color.set(COL.phone); } });
    // flat and simple (Tristan 2026-11-20): the sky one flat blue, the ground one flat green, no grass or flowers
    const css = getComputedStyle(document.documentElement);
    const skyMat = new T.MeshBasicMaterial({ toneMapped: false }); skyMat.color.setStyle(css.getPropertyValue('--navy').trim() || '#272C4B');
    // the ground is lit (it takes the lamp's pool and the shadows); its colour is lifted so the pool reads as the page green
    const groundMat = new T.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0 });
    groundMat.color.setStyle(css.getPropertyValue('--grass').trim() || '#3F6550');
    const hide = [], nightGrass = new Map();
    root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.castShadow = o.receiveShadow = true;
      const n = o.name || '';
      if (/^(sky_|moon|star)/.test(n)) hide.push(o);              // the painted sky below has its own stars (2026-11-21)
      else if (/^flowers/.test(n)) hide.push(o);                  // the grass is back (Tristan 2026-11-21); flowers stay off
      else if (/^(grass|meadow_humps)/.test(n)) {                  // a night green, not the lamp-bleached day green
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const night = mats.map(m => { if (!nightGrass.has(m)) { const c = m.clone(); c.color.multiplyScalar(0.36); c.color.lerp(new T.Color(0x16303d), 0.2); if (c.emissive) c.emissive.setHex(0); c.envMapIntensity = 0.3; nightGrass.set(m, c); } return nightGrass.get(m); });
        o.material = Array.isArray(o.material) ? night : night[0];
      }
      else if (/^(meadow_bed|side_felt|stage_floor)/.test(n)) o.material = groundMat;
    });
    for (const o of hide) o.visible = false;
    // the ground runs out to the front, so a tall screen never sees past its edge, and back to the sky
    const apron = new T.Mesh(new T.PlaneGeometry(12, 12), groundMat); apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.002, 5.6); apron.receiveShadow = true; stage.add(apron);
    const backland = new T.Mesh(new T.PlaneGeometry(14, 4.5), groundMat); backland.rotation.x = -Math.PI / 2; backland.position.set(0, -0.003, -1.85); backland.receiveShadow = true; stage.add(backland);
    stage.fog = new T.Fog(0x0e1226, 2.6, 7.5);                                     // the far meadow fades into the night
    // the meadow all the way back (Tristan 2026-11-21): the front strip of grass laid again as tiles behind and beside
    // the counter, out to the sky; tiles share the strip's geometry, alternate turned round so the rows don't read as copies
    {
      const strip = [];
      root.traverse(o => { if (o.isMesh && /^(grass|meadow_humps)/.test(o.name)) strip.push(o); });
      const DZ = 0.40, DX = 2.7;
      for (let row = 0; row < 12; row++) for (const col of [-1, 0, 1]) {
        if (row === 0 && col === 0) continue;                                            // the original strip
        const g = new T.Group(); g.position.set(col * DX, 0, 0.39 - row * DZ);
        if ((row + col) & 1) g.rotation.y = Math.PI;
        for (const o of strip) {
          if (row >= 5 && !/^grass_[ab]/.test(o.name)) continue;                    // far rows: half the blades, the fog hides it
          const c = o.clone(); c.position.x -= 0; c.position.z -= 0.39; c.castShadow = false; c.receiveShadow = true; g.add(c); }
        stage.add(g);
      }
    }
    // the register lives in the actor scene, so the stage gets an invisible stand-in of it that only casts its shadow
    const ghostMat = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const ghost = regRig.clone(true); ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = true; o.receiveShadow = false; } });
    stage.add(ghost);
    actor.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    renderer.setClearColor(skyMat.color, 0);
    // the sky (Tristan 2026-11-21): gold stars over a black-to-navy gradient, a painted image filling the screen behind
    // the stage like a cover-fit backdrop; it fades away with the stage
    const sky = new T.TextureLoader().load(HERE + 'sky.webp', () => ask());
    sky.colorSpace = T.SRGBColorSpace; stage.background = sky;
    const fitSky = aspect => {
      const img = 1376 / 768;
      if (aspect > img) { sky.repeat.set(1, img / aspect); sky.offset.set(0, 1 - img / aspect); }   // wider than the image: keep its top (the big stars)
      else { sky.repeat.set(aspect / img, 1); sky.offset.set((1 - aspect / img) / 2, 0); }
    };

    // the register is the hero (Tristan 2026-11-21): centred on the counter and half again as big, the sign lifted on
    // taller posts above it, so the words read first and the register stands right under them
    const HERO = +(new URLSearchParams(location.search).get("hero") || 1.5);
    // just the register (Tristan 2026-11-21): no counter, sign, meadow or sky, the register alone on the page's navy
    // with the words above it; ?scene=1 brings the full stage back
    const BARE = new URLSearchParams(location.search).get('scene') !== '1';
    for (const rig of [regRig, phRig]) rig.position.set(0, 0.4, 0.04);
    {
      const signNames = ['sign_board', 'sign_frame', 'sign_post', 'sign_post001', 'sign_foot', 'sign_foot001'];
      const LIFT = 0.40, DX = -0.25;
      for (const n of signNames) { const o = root.getObjectByName(n); if (o) o.position.x += DX; }
      for (const n of ['sign_board', 'sign_frame']) { const o = root.getObjectByName(n); if (o) o.position.y += LIFT; }
      root.updateMatrixWorld(true);
      const boardMin = new T.Box3().setFromObject(root.getObjectByName('sign_frame')).min.y;
      for (const n of ['sign_post', 'sign_post001']) {
        const o = root.getObjectByName(n); if (!o) continue;
        const b0 = new T.Box3().setFromObject(o), h0 = b0.max.y - b0.min.y;
        o.scale.y *= (boardMin + 0.02 - b0.min.y) / h0; o.updateMatrixWorld(true);
        const b1 = new T.Box3().setFromObject(o); o.position.y += b0.min.y - b1.min.y;
      }
      root.updateMatrixWorld(true);
    }
    this._dbg = { T, root, regRig, phRig, stage, actor };
    const pivot = regRig.position.clone(), restQ = regRig.quaternion.clone();
    // no lamps of its own any more (Tristan 2026-11-22, glows vs Dope Security): the overhead key is the one warm light
    // the magic gust (gust.js): reduced motion keeps the still till, so no wind is built
    const wind = this.still || !this._makeGust ? null : this._makeGust(T, actor, pivot.clone(), HERO, BARE ? 0.45 : 1);
    // the till's loose parts for the gust: its keys rattle and its price flags flutter on a hinge at their foot
    const keys = [], flags = new T.Group();
    if (wind) {
      regRig.traverse(o => { if (o.isMesh && /^(key_|total_key)/.test(o.name)) keys.push({ o, y: o.position.y, k: keys.length }); });
      const fl = []; regRig.traverse(o => { if (o.isMesh && /^price/.test(o.name)) fl.push(o); });
      if (fl.length) {
        regRig.updateMatrixWorld(true);
        const bb = new T.Box3(); for (const o of fl) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); }
        flags.position.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2); regRig.add(flags);
        for (const o of fl) { o.position.sub(flags.position); flags.add(o); }
      }
    }
    // the burst (Tristan 2026-11-22: "glowing light beams that went inside of the register and then the register
    // exploded into parts and did the transformation thing"): each rig comes apart into its parts, flung out from its
    // centre with a spin, and the phone's parts fly back together out of the till's burst. Measured at rest.
    const partsOf = rig => {
      rig.updateMatrixWorld(true);
      const inv = rig.matrixWorld.clone().invert(), units = [];
      for (const c of rig.children) {
        if (c.name === 'root' && !c.isMesh) units.push(...c.children); else if (c.isMesh || c.isGroup) units.push(c);
      }
      const all = new T.Box3().setFromObject(rig).applyMatrix4(inv), mid = all.getCenter(new T.Vector3());
      // details glued to a body (the phone's reliefs, labels, plates, feet) fly with that body, not on their own
      const glued = /^(relief|label|centre_label|digit_marks|number_plate|dial_bezel|feet|cradle|finger_stop)/;
      const list = units.filter(u => !u.isSkinnedMesh).map((u, i) => {
        const bb = new T.Box3().setFromObject(u).applyMatrix4(inv), c = bb.getCenter(new T.Vector3());
        const dir = c.clone().sub(mid); dir.y *= 0.8; if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
        dir.normalize().multiplyScalar(0.06 + 0.035 * ((i * 37) % 7) / 7);
        // the offset in the part's own parent's frame (the phone's parts hang off a 'root' group)
        const pq = u.parent === rig ? new T.Quaternion() : u.parent.quaternion.clone().invert(), ps = u.parent === rig ? 1 : 1 / u.parent.scale.x;
        return { u, p0: u.position.clone(), r0: u.rotation.clone(), off: dir.applyQuaternion(pq).multiplyScalar(ps),
          spin: new T.Vector3(((i * 13) % 5 - 2) * 0.35, ((i * 7) % 5 - 2) * 0.45, ((i * 11) % 5 - 2) * 0.3) };
      });
      const body = list.find(p => /^body_shell/.test(p.u.name));
      if (body) for (const p of list) if (p !== body && glued.test(p.u.name)) { p.off = body.off; p.spin = new T.Vector3(); p.withBody = true; }
      if (body) { body.spin = new T.Vector3(); for (const p of list) if (p.withBody) p.spin = body.spin; }   // they turn about different origins, so the body and its details fly without spinning
      return list;
    };
    const tillParts = wind ? partsOf(regRig) : [], phoneParts = wind ? partsOf(phRig) : [];
    const cord = phRig.getObjectByName('coiled_cord');
    const burst = (parts, e) => { for (const p of parts) { p.u.position.copy(p.p0).addScaledVector(p.off, e);
      p.u.rotation.set(p.r0.x + p.spin.x * e, p.r0.y + p.spin.y * e, p.r0.z + p.spin.z * e); } };
    // the light the beams pour in: the till's metal parts warm from inside as it fills
    const lit = []; if (wind) regRig.traverse(o => { if (o.isMesh && o.material?.emissive && /^tl_(alu|keytop|gold)$/.test(o.material.name)) lit.push(o.material); });
    for (const m of new Set(lit)) m.emissive.set(0xe9b8ad);
    const fadeTo = (rig, f) => rig.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) {
      if (m.userData.o0 === undefined) { m.userData.o0 = m.opacity; m.userData.tr0 = m.transparent; }
      m.opacity = m.userData.o0 * f; m.transparent = f < 1 || m.userData.tr0; } });
    actor.updateMatrixWorld(true);
    // the landing spot: the dock camera hangs off this, not the jumping rig; at the phone's own size (it shrinks from
    // the hero size back to 1 as it docks, so it lands exactly as big as <sog-phone> draws it)
    const phRest = phRig.matrixWorld.clone();                      // (taken before the first morph, so at scale 1)
    const morph = t => {
      let h = 0, sz = 1, r = 360, tl = 0;
      for (let i = 0; i < JUMP.length - 1; i++) {
        const [t0, h0, s0, r0, k0] = JUMP[i], [t1, h1, s1, r1, k1] = JUMP[i + 1];
        if (t <= t1) { const u = ease(t1 > t0 ? (t - t0) / (t1 - t0) : 1); h = h0 + (h1 - h0) * u; sz = s0 + (s1 - s0) * u; r = r0 + (r1 - r0) * u; tl = k0 + (k1 - k0) * u; break; }
      }
      const sxy = 1 / Math.sqrt(sz), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), T.MathUtils.degToRad(r)).multiply(restQ);
      // the push: leaning away from the wind about the far foot, with a shudder while the gust blows (scroll-keyed, so a
      // parked scroll holds still)
      const gust = wind ? span(t, 0.105, 0.14) * (1 - span(t, 0.27, 0.31)) : 0;
      const lean = tl + gust * 1.3 * Math.sin(t * 2600) + gust * 0.6 * Math.sin(t * 4100 + 1);
      const ql = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), -T.MathUtils.degToRad(lean));
      const foot = new T.Vector3((lean >= 0 ? 1 : -1) * SIDE_FOOT * HERO * sxy, 0, 0), lift = foot.clone().sub(foot.clone().applyQuaternion(ql));
      q.multiply(ql);
      for (const rig of [regRig, phRig]) { rig.position.set(pivot.x + lift.x, pivot.y + h * (BARE ? 0.45 : 1) + lift.y, pivot.z + lift.z); rig.quaternion.copy(q); rig.scale.set(sxy * HERO, sz * HERO, sxy * HERO); }
      regRig.visible = t < SWAP; phRig.visible = t >= SWAP;
      if (wind) {
        wind(t);
        // filled with light, it bursts mid-spin; the till's parts fade as the phone's fly back together through them
        const glow = span(t, 0.14, 0.285) * (1 - span(t, 0.30, 0.33));
        for (const m of new Set(lit)) m.emissiveIntensity = 0.55 * glow;
        const eT = span(t, 0.285, 0.322), eP = 1 - span(t, 0.33, 0.385);
        burst(tillParts, eT); burst(phoneParts, eP);
        // on top of the burst: the keys rattle and the flags flutter while the gust blows
        for (const k of keys) k.o.position.y += gust * 0.0016 * Math.sin(t * 3100 + k.k * 1.7);
        flags.rotation.x += gust * 0.32 * Math.sin(t * 1900) + span(t, 0.27, 0.33) * 0.5;
        const ft = 1 - span(t, 0.316, 0.333), fp = span(t, 0.322, 0.338);
        regRig.visible = ft > 0.01; phRig.visible = fp > 0.01; fadeTo(regRig, ft); fadeTo(phRig, fp);
        if (cord) cord.visible = eP < 0.04;                        // the skinned cord can't fly apart: it appears as the phone closes
      }
      ghost.position.copy(regRig.position); ghost.quaternion.copy(regRig.quaternion); ghost.scale.copy(regRig.scale); ghost.visible = regRig.visible;
    };

    // the board, for laying the real <h1> over it
    // on tall screens the board itself stands taller (grows up from its posts), so the words on it can be big
    const boardParts = ['sign_board', 'sign_frame'].map(n => root.getObjectByName(n)).filter(Boolean);
    const boardBase = new T.Box3().setFromObject(root.getObjectByName('sign_frame') || boardParts[0]).min.y;
    const base0 = boardParts.map(o => ({ o, py: o.position.y, sy: o.scale.y }));
    // a modern lit sign (Tristan 2026-11-21, the chalkboard "feels old"): a dark navy panel glowing from within, a thin
    // squared gold edge, slim dark-metal posts; the old rounded coral frame is hidden (it still sets the board's base)
    const frameOld = root.getObjectByName('sign_frame'); if (frameOld) frameOld.visible = false;
    const face = root.getObjectByName('sign_board');
    if (face) face.material = new T.MeshStandardMaterial({ color: 0x0b0d1f, roughness: 0.9, metalness: 0, emissive: 0x161b3c, emissiveIntensity: 0.5 });
    const gold = new T.MeshStandardMaterial({ color: 0xe8b94a, metalness: 0.85, roughness: 0.28, emissive: 0x8a6418, emissiveIntensity: 0.35 });
    const edge = [0, 1, 2, 3].map(() => { const m = new T.Mesh(new T.BoxGeometry(1, 1, 1), gold); m.castShadow = true; stage.add(m); return m; });
    const metal = new T.MeshStandardMaterial({ color: 0x23263a, metalness: 0.7, roughness: 0.35 });
    root.traverse(o => { if (o.isMesh && /^sign_(post|foot)/.test(o.name)) { o.material = metal; o.scale.x *= 0.55; o.scale.z *= 0.55; } });
    const glow = new T.Object3D();                     // (the sign's spill light made a blue blob on the counter: dropped)
    // the counter to match the sign (2026-11-21): a deep ink-navy body, a warm oak top for the wooden register to sit
    // on, and a thin gold strip under the top's front edge, the sign's gold
    const ink = new T.MeshStandardMaterial({ color: 0x0e1020, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.2 });
    const oak = new T.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.62, metalness: 0, envMapIntensity: 0.25 });
    root.traverse(o => {
      if (!o.isMesh) return;
      if (o.name === 'counter_top') o.material = oak;
      else if (/^counter_(body|base)/.test(o.name)) o.material = ink;
    });
    {
      const top = root.getObjectByName('counter_top'), body = root.getObjectByName('counter_body');
      if (top && body) {
        root.updateMatrixWorld(true);
        const tb = new T.Box3().setFromObject(top), bb = new T.Box3().setFromObject(body), t = 0.009;
        const strip = new T.Mesh(new T.BoxGeometry(tb.max.x - tb.min.x, t, 0.004), gold);
        strip.position.set((tb.min.x + tb.max.x) / 2, tb.min.y + t / 2, tb.max.z + 0.002); stage.add(strip);
      }
    }
    let bPts = [], tallK = 0;
    const shapeBoard = k => {
      if (k === tallK) return; tallK = k;
      for (const { o, py, sy } of base0) { o.position.y = boardBase + (py - boardBase) * k; o.scale.y = sy * k; }
      root.updateMatrixWorld(true);
      const bBox = new T.Box3().setFromObject(root.getObjectByName('sign_board'));
      {
        const c = bBox.getCenter(new T.Vector3()), s = bBox.getSize(new T.Vector3()), t = 0.007, d = s.z + 0.006;
        edge[0].scale.set(s.x + 2 * t, t, d); edge[0].position.set(c.x, bBox.max.y + t / 2, c.z);
        edge[1].scale.set(s.x + 2 * t, t, d); edge[1].position.set(c.x, bBox.min.y - t / 2, c.z);
        edge[2].scale.set(t, s.y, d); edge[2].position.set(bBox.min.x - t / 2, c.y, c.z);
        edge[3].scale.set(t, s.y, d); edge[3].position.set(bBox.max.x + t / 2, c.y, c.z);
        glow.position.set(c.x, bBox.min.y - 0.03, bBox.max.z + 0.10);
      }
      bPts = [0, 1, 2, 3, 4, 5, 6, 7].map(i => new T.Vector3(i & 1 ? bBox.max.x : bBox.min.x, i & 2 ? bBox.max.y : bBox.min.y, i & 4 ? bBox.max.z : bBox.min.z));
    };
    shapeBoard(1);

    // the fade: a full-screen sheet that scales what is drawn (colour and alpha) by 1 - k, so the page shows through
    const fadeMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, toneMapped: false, depthTest: false, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.ZeroFactor, blendDst: T.OneMinusSrcAlphaFactor,
      blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor });
    const fade = new T.Scene(); fade.add(new T.Mesh(new T.PlaneGeometry(2, 2), fadeMat));
    const flat = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // a soft shadow under the landed phone, as <sog-phone> has
    const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(10,10,24,0.55)'); gr.addColorStop(0.6, 'rgba(10,10,24,0.25)'); gr.addColorStop(1, 'rgba(10,10,24,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    const blobMat = new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 });
    const blob = new T.Mesh(new T.PlaneGeometry(0.30, 0.29), blobMat);
    blob.rotation.set(-Math.PI / 2, 0, 0); blob.position.set(0, 0.0008, 0); phRig.add(blob);
    // bare: a soft shadow under the register too, so it stands on something
    const regBlobMat = blobMat.clone(); regBlobMat.opacity = BARE ? 0.9 : 0;
    const regBlob = new T.Mesh(new T.PlaneGeometry(0.34, 0.30), regBlobMat);
    regBlob.rotation.set(-Math.PI / 2, 0, 0); regBlob.position.set(0, 0.0008, 0); regRig.add(regBlob);

    const cam = new T.PerspectiveCamera(30, 1, 0.05, 30);
    const pin = this.closest('.stage-pin') || this.parentElement;
    const track = this.closest('[data-stage-track]');
    const host = track || pin;                                      // classes and board vars live on the track: the words sit outside the pin
    const target = () => document.querySelector('#calls sog-phone');
    const calls = document.getElementById('calls');

    // a camera looking at `look` (Blender coords), `pitch` degrees down, far enough to fit fitW x fitH metres
    const pose = (look, fitW, fitH, pitch, aspect) => {
      const half = Math.tan(T.MathUtils.degToRad(15)), hh = half * aspect;
      const d = Math.max(fitW / 2 / hh, fitH / 2 / half);
      const L = B(T, ...look), pr = T.MathUtils.degToRad(pitch);
      const pos = L.clone().add(new T.Vector3(0, Math.sin(pr) * d, Math.cos(pr) * d));
      const q = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(pos, L, new T.Vector3(0, 1, 0)));
      return { pos, q };
    };
    // the opening shot fills the screen with the stage; the second holds the register with room above it for the leap
    const shots = BARE
      ? (aspect => aspect >= 1
        ? { a: pose([-0.36, -0.04, 0.62], 1.2, 0.86, 8, aspect), b: pose([-0.36, -0.04, 0.62], 1.2, 0.86, 8, aspect) }   // desktop: the register big on the right, the words on the left
        : { a: pose([0, -0.04, 0.92], 1.0, 1.6, 8, aspect), b: pose([0, -0.04, 0.68], 0.8, 1.1, 8, aspect) })
      : (aspect => aspect >= 1
        ? { a: pose([0, 0, 0.80], 2.1, 1.48, 6, aspect), b: pose([0, -0.04, 0.68], 1.3, 1.0, 6, aspect) }
        : { a: pose([0, 0, 1.02], 1.12, 1.55, 6, aspect), b: pose([0, -0.04, 0.68], 0.8, 1.1, 6, aspect) });

    // <sog-phone>'s own camera for a box w x h, in the landing spot's frame (its pivot turns the phone by phoneYaw)
    const dockCam = (el, w, h) => {
      const aspect = w / h, half = Math.tan(T.MathUtils.degToRad(PHONE.fov / 2)), p = T.MathUtils.degToRad(PHONE.pitch);
      const cs = getComputedStyle(el), drop = parseFloat(cs.getPropertyValue('--phone-drop')), fitW = parseFloat(cs.getPropertyValue('--phone-fit-w'));
      const dist = aspect > 1 && fitW ? fitW / (2 * half * aspect) : PHONE.fit / (2 * half * Math.min(1, aspect));
      const look = new T.Vector3(PHONE.lookX, PHONE.lookY, 0);
      const pos = new T.Vector3(look.x, look.y + Math.sin(p) * dist, look.z + Math.cos(p) * dist);
      const m = new T.Matrix4().lookAt(pos, look, new T.Vector3(0, 1, 0)).setPosition(pos);
      const world = phRest.clone().multiply(new T.Matrix4().makeRotationY(-PHONE.phoneYaw)).multiply(m);
      const wp = new T.Vector3(), wq = new T.Quaternion(), ws = new T.Vector3(); world.decompose(wp, wq, ws);
      return { pos: wp, q: wq, drop: isNaN(drop) ? PHONE.drop : drop };
    };

    let W = 1, H = 1;
    // tall screens, register only: the register must start below the words, whatever the phone's height (Tristan 2026-11-21,
    // it rode up into the buttons on a shorter phone). fitK zooms the shot out, fitS moves it down, in screen pixels
    let fitK = 1, fitS = 0;
    const fit = () => {
      fitK = 1; fitS = 0;
      const board = host.querySelector('.stage-board');
      if (!BARE || !board || W / H >= 0.8) return;
      // phones (Tristan 2026-11-21): the register big in the band under the words, as big as the phone
      // it becomes, centred in that band; k < 1 zooms in, k > 1 zooms out
      const s0 = shots(W / H).a, c = new T.PerspectiveCamera(30, W / H, 0.05, 30);
      c.position.copy(s0.pos); c.quaternion.copy(s0.q); c.updateProjectionMatrix(); c.updateMatrixWorld();
      morph(0.10); actor.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(regRig);
      let top = 1e9, bot = -1e9, l = 1e9, r = -1e9;
      for (let i = 0; i < 8; i++) { const v = new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(c);
        const y = (1 - v.y) / 2 * H, x = (v.x + 1) / 2 * W; top = Math.min(top, y); bot = Math.max(bot, y); l = Math.min(l, x); r = Math.max(r, x); }
      // the band: under the words, down to the bottom of the screen as first seen (the header pushes the stage down by its height)
      // measured against the words' own sticky frame, never the scroll position: iPhone fires resizes mid-scroll (the toolbar),
      // and a fit taken with the words scrolled away blew the register up over them (Tristan's phone, 2026-11-21)
      const frame = board.closest('.stage-frame') || pin;
      const bandTop = board.getBoundingClientRect().bottom - frame.getBoundingClientRect().top + 12;
      const bandBot = H - 16;                                        // the stage starts under the header bar on phones (css)
      fitK = Math.max((bot - top) / Math.max(60, bandBot - bandTop), (r - l) / (0.9 * W));
      const t2 = H / 2 + (top - H / 2) / fitK, b2 = H / 2 + (bot - H / 2) / fitK;
      fitS = bandTop - t2;                                          // seated right under the words, one group with them; any spare room falls below
      this._dbg.fit = { fitK, fitS, bandTop, bandBot };
    };
    // the camera with the fit applied, for a w x h box: zoom out by widening the lens, then slide the picture down
    // (share s: 1 at rest, 0 once docked); extraY is the dock's own drop
    const applyFit = (w, h, s, extraY) => {
      const k = 1 + (fitK - 1) * s;
      if (k !== 1) cam.fov = T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * k));
      const dy = -fitS * s * (h / H) + (extraY || 0);
      if (dy) cam.setViewOffset(w, h, 0, dy, w, h); else cam.clearViewOffset();
    };
    const size = () => { W = pin.clientWidth; H = pin.clientHeight; renderer.setSize(W, H, false); fitSky(W / H); shapeBoard(W / H < 0.8 ? 1.9 : 1); host.classList.toggle('stage-tall', W / H < 0.8); host.classList.toggle('stage-bare', BARE); fit(); ask(); };
    const progress = () => {
      if (this.still || !track) return 0;
      const r = track.getBoundingClientRect(), range = track.offsetHeight - pin.clientHeight;
      return range > 0 ? clamp(-r.top / range) : 0;
    };

    const v = new T.Vector3();
    const draw = () => {
      this._raf = 0;
      const p = progress();
      // the score, in scroll progress: hold, glide to the register, the jump-morph (the stage fades while it flies), the
      // landing on <sog-phone>'s spot, a wait while the section arrives, then the real phone takes over
      // timed so the phone lands just as "Tired of annoying calls?" finishes rising (Tristan 2026-11-21: no dead gap)
      // bare (Tristan 2026-11-21, "awkward motion"): one continuous move. The words scroll away like page text while the
      // register holds still; it crouches as they clear (p .33), and from the swap the phone flies straight into its
      // spot while "Tired of annoying calls?" rises under it, landing as the section settles (p .95)
      if (BARE) { const bb = host.querySelector('.stage-board')?.getBoundingClientRect().height || 0; if (Math.abs(bb - (this._bh || 0)) > 1) { this._bh = bb; fit(); } }
      const glide = BARE ? 0 : span(p, 0.03, 0.24);
      const t = BARE ? clamp(0.10 + p * 0.495) : clamp((p - 0.162) / 1.383);     // bare: the crouch starts with the first scroll
      const gone = span(t, 0.26, 0.46);
      const dock = BARE ? span(t, SWAP, 0.57) : span(t, 0.34, 0.57);
      const handed = p >= 0.995;
      this.dataset.p = p.toFixed(3); this.dataset.t = t.toFixed(3);
      morph(t);
      actor.updateMatrixWorld(true);

      const aspect = W / H, s = shots(aspect);
      const sp = s.a.pos.clone().lerp(s.b.pos, glide), sq = s.a.q.clone().slerp(s.b.q, glide);

      // the words: the h1 sits on the board, the rest fade as the camera leaves
      cam.position.copy(sp); cam.quaternion.copy(sq); cam.fov = 30; cam.aspect = aspect; applyFit(W, H, 1, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const q of bPts) { v.copy(q).project(cam); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const pad = (x1 - x0) * 0.045;
      host.style.setProperty('--bx', (x0 + pad).toFixed(1) + 'px'); host.style.setProperty('--by', (y0 + pad).toFixed(1) + 'px');
      host.style.setProperty('--bw', (x1 - x0 - 2 * pad).toFixed(1) + 'px'); host.style.setProperty('--bh', (y1 - y0 - 2 * pad).toFixed(1) + 'px');
      host.style.setProperty('--words-o', (1 - span(p, 0.06, 0.18)).toFixed(3));
      host.style.setProperty('--h1-o', (1 - span(p, 0.1, 0.26)).toFixed(3));
      host.classList.toggle('stage-done', handed);
      if (this.dataset.handed !== (handed ? '1' : '0')) this.handOver(handed);         // (also on the first frame)

      renderer.setViewport(0, 0, W, H);
      renderer.clear();
      if (gone < 1 && !BARE) {
        renderer.render(stage, cam);
        fadeMat.opacity = gone;
        if (gone > 0) renderer.render(fade, flat);
      }
      renderer.clearDepth();
      if (handed) return;

      // the actor: the stage camera, turning into <sog-phone>'s own camera over the spot where it will stand once
      // the section has arrived (its box now, less how far the section still has to rise)
      const el = target();
      if (el && dock > 0) {
        const cr = canvas.getBoundingClientRect(), r = el.getBoundingClientRect(), rise = calls ? Math.max(0, calls.getBoundingClientRect().top - cr.top) : 0;
        // where the section stacks the phone under its words (narrow screens), its spot isn't on this screen when the
        // section arrives: then the phone drops toward its live spot below and the page carries on to it
        // phones (Tristan 2026-11-21, "the gap shouldn't be this large"): the phone drops into its spot where the spot is NOW,
        // in the rising section, and rides up with the words, rather than waiting up top over an empty band
        const lands = !(BARE && W / H < 0.8) && r.top - cr.top - rise + r.height * 0.5 < H;
        const ex = r.left - cr.left, ey = r.top - cr.top - (lands ? rise : 0), ew = Math.max(1, r.width), eh = Math.max(1, r.height);
        const d = dockCam(el, ew, eh);
        { const k = 1 + (1 / HERO - 1) * dock; phRig.scale.multiplyScalar(k); phRig.updateMatrixWorld(true); }
        const vx = ex * dock, vy = ey * dock, vw = W + (ew - W) * dock, vh = H + (eh - H) * dock;
        renderer.setViewport(vx, H - vy - vh, vw, vh); this._dbg.vp = [vx, vy, vw, vh];
        cam.position.copy(sp).lerp(d.pos, dock); cam.quaternion.copy(sq).slerp(d.q, dock);
        cam.fov = 30 + (PHONE.fov - 30) * dock; cam.aspect = vw / vh;
        applyFit(vw, vh, 1 - dock, -vh * d.drop * dock);
        cam.updateProjectionMatrix();
        blobMat.opacity = span(t, 0.55, 0.62);
      } else blobMat.opacity = 0;
      renderer.render(actor, cam);
    };
    const ask = () => { if (!this._raf) this._raf = requestAnimationFrame(draw); };
    this._dbg.draw = draw; this._dbg.cam = cam;
    this._onScroll = ask;
    if (!this.still) addEventListener('scroll', ask, { passive: true });
    this._ro = new ResizeObserver(size); this._ro.observe(pin);
    { const b = host.querySelector(".stage-board"); if (b) this._ro.observe(b); }       // the words settle once the fonts are in
    size(); draw();
    this.dataset.state = 'live'; this.removeAttribute('data-pending');
    requestAnimationFrame(() => this.classList.add('shown'));
  }
}
customElements.define('sog-stage', SogStage);
