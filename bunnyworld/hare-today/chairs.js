/* Hare Today: who's free right now (a status line and each barber's card), the walk-in list and "Book with ___".
   Each barber's day is a seeded run of appointments (the same for everyone at the same minute), read against
   Colorado time. "Show a busy Saturday" runs a pretend clock from Saturday 10:12 am at 10x. Nothing is sent. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOURS={0:[9,15],2:[9,19],3:[9,19],4:[9,19],5:[9,18],6:[8,16]};          // Monday closed
const DAYN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const BARBERS=[
 {k:'gus',n:'Gus',days:[2,3,4,5,6],brk:12*60},
 {k:'dee',n:'Dee',days:[0,3,4,5,6],brk:12*60+30},
 {k:'marco',n:'Marco',days:[0,2,3,4,6],brk:13*60},
 {k:'sal',n:'Sal',days:[2,4,5,6],brk:13*60+30}];
const SERV=$$('.svc').map(b=>({n:b.dataset.svc,min:+b.dataset.min,price:+b.dataset.price,b}));
const BOARD_SVC=['The Cut','Skin Fade','Cut + Beard','Beard Trim','Hot-Towel Shave','Kids’ Cut','The Cut','Skin Fade'];
const BOARD_MIN=[45,45,60,20,40,30,45,45];

/* ---- clock ---- */
function realNow(){const d=new Date(),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'short',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
  return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),sec:(+p.hour%24)*3600+(+p.minute)*60+(+p.second),seed:+p.year*400+(+p.month)*32+(+p.day)};}
let fake=null;
function now(){if(!fake)return realNow();return{day:6,sec:Math.min(fake.from+(Date.now()-fake.t0)/1000*10,15.9*3600),seed:777};}
const fmtT=min=>{let h=Math.floor(min/60),m=Math.round(min%60);const ap=h>=12?'pm':'am';h=h%12||12;return h+(m?':'+String(m).padStart(2,'0'):'')+' '+ap;};

/* ---- a barber's day: blocks of {from,to,kind,svc} in minutes ---- */
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
const cache={};
function dayOf(b,day,seed){const key=b.k+day+seed;if(cache[key])return cache[key];
  const H=HOURS[day],out=[];if(!H||!b.days.includes(day))return cache[key]=null;
  const r=rng(seed*7+b.k.charCodeAt(0)*131+b.k.length);let t=H[0]*60;const end=H[1]*60;
  while(t<end){if(t>=b.brk&&t<b.brk+30){out.push({from:t,to:b.brk+30,kind:'break'});t=b.brk+30;continue;}
    if(r()<.2){const g=5+Math.floor(r()*12);out.push({from:t,to:Math.min(t+g,end),kind:'free'});t+=g;continue;}
    const i=Math.floor(r()*BOARD_SVC.length);let to=t+BOARD_MIN[i];if(t<b.brk&&to>b.brk)to=b.brk;
    out.push({from:t,to:Math.min(to,end),kind:'busy',svc:BOARD_SVC[i]});t=to;}
  return cache[key]=out;}

/* ---- who's free: the status line under the headline, and each barber's card ---- */
const hash=s=>{let h=9;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;};
// the same open-slot rule the booking picker uses, so "first chair" here is a time you can really book
const slotFree=(b,date,t,len=30)=>!(t>=b.brk-len&&t<b.brk+30)&&hash(date.toDateString()+t+b.k)%3!==0;
function firstChair(b,n){const base=new Date();
  for(let k=0;k<8;k++){const wd=(n.day+k)%7,H=HOURS[wd];if(!H||!b.days.includes(wd))continue;const d=new Date(base);d.setDate(base.getDate()+k);
    for(let t=H[0]*60;t+30<=H[1]*60;t+=30){if(k===0&&t<=n.sec/60+30)continue;if(slotFree(b,d,t))return{k,wd,t,b};}}
  return null;}
