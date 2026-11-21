/* Home, low-poly flow (preview). Draws every plane as flat-shaded facets (SVG triangles lit from the upper left), builds the
   night's ranges and the extruded S, the soil and roots under the meadow, the poppy whose root grows down to light the lamp in
   the moss hollow, the hollow itself, and the faceted plank under the Work cards. Depth comes from layered planes: in the
   opening they spread apart as you scroll (the far ones recede, the S and the words pop); below, the far layers lag. */
(()=>{
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const rnd=s=>()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};
const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const sm=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
const hsl=(h,s,l)=>`hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${Math.max(3,Math.min(94,l)).toFixed(1)}%)`;
let uid=0;const nid=()=>'nk'+(++uid);
const svgBox=(host,w,h,x=0,y=0)=>{const s=el('svg',{class:'nk-facets',width:w,height:h,viewBox:`${x} ${y} ${w} ${h}`},host);s.style.left=x+'px';s.style.top=y+'px';return s;};
const LV=(()=>{const v=[-.45,-.6,.66],m=Math.hypot(...v);return v.map(x=>x/m);})();   // the light: upper left, in front
const poly=pts=>'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';

/* flat-shaded facets over a rectangle: a jittered grid, two triangles a cell, each lit by its own normal */
function facets(g,X,Y,w,h,cell,[H,S,Lt],o={}){const r=rnd(o.seed||3),cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell)),cw=w/cols,ch=h/rows,P=[];
  for(let j=0;j<=rows;j++){P.push([]);for(let i=0;i<=cols;i++){const ex=i===0||i===cols,ey=j===0||j===rows;
    P[j].push([X+i*cw+(ex?0:(r()-.5)*cw*.8),Y+j*ch+(ey?0:(r()-.5)*ch*.8),r()*cell*(o.z??.7)]);}}
  const tri=(a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const m=Math.hypot(...n)||1;n=n.map(x=>x/m);if(n[2]<0)n=n.map(x=>-x);const sh=n[0]*LV[0]+n[1]*LV[1]+n[2]*LV[2];
    const cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3,fy=(cy-Y)/h;
    const l=Lt+(sh-.72)*(o.amp??16)+(o.tint?o.tint(fy,cx,cy):0)+(r()-.5)*(o.noise??1.5),f=hsl(H,S,l);
    el('polygon',{points:`${a[0].toFixed(1)},${a[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`,fill:f,stroke:f,'stroke-width':.6,'stroke-linejoin':'round'},g);};
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=P[j][i],b=P[j][i+1],c=P[j+1][i+1],d=P[j+1][i];if(r()<.5){tri(a,b,c);tri(a,c,d);}else{tri(a,b,d);tri(b,c,d);}}}
function clipped(svg,d){const cid=nid(),cp=el('clipPath',{id:cid},svg);el('path',{d},cp);return el('g',{'clip-path':`url(#${cid})`},svg);}
/* a low-poly ridge: a few straight runs between peaks */
function ridge(r,x0,x1,yB,top,n,amp){const P=[[x0,yB]];for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n+(i&&i<n?(r()-.5)*(x1-x0)/n*.5:0);P.push([x,top(i/n)-(i%2?r()*amp:-r()*amp*.4)]);}P.push([x1,yB]);return P;}
/* a wandering root's centre line */
function rootLine(r,x,y,len,ang,o={}){const N=Math.max(6,Math.round(len/(o.step||18))),st=len/N,P=[[x,y]];let a=ang;
  for(let i=0;i<N;i++){a+=(r()-.5)*(o.wob??.35)+((o.toward??Math.PI/2)-a)*(o.pull??.12);x+=Math.cos(a)*st;y+=Math.sin(a)*st;if(o.xmin!==undefined)x=Math.max(o.xmin,Math.min(o.xmax,x));P.push([x,y]);}return P;}
