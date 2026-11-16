/* Bunny World: smoke that parts (spec: notes/bunny-world/smoke-hero-spec.md, Tristan 2026-11-16).
   At rest the hero's background is dense smoke so thick it reads as the flat background colour: the canvas is fully
   transparent and the section's own background shows, so the flat-colour rule holds to the pixel. Press (or touch) and
   drag: the smoke parts along the path, pushed the way you dragged, and underneath is the headline's sweep as one
   flowing gradient. Little carrots pop up in the wake behind the pointer, coast and settle. Each part of the gap closes
   on its own clock, 1.4-2s after it was parted, so the gap closes behind the pointer in order and swallows the oldest
   carrot first. Then the loop stops.

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
  // closing: smoke flows back into the gap from its edges (FILL, screen heights / s, uneven so it comes in tongues) and a
  // slow fade; each cell remembers when it was parted and closes CLOSE seconds later (the span is per cell, from noise)
  const FILL = 0.08, FADE = 0.25, CLOSE = [1.4, 2.0], AGE = 4, SETTLE = 3.4;   // SETTLE: by then every cell has closed

  const VS = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const COMMON = `#version 300 es
precision highp float;in vec2 uv;out vec4 o;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .55*n1(p)+.3*n1(p*2.13+7.1)+.15*n1(p*4.37+3.3);}
`;
  // sheet: r = parted (0 = solid smoke .. 2 just parted), gb = push velocity (screen heights / s),
  // a = seconds since it was last parted, over AGE (1 = long ago; untouched smoke starts there)
  const SIM = COMMON + `
uniform sampler2D uPrev;uniform vec2 uRes;uniform float uAsp,uTime,uDt,uEnc;
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
  float age=me.a*${AGE}.;                                             // seconds since this cell was parted
  float due=${CLOSE[0].toFixed(1)}+${(CLOSE[1] - CLOSE[0]).toFixed(1)}*n1(q*7.+3.1);              // its own closing time, uneven across the gap
  float shut=smoothstep(due,due+.35,age);
  float pour=.25+.75*shut;                                           // a gentle inflow while fresh, the full pour once due
  vec2 fill=gr/(length(gr)+.6)*${FILL.toFixed(3)}*tongue*pour;
  vec2 vel=me.gb+curl+fill;
  vec2 s=uv-vel*uDt*vec2(1./uAsp,1.);
  vec4 t=rd(s);
  float v=t.r;
  float ag=t.a*${AGE}.+uDt;                                          // its clock, carried along with the smoke
  v=max(0.,v*pow(.5,uDt*${FADE.toFixed(2)})-uDt*(.04+3.2*shut));
  vec2 w=t.gb*pow(.08,uDt);                                       // the push dies away in about a second
  vec2 P=vec2(uv.x*uAsp,uv.y);
  for(int i=0;i<${N};i++){if(i>=uN)break;vec4 g=uSeg[i];vec4 d=uSD[i];
    vec2 A=vec2(g.x*uAsp,g.y),B=vec2(g.z*uAsp,g.w),ab=B-A;
    float h=clamp(dot(P-A,ab)/max(dot(ab,ab),1e-8),0.,1.);
    float D=length(P-A-ab*h)/d.x;
    float f=exp(-D*D*2.);
    v=max(v,f*2.);                                                 // parted
    ag*=1.-smoothstep(0.,.02,f);                                       // ...just now: its clock restarts
    w=mix(w,d.yz,f*.5);}                                            // the push follows the drag, never builds up
  w=clamp(w,-.4,.4);
  w=mix(w,(w*.25)*.5+.5,uEnc);
  o=vec4(v/(1.+uEnc),w,min(1.,ag/${AGE}.+(h1(gl_FragCoord.xy+fract(uTime)*91.)-.5)/255.*uEnc));}`;   // (8-bit: dithered, so small ticks add up)
  const NK = 12;                // carrots alive at once (six to a drag)
  const SHOW = COMMON + `
uniform sampler2D uSim,uMask;uniform vec2 uRes;uniform float uTime,uDpr,uEnc,uStep,uFlow;
uniform vec3 uAcc[5];uniform vec3 uInk,uLite,uRootC,uLeafC;
uniform vec4 uK[${NK}];uniform vec4 uKb[${NK}];uniform int uNK;  // a carrot: x,y (css px, y up), angle, scale; length (px), glint (0..1 while it sweeps), rim
// the carrot, in units of its length, tip at (0,-.5), fronds up to y .55: a tapered root and three fronds
float cap(vec2 p,float r1,float r2,float h){p.x=abs(p.x);float b=(r1-r2)/h,a=sqrt(1.-b*b),k=dot(p,vec2(-b,a));
  if(k<0.)return length(p)-r1;if(k>a*h)return length(p-vec2(0.,h))-r2;return dot(p,vec2(a,b))-r1;}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
// x = carrot, y = its ink rim, z = on a frond, w = the glint
vec4 carrots(vec2 pc,float px1){
  vec4 cv=vec4(0.);
  for(int k=0;k<${NK};k++){if(k>=uNK)break;vec4 K=uK[k],B=uKb[k];
    float L=B.x*K.w;if(L<.5)continue;vec2 d=pc-K.xy;if(dot(d,d)>L*L*.5)continue;
    float c=cos(K.z),s=sin(K.z);vec2 q=mat2(c,-s,s,c)*d/L;               // into the carrot's own frame
    float root=cap(q-vec2(0.,-.5),.035,.15,.62);
    vec2 f0=vec2(0.,.13);
    float fr=min(seg(q,f0,vec2(-.14,.47)),min(seg(q,f0,vec2(0.,.53)),seg(q,f0,vec2(.14,.47))))-.045;
    float dd=min(root,fr)*L;                                             // px
    float core=1.-smoothstep(-px1,px1,dd),rim=B.z*(1.-smoothstep(-px1,px1,dd-1.));
    float gl=0.;if(B.y>0.&&B.y<1.){float u=q.y+q.x*.7,cc=mix(-.75,.75,B.y);gl=1.-smoothstep(.03,.11,abs(u-cc));}
    if(core>cv.x||rim>cv.y)cv=vec4(max(cv.x,core),max(cv.y,rim),fr<root?1.:0.,gl);}
  return cv;}
void main(){
  vec4 sm=texture(uSim,uv);float c=sm.r*(1.+uEnc);sm.gb=mix(sm.gb,(sm.gb*2.-1.)*4.,uEnc);
  float m=smoothstep(.02,.55,texture(uMask,uv).r);c*=1.-m;      // the mask arrives blurred (see mask()), so the smoke thickens toward the copy
  vec2 pc=gl_FragCoord.xy/uDpr;                                   // css px, y up
  float T=uTime,px1=.6/uDpr+.5;
  vec4 sp=uNK>0?carrots(pc,px1):vec4(0.);
  // the smoke: billows at two sizes, carried along by the push, so the gap's edge curls rather than cuts
  vec2 sw=sm.gb*40.;
  float bill=fbm((pc+sw)/90.+vec2(T*.05,-T*.035))*.6+fbm((pc-sw*.5)/30.+vec2(-T*.09,T*.07))*.4;
  float x=c+(bill-.5)*.9;
  float open=smoothstep(.3,1.15,x);
  float r=1.-abs(fbm((pc+sw*1.5)/70.+vec2(T*.11,T*.04))*2.-1.);r=pow(r,3.);
  float edge=smoothstep(.15,.5,x)*(1.-smoothstep(.75,1.4,x));
  float dens=max(1.-open,r*edge*.5);
  if(dens>=.999){o=vec4(0.);return;}                               // closed smoke: nothing, carrots included
  // under the smoke: the headline's sweep as one continuous gradient, the five accents in the same order
  // (Clean, Bold, Warm, Sunny, Disco), flowing left to right as the sweep does, gently wavering
  float hh=T*uFlow-pc.x/uStep+(fbm(vec2(pc.y/320.,T*.05))-.5)*.8;
  hh=mod(hh,5.);int i0=int(floor(hh));int i1=i0==4?0:i0+1;
  vec3 col=mix(uAcc[i0],uAcc[i1],fract(hh));
  col=mix(uLite,col,.3+.7*smoothstep(.0,1.,open));               // paler where the smoke still hangs in the light
  float a=1.-dens;
  vec3 pre=col*a;
  vec3 tint=mix(mix(uRootC,uLeafC,sp.z),vec3(1.),sp.w*.85);       // an orange root, green fronds, one white glint sweeping across
  pre=mix(pre,uInk*a,sp.y);                                      // the carrots live in the gap: where smoke drifts back over them,
  pre=mix(pre,tint*a,sp.x);                                       // it cuts them off like everything else under it
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
      masked = 0;
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
      // whole boxes only for things that paint their own fill or are pictures (a filled button, an icon, a photo). A big see-through
      // button, like a price cell, gives only its words: boxing it would cut the smoke along its edges in a flat panel.
      host.querySelectorAll('a,button,input,select,textarea,img,svg,video,[role=button]').forEach(e => {
        if (e.closest('.sr') || e.closest('svg') !== e && e.closest('svg')) return;
        const bg = (getComputedStyle(e).backgroundColor.match(/[\d.]+/g) || []).map(Number);
        const solid = /^(img|svg|video|input|select|textarea)$/i.test(e.tagName) || bg.length === 3 || bg[3] > 0;
        if (solid) box(e.getBoundingClientRect()); });
      // three box blurs each way (about a 40px gaussian), done here once rather than in every pixel of every frame: the smoke
      // thickens back to white over a long soft falloff around the words, so no edge of it ever reads as a shape
      const id = mctx.getImageData(0, 0, w, h), d = id.data, a = new Float32Array(w * h), b = new Float32Array(w * h), K = 3;
      for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] / 255;
      const pass = (src, dst, dx, dy, n, len) => { for (let o = 0; o < n; o++) for (let i = 0; i < len; i++) { let sum = 0, cnt = 0; for (let k = -K; k <= K; k++) { const j = i + k; if (j < 0 || j >= len) continue; sum += src[dx ? o * w + j : j * w + o]; cnt++; } dst[dx ? o * w + i : i * w + o] = sum / cnt; } };
      for (let r = 0; r < 3; r++) { pass(a, b, 1, 0, h, w); pass(b, a, 0, 1, w, h); }
      for (let i = 0; i < w * h; i++) { const v = Math.round(a[i] * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }   // opaque, so the upload is not un-premultiplied
      mctx.putImageData(id, 0, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mk); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.activeTexture(gl.TEXTURE0); masked = performance.now();
    }

    // ---- pointer: segments since the last frame (press or touch, then drag)
    const segs = []; let ptr = null, down = false, last = 0, touched = -1e9;
    const toUV = e => { const r = host.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, e.timeStamp]; };
    const ui = e => e.target.closest && e.target.closest('a,button,input,select,textarea,label,[role=button],[contenteditable]');
    const maskAt = (x, y) => { if (!mk.width) return 0; try { return mctx.getImageData(Math.floor(x / MS), Math.floor(y / MS), 1, 1).data[0] / 255; } catch (e) { return 0; } };

    // ---- the carrot wake: about one carrot per 110px of drag (six at most), 45px behind the pointer, alternating either side
    // of the path, tip pointing back along it. Each pops in (0 -> 1.12 -> 1), coasts on a little of the drag's speed, settles,
    // and catches one white glint. No fade of its own: the gap closes over it, oldest first, like everything else under there.
    const cars = []; let path = [], since = 0, gap = 110, made = 0, side = 1, vel = [0, 0];
    const SIZES = [18, 23, 20, 16, 24, 21], RIM = 20, BEHIND = 45, MAXD = 6, now_s = () => (performance.now() - T0) / 1000;
    const fits = (x, y, len) => { const R = len * .6 + 20;   // the carrot, plus the room it coasts in, clear of the copy and the edges
      for (let k = 0; k < 9; k++) { const a = k * Math.PI / 4, r = k === 8 ? 0 : R, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (px < 8 || px > W - 8 || py < 8 || py > H - 8 || maskAt(px, py) > .2) return false; }
      return true; };
    const rnd = () => Math.random();
    function addCar(x, y, tipAng, len, v0) {   // x, y css px (y down); tipAng: the way the tip points, on screen (y down)
      const sp = Math.hypot(v0[0], v0[1]), K = .12, coast = sp * K, c = Math.min(20, Math.max(10, coast)) / Math.max(coast, 1e-6);
      cars.push({ x, y, vx: v0[0] * c, vy: v0[1] * c, ang: Math.atan2(Math.cos(tipAng), Math.sin(tipAng)), spin: (rnd() < .5 ? -1 : 1) * (6 + 6 * rnd()) * Math.PI / 180, born: now_s(), len });
      while (cars.length > NK) cars.shift(); wake();
    }
    const at = (c, t) => {   // where a carrot is now: coasting to a stop over about 0.6s, turning a few degrees as it goes
      const tau = t - c.born, K = .12, e = 1 - Math.exp(-tau / K), u = Math.min(1, tau / .22) - 1;
      const sc = tau < .22 ? Math.max(0, 1 + 2.9 * u * u * u + 1.9 * u * u) : 1;   // back-out: 0, up to about 1.12, back to 1
      return { x: c.x + c.vx * K * e, y: c.y + c.vy * K * e, ang: c.ang + c.spin * e, sc, glint: (tau - .22 - .15) / .25 };
    };
    function behind(dist) {   // the point dist px back along the path from its newest point, and the way the drag went there
      let d = 0;
      for (let i = path.length - 1; i > 0; i--) { const a = path[i - 1], b = path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d + l >= dist && l > 0) { const f = (dist - d) / l; return [b[0] + (a[0] - b[0]) * f, b[1] + (a[1] - b[1]) * f, (b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
        d += l; }
      return null;
    }
    function grow(seg) {   // the path grew by seg px
      since += seg;
      if (opts.sparkles === false || made >= MAXD || since < gap) return;
      const p = behind(BEHIND); if (!p) return;
      const len = SIZES[made % SIZES.length], off = 14 + 8 * rnd(), nx = -p[3] * side, ny = p[2] * side;
      const x = p[0] + nx * off, y = p[1] + ny * off;
      if (!fits(x, y, len)) { since = gap - 20; return; }   // not here (on the copy, or too near an edge): try again a little further on
      addCar(x, y, Math.atan2(-p[3], -p[2]) + (rnd() * 2 - 1) * 15 * Math.PI / 180, len, [vel[0] * .15, vel[1] * .15]);
      made++; side = -side; since = 0; gap = 110 * (.75 + .5 * rnd());
    }
    function stamp(a, b) {
      const dt = Math.max(8, b[2] - a[2]) / 1000, rad = (opts.radius || 60) / H;
      const vx = (b[0] - a[0]) * (W / H) / dt, vy = (b[1] - a[1]) / dt, sp = Math.hypot(vx, vy), cap = Math.min(1, .5 / Math.max(sp, 1e-6));
      segs.push([a[0], a[1], b[0], b[1], rad * (1 + Math.min(.6, sp * .25)), vx * cap * .6, vy * cap * .6, 0]);
      if (segs.length > N) segs.shift();
      last = touched = performance.now(); wake();
    }
    const startDrag = () => { path = []; since = 0; made = 0; side = rnd() < .5 ? 1 : -1; gap = 110 * (.75 + .5 * rnd()); vel = [0, 0]; };
    host.addEventListener('pointerdown', e => {
      if (e.button > 0 || ui(e)) return;
      if (e.pointerType === 'mouse') e.preventDefault();   // a drag parts the smoke, it doesn't select the copy
      down = true; ptr = toUV(e); startDrag(); path = [[ptr[0] * W, (1 - ptr[1]) * H]]; stamp(ptr, [ptr[0], ptr[1], ptr[2] + 16]); stats.parts++;
    });
    host.addEventListener('pointermove', e => {
      if (!down) return; const p = toUV(e);
      if (ptr && Math.hypot((p[0] - ptr[0]) * W, (p[1] - ptr[1]) * H) < 2) return;
      if (ptr) { stamp(ptr, p); const dt = Math.max(8, p[2] - ptr[2]) / 1000, v = [(p[0] - ptr[0]) * W / dt, -(p[1] - ptr[1]) * H / dt]; vel = [vel[0] * .5 + v[0] * .5, vel[1] * .5 + v[1] * .5]; }
      ptr = p; const q = [p[0] * W, (1 - p[1]) * H], l = path[path.length - 1]; path.push(q); if (path.length > 400) path.splice(0, 200);
      if (l) grow(Math.hypot(q[0] - l[0], q[1] - l[1]));
    }, { passive: true });
    const up = () => { down = false; ptr = null; path = []; };
    addEventListener('pointerup', up, { passive: true });
    addEventListener('pointercancel', () => { down = false; ptr = null; path = []; }, { passive: true });   // a scroll took the touch: stop parting

    // ---- the loop: runs only while something is open, the section is on screen and the tab is visible
    const T0 = performance.now(); let running = false, visible = false, prev = 0;
    const open = () => down || performance.now() - touched < SETTLE * 1000 || cars.length > 0;
    const stats = { frames: 0, parts: 0, get running() { return running; }, get sheet() { return [SW, SH]; }, get dpr() { return dpr; }, get made() { return made; },
      get cars() { const t = now_s(); return cars.map(c => { const p = at(c, t); return { x: p.x, y: p.y, len: c.len, age: t - c.born }; }); } };
    const sg = new Float32Array(N * 4), sd = new Float32Array(N * 4), KA = new Float32Array(NK * 4), KB = new Float32Array(NK * 4);
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
      if (!masked || now - masked > 1000) mask();   // copy can reflow (fonts, the headline loop): refresh it each second while open
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex); gl.uniform1i(SHOWP.u.uMask, 1); gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(SHOWP.u.uStep, opts.step || 170); gl.uniform1f(SHOWP.u.uFlow, opts.flow || .3);   // one accent every 170px, drifting right at about 50px/s
      gl.uniform3fv(SHOWP.u['uAcc[0]'], ACC); gl.uniform3fv(SHOWP.u.uInk, INK); gl.uniform3fv(SHOWP.u.uLite, LITE); gl.uniform3fv(SHOWP.u.uRootC, ROOTC); gl.uniform3fv(SHOWP.u.uLeafC, LEAFC);
      while (cars.length && t - cars[0].born > SETTLE) cars.shift();   // long since swallowed by the smoke
      KA.fill(0); KB.fill(0);
      cars.forEach((c, i) => { const p = at(c, t); KA.set([p.x, H - p.y, p.ang, p.sc], i * 4); KB.set([c.len, p.glint, c.len >= RIM ? 1 : 0, 0], i * 4); });
      gl.uniform4fv(SHOWP.u['uK[0]'], KA); gl.uniform4fv(SHOWP.u['uKb[0]'], KB); gl.uniform1i(SHOWP.u.uNK, cars.length);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(now) {
      if (!visible || document.hidden) { running = false; prev = 0; return; }
      if (down && ptr && now - last > 120) { stamp(ptr, [ptr[0], ptr[1], ptr[2] + 120]); ptr = [ptr[0], ptr[1], ptr[2] + 120]; }   // holding still keeps it open
      draw(false); stats.frames++;
      if (open()) requestAnimationFrame(frame);
      else {   // closed over: back to exactly the section's own background, and rest
        running = false; prev = 0; cars.length = 0;
        for (const s of sheets) { gl.bindFramebuffer(gl.FRAMEBUFFER, s.f); gl.clearColor(0, half ? 0 : .5, half ? 0 : .5, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    function wake() { if (!running && visible && !document.hidden) { running = true; prev = 0; last = performance.now(); requestAnimationFrame(frame); } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && open()) wake(); });
    io.observe(host);
    const onVis = () => { if (!document.hidden && open()) wake(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => resize()); ro.observe(host); resize();
    const onMotion = () => { if (still.matches) api.destroy(); };
    still.addEventListener && still.addEventListener('change', onMotion);
    const api = {
      canvas: cv, stats,
      _maskAt: (x, y) => maskAt(x, y),   // tests: how thick the copy keeps the smoke at (x, y) css px
      _sparkAt(x, y, ang = 0) { addCar(x, y, ang, 24, [0, 0]); },   // tests: a carrot at (x, y) css px in the hero, wherever the smoke is
      destroy() { io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); visible = false; cv.remove(); host.classList.remove('bw-smoke-host'); delete host.__bwSmoke; },
    };
    host.__bwSmoke = api;
    return api;
  }

  window.BWSmoke = { mount };
  const auto = () => document.querySelectorAll('[data-smoke]').forEach(el => mount(el));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
