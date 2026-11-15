/* Night garden: the real sky over Berthoud (15 Aug 2026, 9:30 pm, facing south-southwest), painted in the meadow's own
   material, and the Milky Way pouring down past the horizon as a river into the live meadow.

   - Stars: 1,433 entries from the Yale Bright Star Catalogue at their real altitude and azimuth.
   - Sky: short pastel strokes, like grass blades, laid in a flow field. Every naked-eye star brighter than magnitude 4.3
     is a point vortex: its strength from its brightness, its turning direction from its colour (warm stars one way,
     cool the other). Inside the Milky Way (its real outline, five brightness levels) the flow also runs down the band
     toward the river's mouth. On top drifts a slow turbulence whose energy falls off as k^-5/3 (Kolmogorov), the
     statistics measured in van Gogh's late skies (Aragon et al. 2008). Gold strokes mark the river's edge.
   - Touch: drag near a star and its vortex spins up; the strokes around it swirl and settle back, the way the grass
     bends. The star itself never moves. Reduced motion: painted once, still.
   - River: from the band's real width at the horizon, horizontal glitter strokes (the moonlight path on the water)
     pour down through the meadow toward us; blades standing in it take the river's colours (live-grass.js hook).
   Data: d3-celestial (c) 2015 Olaf Frohn, BSD 3-clause (see STAR-DATA-LICENSE.txt). */
