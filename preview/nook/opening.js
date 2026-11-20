(()=>{
// The opening (from the Logo Field study): the mark as loose physical pieces (a knock makes them hop and flip, springs bring them home) over a meadow of
// grass blades and seed heads that behave like sand: the pointer scoops them into plumes, they pour back and heap up again. After Lusion's contact page.
const SEC=document.getElementById('opening'),cv=document.getElementById('lf-cv'),c=cv.getContext('2d'),still=matchMedia('(prefers-reduced-motion: reduce)').matches;
let NIGHT=false,KEEPG=0,GFULL=0,running=true,TOP=0,visible=true,ready=0,INK='#fff',MARKC='#fff',GRASS='#fff';
function inks(){const cs=getComputedStyle(SEC),v=n=>cs.getPropertyValue(n).trim();MFILL=v('--lf-mark-fill');RIM=v('--lf-mark-rim');NIGHT=v('--lf-night')==='1';INK=v('--lf-ink')||'#fff';MARKC=v('--lf-mark')||INK;GRASS=v('--lf-grass')||INK;} // the style's colors for the opening // TOP: the site bar's height over the opening; ready counts the frames spent letting the heap settle
const P1=new Path2D("M 60.1360,299.5890 C 40.8560,283.5000 37.9720,248.8600 54.1230,229.1250 C 61.9590,219.4780 73.2066,213.0913 85.9080,212.4050 L 279.9170,212.3880 C 292.7328,211.6894 302.2259,200.5242 302.6140,188.1740 C 303.0171,175.3461 294.1087,163.3937 280.9850,162.4350 L 160.3860,162.3770 C 155.6830,162.3750 152.4580,158.1300 152.2660,154.1930 C 152.0640,150.0420 155.5000,145.5160 160.3230,145.5160 L 323.2740,145.5180 C 363.5090,146.7569 394.2264,180.5210 394.5670,220.2810 C 394.9023,259.4236 360.4620,297.7100 320.2520,299.1580 C 320.2520,299.1580 69.9310,307.7640 60.1360,299.5890 Z"),P2=new Path2D("M 365.1390,47.9780 C 360.1170,47.5130 354.1470,47.1080 347.4230,46.7550 C 274.7440,42.9430 114.0820,45.2510 114.0820,45.2510 C 73.9994,46.9759 43.7290,80.8860 43.6260,120.3040 C 43.5230,159.4680 73.5199,193.9418 113.3820,195.4730 L 277.3270,195.8440 C 282.2870,195.8440 285.7460,192.0070 285.9600,187.6500 C 286.1670,183.4310 282.8680,178.9500 277.9760,178.9480 L 158.2750,178.9140 C 145.3037,178.2644 135.8119,166.8014 135.6040,154.2420 C 135.3960,141.6768 144.3477,129.9059 157.2620,128.9900 L 350.1640,128.8050 C 352.3160,128.8030 354.4280,128.6110 356.4990,128.2740 C 366.7370,126.6070 375.8830,121.0490 382.8160,113.4590 C 390.0330,105.5580 394.4238,95.7293 394.5320,85.6870 C 394.7250,67.7708 381.6430,52.8390 365.1390,47.9780 Z"),DOT=new Path2D();DOT.arc(357.983,86.686,36.548,0,Math.PI*2);
let RULE=[0,0,0],MODE='mark',W=0,H=0,DPR=1,pieces=[],grass=null,ptr={x:-1e4,y:-1e4,vx:0,vy:0,on:false,down:false,held:0,touch:false,burst:0,acc:0},last=0;
// ---- the logo's pieces: the S's two halves, its dot, each letter of the wordmark, and the rule under it in segments
function build(){pieces=[];const phone=W<600;
  const add=(kind,x,y,r,extra)=>pieces.push(Object.assign({kind,hx:x,hy:y,x,y,a:0,vx:0,vy:0,va:0,r,line:0},extra));
  const S=(mx,sy,markH)=>{const sc=markH/259,sCx=219,sCy=174;add('p2',mx,sy-markH*.14,markH*.36,{sc});add('p1',mx,sy+markH*.14,markH*.36,{sc});};
  if(MODE==='lockup')lockup(phone,add,S);else{
  const sc=Math.min(W*(phone?.5:.24),H*.3)/350,mx=W/2,top=Math.max(TOP+16,H*(phone?.14:.12));
  const markH=259*sc,word='Sea of Grass',fs=Math.min(W*(phone?.13:.085),H*.11);
  c.font=`800 ${fs}px Archivo, "Helvetica Neue", Arial, sans-serif`;const ww=c.measureText(word).width;
  const sy=top+markH/2,wy=top+markH+fs*1.05,ry=wy+fs*.32;S(mx,sy,markH);
  let x=mx-ww/2;for(const ch of word){const w=c.measureText(ch).width;if(ch!==' ')add('ch',x+w/2,wy,Math.max(w,fs*.4)*.6,{ch,fs,font:`800 ${fs}px Archivo, "Helvetica Neue", Arial, sans-serif`});x+=w;}
  const segs=phone?6:10,sw=ww/segs;for(let i=0;i<segs;i++)add('rule',mx-ww/2+sw*(i+.5),ry,sw*.5,{w:sw-3,h:Math.max(2,fs*.05)});}
  if(KEEPG&&grass){const dH=H-KEEPG,g=grass;for(let i=0;i<g.N;i++){g.y[i]+=dH;g.py[i]+=dH;g.vy[i]=0;} // only the height changed: keep the heap on the ground
    g.n=g.N;return;} // keep every blade: the frame closes over the meadow, the meadow does not shrink
  // ---- the meadow: grass blades and seed heads as grains of a soft fluid, heaped along the bottom quarter
  // always grow the full meadow, sized to the opening at full height, even when the page loads or restyles part-way down (the opening is shrunk then)
  const HF=H;GFULL=HF;   // the opening no longer shrinks, so the meadow is grown at its own height
  const deep=MODE==='lockup',d0=(deep?(phone?8:10):(phone?10:12))*(window.sogShapes?sogShapes.scale():1),   // each style's piece has its own size: bigger pieces, fewer of them
    band=HF*(deep?(NIGHT?(phone?.30:.28):(phone?.40:.38)):(phone?.27:.25)),cols=Math.floor(W/d0),rows=Math.floor(band/d0),n=cols*rows,r=rnd(7);
  grass={n,d0,x:new Float32Array(n),y:new Float32Array(n),vx:new Float32Array(n),vy:new Float32Array(n),a:new Float32Array(n),px:new Float32Array(n),py:new Float32Array(n),len:new Float32Array(n),seed:new Uint8Array(n),
    head:new Int32Array(Math.ceil(W/d0+2)*Math.ceil(H/d0+2)),next:new Int32Array(n),gw:Math.ceil(W/d0+2),N:n};
  for(let i=0;i<n;i++){const cx=i%cols,cy=Math.floor(i/cols);grass.x[i]=(cx+r())*d0;grass.y[i]=H-4-(cy+r())*d0*1.05;
    grass.len[i]=d0*(1.1+r()*.7);grass.seed[i]=r()<.12?1:0;grass.a[i]=(r()-.5)*.3;}
  ready=0;}
function lockup(phone,add,S){ // 'A design and / technology studio / for the Front Range.' as on the front page: light, bold and italic voices
  const lines=[[['A','t'],['design','b'],['and','em']],[['technology','b'],['studio','t']],[['for','em'],['the','em'],['Front','b'],['Range.','b']]];
  const FV=getComputedStyle(SEC),fv=n=>FV.getPropertyValue(n).trim(),FACE=fv('--lf-face')||'"Cormorant Garamond", Georgia, serif',FT=fv('--lf-t')||'300',FB=fv('--lf-b')||'600',FE=fv('--lf-em')||'italic 400';
  const VF={t:fv('--lf-face-t')||FACE,b:fv('--lf-face-b')||FACE,em:fv('--lf-face-em')||FACE},SER=parseFloat(fv('--lf-serif'))||1;   // a style can set a face per voice (Dew: Syne with Instrument Serif cutting in, the serif nudged up to the grotesk's size)
  const font=(v,fs)=>(v==='t'?FT:v==='b'?FB:FE)+' '+(v==='b'||VF[v]===VF.b?fs:fs*SER)+'px '+VF[v]; // each style sets its own face for the headline
  const maxW=phone?W-40:W*.5;let fs=phone?Math.min(W*.13,H*.075):Math.min(W*.068,H*.13);
  const lw=f=>Math.max(...lines.map(l=>{let w=0;for(const[t,v]of l){c.font=font(v,f);w+=c.measureText(t+' ').width;}return w;}));
  fs=Math.min(fs,fs*maxW/lw(fs));const lh=fs*(parseFloat(fv('--lf-lh'))||1.08),x0=phone?20:W*.08,y0=phone?Math.max(TOP+20,H*.13):NIGHT?TOP+H*.07:Math.max(TOP+24,H*.43-lh*1.6),gap=fs*.24;
  lines.forEach((l,li)=>{let x=x0;const by=y0+fs*.85+li*lh,w0=x;
    for(const[t,v]of l){c.font=font(v,fs);const w=c.measureText(t).width;add('w',x+w/2,by-fs*.28,Math.max(w,fs*.5)*.55,{ch:t,fs,font:font(v,fs),line:li});x+=w+gap;}
    });
  const blockH=lh*3;HEADB=y0+blockH;HEADX=[x0,x0+lw(fs)];if(NIGHT){const mw=phone?W*.44:Math.min(W*.26,340,(W-HEADX[1])*.8),mh=mw*259/351;if(phone)S(W*.5,Math.max(HEADB+mh*.7,H*.6-mh/2),mh);else S(W*.92-mw/2,y0+mh/2,mh);}else if(phone){const mh=Math.min(H*.17,W*.42);S(W*.5,y0+blockH+mh*.75,mh);}else{const mh=Math.min(blockH*1.15,W*.26);S(W*.76,y0+blockH*.5,mh);}}
function rnd(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
function size(){const r={width:SEC.offsetWidth,height:SEC.offsetHeight},bar=document.querySelector('header.bar');DPR=Math.min(W<600?1.5:2,devicePixelRatio||1);W=Math.round(r.width);H=Math.round(r.height);
  TOP=bar&&getComputedStyle(bar).position==='fixed'?Math.max(0,bar.getBoundingClientRect().height):0;SEC.style.setProperty('--lf-top',TOP+'px');cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);build();nightLayout();}
// ---- the painted night: ridges on the canvas between the moon and the meadow; the sky and stars are layers behind it
// LAY: where each ridge's picture sits at the end of the rise (share of the opening's height); K: how much lower it starts
let HEADX=[0,0],HEADB=0,RISE=still?1:0,SCENE=1,CROP='';const RID={far:{},near:{}},LAY={wide:{far:.34,near:.45},tall:{far:.40,near:.47}},K={sky:0,stars:.05,moon:0,far:.12,near:.24};
const isS=p=>p.kind==='p1'||p.kind==='p2'||p.kind==='dot';
function ridgeScale(k){const r=RID[k];if(!r.img||!r.img.complete||!r.img.naturalWidth||!W)return;const h=Math.round(W*r.img.naturalHeight/r.img.naturalWidth),o=r.off||(r.off=document.createElement('canvas'));
  o.width=Math.round(W*DPR);o.height=Math.round(h*DPR);const x=o.getContext('2d');x.drawImage(r.img,0,0,o.width,o.height);r.h=h;
  const a=x.getImageData(0,0,o.width,o.height).data,ow=o.width;let top=0;find:for(let y=0;y<o.height;y++)for(let i=0;i<ow;i+=4)if(a[(y*ow+i)*4+3]>128){top=y;break find;}   // the highest crest
  r.crest=top/DPR;const B=64;r.cols=new Array(B).fill(1e9);for(let b=0;b<B;b++){const x0=Math.floor(b*ow/B),x1=Math.floor((b+1)*ow/B);col:for(let y=0;y<o.height;y++)for(let xx=x0;xx<x1;xx+=2)if(a[(y*ow+xx)*4+3]>128){r.cols[b]=y/DPR;break col;}}const f=x.getImageData(Math.floor(ow/2),o.height-2,1,1).data;r.foot=`rgb(${f[0]},${f[1]},${f[2]})`;r.ok=true;}
function nightLayout(){if(!NIGHT)return;const crop=W/H<=.8?'tall':'wide';
  if(crop!==CROP){CROP=crop;for(const k of ['far','near']){const r=RID[k];r.ok=false;r.img=new Image();r.img.decoding='async';r.img.onload=()=>{ridgeScale(k);draw();};r.img.src=`/preview/nook/night/ridge-${k}-${crop}.webp`;}}
  else{ridgeScale('far');ridgeScale('near');}nightMoon();}
function nightMoon(){if(!NIGHT)return;const d=(1-RISE)*K.moon*H;for(const p of pieces){if(!isS(p))continue;if(p.hy0===undefined)p.hy0=p.hy;p.hy=p.hy0+d;if(still)p.y=p.hy;}}
const ridgeTop=k=>(LAY[CROP||'wide'][k]+(1-RISE)*K[k])*H;
const crestUnder=(k,x0,x1)=>{const r=RID[k];if(!r.cols||!W)return ridgeTop(k)+(r.crest||0);const B=r.cols.length;let m=1e9;for(let b=Math.max(0,Math.floor(x0/W*B));b<=Math.min(B-1,Math.floor(x1/W*B));b++)m=Math.min(m,r.cols[b]);return ridgeTop(k)+m;};
function drawRidges(){if(!NIGHT||SCENE<.01)return;c.save();c.setTransform(DPR,0,0,DPR,0,0);c.globalAlpha=SCENE;
  for(const k of ['far','near']){const r=RID[k];if(!r.ok)continue;const y=ridgeTop(k);c.drawImage(r.off,0,y,W,r.h);if(y+r.h<H){c.fillStyle=r.foot;c.fillRect(0,y+r.h-1,W,H-y-r.h+1);}}
  c.restore();}
// ---- physics: the pointer is a moving body; pieces are knocked by its speed and pulled home by a spring
function step(dt,T){const R=Math.max(90,Math.min(W,H)*.16),sp=Math.hypot(ptr.vx,ptr.vy);
  for(const p of pieces){if(p.kind==='w')continue; // the headline's words stay still
    const dx=p.x-ptr.x,dy=p.y-ptr.y,d=Math.hypot(dx,dy)||1,reach=R+p.r;
    const hit=Math.min(1.6,Math.max(0,sp-40)*.02);if(ptr.on&&hit>0&&d<reach){const f=(1-d/reach)*hit;p.vx+=dx/d*f*30*dt+ptr.vx*f*.006;p.vy+=dy/d*f*30*dt-f*40*dt+ptr.vy*f*.006;p.va+=(dx*ptr.vy-dy*ptr.vx)/(d*d+900)*f*(p.kind==='ch'?.35:p.kind==='w'?.22:.08);}
    p.vx+=(p.hx-p.x)*20*dt;p.vy+=(p.hy-p.y)*20*dt;const up=Math.round(p.a/6.2832)*6.2832;p.va+=-(p.a-up)*20*dt;p.va=Math.max(-1.5,Math.min(1.5,p.va));const k=Math.pow(6e-6,dt);p.vx*=k;p.vy*=k;p.va*=k;p.x+=p.vx*dt*10;p.y+=p.vy*dt*10;p.a+=p.va*dt*10;
    if(Math.abs(p.x-p.hx)+Math.abs(p.y-p.hy)<.25&&Math.abs(p.a-up)<.002&&Math.abs(p.vx)+Math.abs(p.vy)+Math.abs(p.va)*50<.5){p.x=p.hx;p.y=p.hy;p.a=p.va=p.vx=p.vy=0;}}
  for(let li=0;li<3;li++){const q=pieces.find(q=>q.kind==='rule'&&q.line===li);RULE[li]+=(((q&&ptr.on&&Math.abs(ptr.y-q.hy)<(MODE==='lockup'?H*.09:H*.18))?1:0)-RULE[li])*Math.min(1,dt*6);}
  const g=grass;if(ptr.down)ptr.held+=dt;
  if(ptr.down&&(!ptr.touch||(ptr.held>.3&&sp<150)))ptr.acc+=dt*(W<600?160:280);
  if(FM>.3){ptr.burst=0;ptr.acc=0;}const shots=ptr.burst+Math.floor(ptr.acc);ptr.acc-=Math.floor(ptr.acc);ptr.burst=0;for(let k=0;k<shots;k++)shoot(g,sp);
  if(H<GFULL-2)return; // while the opening is shrunk the grass is held still, so it is never squeezed
  const sub=Math.min(4,Math.max(1,Math.round(dt*120)));for(let k=0;k<sub;k++)fluid(g,1/120,FM>.3?0:R);fieldStep(dt);}
function shoot(g,sp){let b=0,by=-1;for(let k=0;k<24;k++){const i=Math.random()*g.n|0;if(g.y[i]>by){by=g.y[i];b=i;}} // a grain from deep in the heap
  const dir=sp>200?Math.atan2(ptr.vy,ptr.vx):-Math.PI/2,a=dir+(Math.random()-.5)*.9,v=650+Math.random()*700+Math.min(sp,1500)*.4;
  g.x[b]=ptr.x+(Math.random()-.5)*10;g.y[b]=ptr.y+(Math.random()-.5)*10;g.vx[b]=Math.cos(a)*v;g.vy[b]=Math.sin(a)*v;g.a[b]=Math.atan2(g.vx[b],-g.vy[b]);}
function fluid(g,dt,R){ // position-based grains: forces move them, then they are pushed a blade apart so the heap keeps its height
  const n=g.n,d0=g.d0,G=1500,PR=R*.85,sp=Math.hypot(ptr.vx,ptr.vy),px0=g.px,py0=g.py;
  for(let i=0;i<n;i++){g.vy[i]+=G*dt;
    if(ptr.on){const dx=g.x[i]-ptr.x,dy=g.y[i]-ptr.y,d2=dx*dx+dy*dy;if(d2<PR*PR){const d=Math.sqrt(d2)||1,f=1-d/PR;
      // scoop: grains take on the pointer's motion and are lifted with it; a slow pointer only shoulders them aside (a bow wave)
      g.vx[i]+=(ptr.vx-g.vx[i])*f*.35+dx/d*f*90;g.vy[i]+=(ptr.vy-g.vy[i])*f*.35+dy/d*f*90-f*Math.min(sp,2500)*.35;}}
    px0[i]=g.x[i];py0[i]=g.y[i];g.x[i]+=g.vx[i]*dt;g.y[i]+=g.vy[i]*dt;}
  const need=g.gw*Math.ceil(H/d0+2);if(g.head.length<need)g.head=new Int32Array(need); // the grid grows with the opening, or tall heaps lose their collisions and flatten
  const gw=g.gw,head=g.head,next=g.next;
  for(let it=0;it<3;it++){head.fill(-1);
    for(let i=0;i<n;i++){const cx=Math.max(0,Math.min(gw-1,(g.x[i]/d0|0)+1)),cy=Math.max(0,(g.y[i]/d0|0)+1),h=cy*gw+cx;if(h<head.length){next[i]=head[h];head[h]=i;}else next[i]=-1;}
    for(let i=0;i<n;i++){const cx=Math.max(0,Math.min(gw-1,(g.x[i]/d0|0)+1)),cy=Math.max(0,(g.y[i]/d0|0)+1);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const h=(cy+oy)*gw+cx+ox;if(h<0||h>=head.length)continue;
        for(let j=head[h];j>=0;j=next[j]){if(j<=i)continue;const dx=g.x[j]-g.x[i],dy=g.y[j]-g.y[i],d2=dx*dx+dy*dy;if(d2>=d0*d0)continue;
          const d=Math.sqrt(d2)||.01,push=(d0-d)*.5/d,ex=d2?dx*push:.3,ey=d2?dy*push:0;g.x[i]-=ex;g.y[i]-=ey;g.x[j]+=ex;g.y[j]+=ey;}}}
    for(let i=0;i<n;i++){if(g.y[i]>H-3)g.y[i]=H-3;if(g.y[i]<2)g.y[i]=2;if(g.x[i]<2)g.x[i]=2;if(g.x[i]>W-2)g.x[i]=W-2;}}
  for(let i=0;i<n;i++){const v0=Math.hypot(g.vx[i],g.vy[i]);g.vx[i]=(g.x[i]-px0[i])/dt*.995;g.vy[i]=(g.y[i]-py0[i])/dt*.995;if(g.y[i]>=H-3)g.vx[i]*=.85; // the ground holds grains back
    const v1=Math.hypot(g.vx[i],g.vy[i]),near=ptr.on&&Math.abs(g.x[i]-ptr.x)<PR*2.5&&Math.abs(g.y[i]-ptr.y)<PR*2.5,cap=near?1e9:v0+120;
    if(v1>cap){g.vx[i]*=cap/v1;g.vy[i]*=cap/v1;}else if(v1<90&&g.y[i]>H*.45){const k=v1<30?.7:.92;g.vx[i]*=k;g.vy[i]*=k;}}
  for(let i=0;i<n;i++){ // a blade lies along its flight and stands back up once it lands
    const v=Math.hypot(g.vx[i],g.vy[i]),want=v>60?Math.atan2(g.vx[i],-g.vy[i]):Math.sin(g.x[i]*.05)*.18,da=((want-g.a[i]+Math.PI*3)%(Math.PI*2))-Math.PI;g.a[i]+=da*Math.min(1,dt*(v>60?14:5));}}
// ---- drawing: one flat ground, white everything
const meadowGreens=(col)=>{col=col.trim();let r,g2,b;const hx=/^#([0-9a-f]{6})$/i.exec(col);if(hx){r=parseInt(col.slice(1,3),16);g2=parseInt(col.slice(3,5),16);b=parseInt(col.slice(5,7),16);}else{const m=col.match(/\d+(\.\d+)?/g)||[90,120,80];r=+m[0];g2=+m[1];b=+m[2];}
  r/=255;g2/=255;b/=255;const mx=Math.max(r,g2,b),mn=Math.min(r,g2,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=mx===r?((g2-b)/d)%6:mx===g2?(b-r)/d+2:(r-g2)/d+4;h*=60;if(h<0)h+=360;}
  // like Primavera's meadow: the same grass in several greens, shifted in hue as well as light (olive, sap, deep, cool)
  return[[0,0,0],[-14,.05,-.12],[16,-.08,.08],[-6,.1,-.2],[28,-.12,.02],[8,0,.14]].map(([dh,ds,dl])=>`hsl(${(h+dh+360)%360} ${Math.max(0,Math.min(100,(s+ds)*100))}% ${Math.max(4,Math.min(92,(l+dl)*100))}%)`);};
const pieceDraw=(c,g,COL,FL)=>{if(!(window.sogShapes&&sogShapes.draw(c,g,COL,FL)))meadowDraw(c,g,COL,FL);};   // each style's piece; Dew (and custom schemes) keep the blades
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
// the S's fill: each style can ask for flat ink (default), glass, rising blue light, or a meadow (set --lf-mark-fill on .lf)
let MFILL='',RIM='';
function markFill(path,key){const m=MFILL;
  if(m==='outline'){const t=c.getTransform();c.lineWidth=5*DPR/Math.hypot(t.a,t.b);c.lineJoin='round';c.strokeStyle=MARKC;c.stroke(path);}   // the night's S: a cream outline, 5px at any size
  else if(m==='glass'){const gr=c.createLinearGradient(0,40,0,310);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(.45,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(255,255,255,.03)');
    c.fillStyle=gr;c.fill(path);c.lineWidth=3;c.strokeStyle=RIM||'rgba(167,202,255,.95)';c.stroke(path);c.lineWidth=1.2;c.strokeStyle='rgba(255,255,255,.55)';c.save();c.translate(0,-1.5);c.stroke(path);c.restore();}
  else if(m==='light'){const gr=c.createLinearGradient(0,40,0,310);gr.addColorStop(0,'#030A1C');gr.addColorStop(.35,'#00358A');gr.addColorStop(.7,'#0068F0');gr.addColorStop(1,'#7DB8FF');
    c.fillStyle=gr;c.fill(path);c.lineWidth=2.4;c.strokeStyle=RIM||'#A7CAFF';c.stroke(path);}
  else if(m==='glow'){const t=(window.sogSpot&&window.sogSpot.tint)||[242,190,104],tc=`rgb(${t[0]|0},${t[1]|0},${t[2]|0})`;   // Dusk: the S is a lamp, its glow takes the spotlight's drifting hue
    c.save();c.shadowColor=tc;c.shadowBlur=60;c.fillStyle=tc;c.fill(path);c.shadowBlur=22;c.fill(path);c.restore();
    const gr=c.createLinearGradient(0,40,0,310);gr.addColorStop(0,'#FFF8EA');gr.addColorStop(.6,`rgb(${255-(255-t[0])*.35|0},${255-(255-t[1])*.35|0},${255-(255-t[2])*.35|0})`);gr.addColorStop(1,tc);c.fillStyle=gr;c.fill(path);}
  else if(m==='chalk'){c.fillStyle='#EEF1EA';c.fill(path);}
  else if(m==='meadow'){c.fillStyle='#1E3319';c.fill(path);c.save();c.clip(path);const FL=['#F3E7B0','#E8C34A','#7FA3D6','#C0603F','#4A7A3C','#6F9A52','#2E5226'];
    for(let i=0;i<520;i++){const x=40+((i*97.3)%360),y=40+((i*57.7)%270),k=i%FL.length;c.fillStyle=FL[k];c.beginPath();
      if(k>=4){c.ellipse(x,y,1.6,7,((i*1.3)%1-.5)*.8,0,Math.PI*2);}else{for(let p=0;p<6;p++){const t=p*Math.PI/3;c.moveTo(x+Math.cos(t)*4.2,y+Math.sin(t)*4.2);c.ellipse(x+Math.cos(t)*2.4,y+Math.sin(t)*2.4,2.3,1.2,t,0,Math.PI*2);}}c.fill();}
    c.restore();c.lineWidth=2;c.strokeStyle='#4A7A3C';c.stroke(path);}
  else{c.fillStyle=MARKC;c.fill(path);}}
// ---- the field: the same blades, re-set to another harmony. FIELD names it, FM is how far they've gone (0 meadow .. 1 there)
let MF=null,GRECT=null,FIELD='grid',FM=0,FTW=0,FTH=0,fox=null,foy=null,fT=null;const FTS={};
function plotRect(){ // Websites: the words sit on the dark above the lawn, like the title card before them
  const wide=W>=1000,lawn=H*(wide?.27:.24),top=TOP+20,bot=H-lawn-24,pw=wide?Math.min(W*.72,1040):W-36;
  GRECT={x:(W-pw)/2,y:top,w:pw,h:Math.max(300,bot-top),lawn};return GRECT;}
function markTargets(){ // Brand: the mark is mown into the meadow. Blades cover the room beside the words evenly, except inside the S, which is left as cut ground: the shape is held by the mass round it, not by a line of blades
  const g=grass,n=g.n,wide=W>=1000,F=wide&&MF&&MF.w>200&&!MF.h?MF:null,V=!wide&&MF&&MF.h?MF:null,room=F?F.w*.9:(wide?W*.44:W*.88),hS=V?Math.min(V.h*.9,room/1.357):Math.min((H-TOP)*(wide?.8:.62),room/1.357),sc=hS/258.56,wS=350.94*sc,ox=F?F.x+(F.w-wS)/2:wide?Math.max(24,(W*.5-wS)/2+W*.02):(W-wS)/2,oy=V?V.y+(V.h-hS)/2:TOP+(H-TOP-hS)/2;   // on a wide screen the S grows in the room the Brand words leave, never under them   // beside the card on a wide screen, behind it on a narrow one
  const k=.25,cw=Math.ceil(wS*k),ch=Math.ceil(hS*k),oc=document.createElement('canvas');oc.width=cw;oc.height=ch;const x=oc.getContext('2d');
  x.setTransform(sc*k,0,0,sc*k,-43.63*sc*k,-44.56*sc*k);x.fill(P1);x.fill(P2);const d=x.getImageData(0,0,cw,ch).data,I=(a,b)=>a>=0&&b>=0&&a<cw&&b<ch&&d[(b*cw+a)*4+3]>127;
  const T={x:new Float32Array(n),y:new Float32Array(n),a:new Float32Array(n),dl:new Float32Array(n)},hs=i=>((i*2654435761)>>>0)/4294967296;
  const hal=(i,b)=>{let f=1,r=0;while(i>0){f/=b;r+=f*(i%b);i=Math.floor(i/b);}return r;};
  const M=(px,py)=>{const a=Math.floor((px-ox)*k),b=Math.floor((py-oy)*k);return I(a,b)||I(a+1,b)||I(a-1,b)||I(a,b+1)||I(a,b-1);};   // inside the S, with a hair of margin
  const x0=0,x1=F?F.x+F.w+40:W,y0=TOP,y1=H,FR=F?Math.min(240,(x1-x0)*.3):0;let q=1;
  const thin=(px,q)=>{if(!FR)return false;const t=(px-(x1-FR))/FR;return t>0&&hs(q*7+1)<Math.pow(t,.9);};   // toward the words the meadow thins out, so it fades instead of stopping in a hard edge
  for(let i=0;i<n;i++){const L=g.len[i]||g.d0*1.4,a=(hs(i+3)-.5)*.34;let px,py,tries=0;
    do{px=x0+hal(q,2)*(x1-x0);py=y0+hal(q,3)*(y1-y0+L*.6);q++;tries++;}
    while(tries<400&&(thin(px,q)||M(px,py)||M(px+Math.sin(a)*L*.5,py-Math.cos(a)*L*.5)||M(px+Math.sin(a)*L,py-Math.cos(a)*L)));   // nothing roots where any part of it would stand in the cut
    T.x[i]=px;T.y[i]=py;T.a[i]=a;T.dl[i]=Math.min(1,Math.max(0,1-(py-TOP)/(H-TOP))*.85+hs(i+11)*.15);}   // it rises from the ground up
  return T;}
// Creative tech: the blades become a visualizer, after the Live visuals synth's scenes (Spirograph Sludge, Portal Punch,
// Bouncy Castle). It plays at 120 BPM, its colour cycles, the pointer's height turns the main knob, a press triggers a hit.
const VZ={free:null,size:.6,hue2:40,trails:false,cycle:false,t:0,ph:0,bt:0,trig:0,k:.5,kT:.5,spin:.3,hue:12,bpm:120,scene:0,prev:0,mx:1,beat:0,lv:new Float32Array(22)};
function vizTargets(T,dt){const g=grass,n=g.n,F=VZ.free,fx=F?F.x:0,fw=F?F.w:W,fy=F&&F.h?F.y:TOP,fh=F&&F.h?F.h:H-TOP,cx=fx+fw/2,cy=fy+fh*.5,R=Math.min(fw*.44,fh*.42)*(.55+VZ.size*.75);   // centred in the room the card leaves
  VZ.t+=dt;VZ.ph+=dt*(.15+VZ.spin*2.4);VZ.bt+=dt*VZ.bpm/60;VZ.trig*=Math.pow(.02,dt);VZ.k+=(VZ.kT-VZ.k)*Math.min(1,dt*6);VZ.mx=Math.min(1,VZ.mx+dt*1.4);
  if(VZ.cycle){VZ.hue=(VZ.hue+dt*30)%360;VZ.hue2=(VZ.hue2+dt*30)%360;}
  const t=VZ.ph,beat=Math.exp(-(VZ.bt%1)*7),hit=VZ.trig,P=Math.PI,s0=VZ.prev,s1=VZ.scene,mm=VZ.mx*VZ.mx*(3-2*VZ.mx);VZ.beat=beat;   // the controls set the knob, spin, tempo, colour and scene; time only carries the shapes along
  for(let c=0;c<VZ.lv.length;c++)VZ.lv[c]=(.35+.55*Math.abs(Math.sin(c*.55+t*(1.2+VZ.k*2)))*(.6+.4*Math.sin(c*1.7-t*.9)))*(1+beat*.25+hit*.6);
  const pet=3+Math.round(VZ.k*6),cols=24,rows=Math.ceil(n/cols);
  const at=(sc,i,o)=>{const u=i/n;
    if(sc===0){const th=u*P*2*9,r=R*(.42+.5*Math.abs(Math.cos(pet*.5*th+t*.6)))*(1+beat*.06+hit*.25);o[0]=cx+Math.cos(th+t*.15)*r;o[1]=cy+Math.sin(th+t*.15)*r;o[2]=th+t*.15;}   // a spirograph rose; the knob sets the petals
    else if(sc===1){const ring=Math.floor(u*7),q=(u*7)%1,gr=((t*.35+ring/7)%1),half=R*(.12+gr*.95)*(1+hit*.3),side=Math.floor(q*4),e=(q*4)%1,ang=t*.2+ring*.08*(VZ.k-.5)*4;   // squares radiating out of the middle
      const lx=side===0?-half+e*2*half:side===1?half:side===2?half-e*2*half:-half,ly=side===0?-half:side===1?-half+e*2*half:side===2?half:half-e*2*half,ca=Math.cos(ang),sa=Math.sin(ang);
      o[0]=cx+lx*ca-ly*sa;o[1]=cy+lx*sa+ly*ca;o[2]=(side%2?0:P/2)+ang;}
    else{const c=i%cols,rw=Math.floor(i/cols),bw=R*2/cols,lv=(.35+.55*Math.abs(Math.sin(c*.55+t*(1.2+VZ.k*2)))*(.6+.4*Math.sin(c*1.7-t*.9)))*(1+beat*.25+hit*.6),hmax=R*1.9*Math.min(1,lv),y=rw/rows*R*1.9;   // bars bouncing to the beat
      const yy=Math.min(y,hmax);o[0]=cx-R+(c+.5)*bw;o[1]=cy+R*.95-Math.round(yy/(R*.06))*(R*.06);o[2]=P/2;}};   // flat, in steps: a level meter
  const a=[0,0,0],b=[0,0,0];if(VZ.mx>=1)VZ.prev=VZ.scene;
  for(let i=0;i<n;i++){at(s0,i,a);if(s0!==s1){at(s1,i,b);a[0]+=(b[0]-a[0])*mm;a[1]+=(b[1]-a[1])*mm;let d=b[2]-a[2];d-=Math.round(d/P)*P;a[2]+=d*mm;}T.x[i]=a[0];T.y[i]=a[1];T.a[i]=a[2];}}
function vizColor(){const h=(VZ.hue+VZ.beat*12)%360,s=.72,l=.58,k=x=>(x+h/30)%12,f=x=>l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k(x)-3,9-k(x),1));
  const m=GRASS.match(/^#([0-9a-f]{6})$/i),g0=m?[1,3,5].map(j=>parseInt(GRASS.slice(j,j+2),16)):[90,140,80],mixk=Math.min(1,FM*1.4);
  return `rgb(${[f(0),f(8),f(4)].map((v,j)=>Math.round(g0[j]+(v*255-g0[j])*mixk)).join(',')})`;}
function fieldTargets(){const g=grass;if(!g)return;if(FTW!==W||FTH!==H){for(const k in FTS)delete FTS[k];FTW=W;FTH=H;}
  if(!fox||fox.length!==g.n){fox=new Float32Array(g.n);foy=new Float32Array(g.n);}
  if(!FTS[FIELD]){if(FIELD==='viz'){const n=g.n,T={x:new Float32Array(n),y:new Float32Array(n),a:new Float32Array(n),dl:new Float32Array(n)};for(let i=0;i<n;i++)T.dl[i]=((i*7919)%1000)/1000;vizTargets(T,0);FTS.viz=T;}
  else FTS[FIELD]=FIELD==='mark'?markTargets():gridTargets();}fT=FTS[FIELD];}
function gridTargets(){ // the meadow stays where it is and is mown into a level lawn: every blade upright, one even height, cut in a single pass from left to right
  const g=grass,n=g.n,R=plotRect(),band=R.lawn,cols=Math.max(1,Math.round(Math.sqrt(n*W/band))),rows=Math.ceil(n/cols),hs=i=>((i*2654435761)>>>0)/4294967296;
  const fT={x:new Float32Array(n),y:new Float32Array(n),a:new Float32Array(n),dl:new Float32Array(n)};
  const order=new Uint32Array(n);for(let i=0;i<n;i++)order[i]=i;for(let i=n-1;i>0;i--){const j=(i*2654435761>>>0)%(i+1);const t=order[i];order[i]=order[j];order[j]=t;}
  for(let k=0;k<n;k++){const i=order[k],c=k%cols,r=Math.floor(k/cols),L=g.len[i]||g.d0*1.4;
    const x=(c+.5+(hs(i+5)-.5)*.8)/cols*W,y=H-(r+.5+(hs(i+9)-.5)*.6)/rows*(band-L)+2;   // feet spread through the band; tips stop at one clean line
    fT.x[i]=x;fT.y[i]=y;fT.a[i]=(hs(i+3)-.5)*.12;fT.dl[i]=Math.min(1,Math.max(0,x/W*.9+hs(i+11)*.1));}
  return fT;}
function fieldStep(dt){if(FM<.002||!fT)return;if(FIELD==='viz'){if(ptr.down&&!VZ.held){VZ.trig=1;}VZ.held=ptr.down;vizTargets(fT,dt);}const g=grass,n=g.n,R=Math.max(70,Math.min(W,H)*.14),k=Math.min(1,dt*7);   // the grid bends away from the pointer, and springs back
  for(let i=0;i<n;i++){let tx=0,ty=0;if(ptr.on){const dx=fT.x[i]-ptr.x,dy=fT.y[i]-ptr.y,d2=dx*dx+dy*dy;if(d2<R*R*4){const d=Math.sqrt(d2)||1,f=Math.exp(-d2/(R*R))*R*.45;tx=dx/d*f;ty=dy/d*f;}}
    fox[i]+=(tx-fox[i])*k;foy[i]+=(ty-foy[i])*k;}}
function withField(fn){ // draw the blades part-way (or all the way) into the field, each leaving at its own moment
  const g=grass;if(FM<.002){fn();return;}if(!fT||FTW!==W||FTH!==H||FTS[FIELD]!==fT)fieldTargets();if(!fT){fn();return;}const n=g.n,sx=g.x.slice(0,n),sy=g.y.slice(0,n),sa=g.a.slice(0,n);
  for(let i=0;i<n;i++){const dl=fT.dl[i],m0=Math.min(1,Math.max(0,FM*1.7-dl*.7)),m=m0*m0*(3-2*m0);
    const ox=fox[i],oy=foy[i],tx=fT.x[i]+ox,ty=fT.y[i]+oy,ta=fT.a[i]+(fT.a[i]?oy:-ox)*.012;
    let da=ta-sa[i];da-=Math.round(da/Math.PI)*Math.PI;   // a blade lying along a line can point either way
    g.x[i]=sx[i]+(tx-sx[i])*m;g.y[i]=sy[i]+(ty-sy[i])*m;g.a[i]=sa[i]+da*m;}
  fn();g.x.set(sx);g.y.set(sy);g.a.set(sa);}
let TITLE=1;function draw(){c.setTransform(DPR,0,0,DPR,0,0);if(VZ.trails&&FIELD==='viz'&&FM>.9){c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.16)';c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';}else c.clearRect(0,0,W,H);   // trails: last frames fade instead of vanishing
  c.fillStyle=INK;c.strokeStyle=INK;
  if(NIGHT){drawRidges();for(const p of pieces)if(isS(p)){p.x=p.hx;p.y=p.hy;p.a=0;p.vx=p.vy=p.va=0;}}   // the night: ridges behind the words and the S; the S stays still
  {for(const p of pieces){if(TITLE<.01)break;c.save();c.globalAlpha=TITLE;c.translate(p.x,p.y);c.rotate(p.a);
    if(p.kind==='p2'){c.setTransform(DPR,0,0,DPR,0,0);c.translate(p.x,p.y);c.rotate(p.a);c.scale(p.sc,p.sc);c.translate(-219,-174+36.26);markFill(P2,'p2');c.fillStyle=INK;}
    else if(p.kind==='p1'){c.setTransform(DPR,0,0,DPR,0,0);c.translate(p.x,p.y);c.rotate(p.a);c.scale(p.sc,p.sc);c.translate(-219,-174-36.26);markFill(P1,'p1');c.fillStyle=INK;}
    else if(p.kind==='dot'){c.setTransform(DPR,0,0,DPR,0,0);c.translate(p.x,p.y);c.rotate(p.a);c.scale(p.sc,p.sc);c.translate(-357.983,-86.686);markFill(DOT);c.fillStyle=INK;}
    else if(p.kind==='ch'||p.kind==='w'){c.font=p.font;c.textAlign='center';c.textBaseline='alphabetic';c.fillText(p.ch,0,p.fs*(p.kind==='w'?.28:.36));}
    else if(p.kind==='rule'){const v=RULE[p.line];if(v>.02){c.globalAlpha=v*TITLE;c.fillRect(-p.w/2,-p.h/2,p.w*v,p.h);}}
    c.restore();}}
  const g=grass;if(ready<15)return;c.fillStyle=GRASS;c.strokeStyle=GRASS;c.strokeStyle=GRASS;c.beginPath();
  c.lineCap="round";withField(()=>pieceDraw(c,g,FIELD==='viz'&&FM>.002?vizColor():GRASS,FIELD==='viz'&&FM>.5?[`hsl(${VZ.hue2|0} 80% 66%)`,`hsl(${(VZ.hue2+40)|0} 80% 72%)`]:(getComputedStyle(SEC).getPropertyValue('--lf-flowers').trim()||'#F3E7B0,#E8C34A,#6F8FB8,#B8553A').split(',').map(x=>x.trim())));}