const dayWord=c=>c.k===0?'today':c.k===1?'tomorrow':DAYN[c.wd];
const cards=Object.fromEntries($$('[data-barber]').map(r=>[r.dataset.barber,{el:r,now:$('[data-now]',r)}]));
const statusEl=$('[data-status]'),waitEl=$('[data-waitline]'),qEl=$('[data-q]'),listB=$('[data-list]'),satB=$('[data-sat]');
let queue=0,myName='';
function draw(){const n=now(),H=HOURS[n.day],m=n.sec/60,open=H&&m>=H[0]*60&&m<H[1]*60;
  let best=null;
  BARBERS.forEach(b=>{const C=cards[b.k],blocks=open?dayOf(b,n.day,n.seed):null;let line,st;
    if(blocks){const bl=blocks.find(x=>m>=x.from&&m<x.to)||{kind:'free',to:m};const left=Math.max(1,Math.ceil(bl.to-m));
      if(bl.kind==='busy'){st='busy';line=`With a client for about ${left} more min`;if(!best||left<best.left)best={b,left};}
      else if(bl.kind==='break'){st='brk';line=`On a short break, back in ${left} min`;if(!best||left<best.left)best={b,left};}
      else{st='free';line='Free right now, so walk right in';if(!best||best.left>0)best={b,left:0};}}
    else{const c=firstChair(b,n);st='later';line=c?`First open chair ${dayWord(c)} at ${fmtT(c.t)}`:'Booking opens soon';}
    C.el.dataset.state=st;C.now.textContent=line;});
  if(open){const w=(best?best.left:0)+queue*20;
    statusEl.textContent=`We’re open today until ${fmtT(H[1]*60)}, and `+(best&&best.left===0?`${best.b.n} is free right now.`:best?`the next chair is free in about ${best.left} minutes.`:'there’s room for walk-ins.');
    waitEl.textContent=w<1?'There’s no wait for a walk-in right now.':`The walk-in wait right now is about ${Math.max(5,Math.round(w/5)*5)} minutes.`;
    listB.hidden=false;if(!myName)qEl.textContent='Add your name and we’ll text you when a chair is free.';}
  else{const firsts=BARBERS.map(b=>firstChair(b,n)).filter(Boolean).sort((a,b)=>a.k-b.k||a.t-b.t),f=firsts[0];
    const opensToday=H&&m<H[0]*60;
    statusEl.textContent=f?(opensToday?`We open today at ${fmtT(H[0]*60)}, and ${f.b.n} has the first chair at ${fmtT(f.t)}.`:`We’re closed for the night. We open ${dayWord(f)==='tomorrow'?'tomorrow':DAYN[f.wd]} at ${fmtT(HOURS[f.wd][0]*60)}, and ${f.b.n} has the first chair${f.t===HOURS[f.wd][0]*60?"":" at "+fmtT(f.t)}.`):'';
    waitEl.textContent='Here’s when each of us is next in.';
    listB.hidden=true;myName='';queue=0;qEl.textContent='The walk-in list opens when we do.';}
}
listB.addEventListener('click',()=>{
  if(!myName){const f=document.createElement('form');f.className='q-form';f.innerHTML='<label class="sr" for="qn">First name</label><input id="qn" required maxlength="20" placeholder="First name" autocomplete="given-name"><button class="btn" type="submit">Add me</button>';
    listB.replaceWith(f);$('input',f).focus();
    f.addEventListener('submit',e=>{e.preventDefault();myName=$('input',f).value.trim().replace(/</g,'');queue=1+Math.floor(Math.random()*2);
      f.replaceWith(listB);listB.textContent='Take me off the list';draw();
      qEl.textContent=`You’re number ${queue+1} on the list, ${myName}. ${waitEl.textContent} We’ll text you when a chair is free.`;});}
  else{myName='';queue=0;listB.textContent='Put my name on the list';draw();qEl.textContent='You’re off the list. Come back any time.';}});
satB.addEventListener('click',()=>{const on=!fake;fake=on?{t0:Date.now(),from:10*3600+12*60}:null;satB.setAttribute('aria-pressed',String(on));satB.textContent=on?'Back to right now':'Show a busy Saturday';draw();});
draw();setInterval(draw,1000);

/* ---- book with ___ ---- */
const pick={barb:'any',svc:null,day:null,slot:null};
const whoEl=$('[data-who]'),daysEl=$('[data-days]'),slotsEl=$('[data-slots-own]'),sumEl=$('[data-summary]'),conf=$('[data-confirm]');
function workers(day){return BARBERS.filter(b=>(pick.barb==='any'||b.k===pick.barb)&&b.days.includes(day)&&HOURS[day]);}
function buildDays(){daysEl.innerHTML='';const base=new Date(),n=realNow();
  for(let k=0;k<10;k++){const d=new Date(base);d.setDate(base.getDate()+k);const wd=(n.day+k)%7,ok=workers(wd).length>0&&(k>0||n.sec/60+60<=HOURS[wd][1]*60);
    const b=document.createElement('button');b.type='button';b.disabled=!ok;b.setAttribute('aria-pressed','false');
    b.innerHTML=`<span>${k===0?'Today':d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b>`;
    b.setAttribute('aria-label',d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+(ok?'':k===0&&workers(wd).length?', no times left today':', not working'));
    b.onclick=()=>{$$('button',daysEl).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pick.day={d,wd,k};pick.slot=null;buildSlots();sum();};
    daysEl.appendChild(b);}
  for(const b of $$('button:not(:disabled)',daysEl)){b.click();if($('button:not(:disabled)',slotsEl))break;}}
