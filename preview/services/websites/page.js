/* Websites page: a normal page that scrolls on its own. This file does five small things:
   1 the header's Book button shows only when no other Book button is on screen (never two in one view);
   2 the Bunny World ticket rail: tapping a ticket opens that shop's live page on the stage below; Bunny Burritos keeps the
     register and the Sold out demo, the other shops show their own page and a way in;
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

// 2 the ticket rail and its stage
const stage=document.querySelector('.open-stage'),tickets=[...document.querySelectorAll('.ticket')];
if(stage&&tickets.length){
  const frame=stage.querySelector('iframe'),view=stage.querySelector('.view');
  const kick=stage.querySelector('[data-stage-kick]'),h=stage.querySelector('[data-stage-h]'),cap=stage.querySelector('[data-caption]'),open=stage.querySelector('[data-stage-open]');
  const capFirst=cap.textContent;
  const fit=()=>{const w=view.clientWidth,hh=view.clientHeight;if(!w)return;const s=w/390;frame.style.width='390px';frame.style.height=Math.ceil(hh/s)+'px';frame.style.transform=`scale(${s})`;};
  new ResizeObserver(fit).observe(view);
  const pick=t=>{
    tickets.forEach(x=>x.setAttribute('aria-pressed',String(x===t)));
    const slug=t.dataset.shop,name=t.dataset.name,i=tickets.indexOf(t)+1,burritos=slug==='bunny-burritos',url='/bunnyworld/'+slug+'/';
    stage.classList.toggle('other',!burritos);
    kick.innerHTML=String(i).padStart(2,'0')+' &middot; '+name;
    h.innerHTML=t.dataset.line;
    cap.hidden=!burritos;open.hidden=burritos;open.href=url;open.innerHTML='Open '+name+' &rarr;';
    frame.title=name+', a Bunny World demo shop';frame.dataset.lazy=url;
    if(frame.getAttribute('src')!==url)frame.src=url;
    if(burritos&&!cap.classList.contains('swapped'))cap.textContent=capFirst;
  };
  tickets.forEach(t=>t.addEventListener('click',()=>pick(t)));
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
// on narrow screens the shop wall sits just above the card, so three shops peek over it
const uCard=document.querySelector('.u-card'),wall=document.querySelector('.shop-wall');
if(uCard&&wall){const place=()=>{const h=wall.parentElement.getBoundingClientRect(),c=uCard.getBoundingClientRect();const tall=Math.max(0,...[...wall.querySelectorAll('.sw')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.offsetHeight+e.offsetTop));wall.style.setProperty('--wall-top',Math.round(c.top-h.top-tall-28)+'px');};
  place();addEventListener('resize',place);addEventListener('load',place);document.fonts&&document.fonts.ready.then(place);}
// scrolling into the plan: on wide screens with motion, a portal the size of the plan card grows to fill the screen as you
// scroll from the hero to the Care board, turning from the card's violet to the board's green, so the flap rows
// land as what's inside the plan; scrolling back reverses it. Phones: the board simply scrolls in; reduced motion: a plain cut.
const pCard=document.querySelector('.u-card'),pCare=document.querySelector('#care'),pWall=document.querySelector('.shop-wall');
if(pCard&&pCare&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const portal=document.createElement('div');portal.className='plan-portal';portal.setAttribute('aria-hidden','true');portal.hidden=true;portal.append(document.createElement('i'));document.body.append(portal);
  const wideMQ=matchMedia('(min-width: 981px)'),ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;let pt=0;
  // the card fills the whole screen by 55% of the run and holds there edge to edge; while it covers, the section dots hide
  // and the Care board sits above it with no backdrop of its own (the portal is that backdrop), its rows coming in as the
  // card fills; at the end the board's own green takes over unchanged
  const root=document.documentElement;
  const off=()=>{portal.hidden=true;root.classList.remove('portal-on');pCare.style.removeProperty('--fill');};
  const open=()=>{pt=0;
    if(!wideMQ.matches){off();pWall&&pWall.style.removeProperty('--out');return;}
    const careTop=pCare.getBoundingClientRect().top+scrollY,start=Math.max(0,pCard.getBoundingClientRect().top+scrollY-innerHeight*.35),end=careTop;
    const p=Math.min(1,Math.max(0,(scrollY-start)/Math.max(1,end-start)));
    pWall&&pWall.style.setProperty('--out',ease(Math.min(1,p*1.4)).toFixed(3));
    if(p<=0||p>=1){off();return;}
    const c=pCard.getBoundingClientRect(),e=ease(Math.min(1,p/.55)),W=innerWidth,H=innerHeight;
    const l=c.left*(1-e),t=c.top*(1-e),r=c.right+(W-c.right)*e,b=c.bottom+(H-c.bottom)*e;
    portal.hidden=false;root.classList.add('portal-on');
    Object.assign(portal.style,e>=1?{left:'0px',top:'0px',width:'100vw',height:'100vh',borderRadius:'0px',opacity:'1'}:
      {left:l+'px',top:t+'px',width:(r-l)+'px',height:(b-t)+'px',borderRadius:(24*(1-e)).toFixed(1)+'px',opacity:String(Math.min(1,p/.18))});
    portal.style.setProperty('--scrim',(.4+.2*e).toFixed(3));
    {const g=Math.min(1,Math.max(0,(p-.1)/.45));portal.style.setProperty('--green',(g*g*(3-2*g)).toFixed(3));}
    pCare.style.setProperty('--fill',Math.min(1,Math.max(0,(p-.45)/.15)).toFixed(3));
  };
  addEventListener('scroll',()=>{if(!pt)pt=requestAnimationFrame(open);},{passive:true});addEventListener('resize',open);open();
}
})();
