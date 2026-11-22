/* Websites page: a normal page that scrolls on its own. This file does five small things:
   1 the header's Book button shows only when no other Book button is on screen (never two in one view);
   2 the Bunny Burritos stage: its live page scaled to fit the phone, beside the register and the Sold out demo;
   3 the split-flap board flips each row in once the visitor can really see it, one row after another (still under reduced motion);
   4 meadows measured before the page settled are measured again once fonts and images are in;
   5 the founding count comes from SOG_SHOP.founding (checkout-links.js), never typed into the page. */
(()=>{
// 1 one Book button in view
const headerBook=document.querySelector('header.top a.book'),pageBooks=[...document.querySelectorAll('[data-book]')];
if(headerBook&&pageBooks.length&&'IntersectionObserver' in window){
  const seen=new Set();
  const io=new IntersectionObserver(es=>{es.forEach(e=>e.isIntersecting?seen.add(e.target):seen.delete(e.target));
    document.body.classList.toggle('book-in-page',seen.size>0);});
  pageBooks.forEach(b=>io.observe(b));
  document.body.classList.add('book-in-page');
}

// 2 the Bunny Burritos stage (its own section after the calls since 2026-11-21; the Bunny World tickets are plain links
//   to each shop now): the shop's live page is drawn at phone width and scaled to fit the phone
const stage=document.querySelector('.open-stage');
if(stage){
  const frame=stage.querySelector('iframe'),view=stage.querySelector('.view');
  const fit=()=>{const w=view.clientWidth,hh=view.clientHeight;if(!w)return;const s=w/390;frame.style.width='390px';frame.style.height=Math.ceil(hh/s)+'px';frame.style.transform=`scale(${s})`;};
  new ResizeObserver(fit).observe(view);
}

// 3 the split-flap board: a row flips through letters only once the visitor can really see it (its middle above about 70% of
//   the screen), rows one after another, each letter landing a beat after the one before; reduced motion: the words just stand
const flaps=[...document.querySelectorAll('.flap')];
if(flaps.length&&'IntersectionObserver' in window&&Element.prototype.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',STEP=90,LAND=240,ROW_GAP=380;
  const flip=[{transform:'rotateX(90deg)',opacity:.35},{transform:'rotateX(-10deg)',opacity:1,offset:.6},{transform:'none',opacity:1}];
  const any=not=>{let c;do c=POOL[Math.random()*POOL.length|0];while(c===not);return c;};
  const play=f=>{
    f.classList.remove('wait');
    f.querySelectorAll('.flap-w i').forEach((c,k)=>{
      const word=c.textContent,n=5+k+(Math.random()*3|0);let s=0;
      const step=()=>{const last=++s>n;c.textContent=last?word:any(word);
        const a=c.animate(flip,{duration:last?LAND:STEP,easing:'cubic-bezier(.3,.7,.3,1)'});if(!last)a.onfinish=step;};
      step();
    });
  };
  let free=0;
  const fo=new IntersectionObserver(es=>es.filter(e=>e.isIntersecting).map(e=>e.target)
    .sort((a,b)=>flaps.indexOf(a)-flaps.indexOf(b)).forEach(f=>{fo.unobserve(f);
      const now=performance.now(),at=Math.max(now,free);free=at+ROW_GAP;setTimeout(()=>play(f),at-now);}),
    {rootMargin:'0px 0px -30% 0px',threshold:.5});
  flaps.forEach(f=>{f.classList.add('wait');fo.observe(f);});
}

// 4 meadows measured again once the page has settled (seen on phones)
const remeasure=()=>dispatchEvent(new Event('resize'));
addEventListener('load',()=>{requestAnimationFrame(remeasure);document.fonts&&document.fonts.ready.then(()=>requestAnimationFrame(remeasure));});

// 5 the real founding count
const f=window.SOG_SHOP&&SOG_SHOP.founding;
if(f)document.querySelectorAll('[data-spots-left]').forEach(e=>{e.textContent=`${f.left} of ${f.total}`;});
if(f&&f.left<=0){const o=document.getElementById('founding');if(o)o.classList.add('full');}
// the founding stub lifts once, the first time most of it is on screen, as if it could tear off (reduced motion: the CSS has none)
const coupon=document.getElementById('founding');
// and its title and count flip in like the Care board's split flaps (Tristan: "some kind of cool font animation"): once, about a
// second, then still text; again, quicker, on hover. Screen readers get the hidden plain copies; reduced motion: no flip.
const flipW=coupon&&coupon.querySelector('.flipw'),flipN=coupon&&coupon.querySelector('.flipn'),realN=coupon&&coupon.querySelector('[data-spots-left]');
if(flipN&&realN)flipN.textContent=realN.textContent;
let flipping=false;
const flipIn=(quick)=>{
  if(!flipW||flipping||!Element.prototype.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  flipping=true;const word=flipW.textContent.trim(),num=realN.textContent.trim(),POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ',STEP=quick?40:55;
  const tick=[{transform:'rotateX(90deg)',opacity:.4},{transform:'none',opacity:1}];
  flipW.innerHTML=[...word].map(c=>c===' '?'<i> </i>':'<i>'+c+'</i>').join('');
  const cells=[...flipW.children];let left=cells.length;
  const done=()=>{if(--left>0)return;flipW.textContent=word;flipN.textContent=num;flipping=false;};
  cells.forEach((c,k)=>{const final=c.textContent;if(final===' '){left--;return;}let n=(quick?2:4)+Math.floor(k/3),s=0;
    const step=()=>{const last=++s>n;c.textContent=last?final:POOL[Math.random()*26|0];const a=c.animate(tick,{duration:STEP,easing:'ease-out'});
      a.onfinish=last?done:step;};setTimeout(step,k*(quick?10:22));});
  // the count rolls up to the real number, like a flip counter
  const m=num.match(/^(\d+)(.*)$/);
  if(m){const to=+m[1];let v=Math.max(0,to-(quick?3:6));left++;
    const roll=()=>{flipN.textContent=v+m[2];flipN.animate(tick,{duration:STEP+20,easing:'ease-out'}).onfinish=()=>{if(v<to){v++;roll();}else done();};};roll();}
};
if(coupon&&'IntersectionObserver' in window){const co=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){co.disconnect();coupon.classList.add('pop');flipIn(false);
  coupon.addEventListener('animationend',()=>coupon.classList.remove('pop'),{once:true});}},{threshold:.6});co.observe(coupon);
  coupon.addEventListener('mouseenter',()=>flipIn(true));}
 // the shop screens around the Site Plan drift a little as you scroll (reduced motion: still)
