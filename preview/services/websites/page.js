/* Websites page: a normal page that scrolls on its own. This file does five small things:
   1 the header's Book button shows only when no other Book button is on screen (never two in one view);
   2 the Bunny World ticket rail: tapping a ticket opens that shop's live page on the stage below; Bunny Burritos keeps the
     register and the Sold out demo, the other shops show their own page and a way in;
   3 the split-flap board flips its letters in once, as it arrives (still under reduced motion);
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

// 3 the split-flap board
const flaps=[...document.querySelectorAll('.flap')];
if(flaps.length&&'IntersectionObserver' in window){
  const fo=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const f=e.target;
    f.querySelectorAll('.flap-w i').forEach((c,k)=>c.style.animationDelay=(k*45)+'ms');f.classList.add('go');fo.unobserve(f);}),{threshold:.5});
  flaps.forEach(f=>fo.observe(f));
}

// 4 meadows measured again once the page has settled (seen on phones)
const remeasure=()=>dispatchEvent(new Event('resize'));
addEventListener('load',()=>{requestAnimationFrame(remeasure);document.fonts&&document.fonts.ready.then(()=>requestAnimationFrame(remeasure));});

// 5 the real founding count
const f=window.SOG_SHOP&&SOG_SHOP.founding;
if(f)document.querySelectorAll('[data-spots-left]').forEach(e=>{e.textContent=`${f.left} of ${f.total}`;});
if(f&&f.left<=0){const o=document.getElementById('founding');if(o)o.classList.add('full');}
})();
