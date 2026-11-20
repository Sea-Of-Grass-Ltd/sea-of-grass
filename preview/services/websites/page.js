/* Websites page, two paths: a normal page that scrolls on its own. This file only does four small things:
   1 the header's Book button shows once the hero's Book has gone and hides again when the close's Book is on screen,
     so there is never more than one Book button in view;
   2 the nine Bunny World shops load as they come near and are drawn at 390 px, scaled to their frames;
   3 meadows measured before the page settled are measured again once fonts and images are in;
   4 the founding count comes from SOG_SHOP.founding (checkout-links.js), never typed into the page. */
(()=>{
// 1 one Book button in view
const headerBook=document.querySelector('header.top a.book'),pageBooks=[...document.querySelectorAll('[data-book]')];
if(headerBook&&pageBooks.length&&'IntersectionObserver' in window){
  const seen=new Set();
  const io=new IntersectionObserver(es=>{es.forEach(e=>e.isIntersecting?seen.add(e.target):seen.delete(e.target));
    document.body.classList.toggle('book-in-page',seen.size>0);},{rootMargin:'0px'});
  pageBooks.forEach(b=>io.observe(b));
  document.body.classList.add('book-in-page');                      // on landing the hero's Book is the one in view
}

// 2 the shop rail
const fit=v=>{const f=v.querySelector('iframe'),w=v.clientWidth,h=v.clientHeight;if(!w||!f)return;const lw=+v.dataset.w||390,s=w/lw;
  f.style.width=lw+'px';f.style.height=Math.ceil(h/s)+'px';f.style.transform=`scale(${s})`;};
const ro=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));
document.querySelectorAll('.rail .view').forEach(v=>ro.observe(v));
const load=f=>{if(f&&!f.getAttribute('src'))f.src=f.dataset.lazy;};
const near=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){load(e.target.querySelector('iframe'));near.unobserve(e.target);}}),{rootMargin:'400px 400px'});
document.querySelectorAll('.rail .shop').forEach(s=>near.observe(s));

// 3 meadows measured again once the page has settled (seen on phones)
const remeasure=()=>dispatchEvent(new Event('resize'));
addEventListener('load',()=>{requestAnimationFrame(remeasure);document.fonts&&document.fonts.ready.then(()=>requestAnimationFrame(remeasure));});

// 4 the real founding count
const f=window.SOG_SHOP&&SOG_SHOP.founding;
if(f)document.querySelectorAll('[data-spots-left]').forEach(e=>{e.textContent=`${f.left} of ${f.total}`;});
if(f&&f.left<=0){const o=document.getElementById('founding');if(o)o.classList.add('full');}
})();
