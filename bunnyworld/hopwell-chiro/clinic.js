/* Hopwell: "Point to where it hurts", the live insurance check, and the hand-off of the answers into booking and intake.
   Demo only: nothing is sent. Times live in one place, the booking block (bw.js builds its schedule). */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

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
let touched=false;
function drawSpot(){$$('[data-spot]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spot===st.spot)));}
function hook(){touched=true;drawAns();}
$$('[data-spot]').forEach(b=>b.addEventListener('click',()=>{st.spot=b.dataset.spot;drawSpot();hook();}));
$$('[data-group]').forEach(g=>{const bs=$$('button',g),multi=g.hasAttribute('data-multi'),k=g.dataset.group;
  bs.forEach(b=>{if(!b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(multi){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));on?st.flags.add(b.dataset.v):st.flags.delete(b.dataset.v);}
      else{bs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));st[k]=b.dataset.v;}hook();});});});

function drawAns(){const s=SPOTS[st.spot],flag=st.flags.size>0;
  $('[data-ok]').hidden=flag;$('[data-flag]').hidden=!flag;
  $('[data-a-k]').textContent=`${s.name} · ${LONG[st.long][0]} · ${WORSE[st.worse][0]}`;
  $('[data-a-p]').innerHTML=`${s.pain} that&rsquo;s ${WORSE[st.worse][0]} is one of the most common things we see. We&rsquo;ll check ${s.look}, then talk through a plan. ${LONG[st.long][1]}`;
  const tip=$('[data-a-tip]');tip.hidden=false;tip.innerHTML=WORSE[st.worse][1].replace(/^([^:]+:)/,'<b>$1</b>');
  const[cl,cv]=copay();$('[data-a-copl]').textContent=cl;$('[data-a-cop]').textContent=cv;
  carry();}

/* ---- the answers carry into the one booking block and the intake form, live ---- */
function carry(){const s=SPOTS[st.spot],about=`${s.name}, ${LONG[st.long][0]}, ${WORSE[st.worse][0]}`;
  $('[data-about]').value=about;
  const from=$('[data-from]');from.hidden=false;from.innerHTML=`<b>Your answers:</b> ${about.toLowerCase()}. They go with your booking.`;
  if(!touched)return;
  const r=$('[data-reason]');r.value=st.spot;$('[data-for]').value=st.long;$('[data-worse]').value=WORSE[st.worse][0].replace(/^worse /,'');
  const inf=r.closest('[data-steps]');if(inf&&inf.bwSteps)[0,1,2].forEach(k=>inf.bwSteps.done(k));
  const pre=$('[data-pre]');pre.hidden=false;pre.textContent=`Started for you from “Where it hurts”: ${about}.`;}

drawSpot();drawAns();
})();
