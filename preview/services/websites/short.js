/* The Websites page as a Short: eleven full-screen beats, one line each.
   Swipe, scroll the wheel, tap the right or left side, or use the arrow keys, Space and Page Up/Down. Each moves exactly one beat,
   and the segmented bar at the top fills to match. Beats off screen are inert, so they can't be tabbed into.
   Going past the last beat (or "Read the details") opens the full prices, the hookup and the questions below as a normal page. */
(()=>{
const short=document.getElementById('short');if(!short)return;
const track=short.querySelector('.track'),beats=[...short.querySelectorAll('.beat')],bars=[...document.querySelectorAll('.progress i')];
const details=document.getElementById('details'),readBtn=short.querySelector('.more-link');
const countEl=document.querySelector('[data-count]'),line=document.querySelector('[data-meadow-line]');
const N=beats.length,reduce=matchMedia('(prefers-reduced-motion: reduce)');
let cur=1,open=false;

function place(){track.style.transform=`translate3d(0,${-(cur-1)*short.clientHeight}px,0)`;}
function goTo(n){
  n=Math.max(1,Math.min(N,n));if(n===cur)return;cur=n;
  short.dataset.current=String(n);document.body.dataset.beat=String(n);
  bars.forEach((b,i)=>b.classList.toggle('on',i<n));
  if(countEl)countEl.textContent=`${n} / ${N}`;if(line)line.style.setProperty('--p',(n/N).toFixed(4));
  beats.forEach((b,i)=>{const on=i===n-1;b.inert=!on;b.setAttribute('aria-hidden',String(!on));
    if(on){b.classList.remove('is-in');void b.offsetWidth;b.classList.add('is-in');}else b.classList.remove('is-in');});
  place();
  document.dispatchEvent(new CustomEvent('short:beat',{detail:n}));
}
const next=()=>{if(cur===N)openDetails('top');else goTo(cur+1);};
const prev=()=>goTo(cur-1);

function openDetails(where){
  if(!open){open=true;document.body.classList.add('details-open');readBtn&&readBtn.setAttribute('aria-expanded','true');}
  const t=where==='buy'?document.getElementById('buy'):details;
  requestAnimationFrame(()=>t.scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'}));
}
// details open and scrolled into them: the page scrolls normally and the beats leave input alone
const reading=()=>open&&scrollY>4;

// keyboard
addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey||reading())return;
  const t=e.target;if(t.closest&&t.closest('input,textarea,select,[contenteditable]'))return;
  const k=e.key;
  if((k===' '||k==='Enter')&&t.closest&&t.closest('a,button,summary'))return;
  if(k==='ArrowDown'||k==='ArrowRight'||k==='PageDown'||(k===' '&&!e.shiftKey)){e.preventDefault();next();}
  else if(k==='ArrowUp'||k==='ArrowLeft'||k==='PageUp'||(k===' '&&e.shiftKey)){e.preventDefault();prev();}
  else if(k==='Home'){e.preventDefault();goTo(1);}
  else if(k==='End'){e.preventDefault();goTo(N);}
});

// wheel: one flick moves one beat; the lock lifts once the wheel has been still for a moment
let acc=0,locked=false,lastWheel=0,lastMove=0;
addEventListener('wheel',e=>{
  if(reading())return;
  if(open&&e.deltaY>0)return;                          // at the top of an open page, scrolling down reads the details
  if(Math.abs(e.deltaY)<Math.abs(e.deltaX))return;
  e.preventDefault();
  const now=performance.now();
  if(locked&&now-lastWheel>220&&now-lastMove>420)locked=false;
  lastWheel=now;if(locked)return;
  acc+=e.deltaY;
  if(Math.abs(acc)>30){acc>0?next():prev();acc=0;locked=true;lastMove=now;}
},{passive:false});

// touch: a vertical swipe moves one beat; sideways swipes on the shop rail are left to the rail
let sx=0,sy=0,inRail=false,startTop=0;
addEventListener('touchstart',e=>{const p=e.touches[0];sx=p.clientX;sy=p.clientY;startTop=scrollY;
  inRail=!!(e.target.closest&&e.target.closest('.rail'));},{passive:true});
addEventListener('touchmove',e=>{
  if(open)return;
  const p=e.touches[0],dx=p.clientX-sx,dy=p.clientY-sy;
  if(inRail&&Math.abs(dx)>Math.abs(dy))return;
  e.preventDefault();
},{passive:false});
addEventListener('touchend',e=>{
  const p=e.changedTouches[0],dx=p.clientX-sx,dy=p.clientY-sy;
  if(Math.abs(dy)<40||Math.abs(dy)<Math.abs(dx))return;
  if(open&&(startTop>4||dy<0))return;
  dy<0?next():prev();
},{passive:true});

