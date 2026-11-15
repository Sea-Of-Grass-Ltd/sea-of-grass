/* The Warren Bakehouse: the 6:30 bell. A live countdown to the daily bread drop, and a rack whose counts fall
   through the morning (demo data, the same for everyone at the same minute) as people hold and buy.
   Colorado time, whatever the visitor's clock says. "Watch a morning at 60x" runs a pretend clock from 6:29:45. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const bell=$('#bell');if(!bell)return;
const BELL=6*3600+30*60;                       // 6:30 am, in seconds
const CLOSE={0:13*3600,2:14*3600,3:14*3600,4:14*3600,5:14*3600,6:14*3600};  // no bell on Monday (1)
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Colorado wall clock: weekday 0-6 and seconds since midnight */
function realNow(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'short',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),sec:(+p.hour%24)*3600+(+p.minute)*60+(+p.second)};}
let fast=null;                                  // {t0: real ms at start, from: seconds, day}
function now(){if(!fast)return realNow();const s=fast.from+(Date.now()-fast.t0)/1000*60;return{day:fast.day,sec:Math.min(s,86399)};}

/* seconds until the next bell, from (day, sec) */
function untilNext(n){for(let k=0;k<8;k++){const d=(n.day+k)%7;if(!(d in CLOSE))continue;const at=k*86400+BELL;if(at>n.sec)return at-n.sec;}return 0;}
const hms=t=>{t=Math.max(0,Math.ceil(t));const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return`${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;};
/* the clock: numbers lead, the h/m/s units sit small beside them; aria-label keeps it readable as words */
const clockHTML=t=>{t=Math.max(0,Math.ceil(t));const p=[Math.floor(t/3600),Math.floor(t%3600/60),t%60].map(v=>String(v).padStart(2,'0'));
  return`<b>${p[0]}</b><i>h</i><b>${p[1]}</b><i>m</i><b>${p[2]}</b><i>s</i>`;};
const hm=t=>{t=Math.max(0,Math.round(t/60));const h=Math.floor(t/60),m=t%60;return h?`${h}h ${m}m`:`${m}m`;};

const clock=$('[data-clock]'),state=$('[data-bell-state]'),sub=$('[data-bell-sub]'),tick=$('[data-ticker]'),fastB=$('[data-fast]');
const loaves=$$('.loaf').map(el=>({el,name:$('.lbl b',el).textContent,batch:+el.dataset.batch,rate:+el.dataset.rate,held:0,last:null,
  left:$('[data-left]',el),of:$('[data-of]',el),pips:$$('.pips i',el),btn:$('.hold1',el)}));

/* phase: 'before' the bell today, 'open' after it until close, 'after' close (or a day without a bell) */
function phase(n){const c=CLOSE[n.day];if(c===undefined)return'after';if(n.sec<BELL)return'before';if(n.sec<c)return'open';return'after';}
/* loaves left on the rack: they sell fastest in the first hour, slower as the morning goes */
function leftOf(l,n){const h=(n.sec-BELL)/3600;const v=l.batch*Math.exp(-l.rate*h);return Math.max(0,(v<.5?0:Math.round(v))-l.held);}

let lastFeed=0;
function feed(msg){const t=Date.now();if(t-lastFeed<2500)return;lastFeed=t;tick.textContent=msg;}
const clockTxt=n=>{let h=Math.floor(n.sec/3600),m=Math.floor(n.sec%3600/60);const ap=h>=12?'pm':'am';h=h%12||12;return`${h}:${String(m).padStart(2,'0')} ${ap}`;};

function draw(){const n=now(),ph=phase(n),next=untilNext(n);
  clock.innerHTML=clockHTML(next);clock.setAttribute('aria-label',hms(next).replace(/(\d+)h (\d+)m (\d+)s/,'$1 hours $2 minutes $3 seconds'));
  bell.dataset.phase=ph;
  const sinceBell=n.sec-BELL;
  if(ph==='before'){state.textContent='The bell rings in';sub.textContent=`Six named loaves are proofing. They come out at 6:30 sharp; hold one now and it waits for you.`;}
  else if(ph==='open'){state.textContent=sinceBell<600?'Ding. The bell just rang. Next bell in':'Next bell in';
    const total=loaves.reduce((a,l)=>a+leftOf(l,n),0);
    sub.textContent=total?`The ovens opened ${hm(sinceBell)} ago. ${total} left on the rack, and falling.`:`Everything from this morning's bell is gone. See you tomorrow at 6:30.`;}
  else{state.textContent='Next bell in';sub.textContent=`The rack is bare and the ovens are cooling. Hold one for the next bell and it waits with your name on it.`;}
  bell.classList.toggle('ding',ph==='open'&&sinceBell<600&&!reduce);
  loaves.forEach(l=>{let left,of,sold=false;
    if(ph==='open'){left=leftOf(l,n);sold=left===0;of=sold?'Sold out. See you tomorrow, 6:30.':`left of ${l.batch}`;
      if(l.last!==null&&left<l.last&&left>0)feed(`${clockTxt(n)} · someone just held ${l.name}. ${left} left.`);
      if(l.last!==null&&left===0&&l.last>0)feed(`${clockTxt(n)} · ${l.name} just sold out.`);}
    else{left=Math.max(0,l.batch-l.held);of=ph==='before'?'coming out at 6:30':'at the next bell';}
    if(l.last!==null&&left!==l.last&&!reduce){l.left.classList.remove('bump');void l.left.offsetWidth;l.left.classList.add('bump');}
    l.last=left;l.left.textContent=left;l.of.textContent=of;
    const lit=ph==='open'?left:Math.max(0,l.batch-l.held);l.pips.forEach((p,i)=>p.classList.toggle('on',i<lit));
    l.el.classList.toggle('sold',sold);l.btn.disabled=sold;
    l.btn.innerHTML=sold?'Sold out':`Hold one${ph==='open'?'':' for the bell'} &middot; $${(+l.btn.dataset.price).toFixed(2)}`;});
  if(ph!=='open'&&!fast)tick.textContent=ph==='before'?'Counts go live at 6:30.':'Counts go live at the next bell.';
}
/* a hold takes one off the rack straight away (the cart itself is bw.js) */
loaves.forEach(l=>l.btn.addEventListener('click',()=>{l.held++;draw();}));

fastB.addEventListener('click',()=>{const on=!fast;
  if(on){const r=realNow();let d=r.day;if(!(d in CLOSE))d=2;fast={t0:Date.now(),from:BELL-15,day:d};loaves.forEach(l=>{l.last=null;});tick.textContent='Pretend clock: 6:29:45, running at 60×.';}
  else{fast=null;loaves.forEach(l=>{l.last=null;});}
  fastB.setAttribute('aria-pressed',String(on));fastB.textContent=on?'Back to real time':'Watch a morning at 60×';draw();
  if(on)$('#rack').scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});});

draw();setInterval(draw,1000);
})();
