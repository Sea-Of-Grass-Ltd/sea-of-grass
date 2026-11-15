/* Live examples: a list of demo shops switches one big live preview (desktop frame + phone frame).
   The iframes load only when the section nears the screen, and each is drawn at a real device width
   (1280 desktop, 390 phone) then scaled to fit its frame. On a phone the big frame shows the phone layout. */
(()=>{
const stage=document.getElementById('stage');if(!stage)return;
const tabs=[...document.querySelectorAll('.picks [role="tab"]')];
const views=[...stage.querySelectorAll('.view')];
const host=stage.querySelector('.host'),open=stage.querySelector('a.open'),go=stage.querySelector('a.go');
let loaded=false;

function fit(){views.forEach(v=>{const f=v.querySelector('iframe'),w=v.clientWidth,h=v.clientHeight;if(!w)return;
  let lw=+v.dataset.w;if(lw>1000&&w<520)lw=390;                     // narrow screens: the big frame shows the phone layout
  const s=w/lw;f.style.width=lw+'px';f.style.height=Math.ceil(h/s)+'px';f.style.transform=`scale(${s})`;});}
function load(src){views.forEach(v=>{const f=v.querySelector('iframe');if(f.getAttribute('src')!==src)f.setAttribute('src',src);});}

function pick(t,focus){tabs.forEach(b=>{const on=b===t;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  if(focus)t.focus();
  const src=t.dataset.src,name=t.dataset.name;
  stage.setAttribute('aria-labelledby',t.id);host.textContent=t.dataset.host;
  open.href=go.href=src;open.setAttribute('aria-label','Open '+name);go.innerHTML='Open '+name+' &rarr;';
  views[0].querySelector('iframe').title=name+', desktop';views[1].querySelector('iframe').title=name+', phone';
  if(loaded)load(src);}

tabs.forEach((t,i)=>{t.addEventListener('click',()=>pick(t));
  t.addEventListener('keydown',e=>{const k=e.key;let j=null;
    if(k==='ArrowDown'||k==='ArrowRight')j=(i+1)%tabs.length;else if(k==='ArrowUp'||k==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;
    else if(k==='Home')j=0;else if(k==='End')j=tabs.length-1;
    if(j!==null){e.preventDefault();pick(tabs[j],true);}});});

new IntersectionObserver((es,io)=>{if(es.some(e=>e.isIntersecting)){loaded=true;io.disconnect();
  load(tabs.find(t=>t.getAttribute('aria-selected')==='true').dataset.src);}},{rootMargin:'600px 0px'}).observe(stage);
new ResizeObserver(fit).observe(stage);fit();
})();
