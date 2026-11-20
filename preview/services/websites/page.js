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
})();