function buildSlots(){slotsEl.innerHTML='';if(!pick.day)return;const{d,wd,k}=pick.day,H=HOURS[wd],n=realNow(),len=pick.svc?pick.svc.min:30;
  for(let t=H[0]*60;t+len<=H[1]*60;t+=30){const free=workers(wd).filter(b=>slotFree(b,d,t,len));
    const past=k===0&&t<=n.sec/60+30;const b=document.createElement('button');b.type='button';b.textContent=fmtT(t);
    b.disabled=past||!free.length;b.setAttribute('aria-pressed','false');
    b.onclick=()=>{$$('button',slotsEl).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pick.slot={t,barber:free[0]};sum();};slotsEl.appendChild(b);}
  if(!$('button:not(:disabled)',slotsEl))slotsEl.innerHTML='<p class="note">'+(k===0?'No times left today.':'Fully booked that day.')+' Try the next one.</p>';}
function sum(){const b=pick.slot?pick.slot.barber:null,ok=pick.svc&&pick.slot;
  sumEl.innerHTML=ok?`<b>${b.n}</b> · ${pick.svc.n} · ${pick.day.d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} at ${fmtT(pick.slot.t)} · ${pick.svc.min} min · <b>$${pick.svc.price}</b>`:(pick.svc?'Now pick a time.':'Pick a service and a time.');
  conf.disabled=!ok;}
function setBarb(k){pick.barb=k;$$('.barb').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.barb===k)));
  whoEl.textContent=k==='any'?'anyone':BARBERS.find(b=>b.k===k).n;buildDays();sum();}
$$('.barb').forEach(b=>b.addEventListener('click',()=>{setBarb(b.dataset.barb);done1=true;opened=0;flow(true);}));
SERV.forEach(s=>s.b.addEventListener('click',()=>{pick.svc=s;SERV.forEach(x=>x.b.setAttribute('aria-pressed',String(x===s)));buildSlots();if(pick.slot)pick.slot=null;sum();opened=0;flow(true);}));
$$('[data-bookwith]').forEach(b=>b.addEventListener('click',()=>{setBarb(b.dataset.bookwith);done1=true;opened=0;flow(false);const sec=$('#book');sec.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  setTimeout(()=>{const f=$('.svc');f&&f.focus({preventScroll:true});},reduce?0:500);}));
setBarb('any');

/* ---- one question at a time: a step collapses to a one-line summary once answered, and the next one opens under it ---- */
let done1=false,opened=0;                       // opened: a finished step the visitor reopened with "Change"
const R=n=>$('[data-reveal="'+n+'"]'),BODY=n=>$('[data-body="'+n+'"]'),SB=n=>$('[data-sum-btn="'+n+'"]');
function show(el,on){el.classList.toggle('on',on);if(on)el.removeAttribute('inert');else el.setAttribute('inert','');}
function isDone(n){return n===1?done1:n===2?!!pick.svc:!!pick.slot;}
function label(n){if(n===1)return pick.barb==='any'?'First available':BARBERS.find(b=>b.k===pick.barb).n;
  if(n===2)return pick.svc.n+' · '+pick.svc.min+' min · $'+pick.svc.price;
  return pick.day.d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' at '+fmtT(pick.slot.t)+(pick.barb==='any'?' with '+pick.slot.barber.n:'');}
function flow(move){let first=0;
  for(const n of [1,2,3]){const d=isDone(n),reach=n===1||[1,2,3].slice(0,n-1).every(isDone);
    show(R(n),reach);
    const open=reach&&(!d||opened===n);show(BODY(n),open);
    SB(n).hidden=!(d&&!open);if(d)$('[data-sum-val="'+n+'"]').textContent=label(n);
    if(reach&&!d&&!first)first=n;}
  const all=[1,2,3].every(isDone);show(R(4),all);
  if(move){const t=first?R(first):all?R(4):null;
    if(t)setTimeout(()=>{const r=t.getBoundingClientRect();if(r.bottom>innerHeight-40||r.top<0)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
      const f=first?$('button:not(:disabled)',BODY(first)):$('#cf-n');f&&f.focus({preventScroll:true});},reduce?0:340);}}
[1,2,3].forEach(n=>SB(n).addEventListener('click',()=>{opened=n;flow(false);const f=$('button[aria-pressed="true"],button:not(:disabled)',BODY(n));setTimeout(()=>f&&f.focus({preventScroll:true}),reduce?0:340);}));
slotsEl.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled){opened=0;flow(true);}});
daysEl.addEventListener('click',e=>{if(e.target.closest('button'))flow(false);});
const cform=$('[data-confirm-form]'),cdone=$('[data-cf-done]');
cform.addEventListener('submit',e=>{e.preventDefault();if(!cform.reportValidity())return;const b=pick.slot.barber,ref='HT-'+(1000+Math.floor(Math.random()*9000));
  cdone.hidden=false;cdone.innerHTML='<b>Thanks, '+$('#cf-n').value.trim().split(' ')[0].replace(/</g,'')+', you’re all booked in.</b> '+b.n+', '+pick.svc.n+', '+pick.day.d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+' at '+fmtT(pick.slot.t)+'. A reminder text goes out the day before, and your booking reference is '+ref+'. <span class="note">This is a demo, so nothing was sent.</span>';
  $('.cf-fields',cform).hidden=true;$('[data-summary]',cform).hidden=true;});
flow(false);

})();