function frame(now){const dt=last?Math.min(.033,(now-last)/1000):.016;last=now;ptr.vx*=.85;ptr.vy*=.85;
  if(ready<15){if(H>=GFULL-2){for(let k=0;k<6;k++)fluid(grass,1/120,0);ready++;if(ready===15)SEC.classList.add('grown');}else step(dt,now/1000);}else step(dt,now/1000); // a meadow grown part-way down waits to settle until the opening is full height // six settling steps a frame, then live
  draw();if(!still&&visible&&!SEC.classList.contains('docked'))requestAnimationFrame(frame);else{last=0;running=false;}}
// ---- input: mouse, pen and touch all move the same body; nothing happens under reduced motion
function move(e){const q=cv.getBoundingClientRect(),x=(e.clientX-q.left)*W/(q.width||W),y=(e.clientY-q.top)*H/(q.height||H);if(ptr.on){ptr.vx=ptr.vx*.5+(x-ptr.x)*.5*60;ptr.vy=ptr.vy*.5+(y-ptr.y)*.5*60;}ptr.x=x;ptr.y=y;ptr.on=true;}
const ui=e=>e.target.closest&&e.target.closest('button,a');
if(!still){SEC.addEventListener('pointermove',move);SEC.addEventListener('pointerdown',e=>{if(ui(e))return;ptr.on=false;move(e);ptr.down=true;ptr.held=0;ptr.touch=e.pointerType!=='mouse';ptr.burst+=W<600?28:40;});addEventListener('pointerup',()=>{ptr.down=false;});addEventListener('pointercancel',()=>{ptr.down=false;});SEC.addEventListener('pointerleave',()=>{ptr.on=false;ptr.x=ptr.y=-1e4;});addEventListener('pointercancel',()=>{ptr.on=false;ptr.x=ptr.y=-1e4;});SEC.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'){ptr.on=false;ptr.x=ptr.y=-1e4;}});}
// ---- the ground color (remembered)
const looks=[...SEC.querySelectorAll('.lf-looks button')];function look(k,keep){SEC.dataset.look=k;looks.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.look===k)));if(keep!==false)try{localStorage.setItem('sog-opening-look',k);}catch(e){}}
looks.forEach(b=>b.addEventListener('click',()=>look(b.dataset.look)));
let rw=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-rw)<2&&W>0&&Math.abs(SEC.offsetHeight-H)<120)return;rw=innerWidth;size();if(still){for(let k=0;k<90;k++)fluid(grass,1/120,0);ready=15;draw();}});document.fonts&&Promise.all([(getComputedStyle(SEC).getPropertyValue('--lf-t').trim()||'300')+' 40px '+(getComputedStyle(SEC).getPropertyValue('--lf-face').trim()||'Archivo'),(getComputedStyle(SEC).getPropertyValue('--lf-b').trim()||'600')+' 40px '+(getComputedStyle(SEC).getPropertyValue('--lf-face').trim()||'Archivo'),(getComputedStyle(SEC).getPropertyValue('--lf-em').trim()||'italic 400')+' 40px '+(getComputedStyle(SEC).getPropertyValue('--lf-face-em').trim()||'Archivo'),(getComputedStyle(SEC).getPropertyValue('--lf-t').trim()||'300')+' 40px '+(getComputedStyle(SEC).getPropertyValue('--lf-face-t').trim()||'Archivo'),'300 40px "Cormorant Garamond"','600 40px "Cormorant Garamond"','italic 400 40px "Cormorant Garamond"','800 40px Archivo'].map(f=>document.fonts.load(f))).then(()=>{size();if(still)draw();});
// the Mark / Lockup toggle: remembered, and #lockup or #mark opens straight onto one
const modes=[...SEC.querySelectorAll('.lf-modes button')];function mode(k,keep){MODE=k;modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===k)));if(keep!==false)try{localStorage.setItem('sog-opening-mode',k);}catch(e){}}
modes.forEach(b=>b.addEventListener('click',()=>{mode(b.dataset.mode);build();if(still)draw();}));
mode('lockup',false);
inks();['sog-theme','sog-scheme','sog-colour'].forEach(e=>document.addEventListener(e,()=>requestAnimationFrame(()=>{inks();const f=getComputedStyle(SEC).getPropertyValue('--lf-face').trim();(document.fonts&&f?document.fonts.load('400 40px '+f):Promise.resolve()).then(()=>{size();if(still){for(let k=0;k<90;k++)fluid(grass,1/120,0);ready=15;}draw();});})));
size();if(still){for(let k=0;k<90;k++)fluid(grass,1/120,0);ready=15;draw();}else requestAnimationFrame(frame);
new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!visible&&!still&&!running){visible=true;running=true;requestAnimationFrame(frame);}visible=v;}).observe(SEC);
window.sogOpening={night:(r,sc)=>{if(!NIGHT)return;r=still?1:Math.max(0,Math.min(1,r));sc=Math.max(0,Math.min(1,sc));if(Math.abs(r-RISE)<.001&&Math.abs(sc-SCENE)<.001)return;RISE=r;SCENE=sc;
    SEC.style.setProperty('--n-sky',((1-r)*K.sky*H).toFixed(1)+'px');SEC.style.setProperty('--n-stars',((1-r)*K.stars*H).toFixed(1)+'px');SEC.style.setProperty('--scene',sc.toFixed(3));nightMoon();if(still)draw();},
  nightInfo:()=>{const S=pieces.filter(p=>p.kind==='p1'||p.kind==='p2'),SA=pieces.filter(isS),o=k=>(1-RISE)*K[k]*H,L=window.sogNightLayers?sogNightLayers.info():{},bx=SA.length?{x0:Math.round(Math.min(...SA.map(p=>p.x-p.r))),x1:Math.round(Math.max(...SA.map(p=>p.x+p.r))),y0:Math.round(Math.min(...SA.map(p=>p.y-p.r))),y1:Math.round(Math.max(...SA.map(p=>p.y+p.r)))}:null;return{...L,mark:MFILL,markAlpha:TITLE,markBox:bx,moonX:S.length?S.reduce((a,p)=>a+p.hx,0)/S.length:0,headRight:HEADX[1],ready:NIGHT&&!!L.ready&&RID.far.ok&&RID.near.ok,crop:CROP,still,ridges:NIGHT&&!!RID.far.ok&&!!RID.near.ok,scene:SCENE,rise:RISE,
    off:{sky:o('sky'),stars:o('stars'),moon:o('moon'),far:o('far'),near:o('near')},headBottom:HEADB,moonY:S.length?S.reduce((a,p)=>a+p.hy,0)/S.length:0,farCrest:crestUnder('far',HEADX[0],HEADX[1]),nearCrest:(()=>{const xs=S.map(p=>p.hx);return S.length?crestUnder('near',Math.min(...xs)-20,Math.max(...xs)+20):ridgeTop('near');})()};},
  viz:VZ,vizFree:(r)=>{VZ.free=r;},
  effectInfo:()=>{const f=FM>.3?FIELD:null,room=f==='viz'&&VZ.free&&VZ.free.h?{x:VZ.free.x,y:VZ.free.y,w:VZ.free.w,h:VZ.free.h}:f==='mark'&&MF&&MF.h?{x:MF.x,y:MF.y,w:MF.w,h:MF.h}:null;return{field:f,room,text:window.sogChapterText?sogChapterText(f):null};},markFree:(r)=>{if(MF&&r&&Math.abs(MF.x-r.x)<2&&Math.abs(MF.w-r.w)<2&&Math.abs((MF.y||0)-(r.y||0))<24&&Math.abs((MF.h||0)-(r.h||0))<24)return;if(!MF&&!r)return;MF=r;delete FTS.mark;if(FIELD==='mark')fT=null;},gridRect:()=>{if(W)plotRect();return GRECT;},field:(name,m)=>{if(name&&name!==FIELD){FIELD=name;fT=null;}m=Math.max(0,Math.min(1,m));if(Math.abs(m-FM)<.002)return;FM=m;if(m>0&&!fT&&grass)fieldTargets();if(still)draw();},title:(a)=>{if(Math.abs(a-TITLE)<.002)return;TITLE=a;if(still)draw();},grassLine:(n)=>{const g=grass,out=new Array(n).fill(1e9);if(!g||ready<15)return out;const cols=Array.from({length:n},()=>[]);for(let i=0;i<g.n;i++){if(Math.abs(g.y[i]-g.py[i])>.6||Math.abs(g.x[i]-g.px[i])>.6)continue;const k=Math.min(n-1,Math.max(0,Math.floor(g.x[i]/W*n)));cols[k].push(g.y[i]-g.len[i]*.6);}return cols.map(a=>{if(a.length<12)return 1e9;a.sort((x,y)=>x-y);return a[Math.min(a.length-1,10)];});},fit:()=>{if(!W)return;KEEPG=H;size();KEEPG=0;if(still)draw();},wake:()=>{if(!still&&!running){running=true;requestAnimationFrame(frame);}},poke:(x,y,vx,vy)=>{ptr.x=x;ptr.y=y;ptr.vx=vx;ptr.vy=vy;ptr.on=true;},
  // for the settle check: how far the furthest piece is from home, in px and degrees
  drift:()=>pieces.reduce((m,p)=>({px:Math.max(m.px,Math.hypot(p.x-p.hx,p.y-p.hy)),deg:Math.max(m.deg,Math.abs(p.a-Math.round(p.a/6.2832)*6.2832)*180/Math.PI)}),{px:0,deg:0}),
  words:()=>{const q=SEC.getBoundingClientRect();return pieces.filter(p=>p.kind==='w'||p.kind==='ch'||p.kind==='p1').map(p=>[p.hx+q.left,p.hy+q.top]);},ready:()=>ready>=15};
})();
