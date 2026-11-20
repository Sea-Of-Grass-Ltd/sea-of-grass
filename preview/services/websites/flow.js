/* Flow: three small things, done carefully (Tristan: "Whenever you scroll on that cyber security website, it just flows").
   1 One through-line. A dashed path runs in the left margin from "register" at the top to "your website" at the close,
     unbroken across every section seam, and a meadow seed rides it, always level with the middle of your screen.
     Register to website, direct.
   2 One pinned scene. On wide screens the register demo holds in place while you scroll: the receipt slides in, Sold out
     plays on its own, the caption lands, then the scene lets go. Tapping still works, and phones simply scroll.
   3 A small fixed chapter index on wide screens that lights up as you go.
   Reduced motion: the path stays as a drawing, the seed and the pin are off. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const wide=matchMedia('(min-width: 981px)');
const NS='http://www.w3.org/2000/svg';
const secs=()=>[...document.querySelectorAll('body > section, main > section')];

// ---- 1 the through-line ----
const svg=document.createElementNS(NS,'svg');svg.setAttribute('data-through','');svg.setAttribute('aria-hidden','true');svg.classList.add('through');
const path=document.createElementNS(NS,'path');svg.appendChild(path);
const drawn=document.createElementNS(NS,'path');drawn.classList.add('drawn');svg.appendChild(drawn);   // phones: the trail drawn in behind the seed
const lab1=document.createElementNS(NS,'text'),lab2=document.createElementNS(NS,'text');lab1.textContent='REGISTER';lab2.textContent='YOUR WEBSITE';svg.append(lab1,lab2);
const seed=document.createElement('span');seed.className='traveller';seed.setAttribute('data-traveller','');seed.setAttribute('aria-hidden','true');
seed.innerHTML='<svg viewBox="0 0 16 22"><path d="M8 1C4 6 3 11 3 14a5 5 0 0 0 10 0c0-3-1-8-5-13z" fill="currentColor"/><path d="M8 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
document.body.append(svg,seed);
let pts=[],len=0,y0=0,y1=0,tapY=null;
const phone=matchMedia('(max-width: 767px)');
function build(){
  const S=secs();if(!S.length)return;
  if(phone.matches)return buildPhone(S);
  const inn=document.querySelector('.hero .in'),r=inn.getBoundingClientRect(),textLeft=r.left+parseFloat(getComputedStyle(inn).paddingLeft);
  const rail=document.querySelector('.tickets'),railLeft=rail?rail.getBoundingClientRect().left:textLeft;
  const room=Math.min(textLeft,railLeft);                         // the margin left of every piece of content
  const H=document.documentElement.scrollHeight,W=document.documentElement.clientWidth;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const top=y=>y+scrollY;
  const roomy=room>=60,a=roomy?room*.22:room*.42,b=roomy?room*.55:room*.52;
  pts=[];
  S.forEach((s,i)=>{const sr=s.getBoundingClientRect(),t=top(sr.top);
    pts.push([i%2?b:a,t+(i?sr.height*.18:Math.min(200,sr.height*.25))]);
    pts.push([i%2?a:b,t+sr.height*.72]);});
  const last=S[S.length-1].getBoundingClientRect();pts[pts.length-1][1]=top(last.top)+last.height*.6;
  let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for(let i=1;i<pts.length;i++){const [x0,yA]=pts[i-1],[x1,yB]=pts[i],dy=(yB-yA)*.5;
    d+=` C${x0.toFixed(1)} ${(yA+dy).toFixed(1)} ${x1.toFixed(1)} ${(yB-dy).toFixed(1)} ${x1.toFixed(1)} ${yB.toFixed(1)}`;}
  path.setAttribute('d',d);len=path.getTotalLength();y0=pts[0][1];y1=pts[pts.length-1][1];
  const showLabels=room>=120;
  [[lab1,pts[0],-14],[lab2,pts[pts.length-1],26]].forEach(([t,p,dy])=>{t.style.display=showLabels?'':'none';t.setAttribute('x',Math.max(8,p[0]-10).toFixed(1));t.setAttribute('y',(p[1]+dy).toFixed(1));});
  ride();
}
// Phones (≤ 767 px) have no margin, so the line lives in the 16 px side gutter inside each section and swings across the full
// width in every text-free gap between sections. It threads in to the register's Sold out button (the seed taps it on the
// way past), crosses the meadow at the foot of the top, and ends beside the Book button under "Talk to Tristan or Bryce".
const TEXT='h1,h2,h3,p,li,dt,dd,summary,a,button,label,.t-name,.t-lab,.badge,.flap-w,.amt';
const OBJECTS='img,picture,iframe,canvas,sog-phone,.register,.phone';
function boxes(sel,skipText){
  return [...document.querySelectorAll(sel)].filter(e=>!e.closest('[data-through],[data-traveller],[data-live-grass],header,footer,.more,[data-chapters],[hidden]')
    &&!(e.closest('details:not([open])')&&!e.closest('summary'))&&getComputedStyle(e).visibility!=='hidden'&&(!skipText||e.textContent.trim()))
    .map(e=>{const r=e.getBoundingClientRect();let L=r.left,T=r.top,R=r.right,B=r.bottom;
      for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p);
        if(c.overflowX!=='visible'||c.overflowY!=='visible'){const q=p.getBoundingClientRect();L=Math.max(L,q.left);T=Math.max(T,q.top);R=Math.min(R,q.right);B=Math.min(B,q.bottom);}}
      return{L,R,T:T+scrollY,B:B+scrollY};}).filter(b=>b.R-b.L>0&&b.B-b.T>0);
}
function buildPhone(S){
  const H=document.documentElement.scrollHeight,W=document.documentElement.clientWidth,G=12,XL=G,XR=W-G;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const top=y=>y+scrollY,h0=S[0].getBoundingClientRect();
  const start=top(h0.top)+Math.min(200,h0.height*.25);
  const bookEl=S[S.length-1].querySelector('a.btn'),book=bookEl&&bookEl.getBoundingClientRect();
  const end=book?top(book.top)+book.height/2:top(S[S.length-1].getBoundingClientRect().top)+200;
  const screens=boxes('.phone .view',false),txt=boxes(TEXT,true).concat(screens),all=txt.concat(boxes(OBJECTS,false));
  // gaps: stretches with no text or picture anywhere across the width
  const P=6,iv=all.map(b=>[b.T-P,b.B+P]).filter(v=>v[1]>start&&v[0]<end-70).sort((a,b)=>a[0]-b[0]),gaps=[];
  let cur=start;for(const [a,b] of iv){if(a-cur>=20)gaps.push([cur,a]);cur=Math.max(cur,b);}
  // runs between gaps, each with the lanes it can use: a clear side gutter, or (when both are blocked, as at the photo
  // ticket rail) a clear slot between things
  const edges=[start,...gaps.flat(),end-64],runs=[];
  for(let i=0;i<edges.length;i+=2){const a=edges[i],b=edges[i+1],T=txt.filter(t=>t.T<b&&t.B>a),free=x=>!T.some(t=>t.L<x+3.5&&t.R>x-3.5);
    const lanes=[XL,XR].filter(free);
    if(!lanes.length){const xs=T.map(t=>[Math.max(XL,t.L-3.5),Math.min(XR,t.R+3.5)]).sort((p,q)=>p[0]-q[0]);let c=XL;
      for(const [l,r] of xs){if(l-c>=14)lanes.push((c+l)/2);c=Math.max(c,r);}}
    runs.push({a,b,lanes});}
  // the register: the line comes in to Sold out from the gutter on its side
  const soldEl=document.querySelector('[data-act="soldout"]'),sr=soldEl&&soldEl.getBoundingClientRect();
  let sold=null;if(sr&&sr.width){const my=top(sr.top)+sr.height/2,right=sr.left+sr.width/2>W/2,g=right?XR:XL,run=runs.find(o=>o.a<=my-38&&o.b>=my+38);
    if(run&&run.lanes.includes(g)){run.lanes=[g];
      // straight in to its side, or, when a phone screen sits beside it, in under the button once the screen has ended
      const tx=right?sr.right+7:sr.left-7,lo=Math.min(tx,g),hi=Math.max(tx,g),bot=top(sr.bottom);
      const sc=screens.filter(v=>v.L<hi&&v.R>lo&&v.T<my+38&&v.B>my-38);
      if(!sc.length)sold={ys:my-38,tx,ty:my};
      else{const ty=bot+5,ys=Math.max(ty-34,...sc.map(v=>v.B+4));if(ty-ys>=6)sold={ys,tx:right?sr.right-12:sr.left+12,ty};}}}
  // choose lanes run by run, with as many full-width sweeps as the gaps allow (a tall gap can take two, out and back)
  const moves=(xa,xb,h)=>{const out=[],far=Math.abs(xb-xa)>=W*.5;
    if(xa===xb){out.push({k:0,s:0});if(h>=220&&(xa===XL||xa===XR))out.push({k:2,s:20});}
    else if(far?h>=72:Math.abs(xb-xa)<=h*3)out.push({k:1,s:far?10:-Math.abs(xb-xa)/100});
    return out;};
  let best=new Map(runs[0].lanes.map(x=>[x,{s:0,plan:[],first:x}]));
  gaps.forEach(([a,b],i)=>{const nx=new Map();
    for(const [xa,v] of best)for(const xb of runs[i+1].lanes)for(const m of moves(xa,xb,b-a)){const s=v.s+m.s,o=nx.get(xb);
      if(!o||s>o.s)nx.set(xb,{s,plan:v.plan.concat([[m.k,xa,xb]]),first:v.first});}
    if(nx.size)best=nx;else{const [[x,v]]=[...best].sort((p,q)=>q[1].s-p[1].s);best=new Map([[x,{...v,plan:v.plan.concat([[0,x,x]])}]]);}});
  const fin=[...best.values()].sort((p,q)=>q.s-p.s)[0]||{plan:[],first:XL};
  // draw: straight runs in a lane, S-curves across the gaps, a small detour in to Sold out, and in beside the Book button
  let x=fin.first,y=start,d=`M${x.toFixed(1)} ${start.toFixed(1)}`;tapY=null;
  const f=n=>n.toFixed(1),curve=(xb,yb)=>{const h=yb-y;d+=` C${f(x)} ${f(y+h*.5)} ${f(xb)} ${f(yb-h*.5)} ${f(xb)} ${f(yb)}`;x=xb;y=yb;};
  const run=to=>{if(sold&&sold.ty>y&&sold.ty<=to){const {ys,tx,ty}=sold,g=x,h=ty-ys;
      d+=` L${f(g)} ${f(ys)} C${f(g)} ${f(ys+h*.5)} ${f(tx)} ${f(ty-h*.4)} ${f(tx)} ${f(ty)} C${f(tx)} ${f(ty+14)} ${f(g)} ${f(ty+20)} ${f(g)} ${f(ty+38)}`;y=ty+38;tapY=ty;}
    if(to>y){d+=` L${f(x)} ${f(to)}`;y=to;}};
  gaps.forEach(([a,b],i)=>{const [k,xa,xb]=fin.plan[i]||[0];
    // a full-width sweep keeps a little more air above and below it than a short jog does
    const far=k===2||(k===1&&Math.abs(xb-xa)>=W*.5),inset=far?Math.max(0,Math.min(20,(b-a-72*k)/2)):0;a+=inset;b-=inset;run(a);
    if(k===1)curve(xb,b);else if(k===2){curve(x===XL?XR:XL,(a+b)/2);curve(xb,b);}});
  if(book){const ex=x<W/2?book.left-10:book.right+10;run(end-64);
    d+=` C${f(x)} ${f(end-30)} ${f(ex-(ex-x)*.5)} ${f(end-2)} ${f(ex)} ${f(end)}`;}
  else run(end);
  path.setAttribute('d',d);drawn.setAttribute('d',d);len=path.getTotalLength();y0=start;y1=end;drawn.style.strokeDasharray=`${len} ${len}`;
  lab1.style.display=lab2.style.display='none';
  ride();
}
// the seed sits on the path, level with the middle of the screen (y always grows along the path, so a binary search finds it)
function ride(){
  if(reduce.matches||!len){seed.hidden=true;drawn.style.strokeDashoffset=String(len);return;}
  seed.hidden=false;
  const target=Math.min(y1,Math.max(y0,scrollY+innerHeight*.55));
  let lo=0,hi=len;for(let k=0;k<22;k++){const mid=(lo+hi)/2;path.getPointAtLength(mid).y<target?lo=mid:hi=mid;}
  const q=path.getPointAtLength(lo),q2=path.getPointAtLength(Math.min(len,lo+2));
  const ang=Math.atan2(q2.y-q.y,q2.x-q.x)*180/Math.PI-90;
  if(phone.matches)drawn.style.strokeDashoffset=(len-lo).toFixed(1);
  const hw=seed.offsetWidth/2||7,hh=seed.offsetHeight/2||10;
  seed.style.transform=`translate(${(q.x-hw).toFixed(1)}px,${(q.y-hh).toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
  // phones: the seed taps Sold out as it reaches the button (once; wide screens play it from the pinned scene instead)
  if(phone.matches&&tapY!==null&&target>=tapY-2&&stage&&!stage.dataset.played&&!stage.classList.contains('other')){
    const btn=stage.querySelector('[data-act="soldout"]');
    if(btn&&btn.offsetParent&&btn.getAttribute('aria-pressed')!=='true'){stage.dataset.played='1';btn.click();}}
}

// ---- 2 the pinned register scene ----
const pin=document.querySelector('[data-pin]'),stage=pin&&pin.querySelector('.open-stage');
const pinned=()=>wide.matches&&!reduce.matches;
function play(){
  if(!pin||!pinned()){stage&&stage.style.removeProperty('--p');return;}
  const r=pin.getBoundingClientRect(),stickTop=parseFloat(getComputedStyle(stage).top)||0,run=r.height-stage.offsetHeight;
  const p=Math.min(1,Math.max(0,(stickTop-r.top)/Math.max(1,run)));
  stage.style.setProperty('--p',p.toFixed(3));
  const btn=stage.querySelector('[data-act="soldout"]');
  if(p>=.42&&btn&&!stage.classList.contains('other')&&btn.getAttribute('aria-pressed')!=='true'&&!stage.dataset.played){stage.dataset.played='1';btn.click();}
}

// ---- 3 the chapter index ----
const nav=document.querySelector('nav[data-chapters]'),links=nav?[...nav.querySelectorAll('a')]:[];
function light(){
  if(!links.length)return;
  const line=innerHeight*.4;let cur=links[0];
  links.forEach(a=>{const el=document.querySelector(a.getAttribute('href'));const sec=el&&(el.closest('section')||el);if(sec&&sec.getBoundingClientRect().top<=line)cur=a;});
  links.forEach(a=>{if(a===cur)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
}

let tick=0;const frame=()=>{tick=0;ride();play();light();};
addEventListener('scroll',()=>{if(!tick)tick=requestAnimationFrame(frame);},{passive:true});
const rebuild=()=>requestAnimationFrame(()=>{build();frame();});
addEventListener('resize',rebuild);addEventListener('load',rebuild);
document.fonts&&document.fonts.ready.then(rebuild);
new ResizeObserver(rebuild).observe(document.body);
reduce.addEventListener?.('change',rebuild);
build();frame();
})();