/* a root as a faceted solid: each segment split along its length into a lit half and a shaded half */
function facetRoot(g,P,w0,w1,lit,dark){const n=P.length;const off=(i,s)=>{const p=P[i],q=P[Math.min(n-1,i+1)],o=P[Math.max(0,i-1)],dx=q[0]-o[0],dy=q[1]-o[1],m=Math.hypot(dx,dy)||1,w=(w0+(w1-w0)*i/(n-1))/2*s;return[p[0]-dy/m*w,p[1]+dx/m*w];};
  for(let i=0;i<n-1;i++){const a=P[i],b=P[i+1],la=off(i,1),lb=off(i+1,1),ra=off(i,-1),rb=off(i+1,-1),flip=false;
    el('path',{d:poly([a,b,lb,la]),fill:flip?dark:lit,stroke:flip?dark:lit,'stroke-width':.5},g);el('path',{d:poly([a,b,rb,ra]),fill:flip?lit:dark,stroke:flip?lit:dark,'stroke-width':.5},g);}}
/* a thin root: a tapered single fill with a couple of side roots */
function thinRoot(g,r,x,y,len,w,fill,o={}){(function grow(x,y,len,w,ang,depth){const P=rootLine(r,x,y,len,ang,{...o,step:12});const Lp=[],Rp=[];
    for(let i=0;i<P.length;i++){const p=P[i],q=P[Math.min(P.length-1,i+1)],pp=P[Math.max(0,i-1)],dx=q[0]-pp[0],dy=q[1]-pp[1],m=Math.hypot(dx,dy)||1,ww=w*(1-i/(P.length-1))*.5+.2;Lp.push([p[0]-dy/m*ww,p[1]+dx/m*ww]);Rp.push([p[0]+dy/m*ww,p[1]-dx/m*ww]);}
    el('path',{d:poly(Lp.concat(Rp.reverse())),fill},g);
    if(depth<2)for(let b=0;b<(depth?1:2);b++){const t=.2+r()*.5,i=Math.floor(t*(P.length-1)),s=r()<.5?-1:1;grow(P[i][0],P[i][1],len*(.3+r()*.25),w*(1-t)*.6,Math.PI/2+s*(.5+r()*.6),depth+1);}
  })(x,y,len,w,o.ang??Math.PI/2,0);}
function box(a,ref){const p=a.getBoundingClientRect(),q=ref.getBoundingClientRect();return{l:p.left-q.left,t:p.top-q.top,r:p.right-q.left,b:p.bottom-q.top,w:p.width,h:p.height};}
const octo=(x,y,rx,ry,n=8,rot=.2)=>{const P=[];for(let k=0;k<n;k++){const t=k/n*Math.PI*2+rot;P.push([x+Math.cos(t)*rx,y+Math.sin(t)*ry]);}return poly(P);};

