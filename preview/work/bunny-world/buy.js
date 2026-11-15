/* Bunny World: the "Buy" dropdown in the header. It lists the price-strip plans, lets you choose which shop's look
   the site is built in (it follows the shop you're looking at in the showcase), and adds to the shared Sea of Grass
   cart (/preview/assets/shop/cart.js, demo mode: no payment is taken). */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const box=$('[data-buy]');if(!box)return;
const btn=$('.buy-btn',box),panel=$('#buy-panel'),sel=$('[data-buy-look]',box),site=$('[data-buy-site]',box),thumb=$('[data-buy-thumb]',box);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the shared cart button sits right after Buy, before "Book a call" */
const cartBtn=$('.shop-cartbtn');if(cartBtn)box.after(cartBtn);

function setLook(k){sel.value=k;site.dataset.add='bw-site-'+k;thumb.src=`/preview/assets/work/bunny-world/poster-${k}-phone.webp`;states();}
sel.addEventListener('change',()=>setLook(sel.value));
/* follow the showcase: whichever shop tab is selected */
const syncFromTab=()=>{const t=$('.tabs .tab[aria-selected="true"]');if(t&&t.dataset.shop&&panel.hidden)setLook(t.dataset.shop);};
$$('.tabs .tab').forEach(t=>t.addEventListener('click',()=>setTimeout(syncFromTab,0)));

/* show what's already in the cart */
function states(){const c=window.sogCart?sogCart.get():{};
  $$('.buy-add',box).forEach(b=>{const q=c[b.dataset.add]||0;b.classList.toggle('in',q>0);b.textContent=q?(b.dataset.add==='fix'?'Add another':'In your cart ✓'):'Add to cart';
    b.disabled=q>0&&b.dataset.add!=='fix';});}
addEventListener('storage',e=>{if(e.key==='sog-cart')states();});

function open(){syncFromTab();states();panel.hidden=false;btn.setAttribute('aria-expanded','true');box.classList.add('on');
  requestAnimationFrame(()=>panel.classList.add('in'));}
function close(focus){if(panel.hidden)return;panel.classList.remove('in');btn.setAttribute('aria-expanded','false');box.classList.remove('on');
  setTimeout(()=>{if(!box.classList.contains('on'))panel.hidden=true;},reduce?0:180);if(focus)btn.focus();}
btn.addEventListener('click',()=>panel.hidden||!panel.classList.contains('in')?open():close());
document.addEventListener('click',e=>{if(!box.contains(e.target))close();});
box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}});
/* adding hands over to the cart drawer (cart.js opens it); close the dropdown under it */
$$('.buy-add',box).forEach(b=>b.addEventListener('click',()=>{setTimeout(()=>{states();close();},0);}));
syncFromTab();
})();
