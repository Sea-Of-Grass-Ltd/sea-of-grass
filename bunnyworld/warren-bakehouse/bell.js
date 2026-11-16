/* The Warren Bakehouse: the countdown to the next bake (Tristan, 2026-11-16: "he misses the countdown").
   Colorado time, whatever the visitor's clock says. Closed days are honest: the label names the next real bake.
   Digits sit in fixed-width pairs (lining, tabular figures), so nothing moves as they tick.
   Reduced motion: hours and minutes only, updated once a minute. */
(function(){
const el=document.querySelector('[data-countdown]'),lab=document.querySelector('[data-next]');if(!el||!lab)return;
const BELL=6*3600+30*60;
const CLOSE={0:13*3600,2:14*3600,3:14*3600,4:14*3600,5:14*3600,6:14*3600};   // closed Monday (1)
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sec=el.querySelector(".sec");if(reduce&&sec)sec.remove();const [dh,dm,ds]=el.querySelectorAll("[data-d]");
const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'short',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'});
function now(){const p=Object.fromEntries(fmt.formatToParts(new Date()).map(x=>[x.type,x.value]));
  return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),s:(+p.hour%24)*3600+(+p.minute)*60+(+p.second)};}
function next(n){for(let k=0;k<8;k++){const d=(n.day+k)%7;if(!(d in CLOSE))continue;const at=k*86400+BELL;if(at>n.s)return{left:at-n.s,k,d};}return{left:0,k:0,d:n.day};}
const WORD=['twelve','one','two','three','four','five','six','seven','eight','nine','ten','eleven'];
const shut=t=>WORD[Math.floor(t/3600)%12]; // words, not digits: the serif's figures are oldstyle (Tristan, 2026-11-16)
const pad=v=>String(v).padStart(2,'0');
let lastLabel='',lastMin=-1;
function draw(){const n=now(),x=next(n);
  const open=n.day in CLOSE&&n.s>=BELL&&n.s<CLOSE[n.day];
  const when=x.k===1?'tomorrow morning':'on '+DAYS[x.d]+' morning';
  const label=x.k===0&&!open?'This morning’s bread comes out in':
    open?`Today’s bread is out, and we’re open until ${shut(CLOSE[n.day])}. The next bake is ${when}, in`:
    `We’re closed right now. The next bake is ${when}, in`;
  if(label!==lastLabel){lab.textContent=label;lastLabel=label;}
  let t=Math.max(0,x.left);if(reduce)t=Math.ceil(t/60)*60;
  const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;
  dh.textContent=pad(h);dm.textContent=pad(m);if(ds)ds.textContent=pad(s);
  if(m!==lastMin){lastMin=m;el.setAttribute('aria-label',`${h} hours and ${m} minutes until the next bake`);}}
draw();setInterval(draw,reduce?30000:1000);
})();