// tap: right side forward, left side back, except on the things you play with
short.addEventListener('click',e=>{
  if(e.target.closest('a,button,input,label,summary,.register,.rail,.phone,[data-game],.ask'))return;
  if(String(getSelection()).length)return;
  e.clientX>=innerWidth*.4?next():prev();
});

// the price card: tapping $1,200 shows what it works out to each week
short.querySelectorAll('[data-week-toggle]').forEach(b=>b.addEventListener('click',()=>{
  const w=document.getElementById(b.getAttribute('aria-controls')),on=b.getAttribute('aria-expanded')!=='true';
  b.setAttribute('aria-expanded',String(on));if(w)w.hidden=!on;}));

// the first five: one flower per founding spot, open for each spot still free (from SOG_SHOP.founding, never faked)
(()=>{const f=window.SOG_SHOP&&SOG_SHOP.founding,fl=[...short.querySelectorAll('.flower')];if(!f||!fl.length)return;
  fl.forEach((x,i)=>{x.style.display=i<f.total?'':'none';x.classList.toggle('open',i<f.left);});})();

// buttons and links that open the details
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-open-details]');if(b){e.preventDefault();openDetails(b.dataset.openDetails);return;}
  const a=e.target.closest('a[href^="#"]');if(!a)return;
  const id=a.getAttribute('href').slice(1),el=id&&document.getElementById(id);
  if(el&&details.contains(el)||id==='details'){e.preventDefault();openDetails(id==='buy'?'buy':'top');}
});
if(location.hash&&(location.hash==='#details'||details.querySelector(location.hash.replace(/[^#\w-]/g,''))))openDetails(location.hash==='#buy'?'buy':'top');

// the Bunny World rail: shops load as you get near, drawn at 390 px and scaled to their frame
const rail=short.querySelector('.rail');
function fitView(v){const f=v.querySelector('iframe'),w=v.clientWidth,h=v.clientHeight;if(!w)return;const s=w/(+v.dataset.w||390);
  f.style.width=(+v.dataset.w||390)+'px';f.style.height=Math.ceil(h/s)+'px';f.style.transform=`scale(${s})`;}
const load=f=>{if(f&&!f.getAttribute('src'))f.src=f.dataset.lazy;};
if(rail){
  const frames=[...rail.querySelectorAll('iframe')];
  const ro=new ResizeObserver(es=>es.forEach(e=>fitView(e.target)));rail.querySelectorAll('.view').forEach(v=>ro.observe(v));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&cur>=3)load(e.target.querySelector('iframe'));}),{root:rail,rootMargin:'0px 60% 0px 60%'});
  const shops=[...rail.querySelectorAll('.shop')],count=short.querySelector('[data-rail-count]');
  document.addEventListener('short:beat',e=>{if(e.detail>=3){frames.slice(0,2).forEach(load);shops.forEach(s=>io.observe(s));}});
  // the "1 of 9" count follows the first shop in view at the rail's left edge
  let tick=0;rail.addEventListener('scroll',()=>{cancelAnimationFrame(tick);tick=requestAnimationFrame(()=>{
    const left=rail.scrollLeft;let best=0,bd=1e9;
    shops.forEach((s,i)=>{const d=Math.abs(s.offsetLeft-rail.offsetLeft-left);if(d<bd){bd=d;best=i;}});
    if(left+rail.clientWidth>=rail.scrollWidth-4)best=shops.length-1;          // scrolled to the end: the last shop is in view
    const end=short.querySelector('[data-rail-end]');if(end&&best===shops.length-1)end.hidden=false;
    if(count)count.textContent=`${best+1} of ${shops.length}`;});},{passive:true});
}


// ---- the six mini games: one verb each, instant with a finger, and every card has Skip ----
short.querySelectorAll('[data-skip]').forEach(b=>b.addEventListener('click',next));

// 1 KNOCK: sweep through the meadow; enough knocking pops the shop pin out of the grass
(()=>{const zone=short.querySelector('[data-game="knock"]');if(!zone)return;
  const pin=zone.querySelector('[data-pin]'),found=short.querySelector('[data-found]'),hint=short.querySelector('.b1 .hint');
  let dist=0,lx=null,ly=null,done=false;
  const reveal=()=>{if(done)return;done=true;pin.removeAttribute("hidden");requestAnimationFrame(()=>pin.classList.add('up'));
    if(found)found.hidden=false;if(hint)hint.hidden=true;const fb=short.querySelector('[data-ask="facebook"]');if(fb)fb.hidden=false;};
  const add=d=>{dist+=d;if(dist>=Math.min(700,zone.clientWidth*1.6))reveal();};
  zone.addEventListener('pointerdown',e=>{lx=e.clientX;ly=e.clientY;add(120);});
  zone.addEventListener('pointermove',e=>{if(lx!==null)add(Math.hypot(e.clientX-lx,e.clientY-ly));lx=e.clientX;ly=e.clientY;},{passive:true});
  const lift=()=>{lx=ly=null;};
  zone.addEventListener('pointerleave',lift);zone.addEventListener('pointercancel',lift);
  zone.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')lift();});
})();

// 3 TAP: each call gets the website's answer; all three answered blooms the meadow
(()=>{const calls=[...short.querySelectorAll('.call')];if(!calls.length)return;
  const done=short.querySelector('[data-calls-done]'),bloom=short.querySelector('.b3 .live-grass.bloom');
  calls.forEach(c=>c.addEventListener('click',()=>{if(c.classList.contains('answered'))return;c.classList.add('answered');
    c.setAttribute('aria-label',c.querySelector('.q').textContent+' Answered: '+c.querySelector('.a').textContent);
    if(calls.every(x=>x.classList.contains('answered'))){if(done)done.hidden=false;if(bloom){bloom.hidden=false;document.dispatchEvent(new Event('sog-theme'));}
      const own=short.querySelector('[data-ask="business"]');if(own)own.hidden=false;}}));
})();

// 5 DRAG: spread $1,200 across a year; at 52 weeks it lands on the exact line
(()=>{const r=short.querySelector('[data-weeks]');if(!r)return;
  const out=short.querySelector('[data-weekly]'),week=short.querySelector('[data-week]');
  const draw=()=>{const n=+r.value;r.style.setProperty('--fill',(n/52*100)+'%');
    out.textContent=n===0?'$1,200 up front':n===52?'$23 a week for a year':`$${Math.round(1200/n).toLocaleString('en-US')} a week for ${n} week${n>1?'s':''}`;
    if(n===52&&week){week.hidden=false;const or=short.querySelector('[data-or]');if(or)or.hidden=false;}};
  r.addEventListener('input',draw);draw();
})();

// 6 BLOOM: tap an open flower to see it bloom; the real spots count never changes
(()=>{const fl=[...short.querySelectorAll('.flower')],yours=short.querySelector('[data-yours]'),btn=short.querySelector('.b6 .btn');
  fl.forEach(f=>{if(!f.classList.contains('open')){f.disabled=true;f.setAttribute('aria-label','Founding spot, taken');return;}
    f.addEventListener('click',()=>{fl.forEach(x=>x.classList.toggle('picked',x===f));if(yours)yours.hidden=false;
      if(btn){btn.classList.remove('lit');void btn.offsetWidth;btn.classList.add('lit');}});});
})();


// the walk-in card's answers: owner doubts that answer themselves on a tap
short.querySelectorAll('.ask').forEach(b=>b.addEventListener('click',()=>{if(b.classList.contains('answered'))return;b.classList.add('answered');
  b.setAttribute('aria-label',b.querySelector('.q').textContent+' '+b.querySelector('.a').textContent);}));

// "Not yet? Save this for later": the phone's share sheet where there is one, otherwise the link copied
(()=>{const b=short.querySelector('[data-later]'),msg=short.querySelector('[data-later-msg]');if(!b)return;
  const url=location.origin+location.pathname,say=t=>{if(msg)msg.textContent=t;};
  b.addEventListener('click',async()=>{
    if(navigator.share){try{await navigator.share({title:'Sea of Grass websites',url});say('Saved. Come back any time.');return;}catch(e){if(e&&e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(url);say('Link copied. Come back any time.');}
    catch{say('Save this link for later: '+url);}
  });})();

// a meadow measured before the page settled (seen on phones) gets measured again once fonts and images are in
const remeasure=()=>dispatchEvent(new Event('resize'));
addEventListener('load',()=>{requestAnimationFrame(remeasure);document.fonts&&document.fonts.ready.then(()=>requestAnimationFrame(remeasure));});

// first beat: everything else inert
beats.forEach((b,i)=>{if(i){b.inert=true;b.setAttribute('aria-hidden','true');}});
bars[0]&&bars[0].classList.add('on');document.body.dataset.beat='1';
new ResizeObserver(place).observe(short);place();
document.documentElement.classList.add('short-ready');
})();
