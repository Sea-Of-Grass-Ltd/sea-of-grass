// <sog-phone>: the rotary phone from "One less call asking what's left", a big live 3D phone to play with.
// 2026-11-20, Tristan: "Rather than framing it out, I feel like this area should just be a big phone that you can
// play with." It stands free on the section's ground: drag to turn it, drag a finger hole to dial (it runs back),
// and lift the handset (click, drag it up, or tap) to light the section's questions one by one with their answers.
// It rings now and then as an invitation until it's picked up. The still picture inside the element is the
// fallback and sets the box: reduced motion, low-power devices, no WebGL or a failed load keep the picture.
// Model: phone.glb (Blender, tools/rotary-phone/), actions handset_lift, dial (1 s linear 0..1) and ring.
// data-lines: selector for the question rows that light up. Test hooks: data-state (still | loading | live | failed),
// data-lift, data-dial, data-yaw, el.pointOf('handset' | 'dial' | 'dial-hole' | 'empty'), el.staging().
const HERE = new URL('.', import.meta.url).href;
const css = `
sog-phone{display:block;position:relative}
sog-phone picture{display:block}
sog-phone canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .5s ease;touch-action:pan-y;cursor:grab;-webkit-tap-highlight-color:transparent}
sog-phone.shown canvas{opacity:1}
sog-phone[data-state=live] picture{visibility:hidden}
`;

// the phone is the warm white pop on the section's navy (PALETTE.md, approved 2026-11-19)
const COL = { phone: 0xf1e8d8 };

// the camera looks down `pitch` degrees at the phone and frames `fit` metres across the shorter side of the box
const STAGE = { phoneYaw: 0.42, lookX: -0.028, lookY: 0.072, pitch: 22, fit: 0.375, drop: 0.09 };

function lowPower() {
  const c = navigator.connection;
  return !!(c && c.saveData) || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory && navigator.deviceMemory < 2);
}

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

