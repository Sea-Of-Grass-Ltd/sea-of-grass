/* The register demo: a small register panel beside the real Bunny Burritos page in a phone frame.
   Price and sold-out changes are written into that page's own menu buttons (same origin), so the shop's cart
   picks up the new price too. The iframe loads when the section nears the screen and is drawn at 390 px wide,
   then scaled to fit its frame. */
(()=>{
const sec=document.getElementById('register');if(!sec)return;
const view=sec.querySelector('.view'),frame=view.querySelector('iframe'),rows=[...sec.querySelectorAll('.reg-row')];
const money=n=>'$'+n.toFixed(2);

function fit(){const w=view.clientWidth,h=view.clientHeight;if(!w)return;const s=w/390;
  frame.style.width='390px';frame.style.height=Math.ceil(h/s)+'px';frame.style.transform=`scale(${s})`;}

function shopButton(name){const d=frame.contentDocument;if(!d)return null;
  return [...d.querySelectorAll('button[data-add]')].find(b=>b.dataset.add===name)||null;}

// write one row's state into the shop page, then bring that item into view inside the phone
function apply(row,show){const b=shopButton(row.dataset.item);if(!b)return;
  const p=+row.dataset.price,out=row.querySelector('[data-act="soldout"]').getAttribute('aria-pressed')==='true';
  b.dataset.price=String(p);
  b.disabled=out;b.classList.toggle('sold',out);
  b.innerHTML=out?'Sold out':'Add &middot; '+money(p);
  b.setAttribute('aria-label',out?row.dataset.item+', sold out':'Add '+row.dataset.item+', '+money(p));
  const li=b.closest('li');
  if(li){li.style.opacity=out?'.5':'';
    if(show){const win=frame.contentWindow,r=li.getBoundingClientRect();
      win.scrollTo({top:win.scrollY+r.top-win.innerHeight/2+r.height/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      li.animate?.([{background:'rgba(80,157,252,.28)'},{background:'transparent'}],{duration:1200,easing:'ease-out'});}}}

rows.forEach(row=>{
  const price=row.querySelector('.reg-price'),out=row.querySelector('[data-act="soldout"]');
  row.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(btn=>btn.addEventListener('click',()=>{
    const p=Math.max(.5,Math.round((+row.dataset.price+(btn.dataset.act==='up'?.5:-.5))*100)/100);
    row.dataset.price=String(p);price.textContent=money(p);apply(row,true);}));
  out.addEventListener('click',()=>{const on=out.getAttribute('aria-pressed')!=='true';
    out.setAttribute('aria-pressed',String(on));row.classList.toggle('is-out',on);apply(row,true);});
});

// once the shop has loaded: match it to the register and open it at the burritos
frame.addEventListener('load',()=>{rows.forEach(r=>apply(r,false));
  const first=shopButton(rows[0].dataset.item)?.closest('li');
  if(first){const win=frame.contentWindow;win.scrollTo(0,win.scrollY+first.getBoundingClientRect().top-24);}});

new IntersectionObserver((es,io)=>{if(es.some(e=>e.isIntersecting)){io.disconnect();frame.src=frame.dataset.lazy;}},{rootMargin:'600px 0px'}).observe(sec);
new ResizeObserver(fit).observe(view);fit();
})();
