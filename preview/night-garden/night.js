/* Night garden: the real sky over Berthoud (15 Aug 2026, 9:30 pm, facing south-southwest) and the Milky Way pouring
   down past the horizon as a river through the live meadow.
   - Stars: 1,433 entries from the Yale Bright Star Catalogue, at their real altitude and azimuth; size from magnitude,
     a slight warm/cool tint from their B-V colour. No twinkle, no glow: each dot is a real star.
   - Milky Way: its real outline (five brightness levels) as flat matte layers. Gold traces only the river's edges.
   - Below the horizon the band's real path carries on in perspective, so the river runs on into the meadow; blades of the
     live meadow (live-grass.js) that stand in the river are drawn in the river's colours. Sky and grass, one movement.
   - Gold marks: three named stars only (Altair, Antares, Arcturus).
   Data: d3-celestial (c) 2015 Olaf Frohn, BSD 3-clause (see STAR-DATA-LICENSE.txt). */
(()=>{
const hero=document.querySelector('.ng-hero'),cv=document.getElementById('sky'),c=cv.getContext('2d');
const meadowEl=document.querySelector('.ng-meadow');
const test=document.createElement('canvas').getContext('2d');   // for "is this blade in the river?"
let D=null,W=0,H=0,DPR=1,hor=0,sc=1,x0=0,MH=170,river=null;

function layout(){
  const r=hero.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(2,devicePixelRatio||1);
  const phone=W<700;
  MH=Math.round(Math.min(phone?190:230,H*.28));hero.style.setProperty('--meadow',MH+'px');
  hor=H-MH;                                   // the horizon sits where the meadow begins
  sc=hor/(phone?56:66);                       // px per degree: the sky from the horizon up to about 60-66 degrees
  x0=W*(phone?.24:.36);                       // where the river meets the horizon (azimuth 191, south-southwest)
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
}
// sky (alt >= 0): plain altitude/azimuth grid. Below the horizon: the band carries on toward the viewer, widening.
function P(x,a){if(a>=0)return[x0+x*sc,hor-a*sc];const t=-a/22;return[x0+x*sc*(1+Math.min(t,2)*1.8),hor+t*MH];}

function ringPath(path,ring){             // unwrap the ring across the back of the sky, then draw it and its +-360 copies
  const u=[];let off=0;for(let i=0;i<ring.length;i++){let x=ring[i][0]+off;if(i){const d=x-u[i-1][0];if(d>180){off-=360;x-=360;}else if(d<-180){off+=360;x+=360;}}u.push([x,ring[i][1]]);}
  for(const s of[-360,0,360]){if(!u.some(p=>Math.abs(p[0]+s)<140))continue;u.forEach((p,i)=>{const q=P(p[0]+s,p[1]);i?path.lineTo(q[0],q[1]):path.moveTo(q[0],q[1]);});path.closePath();}
}
const LV=['ol1','ol2','ol3','ol4','ol5'];
const FILL={ol1:'#141C2A',ol2:'#1B2536',ol3:'#243044',ol4:'#2F3C53',ol5:'#3B4A63'};   // matte layers, darkest outside
const EDGE={ol1:.85,ol3:.32,ol5:.22};                                              // gold strands on the river's edges

function draw(){
  c.setTransform(DPR,0,0,DPR,0,0);
  c.fillStyle='#0B1019';c.fillRect(0,0,W,H);
  c.fillStyle='#0A110D';c.fillRect(0,hor,W,H-hor);                                  // the ground under the meadow
  const paths={};for(const k of LV){const p=new Path2D();for(const r of D.mw[k])if(r.length>2)ringPath(p,r);paths[k]=p;}
  // the sky: the Milky Way's real outline, above the horizon only
  c.save();c.beginPath();c.rect(0,0,W,hor);c.clip();
  for(const k of LV){c.fillStyle=FILL[k];c.fill(paths[k],'evenodd');}
  c.lineJoin='round';
  for(const k in EDGE){c.strokeStyle=`rgba(201,162,78,${EDGE[k]})`;c.lineWidth=k==='ol1'?1.1:.8;c.stroke(paths[k]);}
  c.restore();
  // where the band meets the horizon (its real width there, sampled from the outline)
  test.setTransform(1,0,0,1,0,0);let L=x0,R=x0;const yy=hor-1;
  while(L>0&&test.isPointInPath(paths.ol1,L-1,yy,'evenodd'))L-=1;while(R<W&&test.isPointInPath(paths.ol1,R+1,yy,'evenodd'))R+=1;
  if(R-L<20){L=x0-40;R=x0+40;}
  {const cap=W*(W<700?.16:.12);const m=(L+R)/2;if((R-L)/2>cap){L=m-cap;R=m+cap;}}
  // the river: from that crossing it runs on down through the meadow toward us, widening, in the same five layers
  const cH=(L+R)/2,hw=(R-L)/2,dx=hw*(W<700?.6:1.1),bank=[];
  const chan=(f)=>{const p=new Path2D(),N=28,left=[],right=[];
    for(let i=0;i<=N;i++){const t=i/N,y=hor+t*(H-hor+4),cx=cH+dx*Math.pow(t,1.4)+Math.sin(t*5.2+f*2.1)*hw*.22*t*(1.2-f),w=hw*f*(1+(W<700?1.3:2.4)*t)*(1+Math.sin(t*7+f*4)*.06);left.push([cx-w,y]);right.push([cx+w,y]);}
    left.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));for(let i=right.length-1;i>=0;i--)p.lineTo(right[i][0],right[i][1]);p.closePath();
    return {p,left,right};};
  const CF={ol1:1,ol2:.78,ol3:.56,ol4:.38,ol5:.2};let ch1=null;
  for(const k of LV){const ch=chan(CF[k]);if(k==='ol1')ch1=ch;c.fillStyle=FILL[k];c.fill(ch.p);}
  c.strokeStyle='rgba(201,162,78,.85)';c.lineWidth=1.1;for(const side of[ch1.left,ch1.right]){c.beginPath();side.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();}
  const ch3=chan(CF.ol3);c.strokeStyle='rgba(201,162,78,.3)';c.lineWidth=.8;for(const side of[ch3.left,ch3.right]){c.beginPath();side.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();}
  river=ch1.p;
  // stars, brightest last
  const st=D.stars.slice().sort((a,b)=>b[2]-a[2]);
  for(const [x,a,m,bv] of st){if(a<0)continue;const q=P(x,a);if(q[0]<-4||q[0]>W+4||q[1]<-4)continue;
    const r=Math.max(.45,(6.3-m)*.42)*(W<700?.85:1),warm=Math.max(-1,Math.min(1,(bv-.6)/1.2));
    c.fillStyle=warm>0?`rgb(${236},${229-warm*28|0},${210-warm*60|0})`:`rgb(${236+warm*36|0},${229+warm*-6|0},${210-warm*30|0})`;
    c.globalAlpha=Math.min(1,.5+(6.3-m)*.12);c.beginPath();c.arc(q[0],q[1],r,0,Math.PI*2);c.fill();}
  c.globalAlpha=1;
  // three named stars, marked in gold
  c.font='500 10.5px "IBM Plex Mono",monospace';c.textBaseline='middle';
  for(const k of['Altair','Antares','Arcturus']){const n=D.named[k];if(!n||n[1]<0)continue;const [x,y]=P(n[0],n[1]);if((W>=700?x<100:x<20)||(W>=700?x>W-20:x>W-100)||y<70)continue;
    c.strokeStyle='#C9A24E';c.lineWidth=1;c.beginPath();c.moveTo(x-9,y);c.lineTo(x-4,y);c.moveTo(x+4,y);c.lineTo(x+9,y);c.moveTo(x,y-9);c.lineTo(x,y-4);c.moveTo(x,y+4);c.lineTo(x,y+9);c.stroke();
    c.fillStyle='rgba(201,162,78,.9)';const lft=W>=700;c.textAlign=lft?'right':'left';c.fillText(k.toUpperCase(),lft?x-13:x+13,y+.5);c.textAlign='left';}
  // the horizon: a single ink line where sky meets ground
  c.strokeStyle='rgba(236,229,210,.12)';c.lineWidth=1;c.beginPath();c.moveTo(0,hor+.5);c.lineTo(W,hor+.5);c.stroke();
}

