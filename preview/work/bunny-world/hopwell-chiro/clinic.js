/* Hopwell: "Point to where it hurts", the live insurance check, same-day openings and the hand-off to booking and intake.
   Demo only: nothing is sent. The open times use the same made-up schedule as the booking strip (bw.js), so they agree. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const TZ='America/Denver';
function now(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),min:(+p.hour%24)*60+(+p.minute)};}
const toMin=s=>{const[h,m]=s.split(':').map(Number);return h*60+(m||0);};
const fmt=s=>{let m=toMin(s),h=Math.floor(m/60)%24,mm=m%60;const ap=h>=12?'pm':'am';h=h%12||12;return h+(mm?':'+String(mm).padStart(2,'0'):'')+' '+ap;};
const hash=s=>{let h=7;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---- the schedule, exactly as the booking strip builds it ---- */
const box=$('[data-slots]'),OPEN=box.dataset.days.split(',').map(Number),TIMES=box.dataset.times.split(','),SEED=box.dataset.seed||'';
function free(k){const n=now(),d=new Date();d.setDate(d.getDate()+k);const wd=(n.day+k)%7;
  if(!OPEN.includes(wd))return{d,wd,times:[]};
  return{d,wd,times:TIMES.filter(t=>!(hash(d.toDateString()+t+SEED)%3===0||(k===0&&toMin(t)<=n.min+60)))};}
function nextOpen(){for(let k=0;k<14;k++){const f=free(k);if(f.times.length)return{...f,k,t:f.times[0]};}return null;}
const dayWord=o=>o.k===0?'Today':o.k===1?'Tomorrow':WD[o.wd];

/* ---- same-day openings bar ---- */
const bar=$('[data-sameday]');
function drawBar(){const f=free(0),o=nextOpen();
  if(f.times.length){const s=f.times.slice(-2);bar.innerHTML=`Same-day openings: <b>${f.times.length} left today</b> &middot; ${s.map(fmt).join(' and ')}`;}
  else if(o)bar.innerHTML=`Today is full or closed &middot; next opening <b>${WDL[o.wd]} ${fmt(o.t)}</b>`;}
drawBar();setInterval(drawBar,60000);

/* ---- insurance: plan or member ID → copay ---- */
const PLANS={acorn:{name:'Acorn Mutual PPO',id:'ACM',copay:25,line:'In network · no referral needed'},
  clover:{name:'Clover Care',id:'CLV',copay:30,line:'In network · 12 visits a year'},
  burrow:{name:'United Burrow Health',id:'UBH',copay:20,line:'In network · needs a referral from your doctor'},
  bluebell:{name:'Bluebell Cross',id:'BBX',copay:25,line:'In network · no referral needed'},
  meadow:{name:'Meadowcare (65+)',id:'MDC',copay:null,line:'Covers adjustments after your deductible',show:'20%'},
  thicket:{name:'Thicket Permanente',id:'TPK',out:true},none:{self:true}};
const plan=$('[data-plan]'),mem=$('[data-member]'),out=$('[data-ins]');let ins=null,timer;
function setIns(key,via){clearTimeout(timer);out.className='ok wait';out.innerHTML='<span>Checking your plan&hellip;</span><b></b>';
  timer=setTimeout(()=>{const p=PLANS[key];ins=key;out.className='ok'+(p.out?' no':'');
    if(p.self)out.innerHTML='<span>No problem: self-pay, with a receipt for your HSA</span><b>$65 first visit</b>';
    else if(p.out)out.innerHTML=`<span>Not in network with ${p.name} yet. Ask us about out-of-network benefits</span><b>$65</b>`;
    else out.innerHTML=`<span>${p.line}${via?' · '+p.name:''}</span><b>${p.show||'$'+p.copay+' copay'}</b>`;
    drawAns();},via?650:350);}
plan.addEventListener('change',()=>{mem.value='';if(plan.value)setIns(plan.value,false);else{ins=null;out.className='ok';out.innerHTML='<span>Pick a plan or type your member ID.</span><b></b>';drawAns();}});
mem.addEventListener('input',()=>{const v=mem.value.replace(/\s/g,'').toUpperCase();if(v.length<3)return;
  const key=Object.keys(PLANS).find(k=>PLANS[k].id&&v.startsWith(PLANS[k].id));
  if(key){if(v.length>=8){plan.value=key;setIns(key,true);}}
  else if(v.length>=6){clearTimeout(timer);out.className='ok no';out.innerHTML='<span>We couldn&rsquo;t match that ID. Pick your plan instead.</span><b></b>';}});
function copay(){const p=ins&&PLANS[ins];if(!p||p.self)return['Self-pay','$65'];if(p.out)return['Out of network','$65'];return['Your copay',p.show||'$'+p.copay];}

/* ---- point to where it hurts ---- */
const SPOTS={neck:{name:'Neck',pain:'Neck pain',look:'how your neck and upper back move, and how you sit at a screen'},
  head:{name:'Headaches',pain:'Headaches',look:'the joints and muscles at the top of your neck, where many tension headaches start'},
  shoulder:{name:'Shoulder',pain:'Shoulder pain',look:'your shoulder blade and neck together, since shoulder pain often starts higher up'},
  mid:{name:'Mid-back',pain:'Pain between the shoulder blades',look:'your ribs, mid-spine and posture'},
  low:{name:'Low back',pain:'Low back pain',look:'how your hips and spine move together'},
  hip:{name:'Hip or leg',pain:'Hip pain that runs down the leg',look:'your hips, pelvis and low back, and whether a nerve is involved'}};
