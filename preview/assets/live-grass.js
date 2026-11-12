/* Live grass: the opening's meadow (blades and seed heads that behave like sand) as a running strip at the foot of a section.
   Any element with data-live-grass gets it. Its colour is the element's CSS color (set it from --grass). The pointer anywhere
   over the parent section scoops the grass; it pours back and heaps up again. Off screen it sleeps; under reduced motion it
   settles once and stays still. Replaces the old grass picture (grass-mask.webp): live effects, never screenshots. */
(()=>{
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rnd(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
function meadow(el){
  const cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');el.appendChild(cv);
  const c=cv.getContext('2d'),host=el.parentElement||el,FALL=el.dataset.liveGrass==='fall';   // 'fall': the blades start above and rain down into a meadow each time it comes into view
  let W=0,H=0,DPR=1,g=null,COL='#888',vis=false,running=false,last=0,ready=0;
  const ptr={x:-1e4,y:-1e4,vx:0,vy:0,on:false};
  const colour=()=>{COL=getComputedStyle(el).color||'#888';};
  function build(){const r=el.getBoundingClientRect();W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));
    DPR=Math.min(W<600?1.5:2,devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
    const d0=(W<600?9:11)*(window.sogShapes?sogShapes.scale():1),band=Math.min(H*.55,126),cols=Math.floor(W/d0),rows=Math.max(1,Math.floor(band/d0)),n=cols*rows,r0=rnd(7);
    g={n,d0,x:new Float32Array(n),y:new Float32Array(n),vx:new Float32Array(n),vy:new Float32Array(n),a:new Float32Array(n),px:new Float32Array(n),py:new Float32Array(n),
      len:new Float32Array(n),seed:new Uint8Array(n),gw:Math.ceil(W/d0+2),next:new Int32Array(n)};g.head=new Int32Array(g.gw*Math.ceil(H/d0+2));
    for(let i=0;i<n;i++){const cx=i%cols,cy=Math.floor(i/cols);g.x[i]=(cx+r0())*d0;g.y[i]=FALL?-(r0()*H*1.1+cy*d0*.9+10):H-4-(cy+r0())*d0*1.05;g.len[i]=d0*(1.1+r0()*.7);g.seed[i]=r0()<.12?1:0;g.a[i]=(r0()-.5)*.3;}
    ready=FALL&&!still?15:0;}
  function fluid(dt){const n=g.n,d0=g.d0,G=1500,PR=Math.max(70,Math.min(W,Math.min(H,230)*2.4)*.16),sp=Math.hypot(ptr.vx,ptr.vy);
    for(let i=0;i<n;i++){g.vy[i]+=G*dt;
      if(ptr.on){const dx=g.x[i]-ptr.x,dy=g.y[i]-ptr.y,d2=dx*dx+dy*dy;if(d2<PR*PR){const d=Math.sqrt(d2)||1,f=1-d/PR;
        g.vx[i]+=(ptr.vx-g.vx[i])*f*.35+dx/d*f*90;g.vy[i]+=(ptr.vy-g.vy[i])*f*.35+dy/d*f*90-f*Math.min(sp,2500)*.35;}}
      g.px[i]=g.x[i];g.py[i]=g.y[i];g.x[i]+=g.vx[i]*dt;g.y[i]+=g.vy[i]*dt;}
    const need=g.gw*Math.ceil(H/d0+2);if(g.head.length<need)g.head=new Int32Array(need);const gw=g.gw,head=g.head,next=g.next;
    for(let it=0;it<3;it++){head.fill(-1);
      for(let i=0;i<n;i++){const cx=Math.max(0,Math.min(gw-1,(g.x[i]/d0|0)+1)),cy=Math.max(0,(g.y[i]/d0|0)+1),h=cy*gw+cx;if(h<head.length){next[i]=head[h];head[h]=i;}else next[i]=-1;}
      for(let i=0;i<n;i++){const cx=Math.max(0,Math.min(gw-1,(g.x[i]/d0|0)+1)),cy=Math.max(0,(g.y[i]/d0|0)+1);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const h=(cy+oy)*gw+cx+ox;if(h<0||h>=head.length)continue;
          for(let j=head[h];j>=0;j=next[j]){if(j<=i)continue;const dx=g.x[j]-g.x[i],dy=g.y[j]-g.y[i],d2=dx*dx+dy*dy;if(d2>=d0*d0)continue;
            const d=Math.sqrt(d2)||.01,push=(d0-d)*.5/d,ex=d2?dx*push:.3,ey=d2?dy*push:0;g.x[i]-=ex;g.y[i]-=ey;g.x[j]+=ex;g.y[j]+=ey;}}}
      for(let i=0;i<n;i++){if(g.y[i]>H-3)g.y[i]=H-3;if(g.y[i]<2&&!FALL)g.y[i]=2;if(g.x[i]<2)g.x[i]=2;if(g.x[i]>W-2)g.x[i]=W-2;}}
    for(let i=0;i<n;i++){const v0=Math.hypot(g.vx[i],g.vy[i]);g.vx[i]=(g.x[i]-g.px[i])/dt*.995;g.vy[i]=(g.y[i]-g.py[i])/dt*.995;if(g.y[i]>=H-3)g.vx[i]*=.85;
      const v1=Math.hypot(g.vx[i],g.vy[i]),near=ptr.on&&Math.abs(g.x[i]-ptr.x)<PR*2.5&&Math.abs(g.y[i]-ptr.y)<PR*2.5,cap=near?1e9:v0+120;
      if(v1>cap){g.vx[i]*=cap/v1;g.vy[i]*=cap/v1;}else if(v1<90&&g.y[i]>H-160){const k=v1<30?.7:.92;g.vx[i]*=k;g.vy[i]*=k;}}
    for(let i=0;i<n;i++){const v=Math.hypot(g.vx[i],g.vy[i]),want=v>60?Math.atan2(g.vx[i],-g.vy[i]):Math.sin(g.x[i]*.05)*.18,da=((want-g.a[i]+Math.PI*3)%(Math.PI*2))-Math.PI;g.a[i]+=da*Math.min(1,dt*(v>60?14:5));}}
  const meadowGreens=(col)=>{col=col.trim();let r,g2,b;const hx=/^#([0-9a-f]{6})$/i.exec(col);if(hx){r=parseInt(col.slice(1,3),16);g2=parseInt(col.slice(3,5),16);b=parseInt(col.slice(5,7),16);}else{const m=col.match(/\d+(\.\d+)?/g)||[90,120,80];r=+m[0];g2=+m[1];b=+m[2];}
  r/=255;g2/=255;b/=255;const mx=Math.max(r,g2,b),mn=Math.min(r,g2,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=mx===r?((g2-b)/d)%6:mx===g2?(b-r)/d+2:(r-g2)/d+4;h*=60;if(h<0)h+=360;}
  // like Primavera's meadow: the same grass in several greens, shifted in hue as well as light (olive, sap, deep, cool)
  return[[0,0,0],[-14,.05,-.12],[16,-.08,.08],[-6,.1,-.2],[28,-.12,.02],[8,0,.14]].map(([dh,ds,dl])=>`hsl(${(h+dh+360)%360} ${Math.max(0,Math.min(100,(s+ds)*100))}% ${Math.max(4,Math.min(92,(l+dl)*100))}%)`);};
const meadowDraw=(c,g,COL,FL)=>{const SHD=meadowGreens(COL),NQ=SHD.length;c.lineCap="round";
  for(let q=0;q<NQ;q++){c.fillStyle=SHD[q];c.strokeStyle=SHD[q];c.beginPath();
    for(let i=0;i<g.n;i++){if(g.seed[i]||(i*31)%NQ!==q)continue;const k=(i*7919)%10,a=g.a[i];
      if(k<4){const L=g.len[i]*1.25,bend=(i%7-3)*.06+a*.35,s=Math.sin(a),co=Math.cos(a),x=g.x[i]-s*L*.5,y=g.y[i]+co*L*.5,w=L*.07+.5,tx=x+Math.sin(a+bend)*L,ty=y-Math.cos(a+bend)*L,mx=x+s*L*.55,my=y-co*L*.55;
        c.moveTo(x-co*w,y-s*w);c.quadraticCurveTo(mx-co*w*.6,my-s*w*.6,tx,ty);c.quadraticCurveTo(mx+co*w*.6,my+s*w*.6,x+co*w,y+s*w);}}
    c.fill();c.lineWidth=1.1;c.beginPath();
    for(let i=0;i<g.n;i++){if((i*31)%NQ!==q)continue;const k=(i*7919)%10,a=g.a[i];
      if(g.seed[i]){const L=g.len[i]*1.1,x=g.x[i]-Math.sin(a)*L*.5,y=g.y[i]+Math.cos(a)*L*.5;c.moveTo(x,y);c.lineTo(x+Math.sin(a)*L,y-Math.cos(a)*L);} // the flower's stalk
      else if(k>=4&&k<8){const L=g.len[i]*1.3,bend=(i%5-2)*.08,x=g.x[i]-Math.sin(a)*L*.5,y=g.y[i]+Math.cos(a)*L*.5;
        c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(a)*L*.6,y-Math.cos(a)*L*.6,x+Math.sin(a+bend)*L,y-Math.cos(a+bend)*L);}
      else if(k>=8){const L=g.len[i]*1.1,x=g.x[i],y=g.y[i]+L*.4;
        for(const o of[-.32,0,.3]){const b=a+o;c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(b)*L*.5,y-Math.cos(b)*L*.55,x+Math.sin(b*1.15)*L,y-Math.cos(b*1.15)*L);}}}
    c.stroke();}
  // small flowers speckled through it: daisies, cornflowers and little five-petal blooms, in the style's own flower colours
  const NF=FL.length;for(let f=0;f<NF;f++){c.fillStyle=FL[f];c.beginPath();
    for(let i=0;i<g.n;i++){if(!g.seed[i]||i%NF!==f)continue;const L=g.len[i]*1.1,a=g.a[i],cx=g.x[i]-Math.sin(a)*L*.5+Math.sin(a)*L,cy=g.y[i]+Math.cos(a)*L*.5-Math.cos(a)*L,
      P=(i%3===0)?8:5,R=g.d0*(P===8?.36:.3),pr=R*(P===8?.28:.42),rot=i*.7;
      for(let p=0;p<P;p++){const t=rot+p*Math.PI*2/P,px=cx+Math.cos(t)*R*.55,py=cy+Math.sin(t)*R*.55;c.moveTo(px+R*.55,py);c.ellipse(px,py,R*.55,pr,t,0,Math.PI*2);}}
    c.fill();}
  c.fillStyle="rgba(250,236,170,.95)";c.beginPath();for(let i=0;i<g.n;i++){if(!g.seed[i])continue;const L=g.len[i]*1.1,a=g.a[i],cx=g.x[i]+Math.sin(a)*L*.5,cy=g.y[i]-Math.cos(a)*L*.5;c.moveTo(cx+1,cy);c.arc(cx,cy,g.d0*.09,0,Math.PI*2);}c.fill();};
