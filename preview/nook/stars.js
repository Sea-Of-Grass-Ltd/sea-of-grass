/* the painted night's stars (approved in Tristan's demo, 2026-11-19); the sky is the still painting behind them (the cursor
   liquify was taken out the same night: "Remove the liquify effect from this").
   stars: his six- and five-point stars as filled vectors where the painting's specks were. Still until a swipe hits one: it
   spins with the swipe, morphs toward the other shape while spinning, then slows and settles. Redrawn only while one moves. */
(function(){const SEC=document.getElementById('opening'),box=SEC&&SEC.querySelector('.lf-night');if(!box)return;
const on=()=>getComputedStyle(SEC).getPropertyValue('--lf-night').trim()==='1';if(!on())return;
const still=matchMedia('(prefers-reduced-motion: reduce)').matches,tall=()=>matchMedia('(max-aspect-ratio: 4/5)').matches;
const I={ready:false,sky:'image',stars:0,orange:0,starsMoving:false,still};
let scene=()=>parseFloat(SEC.style.getPropertyValue('--scene')||'1');
// ---------- stars ----------
const sc=box.querySelector('.lf-starc'),x=sc.getContext('2d');let D=null,S=[],scale=1,ox=0,oy=0,dpr=1,moving=false;
const NP=60;function starR(th,tips){for(let i=0;i<tips.length;i++){let[a,L]=tips[i],[a2,L2]=tips[(i+1)%tips.length];a*=Math.PI/180;let b=a2*Math.PI/180;if(b<=a)b+=2*Math.PI;let t=th;while(t<a)t+=2*Math.PI;while(t>=a+2*Math.PI)t-=2*Math.PI;
  if(t<=b){const u=(t-a)/(b-a),ri=.2;if(u<.5){const k=u/.5;return L+(ri-L)*(1-Math.pow(1-k,2.2));}const k=(1-u)/.5;return L2+(ri-L2)*(1-Math.pow(1-k,2.2));}}return .2;}
const six=[[-90,1],[-30,.6],[30,.6],[90,1],[150,.6],[210,.6]],five=[0,1,2,3,4].map(i=>[-90+72*i,.95]),R6=[],R5=[];   // his inked six-point (long top and bottom rays) and painted five-point
for(let i=0;i<NP;i++){const th=2*Math.PI*i/NP-Math.PI/2;R6.push(starR(th,six));R5.push(starR(th,five));}
const css=n=>getComputedStyle(SEC).getPropertyValue(n).trim();let CREAM='#F1E8D2',WARM='#E8913A';
function ssize(){if(!D)return;dpr=Math.min(devicePixelRatio||1,2);const w=sc.clientWidth,h=sc.clientHeight;sc.width=Math.round(w*dpr);sc.height=Math.round(h*dpr);scale=Math.max(w/D.vw,h/D.vh);ox=(w-D.vw*scale)/2;oy=(h-D.vh*scale)/2;CREAM=css('--lf-star')||CREAM;WARM=css('--lf-star-warm')||WARM;sdraw();}
function shape(s){const own=s.k===6?R6:R5,oth=s.k===6?R5:R6;x.beginPath();for(let i=0;i<NP;i++){const r=own[i]+(oth[i]-own[i])*s.m,th=2*Math.PI*i/NP-Math.PI/2+s.a,px=Math.cos(th)*r,py=Math.sin(th)*r;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();}
function sdraw(){x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,sc.width,sc.height);let n=0,o=0;for(const s of S){const X=(ox+s.x*scale)*dpr,Y=(oy+s.y*scale)*dpr,z=s.sc*scale*dpr;x.setTransform(z,0,0,z,X,Y);x.fillStyle=s.o?WARM:CREAM;shape(s);x.fill();n++;if(s.o)o++;}I.stars=n;I.orange=o;}
let tl=0;function tick(now){const f=tl?Math.min(4,(now-tl)/16.67):1;tl=now;let any=false;   // timed in 60 fps frames, so a slow device settles in the same time
  for(const s of S){if(Math.abs(s.w)>.0005){s.a+=s.w*f;s.w*=Math.pow(.955,f);s.m=Math.min(1,Math.abs(s.w)*6);any=true;}else if(s.m>0){s.w=0;s.m=Math.max(0,s.m-.04*f);any=true;}else s.w=0;}
  sdraw();moving=any;I.starsMoving=any;if(any)requestAnimationFrame(tick);else tl=0;}
let lx=null,ly=null;
if(!still)SEC.addEventListener('pointermove',e=>{if(!D||scene()<.05)return;const r=sc.getBoundingClientRect(),z=(r.width/(sc.clientWidth||r.width))||1,px=(e.clientX-r.left)/z,py=(e.clientY-r.top)/z;
  if(lx!==null){const vx=px-lx,vy=py-ly,sp=Math.hypot(vx,vy);if(sp>0){let hit=false;for(const s of S){const X=ox+s.x*scale,Y=oy+s.y*scale,rad=Math.max(10,s.sc*scale*1.1),dx=px-X,dy=py-Y;
    if(dx*dx+dy*dy<rad*rad){s.w+=Math.sign(dx*vy-dy*vx||1)*Math.min(.45,sp*.012);hit=true;}}if(hit&&!moving){moving=true;I.starsMoving=true;requestAnimationFrame(tick);}}}lx=px;ly=py;},{passive:true});
SEC.addEventListener('pointerleave',()=>{lx=ly=null;});
fetch('/preview/nook/night/stars.json').then(r=>r.json()).then(d=>{D=d;S=d.s.map(([X,Y,r,s2,o,k])=>({x:X,y:Y,a:r*Math.PI/180,sc:s2,o,k,w:0,m:0}));ssize();I.ready=true;}).catch(()=>{I.ready=true;});
addEventListener('resize',()=>requestAnimationFrame(ssize));
// ---------- for the page and its tests ----------
const pos=s=>{const r=sc.getBoundingClientRect();return{x:r.left+ox+s.x*scale,y:r.top+oy+s.y*scale,rad:Math.max(10,s.sc*scale*1.1)};};
window.sogNightLayers={info:()=>({...I}),
  star:i=>({spin:S[i].w,morph:S[i].m,angle:S[i].a}),
  starTarget:()=>{const n=window.sogOpening.nightInfo(),mb=n.markBox||{x0:0,x1:0,y0:0,y1:0},top=parseFloat(getComputedStyle(document.querySelector('header.bar')||document.body).height)||70;
    for(let i=0;i<S.length;i++){const p=pos(S[i]);if(p.x<70||p.x>innerWidth-70||p.y<top+30||p.y>Math.min(n.farCrest,innerHeight)-40)continue;
      if(p.y<n.headBottom+30&&p.x<n.headRight+80)continue;const mx=innerWidth<600?40:90;if(p.x>mb.x0-mx&&p.x<mb.x1+mx&&p.y>mb.y0-30&&p.y<mb.y1+30)continue;
      if(S.some((q,j)=>j!==i&&Math.abs(pos(q).y-p.y)<pos(q).rad+p.rad+4&&Math.abs(pos(q).x-p.x)<(innerWidth<600?44:62)))continue;return{i,x:p.x,y:p.y};}return null;}};
const hook=()=>{if(window.sogOpening){sogOpening.starTarget=sogNightLayers.starTarget;sogOpening.star=sogNightLayers.star;}};hook();addEventListener('load',hook);
})();
