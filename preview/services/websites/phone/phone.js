// <sog-phone>: the counter phone from "One less call asking what's left", live in 3D.
// The still picture inside the element is the fallback and sets the box; the canvas is laid over it once the
// model is ready, so nothing on the page moves. Reduced motion, no WebGL or a failed load: the picture stays.
// Model: phone.glb (built in Blender, tools/rotary-phone/), actions handset_lift and dial, each 1 s linear 0..1.
// data-lines (optional): a selector for the section's lines; the 1st rings the phone, the 2nd lifts the handset, the 3rd
// turns the dial, when a line is hovered, tapped or crosses the middle of the screen.
// Test hooks: data-state (still | loading | live | failed), data-lift, data-dial, data-move, el.pointOf('handset' | 'dial' | 'dial-hole').
const HERE = new URL('.', import.meta.url).href;
const css = `
sog-phone{display:block;position:relative;overflow:hidden}
sog-phone.shown{background:#22263f}
sog-phone picture{display:block}
sog-phone canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .5s ease;touch-action:pan-y;-webkit-tap-highlight-color:transparent}
sog-phone.shown canvas{opacity:1}
sog-phone[data-state=live] picture{visibility:hidden}
`;

// night meadow (PALETTE.md, approved 2026-11-19): the counter and grass sit dull and cool, close to the section's
// navy ground; the phone is the warm white pop; a couple of poppies are the only accent
const COL = { counterTop: 0x2a2e48, counterSide: 0x20233a, counterLip: 0x353a58,
  grass: [0x4a6a5e, 0x40595a, 0x384d52, 0x55705f], flowers: [0xd17c66, 0xd17c66, 0x7f917f], phone: 0xf1e8d8 };

// staging: counter top level at y = 0, front edge at z = front, back edge at z = back; the camera looks down `pitch`
// degrees, square to the front edge, and frames fitW metres across (portrait) or fitH tall (landscape)
const STAGE = { front: 0.22, back: -0.30, phoneZ: -0.03, phoneYaw: 0.32, lookY: 0.075, pitch: 20, fitW: 0.44, fitH: 0.40, drop: 0.11 };

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

class SogPhone extends HTMLElement {
  connectedCallback() {
    if (!document.getElementById('sog-phone-css')) {
      const s = document.createElement('style'); s.id = 'sog-phone-css'; s.textContent = css; document.head.append(s);
    }
    Object.assign(this.dataset, { state: this.dataset.state || 'still', lift: '0', dial: '0' });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this._io = new IntersectionObserver(es => {
      for (const e of es) {
        this._visible = e.isIntersecting;
        if (e.isIntersecting && this.dataset.state === 'still') this.boot();
      }
    }, { rootMargin: '200px 0px' });
    this._io.observe(this);
  }
  disconnectedCallback() { this._io?.disconnect(); this._lineIO?.disconnect(); this._ro?.disconnect(); cancelAnimationFrame(this._raf); this._renderer?.dispose(); }

