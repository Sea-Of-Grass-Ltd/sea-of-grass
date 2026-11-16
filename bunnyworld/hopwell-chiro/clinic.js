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
const WORSE={sitting:'worse when you sit',mornings:'worse in the mornings',lifting:'worse when you lift',sleeping:'worse at night'};
/* one tip for each place and trigger, so a neck never gets a low-back tip (Tristan, 2026-11-16) */
const AREA={neck:'neck',shoulder:'shoulder',mid:'mid-back',low:'low back',hip:'hip'};
const TIPS={
  neck:{sitting:['Tonight','raise your screen to eye level, and stand up every half hour to look up and around the room.'],
    mornings:['Tonight','use one pillow that keeps your head level with your spine, not two stacked high.'],
    lifting:['Until we see you','carry bags in both hands, keep loads close, and leave heavy things below chest height.'],
    sleeping:['Tonight','sleep on your back or side rather than your front, with the pillow filling the gap under your jaw.']},
  shoulder:{sitting:['Tonight','rest your forearms on the desk or the armrests so the sore side can drop and relax.'],
    mornings:['Tonight','keep off the sore side and hug a pillow so the arm has something to rest on.'],
    lifting:['Until we see you','don\u2019t lift anything overhead, and carry loads close to your chest.'],
    sleeping:['Tonight','sleep on the other side and hug a pillow so the sore arm rests on it.']},
  mid:{sitting:['Tonight','sit right back in the chair with a small cushion behind you, and stand up every half hour.'],
    mornings:['Tonight','take a warm shower before bed, then a few slow, deep breaths lying on your back.'],
    lifting:['Until we see you','keep loads close and turn with your feet instead of twisting while you carry.'],
    sleeping:['Tonight','try lying on your back with a thin pillow, so you\u2019re not curled forward.']},
  low:{sitting:['Tonight','get up and walk for two minutes every half hour, and put a rolled towel behind you when you sit.'],
    mornings:['Tonight','take a warm shower before bed, and sleep with a pillow between your knees.'],
    lifting:['Until we see you','bend your knees, keep loads close, and skip heavy lifts.'],
    sleeping:['Tonight','try your back with a pillow under your knees, or your side with one between them.']},
  hip:{sitting:['Tonight','sit with both feet flat instead of crossing your legs, and get up to walk every half hour.'],
    mornings:['Tonight','sleep on your side with a pillow between your knees to keep your legs level.'],
    lifting:['Until we see you','step close to what you lift, keep it close, and skip anything heavy.'],
    sleeping:['Tonight','sleep on the side that doesn\u2019t hurt, with a pillow between your knees.']}};
const st={spot:null,long:null,worse:null,flags:new Set()};
const q2=$('[data-qn="2"]'),q3=$('[data-qn="3"]'),ans=$('[data-ans]'),picked=$('[data-picked]'),tag=$('[data-tag]');

/* show the next question, and bring it on screen if it opened below the fold.
   On a wide screen the scroll stops before the chosen dot leaves the screen, so the photo and the answer read together. */
function open(el){if(!el.hidden)return;el.hidden=false;
  requestAnimationFrame(()=>{const r=el.getBoundingClientRect();if(r.bottom<=innerHeight)return;
    let dy=r.bottom-innerHeight+24;const dot=$('.spot[aria-pressed="true"]');
    if(dot&&innerWidth>900)dy=Math.min(dy,dot.getBoundingClientRect().top-24);
    if(dy>0)scrollBy({top:dy,behavior:reduce?'auto':'smooth'});});}

$$('.spot').forEach(b=>b.addEventListener('click',()=>{st.spot=b.dataset.spot;
  $$('.spot').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  picked.textContent=b.getAttribute('aria-label');
  tag.textContent=SPOTS[st.spot].name;tag.style.left=b.style.left;tag.style.top=b.style.top;tag.dataset.side={hip:'left',mid:'left',shoulder:'right'}[st.spot]||'';tag.hidden=false;
  open(q2);draw();}));
$$('[data-group]').forEach(g=>{const bs=$$('button',g),multi=g.hasAttribute('data-multi'),k=g.dataset.group;
  bs.forEach(b=>{b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(multi){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));on?st.flags.add(b.dataset.v):st.flags.delete(b.dataset.v);}
      else{bs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));st[k]=b.dataset.v;if(k==='long')open(q3);}draw();});});});

function draw(){if(!(st.spot&&st.long&&st.worse))return;
  const s=SPOTS[st.spot],flag=st.flags.size>0;open(ans);
  $('[data-ok]').hidden=flag;$('[data-flag]').hidden=!flag;
  $('[data-a-k]').textContent=`${s.name} · ${LONG[st.long][0]} · ${WORSE[st.worse]}`;
  $('[data-a-p]').innerHTML=`${s.pain} that&rsquo;s ${WORSE[st.worse]} is one of the most common things we see. We&rsquo;ll check ${s.look}, then talk through a plan. ${LONG[st.long][1]}`;
  const[when,tip]=TIPS[st.spot][st.worse];$('[data-a-tip]').innerHTML=`<b>${when}, for your ${AREA[st.spot]}:</b> ${tip}`;
  /* the answers go into the one booking block, once all three are in */
  const about=`${s.name}, ${LONG[st.long][0]}, ${WORSE[st.worse]}`;
  $('[data-about]').value=about;
  const from=$('[data-from]');from.hidden=false;from.innerHTML=`<b>Your answers:</b> ${about.toLowerCase()}. They go with your booking.`;}

})();