(()=>{
const hero=document.querySelector('.ng-hero'),cv=document.getElementById('sky'),c=cv.getContext('2d');
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const test=document.createElement('canvas').getContext('2d');
let D=null,W=0,H=0,DPR=1,hor=0,sc=1,x0=0,MH=170,river=null,phone=false;
let S=null,V=[],G=[],chanFn=null,stars=[],named=[],BK=[],SG={},HALF=0,QR=[];

function rnd(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
function P(x,a){return[x0+x*sc,hor-a*sc];}
function ringPath(path,ring){             // unwrap the ring across the back of the sky, then draw it and its +-360 copies
  const u=[];let off=0;for(let i=0;i<ring.length;i++){let x=ring[i][0]+off;if(i){const d=x-u[i-1][0];if(d>180){off-=360;x-=360;}else if(d<-180){off+=360;x+=360;}}u.push([x,ring[i][1]]);}
  for(const s of[-360,0,360]){if(!u.some(p=>Math.abs(p[0]+s)<140))continue;u.forEach((p,i)=>{const q=P(p[0]+s,p[1]);i?path.lineTo(q[0],q[1]):path.moveTo(q[0],q[1]);});path.closePath();}
}
const LV=['ol1','ol2','ol3','ol4','ol5'];
// palettes: night sky, the band's outer and inner light, star halos (warm/cool), the river's gold edge
const PAL={deep:['#121A31','#152040','#10172C','#192347','#1C2450'],band1:['#2F4274','#394D84','#424B86','#344F80'],
  band2:['#6F82B8','#8697C8','#9EA9D4','#BBC3E2','#949BCD'],warm:['#E6C373','#F0D99C','#D7A456'],cool:['#C7D3EC','#E4EAF5','#ABBEE3'],gold:['#C9A24E','#D8B562'],ground:['#13211A','#17281E','#1C2E22','#11201A'],veil:['#111931','#141C38','#0F162C']};
const KEYS=Object.keys(PAL);

function layout(){
  const r=hero.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(2,devicePixelRatio||1);phone=W<700;
  MH=Math.round(Math.min(phone?190:230,H*.28));hero.style.setProperty('--meadow',MH+'px');
  hor=H-MH;sc=hor/(phone?56:66);x0=W*(phone?.24:.36);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  // the Milky Way's brightness levels, rasterised once into a small mask
  const paths={};for(const k of LV){const p=new Path2D();for(const ring of D.mw[k])if(ring.length>2)ringPath(p,ring);paths[k]=p;}
  const mk=document.createElement('canvas'),ms=.5;mk.width=Math.ceil(W*ms);mk.height=Math.ceil(hor*ms);const m=mk.getContext('2d');
  m.setTransform(ms,0,0,ms,0,0);LV.forEach((k,i)=>{m.fillStyle=`rgb(${(i+1)*40},0,0)`;m.fill(paths[k],'evenodd');});
  const md=m.getImageData(0,0,mk.width,mk.height).data,mw=mk.width,mh=mk.height;
  const lvl=(x,y)=>{const i=Math.max(0,Math.min(mw-1,x*ms|0)),j=Math.max(0,Math.min(mh-1,y*ms|0));return Math.round(md[(j*mw+i)*4]/40);};
  // the stars in view; the vortices are the naked-eye ones brighter than 4.3
  stars=[];for(const [x,a,mg,bv] of D.stars){if(a<0)continue;const [px,py]=P(x,a);if(px<-30||px>W+30||py<-30)continue;stars.push({x:px,y:py,m:mg,bv});}
  stars.sort((a,b)=>b.m-a.m);
  V=stars.filter(s=>s.m<4.3).map(s=>({x:s.x,y:s.y,m:s.m,g:Math.pow(10,-.4*(s.m-1)),sg:s.bv>.8?-1:1,warm:s.bv>.8,b:0,bs:1,rh:s.m<3.6?(phone?5:7)+(3.6-s.m)*(phone?4:6):0}));
  // the river first: where the band meets the horizon (its real width there, no cap) and on down through the meadow
  let L0=x0,R0=x0;const yy=hor-2;while(L0>0&&lvl(L0-1,yy)>0)L0--;while(R0<W&&lvl(R0+1,yy)>0)R0++;
  if(R0-L0<20){L0=x0-40;R0=x0+40;}
  const cH=(L0+R0)/2,hw=(R0-L0)/2,dxr=hw*(phone?.35:.6),grow=phone?.55:.9;
  chanFn=(t)=>[cH+dxr*Math.pow(t,1.4)+Math.sin(t*5.2)*hw*.12*t,hw*(1+grow*t),hor+t*(H-hor+4)];   // centre x, half width, y
  const rp=new Path2D(),N=30,lft=[],rgt=[];for(let i=0;i<=N;i++){const [cx,w,y]=chanFn(i/N);lft.push([cx-w,y]);rgt.push([cx+w,y]);}
  lft.forEach((q,i)=>i?rp.lineTo(q[0],q[1]):rp.moveTo(q[0],q[1]));for(let i=rgt.length-1;i>=0;i--)rp.lineTo(rgt[i][0],rgt[i][1]);rp.closePath();river=rp;
  const inChan=(x,y)=>{if(y<hor)return null;const t=Math.min(1,(y-hor)/(H-hor+4)),[cx,w]=chanFn(t),lat=(x-cx)/w;return Math.abs(lat)<=1?{t,lat}:null;};
  // the strokes: one jittered grid over the whole hero, sky and ground alike, each with its static flow
  const sp=phone?9:11,r0=rnd(11),cols=Math.ceil(W/sp),rows=Math.ceil(H/sp),n=cols*rows;
  S={n,x:new Float32Array(n),y:new Float32Array(n),vx:new Float32Array(n),vy:new Float32Array(n),a:new Float32Array(n),len:new Float32Array(n),tf:new Float32Array(n),
     ox:new Float32Array(n),oy:new Float32Array(n),ux:new Float32Array(n),uy:new Float32Array(n),col:new Uint8Array(n),key:new Uint8Array(n)};
  const core=phone?10:14,mags=[];
  const hr=hero.getBoundingClientRect();QR=[...hero.querySelectorAll('.ng-top,.ng-kick,.ng-copy h1,.ng-lede,.ng-acts>*,.ng-cap')].map(e=>{const b=e.getBoundingClientRect(),p=phone?8:14;return [b.left-hr.left-p,b.top-hr.top-p,b.right-hr.left+p,b.bottom-hr.top+p];});
  const quiet=QR.slice(1);
  for(let i=0;i<n;i++){const x=(i%cols+r0())*sp,y=(Math.floor(i/cols)+r0())*sp;S.x[i]=x;S.y[i]=Math.min(H-2,y);S.len[i]=(phone?5:6)+r0()*(phone?4:6);
    let vx=0,vy=0;if(y<hor)for(const v of V){const dx=x-v.x,dy=y-v.y,d2=dx*dx+dy*dy+core*core,f=v.g*v.sg/d2*60;vx+=-dy*f;vy+=dx*f;}
    S.vx[i]=vx;S.vy[i]=vy;if(y<hor)mags.push(Math.hypot(vx,vy));}
  mags.sort((a,b)=>a-b);const m50=mags[mags.length>>1]||1;
  for(let i=0;i<n;i++){const x=S.x[i],y=S.y[i];let key='deep',vx,vy;
    if(y<hor){vx=S.vx[i]/m50;vy=S.vy[i]/m50;const L=lvl(x,y);S.tf[i]=1;
      const mag=Math.hypot(vx,vy);if(mag>4){vx*=4/mag;vy*=4/mag;}                          // keep the brightest vortices from swallowing the sky
      if(L>0){const dx=cH-x,dy=hor+24-y,d=Math.hypot(dx,dy)||1,k=.55+L*.18;vx+=dx/d*k;vy+=dy/d*k;}   // inside the band: pour into the river's mouth
      for(const v of V){if(!v.rh)continue;const d=Math.hypot(x-v.x,y-v.y);if(d<v.rh&&r0()<1.15-d/v.rh){key=v.warm?'warm':'cool';break;}}
      if(key==='deep'){const e=(lvl(x+5,y)>0)!==(L>0)||(lvl(x-5,y)>0)!==(L>0)||(lvl(x,y+5)>0)!==(L>0)||(lvl(x,y-5)>0)!==(L>0);
        key=e&&L>0&&r0()<.5?'gold':L>=3?'band2':L>=1?(L>=2&&r0()<.35?'band2':'band1'):'deep';}
      for(const q of quiet)if(x>q[0]&&x<q[2]&&y>q[1]&&y<q[3]){key='veil';break;}             // behind the words the sky goes quiet
    }else{const ch=inChan(x,y);
      if(ch){const dt=.02,[c1,w1,y1]=chanFn(Math.max(0,ch.t-dt)),[c2,w2,y2]=chanFn(Math.min(1,ch.t+dt));          // the river: flow down its channel, spreading with it
        vx=(c2-c1)+ch.lat*(w2-w1);vy=y2-y1;const d=Math.hypot(vx,vy)||1;vx=vx/d*1.6;vy=vy/d*1.6;S.tf[i]=.5;
        const a=Math.abs(ch.lat);key=a>.86&&r0()<.55?'gold':a<.55?'band2':(r0()<.3?'band2':'band1');}
      else{vx=(r0()-.5)*.5;vy=-2;S.tf[i]=.25;key='ground';}}                                   // the far meadow: upright, like grass
    S.vx[i]=vx;S.vy[i]=vy;S.key[i]=KEYS.indexOf(key);S.col[i]=(r0()*PAL[key].length)|0;}
  // a few pale flecks riding the river down (the moonlight on the water)
  const r1=rnd(5),ng=phone?60:110;G=[];for(let i=0;i<ng;i++){const lat=(r1()*2-1)*.8;G.push({u:r1(),lat,len:4+r1()*5,sp:.04+r1()*.03,c:['#ECE5D2','#BBC3E2','#ECE5D2','#C9A24E'][(r1()*4)|0]});}
  BK=[];for(let k=0;k<KEYS.length;k++)for(let q=0;q<PAL[KEYS[k]].length;q++){const ids=[];for(let i=0;i<S.n;i++)if(S.key[i]===k&&S.col[i]===q)ids.push(i);if(ids.length)BK.push({c:PAL[KEYS[k]][q],ids:Int32Array.from(ids)});}
  // stars in a few colour and size groups, so they draw in a handful of paths
  SG={};for(const st of stars){const r=Math.max(.5,(6.3-st.m)*.42)*(phone?.85:1),w=Math.max(-1,Math.min(1,(st.bv-.6)/1.2)),tone=w>.33?'#F0D2A8':w<-.33?'#DCE6F4':'#EEE8D6',al=st.m<2.5?1:st.m<4?.85:.6,key=tone+al;(SG[key]=SG[key]||{tone,al,pts:[]}).pts.push([st.x,st.y,r]);}
  named=['Altair','Antares','Arcturus'].map(k=>{const n=D.named[k];if(!n||n[1]<0)return null;const [x,y]=P(n[0],n[1]);return {k,x,y};}).filter(Boolean);
}

// turbulence: six modes, k doubling each time; velocity amplitude ~ k^(-1/3) (energy ~ k^(-5/3)), turnover ~ k^(2/3)
const TM=(()=>{const r=rnd(3),k0=2*Math.PI/760,out=[];for(let n=0;n<6;n++){const k=k0*Math.pow(2,n),th=r()*Math.PI*2;out.push({k,cx:Math.cos(th),sy:Math.sin(th),ph:r()*Math.PI*2,amp:.62*Math.pow(k/k0,-1/3),w:.05*Math.pow(k/k0,2/3)});}return out;})();

let T=0,last=0,vis=true,running=false,first=true;
function step(dt){
  T+=dt;const n=S.n,act=V.filter(v=>v.b>.02),core=phone?10:14;
  for(const v of act)v.b*=Math.exp(-dt*.8);
  HALF^=1;
  for(let i=0;i<n;i++){const x=S.x[i],y=S.y[i];let vx=S.vx[i],vy=S.vy[i];
    if(!first&&(i&1)!==HALF&&!act.length)continue;
    const tf=S.tf[i];for(const m of TM){const s=Math.cos(m.k*(x*m.cx+y*m.sy)+m.ph-m.w*T)*m.amp*tf;vx+=m.sy*s;vy+=-m.cx*s;}
    let bx=0,by=0;
    for(const v of act){const dx=x+S.ox[i]-v.x,dy=y+S.oy[i]-v.y,d2=dx*dx+dy*dy;if(d2>40000)continue;const f=v.b*v.bs*900/(d2+core*core);bx+=-dy*f;by+=dx*f;}
    vx+=bx*.06;vy+=by*.06;
    // strokes swirl round a spun-up star and spring back home, like the grass
    S.ux[i]+=(bx*1.4-S.ox[i]*7)*dt;S.uy[i]+=(by*1.4-S.oy[i]*7)*dt;S.ux[i]*=Math.exp(-dt*3.2);S.uy[i]*=Math.exp(-dt*3.2);
    S.ox[i]+=S.ux[i]*dt;S.oy[i]+=S.uy[i]*dt;
    const want=Math.atan2(vy,vx);if(first)S.a[i]=want;else{const da=((want-S.a[i]+Math.PI*3)%(Math.PI*2))-Math.PI;S.a[i]+=da*Math.min(1,dt*5);}}
  first=false;
  for(const g of G){g.u+=g.sp*dt;if(g.u>1)g.u-=1;}
}

function draw(){
  c.setTransform(DPR,0,0,DPR,0,0);c.fillStyle='#0B1019';c.fillRect(0,0,W,H);     // one ground for sky and meadow: no horizon band
  c.lineCap='round';c.lineWidth=phone?1.8:2.2;
  for(const b of BK){c.strokeStyle=b.c;c.beginPath();const ids=b.ids;
    for(let j=0;j<ids.length;j++){const i=ids[j],a=S.a[i],L=S.len[i]*.5,x=S.x[i]+S.ox[i],y=S.y[i]+S.oy[i],ca=Math.cos(a)*L,sa=Math.sin(a)*L;c.moveTo(x-ca,y-sa);c.lineTo(x+ca,y+sa);}
    c.stroke();}
  // pale flecks riding the river down, along its flow
  c.lineWidth=phone?1.6:2;for(const g of G){const t=g.u,dt=.02,[c1,w1,y1]=chanFn(Math.max(0,t-dt)),[cx,w,y]=chanFn(t),[c2,w2,y2]=chanFn(Math.min(1,t+dt)),x=cx+g.lat*w;
    let dx=(c2-c1)+g.lat*(w2-w1),dy=y2-y1;const d=Math.hypot(dx,dy)||1,L=g.len*(1+t)*.5;dx=dx/d*L;dy=dy/d*L;
    c.strokeStyle=g.c;c.globalAlpha=.4+.6*Math.min(1,t*4);c.beginPath();c.moveTo(x-dx,y-dy);c.lineTo(x+dx,y+dy);c.stroke();}
  c.globalAlpha=1;
  // the stars themselves: still, matte, sized by magnitude
  for(const k in SG){const g=SG[k];c.fillStyle=g.tone;c.globalAlpha=g.al;c.beginPath();for(const [x,y,r] of g.pts){c.moveTo(x+r,y);c.arc(x,y,r,0,Math.PI*2);}c.fill();}
  c.globalAlpha=1;
  // three named stars, marked in gold; each label goes where it is clear of the words, or is left off
  c.font='500 10.5px "IBM Plex Mono",monospace';c.textBaseline='middle';
  const hit=(r)=>r[0]<4||r[2]>W-4||r[1]<4||QR.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1]);
  for(const {k,x,y} of named){if(y<10||y>hor-10||x<10||x>W-10)continue;
    const mark=[x-12,y-12,x+12,y+12];if(hit(mark))continue;
    c.strokeStyle='#C9A24E';c.lineWidth=1;c.beginPath();c.moveTo(x-11,y);c.lineTo(x-6,y);c.moveTo(x+6,y);c.lineTo(x+11,y);c.moveTo(x,y-11);c.lineTo(x,y-6);c.moveTo(x,y+6);c.lineTo(x,y+11);c.stroke();
    const t=k.toUpperCase(),tw=c.measureText(t).width,R=[x+15,y-8,x+15+tw,y+8],Lr=[x-15-tw,y-8,x-15,y+8];
    c.fillStyle='rgba(201,162,78,.9)';if(!hit(R)){c.textAlign='left';c.fillText(t,x+15,y+.5);}else if(!hit(Lr)){c.textAlign='right';c.fillText(t,x-15,y+.5);}}
  c.textAlign='left';
}

function frame(now){const dt=last?Math.min(.05,(now-last)/1000):.016;last=now;step(dt);draw();
  if(vis&&!document.hidden)requestAnimationFrame(frame);else{running=false;last=0;}}
function wake(){if(!still&&vis&&!running){running=true;requestAnimationFrame(frame);}}

/* touch: drag near a star and its vortex spins up, turning the way you dragged around it */
let px=-1e4,py=-1e4;
function move(e){const q=hero.getBoundingClientRect(),x=e.clientX-q.left,y=e.clientY-q.top,mx=x-px,my=y-py;px=x;py=y;
  if(y>hor||Math.abs(mx)+Math.abs(my)>200)return;const sp=Math.hypot(mx,my);if(sp<.5)return;
  const R=phone?70:110;let best=null,bs=0,bd=R*R;for(const v of V){const d=(v.x-x)**2+(v.y-y)**2;if(d>R*R*2.2)continue;const sc2=Math.sqrt(v.g)/(Math.sqrt(d)+18);if(sc2>bs){bs=sc2;best=v;bd=d;}}   // the brightest nearby star wins, not merely the nearest
  if(!best)return;const rx=x-best.x,ry=y-best.y,cr=rx*my-ry*mx;best.bs=cr>=0?1:-1;best.b=Math.min(4,best.b+sp*.02*(1.3-Math.min(1,Math.sqrt(bd)/(phone?70:110))));wake();}

/* The meadow: live-grass.js draws through this hook. Blades standing in the river take the river's colours. */
const GREENS=['#3E6B3E','#4C7A47','#335C36','#5A8650'],RIVER=['#394D84','#6F82B8','#8697C8','#2F4274'];
window.sogShapes={scale:()=>1.25,draw(cx,g,COL,FL){
  if(!river)return false;
  const top=hor,inR=new Uint8Array(g.n);test.setTransform(1,0,0,1,0,0);
  for(let i=0;i<g.n;i++)inR[i]=test.isPointInPath(river,g.x[i],g.y[i]+top)?1:0;
  cx.lineCap='round';
  const blades=(set,cols,w)=>{for(let q=0;q<cols.length;q++){cx.strokeStyle=cols[q];cx.lineWidth=w;cx.beginPath();
    for(let i=0;i<g.n;i++){if(inR[i]!==set||g.seed[i]||(i*31)%cols.length!==q)continue;const a=g.a[i],L=g.len[i]*1.25,b=(i%7-3)*.07+a*.3,x=g.x[i]-Math.sin(a)*L*.5,y=g.y[i]+Math.cos(a)*L*.5;
      cx.moveTo(x,y);cx.quadraticCurveTo(x+Math.sin(a)*L*.6,y-Math.cos(a)*L*.6,x+Math.sin(a+b)*L,y-Math.cos(a+b)*L);}
    cx.stroke();}};
  blades(0,GREENS,1.8);blades(1,RIVER,1.8);
  for(let i=0;i<g.n;i++){if(!g.seed[i])continue;const a=g.a[i],L=g.len[i]*1.1,bx=g.x[i]-Math.sin(a)*L*.5,by=g.y[i]+Math.cos(a)*L*.5,tx=bx+Math.sin(a)*L,ty=by-Math.cos(a)*L;
    cx.strokeStyle=inR[i]?RIVER[0]:GREENS[1];cx.lineWidth=1.1;cx.beginPath();cx.moveTo(bx,by);cx.lineTo(tx,ty);cx.stroke();
    cx.fillStyle=inR[i]?'#C9A24E':(i%4?'#ECE5D2':'#B9C6D8');cx.beginPath();cx.arc(tx,ty,inR[i]?1.6:g.d0*.2,0,Math.PI*2);cx.fill();}
  return true;}};

async function start(){
  D=await fetch('/preview/night-garden/sky.json').then(r=>r.json());
  layout();step(.016);draw();
  hero.nightSky={spun:()=>V.filter(v=>v.b>.02).map(v=>({x:v.x|0,y:v.y|0,m:v.m,b:+v.b.toFixed(2)})),moved:()=>{let n=0;for(let i=0;i<S.n;i++)if(Math.abs(S.ox[i])+Math.abs(S.oy[i])>2)n++;return n;},sim:(sec)=>{for(let t=0;t<sec;t+=1/60)step(1/60);draw();},bench:(k)=>{const t0=performance.now();for(let i=0;i<k;i++){step(1/60);draw();}return +((performance.now()-t0)/k).toFixed(2);}};   // for checks
  if(!still){hero.addEventListener('pointermove',move,{passive:true});
    new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)wake();}).observe(hero);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});wake();}
  let rw=innerWidth,rh=innerHeight;addEventListener('resize',()=>{if(Math.abs(innerWidth-rw)<2&&Math.abs(innerHeight-rh)<80)return;rw=innerWidth;rh=innerHeight;first=true;layout();step(.016);draw();});
}
start();
})();
