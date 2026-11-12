/* Clay's ground: the white field is soft clay. Press and it dents like a thumb in putty;
   drag and you plough a groove; hold and the dent sinks deeper. Clay pushed aside rises in a
   soft lip round the dent, and everything slowly eases back to a flat white sheet.
   A depth sheet on the GPU (0 flat .. 1 deep), stamped by the pointer, relaxed each frame;
   shown by lighting it from the upper left: warm shadow on the far walls, nothing at rest.
   Nothing on hover, nothing over the grass. Clay only; off under reduced motion. */
(function(){
const SEC=document.getElementById('opening'),base=document.getElementById('lf-cv');
if(!SEC||!base||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const cv=document.createElement('canvas');cv.className='lf-clay';cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
SEC.insertBefore(cv,base);
const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false});
if(!gl||!gl.getExtension('EXT_color_buffer_float')){cv.remove();return;}
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const COMMON=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
`;
const N=16;
const SIM=COMMON+`
uniform sampler2D uPrev;uniform vec2 uRes;uniform float uAsp;
uniform vec4 uSeg[${N}];uniform vec2 uSR[${N}];uniform int uN;   // segment a->b (0..1), radius (screen heights), depth
void main(){
  vec2 px=1./uRes;
  float c=texture(uPrev,uv).r;
  float nb=(texture(uPrev,uv+vec2(px.x,0.)).r+texture(uPrev,uv-vec2(px.x,0.)).r+texture(uPrev,uv+vec2(0.,px.y)).r+texture(uPrev,uv-vec2(0.,px.y)).r)*.25;
  float d=mix(c,nb,.12)*.9965;                                     // the clay slumps a touch and eases back to flat
  vec2 q=uv*vec2(uAsp,1.);
  for(int i=0;i<${N};i++){if(i>=uN)break;
    vec2 a=uSeg[i].xy*vec2(uAsp,1.),b=uSeg[i].zw*vec2(uAsp,1.),ab=b-a;
    float t=clamp(dot(q-a,ab)/max(dot(ab,ab),1e-8),0.,1.);
    float r=length(q-a-ab*t)/uSR[i].x;
    float prof=uSR[i].y*(1.-smoothstep(0.,1.,r*r));              // a rounded thumb tip, not a cone
    d=max(d,mix(d,prof,.35));                                     // pressing sinks it in over a few frames
  }
  o=vec4(min(d,1.),0.,0.,1.);
}`;
const SHOW=COMMON+`
uniform sampler2D uSim;uniform vec2 uWH;uniform float uDepth;
float dep(vec2 p){return texture(uSim,p).r;}
float z(vec2 p,vec2 e){                                           // surface height in px: the dent, plus a lip of displaced clay
  float d=dep(p);
  float w=(dep(p+vec2(e.x,0.)*7.)+dep(p-vec2(e.x,0.)*7.)+dep(p+vec2(0.,e.y)*7.)+dep(p-vec2(0.,e.y)*7.)
          +dep(p+e*5.)+dep(p-e*5.)+dep(p+vec2(e.x,-e.y)*5.)+dep(p+vec2(-e.x,e.y)*5.))*.125;
  float lip=max(0.,w-d)*1.1;
  float grain=(n1(p*uWH/3.)-.5)*.06*(d+lip);                       // the pressed surface picks up a little tooth
  return (-d+lip+grain)*uDepth;}
void main(){
  vec2 e=1./uWH;
  float d=dep(uv);
  vec2 g=vec2(z(uv+vec2(e.x,0.)*1.5,e)-z(uv-vec2(e.x,0.)*1.5,e),z(uv+vec2(0.,e.y)*1.5,e)-z(uv-vec2(0.,e.y)*1.5,e))/3.;
  vec3 n=normalize(vec3(-g,1.));
  vec3 L=normalize(vec3(-.55,.6,.6));                               // light from the upper left
  float sh=L.z-dot(n,L);                                           // >0 where the wall turns from the light
  float occ=smoothstep(.05,1.,d)*.07;                               // a faint warm hollow at the bottom of a deep press
  float a=clamp(max(0.,sh)*1.25+occ,0.,.55);
  vec3 col=vec3(.24,.094,.004);                                     // Clay's chocolate, thinned into a shadow
  o=vec4(col*a,a);
}`;
function program(fs){const p=gl.createProgram();
  for(const[t,s]of[[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh);}
  gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};for(let i=0,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i<n;i++){const nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm);}
  return{p,u};}
let SIMP,SHOWP;
try{SIMP=program(SIM);SHOWP=program(SHOW);}catch(e){console.warn('clay',e);cv.remove();return;}
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
const on=()=>document.documentElement.dataset.theme==='neu'&&!document.documentElement.hasAttribute('data-scheme');
let active=on();cv.style.display=active?'block':'none';
// ---- pointer
const segs=[];let ptr=null,down=false,downAt=0,lastAct=-1e9,running=false,visible=true;
const toUV=e=>{const r=SEC.getBoundingClientRect();return[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/H];};
const ui=e=>e.target.closest&&e.target.closest('button,a,input,.fys,.fys-tab');
const NL=32,LINE=new Float32Array(NL).fill(-9);
const inGrass=e=>{const r=SEC.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,f=Math.min(NL-1,Math.max(0,x*(NL-1))),k=Math.floor(f),L=LINE[k]+(LINE[Math.min(NL-1,k+1)]-LINE[k])*(f-k);return L>-1&&(e.clientY-r.top)>(1-L)*H-6;};
function push(a,b,rad,str){segs.push([a[0],a[1],b[0],b[1],rad,str]);if(segs.length>N)segs.shift();lastAct=performance.now();wake();}
SEC.addEventListener('pointermove',e=>{if(!active)return;const p=toUV(e);if(down&&ptr&&!inGrass(e))push(ptr,p,26/H,.75);ptr=p;});
SEC.addEventListener('pointerdown',e=>{if(!active||ui(e)||inGrass(e))return;const p=toUV(e);ptr=p;down=true;downAt=performance.now();push(p,p,30/H,.6);});
addEventListener('pointerup',()=>{down=false;});addEventListener('pointercancel',()=>{down=false;ptr=null;});
SEC.addEventListener('pointerleave',()=>{ptr=null;down=false;});
// ---- the loop
let fr=0;
function frame(now){
  if(!active||!visible){running=false;return;}
  if(!(fr++%8)){const o=window.sogOpening,g=o&&o.grassLine?o.grassLine(NL):null;for(let i=0;i<NL;i++)LINE[i]=g&&g[i]<1e8?1-g[i]/H:-9;}
  if(down&&ptr){const held=Math.min(1,(now-downAt)/1400);push(ptr,ptr,(30+14*held)/H,.6+.4*held);}   // hold and the thumb sinks deeper
  gl.disable(gl.BLEND);gl.useProgram(SIMP.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,sheets[1-cur].f);gl.viewport(0,0,SW,SH);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sheets[cur].t);gl.uniform1i(SIMP.u.uPrev,0);
  gl.uniform2f(SIMP.u.uRes,SW,SH);gl.uniform1f(SIMP.u.uAsp,W/H);
  const sg=new Float32Array(N*4),sr=new Float32Array(N*2);segs.forEach((s,i)=>{sg.set(s.slice(0,4),i*4);sr.set(s.slice(4),i*2);});
  gl.uniform4fv(SIMP.u['uSeg[0]'],sg);gl.uniform2fv(SIMP.u['uSR[0]'],sr);gl.uniform1i(SIMP.u.uN,segs.length);segs.length=0;
  gl.drawArrays(gl.TRIANGLES,0,3);cur=1-cur;
  gl.useProgram(SHOWP.p);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);
  gl.bindTexture(gl.TEXTURE_2D,sheets[cur].t);gl.uniform1i(SHOWP.u.uSim,0);
  gl.uniform2f(SHOWP.u.uWH,W,H);gl.uniform1f(SHOWP.u.uDepth,16.);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
  if(now-lastAct<16000)requestAnimationFrame(frame);else running=false;}   // flat again by then; rest
function wake(){if(!running&&active&&visible){running=true;requestAnimationFrame(frame);}}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&performance.now()-lastAct<12000)wake();}).observe(SEC);
document.addEventListener('sog-theme',()=>requestAnimationFrame(()=>{active=on();cv.style.display=active?'block':'none';if(active)wake();}));
addEventListener('resize',resize);resize();
})();
