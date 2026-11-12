/* Dew's ink: the dark ground of the opening is a sheet the pointer leaves ink in.
   Built the way the Afterglow study builds its trails: a sheet on the GPU holding how
   fresh the ink is at each point (1 just left, fading to 0). Each frame the sheet drifts
   on a slow curling current (smoke), its edge creeps outward (ripple), it fades, and the
   pointer's path since the last frame is stamped on again, so a fast stroke leaves no gaps.
   Shown as: a black core, a chain of beads at its edge, a bright grainy halo past that.
   Hover leaves a thin wisp; press, drag or hold to pour. Dew only; off under reduced motion. */
(function(){
const SEC=document.getElementById('opening'),base=document.getElementById('lf-cv');
if(!SEC||!base||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const cv=document.createElement('canvas');cv.className='lf-ink';cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
SEC.insertBefore(cv,base);
const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false});
if(!gl||!gl.getExtension('EXT_color_buffer_float')){cv.remove();return;}
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const COMMON=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
`;
const N=16;
const NL=32;
const SIM=COMMON+`
uniform sampler2D uPrev;uniform vec2 uRes;uniform float uAsp,uTime;
uniform vec4 uSeg[${N}];uniform vec2 uSR[${N}];uniform int uN;   // segment a->b in 0..1; radius (screen heights), strength (<0 stirs the mist)
uniform float uLine[${NL}];                                       // the grass's top edge across the width (0..1, up), 9 where there's none
float line(float x){float f=clamp(x,0.,1.)*${NL-1}.;int i=int(floor(f));int j=min(i+1,${NL-1});return mix(uLine[i],uLine[j],fract(f));}
void main(){
  vec2 q=uv*vec2(uAsp,1.);
  float L=line(uv.x),hy=uv.y-L;                                   // height above the grass, in screen heights
  float near=1.-smoothstep(.04,.26,hy);                           // close over the grass, the ink starts to settle
  float zone=1.-smoothstep(-.005,.025,hy);                         // at the blade tops it becomes mist
  // the current: a slow curl that lifts and turns the ink like smoke; over the grass it sinks and slides sideways
  float a=n1(q*3.2+vec2(0.,-uTime*.12))*12.566+n1(q*7.+vec2(uTime*.2,0.))*3.;
  vec2 smoke=vec2(cos(a)*.55,.35+sin(a)*.55);
  float side=(n1(vec2(q.x*1.3,uTime*.08))-.5)*2.4;
  vec2 fl=mix(smoke,vec2(side,-1.1),near)/uRes.y;
  vec2 s=uv-fl,px=1./uRes;
  float c=texture(uPrev,s).r;
  float nb=(texture(uPrev,s+vec2(px.x,0.)*1.6).r+texture(uPrev,s-vec2(px.x,0.)*1.6).r
           +texture(uPrev,s+vec2(0.,px.y)*1.6).r+texture(uPrev,s-vec2(0.,px.y)*1.6).r)*.25;
  float v=mix(c,max(c,nb),.9*(1.-zone));                          // the edge creeps outward (not once it's mist)
  v=v*mix(.992,.997,near)-.0009*(1.-near);   // ink settling over the grass holds on until it lands
  // the mist: drifts along the grass, spreads sideways, lingers, thins with depth into the blades
  vec2 ms=uv-vec2(side*.7,-.35*smoothstep(.01,.04,hy))/uRes.y;   // slides along; what's above sinks gently onto the tops
  float m=texture(uPrev,ms).g;
  float mb=(texture(uPrev,ms+vec2(px.x*3.,0.)).g+texture(uPrev,ms-vec2(px.x*3.,0.)).g+texture(uPrev,ms+vec2(px.x*6.,0.)).g+texture(uPrev,ms-vec2(px.x*6.,0.)).g)*.25;
  m=mix(m,mb,.5);                                                  // spreads sideways, not up
  m=min(1.,max(m,smoothstep(.02,.3,v)*zone*.9)+v*zone*.04);v*=1.-zone*.25;                              // ink reaching the tops turns to mist
  m=m*mix(.9988,.975,1.-smoothstep(-.14,-.04,hy))*mix(1.,.96,smoothstep(.03,.08,hy))-.00012;   // lingers on the tops; gone deep in the grass or high above              // lingers on top, gone deep in the grass
  vec2 P=vec2(uv.x*uAsp,uv.y);
  for(int i=0;i<${N};i++){if(i>=uN)break;vec4 b=uSeg[i];
    vec2 A=vec2(b.x*uAsp,b.y),B=vec2(b.z*uAsp,b.w),ab=B-A;
    float t=clamp(dot(P-A,ab)/max(dot(ab,ab),1e-8),0.,1.);
    float D=length(P-A-ab*t)-uSR[i].x;
    float k=1.-smoothstep(-1.5/uRes.y,1.5/uRes.y,D);
    if(uSR[i].y<0.)m*=1.-.35*(1.-smoothstep(-uSR[i].x,uSR[i].x*1.2,D+uSR[i].x));   // a hand through the grass parts the mist
    else v=max(v,k*uSR[i].y);}
  o=vec4(clamp(v,0.,1.),clamp(m,0.,1.),0.,1.);}`;
const SHOW=COMMON+`
uniform sampler2D uSim;uniform vec2 uRes;uniform float uTime,uCell,uFog;
vec2 vor(vec2 x){vec2 n=floor(x),f=fract(x);float a=8.,b=8.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),r=g+h2(n+g)-f;float d=dot(r,r);if(d<a){b=a;a=d;}else if(d<b)b=d;}
  return vec2(sqrt(a),sqrt(b));}
