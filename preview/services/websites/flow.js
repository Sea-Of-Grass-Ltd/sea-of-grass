/* Flow: three small things, done carefully (Tristan: "Whenever you scroll on that cyber security website, it just flows").
   1 One through-line. A dashed path runs in the left margin from "register" at the top to "your website" at the close,
     unbroken across every section seam, and a meadow seed rides it, always level with the middle of your screen.
     Register to website, direct.
   2 One pinned scene. On wide screens the register demo holds in place while you scroll: the receipt slides in, Sold out
     plays on its own, the caption lands, then the scene lets go. Tapping still works, and phones simply scroll.
   3 A small fixed chapter index on wide screens that lights up as you go.
   Phones (Tristan: "on mobile it just scrolls on the side of the phone"): the line weaves. It sweeps right across the
   screen through the gaps between sections (never over text or pictures), draws itself in behind the seed as you scroll,
   and lights a small stop at each crossing.
   Reduced motion: the path stays as a drawing, the seed and the pin are off. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const wide=matchMedia('(min-width: 981px)');
const NS='http://www.w3.org/2000/svg';
const secs=()=>[...document.querySelectorAll('body > section, main > section')];

// ---- 1 the through-line ----
const svg=document.createElementNS(NS,'svg');svg.setAttribute('data-through','');svg.setAttribute('aria-hidden','true');svg.classList.add('through');
const path=document.createElementNS(NS,'path');svg.appendChild(path);
const drawn=document.createElementNS(NS,'path');drawn.classList.add('drawn');svg.appendChild(drawn);
const stopsG=document.createElementNS(NS,'g');svg.appendChild(stopsG);let stops=[];
const lab1=document.createElementNS(NS,'text'),lab2=document.createElementNS(NS,'text');lab1.textContent='REGISTER';lab2.textContent='YOUR WEBSITE';svg.append(lab1,lab2);
const seed=document.createElement('span');seed.className='traveller';seed.setAttribute('data-traveller','');seed.setAttribute('aria-hidden','true');
seed.innerHTML='<svg viewBox="0 0 16 22"><path d="M8 1C4 6 3 11 3 14a5 5 0 0 0 10 0c0-3-1-8-5-13z" fill="currentColor"/><path d="M8 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
document.body.append(svg,seed);
let pts=[],len=0,y0=0,y1=0;
function build(){
  const S=secs();if(!S.length)return;
  const inn=document.querySelector('.hero .in'),r=inn.getBoundingClientRect(),textLeft=r.left+parseFloat(getComputedStyle(inn).paddingLeft);
  const rail=document.querySelector('.tickets'),railLeft=rail?rail.getBoundingClientRect().left:textLeft;
  const room=Math.min(textLeft,railLeft);                         // the margin left of every piece of content
  const H=document.documentElement.scrollHeight,W=document.documentElement.clientWidth;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const top=y=>y+scrollY;
  const roomy=room>=60,a=roomy?room*.22:room*.42,b=roomy?room*.55:room*.52;
  pts=[];const cross=[];
  if(wide.matches){
    S.forEach((s,i)=>{const sr=s.getBoundingClientRect(),t=top(sr.top);
      pts.push([i%2?b:a,t+(i?sr.height*.18:Math.min(200,sr.height*.25))]);
      pts.push([i%2?a:b,t+sr.height*.72]);});
    const last=S[S.length-1].getBoundingClientRect();pts[pts.length-1][1]=top(last.top)+last.height*.6;
  }else weave(S,W,room,top,pts,cross);
  let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for(let i=1;i<pts.length;i++){const [x0,yA]=pts[i-1],[x1,yB]=pts[i],dy=(yB-yA)*.5;
    d+=` C${x0.toFixed(1)} ${(yA+dy).toFixed(1)} ${x1.toFixed(1)} ${(yB-dy).toFixed(1)} ${x1.toFixed(1)} ${yB.toFixed(1)}`;}
  path.setAttribute('d',d);drawn.setAttribute('d',d);len=path.getTotalLength();y0=pts[0][1];y1=pts[pts.length-1][1];
  drawn.style.strokeDasharray=`${len} ${len}`;
  stopsG.replaceChildren();stops=cross.map(([x,y])=>{const c=document.createElementNS(NS,'circle');c.classList.add('stop');
    c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));c.setAttribute('r','4.5');stopsG.appendChild(c);return c;});
  svg.classList.toggle('weave',!wide.matches);
  const showLabels=room>=120;
  [[lab1,pts[0],-14],[lab2,pts[pts.length-1],26]].forEach(([t,p,dy])=>{t.style.display=showLabels?'':'none';t.setAttribute('x',Math.max(8,p[0]-10).toFixed(1));t.setAttribute('y',(p[1]+dy).toFixed(1));});
  ride();
}
// phones: find the clear horizontal gap at each section seam (no text, no pictures across it) and sweep across it there
const OBST='h1,h2,h3,p,li,dt,dd,summary,a,button,label,img,iframe,.flap,.ticket,.register,.phone,.amt,.badge';
function weave(S,W,room,top,pts,cross){
  const iv=[...document.querySelectorAll(OBST)].filter(e=>!e.closest('[aria-hidden="true"],[hidden],.more,footer,[data-through],header,nav,.topbar')&&getComputedStyle(e).visibility!=='hidden')
    .map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>[top(r.top),top(r.bottom)]).sort((p,q)=>p[0]-q[0]);
  const m=[];iv.forEach(([t,b])=>{const l=m[m.length-1];if(l&&t<=l[1]+1)l[1]=Math.max(l[1],b);else m.push([t,b]);});
  const L=Math.max(6,room*.5),R=W-L;let x=L;
  const first=S[0].getBoundingClientRect();pts.push([x,top(first.top)+Math.min(200,first.height*.25)]);
  S.slice(1).forEach(s=>{const seam=top(s.getBoundingClientRect().top);let best=null;
    for(let k=1;k<m.length;k++){const g0=m[k-1][1],g1=m[k][0];if(g1-g0<34||g1<seam-220||g0>seam+260)continue;
      const mid=(g0+g1)/2;if(g0<=pts[pts.length-1][1]+20)continue;
      if(!best||Math.abs(mid-seam)<Math.abs((best[0]+best[1])/2-seam))best=[g0,g1];}
    if(!best)return;
    const pad=Math.min(14,(best[1]-best[0])*.22),ya=best[0]+pad,yb=best[1]-pad,nx=x===L?R:L;
    pts.push([x,ya],[nx,yb]);cross.push([(x+nx)/2,(ya+yb)/2]);x=nx;});
  const last=S[S.length-1].getBoundingClientRect();pts.push([x,Math.max(pts[pts.length-1][1]+40,top(last.top)+last.height*.6)]);
}
// the seed sits on the path, level with the middle of the screen (y always grows along the path, so a binary search finds it)
function ride(){
  if(reduce.matches||!len){seed.hidden=true;drawn.style.strokeDashoffset='0';stops.forEach(c=>c.classList.remove('lit'));return;}
  seed.hidden=false;
  const target=Math.min(y1,Math.max(y0,scrollY+innerHeight*.55));
  let lo=0,hi=len;for(let k=0;k<22;k++){const mid=(lo+hi)/2;path.getPointAtLength(mid).y<target?lo=mid:hi=mid;}
  const q=path.getPointAtLength(lo),q2=path.getPointAtLength(Math.min(len,lo+2));
  drawn.style.strokeDashoffset=(len-lo).toFixed(1);
  stops.forEach(c=>c.classList.toggle('lit',+c.getAttribute('cy')<q.y));
  const ang=Math.atan2(q2.y-q.y,q2.x-q.x)*180/Math.PI-90;
  seed.style.transform=`translate(${(q.x-7).toFixed(1)}px,${(q.y-10).toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
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
