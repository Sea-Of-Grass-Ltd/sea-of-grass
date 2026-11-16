/* Bunny World: smoke that parts (spec: notes/bunny-world/smoke-hero-spec.md, Tristan 2026-11-16).
   At rest the hero's background is dense smoke so thick it reads as the flat background colour: the canvas is fully
   transparent and the section's own background shows, so the flat-colour rule holds to the pixel. Press (or touch) and
   drag: the smoke parts along the path, pushed the way you dragged, and underneath are the five looks' accents (the
   colours the headline sweeps through) as flat bands, printed with a lattice of drawn carrots whose glints flash in turn.
   Then it drifts closed over two or three seconds and the loop stops.

   Built like the Sea of Grass home page's ink (preview/assets/ink.js): a small sheet on the GPU (here: how parted the
   smoke is, plus a push velocity) that each frame drifts on a slow curl current, fades back, and gets the pointer's path
   since the last frame stamped on as segments, so a fast stroke leaves no gaps. A second pass draws it at screen size.

   Mount: add data-smoke to the section (and load this file), or call BWSmoke.mount(section). The section keeps its
   layout: the canvas sits behind its content (absolute, z-index -1 inside an isolated stacking context), never takes the
   pointer, and on phones only sideways drags part it (touch-action: pan-y), so vertical swipes scroll the page.
   Off: reduced motion, no WebGL2 (the flat background is all you see). Pauses off screen and in hidden tabs. */