const shades=(col)=>{col=col.trim();const hx=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(col)?(col.length===4?col.slice(1).split('').map(h=>parseInt(h+h,16)):[1,3,5].map(j=>parseInt(col.slice(j,j+2),16))):null;const m=hx||col.match(/\d+(\.\d+)?/g)||[0,0,0],r=+m[0],g2=+m[1],b=+m[2],f=(k)=>k>0?`rgb(${r+(255-r)*k|0},${g2+(255-g2)*k|0},${b+(255-b)*k|0})`:`rgb(${r*(1+k)|0},${g2*(1+k)|0},${b*(1+k)|0})`;return[f(-.16),col,f(.2)];};
function draw(){c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);if(ready<15)return;c.fillStyle=COL;c.strokeStyle=COL;c.lineCap="round";c.beginPath();
  const FLs=(getComputedStyle(el).getPropertyValue('--lf-flowers').trim()||'#F3E7B0,#E8C34A,#6F8FB8,#B8553A').split(',').map(x=>x.trim());if(window.sogShapes&&sogShapes.draw(c,g,COL,FLs))return;   // each style's piece
  meadowDraw(c,g,COL,(getComputedStyle(el).getPropertyValue('--lf-flowers').trim()||'#F3E7B0,#E8C34A,#6F8FB8,#B8553A').split(',').map(x=>x.trim()));}
  function frame(now){const dt=last?Math.min(.033,(now-last)/1000):.016;last=now;ptr.vx*=.85;ptr.vy*=.85;
    if(ready<15){for(let k=0;k<6;k++)fluid(1/120);ready++;}else{const sub=Math.min(4,Math.max(1,Math.round(dt*120)));for(let k=0;k<sub;k++)fluid(1/120);}
    draw();if(vis)requestAnimationFrame(frame);else{running=false;last=0;}}
  function wake(){if(!still&&vis&&!running){running=true;requestAnimationFrame(frame);}}
  function settle(){for(let k=0;k<90;k++)fluid(1/120);ready=15;draw();}
  function move(e){const q=el.getBoundingClientRect(),x=e.clientX-q.left,y=e.clientY-q.top;
    if(ptr.on){ptr.vx=ptr.vx*.5+(x-ptr.x)*.5*60;ptr.vy=ptr.vy*.5+(y-ptr.y)*.5*60;}ptr.x=x;ptr.y=y;ptr.on=true;}
  if(!still){host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',()=>{ptr.on=false;ptr.x=ptr.y=-1e4;});}
  colour();build();if(still)settle();
  let sc0=window.sogShapes?sogShapes.scale():1;['sog-theme','sog-scheme'].forEach(t=>document.addEventListener(t,()=>requestAnimationFrame(()=>{colour();const sc=window.sogShapes?sogShapes.scale():1;if(sc!==sc0){sc0=sc;build();if(still)settle();wake();}if(still||!running)draw();})));   // a style with bigger pieces regrows the strip
  let rw=innerWidth;addEventListener('resize',()=>{const r=el.getBoundingClientRect();if(Math.abs(innerWidth-rw)<2&&Math.abs(r.height-H)<40)return;rw=innerWidth;build();if(still)settle();});
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)wake();},{rootMargin:'120px'}).observe(el);
  if(FALL&&!still){let away=0;new IntersectionObserver(es=>{const e=es[0];if(e.isIntersecting&&away&&performance.now()-away>800){build();wake();}if(!e.isIntersecting)away=performance.now();},{threshold:.35}).observe(el);}   // back in view after a while: it falls again
  el.liveGrass={ready:()=>ready>=15,running:()=>running,poke:(x,y,vx,vy)=>{ptr.x=x;ptr.y=y;ptr.vx=vx;ptr.vy=vy;ptr.on=true;}};
}
const go=()=>document.querySelectorAll('[data-live-grass]').forEach(el=>{if(!el.liveGrass&&getComputedStyle(el).display!=='none')meadow(el);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
document.addEventListener('sog-theme',()=>requestAnimationFrame(go)); // a strip hidden in one style starts when a style shows it
})();
