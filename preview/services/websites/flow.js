/* Flow: three small things, done carefully (Tristan: "Whenever you scroll on that cyber security website, it just flows").
   1 The seed through the Care board. No line down the whole page (Tristan: it "feels cheap and ineffective ... it feels like
     should go into something on the next page ... Into Bunny World, these notches are an obvious place for it to go through").
     A meadow seed comes in under "Care includes", runs along each flap row's split seam, turns outside the row and drops to
     the next, and after the last row falls into Bunny World and lands beside its name, where a sprout comes up. Scroll
     drives it and its dashed trail is drawn behind it; scrolling back takes it back.
   2 One pinned scene. On wide screens the register demo holds in place while you scroll: the receipt slides in, Sold out
     plays on its own, the caption lands, then the scene lets go. Tapping still works, and phones simply scroll.
   3 A small fixed chapter index on wide screens that lights up as you go.
   4 The Bunny World ticket row (Tristan: "On Dope security, they'd have the scroll function make you quickly cause this to
     scroll from left to right"). On 768 px and up the heading and row hold in place and scrolling runs the row 01 to 09 in
     about 1.25 screens, then the page carries on; scrolling back runs it back. While it runs, the section takes on each shop's
     colour in turn ("the background would do something like shift hues as it happens"). Phones and reduced motion: the plain
     swipe row on the purple.
   Phones (≤ 767 px) have no line, seed or sprout at all (Tristan: "Remove the line that cuts through the mobile version").
   Reduced motion: the trail is a still drawing with the sprout already up; the seed and the pin are off. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const wide=matchMedia('(min-width: 981px)');
const phone=matchMedia('(max-width: 767px)');
const NS='http://www.w3.org/2000/svg';

// ---- 1 the seed through the Care board ----
const svg=document.createElementNS(NS,'svg');svg.setAttribute('data-through','');svg.setAttribute('aria-hidden','true');svg.classList.add('through');
svg.innerHTML='<defs><mask id="seed-trail" maskUnits="userSpaceOnUse"><path class="reveal" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/></mask></defs><path class="trail" mask="url(#seed-trail)"/>';
const path=svg.querySelector('.trail'),reveal=svg.querySelector('.reveal'),mask=svg.querySelector('mask');
const seed=document.createElement('span');seed.className='traveller';seed.setAttribute('data-traveller','');seed.setAttribute('aria-hidden','true');
seed.innerHTML='<svg viewBox="0 0 16 22"><path d="M8 1C4 6 3 11 3 14a5 5 0 0 0 10 0c0-3-1-8-5-13z" fill="currentColor"/><path d="M8 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const sprout=document.createElement('span');sprout.className='sprout';sprout.setAttribute('data-sprout','');sprout.setAttribute('aria-hidden','true');
sprout.innerHTML='<svg viewBox="0 0 26 36"><path class="stem" d="M13 35.5C13 28 13.6 21 13 14"/><path class="leaf" d="M13 21C7.6 21.4 2.6 18.4 1.6 11.6 7.8 11.2 12.4 15 13 21z"/><path class="leaf" d="M13 15.6C13.2 8.6 17.2 2.8 24.4 1.6 25 8.8 20.2 14.6 13 15.6z"/></svg>';
document.body.append(svg,seed,sprout);
let len=0,startY=0,landY=0,table=null,shown=0,goal=0,anim=0,tiles=[];
function build(){
  const flaps=[...document.querySelectorAll('#care .flap')],word=document.querySelector('#bunny-world .bw-word'),head=document.querySelector('#bunny-world .bw-head');
  const off=phone.matches||flaps.length<1||!word;
  svg.style.display=off?'none':'';sprout.hidden=off;
  if(off){len=0;seed.hidden=true;return;}
  const H=document.documentElement.scrollHeight,W=document.documentElement.clientWidth,Y=y=>y+scrollY;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  ['x','y'].forEach(a=>mask.setAttribute(a,0));mask.setAttribute('width',W);mask.setAttribute('height',H);
  const R0=flaps[0].getBoundingClientRect(),L=R0.left,R=R0.right;
  const seams=flaps.map(f=>{const r=f.getBoundingClientRect();return Y(r.top+r.height/2);});
  const pitch=seams.length>1?seams[1]-seams[0]:R0.height+16;
  const k=Math.max(14,Math.min(56,L-10,W-R-10));                 // how far a turn swings outside the rows
  const c=k/.75;                                                  // a cubic with both handles out c reaches k
  const kick=document.querySelector('#care .kick'),kr=kick?kick.getBoundingClientRect():null;
  const f=n=>n.toFixed(1);
  startY=kr?Y(kr.top+kr.height/2):seams[0]-pitch*.8;
  let d=`M${f(L-k)} ${f(startY)} C${f(L-k)} ${f(seams[0]-4)} ${f(L-k*.45)} ${f(seams[0])} ${f(L)} ${f(seams[0])}`;
  seams.forEach((s,i)=>{const ltr=i%2===0,to=ltr?R:L;d+=` L${f(to)} ${f(s)}`;
    if(i<seams.length-1){const out=ltr?to+c:to-c,n=seams[i+1];d+=` C${f(out)} ${f(s)} ${f(out)} ${f(n)} ${f(to)} ${f(n)}`;}});
  // out of the last row, round into the margin, down past the board's end, across above the Bunny World heading, and down beside its name
  const last=seams[seams.length-1],side=seams.length%2?R:L,dir=seams.length%2?1:-1,mx=side+dir*k,y1=last+pitch*.5;
  const wr=word.getBoundingClientRect(),hr=head.getBoundingClientRect(),lx=Math.min(W-20,wr.right+16);
  landY=Y(wr.bottom)+2;const endY=landY-12,yh=Y(hr.top)-6,ym=(y1+yh)/2;
  d+=` C${f(side+dir*k*.55)} ${f(last)} ${f(mx)} ${f(last+pitch*.22)} ${f(mx)} ${f(y1)}`;
  d+=` C${f(mx)} ${f(ym)} ${f(lx)} ${f(ym)} ${f(lx)} ${f(yh)} L${f(lx)} ${f(endY)}`;
  path.setAttribute('d',d);reveal.setAttribute('d',d);len=path.getTotalLength();
  // in a row, the thread passes behind the letter tiles and the arrow (it goes through the notch, it does not strike them out)
  mask.querySelectorAll('rect').forEach(r=>r.remove());
  tiles=[...document.querySelectorAll('#care .flap-w,#care .flap-a')].map(e=>{const r=e.getBoundingClientRect(),fr=e.closest('.flap').getBoundingClientRect(),cy=Y(fr.top+fr.height/2);
    return {x:r.left-6,y:cy-9,w:r.width+12,h:18};});
  tiles.forEach(t=>{const r=document.createElementNS(NS,'rect');['x','y','width','height'].forEach((a,i)=>r.setAttribute(a,f([t.x,t.y,t.w,t.h][i])));r.setAttribute('fill','#000');mask.appendChild(r);});
  reveal.style.strokeDasharray=`${len+2} ${len+20}`;
  // time along the path: vertical travel counts more than running along a seam, so the drops are not a blur
  const N=Math.max(200,Math.ceil(len/6));table=new Float32Array(N+1);let prev=path.getPointAtLength(0),acc=0;
  for(let i=1;i<=N;i++){const q=path.getPointAtLength(len*i/N);acc+=Math.abs(q.x-prev.x)*.4+Math.abs(q.y-prev.y)*1.8;table[i]=acc;prev=q;}
  for(let i=1;i<=N;i++)table[i]/=acc;
  sprout.style.transform=`translate(${f(lx-13)}px,${f(landY-36)}px)`;
  if(reduce.matches){shown=goal=1;}
  ride(true);
}
// progress 0 when the path's start is at 62% of the screen (after the first row has flipped in), 1 when the landing is at the screen's middle
function target(){const a=startY-innerHeight*.62,b=landY-innerHeight*.5;return Math.min(1,Math.max(0,(scrollY-a)/Math.max(1,b-a)));}
function lengthAt(p){if(p<=0)return 0;if(p>=1)return len;let lo=0,hi=table.length-1;while(hi-lo>1){const m=(lo+hi)>>1;table[m]<p?lo=m:hi=m;}
  const t=(p-table[lo])/Math.max(1e-6,table[hi]-table[lo]);return len*(lo+t)/(table.length-1);}
function paint(){
  const still=reduce.matches,s=still?len:lengthAt(shown);
  reveal.style.strokeDashoffset=String(len+2-s);svg.dataset.drawn=s.toFixed(1);
  const landed=still||shown>=.999;sprout.classList.toggle('up',landed);sprout.classList.toggle('still',still);
  if(still){seed.hidden=true;return;}
  seed.hidden=false;seed.classList.toggle('landed',landed);
  const q=path.getPointAtLength(s);seed.classList.toggle('under',tiles.some(t=>q.x>t.x&&q.x<t.x+t.w&&q.y>t.y&&q.y<t.y+t.h));
  const q2=path.getPointAtLength(Math.min(len,s+2)),q0=path.getPointAtLength(Math.max(0,s-2));
  const ang=s>=len-1?0:Math.atan2(q2.y-q0.y,q2.x-q0.x)*180/Math.PI-90;
  seed.style.transform=`translate(${(q.x-7).toFixed(1)}px,${(q.y-10).toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
}
// the seed glides to where the scroll says, rather than jumping a wheel notch at a time
function ride(now){
  if(!len){seed.hidden=true;return;}
  if(reduce.matches){paint();return;}
  goal=target();if(now){shown=goal;paint();}
  if(!anim)anim=requestAnimationFrame(function step(){const dd=goal-shown;shown=Math.abs(dd)<.0008?goal:shown+dd*.22;paint();anim=shown===goal?0:requestAnimationFrame(step);});
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

// ---- 4 the Bunny World ticket row ----
const rail=document.querySelector('[data-rail]'),stick=rail&&rail.querySelector('.bw-stick'),row=rail&&rail.querySelector('.tickets');
let railOn=false,run=0,travel=0;
// each shop's colour, pulled from its ticket photo and darkened until the cream text and the softer line both pass AA
const TONES={'bunny-burritos':'#4C2619','hare-today':'#333030','hopwell-chiro':'#382F24','bunny-auto':'#28323C','warren-bakehouse':'#422B1A',
  'hop-along':'#373012','cottontail-farm':'#432A16','burrow-and-bough':'#472818','long-ears':'#253241'};
const band=rail&&rail.closest('.bw-band'),hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const tones=row?[...row.querySelectorAll('.ticket')].map(t=>hex(TONES[t.dataset.shop]||'#332739')):[];
function hue(p){
  if(!band)return;
  if(!railOn||p<=0||p>=1){band.style.removeProperty('--bw-bg');return;}   // the page's purple, eased back by the CSS
  const f=p*(tones.length-1),i=Math.min(tones.length-2,Math.floor(f)),k=f-i;    // a flat colour, crossfaded between neighbours
  band.style.setProperty('--bw-bg','rgb('+tones[i].map((v,j)=>Math.round(v+(tones[i+1][j]-v)*k)).join(',')+')');
}
function railBuild(){
  if(!row)return;
  const bar=document.querySelector('.topbar'),barH=bar?bar.getBoundingClientRect().height:0;
  const h=stick.offsetHeight,room=innerHeight-barH;                // the same whether held or not, so nothing is undone to measure
  travel=row.scrollWidth-row.clientWidth;
  railOn=!phone.matches&&!reduce.matches&&travel>0&&h<=room-16;
  if(!railOn){rail.classList.remove('on');row.scrollLeft=0;hue(0);return;}
  run=Math.round(innerHeight*1.25);
  rail.style.setProperty('--rail-h',(h+run)+'px');
  rail.style.setProperty('--stick-top',Math.round(barH+Math.max(16,(room-h)/2))+'px');
  rail.classList.add('on');slide();
}
function slide(){
  if(!railOn)return;
  const top=parseFloat(rail.style.getPropertyValue('--stick-top')),p=Math.min(1,Math.max(0,(top-rail.getBoundingClientRect().top)/run));
  row.scrollLeft=p*travel;hue(p);
}
// Tab into the row: put the page where that ticket is on screen, so the row and the scroll agree
rail&&rail.addEventListener('focusin',e=>{const t=e.target.closest('.ticket');if(!railOn||!t)return;
  requestAnimationFrame(()=>{const tr=t.getBoundingClientRect(),rr=row.getBoundingClientRect(),want=Math.min(travel,Math.max(0,row.scrollLeft+tr.left-rr.left-(rr.width-tr.width)/2));
    const top=parseFloat(rail.style.getPropertyValue('--stick-top')),y0=rail.getBoundingClientRect().top+scrollY-top;
    scrollTo({top:y0+want/travel*run,behavior:"instant"});slide();});});

let tick=0;const frame=()=>{tick=0;ride();play();light();slide();};
addEventListener('scroll',()=>{if(!tick)tick=requestAnimationFrame(frame);},{passive:true});
const rebuild=()=>requestAnimationFrame(()=>{railBuild();build();frame();});
addEventListener('resize',rebuild);phone.addEventListener?.('change',rebuild);addEventListener('load',rebuild);
document.fonts&&document.fonts.ready.then(rebuild);
new ResizeObserver(rebuild).observe(document.body);
reduce.addEventListener?.('change',rebuild);
railBuild();build();frame();
})();