  async boot() {
    if (!webglOK()) return;                       // stays 'still'
    this.dataset.state = 'loading';
    try {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import(HERE + 'vendor/three.module.min.js'), import(HERE + 'vendor/loaders/GLTFLoader.js'),
        import(HERE + 'vendor/environments/RoomEnvironment.js')]);
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(this.dataset.glb || HERE + 'phone.glb');
      this.build(THREE, gltf, RoomEnvironment);
    } catch (err) {
      this.dataset.state = 'failed';
      this._canvas?.remove();
    }
  }

  build(THREE, gltf, RoomEnvironment) {
    const T = THREE;
    const canvas = this._canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const renderer = this._renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);   // the exact page navy shows through (set on the element), untouched by tone mapping
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environmentIntensity = 0.5;

    // meadow light: cool sky fill, a soft moon key from the front left, a green rim from the meadow behind
    scene.add(new T.HemisphereLight(0x6a7398, 0x1f1f35, 1.0));
    const key = new T.DirectionalLight(0xfff0da, 2.5);                  // warm, so the phone pops off the cool ground
    key.position.set(-0.5, 1.2, 0.8); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.002;
    Object.assign(key.shadow.camera, { left: -0.35, right: 0.35, top: 0.35, bottom: -0.35, near: 0.5, far: 2.5 });
    scene.add(key);
    const rim = new T.DirectionalLight(0x9aa89a, 0.9); rim.position.set(0.5, 0.6, -0.9); scene.add(rim);

    // staging (2026-11-20): one long counter, its top level at y = 0 and its front edge square to the view, so it
    // reads as the thing the phone stands on; the meadow grows up from the ground behind its back edge
    scene.fog = new T.Fog(0x22263f, 1.5, 3.6);                       // the meadow fades into the page's navy
    const ctr = new T.Group();
    const matTop = new T.MeshStandardMaterial({ color: COL.counterTop, roughness: 0.95, envMapIntensity: 0.2 });
    const matSide = new T.MeshStandardMaterial({ color: COL.counterSide, roughness: 0.95, envMapIntensity: 0.2 });
    const top = new T.Mesh(new T.BoxGeometry(3.2, 0.04, STAGE.back * -1 + STAGE.front), matTop);
    top.position.set(0, -0.02, (STAGE.front + STAGE.back) / 2); top.receiveShadow = true; ctr.add(top);
    const lip = new T.Mesh(new T.BoxGeometry(3.2, 0.012, 0.012), new T.MeshStandardMaterial({ color: COL.counterLip, roughness: 0.8, envMapIntensity: 0.3 }));
    lip.position.set(0, -0.006, STAGE.front - 0.006); ctr.add(lip);  // the worn front edge catches a little light
    const body = new T.Mesh(new T.BoxGeometry(3.2, 0.9, STAGE.back * -1 + STAGE.front - 0.03), matSide);
    body.position.set(0, -0.49, (STAGE.front - 0.03 + STAGE.back) / 2); ctr.add(body);
    scene.add(ctr);
    this._counter = ctr;

    // grass and a few flowers growing up behind and beside the counter, swaying
    this._grass = this.meadow(T, scene);

    // the phone
    const phone = gltf.scene;
    phone.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (/cream/.test(o.material?.name || '')) o.material.color.set(COL.phone);   // warm white on the page
    });
    const pivot = new T.Group();
    pivot.position.set(0, 0, STAGE.phoneZ); pivot.rotation.y = STAGE.phoneYaw;   // turned to show the cord side
    pivot.add(phone); scene.add(pivot);
    // a soft contact shadow under the base, so it sits on the counter rather than hovering
    const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(10,10,24,0.55)'); gr.addColorStop(0.6, 'rgba(10,10,24,0.25)'); gr.addColorStop(1, 'rgba(10,10,24,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    const blob = new T.Mesh(new T.PlaneGeometry(0.30, 0.29), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.set(0, 0.0008, 0); pivot.add(blob);
    const mixer = new T.AnimationMixer(phone);
    const act = {};
    for (const clip of gltf.animations) {
      const a = mixer.clipAction(clip);
      if (clip.name === 'ring') { a.setLoop(T.LoopRepeat, 2); a.clampWhenFinished = false; }   // ring-ring
      else { a.play(); a.paused = true; }
      act[clip.name] = a;
    }
    let meta = {};
    phone.traverse(o => { if (o.userData?.dial_center) meta = o.userData; });   // the rig node carries the dial numbers
    const handsetMeshes = [], wheel = [];
    phone.traverse(o => {
      if (!o.isMesh) return;
      const n = (o.name || '') + ' ' + (o.parent?.name || '');
      if (/handset_grip|earpiece|mouthpiece|relief_handset/.test(n)) handsetMeshes.push(o);
      if (/finger_wheel|number_plate|centre_label|digit_marks|label_band/.test(n)) wheel.push(o);
    });

    const camera = new T.PerspectiveCamera(30, 1, 0.05, 12);
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    this.append(canvas);
    const look = new T.Vector3(0, STAGE.lookY, STAGE.phoneZ);
    const frame = () => {
      const w = this.clientWidth, h = this.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // eye a little above the counter, looking down STAGE.pitch degrees, square to its front edge
      const p = T.MathUtils.degToRad(STAGE.pitch), half = Math.tan(T.MathUtils.degToRad(camera.fov) / 2);
      const dist = Math.max(STAGE.fitW / (2 * half * camera.aspect), STAGE.fitH / (2 * half));
      camera.position.set(look.x, look.y + Math.sin(p) * dist, look.z + Math.cos(p) * dist);
      camera.lookAt(look);
      camera.setViewOffset(w, h, 0, -h * STAGE.drop, w, h);           // the phone sits a touch below the middle
      camera.updateProjectionMatrix();
    };
    this._ro = new ResizeObserver(frame); this._ro.observe(this); frame();

    // dial geometry from the model's extras (Blender Z-up -> glTF Y-up)
    const v3 = a => a ? new T.Vector3(a[0], a[2], -a[1]) : null;
    pivot.updateMatrixWorld(true);
    const W = v => v && pivot.localToWorld(v), Wd = v => v && v.transformDirection(pivot.matrixWorld);
    const dialC = W(v3(meta.dial_center)), dialN = Wd(v3(meta.dial_normal)), dialX = Wd(v3(meta.dial_x));
    const dialMax = meta.dial_max_deg || 312, holeR = meta.hole_ring || 0.0335, hole0 = T.MathUtils.degToRad(meta.hole0_deg ?? 290);
    const dialY = dialN && dialX ? new T.Vector3().crossVectors(dialN, dialX) : null;
    const handsetC = W(v3(meta.handset_center));
    const handsetBone = phone.getObjectByName('handset');   // follows the lift
    const hsOffset = handsetC && handsetBone ? (() => { phone.updateMatrixWorld(true); return handsetC.clone().sub(handsetBone.getWorldPosition(new T.Vector3())); })() : null;

    const toScreen = p => {
      const v = p.clone().project(camera), r = canvas.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    };
    this.pointOf = name => {
      if (this.dataset.state !== 'live' && this.dataset.state !== 'loading') return null;
      if (name === 'handset' && handsetC) return toScreen(hsOffset ? handsetBone.getWorldPosition(new T.Vector3()).add(hsOffset) : handsetC);
      if (name === 'dial' && dialC) return toScreen(dialC);
      if (name === 'dial-hole' && dialC) return toScreen(dialC.clone().addScaledVector(dialX, holeR * Math.cos(hole0)).addScaledVector(dialY, holeR * Math.sin(hole0)));
      return null;
    };

    // where things land on the canvas, as fractions (for the staging tests)
    this.staging = () => {
      const r = canvas.getBoundingClientRect(), f = q => { const v = q.clone().project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
      const box = { l: 1, r: 0, t: 1, b: 0 }, v = new T.Vector3();
      phone.updateMatrixWorld(true);
      phone.traverse(o => {
        if (!o.isMesh) return;
        const n = o.geometry.attributes.position.count;
        for (let i = 0; i < n; i += 3) { o.getVertexPosition(i, v); const q = f(o.localToWorld(v)); box.l = Math.min(box.l, q.x); box.r = Math.max(box.r, q.x); box.t = Math.min(box.t, q.y); box.b = Math.max(box.b, q.y); }
      });
      const e1 = f(new T.Vector3(-0.3, 0, STAGE.front)), e2 = f(new T.Vector3(0.3, 0, STAGE.front));
      const dir = new T.Vector3(); camera.getWorldDirection(dir);
      let grassTop = 1, hidden = true;
      const counterMeshes = []; this._counter.traverse(o => o.isMesh && counterMeshes.push(o));
      for (const b of this._grass.blades) {
        const tip = f(new T.Vector3(b.x, b.base + b.h, b.z));
        if (tip.x > 0 && tip.x < 1) grassTop = Math.min(grassTop, Math.max(0, tip.y));
        const root = new T.Vector3(b.x, b.base, b.z), toRoot = root.clone().sub(camera.position);
        const rf = f(root); if (rf.x < 0 || rf.x > 1) continue;
        ray.set(camera.position, toRoot.clone().normalize()); ray.far = toRoot.length();
        if (!ray.intersectObjects(counterMeshes, false).length) hidden = false;
      }
      ray.far = Infinity;
      return { phone: box, edgeY: (e1.y + e2.y) / 2, edgeTiltDeg: Math.atan2((e2.y - e1.y) * r.height, (e2.x - e1.x) * r.width) * 180 / Math.PI,
        lookDownDeg: Math.round(-Math.asin(dir.y) * 180 / Math.PI), grassTop, grassRootsHidden: hidden, contactShadow: !!blob.parent && renderer.shadowMap.enabled };
    };

    // ---- interaction
    let lift = 0, liftTarget = 0, dial = 0, dragging = false, dragAngle = 0, hovering = false, wind = 0, liftTimer = 0;
    const hit = (e, list) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(list, false).length > 0;
    };
    const overDial = e => {
      if (!dialC) return false;
      const c = toScreen(dialC), e2 = toScreen(dialC.clone().addScaledVector(dialX, 0.048));
      return Math.hypot(e.clientX - c.x, e.clientY - c.y) < Math.hypot(e2.x - c.x, e2.y - c.y) * 1.05;
    };
    const angleAt = e => { const c = toScreen(dialC); return Math.atan2(e.clientY - c.y, e.clientX - c.x); };
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && overDial(t)) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('pointerdown', e => {
      if (overDial(e)) {
        dragging = true; dragAngle = angleAt(e); canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); return;
      }
      if (e.pointerType !== 'mouse') liftTarget = hit(e, handsetMeshes) && liftTarget < 0.5 ? 1 : 0;   // tap it to lift, tap again or anywhere else to set it down
    });
    canvas.addEventListener('pointermove', e => {
      if (dragging) {
        const a = angleAt(e);
        let d = a - dragAngle; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        dragAngle = a;
        dial = Math.min(1, Math.max(0, dial + T.MathUtils.radToDeg(d) / dialMax));   // clockwise on screen winds it
        return;
      }
      if (e.pointerType === 'mouse') {
        const on = hit(e, handsetMeshes);
        if (on !== hovering) { hovering = on; liftTarget = on ? 1 : 0; canvas.style.cursor = on ? 'pointer' : ''; }
        if (!on && overDial(e)) canvas.style.cursor = 'grab';
      }
    });
    const release = () => { dragging = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !dragging) { hovering = false; liftTarget = 0; canvas.style.cursor = ''; } });

    // ---- loop
    const clock = new T.Clock();
    let first = true, rang = false;
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (!this._visible || document.hidden) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      lift += (liftTarget - lift) * Math.min(1, dt * 7);
      if (Math.abs(liftTarget - lift) < 0.002) lift = liftTarget;
      if (wind) { dial = Math.min(wind, dial + dt * (360 / dialMax)); if (dial >= wind) wind = 0; }   // a finger winding it
      else if (!dragging && dial > 0) dial = Math.max(0, dial - dt * (420 / dialMax));   // runs back at a steady speed, like a real dial
      if (act.handset_lift) act.handset_lift.time = lift * act.handset_lift.getClip().duration * 0.999;
      if (act.dial) act.dial.time = dial * act.dial.getClip().duration * 0.999;
      mixer.update(dt);
      if (this._grass) this._grass.uniforms.uTime.value += dt;
      renderer.render(scene, camera);
      this.dataset.lift = lift.toFixed(3); this.dataset.dial = dial.toFixed(3);
      if (first) {
        first = false;
        this.classList.add('shown');
        setTimeout(() => { this.dataset.state = 'live'; hookLines(); }, 520);
      }
    };

    // ---- the section's three lines play the moves
    const ringing = () => act.ring?.isRunning();
    mixer.addEventListener('finished', e => { if (e.action === act.ring) act.handset_lift?.setEffectiveWeight(1); });
    const play = name => {
      this.dataset.move = name;
      if (name === 'ring' && act.ring) {
        liftTarget = 0; lift = 0;
        act.handset_lift?.setEffectiveWeight(0);                    // the ring moves the handset itself
        act.ring.reset().play();
      } else if (name === 'lift') {
        if (ringing()) { act.ring.stop(); act.handset_lift?.setEffectiveWeight(1); }
        liftTarget = 1; clearTimeout(liftTimer);
        liftTimer = setTimeout(() => { if (!hovering) liftTarget = 0; }, 1800);
      } else if (name === 'dial' && !dragging) {
        wind = 0.72;
      }
    };
    const hookLines = () => {
      const lines = this.dataset.lines ? [...document.querySelectorAll(this.dataset.lines)].slice(0, 3) : [];
      const names = ['ring', 'lift', 'dial'], last = new Map();
      const go = (i, gap = 0) => { const t = performance.now(); if (t - (last.get(i) || -1e9) < gap) return; last.set(i, t); play(names[i]); };
      lines.forEach((el, i) => {
        el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') go(i, 1200); });
        el.addEventListener('click', () => go(i));
      });
      if (lines.length && !matchMedia('(hover: hover)').matches) {   // on phones, each line plays as it scrolls through the middle
        const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) go(lines.indexOf(e.target), 4000); }), { rootMargin: '-45% 0px -45% 0px' });
        lines.forEach(el => io.observe(el));
        this._lineIO = io;
      }
    };
    tick();
  }

  // a clump of grass blades and a handful of flowers, placed behind and beside the counter
  meadow(T, scene) {
    const uniforms = { uTime: { value: 0 } };
    const blades = [], rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    const add = (x, z, h, lean, w) => blades.push({ x, z, h, lean, w });
    const GROUND = -0.9;                                     // the meadow floor, out of sight behind the counter
    for (let i = 0; i < 230; i++) {                          // rows behind the back edge, taller further back
      const z = STAGE.back - 0.06 - rnd() * 1.2, x = (rnd() - 0.5) * (1.0 + (STAGE.back - z) * 0.9);
      const reach = 0.95 + rnd() * 0.55 + (STAGE.back - z) * 0.25;
      add(x, z, reach, (rnd() - 0.5) * 0.35, 0.010 + rnd() * 0.012);
    }
    // two poppies and a sage bud, each on its own stem (a stem is a thin blade that ends at the flower)
    const spots = [[-0.15, 0.22, STAGE.back - 0.14, 0], [0.17, 0.31, STAGE.back - 0.30, 1], [0.03, 0.17, STAGE.back - 0.10, 2]];
    for (const [x, y, z] of spots) blades.push({ x, z, h: y - GROUND, lean: 0, w: 0.003, stem: true });
    const pos = [], col = [], sway = [];
    const c = new T.Color();
    blades.forEach((b, i) => {
      c.setHex(COL.grass[i % COL.grass.length]);
      const seg = 6, base = GROUND; b.base = base;
      for (let s = 0; s < seg; s++) {
        const t0 = s / seg, t1 = (s + 1) / seg;
        const P = t => [b.x + b.lean * t * t * b.h, base + t * b.h, b.z];
        const W = t => b.w * (1 - t * 0.9);
        const [a, d] = [P(t0), P(t1)];
        const q = [[a[0] - W(t0), a[1], a[2], t0], [a[0] + W(t0), a[1], a[2], t0], [d[0] + W(t1), d[1], d[2], t1], [d[0] - W(t1), d[1], d[2], t1]];
        for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], q[k][1], q[k][2]); col.push(c.r, c.g, c.b); sway.push(b.stem ? 0 : q[k][3], i * 0.37); }   // flower stems hold still under their flowers
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setAttribute('sway', new T.Float32BufferAttribute(sway, 2));
    g.computeVertexNormals();
    const m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = uniforms.uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute vec2 sway;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nfloat k = sway.x * sway.x;\ntransformed.x += k * 0.035 * sin(uTime * 1.1 + sway.y);\ntransformed.z += k * 0.014 * cos(uTime * 0.8 + sway.y * 1.3);');
    };
    scene.add(new T.Mesh(g, m));
    // flowers on a few of the taller stems: cornflower, buttercup, daisy (as drawn)
    for (const [x, y, z, k] of spots) {
      const f = new T.Mesh(new T.CircleGeometry(0.014, 10), new T.MeshLambertMaterial({ color: COL.flowers[k], side: T.DoubleSide }));
      f.position.set(x, y, z); f.lookAt(x - 0.3, y + 0.5, z + 1); scene.add(f);
      const ctr = new T.Mesh(new T.CircleGeometry(0.0045, 8), new T.MeshLambertMaterial({ color: 0x332739 }));
      ctr.position.copy(f.position); ctr.quaternion.copy(f.quaternion); ctr.translateZ(0.001); scene.add(ctr);
    }
    return { uniforms, blades };
  }
}

if (!customElements.get('sog-phone')) customElements.define('sog-phone', SogPhone);