/* The meadow: live-grass.js draws through this hook. Blades standing in the river take the river's colours. */
const GREENS=['#3E6B3E','#4C7A47','#335C36','#5A8650'],RIVER=['#5A6E92','#6F84A8','#4A5C7C'];
window.sogShapes={scale:()=>1.25,draw(cx,g,COL,FL){
  if(!river)return false;
  const top=hor;   // the meadow canvas starts at the horizon
  const inR=new Uint8Array(g.n);test.setTransform(1,0,0,1,0,0);
  for(let i=0;i<g.n;i++)inR[i]=test.isPointInPath(river,g.x[i],g.y[i]+top)?1:0;
  cx.lineCap='round';
  const blades=(set,cols,w)=>{for(let q=0;q<cols.length;q++){cx.strokeStyle=cols[q];cx.lineWidth=w;cx.beginPath();
    for(let i=0;i<g.n;i++){if(inR[i]!==set||g.seed[i]||(i*31)%cols.length!==q)continue;const a=g.a[i],L=g.len[i]*1.25,b=(i%7-3)*.07+a*.3,x=g.x[i]-Math.sin(a)*L*.5,y=g.y[i]+Math.cos(a)*L*.5;
      cx.moveTo(x,y);cx.quadraticCurveTo(x+Math.sin(a)*L*.6,y-Math.cos(a)*L*.6,x+Math.sin(a+b)*L,y-Math.cos(a+b)*L);}
    cx.stroke();}};
  blades(0,GREENS,1.8);blades(1,RIVER,1.8);
  // seed heads: small cream and gold flowers in the grass; in the river, a few gold flecks where the stars land
  for(let i=0;i<g.n;i++){if(!g.seed[i])continue;const a=g.a[i],L=g.len[i]*1.1,bx=g.x[i]-Math.sin(a)*L*.5,by=g.y[i]+Math.cos(a)*L*.5,tx=bx+Math.sin(a)*L,ty=by-Math.cos(a)*L;
    cx.strokeStyle=inR[i]?RIVER[0]:GREENS[1];cx.lineWidth=1.1;cx.beginPath();cx.moveTo(bx,by);cx.lineTo(tx,ty);cx.stroke();
    cx.fillStyle=inR[i]?'#C9A24E':(i%4?'#ECE5D2':'#B9C6D8');cx.beginPath();cx.arc(tx,ty,inR[i]?1.6:g.d0*.2,0,Math.PI*2);cx.fill();}
  return true;}};

async function start(){
  D=await fetch('/preview/night-garden/sky.json').then(r=>r.json());
  layout();draw();
  let rw=innerWidth,rh=innerHeight;addEventListener('resize',()=>{if(Math.abs(innerWidth-rw)<2&&Math.abs(innerHeight-rh)<80)return;rw=innerWidth;rh=innerHeight;layout();draw();});
}
start();
})();
