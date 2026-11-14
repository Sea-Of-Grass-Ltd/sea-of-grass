/* Bunny World: the working parts every shop shares. Nothing here sends anything anywhere: orders, bookings and
   forms finish on the page with a confirmation, the way they would on a client's site once it is wired up. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>'$'+n.toFixed(2);
const TZ='America/Denver';
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---- toast for links that would leave the demo ---- */
let tt;const toast=m=>{let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600);};
window.bwToast=toast;
$$('[data-demo-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();toast(a.dataset.demoLink||'Demo only: on a real site this opens the app.');}));

/* ---- local time in Colorado, whatever the visitor's clock says ---- */
function now(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),min:(+p.hour%24)*60+(+p.minute)};}
const toMin=s=>{const[h,m]=s.split(':').map(Number);return h*60+(m||0);};
const fmt=s=>{let m=typeof s==='number'?s:toMin(s),h=Math.floor(m/60)%24,mm=m%60;const ap=h>=12?'pm':'am';h=h%12||12;return h+(mm?':'+String(mm).padStart(2,'0'):'')+' '+ap;};

/* ---- hours: a live open / closed sign and the week, today marked ---- */
$$('[data-hours]').forEach(box=>{
  const H=JSON.parse(box.dataset.hours);   // {"0":null,"1":["11:00","21:00"],...} with 0 = Sunday
  const draw=()=>{const n=now();let html='';
    const today=H[n.day];let open=today&&n.min>=toMin(today[0])&&n.min<toMin(today[1]),msg;
    if(open)msg=`Open now · until ${fmt(today[1])}`;
    else{for(let k=0;k<8;k++){const d=(n.day+k)%7,h=H[d];if(!h)continue;if(k===0&&n.min>=toMin(h[0]))continue;msg=`Closed · opens ${k===0?'today':k===1?'tomorrow':DAYS[d]} at ${fmt(h[0])}`;break;}}
    html+=`<p class="status${open?' open':''}" role="status">${msg||'Closed'}</p><table><caption class="sr">Opening hours</caption>`;
    for(let k=1;k<=7;k++){const d=k%7,h=H[d];html+=`<tr${d===n.day?' class="today"':''}><td>${DAYS[d]}${d===n.day?' (today)':''}</td><td>${h?fmt(h[0])+' – '+fmt(h[1]):'Closed'}</td></tr>`;}
    box.innerHTML=html+'</table>'+(box.dataset.note?`<p class="note" style="margin-top:10px">${box.dataset.note}</p>`:'');};
  draw();setInterval(draw,60000);});

/* ---- filter chips: show only the items whose tags match ---- */
$$('[data-filter]').forEach(g=>{const list=document.getElementById(g.dataset.filter),bs=$$('button',g);
  bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const f=b.dataset.f;
    $$('[data-tags]',list).forEach(li=>li.hidden=!(f==='all'||li.dataset.tags.split(' ').includes(f)));}));});

/* ---- tabs ---- */
$$('[data-tabs]').forEach(g=>{const bs=$$('[role=tab]',g);bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>{const on=x===b;x.setAttribute('aria-selected',String(on));document.getElementById(x.getAttribute('aria-controls')).hidden=!on;});}));});

/* ---- live text: inputs with data-bind fill elements with data-show ---- */
$$('[data-bind]').forEach(i=>{const go=()=>{const v=i.type==='radio'?($(`[name="${i.name}"]:checked`)||{}).value:i.value;$$(`[data-show="${i.dataset.bind}"]`).forEach(e=>e.textContent=v||e.dataset.empty||'');};
  i.addEventListener('input',go);i.addEventListener('change',go);if(i.type!=='radio'||i.checked)go();});

