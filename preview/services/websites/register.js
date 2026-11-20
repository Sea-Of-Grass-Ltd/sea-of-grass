/* The register beat: a small register beside the real Bunny Burritos page in a phone frame.
   Price and sold-out changes are written into that page's own menu buttons (same origin), so the shop's cart uses the new
   price too. The shop loads as the beat gets near and is drawn at 390 px wide, then scaled to fit its frame. */
(()=>{
const play=document.querySelector('.reg-play');if(!play)return;
const view=play.querySelector('.reg-shop .view'),frame=view.querySelector('iframe'),rows=[...play.querySelectorAll('.reg-row')];
const money=n=>'$'+n.toFixed(2);

function fit(){const w=view.clientWidth,h=view.clientHeight;if(!w)return;const s=w/390;
  frame.style.width='390px';frame.style.height=Math.ceil(h/s)+'px';frame.style.transform=`scale(${s})`;}
function shopButton(name){const d=frame.contentDocument;if(!d)return null;
  return [...d.querySelectorAll('button[data-add]')].find(b=>b.dataset.add===name)||null;}

// write one row into the shop page, then bring that item into view inside the phone
function apply(row,show){const b=shopButton(row.dataset.item);if(!b)return;
  const p=+row.dataset.price,out=row.querySelector('[data-act="soldout"]').getAttribute('aria-pressed')==='true';
  b.dataset.price=String(p);b.disabled=out;
  b.innerHTML=out?'Sold out':'Add &middot; '+money(p);
  b.setAttribute('aria-label',out?row.dataset.item+', sold out':'Add '+row.dataset.item+', '+money(p));
  const li=b.closest('li');if(!li)return;
  li.style.opacity=out?'.5':'';
  if(show){const win=frame.contentWindow,r=li.getBoundingClientRect();
    win.scrollTo({top:win.scrollY+r.top-win.innerHeight/2+r.height/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    li.animate?.([{background:'rgba(80,157,252,.35)'},{background:'transparent'}],{duration:900,easing:'ease-out'});}}

rows.forEach(row=>{
  const price=row.querySelector('.reg-price'),out=row.querySelector('[data-act="soldout"]');
  if(price)row.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(btn=>btn.addEventListener('click',()=>{
    const p=Math.max(.5,Math.round((+row.dataset.price+(btn.dataset.act==='up'?.5:-.5))*100)/100);
    row.dataset.price=String(p);price.textContent=money(p);
    price.animate?.([{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:220,easing:'ease-out'});
    apply(row,true);}));
  out.addEventListener('click',()=>{const on=out.getAttribute('aria-pressed')!=='true';
    out.setAttribute('aria-pressed',String(on));row.classList.toggle('is-out',on);apply(row,true);
    const cap=play.querySelector('[data-caption]');if(on&&cap&&cap.dataset.after){cap.textContent=cap.dataset.after;cap.classList.add('swapped');}});
});

frame.addEventListener('load',()=>{rows.forEach(r=>apply(r,false));
  const first=shopButton(rows[0].dataset.item)?.closest('li');
  if(first){const win=frame.contentWindow;win.scrollTo(0,win.scrollY+first.getBoundingClientRect().top-win.innerHeight/3);}});

const load=()=>{if(!frame.getAttribute('src'))frame.src=frame.dataset.lazy;};
// the shop loads as the demo comes near
new IntersectionObserver((es,io)=>{if(es.some(e=>e.isIntersecting)){io.disconnect();load();}},{rootMargin:'600px 0px'}).observe(play);
new ResizeObserver(fit).observe(view);fit();
})();
