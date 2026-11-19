/* The Websites page as a Short: eleven full-screen beats, one line each.
   Swipe, scroll the wheel, tap the right or left side, or use the arrow keys, Space and Page Up/Down. Each moves exactly one beat,
   and the segmented bar at the top fills to match. Beats off screen are inert, so they can't be tabbed into.
   Going past the last beat (or "Read the details") opens the full prices, the hookup and the questions below as a normal page. */
(()=>{
const short=document.getElementById('short');if(!short)return;
const track=short.querySelector('.track'),beats=[...short.querySelectorAll('.beat')],bars=[...document.querySelectorAll('.progress i')];
const details=document.getElementById('details'),readBtn=short.querySelector('.more-link');
const N=beats.length,reduce=matchMedia('(prefers-reduced-motion: reduce)');
let cur=1,open=false;

function place(){track.style.transform=`translate3d(0,${-(cur-1)*short.clientHeight}px,0)`;}
function goTo(n){
  n=Math.max(1,Math.min(N,n));if(n===cur)return;cur=n;
  short.dataset.current=String(n);
  bars.forEach((b,i)=>b.classList.toggle('on',i<n));
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
  if(e.target.closest('a,button,input,label,summary,.register,.rail,.phone'))return;
  if(String(getSelection()).length)return;
  e.clientX>=innerWidth*.4?next():prev();
});

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
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&cur>=5)load(e.target.querySelector('iframe'));}),{root:rail,rootMargin:'0px 60% 0px 60%'});
  document.addEventListener('short:beat',e=>{if(e.detail>=5){frames.slice(0,2).forEach(load);rail.querySelectorAll('.shop').forEach(s=>io.observe(s));}});
}

// first beat: everything else inert
beats.forEach((b,i)=>{if(i){b.inert=true;b.setAttribute('aria-hidden','true');}});
bars[0]&&bars[0].classList.add('on');
new ResizeObserver(place).observe(short);place();
document.documentElement.classList.add('short-ready');
})();