/* ---- calculators: a quote or a ticket price that adds up as you choose ---- */
$$('[data-calc]').forEach(c=>{const out=$$('[data-out]',c);
  const run=()=>{let t=0,m=1;
    $$('[data-price]',c).forEach(e=>{if(e.tagName==='OPTION')return;const p=+e.dataset.price;
      if(e.type==='checkbox'||e.type==='radio'){if(e.checked)t+=p;}else if(e.type==='number'||e.type==='range'){t+=p*(+e.value||0);}else t+=p;});
    $$('select',c).forEach(s=>{const o=s.selectedOptions[0];if(o&&o.dataset.price)t+=+o.dataset.price;if(o&&o.dataset.mult)m*=+o.dataset.mult;});
    $$('[data-mult]',c).forEach(e=>{if(e.tagName==='OPTION')return;if(e.type==='checkbox'||e.type==='radio'){if(e.checked)m*=+e.dataset.mult;}else m*=+e.value||0;});
    const total=t*m,lo=c.dataset.range?total*(1-+c.dataset.range):null;
    out.forEach(o=>{const k=o.dataset.out;o.textContent=k==='range'&&lo!==null?`$${Math.round(lo)} – $${Math.round(total*(1+ +c.dataset.range))}`:k==='weekly'&&c.dataset.weeks?money(total/ +c.dataset.weeks):money(total);});};
  c.addEventListener('input',run);c.addEventListener('change',run);run();});

/* ---- booking: a date strip of the next two weeks, then the times still free that day ---- */
const hash=s=>{let h=7;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
$$('[data-slots]').forEach(box=>{
  const open=box.dataset.days.split(',').map(Number),times=box.dataset.times.split(','),f=box.closest('form');
  const di=f.querySelector('input[name=date]'),ti=f.querySelector('input[name=time]');
  const strip=document.createElement('div');strip.className='days';strip.setAttribute('aria-label','Pick a day');
  const grid=document.createElement('div');grid.className='slots';grid.setAttribute('aria-label','Pick a time');
  box.append(strip,grid);
  const n=now();const base=new Date();
  const days=[];for(let k=0;k<14;k++){const d=new Date(base);d.setDate(base.getDate()+k);days.push({d,wd:(n.day+k)%7,k});}
  let pick=null;
  const showTimes=day=>{grid.innerHTML='';ti.value='';
    times.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=fmt(t);b.setAttribute('aria-pressed','false');
      const taken=hash(day.d.toDateString()+t+(box.dataset.seed||''))%3===0||(day.k===0&&toMin(t)<=n.min+60);
      b.disabled=taken;if(taken)b.setAttribute('aria-label',fmt(t)+', taken');
      b.addEventListener('click',()=>{$$('button',grid).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));ti.value=fmt(t);ti.dispatchEvent(new Event('change',{bubbles:true}));});grid.appendChild(b);});};
  days.forEach(day=>{const b=document.createElement('button');b.type='button';const closed=!open.includes(day.wd);b.disabled=closed;
    b.innerHTML=`<span>${day.d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${day.d.getDate()}</b><span>${day.d.toLocaleDateString('en-US',{month:'short'})}</span>`;
    b.setAttribute('aria-pressed','false');if(closed)b.title='Closed';
    b.addEventListener('click',()=>{$$('button',strip).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));di.value=day.d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});pick=day;showTimes(day);});
    strip.appendChild(b);});
  // open on the first day that still has a free time
  for(const b of $$('button:not(:disabled)',strip)){b.click();if($('button:not(:disabled)',grid))break;}});