/* ---------------- the opening ---------------- */
const night=$('opening'),planes={};night.querySelectorAll('[data-plane]').forEach(p=>planes[p.dataset.plane]=p);
const mark=night.querySelector('.nk-mark'),head=$('nk-h1');
function paintNight(){const W=night.clientWidth,H=night.clientHeight,phone=W<700,r=rnd(41),bar=document.querySelector('header.bar');
  night.style.setProperty('--nk-bar',(bar?bar.getBoundingClientRect().height:64)+'px');
  for(const k in planes)planes[k].innerHTML='';const grassH=Math.min(H*.3,250);
  // the sky: deep at the top, lifting toward the ranges in flat steps of facets
  facets(el('g',{},svgBox(planes.sky,W,H)),0,0,W,H,phone?70:110,[236,28,13],{seed:5,amp:8,tint:fy=>fy*13});
  // the far range: pale periwinkle, lit on its left faces; the near range deeper
  const farTop=t=>H*(phone?.54:.47)+Math.sin(t*Math.PI*2.2+.6)*H*.04,nearTop=t=>H*(phone?.64:.62)+Math.sin(t*Math.PI*1.6+2)*H*.035;
  {const s=svgBox(planes.far,W,H);facets(clipped(s,poly(ridge(r,-W*.05,W*1.05,H,farTop,phone?6:10,H*.07))),-W*.05,H*.18,W*1.1,H*.82,phone?60:96,[236,28,44],{seed:9,amp:16,z:1,tint:fy=>-fy*14});}
  {const s=svgBox(planes.near,W,H);facets(clipped(s,poly(ridge(r,-W*.05,W*1.05,H,nearTop,phone?5:8,H*.05))),-W*.05,H*.3,W*1.1,H*.7,phone?56:90,[236,28,27],{seed:13,amp:13,z:1,tint:fy=>-fy*10});}
  // the hill the meadow grows on
  {const s=svgBox(planes.hill,W,H),y0=H-Math.min(130,grassH*.55),P=[[-20,H+10]];for(let i=0;i<=12;i++)P.push([-20+(W+40)*i/12,y0+Math.sin(i*1.3)*12+(r()-.5)*14]);P.push([W+20,H+10]);
    facets(clipped(s,poly(P)),-20,y0-40,W+40,H-y0+60,phone?40:60,[175,20,11],{seed:17,amp:7});}
  paintMark();}
function paintMark(){const svg=mark.querySelector('svg'),ex=svg.querySelector('#nk-sx'),face=svg.querySelector('.nk-sface');ex.innerHTML='';face.innerHTML='';
  // the S as a chunky solid: its side built from stepped copies, darkest at the back; its face cut into a few pale facets
  const N=14;for(let i=N;i>=1;i--){const l=20+(N-i)*1.3;for(const p of['#nk-s1','#nk-s2'])el('use',{href:p,transform:`translate(${(i*1.05).toFixed(2)} ${(i*1.35).toFixed(2)})`,fill:hsl(244,14,l)},ex);}
  const cid=nid(),cp=el('clipPath',{id:cid},face);el('use',{href:'#nk-s1'},cp);el('use',{href:'#nk-s2'},cp);
  facets(el('g',{'clip-path':`url(#${cid})`},face),30,30,390,300,64,[350,7,80],{seed:23,amp:10,z:.5});
  for(const p of['#nk-s1','#nk-s2'])el('use',{href:p,fill:'none',stroke:'#EEE8E4','stroke-width':1.6,opacity:.7},face);}
function nightScroll(){const H=night.offsetHeight,p=still?0:Math.min(1,Math.max(0,-night.getBoundingClientRect().top/H));
  // as the night scrolls away its planes part: the far ones lag behind (recede), the S and the words run ahead (pop)
  const lag={sky:.42,far:.3,near:.18,hill:.06};for(const k in planes)planes[k].style.transform=p?`translate3d(0,${(lag[k]*p*H).toFixed(1)}px,0)`:'';
  mark.style.transform=p?`translate3d(0,${(-p*H*.12).toFixed(1)}px,0) scale(${(1+.12*p).toFixed(4)})`:'';
  head.style.transform=p?`translate3d(0,${(-p*H*.16).toFixed(1)}px,0)`:'';}