(() => {
  'use strict';
  const CSS = `.bw-smoke-host{position:relative;isolation:isolate;touch-action:pan-y pinch-zoom}
.bw-smoke{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:-1;pointer-events:none}`;
  const N = 24;                 // segments stamped per frame, at most
  const CLOSE = 0.4;            // how fast it drifts closed (1/s); see uDecay

  const VS = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const COMMON = `#version 300 es
precision highp float;in vec2 uv;out vec4 o;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .55*n1(p)+.3*n1(p*2.13+7.1)+.15*n1(p*4.37+3.3);}
`;
  // sheet: r = parted (0 = solid smoke .. >1 held open), gb = push velocity (screen heights / s), a unused
  const SIM = COMMON + `
uniform sampler2D uPrev;uniform vec2 uRes;uniform float uAsp,uTime,uDt,uEnc;
uniform vec4 uSeg[${N}];uniform vec4 uSD[${N}];uniform int uN;   // a->b (0..1 uv); radius (heights), push x,y, unused
// 8-bit fallback (no float targets): parted is stored halved, the push centred on .5
vec4 rd(vec2 s){vec4 t=texture(uPrev,s);t.r*=1.+uEnc;t.gb=mix(t.gb,t.gb*2.-1.,uEnc)*mix(1.,4.,uEnc);return t;}
void main(){
  vec2 q=uv*vec2(uAsp,1.),px=1./uRes;
  // the current: a slow curl, like smoke turning over itself
  float e=.04,T=uTime*.11;
  float a=fbm(q*2.4+vec2(0.,-T)),b=fbm(q*2.4+vec2(e,-T)),c=fbm(q*2.4+vec2(0.,e-T));
  vec2 curl=vec2(c-a,-(b-a))/e*.035;
  vec4 me=rd(uv);
  vec2 vel=me.gb+curl;
  vec2 s=uv-vel*uDt*vec2(1./uAsp,1.);
  vec4 t=rd(s);
  float nb=(rd(s+vec2(px.x,0.)).r+rd(s-vec2(px.x,0.)).r+rd(s+vec2(0.,px.y)).r+rd(s-vec2(0.,px.y)).r)*.25;
  float v=mix(t.r,nb,1.-pow(.98,uDt*60.));                         // soft edges, a little spread (per 60th of a second)
  float k=pow(.5,uDt*${CLOSE.toFixed(2)}*2.);                     // it closes in on itself...
  v=max(0.,v*k-uDt*.22);                                          // ...and the last thin gaps fill in
  vec2 w=t.gb*pow(.08,uDt);                                       // the push dies away in about a second
  vec2 P=vec2(uv.x*uAsp,uv.y);
  for(int i=0;i<${N};i++){if(i>=uN)break;vec4 g=uSeg[i];vec4 d=uSD[i];
    vec2 A=vec2(g.x*uAsp,g.y),B=vec2(g.z*uAsp,g.w),ab=B-A;
    float h=clamp(dot(P-A,ab)/max(dot(ab,ab),1e-8),0.,1.);
    float D=length(P-A-ab*h)/d.x;
    float f=exp(-D*D*2.2);
    v=max(v,f*2.);                                                 // parted, held open a moment
    w=mix(w,d.yz,f*.5);}                                            // the push follows the drag, never builds up
  w=clamp(w,-.4,.4);
  w=mix(w,(w*.25)*.5+.5,uEnc);
  o=vec4(v/(1.+uEnc),w,1.);}`;
  const SHOW = COMMON + `
uniform sampler2D uSim;uniform vec2 uRes;uniform float uTime,uDpr,uBand,uCell,uEnc;
uniform vec3 uAcc[5];uniform vec3 uInk,uLite;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
// uneven capsule: round end r1 at a, r2 at b
float cone(vec2 p,vec2 a,vec2 b,float r1,float r2){vec2 ba=b-a;float l=length(ba);vec2 d=ba/l;vec2 q=vec2(dot(p-a,vec2(d.y,-d.x)),dot(p-a,d));
  q.x=abs(q.x);float bb=(r1-r2)/l,aa=sqrt(1.-bb*bb),k=dot(q,vec2(-bb,aa));
  if(k<0.)return length(q)-r1;if(k>aa*l)return length(q-vec2(0.,l))-r2;return dot(q,vec2(aa,bb))-r1;}
// a carrot, about 56px tall, top of the body at the origin, tip pointing down (y up)
float carrot(vec2 p){
  float body=cone(p,vec2(0.,-1.),vec2(0.,-36.),8.5,1.6);
  float notch=min(seg(p,vec2(-9.,-12.),vec2(-2.5,-13.)),seg(p,vec2(9.,-21.),vec2(3.,-22.)));
  body=max(body,-(notch-1.3));                                    // two drawn ridges cut into the root
  float l=min(min(seg(p,vec2(0.,3.),vec2(-7.5,17.)),seg(p,vec2(0.,3.),vec2(0.,21.))),seg(p,vec2(0.,3.),vec2(7.5,17.)))-2.4;
  return min(body,l);}
// a four-point glint (astroid), radius r
float glint(vec2 p,float r){vec2 a=abs(p)/max(r,1e-3);return (pow(a.x,.6667)+pow(a.y,.6667)-1.)*r*.5;}
void main(){
  vec4 sm=texture(uSim,uv);float c=sm.r*(1.+uEnc);sm.gb=mix(sm.gb,(sm.gb*2.-1.)*4.,uEnc);
  vec2 pc=gl_FragCoord.xy/uDpr;                                   // css px, y up
  // smoke: the parted amount, roughened by turbulence so the edge breaks into wisps
  float tb=fbm(pc/46.+vec2(uTime*.07,-uTime*.05))*.65+fbm(pc/13.+vec2(-uTime*.11,uTime*.09))*.35;
  float x=c+(tb-.5)*.55;
  float clear=smoothstep(.42,.78,x);
  if(clear<=0.){o=vec4(0.);return;}
  // under the smoke: flat bands of the five accents, on a diagonal, drifting
  float u=(pc.x*.82+pc.y*.57)/uBand+uTime*.06;
  float fu=fract(u),i0=mod(floor(u),5.);
  vec3 col=uAcc[0];
  for(int i=1;i<5;i++)if(i0==float(i))col=uAcc[i];
  vec3 nx=uAcc[0];float i1=mod(i0+1.,5.);for(int i=1;i<5;i++)if(i1==float(i))nx=uAcc[i];
  float aa=fwidth(u)*1.2;col=mix(col,nx,smoothstep(1.-aa,1.,fu));
  // carrots on a staggered lattice, tilted alternately, each glint flashing on its own beat
  vec2 g=pc/uCell;g.x+=mod(floor(g.y),2.)*.5;
  vec2 id=floor(g),f=(fract(g)-.5)*uCell;
  float side=mod(id.x+id.y,2.)*2.-1.,ang=side*.6;
  mat2 R=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 cp=R*(f-vec2(0.,8.))/1.25;
  float cd=carrot(cp)*1.25;
  float px1=1./uDpr+.35;
  col=mix(col,uInk,1.-smoothstep(-px1,px1,cd));
  float ph=h1(id*1.7+3.1)*6.2832;
  float beat=pow(max(0.,sin(uTime*1.9+ph)),14.);                  // a brief flash, then dark for a while
  vec2 gp=f-R*vec2(side*19.,24.);
  float gd=glint(gp,3.+11.*beat);
  float gin=1.-smoothstep(-px1,px1,gd),gout=1.-smoothstep(-px1,px1,gd-1.4);
  col=mix(col,uInk,gout*step(.02,beat));
  col=mix(col,uLite,gin*step(.02,beat));
  o=vec4(col*clear,clear);}`;

  function parseColor(s, fb) {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); if (p.length < 4 || p[3] > 0) return p.slice(0, 3).map(v => v / 255); }
    const h = String(s).trim().match(/^#([0-9a-f]{6})$/i);
    if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16) / 255);
    return fb;
  }

  function mount(host, opts = {}) {
    if (!host || host.__bwSmoke) return host && host.__bwSmoke;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    if (still.matches) return null;
    if (!document.getElementById('bw-smoke-css')) { const st = document.createElement('style'); st.id = 'bw-smoke-css'; st.textContent = CSS; document.head.appendChild(st); }
    const cv = document.createElement('canvas'); cv.className = 'bw-smoke'; cv.setAttribute('aria-hidden', 'true');
    const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const half = opts.float !== false && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));   // else 8-bit sheets
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const program = fs => {
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
      return { p, u };
    };
    let SIMP, SHOWP;
    try { SIMP = program(SIM); SHOWP = program(SHOW); } catch (e) { console.warn('bw-smoke', e); return null; }
    host.classList.add('bw-smoke-host');
    host.insertBefore(cv, host.firstChild);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ---- sizes: the sheet is small (about 200 cells across), the screen pass capped at 1.5x
    let W = 0, H = 0, SW = 0, SH = 0, dpr = 1, sheets = [], cur = 0;
    const sheet = (w, h) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, half ? 0 : .5, half ? 0 : .5, 1); gl.clear(gl.COLOR_BUFFER_BIT); return { t, f };
    };
    function resize() {
      const r = host.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w === W && h === H && sheets.length) return;
      W = Math.max(1, w); H = Math.max(1, h); dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const k = Math.min(.3, 220 / Math.max(W, H)); SW = Math.max(8, Math.round(W * k)); SH = Math.max(8, Math.round(H * k));
      for (const s of sheets) { gl.deleteTexture(s.t); gl.deleteFramebuffer(s.f); } sheets = [sheet(SW, SH), sheet(SW, SH)];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      peak = 0;
    }

    // ---- colours: the five accents (the headline's sweep), the look's ink, the light of the smoke itself
    let ACC = new Float32Array(15), INK = [0.09, 0.1, 0.11], LITE = [1, 1, 1];
    function colours() {
      const cs = getComputedStyle(document.documentElement);
      const acc = opts.accents || ['clean', 'bold', 'warm', 'sunny', 'disco'].map(k => cs.getPropertyValue('--acc-' + k).trim());
      const fb = [[.655, .447, .976], [1, .3, 0], [.82, .22, .12], [1, .91, .27], [1, .2, .525]];
      acc.forEach((c, i) => ACC.set(parseColor(c, fb[i]), i * 3));
      INK = parseColor(opts.ink || cs.getPropertyValue('--ink'), INK);
      LITE = parseColor(getComputedStyle(host).backgroundColor, [1, 1, 1]);
    }
    colours();
    new MutationObserver(() => { colours(); if (running) draw(true); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-look', 'class', 'style'] });

    // ---- pointer: segments since the last frame (press or touch, then drag)
    const segs = []; let ptr = null, down = false, last = 0, openUntil = 0, peak = 0;   // peak: the most parted any cell can be (nothing in the sim can raise it)
    const toUV = e => { const r = host.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, e.timeStamp]; };
    const ui = e => e.target.closest && e.target.closest('a,button,input,select,textarea,label,[role=button],[contenteditable]');
    function stamp(a, b) {
      const dt = Math.max(8, b[2] - a[2]) / 1000, rad = (opts.radius || 60) / H;
      const vx = (b[0] - a[0]) * (W / H) / dt, vy = (b[1] - a[1]) / dt, sp = Math.hypot(vx, vy), cap = Math.min(1, .5 / Math.max(sp, 1e-6));
      segs.push([a[0], a[1], b[0], b[1], rad * (1 + Math.min(.6, sp * .25)), vx * cap * .6, vy * cap * .6, 0]);
      if (segs.length > N) segs.shift();
      peak = 2; last = performance.now(); openUntil = performance.now() + 8000; wake();
    }
    host.addEventListener('pointerdown', e => {
      if (e.button > 0 || ui(e)) return;
      if (e.pointerType === 'mouse') e.preventDefault();   // a drag parts the smoke, it doesn't select the copy
      down = true; ptr = toUV(e); stamp(ptr, [ptr[0], ptr[1], ptr[2] + 16]); stats.parts++;
    });
    host.addEventListener('pointermove', e => {
      if (!down) return; const p = toUV(e);
      if (ptr && Math.hypot((p[0] - ptr[0]) * W, (p[1] - ptr[1]) * H) < 2) return;
      if (ptr) stamp(ptr, p); ptr = p;
    }, { passive: true });
    const up = () => { down = false; ptr = null; };
    addEventListener('pointerup', up, { passive: true }); addEventListener('pointercancel', up, { passive: true });   // a scroll takes the touch: stop parting

    // ---- the loop: runs only while something is open, the section is on screen and the tab is visible
    const T0 = performance.now(); let running = false, visible = false, prev = 0;
    const stats = { frames: 0, parts: 0, get running() { return running; }, get sheet() { return [SW, SH]; }, get dpr() { return dpr; }, get peak() { return peak; } };
    const sg = new Float32Array(N * 4), sd = new Float32Array(N * 4);
    function draw(showOnly) {
      const now = performance.now(), t = (now - T0) / 1000, dt = Math.min(1 / 20, Math.max(1 / 240, (now - (prev || now - 16)) / 1000)); prev = now;
      gl.disable(gl.BLEND);
      if (!showOnly) {
        gl.useProgram(SIMP.p); gl.bindFramebuffer(gl.FRAMEBUFFER, sheets[1 - cur].f); gl.viewport(0, 0, SW, SH);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sheets[cur].t); gl.uniform1i(SIMP.u.uPrev, 0);
        gl.uniform2f(SIMP.u.uRes, SW, SH); gl.uniform1f(SIMP.u.uAsp, W / H); gl.uniform1f(SIMP.u.uTime, t); gl.uniform1f(SIMP.u.uDt, dt); gl.uniform1f(SIMP.u.uEnc, half ? 0 : 1);
        sg.fill(0); sd.fill(0); segs.forEach((s, i) => { sg.set(s.slice(0, 4), i * 4); sd.set(s.slice(4, 8), i * 4); });
        gl.uniform4fv(SIMP.u['uSeg[0]'], sg); gl.uniform4fv(SIMP.u['uSD[0]'], sd); gl.uniform1i(SIMP.u.uN, segs.length); segs.length = 0;
        gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
      }
      gl.useProgram(SHOWP.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sheets[cur].t); gl.uniform1i(SHOWP.u.uSim, 0);
      gl.uniform2f(SHOWP.u.uRes, cv.width, cv.height); gl.uniform1f(SHOWP.u.uTime, t); gl.uniform1f(SHOWP.u.uDpr, dpr); gl.uniform1f(SHOWP.u.uEnc, half ? 0 : 1);
      gl.uniform1f(SHOWP.u.uBand, opts.band || 120); gl.uniform1f(SHOWP.u.uCell, opts.cell || 132);
      gl.uniform3fv(SHOWP.u['uAcc[0]'], ACC); gl.uniform3fv(SHOWP.u.uInk, INK); gl.uniform3fv(SHOWP.u.uLite, LITE);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      return dt;
    }
    function frame(now) {
      if (!visible || document.hidden) { running = false; prev = 0; return; }
      if (down && ptr && now - last > 120) { stamp(ptr, [ptr[0], ptr[1], ptr[2] + 120]); ptr = [ptr[0], ptr[1], ptr[2] + 120]; }   // holding still keeps it open
      const dt = draw(false); stats.frames++;
      peak = Math.max(0, peak * Math.pow(.5, dt * CLOSE * 2) - dt * .22);
      if (down || (peak > .12 && now < openUntil)) requestAnimationFrame(frame);   // below .12 nothing shows (see SHOW)
      else {   // closed over: back to exactly the section's own background, and rest
        running = false; prev = 0;
        for (const s of sheets) { gl.bindFramebuffer(gl.FRAMEBUFFER, s.f); gl.clearColor(0, half ? 0 : .5, half ? 0 : .5, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    function wake() { if (!running && visible && !document.hidden) { running = true; prev = 0; last = performance.now(); requestAnimationFrame(frame); } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && peak > .12) wake(); });
    io.observe(host);
    const onVis = () => { if (!document.hidden && peak > .12) wake(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => resize()); ro.observe(host); resize();
    const onMotion = () => { if (still.matches) api.destroy(); };
    still.addEventListener && still.addEventListener('change', onMotion);
    const api = {
      canvas: cv, stats,
      destroy() { io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); visible = false; cv.remove(); host.classList.remove('bw-smoke-host'); delete host.__bwSmoke; },
    };
    host.__bwSmoke = api;
    return api;
  }

  window.BWSmoke = { mount };
  const auto = () => document.querySelectorAll('[data-smoke]').forEach(el => mount(el));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