const LONG={days:['a few days','If it&rsquo;s only been a few days, a gentle first visit often helps it settle faster.'],
  weeks:['2–6 weeks',''],months:['months','When it has hung on for months it usually needs a short plan, not a quick fix, and we&rsquo;ll be honest about how many visits.']};
const WORSE={sitting:['worse when you sit','Tonight: get up and walk for two minutes every half hour, and put a rolled towel behind your low back when you sit.'],
  mornings:['worse in the mornings','Tonight: a warm shower before bed, and a pillow between your knees.'],
  lifting:['worse when you lift','Until we see you: bend at the hips and knees, keep loads close, and skip heavy lifts.'],
  sleeping:['worse at night','Tonight: try your back with a pillow under your knees, or your side with one between them.']};
const st={spot:'low',long:'weeks',worse:'sitting',flags:new Set()};
const tag=$('[data-tag]');
function drawSpot(){$$('[data-spot]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spot===st.spot)));
  const dot=$(`.spot[data-spot="${st.spot}"]`);
  if(dot){const cs=getComputedStyle(dot);tag.textContent=SPOTS[st.spot].name;tag.style.left=cs.left;tag.style.top=cs.top;tag.classList.toggle('left',dot.offsetLeft>dot.parentNode.clientWidth*.6);}
  $('[data-where]').textContent=SPOTS[st.spot].name+' ✓';}
$$('[data-spot]').forEach(b=>b.addEventListener('click',()=>{st.spot=b.dataset.spot;drawSpot();drawAns();}));
$$('[data-group]').forEach(g=>{const bs=$$('button',g),multi=g.hasAttribute('data-multi'),k=g.dataset.group;
  bs.forEach(b=>{if(!b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(multi){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));on?st.flags.add(b.dataset.v):st.flags.delete(b.dataset.v);}
      else{bs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));st[k]=b.dataset.v;}drawAns();});});});

function drawAns(){const s=SPOTS[st.spot],flag=st.flags.size>0,o=nextOpen();
  $('[data-ok]').hidden=flag;$('[data-flag]').hidden=!flag;
  $('[data-a-k]').textContent=`${s.name} · ${LONG[st.long][0]} · ${WORSE[st.worse][0]}`;
  $('[data-a-p]').innerHTML=`${s.pain} that&rsquo;s ${WORSE[st.worse][0]} is one of the most common things we see. We&rsquo;ll check ${s.look}, then talk through a plan. ${LONG[st.long][1]}`;
  const tip=$('[data-a-tip]');tip.hidden=false;tip.innerHTML=WORSE[st.worse][1].replace(/^([^:]+:)/,'<b>$1</b>');
  const[cl,cv]=copay();$('[data-a-copl]').textContent=cl;$('[data-a-cop]').textContent=cv;
  $('[data-a-next]').textContent=o?`${dayWord(o)} ${fmt(o.t).replace(' am','').replace(' pm','')}`:'Call us';
  $('[data-a-book]').textContent=o?`Book ${dayWord(o)==='Today'||dayWord(o)==='Tomorrow'?dayWord(o).toLowerCase():WDL[o.wd]} ${fmt(o.t)}`:'Book a first visit';}

/* ---- hand-off: pick the slot in the booking strip and fill in the intake ---- */
$('[data-a-book]').addEventListener('click',()=>{const o=nextOpen(),s=SPOTS[st.spot],about=`${s.name}, ${LONG[st.long][0]}, ${WORSE[st.worse][0]}`;
  const vis=$('[data-visit]');vis.selectedIndex=0;$('[data-about]').value=about;
  const bf=vis.closest('[data-steps]');if(bf&&bf.bwSteps){bf.bwSteps.done(0);bf.bwSteps.done(1);}
  if(o){const strip=$$('.days button',box),grid=()=>$$('.slots button',box);const db=strip[o.k];if(db&&!db.disabled){db.click();const tb=grid().find(b=>b.textContent===fmt(o.t));if(tb){tb.click();if(bf&&bf.bwSteps)bf.bwSteps.done(2);}}}
  const r=$('[data-reason]');r.value={neck:'neck',head:'head',shoulder:'shoulder',mid:'mid',low:'low',hip:'hip'}[st.spot];
  $('[data-for]').value=st.long;$('[data-worse]').value=WORSE[st.worse][0].replace(/^worse /,'');
  const inf=r.closest('[data-steps]');if(inf&&inf.bwSteps)[0,1,2].forEach(k=>inf.bwSteps.done(k));
  const pre=$('[data-pre]');pre.hidden=false;pre.textContent=`Started for you from “Where it hurts”: ${about}.`;
  $('#book').scrollIntoView({behavior:'smooth',block:'start'});if(window.bwToast)window.bwToast(o?`Picked ${WDL[o.wd]} ${fmt(o.t)} for you`:'Pick a time that suits you');});

/* ---- "updated N min ago" on the scheduler line ---- */
const syn=$('[data-synced]');let ago=0;setInterval(()=>{ago=(ago+1)%5;syn.textContent=ago?`updated ${ago} min ago`:'updated just now';},60000);

drawSpot();drawAns();addEventListener('resize',drawSpot);
})();
