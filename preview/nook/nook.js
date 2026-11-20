/* Book nook prototype: the camera into the nook, the books and the nook's lower floors seen from outside, the roots and
   poppy of room 1, the moss hollow of room 2, and a gentle scroll parallax. Every shape is a flat painted fill. */
(()=>{
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const rnd=s=>()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};
const svgEl=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const sm=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
const C={wall:'#16162A',wood:'#2E2431',woodHi:'#43343F',woodLo:'#211A25',soil:'#1F1F35',soil2:'#25233C',turf:'#272C4B',navyLine:'#39406A',
  root:'#4E3A52',rootFar:'#2A2946',moss:'#263535',moss2:'#3F6550',mossFar:'#1F2B2D',plum:'#332739',plumMute:'#61465C',sage:'#7F917F',
  poppy:'#D17C66',poppyDeep:'#A8564D',text:'#DAD1CD',lamp:'#F1E8D2',card:'#F2EADD',plank:'#5A4344',plankLo:'#3E2E31',dawn:'#E2C7B8',dawn2:'#C9A9A4'};

/* ---------- a tapered root as a filled shape (with a few side roots) ---------- */
function rootShapes(r,x,y,L,w,o={}){const out=[];const lo=o.xmin??-1e9,hi=o.xmax??1e9;
  (function grow(x,y,L,w,ang,depth){const N=Math.max(8,Math.round(L/14)),step=L/N,P=[];let a=ang;
    for(let i=0;i<=N;i++){P.push([x,y]);a+=(r()-.5)*.32+(Math.PI/2-a)*.12;x=Math.min(hi,Math.max(lo,x+Math.cos(a)*step));y+=Math.sin(a)*step;}
    const Lp=[],Rp=[];for(let i=0;i<P.length;i++){const p=P[i],q=P[Math.min(P.length-1,i+1)],pp=P[Math.max(0,i-1)],dx=q[0]-pp[0],dy=q[1]-pp[1],d=Math.hypot(dx,dy)||1,t=i/(P.length-1),ww=w*(1-t)*.5+.15;
      Lp.push([p[0]-dy/d*ww,p[1]+dx/d*ww]);Rp.push([p[0]+dy/d*ww,p[1]-dx/d*ww]);}
    const pts=Lp.concat(Rp.reverse());let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for(let i=1;i<pts.length;i++){const m=[(pts[i-1][0]+pts[i][0])/2,(pts[i-1][1]+pts[i][1])/2];d+=`Q${pts[i-1][0].toFixed(1)} ${pts[i-1][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;}
    out.push(d+'Z');
    if(depth<2){const nb=depth?1:2+Math.floor(r()*2);for(let b=0;b<nb;b++){const t=.18+r()*.55,i=Math.floor(t*N),side=r()<.5?-1:1;grow(P[i][0],P[i][1],L*(.25+r()*.25),w*(1-t)*.6,Math.PI/2+side*(.6+r()*.5),depth+1);}}
  })(x,y,L,w,o.ang??Math.PI/2,0);return out;}

/* ---------- the opening: camera into the nook ---------- */
const track=$('nk-open'),stage=track.querySelector('.nk-stage'),world=$('nk-world'),lf=$('opening'),below=$('nk-below'),books=$('nk-books'),kase=$('nk-case');
let W=0,H=0,VH=0,Hn=0,Hl=0,F=0,S0=.2,Y0=0,E=-1;
function layoutOpening(){W=stage.clientWidth;VH=stage.clientHeight;H=lf.offsetHeight;const phone=W<700;
  // a narrow nook: tall for its width. On a phone the screen is already narrow, so the nook is shorter and the zoom gentler.
  Hl=Math.round(phone?H*1.35:Math.max(H*1.4,W*2.45-H));below.style.height=Hl+'px';Hn=H+Hl;F=Math.round(Hn*(phone?.014:.011));
  const bar=document.querySelector('header.bar'),top=bar?bar.getBoundingClientRect().height:0;
  S0=Math.min((VH-top-VH*.1)/(Hn+2*F),phone?.42:.3);Y0=top+(VH-top-S0*(Hn+2*F))/2+S0*F;   // screen y of the nook's top floor at the start
  kase.style.cssText=`left:${-F}px;top:${-F}px;width:${W+2*F}px;height:${Hn+2*F}px;--nk-edge:${Math.max(2,F*.22)}px`;
  paintBooks(phone);paintBelow(phone);E=-1;camera();}
function paintBooks(phone){books.innerHTML='';const r=rnd(29),shelfT=Hn*.05,gapTop=Hn*.075,base=Hn+F,reach=(W/2)/S0+W*.2,ceil=-F-gapTop;
  const x0=-reach,x1=W+reach,y0=ceil-shelfT-Hn*.5,y1=base+shelfT+Hn*.6;
  books.setAttribute('viewBox',`${x0} ${y0} ${x1-x0} ${y1-y0}`);Object.assign(books.style,{left:x0+'px',top:y0+'px',width:(x1-x0)+'px',height:(y1-y0)+'px'});
  // the shelf above (its underside) and the shelf the nook stands on
  svgEl('rect',{x:x0,y:y0,width:x1-x0,height:ceil-y0,fill:C.woodLo},books);
  svgEl('rect',{x:x0,y:ceil-shelfT*.22,width:x1-x0,height:shelfT*.22,fill:C.wood},books);
  svgEl('rect',{x:x0,y:base,width:x1-x0,height:shelfT,fill:C.wood},books);
  svgEl('rect',{x:x0,y:base,width:x1-x0,height:shelfT*.16,fill:C.woodHi},books);
  svgEl('rect',{x:x0,y:base+shelfT,width:x1-x0,height:y1-base-shelfT,fill:C.woodLo},books);
  // spines: the approved palette's grounds and their close cousins; the two books against the nook show their page edges
  const SP=[['#272C4B','#323860'],['#263535','#30443F'],['#332739','#43334A'],['#3F6550','#4C7660'],['#61465C','#70546A'],['#39406A','#46507E'],['#A8564D','#B8665A'],['#2B2F45','#373C57']];
  const hMax=base-ceil-Hn*.012;
  for(const side of[-1,1]){let x=side<0?-F:W+F,k=side<0?0:3;
    for(let i=0;x>x0&&x<x1&&i<40;i++){const page=i===0,w=Hn*(page?.13+r()*.03:.085+r()*.075),h=hMax*(page?.93:.74+r()*.24),bx=side<0?x-w:x,by=base-h;
      if(page){svgEl('rect',{x:bx,y:by,width:w,height:h,fill:'#3A4A44'},books);const t=w*.07;svgEl('rect',{x:bx+t,y:by+h*.008,width:w-2*t,height:h*.984,fill:'#D6CCBF'},books);
        for(let j=1;j<5;j++)svgEl('rect',{x:bx+t,y:by+h*j/5,width:w-2*t,height:Math.max(1,h*.002),fill:'#C5BAAE'},books);}   // the page block's soft signatures
      else{const [c,hi]=SP[(k++)%SP.length];svgEl('rect',{x:bx,y:by,width:w,height:h,fill:c},books);svgEl('rect',{x:bx,y:by,width:w*.09,height:h,fill:hi},books);
        const band=h*.012;for(const f of[.07,.1,.88,.91])svgEl('rect',{x:bx,y:by+h*f,width:w,height:band,fill:hi},books);
        if(r()<.55)svgEl('rect',{x:bx+w*.24,y:by+h*(.2+r()*.08),width:w*.52,height:h*.13,fill:hi,opacity:.55},books);}   // a blank label panel, no fake titles
      x+=side*(w+Hn*.004);}}}
function paintBelow(phone){below.innerHTML='';const s=svgEl('svg',{viewBox:`0 0 ${W} ${Hl}`,preserveAspectRatio:'none'},below),r=rnd(11);
  const R1=Hl*(phone?.36:.26),R2=Hl*(phone?.36:.24),R3=Hl*(phone?.28:.24),u=Math.min(W,Hl)/100;   // rooms: soil+roots, hollow, cavern, dawn
  svgEl('rect',{x:0,y:0,width:W,height:Hl,fill:C.soil},s);
  // room 1 seen small: turf lip, roots, three panels
  svgEl('rect',{x:0,y:0,width:W,height:u*3,fill:C.turf},s);
  for(let i=0;i<9;i++){const x=W*(i+.5)/9+(r()-.5)*W*.05;for(const d of rootShapes(r,x,u*2,R1*(.25+r()*.45),u*1.4))svgEl('path',{d,fill:i%3?C.rootFar:C.root},s);}
  const pw=W*(phone?.25:.24),py=R1*.42,ph=R1*.36;for(let i=0;i<3;i++){const px=W*.08+i*(pw+W*.06);
    svgEl('rect',{x:px,y:py,width:pw,height:ph,fill:C.turf,rx:u*.8},s);svgEl('rect',{x:px+pw*.12,y:py+ph*.14,width:pw*.5,height:ph*.09,fill:C.text},s);
    for(let j=0;j<3;j++)svgEl('rect',{x:px+pw*.12,y:py+ph*(.36+j*.15),width:pw*(.7-j*.12),height:ph*.05,fill:C.soft||'#9B97B1',opacity:.7},s);
    svgEl('rect',{x:px+pw*.12,y:py+ph*.82,width:pw*.18,height:ph*.05,fill:i===2?C.sage:C.poppy},s);}
  // room 2 seen small: the moss hollow, its lamp, the shelf of cards
  const hy=R1,hw=W*.9,hx=W*.05,hh=R2*.86;svgEl('path',{d:blob(hx-u*1.4,hy-u*1.4,hw+u*2.8,hh+u*2.8,r,.025),fill:C.moss2},s);svgEl('path',{d:blob(hx,hy,hw,hh,r,.02),fill:C.moss},s);
  const lx=hx+hw*.78,ly=hy+hh*.26;for(const [rr,a] of[[.3,.06],[.2,.06],[.12,.07]])svgEl('circle',{cx:lx,cy:ly,r:hh*rr,fill:C.lamp,opacity:a},s);
  svgEl('rect',{x:lx-u*.12,y:hy,width:u*.24,height:hh*.24,fill:C.root},s);svgEl('circle',{cx:lx,cy:ly,r:u*1.1,fill:'#F6E7B8'},s);
  const sy=hy+hh*.72;svgEl('rect',{x:hx+hw*.04,y:sy,width:hw*.92,height:u*1.6,fill:C.plank},s);
  const cw=hw*(phone?.2:.17);for(let i=0;i<4;i++){const w=i?cw:cw*1.5,x=hx+hw*.07+(i?cw*1.5+hw*.03+(i-1)*(cw+hw*.03):0),ch=w*.82;svgEl('rect',{x,y:sy-ch,width:w,height:ch,fill:C.card,rx:u*.4},s);svgEl('rect',{x,y:sy-ch,width:w,height:ch*.55,fill:i?'#E6DCCB':'#ECE2D2',rx:u*.4},s);}
  // room 3: the plum cavern with the flap board
  const cy=R1+R2;svgEl('path',{d:blob(W*.04,cy,W*.92,R3*.86,r,.04),fill:C.plum},s);
  const fw=W*.17;for(let i=0;i<4;i++){const x=W*.12+i*(fw+W*.03);svgEl('rect',{x,y:cy+R3*.3,width:fw,height:fw*.62,fill:C.soil,rx:u*.5},s);svgEl('rect',{x:x+fw*.3,y:cy+R3*.3+fw*.18,width:fw*.4,height:fw*.26,fill:C.text},s);}
  // room 4: the tunnel up to the dawn meadow
  const dy=R1+R2+R3,dh=Hl-dy;svgEl('path',{d:blob(W*.05,dy+dh*.06,W*.9,dh*.8,r,.03),fill:C.dawn},s);svgEl('path',{d:`M${W*.05} ${dy+dh*.62}Q${W*.5} ${dy+dh*.5} ${W*.95} ${dy+dh*.6}V${dy+dh*.86}H${W*.05}Z`,fill:C.moss2},s);
  svgEl('rect',{x:W*.12,y:dy+dh*.32,width:W*.34,height:dh*.06,fill:C.soil},s);svgEl('rect',{x:W*.12,y:dy+dh*.42,width:W*.16,height:dh*.035,fill:C.poppy,rx:u*.6},s);}
function blob(x,y,w,h,r,jit){const N=40,cx=x+w/2,cy=y+h/2,P=[];   // a rounded hollow with a slightly hand-cut edge
  for(let i=0;i<N;i++){const t=i/N*Math.PI*2,c=Math.cos(t),s2=Math.sin(t),e=2.6,k=1+(r()-.5)*jit*2;const px=Math.sign(c)*Math.pow(Math.abs(c),2/e),py=Math.sign(s2)*Math.pow(Math.abs(s2),2/e);P.push([cx+px*w/2*k,cy+py*h/2*k]);}
  let d='';for(let i=0;i<N;i++){const a=P[i],b=P[(i+1)%N],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];d+=(i?'':`M${((P[N-1][0]+a[0])/2).toFixed(1)} ${((P[N-1][1]+a[1])/2).toFixed(1)}`)+`Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;}return d+'Z';}
function camera(){const span=track.offsetHeight-VH,p=span>0?Math.min(1,Math.max(0,-track.getBoundingClientRect().top/span)):1;
  let e=sm((p-.05)/.78);if(still)e=p<.4?0:1;   // a hold on the opening shot, the push in, then a hold on the full top floor; under reduced motion, one cut
  if(Math.abs(e-E)<.0005)return;E=e;
  if(e>=.9995){world.style.transform='none';}
  else{const s=S0*Math.pow(1/S0,e),yc=(Y0+S0*H/2)*(1-e)+(H/2)*e,tx=W/2-s*W/2,ty=yc-s*H/2;world.style.transform=`translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;}
  stage.style.setProperty('--nk-e',e.toFixed(3));
  if(window.sogOpening&&sogOpening.night)sogOpening.night(sm(e*1.1),1);}   // the ridges rise as the camera arrives

/* ---------- room 1: roots and the poppy ---------- */
const room1=$('nk-room1'),rootsBox=$('nk-roots'),poppyBox=$('nk-poppy');let poppyRoot=null,rootlets=[],farG=null;
function box(el,ref){const a=el.getBoundingClientRect(),b=ref.getBoundingClientRect();return{l:a.left-b.left,t:a.top-b.top,r:a.right-b.left,b:a.bottom-b.top,w:a.width,h:a.height};}
function textRight(el){const rg=document.createRange();rg.selectNodeContents(el);let m=0;for(const q of rg.getClientRects())m=Math.max(m,q.right);return m-room1.getBoundingClientRect().left;}
function paintRoom1(){const Wr=room1.clientWidth,Hr=room1.clientHeight,phone=Wr<700,cut=room1.querySelector('.nk-cut').getBoundingClientRect().height,r=rnd(5);
  const h2=room1.querySelector('h2.cb-h'),cols=room1.querySelector('.cb-cols'),hb=box(h2,room1),cb=box(cols,room1),side=Math.max(12,cb.l);
  rootsBox.innerHTML='';const far=svgEl('svg',{width:Wr,height:Hr,viewBox:`0 0 ${Wr} ${Hr}`},rootsBox),near=svgEl('svg',{width:Wr,height:Hr,viewBox:`0 0 ${Wr} ${Hr}`},rootsBox);
  far.style.zIndex='-1';far.style.position='absolute';farG=svgEl('g',{},far);
  // the poppy stands in the meadow over the left margin; its long root runs straight down that margin, past the heading and the
  // first column, so it never crosses a word
  const xg=Math.max(10,Math.min(side*.42,60)),xp=Math.max(xg+(phone?8:14),phone?24:0),yTop=cut*.45,yEnd=cb.t+cb.h*.62;
  const path=`M${xp} ${yTop}C${xp} ${yTop+40} ${xg} ${yTop+60} ${xg} ${yTop+110}C${xg+4} ${yTop+(yEnd-yTop)*.45} ${xg-4} ${yTop+(yEnd-yTop)*.75} ${xg+1} ${yEnd}`;
  // the other roots: long in the side margins, short over the words (they stop well above the heading)
  const clearY=hb.t-14;for(let i=0,n=Math.round(Wr/(phone?60:85));i<n;i++){const x=(i+.3+r()*.4)/n*Wr;if(x<side+(phone?10:30))continue;
    const inSide=x<side-6||x>Wr-side+6,lo=inSide?(x<side?2:Wr-side+8):x-60,hi=inSide?(x<side?side-8:Wr-2):x+60,q=r(),L=inSide?Math.min(Hr*.55,(phone?140:420)*(.5+r()*.6)):Math.max(0,(clearY-cut*.4)*(.15+q*q*.85));
    if(L<12||(!inSide&&r()<.3))continue;for(const d of rootShapes(r,x,cut*.4,L,(phone?5:11)*(.7+r()*.6),{xmin:lo,xmax:hi}))svgEl('path',{d,fill:C.root},near);}
  for(let i=0,n=Math.round(Wr/(phone?80:120));i<n;i++){const x=(i+r())/n*Wr,inSide=x<side-6||x>Wr-side+6;const L=inSide?Hr*(.3+r()*.4):Math.max(30,clearY*(.6+r()*.5));
    for(const d of rootShapes(r,x,-90,L+90,(phone?7:14)*(.6+r()*.6),{xmin:inSide?(x<side?0:Wr-side):x-80,xmax:inSide?(x<side?side:Wr):x+80}))svgEl('path',{d,fill:C.rootFar},farG);}
  // the poppy
  poppyBox.innerHTML='';const ps=svgEl('svg',{width:Wr,height:Hr,viewBox:`0 0 ${Wr} ${Hr}`},poppyBox),stemH=phone?112:168,hs=phone?1:1.45;
  poppyRoot=svgEl('path',{d:path,fill:'none',stroke:'#9C8287','stroke-width':phone?2.6:3.8,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1'},ps);
  rootlets=[];const total=poppyRoot.getTotalLength();for(let i=0;i<(phone?5:8);i++){const t=.12+i*(.8/(phone?5:8))+r()*.04,pt=poppyRoot.getPointAtLength(t*total),pt2=poppyRoot.getPointAtLength(Math.min(total,t*total+4)),
    dir=(i%2&&side-xg>30)?1:-1,ang=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)+dir*(.8+r()*.4),len=Math.min(dir>0?side-xg-14:xg-3,(phone?8:16)+r()*(phone?4:14));
    const e=svgEl('path',{d:`M${pt.x.toFixed(1)} ${pt.y.toFixed(1)}q${(Math.cos(ang)*len*.5).toFixed(1)} ${(Math.sin(ang)*len*.5+2).toFixed(1)} ${(Math.cos(ang)*len).toFixed(1)} ${(Math.sin(ang)*len+5).toFixed(1)}`,fill:'none',stroke:'#9C8287','stroke-width':phone?1.3:1.8,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1'},ps);rootlets.push([t,e]);}
  const g=svgEl('g',{},ps),by=cut*.45,hx=xp+(phone?4:10),hy=-stemH;
  svgEl('path',{d:`M${xp} ${by}C${xp-2} ${by-stemH*.4} ${hx+6} ${hy+stemH*.45} ${hx} ${hy+10*hs}`,fill:'none',stroke:C.moss2,'stroke-width':phone?2.6:3.4,'stroke-linecap':'round'},g);
  svgEl('path',{d:`M${xp} ${by-stemH*.18}c${-14*hs} ${-8*hs} ${-30*hs} ${-28*hs} ${-34*hs} ${-46*hs}c${14*hs} ${6*hs} ${30*hs} ${22*hs} ${34*hs} ${46*hs}z`,fill:C.moss2},g);   // a leaf
  svgEl('path',{d:`M${xp-1} ${by-stemH*.36}c${12*hs} ${-6*hs} ${24*hs} ${-22*hs} ${26*hs} ${-38*hs}c${-12*hs} ${6*hs} ${-24*hs} ${20*hs} ${-26*hs} ${38*hs}z`,fill:'#4C7660'},g);
  // the head, seen from the front: four round petals around a dark centre
  const head=svgEl('g',{class:'nk-head'},g),pet=(dx,dy,rr,f)=>svgEl('circle',{cx:hx+dx*hs,cy:hy+dy*hs,r:rr*hs,fill:f},head);
  pet(-10,-9,14,C.poppyDeep);pet(10,-9,14,C.poppyDeep);pet(-11,6,15,C.poppy);pet(11,6,15,C.poppy);pet(0,-1,12,C.poppy);
  svgEl('circle',{cx:hx,cy:hy-1*hs,r:7.5*hs,fill:'#332739'},head);svgEl('circle',{cx:hx,cy:hy-1*hs,r:4*hs,fill:C.soil},head);svgEl('circle',{cx:hx,cy:hy-1*hs,r:1.8*hs,fill:'#4C7660'},head);
  growRoot();}
function growRoot(){if(!poppyRoot)return;const r=room1.getBoundingClientRect(),vh=innerHeight;let k=still?1:sm((vh*.95-r.top)/(r.height*.72));   // the root grows down as the room comes up
  poppyRoot.setAttribute('stroke-dashoffset',(1-k).toFixed(4));for(const[t,e]of rootlets)e.setAttribute('stroke-dashoffset',(1-sm((k-t)/.08)).toFixed(4));}

/* ---------- room 2: the moss hollow ---------- */
const hollow=$('work'),hArt=$('nk-hollow-art'),hFront=$('nk-hollow-front');let backG=null,lipSvg=null;
function paintHollow(){const w=hollow.clientWidth,h=hollow.clientHeight,phone=w<600,r=rnd(17),u=phone?.7:1;
  const shelf=hollow.querySelector('.nk-shelf'),sb=box(shelf,hollow),plankY=sb.b-80-30;   // plank top (row bottom), from the shelf's padding
  hArt.innerHTML='';const s=svgEl('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'none'},hArt),cid='nkc'+Math.round(Math.random()*1e6);
  const outer=blob(-10*u,-6*u,w+20*u,h+12*u,r,.02),inner=blob(6*u,8*u,w-12*u,h-16*u,r,.015);
  svgEl('path',{d:outer,fill:C.moss2},s);const wall=svgEl('path',{d:inner,fill:C.moss},s);
  const cp=svgEl('clipPath',{id:cid},s);svgEl('path',{d:inner},cp);const clip=svgEl('g',{'clip-path':`url(#${cid})`},s);
  backG=svgEl('g',{},clip);   // the far wall of the hollow: a darker recess, and the far roots, moving slower than the near wall
  svgEl('path',{d:blob(w*.1,h*.08,w*.8,h*.62,r,.05),fill:C.mossFar},backG);
  for(let i=0;i<7;i++){const x=w*(.12+i*.12+r()*.04);for(const d of rootShapes(r,x,h*.02,h*(.12+r()*.16),6*u))svgEl('path',{d,fill:'#2A3A3A'},backG);}
  // near roots hanging from the ceiling, one of them carrying the lamp
  const lx=w*(phone?.8:.82),cordEnd=Math.min(plankY-150*u,(phone?92:118));
  for(let i=0;i<9;i++){const x=w*(.06+i*.11+r()*.03);if(Math.abs(x-lx)<w*.05)continue;for(const d of rootShapes(r,x,-4,(phone?40:70)*(.5+r()*.9),7*u))svgEl('path',{d,fill:C.root},clip);}
  // the lamp: a warm bulb on its cord, its glow painted as a few flat rings of light
  const glow=svgEl('g',{},clip);for(const[rr,a,dx,dy]of[[330,.028,-30,26],[220,.036,-14,14],[132,.05,-4,6],[70,.07,0,2]])svgEl('ellipse',{cx:lx+dx*u,cy:cordEnd+dy*u,rx:rr*u,ry:rr*u*.92,fill:C.lamp,opacity:a},glow);
  svgEl('rect',{x:lx-1.2,y:0,width:2.4,height:cordEnd-12*u,fill:'#1B1B2C'},clip);svgEl('rect',{x:lx-7*u,y:cordEnd-16*u,width:14*u,height:10*u,rx:2,fill:'#C8B27B'},clip);
  svgEl('ellipse',{cx:lx,cy:cordEnd+4*u,rx:11*u,ry:13*u,fill:'#F6E7B8'},clip);svgEl('ellipse',{cx:lx-3*u,cy:cordEnd+1*u,rx:3.5*u,ry:5*u,fill:'#FFF8E6'},clip);
  // the lamp's light falling on the wall behind the shelf: one soft flat pool
  svgEl('ellipse',{cx:lx-w*.12,cy:plankY-40,rx:w*.36,ry:110*u,fill:C.lamp,opacity:.035},clip);
  // the foreground lip: the near edge of the hollow, in front of the shelf's feet
  hFront.innerHTML='';lipSvg=svgEl('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'none'},hFront);
  const N=24,base=h-(phone?46:62),rise=phone?40:64;let d=`M${-40} ${h+80}`;   // low in the middle, rising toward the sides like the rim of a bowl
  for(let i=0;i<=N;i++){const t=i/N,x=-40+(w+80)*t,yy=base-rise*Math.pow(2*t-1,4)+Math.sin(i*2.3)*3+(r()-.5)*5;d+=(i?'L':'L')+`${x.toFixed(1)} ${yy.toFixed(1)}`;}
  d+=`L${w+40} ${h+80}Z`;svgEl('path',{d,fill:C.soil2},lipSvg);svgEl('path',{d,fill:C.soil,transform:'translate(0 10)'},lipSvg);
  for(let i=0;i<14;i++){const t=(i+.5)/14,x=w*t+(r()-.5)*24,top=base-rise*Math.pow(2*t-1,4);svgEl('path',{d:`M${x} ${top+4}q${-4+r()*8} ${-12-r()*10} ${-8+r()*16} ${-22-r()*14}`,fill:'none',stroke:C.moss2,'stroke-width':3*u,'stroke-linecap':'round'},lipSvg);}   // moss on the lip
}

/* ---------- gentle parallax: far layers lag, the lip leads ---------- */
function parallax(){if(still)return;const vh=innerHeight;
  const move=(el,ref,d,svgAttr)=>{if(!el||!ref)return;const r=ref.getBoundingClientRect();if(r.bottom<-200||r.top>vh+200)return;const off=((r.top+r.height/2)-vh/2)*d;
    if(svgAttr)el.setAttribute('transform',`translate(0 ${off.toFixed(1)})`);else el.style.transform=`translate3d(0,${off.toFixed(1)}px,0)`;};
  move(farG,room1,.09,true);move(backG,hollow,.07,true);move(lipSvg,hollow,-.035,false);}

/* ---------- wiring ---------- */
let tick=false;const onScroll=()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;camera();growRoot();parallax();});};
addEventListener('scroll',onScroll,{passive:true});
let rw=innerWidth,rt=0;function relayout(){layoutOpening();paintRoom1();paintHollow();parallax();}
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.abs(innerWidth-rw)<2&&Math.abs(stage.clientHeight-VH)<120){camera();return;}rw=innerWidth;relayout();},120);});
relayout();
(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{paintRoom1();paintHollow();parallax();});
addEventListener('load',()=>{paintRoom1();paintHollow();parallax();});
window.sogNook={state:()=>({e:E,s0:S0,W,H,Hn}),paint:relayout};
})();