void main(){
  vec2 sm=texture(uSim,uv).rg;float v=sm.r,m=sm.g;
  float mf=0.;for(int k=-2;k<7;k++){float w=1.-abs(float(k)-1.5)/6.;mf+=texture(uSim,uv-vec2(0.,float(k)*uFog)).g*w;}mf/=5.;   // a soft band that rises off the tops
  if(v<.004&&max(m,mf)<.004){o=vec4(0.);return;}
  
  vec2 px=gl_FragCoord.xy;
  float g=h1(px+fract(uTime*7.)*137.);                       // film grain, new each frame
  vec2 vc=vor(px/uCell+vec2(0.,uTime*.15));float edge=vc.y-vc.x;
  float core=smoothstep(.56,.64,v);
  float band=smoothstep(.36,.44,v)*(1.-core);                // the bead chain
  float halo=smoothstep(.01,.2,v)*(1.-smoothstep(.3,.42,v)); // bright, grainy, fading out
  vec3 lite=vec3(.84,.91,1.),blue=vec3(.18,.49,.96);
  vec4 col=vec4(mix(blue,lite,smoothstep(.06,.3,v))*halo,halo)*(.35+.65*g);
  float inner=smoothstep(.05,.17,edge);
  col=mix(col,vec4(0.,0.,0.,.96),band*inner);
  col=mix(col,vec4(lite*.85,.85)*(.6+.4*g),band*(1.-inner)*.8);
  float streak=smoothstep(.44,.6,v)*(1.-core);               // dark streaks running from the beads into the core
  col=mix(col,vec4(0.,0.,0.,.9),streak*(.55+.45*inner));
  col=mix(col,vec4(vec3(.012,.016,.03)*(1.+g*.6),.97),core);
  float fog=smoothstep(.0,.3,max(m,mf))*.7*(.55+.45*g)*(1.-col.a);                 // the mist on the grass, soft and grainy
  col+=vec4(mix(blue,lite,.55)*fog,fog);
  col.rgb+=(h1(px)-.5)/255.;
  o=col;}`;
function program(fs){
  const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
  gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};for(let i=0,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i<n;i++){const nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm);}
  return{p,u};}
let SIMP,SHOWP;
try{SIMP=program(SIM);SHOWP=program(SHOW);}catch(e){console.warn('ink',e);cv.remove();return;}
const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
let W=0,H=0,SW=0,SH=0,sheets=[],cur=0,dpr=1;
function sheet(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RG16F,w,h,0,gl.RG,gl.HALF_FLOAT,null);
  for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return{t,f};}
function resize(){const r=SEC.getBoundingClientRect();if(Math.abs(r.width-W)<2&&W)return;
  W=r.width;H=Math.max(r.height,innerHeight*.6);dpr=Math.min(devicePixelRatio||1,2);
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const k=Math.min(.5,700/Math.max(W,H));SW=Math.max(2,Math.round(W*k));SH=Math.max(2,Math.round(H*k));
  for(const s of sheets){gl.deleteTexture(s.t);gl.deleteFramebuffer(s.f);}sheets=[sheet(SW,SH),sheet(SW,SH)];}
const on=()=>getComputedStyle(SEC).getPropertyValue('--lf-mark-fill').trim()==='glass';
let active=on();cv.style.display=active?'block':'none';
// ---- pointer: segments since the last frame
const segs=[];let inG=false,ptr=null,down=false,downAt=0,lastAct=-1e9,running=false,visible=true;
const toUV=e=>{const r=SEC.getBoundingClientRect();return[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/H];};
const ui=e=>e.target.closest&&e.target.closest('button,a,input,.fys,.fys-tab');
function push(a,b,rad,str){segs.push([a[0],a[1],b[0],b[1],rad,str]);if(segs.length>N)segs.shift();lastAct=performance.now();wake();}
// over the grass the pointer is busy pushing blades: no ink there
const inGrass=e=>{const o=window.sogOpening;if(!o||!o.grassNear)return false;const r=SEC.getBoundingClientRect();return o.grassNear(e.clientX-r.left,e.clientY-r.top,26)>5;};   // thick with blades, not a few flying ones
SEC.addEventListener('pointermove',e=>{if(!active)return;const p=toUV(e);if(inGrass(e)){if(ptr)push(ptr,p,30/H,-1);ptr=p;inG=true;return;}if(inG){inG=false;ptr=p;return;}
  if(ptr){const big=down;push(ptr,p,big?14/H:3.2/H,big?1:.42);}ptr=p;});
SEC.addEventListener('pointerdown',e=>{if(!active||ui(e))return;if(inGrass(e)){down=false;return;}const p=toUV(e);ptr=p;down=true;downAt=performance.now();push(p,p,24/H,1);});
addEventListener('pointerup',()=>{down=false;});addEventListener('pointercancel',()=>{down=false;ptr=null;});
SEC.addEventListener('pointerleave',()=>{ptr=null;down=false;});
// ---- the loop
const T0=performance.now(),LINE=new Float32Array(NL).fill(-9);let fr=0;
function frame(now){
  if(!active||!visible){running=false;return;}
  if(down&&ptr&&!inG){const held=Math.min(1,(now-downAt)/1500);push(ptr,ptr,(18+26*held)/H,1);}  // hold to pour a growing pool
  const t=(now-T0)/1000;
  gl.disable(gl.BLEND);gl.useProgram(SIMP.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,sheets[1-cur].f);gl.viewport(0,0,SW,SH);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sheets[cur].t);gl.uniform1i(SIMP.u.uPrev,0);
  gl.uniform2f(SIMP.u.uRes,SW,SH);gl.uniform1f(SIMP.u.uAsp,W/H);gl.uniform1f(SIMP.u.uTime,t);
  const sg=new Float32Array(N*4),sr=new Float32Array(N*2);segs.forEach((s,i)=>{sg.set(s.slice(0,4),i*4);sr.set(s.slice(4),i*2);});
  if(!(fr++%8)){const o=window.sogOpening,gl0=o&&o.grassLine?o.grassLine(NL):null;for(let i=0;i<NL;i++)LINE[i]=gl0&&gl0[i]<1e8?1-gl0[i]/H:-9;}gl.uniform1fv(SIMP.u['uLine[0]'],LINE);gl.uniform4fv(SIMP.u['uSeg[0]'],sg);gl.uniform2fv(SIMP.u['uSR[0]'],sr);gl.uniform1i(SIMP.u.uN,segs.length);segs.length=0;
  gl.drawArrays(gl.TRIANGLES,0,3);cur=1-cur;
  gl.useProgram(SHOWP.p);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);
  gl.bindTexture(gl.TEXTURE_2D,sheets[cur].t);gl.uniform1i(SHOWP.u.uSim,0);
  gl.uniform2f(SHOWP.u.uRes,cv.width,cv.height);gl.uniform1f(SHOWP.u.uTime,t);gl.uniform1f(SHOWP.u.uCell,8*dpr);gl.uniform1f(SHOWP.u.uFog,7/H);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
  if(now-lastAct<22000)requestAnimationFrame(frame);else running=false;}   // everything has faded by then; rest
function wake(){if(!running&&active&&visible){running=true;requestAnimationFrame(frame);}}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&performance.now()-lastAct<14000)wake();}).observe(SEC);
document.addEventListener('sog-theme',()=>requestAnimationFrame(()=>{active=on();cv.style.display=active?'block':'none';if(active)wake();}));
addEventListener('resize',resize);resize();
})();
