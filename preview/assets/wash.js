/* Clay's ground: a live watercolour wash, after the sumi sky in the Make-Up study. One wash laid wet on warm paper,
   made of many soft blooms that run together: each a little darker where it landed, lobed at its edge, with fine
   streaks from its middle and a faint tide line where its water stopped. They keep blooming and fading, slowly, and
   the pointer pushes them about as it passes, so the ground is never quite the same. Pigment is a filter on the
   paper (thicker is darker and richer): on Beings' chocolate, dark on dark: sienna lifting where blooms gather, umber sinking at their rims.
   The headline's corner is left nearly bare paper. Clay only; one still frame under reduced motion. */
(function(){
const SEC=document.getElementById('opening'),base=document.getElementById('lf-cv');
if(!SEC||!base)return;
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.createElement('canvas');cv.className='lf-wash';cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none';
SEC.insertBefore(cv,SEC.firstChild);
const gl=cv.getContext('webgl2',{alpha:false,antialias:false,depth:false});
if(!gl){cv.remove();return;}
const VS=`#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS=`#version 300 es
precision highp float;out vec4 o;
uniform vec2 uRes,uPtr;uniform float uTime,uPtrOn,uBoil;
float ih(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;return float(v.x&0xffffu)/65535.;}   // an integer hash: grain with no diagonal artefacts
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n1(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
vec3 paper(vec2 fc){float f=n1(fc*vec2(.9,.11))*.5+n1(fc*vec2(.13,.8))*.5,t=n1(fc*.45),g=h1(floor(fc));
  return vec3(.478,.247,.118)*(.93+.07*f+.05*t+.03*g);}   // warm brown paper (#7A3F1E), with fibres and tooth
void main(){
  vec2 fc=gl_FragCoord.xy,uv=fc/uRes;float bs=uRes.y/1000.,asp=uRes.x/uRes.y;
  vec2 sq=fc/(300.*bs);float tt=uTime*.04;
  // the pointer pushes the wash away from it and turns it a little
  vec2 P=vec2(uv.x*asp,uv.y),push=vec2(0.);
  if(uPtrOn>.5){vec2 dh=P-uPtr;float r=.2;push=dh/r*exp(-dot(dh,dh)/(r*r))*1.6;}
  vec2 g0=sq+push*.45+vec2(-push.y,push.x)*.5*sin(uTime*.4);
  float bl=0.,tide=0.;vec3 tint=vec3(0.);float tw=0.;
  float el=smoothstep(.3,1.,uv.y),low=1.-smoothstep(.3,.55,uv.y);   // height in the sky: deep overhead, thinning to paper at the horizon, a warm glow just above it
  for(int sc=0;sc<2;sc++){
    vec2 g=g0*(sc==0?1.:1.8)+float(sc)*7.3,gi=floor(g);
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
      vec2 cell=gi+vec2(x,y);
      float h=h1(cell+float(sc)*19.),h2=h1(cell+3.3),h3=h1(cell+8.1),h4=h1(cell+12.7);
      float age=fract(uTime/(16.+14.*h2)+h);
      vec2 cen=cell+.5+(vec2(h1(cell+5.1),h1(cell+9.3))-.5)*.7+vec2(sin(tt*2.+h*6.3),cos(tt*1.7+h2*6.3))*.15;
      vec2 dv=g-cen;float dist=length(dv);vec2 dir=dv/max(dist,1e-4);
      float grow=1.-pow(1.-min(age*1.5,1.),3.);
      float R=(.45+.55*h3)*grow*(.82+.3*n1(dir*2.5+h*40.)+.05*(n1(dir*18.+h*9.)-.5));
      float body=1.-smoothstep(R*.55,R,dist);
      float streak=.88+.24*n1(dir*34.+h*13.)*smoothstep(0.,.6,dist/max(R,1e-3));
      float life=smoothstep(0.,.12,age)*(1.-smoothstep(.65,1.,age));
      float w=body*(.55+.45*(1.-dist/max(R,1e-3)))*streak*life*(.45+.55*h2);
      bl+=w;
      tide=max(tide,(smoothstep(R*.9,R*.96,dist)-smoothstep(R*.96,R*1.03,dist))*life);
      // each bloom carries its own pigment: apricot or peach above, sage, olive or ochre low
      vec3 blue=h4<.45?vec3(.62,.30,.12):(h4<.8?vec3(.30,.16,.10):vec3(.48,.22,.10)),warm=vec3(.78,.40,.16);   // dark on dark: burnt sienna, umber, a warmer glow low down   // cerulean, ultramarine, a grey-blue; apricot near the horizon
      tint+=mix(blue,warm,clamp(low*.9+(h4-.5)*.2,0.,1.))*w;tw+=w;}}
  vec3 pig=tw>1e-4?tint/tw:mix(vec3(.45,.22,.10),vec3(.78,.40,.16),low);
  // where the wash lies: a graded sky, deepest overhead, nothing at the horizon but a little warm light; lighter behind the headline
  vec2 tm=(uv-vec2(.3,.56))/vec2(.3,.18);float bare=exp(-dot(tm,tm));
  float lay=(pow(el,.6)*1.25+low*smoothstep(.16,.32,uv.y)*.6)*(1.-.35*bare);
  float DS=lay*(.38+.62*clamp(bl,0.,1.3))+tide*.14*lay;
  float gran=n1(fc*1.1)*.5+n1(fc*.3+7.)*.3+h1(floor(fc*.8))*.2;   // granulation in the paper's tooth
  DS*=.86+.28*gran;
  vec3 base=paper(fc),col=mix(base*pow(pig,vec3(DS*.9)),base+pig*.16,smoothstep(.5,1.2,bl)*lay*.6);   // sienna lifts where blooms gather, umber sinks at their rims
  // printed grain, as Make-Up's paper boils: re-seeded about ten times a second, laid over like an overlay, with a fine dot screen
  vec2 gq=floor(fc)+vec2(uBoil*37.,uBoil*91.);float gn=ih(uvec3(uvec2(gq),uint(uBoil)))*.7+n1(fc*.35+uBoil*3.1)*.3,ov=.5+(gn-.5)*.55;
  col=mix(col,mix(2.*col*ov,1.-2.*(1.-col)*(1.-ov),step(.5,ov)),.6);
  vec2 dsc=mod(fc,3.)-1.;col*=1.-.06*step(dot(dsc,dsc),.6);
  o=vec4(col,1.);}`;
function sh(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;}
let pr;try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));}catch(e){console.warn('wash',e);cv.remove();return;}
const U=n=>gl.getUniformLocation(pr,n),uRes=U('uRes'),uTime=U('uTime'),uBoil=U('uBoil'),uPtr=U('uPtr'),uPtrOn=U('uPtrOn');
const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
const on=()=>document.documentElement.dataset.theme==='neu'&&!document.documentElement.hasAttribute('data-scheme');
let W=0,H=0,act=false,vis=true,running=false,last=0,ptr=[0,0],pOn=0,pS=[0,0];const T0=performance.now()-60000*Math.random();
function size(){const r=SEC.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);W=Math.round(r.width*d);H=Math.round(r.height*d);cv.width=W;cv.height=H;}
function draw(now){gl.viewport(0,0,W,H);gl.useProgram(pr);gl.uniform2f(uRes,W,H);gl.uniform1f(uTime,(now-T0)/1000);gl.uniform1f(uBoil,Math.floor((now-T0)/100)%97);
  pS[0]+=(ptr[0]-pS[0])*.12;pS[1]+=(ptr[1]-pS[1])*.12;gl.uniform2f(uPtr,pS[0],pS[1]);gl.uniform1f(uPtrOn,pOn);gl.drawArrays(gl.TRIANGLES,0,3);}
function frame(now){if(!act||!vis){running=false;return;}requestAnimationFrame(frame);if(now-last<40)return;last=now;draw(now);}   // about 25 a second: watercolour moves slowly
function wake(){if(still){draw(performance.now());return;}if(!running&&act&&vis){running=true;requestAnimationFrame(frame);}}
function apply(){act=on();cv.style.display=act?'block':'none';if(act){size();wake();}}
SEC.addEventListener('pointermove',e=>{const r=SEC.getBoundingClientRect();ptr=[(e.clientX-r.left)/r.height,1-(e.clientY-r.top)/r.height];pOn=1;});
SEC.addEventListener('pointerleave',()=>{pOn=0;});
new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)wake();}).observe(SEC);
addEventListener('resize',()=>{if(act){size();wake();}});
['sog-theme','sog-scheme'].forEach(t=>document.addEventListener(t,()=>requestAnimationFrame(apply)));
apply();
})();