class SogPhone extends HTMLElement {
  connectedCallback() {
    if (!document.getElementById('sog-phone-css')) {
      const s = document.createElement('style'); s.id = 'sog-phone-css'; s.textContent = css; document.head.append(s);
    }
    Object.assign(this.dataset, { state: this.dataset.state || 'still', lift: '0', dial: '0' });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || lowPower()) return;   // the picture stays
    this._io = new IntersectionObserver(es => {
      for (const e of es) {
        this._visible = e.isIntersecting;
        if (e.isIntersecting && this.dataset.state === 'still') this.boot();
      }
    }, { rootMargin: '200px 0px' });
    this._io.observe(this);
  }
  disconnectedCallback() { this._io?.disconnect(); this._ro?.disconnect(); cancelAnimationFrame(this._raf); this._renderer?.dispose(); }

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

    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environmentIntensity = 0.5;

    // night light: cool sky fill, a warm key from the front left, a soft cool rim behind
    scene.add(new T.HemisphereLight(0x6a7398, 0x1f1f35, 1.0));
    const key = new T.DirectionalLight(0xfff0da, 2.5);                  // warm, so the phone pops off the cool ground
    key.position.set(-0.5, 1.2, 0.8);
    scene.add(key);
    const rim = new T.DirectionalLight(0x9aa89a, 0.9); rim.position.set(0.5, 0.6, -0.9); scene.add(rim);

    // the phone
    const phone = gltf.scene;
    phone.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      if (/cream/.test(o.material?.name || '')) o.material.color.set(COL.phone);   // warm white on the page
    });
    const pivot = new T.Group();
    pivot.rotation.y = STAGE.phoneYaw;                              // turned to show the cord side
    pivot.add(phone); scene.add(pivot);
    // a soft shadow under the base, so it stands rather than floats
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
    const look = new T.Vector3(STAGE.lookX, STAGE.lookY, 0);
    const frame = () => {
      const w = this.clientWidth, h = this.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const p = T.MathUtils.degToRad(STAGE.pitch), half = Math.tan(T.MathUtils.degToRad(camera.fov) / 2);
      const dist = STAGE.fit / (2 * half * Math.min(1, camera.aspect));   // fills the box's shorter side
      camera.position.set(look.x, look.y + Math.sin(p) * dist, look.z + Math.cos(p) * dist);
      camera.lookAt(look);
      camera.setViewOffset(w, h, 0, -h * STAGE.drop, w, h);
      camera.updateProjectionMatrix();
    };
    this._ro = new ResizeObserver(frame); this._ro.observe(this); frame();

    // dial geometry from the model's extras (Blender Z-up -> glTF Y-up)
    const v3 = a => a ? new T.Vector3(a[0], a[2], -a[1]) : null;
    const W = v => v && (pivot.updateMatrixWorld(true), pivot.localToWorld(v.clone()));
    const Wd = v => v && v.clone().transformDirection((pivot.updateMatrixWorld(true), pivot.matrixWorld));
    const dialCm = v3(meta.dial_center), dialNm = v3(meta.dial_normal), dialXm = v3(meta.dial_x), handsetCm = v3(meta.handset_center);
    const dialMax = meta.dial_max_deg || 312, holeR = meta.hole_ring || 0.0335, hole0 = T.MathUtils.degToRad(meta.hole0_deg ?? 290);
    const handsetBone = phone.getObjectByName('handset');   // follows the lift
    const dialC = () => W(dialCm), dialX = () => Wd(dialXm), dialY = () => new T.Vector3().crossVectors(Wd(dialNm), Wd(dialXm));
    const handsetAt = () => {                                   // the grip's centre, wherever the lift has taken it
      if (!handsetBone || !handsetCm) return W(handsetCm);
      const restBone = handsetBone.userData.restLocal || (handsetBone.userData.restLocal = pivot.worldToLocal(handsetBone.getWorldPosition(new T.Vector3())));
      return handsetBone.getWorldPosition(new T.Vector3()).add(W(handsetCm).sub(W(restBone)));
    };
    phone.updateMatrixWorld(true); handsetAt();                 // remember the bone at rest
    const toScreen = p => {
      const v = p.clone().project(camera), r = canvas.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    };
    const allMeshes = []; phone.traverse(o => o.isMesh && allMeshes.push(o));
    this.pointOf = name => {
      if (this.dataset.state !== 'live' && this.dataset.state !== 'loading') return null;
      if (name === 'handset' && handsetCm) return toScreen(handsetAt());
      if (name === 'dial' && dialCm) return toScreen(dialC());
      if (name === 'dial-hole' && dialCm) return toScreen(dialC().addScaledVector(dialX(), holeR * Math.cos(hole0)).addScaledVector(dialY(), holeR * Math.sin(hole0)));
      if (name === 'empty') {                                   // a spot in the box with no phone under it
        const r = canvas.getBoundingClientRect();
        for (const [fx, fy] of [[0.5, 0.1], [0.12, 0.2], [0.88, 0.2], [0.5, 0.9], [0.1, 0.85], [0.9, 0.85]]) {
          const e = { clientX: r.left + fx * r.width, clientY: r.top + fy * r.height };
          if (!hit(e, allMeshes) && !overDial(e)) return { x: e.clientX, y: e.clientY };
        }
      }
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
      let scenery = 0; scene.traverse(o => { if (o.isMesh) { let q = o; while (q && q !== pivot) q = q.parent; if (!q) scenery++; } });
      return { phone: box, scenery };
    };

    // ---- interaction
    let lift = 0, liftTarget = 0, dial = 0, dragging = false, dragAngle = 0, yaw = 0, yawVel = 0, turning = null, grip = null;
    let lifted = false, everLifted = false, ringsLeft = 3, ringTimer = 0;
    const rows = this.dataset.lines ? [...document.querySelectorAll(this.dataset.lines)].slice(0, 3) : [];
    const rowTimers = [];
    // picking up the phone lights the questions one by one with their answers; hanging up dims them again
    const setLift = on => {
      if (on === lifted) return;
      lifted = on; liftTarget = on ? 1 : 0;
      rowTimers.splice(0).forEach(clearTimeout);
      if (on) {
        everLifted = true; clearTimeout(ringTimer);
        if (act.ring?.isRunning()) { act.ring.stop(); act.handset_lift?.setEffectiveWeight(1); }
        rows.forEach((r, i) => rowTimers.push(setTimeout(() => r.classList.add('lit'), 350 + i * 600)));
      } else rows.forEach(r => r.classList.remove('lit'));
    };
    const hit = (e, list) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(list, false).length > 0;
    };
    const overDial = e => {
      if (!dialCm) return false;
      const c = toScreen(dialC()), e2 = toScreen(dialC().addScaledVector(dialX(), 0.048));
      return Math.hypot(e.clientX - c.x, e.clientY - c.y) < Math.hypot(e2.x - c.x, e2.y - c.y) * 1.05;
    };
    const angleAt = e => { const c = toScreen(dialC()); return Math.atan2(e.clientY - c.y, e.clientX - c.x); };
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && overDial(t)) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('pointerdown', e => {
      if (overDial(e)) {                                        // a finger in a hole: dial
        dragging = true; dragAngle = angleAt(e); canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); return;
      }
      if (hit(e, handsetMeshes)) { grip = { x: e.clientX, y: e.clientY, moved: false }; return; }   // the handset: tap, click or drag it up
      turning = { x: e.clientX, t: performance.now() }; yawVel = 0;   // anywhere else: turn it
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (dragging) {
        const a = angleAt(e);
        let d = a - dragAngle; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        dragAngle = a;
        dial = Math.min(1, Math.max(0, dial + T.MathUtils.radToDeg(d) / dialMax));   // clockwise on screen winds it
        return;
      }
      if (grip) {
        if (Math.hypot(e.clientX - grip.x, e.clientY - grip.y) > 8) grip.moved = true;
        if (grip.y - e.clientY > 14) setLift(true);
        if (e.clientY - grip.y > 14) setLift(false);
        return;
      }
      if (turning) {
        const now = performance.now(), dx = e.clientX - turning.x;
        const d = dx * 0.009; yaw += d; yawVel = d / Math.max(0.008, (now - turning.t) / 1000);
        turning.x = e.clientX; turning.t = now;
        return;
      }
      if (e.pointerType === 'mouse') canvas.style.cursor = hit(e, handsetMeshes) ? 'pointer' : 'grab';
    });
    const release = e => {
      if (grip && !grip.moved && e.type === 'pointerup') setLift(!lifted);
      dragging = false; grip = null;
      if (turning) { turning = null; canvas.style.cursor = 'grab'; }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', e => { turning = null; yawVel = 0; dragging = false; grip = null; });

    // ---- loop
    const clock = new T.Clock();
    let first = true;
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (!this._visible || document.hidden) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      lift += (liftTarget - lift) * Math.min(1, dt * 7);
      if (Math.abs(liftTarget - lift) < 0.002) lift = liftTarget;
      if (!dragging && dial > 0) dial = Math.max(0, dial - dt * (420 / dialMax));   // runs back at a steady speed, like a real dial
      if (act.handset_lift) act.handset_lift.time = lift * act.handset_lift.getClip().duration * 0.999;
      if (act.dial) act.dial.time = dial * act.dial.getClip().duration * 0.999;
      if (!turning && Math.abs(yawVel) > 0.01) { yaw += yawVel * dt; yawVel *= Math.pow(0.04, dt); }   // a little spin after letting go
      pivot.rotation.y = STAGE.phoneYaw + yaw;
      mixer.update(dt);
      renderer.render(scene, camera);
      this.dataset.lift = lift.toFixed(3); this.dataset.dial = dial.toFixed(3); this.dataset.yaw = yaw.toFixed(3);
      if (first) {
        first = false;
        this.classList.add('shown');
        setTimeout(() => { this.dataset.state = 'live'; rows[0]?.parentElement.classList.add('playing'); ringTimer = setTimeout(ring, 1400); }, 520);
      }
    };

    // ---- it rings now and then until someone picks it up
    mixer.addEventListener('finished', e => { if (e.action === act.ring) act.handset_lift?.setEffectiveWeight(1); });
    const ring = () => {
      if (everLifted || !act.ring || ringsLeft <= 0) return;
      if (this._visible && !dragging && !turning && !grip) {
        ringsLeft--;
        act.handset_lift?.setEffectiveWeight(0);                // the ring moves the handset itself
        act.ring.reset().play();
      }
      ringTimer = setTimeout(ring, 7000);
    };
    tick();
  }
}

if (!customElements.get('sog-phone')) customElements.define('sog-phone', SogPhone);
