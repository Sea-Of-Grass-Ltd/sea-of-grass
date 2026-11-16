/* Hopwell: "Point to where it hurts". Arrives empty. A tap on the photo opens question 2, question 2 opens question 3,
   and only after the third answer does the first-visit card appear and the answers go into booking.
   Demo only: nothing is sent. Times live in one place, the booking block (bw.js builds its schedule). */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

const SPOTS={neck:{name:'Neck',pain:'Neck pain',look:'how your neck and upper back move, and how you sit at a screen'},
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
const st={spot:null,long:null,worse:null,flags:new Set()};
const q2=$('[data-qn="2"]'),q3=$('[data-qn="3"]'),ans=$('[data-ans]'),picked=$('[data-picked]');

/* show the next question, and bring it on screen if it opened below the fold */
function open(el){if(!el.hidden)return;el.hidden=false;
  requestAnimationFrame(()=>{const r=el.getBoundingClientRect();if(r.bottom>innerHeight)el.scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'});});}

$$('.spot').forEach(b=>b.addEventListener('click',()=>{st.spot=b.dataset.spot;
  $$('.spot').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  picked.textContent=b.getAttribute('aria-label');open(q2);draw();}));
$$('[data-group]').forEach(g=>{const bs=$$('button',g),multi=g.hasAttribute('data-multi'),k=g.dataset.group;
  bs.forEach(b=>{b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(multi){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));on?st.flags.add(b.dataset.v):st.flags.delete(b.dataset.v);}
      else{bs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));st[k]=b.dataset.v;if(k==='long')open(q3);}draw();});});});

function draw(){if(!(st.spot&&st.long&&st.worse))return;
  const s=SPOTS[st.spot],flag=st.flags.size>0;open(ans);
  $('[data-ok]').hidden=flag;$('[data-flag]').hidden=!flag;
  $('[data-a-k]').textContent=`${s.name} · ${LONG[st.long][0]} · ${WORSE[st.worse][0]}`;
  $('[data-a-p]').innerHTML=`${s.pain} that&rsquo;s ${WORSE[st.worse][0]} is one of the most common things we see. We&rsquo;ll check ${s.look}, then talk through a plan. ${LONG[st.long][1]}`;
  $('[data-a-tip]').innerHTML=WORSE[st.worse][1].replace(/^([^:]+:)/,'<b>$1</b>');
  /* the answers go into the one booking block, once all three are in */
  const about=`${s.name}, ${LONG[st.long][0]}, ${WORSE[st.worse][0]}`;
  $('[data-about]').value=about;
  const from=$('[data-from]');from.hidden=false;from.innerHTML=`<b>Your answers:</b> ${about.toLowerCase()}. They go with your booking.`;}

/* date of birth: day and year lists, years counting back from this one */
const days=$('[data-dob-days]'),years=$('[data-dob-years]');
if(days)for(let d=1;d<=31;d++)days.add(new Option(String(d),String(d)));
if(years){const y=new Date().getFullYear();for(let k=y;k>=y-105;k--)years.add(new Option(String(k),String(k)));}
})();