const planStage=document.querySelector('[data-planStage]');
if(planStage&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let t=0;const drift=()=>{t=0;const r=planStage.getBoundingClientRect(),p=((r.top+r.height/2)-innerHeight/2)/innerHeight;
  planStage.style.setProperty('--py',Math.max(-1,Math.min(1,p)).toFixed(3));};addEventListener('scroll',()=>{if(!t)t=requestAnimationFrame(drift);},{passive:true});drift();}
// the plan card's switcher: Monthly · Pay once · Founding five (a tablist; arrows move between tabs)
const uTabs=[...document.querySelectorAll('.u-tabs [role="tab"]')];
if(uTabs.length){const pickTab=(t,focus)=>{uTabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',String(on));x.tabIndex=on?0:-1;
    document.getElementById(x.getAttribute('aria-controls')).hidden=!on;});if(focus)t.focus();};
  uTabs.forEach((t,n)=>{t.addEventListener('click',()=>pickTab(t));
    t.addEventListener('keydown',e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();pickTab(uTabs[(n+d+uTabs.length)%uTabs.length],true);}});});}
// on narrow screens three shops peek up just under the hero's words
const hWords=document.querySelector('.stage-hero .hero-links'),wall=document.querySelector('.shop-wall');
if(hWords&&wall){const place=()=>{const h=wall.parentElement.getBoundingClientRect(),c=hWords.getBoundingClientRect();wall.style.setProperty('--wall-top',Math.round(c.bottom-h.top+36)+'px');};
  place();addEventListener('resize',place);addEventListener('load',place);document.fonts&&document.fonts.ready.then(place);}
})();

// the facts panel under the close: links to #faq / #hookup / #facts open it first, then scroll to the spot
{
  const more=document.getElementById('facts');
  if(more){
    const ids=['facts','faq','hookup'];
    const go=(id)=>{if(!ids.includes(id))return false;more.open=true;const el=document.getElementById(id);requestAnimationFrame(()=>el.scrollIntoView({block:'start'}));return true;};
    document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&go(a.getAttribute('href').slice(1))){e.preventDefault();history.replaceState(null,'','#'+a.getAttribute('href').slice(1));}});
    if(location.hash)go(location.hash.slice(1));
  }
}