/* ---- cart: add, change amounts, see the total with Colorado tax, check out ---- */
$$('[data-cart]').forEach(cart=>{
  const items=new Map(),list=$('ul',cart),sum=$('.sum',cart),tax=+(cart.dataset.tax||0),fee=$('[data-fee]',cart),go=$('[data-checkout]',cart),badge=$$('[data-count]');
  const draw=()=>{list.innerHTML='';let sub=0,count=0;
    items.forEach((v,k)=>{sub+=v.p*v.q;count+=v.q;const li=document.createElement('li');
      li.innerHTML=`<span>${k}</span><span class="qty"><button type="button" aria-label="One fewer ${k}">−</button><span>${v.q}</span><button type="button" aria-label="One more ${k}">+</button></span><span class="price">${money(v.p*v.q)}</span>`;
      const[m,p]=$$('button',li);m.onclick=()=>{v.q--;if(!v.q)items.delete(k);draw();};p.onclick=()=>{v.q++;draw();};list.appendChild(li);});
    if(!count)list.innerHTML=`<li class="empty" style="display:block">${cart.dataset.empty||'Nothing in your bag yet.'}</li>`;
    const extra=fee&&fee.checked?+fee.dataset.fee:0;
    sum.innerHTML=`<span>Subtotal</span><span class="price">${money(sub)}</span>`+(extra?`<span>${fee.dataset.label}</span><span class="price">${money(extra)}</span>`:'')+(tax?`<span>Sales tax</span><span class="price">${money((sub+extra)*tax)}</span>`:'')+`<span class="t">Total</span><span class="t price">${money((sub+extra)*(1+tax))}</span>`;
    if(go)go.disabled=!count;badge.forEach(b=>b.textContent=count);cart.dataset.total=money((sub+extra)*(1+tax));};
  if(fee)fee.addEventListener('change',draw);
  $$('[data-add]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.add,v=items.get(k)||{p:+b.dataset.price,q:0};v.q++;items.set(k,v);draw();toast(`Added ${k}`);}));
  cart.bwClear=()=>{items.clear();draw();};draw();});

/* ---- demo forms: check, then confirm on the page with a reference number ---- */
$$('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const err=$('.err',f);if(err)err.textContent='';
  const need=$$('input[type=hidden][required]',f).find(i=>!i.value);
  if(need){if(err)err.textContent=need.dataset.msg||'Pick a time first.';return;}
  if(!f.reportValidity())return;
  const done=$('.done',f);const ref=(f.dataset.demo||'BW')+'-'+String(1000+Math.floor(Math.random()*9000));
  const cart=f.closest('[data-cart]');
  const lines=$$('[data-sum]',f).map(i=>{if((i.type==='checkbox'||i.type==='radio')&&!i.checked)return null;const v=i.tagName==='SELECT'?i.selectedOptions[0].text:i.value;return v?`${i.dataset.sum}: ${v}`:null;}).filter(Boolean);
  if(cart)lines.unshift('Total: '+cart.dataset.total);
  $$('[data-out]',f).forEach(o=>lines.push((o.dataset.label||'Total')+': '+o.textContent));
  done.innerHTML=`<b>${f.dataset.ok||'Sent.'}</b>${lines.map(l=>`<span style="display:block">${l.replace(/</g,'&lt;')}</span>`).join('')}<span class="note" style="display:block;margin-top:8px">Reference ${ref}. Demo only: nothing was sent. On your site this goes to your inbox, phone or booking calendar.</span>`;
  done.classList.add('on');done.setAttribute('tabindex','-1');done.focus({preventScroll:true});done.scrollIntoView({block:'nearest',behavior:'smooth'});
  if(cart&&cart.bwClear)cart.bwClear();}));

/* ---- uploads: list the photos picked ---- */
$$('input[type=file][data-list]').forEach(i=>i.addEventListener('change',()=>{const o=document.getElementById(i.dataset.list);o.textContent=i.files.length?[...i.files].map(f=>f.name).join(', '):'';}));

/* ---- before / after ---- */
$$('.ba input').forEach(r=>{const set=()=>r.closest('.ba').style.setProperty('--cut',r.value+'%');r.addEventListener('input',set);set();});

/* ---- check a zip code against the service area ---- */
$$('[data-zips]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const z=$('input',f).value.trim(),o=$('.zip-out',f),Z=JSON.parse(f.dataset.zips);
  o.textContent=!/^\d{5}$/.test(z)?'Enter a five-digit zip code.':Z[z]?`Yes, we come to ${Z[z]}. ${f.dataset.yes||''}`:(f.dataset.no||'That one is outside our usual area, but ask anyway: we sometimes travel for bigger jobs.');}));

})();
