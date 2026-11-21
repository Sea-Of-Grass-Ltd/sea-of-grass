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
// the jump-morph (tools/rotary-phone/build_transform.py, same table): (t, height m, vertical stretch, turn deg):
// crouch, spring up stretching, swap at the fastest point, fly, land, squash, settle
const JUMP = [[0, 0, 1, 0], [0.10, 0, 1, 0], [0.22, 0, 0.72, 0], [0.27, 0.05, 1.28, 10], [0.3125, 0.15, 1.34, 60], [0.38, 0.27, 1.06, 170],
  [0.44, 0.30, 0.95, 250], [0.51, 0.21, 1.12, 330], [0.57, 0, 1.18, 360], [0.61, 0, 0.74, 360], [0.67, 0, 1.08, 360], [0.72, 0, 0.97, 360],
  [0.78, 0, 1, 360], [1, 0, 1, 360]];
const SWAP = 0.3125;
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
      const [THREE, { GLTFLoader }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
        import(VENDOR + 'three.module.min.js'), import(VENDOR + 'loaders/GLTFLoader.js'),
        import(VENDOR + 'environments/RoomEnvironment.js'), import(VENDOR + 'libs/meshopt_decoder.module.js')]);
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(HERE + 'stage.glb');
      this.build(THREE, gltf, RoomEnvironment);
    } catch (err) {
      console.warn('sog-stage:', err);
      this.dataset.state = 'failed'; this._canvas?.remove(); this.giveUp();
    }
  }

  build(T, gltf, RoomEnvironment) {
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
    actor.add(new T.HemisphereLight(0x6a7398, 0x1f1f35, 1.0));
    const key = new T.DirectionalLight(0xfff0da, 2.5); key.position.set(-0.5, 1.2, 0.8); actor.add(key);
    const rim = new T.DirectionalLight(0x9aa89a, 0.9); rim.position.set(0.5, 0.6, -0.9); actor.add(rim);
    stage.add(new T.HemisphereLight(0x5a6390, 0x15152a, 0.55));
    const lamp = new T.SpotLight(0xffd9b0, 9, 0, 0.62, 0.8, 1.2); lamp.position.set(-0.3, 2.4, 1.6); lamp.target.position.set(0, 0.42, 0);
    stage.add(lamp, lamp.target);                                  // the warm pool on the counter and the board
    const fill = new T.DirectionalLight(0x8f9ccc, 0.35); fill.position.set(0.8, 1.0, 1.0); stage.add(fill);

    const root = gltf.scene;
    const regRig = root.getObjectByName('register_rig'), phRig = root.getObjectByName('phone_rig');
    root.updateMatrixWorld(true);
    stage.add(root);
    for (const rig of [regRig, phRig]) actor.attach(rig);   // keep their world placement
    actor.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (/cream/.test(o.material?.name || '')) o.material.color.set(COL.phone); } });
    // flat and simple (Tristan 2026-11-20): the sky one flat blue, the ground one flat green, no grass or flowers
    const css = getComputedStyle(document.documentElement);
    const skyMat = new T.MeshBasicMaterial({ toneMapped: false }); skyMat.color.setStyle(css.getPropertyValue('--navy').trim() || '#272C4B');
    const groundMat = new T.MeshBasicMaterial({ toneMapped: false }); groundMat.color.setStyle(css.getPropertyValue('--grass').trim() || '#3F6550');
    const hide = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const n = o.name || '';
      if (/^sky_/.test(n)) {                                       // runs up past any camera
        o.material = skyMat;
        o.position.y *= 1.7; o.scale.y *= 1.7;                     // (meshopt keeps a node scale: stretch it, about the floor)
      } else if (/^(grass|flowers|meadow_humps)/.test(n)) hide.push(o);
      else if (/^(meadow_bed|side_felt|stage_floor)/.test(n)) o.material = groundMat;
    });
    for (const o of hide) o.visible = false;
    // the ground runs out to the front, so a tall screen never sees past its edge
    const apron = new T.Mesh(new T.PlaneGeometry(12, 12), groundMat); apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.002, 5.6); stage.add(apron);
    renderer.setClearColor(skyMat.color, 0);

    const pivot = regRig.position.clone(), restQ = regRig.quaternion.clone();
    actor.updateMatrixWorld(true);
    const phRest = phRig.matrixWorld.clone();                      // the landing spot: the dock camera hangs off this, not the jumping rig
    const morph = t => {
      let h = 0, sz = 1, r = 360;
      for (let i = 0; i < JUMP.length - 1; i++) {
        const [t0, h0, s0, r0] = JUMP[i], [t1, h1, s1, r1] = JUMP[i + 1];
        if (t <= t1) { const u = ease(t1 > t0 ? (t - t0) / (t1 - t0) : 1); h = h0 + (h1 - h0) * u; sz = s0 + (s1 - s0) * u; r = r0 + (r1 - r0) * u; break; }
      }
      const sxy = 1 / Math.sqrt(sz), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), T.MathUtils.degToRad(r)).multiply(restQ);
      for (const rig of [regRig, phRig]) { rig.position.set(pivot.x, pivot.y + h, pivot.z); rig.quaternion.copy(q); rig.scale.set(sxy, sz, sxy); }
      regRig.visible = t < SWAP; phRig.visible = t >= SWAP;
    };

    // the board, for laying the real <h1> over it
    // on tall screens the board itself stands taller (grows up from its posts), so the words on it can be big
    const boardParts = ['sign_board', 'sign_frame'].map(n => root.getObjectByName(n)).filter(Boolean);
    const boardBase = new T.Box3().setFromObject(root.getObjectByName('sign_frame') || boardParts[0]).min.y;
    const base0 = boardParts.map(o => ({ o, py: o.position.y, sy: o.scale.y }));
    let bPts = [], tallK = 0;
    const shapeBoard = k => {
      if (k === tallK) return; tallK = k;
      for (const { o, py, sy } of base0) { o.position.y = boardBase + (py - boardBase) * k; o.scale.y = sy * k; }
      root.updateMatrixWorld(true);
      const bBox = new T.Box3().setFromObject(root.getObjectByName('sign_board'));
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

    const cam = new T.PerspectiveCamera(30, 1, 0.05, 30);
    const pin = this.closest('.stage-pin') || this.parentElement;
    const track = this.closest('[data-stage-track]');
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
    const shots = aspect => aspect >= 1
      ? { a: pose([0.06, 0, 0.60], 2.3, 1.22, 6, aspect), b: pose([-0.56, -0.02, 0.66], 1.05, 0.78, 6, aspect) }
      : { a: pose([0.25, 0, 0.92], 1.18, 1.25, 6, aspect), b: pose([-0.56, -0.02, 0.66], 0.62, 0.9, 6, aspect) };

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
    const size = () => { W = pin.clientWidth; H = pin.clientHeight; renderer.setSize(W, H, false); shapeBoard(W / H < 0.8 ? 1.9 : 1); pin.classList.toggle('stage-tall', W / H < 0.8); ask(); };
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
      const glide = span(p, 0.04, 0.34);
      const t = clamp((p - 0.30) / 0.50);
      const gone = span(t, 0.26, 0.46);
      const dock = span(t, 0.34, 0.57);
      const handed = p >= 0.995;
      this.dataset.p = p.toFixed(3); this.dataset.t = t.toFixed(3);
      morph(t);
      actor.updateMatrixWorld(true);

      const aspect = W / H, s = shots(aspect);
      const sp = s.a.pos.clone().lerp(s.b.pos, glide), sq = s.a.q.clone().slerp(s.b.q, glide);

      // the words: the h1 sits on the board, the rest fade as the camera leaves
      cam.position.copy(sp); cam.quaternion.copy(sq); cam.fov = 30; cam.aspect = aspect; cam.clearViewOffset(); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const q of bPts) { v.copy(q).project(cam); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const pad = (x1 - x0) * 0.045;
      pin.style.setProperty('--bx', (x0 + pad).toFixed(1) + 'px'); pin.style.setProperty('--by', (y0 + pad).toFixed(1) + 'px');
      pin.style.setProperty('--bw', (x1 - x0 - 2 * pad).toFixed(1) + 'px'); pin.style.setProperty('--bh', (y1 - y0 - 2 * pad).toFixed(1) + 'px');
      pin.style.setProperty('--words-o', (1 - span(p, 0.06, 0.18)).toFixed(3));
      pin.style.setProperty('--h1-o', (1 - span(p, 0.1, 0.26)).toFixed(3));
      pin.classList.toggle('stage-done', handed);
      if ((this.dataset.handed === '1') !== handed) this.handOver(handed);

      renderer.setViewport(0, 0, W, H);
      renderer.clear();
      if (gone < 1) {
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
        const lands = r.top - cr.top - rise + r.height * 0.5 < H;
        const ex = r.left - cr.left, ey = r.top - cr.top - (lands ? rise : 0), ew = Math.max(1, r.width), eh = Math.max(1, r.height);
        const d = dockCam(el, ew, eh);
        const vx = ex * dock, vy = ey * dock, vw = W + (ew - W) * dock, vh = H + (eh - H) * dock;
        renderer.setViewport(vx, H - vy - vh, vw, vh);
        cam.position.copy(sp).lerp(d.pos, dock); cam.quaternion.copy(sq).slerp(d.q, dock);
        cam.fov = 30 + (PHONE.fov - 30) * dock; cam.aspect = vw / vh;
        cam.setViewOffset(vw, vh, 0, -vh * d.drop * dock, vw, vh);
        cam.updateProjectionMatrix();
        blobMat.opacity = span(t, 0.55, 0.62);
      } else blobMat.opacity = 0;
      renderer.render(actor, cam);
    };
    const ask = () => { if (!this._raf) this._raf = requestAnimationFrame(draw); };
    this._onScroll = ask;
    if (!this.still) addEventListener('scroll', ask, { passive: true });
    this._ro = new ResizeObserver(size); this._ro.observe(pin);
    size(); draw();
    this.dataset.state = 'live'; this.removeAttribute('data-pending');
    requestAnimationFrame(() => this.classList.add('shown'));
  }
}
customElements.define('sog-stage', SogStage);
