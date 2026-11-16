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
  // closing: smoke flows back into the gap from its edges (FILL, screen heights / s, uneven so it comes in tongues);
  // a slow fade underneath, and SWEEP seconds after the last touch a quicker one so the last threads always clear
  const FILL = 0.08, FADE = 0.25, SWEEP = [1.6, 3.2];

  const VS = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const COMMON = `#version 300 es
precision highp float;in vec2 uv;out vec4 o;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .55*n1(p)+.3*n1(p*2.13+7.1)+.15*n1(p*4.37+3.3);}
`;
  // sheet: r = parted (0 = solid smoke .. 2 just parted), gb = push velocity (screen heights / s), a unused
  const SIM = COMMON + `
uniform sampler2D uPrev;uniform vec2 uRes;uniform float uAsp,uTime,uDt,uEnc,uAge;
uniform vec4 uSeg[${N}];uniform vec4 uSD[${N}];uniform int uN;   // a->b (0..1 uv); radius (heights), push x,y, unused
// 8-bit fallback (no float targets): parted is stored halved, the push centred on .5
vec4 rd(vec2 s){vec4 t=texture(uPrev,s);t.r*=1.+uEnc;t.gb=mix(t.gb,t.gb*2.-1.,uEnc)*mix(1.,4.,uEnc);return t;}
void main(){
  vec2 q=uv*vec2(uAsp,1.),px=1./uRes;
  // the current: a slow curl, the smoke turning over itself
  float e=.03,T=uTime*.13;
  float a=fbm(q*3.+vec2(0.,-T)),b=fbm(q*3.+vec2(e,-T)),c=fbm(q*3.+vec2(0.,e-T));
  vec2 curl=vec2(c-a,-(b-a))/e*.06;
  vec4 me=rd(uv);
  // the refill: smoke pours into the gap from its edges, faster in some places than others, so it comes back in tongues
  float gx=rd(uv+vec2(px.x,0.)).r-rd(uv-vec2(px.x,0.)).r,gy=rd(uv+vec2(0.,px.y)).r-rd(uv-vec2(0.,px.y)).r;
  vec2 gr=vec2(gx/(2.*px.x*uAsp),gy/(2.*px.y));
  float tongue=.3+1.5*smoothstep(.25,.8,fbm(q*5.+vec2(uTime*.4,-uTime*.25)));
  float pour=.25+.75*smoothstep(.4,1.3,uAge);                        // a gentle inflow while dragging, the full pour once let go
  vec2 fill=gr/(length(gr)+.6)*${FILL.toFixed(3)}*tongue*pour;
  vec2 vel=me.gb+curl+fill;
  vec2 s=uv-vel*uDt*vec2(1./uAsp,1.);
  vec4 t=rd(s);
  float v=t.r;
  v=max(0.,v*pow(.5,uDt*${FADE.toFixed(2)})-uDt*(.04+1.6*smoothstep(${SWEEP[0].toFixed(1)},${SWEEP[1].toFixed(1)},uAge)));
  vec2 w=t.gb*pow(.08,uDt);                                       // the push dies away in about a second
  vec2 P=vec2(uv.x*uAsp,uv.y);
  for(int i=0;i<${N};i++){if(i>=uN)break;vec4 g=uSeg[i];vec4 d=uSD[i];
    vec2 A=vec2(g.x*uAsp,g.y),B=vec2(g.z*uAsp,g.w),ab=B-A;
    float h=clamp(dot(P-A,ab)/max(dot(ab,ab),1e-8),0.,1.);
    float D=length(P-A-ab*h)/d.x;
    float f=exp(-D*D*2.);
    v=max(v,f*2.);                                                 // parted
    w=mix(w,d.yz,f*.5);}                                            // the push follows the drag, never builds up
  w=clamp(w,-.4,.4);
  w=mix(w,(w*.25)*.5+.5,uEnc);
  o=vec4(v/(1.+uEnc),w,1.);}`;
  const NG = 28, NC = 2;        // glints per sparkle carrot; sparkle carrots alive at once
  const SHOW = COMMON + `
uniform sampler2D uSim,uMask;uniform vec2 uRes;uniform float uTime,uDpr,uEnc,uStep,uFlow;
uniform vec3 uAcc[5];uniform vec3 uInk,uLite,uRootC,uLeafC;
uniform vec4 uG[${NG}];                                          // a glint: target x,y (carrot units, y up), delay (s), size (+10 on the leaves)
uniform vec4 uCar[${NC}];uniform int uNC;                         // a sparkle carrot: x,y (css px, y up), born (s), scale
// a four-point glint (astroid), radius r
float glint(vec2 p,float r){vec2 a=abs(p)/max(r,1e-3);return (pow(a.x,.6667)+pow(a.y,.6667)-1.)*r*.5;}
// the sparkles that gather into a carrot, twinkle, and go out: x = core, y = ink rim, z = on a leaf, w = white-hot centre
vec4 sparkles(vec2 pc,float px1){
  vec4 cv=vec4(0.);
  for(int k=0;k<${NC};k++){if(k>=uNC)break;vec4 C=uCar[k];
    vec2 d=pc-C.xy;if(dot(d,d)>pow(140.*C.w,2.))continue;
    float age=uTime-C.z;
    for(int i=0;i<${NG};i++){vec4 G=uG[i];
      float t=age-G.z;if(t<0.||t>2.)continue;
      float hs=h1(vec2(float(i),float(k)*7.3+C.z));
      float g=clamp(t/.5,0.,1.);g=1.-pow(1.-g,3.);                  // gathering in, easing to a stop
      float ang=hs*6.2832;vec2 from=G.xy+vec2(cos(ang),sin(ang))*(26.+34.*fract(hs*13.));
      vec2 at=mix(from,G.xy,g)*C.w;
      float gone=1.-smoothstep(1.15+hs*.35,1.5+hs*.4,t);              // going out, each on its own beat
      float tw=.72+.38*sin(t*15.+hs*40.);                            // twinkling
      float leaf=step(5.,G.w),sz=G.w-leaf*10.;
      float r=(1.6+2.6*sz)*C.w*smoothstep(0.,.25,t)*gone*mix(1.,tw,smoothstep(.35,.6,t));
      if(r<.3)continue;
      vec2 q=d-at;float gd=glint(q,r);
      float core=1.-smoothstep(-px1,px1,gd),rim=1.-smoothstep(-px1,px1,gd-1.);
      if(rim>cv.y||core>cv.x)cv=vec4(max(cv.x,core),max(cv.y,rim),leaf,1.-smoothstep(r*.12,r*.32,length(q)));}}
  return cv;}
void main(){
  vec4 sm=texture(uSim,uv);float c=sm.r*(1.+uEnc);sm.gb=mix(sm.gb,(sm.gb*2.-1.)*4.,uEnc);
  float m=smoothstep(.0,.6,texture(uMask,uv).r);c*=1.-m;      // the mask arrives blurred (see mask()), so the smoke thickens toward the copy
  vec2 pc=gl_FragCoord.xy/uDpr;                                   // css px, y up
  float T=uTime,px1=.6/uDpr+.5;
  vec4 sp=uNC>0?sparkles(pc,px1):vec4(0.);
  // the smoke: billows at two sizes, carried along by the push, so the gap's edge curls rather than cuts
  vec2 sw=sm.gb*40.;
  float bill=fbm((pc+sw)/90.+vec2(T*.05,-T*.035))*.6+fbm((pc-sw*.5)/30.+vec2(-T*.09,T*.07))*.4;
  float x=c+(bill-.5)*.9;
  float open=smoothstep(.3,1.15,x);
  float r=1.-abs(fbm((pc+sw*1.5)/70.+vec2(T*.11,T*.04))*2.-1.);r=pow(r,3.);
  float edge=smoothstep(.15,.5,x)*(1.-smoothstep(.75,1.4,x));
  float dens=max(1.-open,r*edge*.5);
  float spa=max(sp.x,sp.y);
  if(dens>=.999&&spa<=0.){o=vec4(0.);return;}
  // under the smoke: the headline's sweep as one continuous gradient, the five accents in the same order
  // (Clean, Bold, Warm, Sunny, Disco), flowing left to right as the sweep does, gently wavering
  float hh=T*uFlow-pc.x/uStep+(fbm(vec2(pc.y/320.,T*.05))-.5)*.8;
  hh=mod(hh,5.);int i0=int(floor(hh));int i1=i0==4?0:i0+1;
  vec3 col=mix(uAcc[i0],uAcc[i1],fract(hh));
  col=mix(uLite,col,.3+.7*smoothstep(.0,1.,open));               // paler where the smoke still hangs in the light
  float a=1.-dens;
  vec3 pre=col*a;
  vec3 tint=mix(mix(uRootC,uLeafC,sp.z),vec3(1.),sp.w*.85);       // orange glints on the root, green on the leaves, white-hot centres
  pre=mix(pre,uInk,sp.y);a=max(a,sp.y);                           // the sparkles sit on top, with a fine ink rim
  pre=mix(pre,tint,sp.x);
  o=vec4(pre,a);}`;


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
      peak = 0; masked = 0;
    }

    // ---- colours: the five accents (the headline's sweep), the look's ink, the light of the smoke itself
    let ACC = new Float32Array(15), INK = [0.09, 0.1, 0.11], LITE = [1, 1, 1], ROOTC = [1, .45, .1], LEAFC = [.18, .62, .39];
    function colours() {
      const cs = getComputedStyle(document.documentElement);
      const acc = opts.accents || ['clean', 'bold', 'warm', 'sunny', 'disco'].map(k => cs.getPropertyValue('--acc-' + k).trim());
      const fb = [[.655, .447, .976], [1, .3, 0], [.82, .22, .12], [1, .91, .27], [1, .2, .525]];
      acc.forEach((c, i) => ACC.set(parseColor(c, fb[i]), i * 3));
      INK = parseColor(opts.ink || cs.getPropertyValue('--ink'), INK);
      LITE = parseColor(getComputedStyle(host).backgroundColor, [1, 1, 1]);
      ROOTC = parseColor(cs.getPropertyValue('--acc-bold'), ROOTC); LEAFC = parseColor(cs.getPropertyValue('--clover'), LEAFC);   // carrot orange, the look's green
    }
    colours();
    new MutationObserver(() => { colours(); masked = 0; if (running) draw(true); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-look', 'class', 'style'] });

    // ---- the content mask: where the hero's copy, buttons and prices sit, the smoke never opens (soft-edged, a little padded)
    const mk = document.createElement('canvas'), mctx = mk.getContext('2d'), MS = 6;   // one mask pixel per 6 css px
    const mtex = gl.createTexture(); let masked = 0;
    gl.bindTexture(gl.TEXTURE_2D, mtex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    function mask() {
      const hr = host.getBoundingClientRect(), w = Math.max(1, Math.ceil(W / MS)), h = Math.max(1, Math.ceil(H / MS)), pad = opts.pad ?? 16;
      mk.width = w; mk.height = h; mctx.clearRect(0, 0, w, h); mctx.fillStyle = '#fff'; 
      const box = r => { if (r.width && r.height) mctx.fillRect((r.left - hr.left - pad) / MS, (r.top - hr.top - pad) / MS, (r.width + pad * 2) / MS, (r.height + pad * 2) / MS); };
      const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('.sr,canvas') ? 1 : 2 });
      const rg = document.createRange();
      for (let n; (n = tw.nextNode());) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) box(r); }
      host.querySelectorAll('a,button,input,select,textarea,img,svg,video,[role=button]').forEach(e => { if (!e.closest('.sr')) box(e.getBoundingClientRect()); });
      // two box blurs each way (about a 24px gaussian), done here once rather than in every pixel of every frame
      const id = mctx.getImageData(0, 0, w, h), d = id.data, a = new Float32Array(w * h), b = new Float32Array(w * h), K = 2;
      for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] / 255;
      const pass = (src, dst, dx, dy, n, len) => { for (let o = 0; o < n; o++) for (let i = 0; i < len; i++) { let sum = 0, cnt = 0; for (let k = -K; k <= K; k++) { const j = i + k; if (j < 0 || j >= len) continue; sum += src[dx ? o * w + j : j * w + o]; cnt++; } dst[dx ? o * w + i : i * w + o] = sum / cnt; } };
      for (let r = 0; r < 2; r++) { pass(a, b, 1, 0, h, w); pass(b, a, 0, 1, w, h); }
      for (let i = 0; i < w * h; i++) { const v = Math.round(a[i] * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }   // opaque, so the upload is not un-premultiplied
      mctx.putImageData(id, 0, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mk); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.activeTexture(gl.TEXTURE0); masked = performance.now();
    }

    // ---- pointer: segments since the last frame (press or touch, then drag)
    const segs = []; let ptr = null, down = false, last = 0, touched = 0, openUntil = 0, peak = 0, sparkUntil = 0;   // peak: the most parted any cell can be (nothing in the sim can raise it)
    const toUV = e => { const r = host.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, e.timeStamp]; };
    const ui = e => e.target.closest && e.target.closest('a,button,input,select,textarea,label,[role=button],[contenteditable]');
    // ---- sparkle carrots: at the end of a drag (and midway along a long one), tiny glints gather into a carrot and go out
    const GL = new Float32Array(NG * 4), cars = [], cf = new Float32Array(NC * 4); let path = [];
    (() => {   // the carrot as glints (units ~ px at scale 1, y up): the root's two edges tapering to the tip, its top, a few inside, three leafy fronds
      const g = [], add = (x, y, sz, leaf) => g.push([x, y, 0, sz + (leaf ? 10 : 0)]);
      for (let k = 0; k < 7; k++) { const y = 20 - k * 12, w = 14 * (1 - k / 6.6); add(-w, y, k ? .8 : 1); add(w, y, k ? .8 : 1); }
      add(0, -64, 1.1); add(0, 21, .8); add(-3, 2, .55); add(3, -20, .55); add(0, -40, .5);
      for (const [x, y] of [[-17, 50], [0, 60], [17, 50]]) for (const t of [.33, .66, 1]) add(x * t, 22 + (y - 22) * t, t === 1 ? 1 : .7, true);
      g.forEach((v, i) => { const up = (20 - Math.min(20, v[1] < 22 ? v[1] : 22)) / 84; v[2] = .45 * (1 - up) * .6 + .3 * ((i * 0.618) % 1); GL.set(v, i * 4); });   // the leaves land first, then down the root
    })();
    const maskAt = (x, y) => { if (!mk.width) return 0; try { return mctx.getImageData(Math.floor(x / MS), Math.floor(y / MS), 1, 1).data[0] / 255; } catch (e) { return 0; } };
    function spawn() {
      if (path.length < 2) { path = []; return; }
      let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      const sc = Math.min(1.5, Math.max(1, Math.min(W, H) / 380)), t = (performance.now() - T0) / 1000;
      // a clear spot near the given point on the path: not behind the copy, far enough from the edges for the whole carrot
      const fits = (x, y) => { if (x < 40 * sc || x > W - 40 * sc || y < 70 * sc || y > H - 80 * sc) return false;   // the whole carrot clear of the copy and the edges
        for (let j = -2; j <= 2; j++) for (let i = -1; i <= 1; i++) if (maskAt(x + i * 24 * sc, y - j * 32 * sc) > .05) return false; return true; };
      const pick = from => { for (let i = from; i >= 0; i--) { const [x, y] = path[i]; if (fits(x, y)) return [x, H - y]; } return null; };
      const end = pick(path.length - 1);
      if (end) cars.push([end[0], end[1], t, sc]);
      if (len > 520) { const mid = pick(Math.floor(path.length / 2)); if (mid && (!end || Math.hypot(mid[0] - end[0], mid[1] - end[1]) > 240)) cars.push([mid[0], mid[1], t + .35, sc]); }
      while (cars.length > NC) cars.shift();
      path = []; if (cars.length) { sparkUntil = performance.now() + 2600; wake(); }
    }
    function stamp(a, b) {
      const dt = Math.max(8, b[2] - a[2]) / 1000, rad = (opts.radius || 60) / H;
      const vx = (b[0] - a[0]) * (W / H) / dt, vy = (b[1] - a[1]) / dt, sp = Math.hypot(vx, vy), cap = Math.min(1, .5 / Math.max(sp, 1e-6));
      segs.push([a[0], a[1], b[0], b[1], rad * (1 + Math.min(.6, sp * .25)), vx * cap * .6, vy * cap * .6, 0]);
      if (segs.length > N) segs.shift();
      peak = 2; last = touched = performance.now(); openUntil = performance.now() + 8000; wake();
    }
    host.addEventListener('pointerdown', e => {
      if (e.button > 0 || ui(e)) return;
      if (e.pointerType === 'mouse') e.preventDefault();   // a drag parts the smoke, it doesn't select the copy
      down = true; ptr = toUV(e); path = [[ptr[0] * W, (1 - ptr[1]) * H]]; stamp(ptr, [ptr[0], ptr[1], ptr[2] + 16]); stats.parts++;
    });
    host.addEventListener('pointermove', e => {
      if (!down) return; const p = toUV(e);
      if (ptr && Math.hypot((p[0] - ptr[0]) * W, (p[1] - ptr[1]) * H) < 2) return;
      if (ptr) stamp(ptr, p); ptr = p; path.push([p[0] * W, (1 - p[1]) * H]);
    }, { passive: true });
    const up = () => { if (down) spawn(); down = false; ptr = null; };
    addEventListener('pointerup', up, { passive: true });
    addEventListener('pointercancel', () => { down = false; ptr = null; path = []; }, { passive: true });   // a scroll took the touch: stop parting, no sparkles

    // ---- the loop: runs only while something is open, the section is on screen and the tab is visible
    const T0 = performance.now(); let running = false, visible = false, prev = 0;
    const stats = { frames: 0, parts: 0, get running() { return running; }, get sheet() { return [SW, SH]; }, get dpr() { return dpr; }, get peak() { return peak; }, get cars() { return cars.map(c => c.map(v => +v.toFixed(1))); } };
    const sg = new Float32Array(N * 4), sd = new Float32Array(N * 4);
    function draw(showOnly) {
      const now = performance.now(), t = (now - T0) / 1000, dt = Math.min(1 / 20, Math.max(1 / 240, (now - (prev || now - 16)) / 1000)); prev = now;
      gl.disable(gl.BLEND);
      if (!showOnly) {
        gl.useProgram(SIMP.p); gl.bindFramebuffer(gl.FRAMEBUFFER, sheets[1 - cur].f); gl.viewport(0, 0, SW, SH);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sheets[cur].t); gl.uniform1i(SIMP.u.uPrev, 0);
        gl.uniform2f(SIMP.u.uRes, SW, SH); gl.uniform1f(SIMP.u.uAsp, W / H); gl.uniform1f(SIMP.u.uTime, t); gl.uniform1f(SIMP.u.uDt, dt); gl.uniform1f(SIMP.u.uEnc, half ? 0 : 1); gl.uniform1f(SIMP.u.uAge, (now - touched) / 1000);
        sg.fill(0); sd.fill(0); segs.forEach((s, i) => { sg.set(s.slice(0, 4), i * 4); sd.set(s.slice(4, 8), i * 4); });
        gl.uniform4fv(SIMP.u['uSeg[0]'], sg); gl.uniform4fv(SIMP.u['uSD[0]'], sd); gl.uniform1i(SIMP.u.uN, segs.length); segs.length = 0;
        gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
      }
      gl.useProgram(SHOWP.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sheets[cur].t); gl.uniform1i(SHOWP.u.uSim, 0);
      gl.uniform2f(SHOWP.u.uRes, cv.width, cv.height); gl.uniform1f(SHOWP.u.uTime, t); gl.uniform1f(SHOWP.u.uDpr, dpr); gl.uniform1f(SHOWP.u.uEnc, half ? 0 : 1);
      if (!masked || now - masked > 1000) mask();   // copy can reflow (fonts, the headline loop): refresh it each second while open
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex); gl.uniform1i(SHOWP.u.uMask, 1); gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(SHOWP.u.uStep, opts.step || 170); gl.uniform1f(SHOWP.u.uFlow, opts.flow || .3);   // one accent every 170px, drifting right at about 50px/s
      gl.uniform3fv(SHOWP.u['uAcc[0]'], ACC); gl.uniform3fv(SHOWP.u.uInk, INK); gl.uniform3fv(SHOWP.u.uLite, LITE); gl.uniform3fv(SHOWP.u.uRootC, ROOTC); gl.uniform3fv(SHOWP.u.uLeafC, LEAFC);
      const tnow = (now - T0) / 1000; while (cars.length && tnow - cars[0][2] > 2.6) cars.shift();
      cf.fill(0); cars.forEach((k, i) => cf.set(k, i * 4));
      gl.uniform4fv(SHOWP.u['uG[0]'], GL); gl.uniform4fv(SHOWP.u['uCar[0]'], cf); gl.uniform1i(SHOWP.u.uNC, cars.length);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      return dt;
    }
    function frame(now) {
      if (!visible || document.hidden) { running = false; prev = 0; return; }
      if (down && ptr && now - last > 120) { stamp(ptr, [ptr[0], ptr[1], ptr[2] + 120]); ptr = [ptr[0], ptr[1], ptr[2] + 120]; }   // holding still keeps it open
      const dt = draw(false); stats.frames++;
      const age = (now - touched) / 1000, ss = Math.min(1, Math.max(0, (age - SWEEP[0]) / (SWEEP[1] - SWEEP[0]))), sw = ss * ss * (3 - 2 * ss);
      peak = Math.max(0, peak * Math.pow(.5, dt * FADE) - dt * (.04 + 1.6 * sw));   // the same fade as SIM; flowing smoke can only lower it
      if (down || (peak > .12 && now < openUntil) || performance.now() < sparkUntil) requestAnimationFrame(frame);   // below .12 nothing shows (see SHOW)
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