/* ---------------- under the meadow ---------------- */
const under=$('nk-under'),soil=$('nk-soil'),roots=$('nk-roots'),poppy=$('nk-poppy'),room1=$('nk-room1'),hollow=$('work');
let soilSvg=null,rootPath=null,tendrils=[],lampG=null,backIn=null,frontG=null,LAMP={x:0,y:0};
function paintUnder(){const W=under.clientWidth,Hu=under.clientHeight,phone=W<700,r=rnd(61),hb=box(hollow,under);
  soil.innerHTML='';soilSvg=svgBox(soil,W,Hu+240,0,-120);
  facets(el('g',{},soilSvg),0,-120,W,Hu+240,phone?80:120,[234,27,17],{seed:31,amp:9});
  // the lit edge where the meadow's ground is cut
  roots.innerHTML='';const rs=svgBox(roots,W,Hu);{const P=[[0,0],[W,0]];for(let i=14;i>=0;i--)P.push([W*i/14,5+r()*6]);el('path',{d:poly(P),fill:hsl(232,30,38)},rs);}
  // pale roots hanging from the cut, long down the sides, short over the words
  const h2=room1.querySelector('h2.cb-h'),cols=room1.querySelector('.cb-cols'),hh=box(h2,under),cb=box(cols,under),side=Math.max(14,cb.l);
  const brand=$('brand'),web=$('websites'),gapX=(!phone&&web&&brand)?(box(web,under).r+box(brand,under).l)/2:W-Math.max(12,side*.45);
  for(let i=0,n=Math.round(W/(phone?55:70));i<n;i++){const x=(i+.2+r()*.6)/n*W;if(Math.abs(x-gapX)<(phone?30:50))continue;const inSide=x<side-8||x>W-side+8;
    const len=inSide?(phone?120:Math.min(460,cb.t*.9))*(.5+r()*.6):(hh.t-30)*(.2+r()*r()*.7);if(len<14||(!inSide&&r()<.35))continue;
    thinRoot(el('g',{},rs),r,x,6,len,(phone?4:7)*(.6+r()*.6),i%3?hsl(246,18,36):hsl(246,20,48),inSide?{xmin:x<side?2:W-side+6,xmax:x<side?side-6:W-2,wob:.4}:{xmin:x-50,xmax:x+50});}
  // the poppy, its root, and the lamp the root carries into the hollow
  poppy.innerHTML='';const ps=svgBox(poppy,W,Hu),stemH=phone?118:176,hs=phone?1:1.5;
  const lx=phone?hb.l+hb.w*.74:gapX,ly=hb.t+(phone?78:96),xp=phone?W-30:gapX;LAMP={x:lx-hb.l,y:ly-hb.t};
  let d;if(phone){const xr=W-12;d=`M${xp} 8C${xp} 40 ${xr} 50 ${xr} 90L${xr} ${hb.t-40}C${xr} ${hb.t+10} ${lx} ${hb.t+5} ${lx} ${ly-16}`;}
  else{const y1=hh.t-40,y2=cb.t,y3=cb.b,mid=(a,b)=>(a+b)/2;d=`M${xp} 8C${xp+22} ${mid(8,y1)} ${xp-24} ${mid(8,y1)+40} ${xp-6} ${y1}C${xp+14} ${mid(y1,y2)} ${xp-10} ${mid(y1,y2)} ${xp} ${y2}C${xp+10} ${mid(y2,y3)} ${xp-10} ${mid(y2,y3)+40} ${xp+4} ${y3}C${xp+18} ${mid(y3,ly)} ${xp-14} ${mid(y3,ly)} ${lx} ${ly-16}`;}
  rootPath=el('path',{d,fill:'none',stroke:'#A99AA6','stroke-width':phone?2.6:4,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1'},ps);
  // where it reaches the hollow it spreads across the ceiling
  tendrils=[];for(let i=0;i<(phone?2:3);i++){const s=i%2?1:-1,len=(phone?50:90)+r()*(phone?30:70),P=rootLine(r,lx,hb.t+30,len,Math.PI/2+s*(1.25+r()*.2),{toward:Math.PI/2+s*1.2,pull:.1,wob:.2,step:14});
    tendrils.push(el('path',{d:'M'+P.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L'),fill:'none',stroke:'#8E8090','stroke-width':phone?1.6:2.4,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1,'stroke-dasharray':'1 1'},ps));}
  lampG=el('g',{},ps);for(const[rr,a]of[[phone?150:230,.035],[phone?100:150,.05],[phone?62:90,.07],[phone?36:50,.1]])el('path',{d:octo(lx,ly,rr,rr*.92),fill:'#F1E8D2',opacity:a},lampG);
  el('path',{d:poly([[lx-7,ly-18],[lx+7,ly-18],[lx+8,ly-8],[lx-8,ly-8]]),fill:'#C8B27B'},ps);
  el('path',{d:octo(lx,ly+3,11*(phone?.85:1),13*(phone?.85:1),7,-Math.PI/2),fill:'#F6E2A8'},ps);el('path',{d:poly([[lx-6,ly-4],[lx,ly-6],[lx-1,ly+6],[lx-6,ly+4]]),fill:'#FFF6DC'},ps);
  // the poppy itself, standing in the meadow above the cut
  const g=el('g',{},ps),hx=xp+(phone?-2:6),hy=-stemH;
  el('path',{d:`M${xp} 10C${xp-3} ${-stemH*.35} ${hx+8} ${hy+stemH*.5} ${hx} ${hy+8*hs}`,fill:'none',stroke:'#3F6550','stroke-width':phone?2.8:3.6,'stroke-linecap':'round'},g);
  el('path',{d:poly([[xp,-stemH*.22],[xp-20*hs,-stemH*.3],[xp-36*hs,-stemH*.5],[xp-12*hs,-stemH*.36]]),fill:'#3F6550'},g);
  el('path',{d:poly([[xp-1,-stemH*.42],[xp+16*hs,-stemH*.5],[xp+28*hs,-stemH*.66],[xp+8*hs,-stemH*.55]]),fill:'#4C7660'},g);
  const hd=el('g',{class:'nk-head'},g),pet=(pts,f)=>el('path',{d:poly(pts.map(([x,y])=>[hx+x*hs,hy+y*hs])),fill:f},hd);   // the head as a few cut planes
  for(let k=0;k<5;k++){const t=-Math.PI/2+k*Math.PI*2/5,c=Math.cos(t),n=Math.sin(t),q=(a,rr)=>[Math.cos(t+a)*rr,Math.sin(t+a)*rr];
    pet([q(-.62,7),q(-.5,24),q(0,30),q(.5,24),q(.62,7)],k%2?'#C46E59':'#D17C66');pet([q(0,8),q(.5,24),q(0,30)],k%2?'#A8564D':'#B8604F');}
  pet([[-8,-3],[0,-9],[8,-3],[6,6],[-6,6]],'#332739');pet([[-3,-3],[3,-3],[3,2],[-3,2]],'#4C7660');
  paintHollow();grow();}
function grow(){if(!rootPath)return;const r=room1.getBoundingClientRect(),vh=innerHeight,hb=hollow.getBoundingClientRect();
  const k=still?1:sm((vh*.9-r.top)/((hb.top+150)-r.top));   // the root reaches the lamp as the hollow comes up
  rootPath.setAttribute('stroke-dashoffset',(1-k).toFixed(4));tendrils.forEach((t,i)=>t.setAttribute('stroke-dashoffset',(1-sm((k-.9-i*.01)/.08)).toFixed(4)));
  if(lampG)lampG.setAttribute('opacity',(still?1:sm((k-.94)/.06)).toFixed(3));}

/* ---------------- room 2: the moss hollow ---------------- */
function paintHollow(){const back=$('nk-hollow-back'),front=$('nk-hollow-front'),w=hollow.clientWidth,h=hollow.clientHeight,phone=w<600,r=rnd(71);
  back.innerHTML='';front.innerHTML='';const s=svgBox(back,w,h);
  const shelf=hollow.querySelector('.nk-shelf'),sb=box(shelf,hollow),floorY=sb.b-76,lx=LAMP.x,ly=LAMP.y;
  // the mouth: a rounded shape in straight cuts, a moss rim around a dark inside
  const mouth=(inset,jit)=>{const N=phone?18:28,P=[];for(let i=0;i<N;i++){const t=i/N*Math.PI*2,c=Math.cos(t),sn=Math.sin(t),e=phone?2.4:3.2,px=Math.sign(c)*Math.pow(Math.abs(c),2/e),py=Math.sign(sn)*Math.pow(Math.abs(sn),2/e),k=1+(r()-.5)*jit;
    P.push([w/2+px*(w/2-inset)*k,h/2+py*(h/2-inset*.9)*k]);}return P;};
  const outer=mouth(0,.05),inner=mouth(phone?14:26,.04);
  facets(clipped(s,poly(outer)),-10,-10,w+20,h+20,phone?40:62,[140,24,28],{seed:73,amp:14,z:1,tint:(fy)=>-fy*8});
  const cave=clipped(s,poly(inner));backIn=el('g',{},cave);
  facets(backIn,-10,-60,w+20,h+120,phone?46:72,[168,18,10],{seed:79,amp:8,z:.9,tint:(fy,cx,cy)=>Math.max(0,1-Math.hypot(cx-lx,cy-ly)/(phone?260:480))*10});   // the lamp lights the faces near it
  // moss lining just inside the rim, brightest under the lamp
  for(let i=0;i<inner.length;i++){const a=inner[i],b=inner[(i+1)%inner.length],m=[(a[0]+b[0])/2+(w/2-(a[0]+b[0])/2)*.06,(a[1]+b[1])/2+(h/2-(a[1]+b[1])/2)*.1];
    el('path',{d:poly([a,b,m]),fill:hsl(138,26,22+Math.max(0,1-Math.hypot(m[0]-lx,m[1]-ly)/600)*14)},cave);}
  // roots across the ceiling, and a small lantern hung on the right
  for(let i=0;i<(phone?4:8);i++){const x=w*(.1+i*(phone?.22:.11)+r()*.04);if(Math.abs(x-lx)<w*.06)continue;thinRoot(el('g',{},cave),r,x,8,(phone?50:90)*(.5+r()*.8),phone?5:8,hsl(20,14,26));}
  {const qx=w-(phone?40:110),qy=phone?96:150,u=phone?.75:1;el('rect',{x:qx-1,y:0,width:2,height:qy-22*u,fill:'#1B1B2C'},cave);
    for(const[rr,a]of[[90,.05],[50,.08]])el('path',{d:octo(qx,qy,rr*u,rr*u,6,0),fill:'#F2C27A',opacity:a},cave);
    el('path',{d:poly([[qx-9*u,qy-22*u],[qx+9*u,qy-22*u],[qx+13*u,qy-14*u],[qx-13*u,qy-14*u]]),fill:'#3A2F2C'},cave);
    el('path',{d:poly([[qx-11*u,qy-14*u],[qx+11*u,qy-14*u],[qx+9*u,qy+16*u],[qx-9*u,qy+16*u]]),fill:'#F2C27A'},cave);
    el('path',{d:poly([[qx-11*u,qy-14*u],[qx-3*u,qy-14*u],[qx-3*u,qy+16*u],[qx-9*u,qy+16*u]]),fill:'#E8A85E'},cave);
    el('path',{d:poly([[qx-12*u,qy+16*u],[qx+12*u,qy+16*u],[qx+9*u,qy+22*u],[qx-9*u,qy+22*u]]),fill:'#3A2F2C'},cave);}
  // in front: two big roots twisting over the rim, and the floor's near lip under the shelf
  const fs=svgBox(front,w,h);frontG=el('g',{},fs);const lit=hsl(18,16,34),dark=hsl(18,16,22);
  const band=phone?14:46;   // the rim's width: the roots keep to it, clear of the cards
  for(const side of[-1,1]){const lo=side<0?-40:w-band,hi=side<0?band:w+40,x0=side<0?-10:w+10,P=rootLine(r,x0,h*.04,h*(phone?.95:1.05),Math.PI/2+side*.15,{toward:Math.PI/2,pull:.05,wob:.45,step:phone?20:26,xmin:lo,xmax:hi});
    facetRoot(frontG,P,phone?16:30,phone?5:8,lit,dark);
    const b=Math.floor(P.length*.35),Q=rootLine(r,P[b][0],P[b][1],h*.45,Math.PI/2-side*.5,{toward:Math.PI/2,pull:.06,step:18,xmin:lo,xmax:hi});facetRoot(frontG,Q,phone?8:14,3,lit,dark);}
  {const y0=Math.max(floorY+58,h-(phone?60:84)),P=[[-30,h+40]];for(let i=0;i<=16;i++){const t=i/16;P.push([-30+(w+60)*t,y0-Math.pow(2*t-1,4)*(phone?30:50)+(r()-.5)*8]);}P.push([w+30,h+40]);
    facets(clipped(fs,poly(P)),-30,y0-60,w+60,h-y0+110,phone?34:52,[140,22,20],{seed:83,amp:14,z:1});}
  paintLedge();}
/* the shelf: a faceted plank the length of the row, so more cards make a longer shelf */
function paintLedge(){const lg=$('nk-ledge'),row=$('nk-shelf');if(!lg)return;lg.innerHTML='';const w=row.scrollWidth,r=rnd(91),s=el('svg',{width:w,height:80,viewBox:`0 0 ${w} 80`},lg);
  const n=Math.max(4,Math.round(w/90)),top=[];for(let i=0;i<=n;i++)top.push([w*i/n,(r()-.5)*3]);const front=top.map(([x,y])=>[x,y+12]),bot=top.map(([x,y],i)=>[x,y+28+(i%2?2:-1)]);
  for(const x of[w*.12,w*.86]){const P=rootLine(r,x,22,54,Math.PI/2,{wob:.2,step:10});facetRoot(el('g',{},s),P,18,8,hsl(18,16,30),hsl(18,16,20));}   // two root knees hold it up
  for(let i=0;i<n;i++){const l1=31+(r()-.5)*4,l2=21+(r()-.5)*3;el('path',{d:poly([top[i],top[i+1],front[i+1],front[i]]),fill:hsl(22,22,l1),stroke:hsl(22,22,l1),'stroke-width':.5},s);
    el('path',{d:poly([front[i],front[i+1],bot[i+1],bot[i]]),fill:hsl(20,22,l2),stroke:hsl(20,22,l2),'stroke-width':.5},s);}}

/* ---------------- depth below the meadow: far layers lag, near roots lead ---------------- */
function underScroll(){if(still)return;const vh=innerHeight,mv=(node,ref,d)=>{if(!node)return;const q=ref.getBoundingClientRect();if(q.bottom<-300||q.top>vh+300)return;node.setAttribute('transform',`translate(0 ${(((q.top+q.height/2)-vh/2)*d).toFixed(1)})`);};
  if(soilSvg){const q=under.getBoundingClientRect();soilSvg.style.transform=`translate3d(0,${Math.max(-110,Math.min(110,(-q.top)*.06)).toFixed(1)}px,0)`;}
  mv(backIn,hollow,.06);mv(frontG,hollow,-.035);}

/* the cards come up onto the shelf when it arrives */
const row=$('nk-shelf');if(still||!('IntersectionObserver' in window))row.classList.add('nk-in');else new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){row.classList.add('nk-in');o.disconnect();}},{threshold:.25}).observe(row);

/* ---------------- wiring ---------------- */
let tick=false;addEventListener('scroll',()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;nightScroll();grow();underScroll();});},{passive:true});
let rw=innerWidth,rt=0;const all=()=>{paintNight();paintUnder();nightScroll();underScroll();};
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.abs(innerWidth-rw)<2)return;rw=innerWidth;all();},140);});
all();(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{paintUnder();underScroll();});addEventListener('load',()=>{paintUnder();underScroll();});
if(window.ResizeObserver){let last=0;new ResizeObserver(()=>{const h=under.offsetHeight;if(Math.abs(h-last)>4){last=h;requestAnimationFrame(()=>{paintUnder();underScroll();});}}).observe(under);}
window.sogNook={repaint:all};
})();
