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
/* a required field with only spaces in it counts as empty */
const blankToEmpty=r=>$$('input[required]:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea[required]',r).forEach(i=>{if(i.value&&!i.value.trim())i.value='';});
$$('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();
  if(f._sentAt&&Date.now()-f._sentAt<2000)return; /* a double-tap books once */
  const err=$('.err',f);if(err)err.textContent='';blankToEmpty(f);
  const need=$$('input[type=hidden][required]',f).find(i=>!i.value);
  if(need){if(err)err.textContent=need.dataset.msg||'Pick a time first.';return;}
  if(!f.reportValidity())return;
  const done=$('.done',f);const ref=(f.dataset.demo||'BW')+'-'+String(1000+Math.floor(Math.random()*9000));
  const cart=f.closest('[data-cart]');
  const lines=$$('[data-sum]',f).map(i=>{if((i.type==='checkbox'||i.type==='radio')&&!i.checked)return null;const v=i.tagName==='SELECT'?i.selectedOptions[0].text:i.type==='date'&&i.value?new Date(i.value+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):i.value;return v?`${i.dataset.sum}: ${v}`:null;}).filter(Boolean);
  if(cart)lines.unshift('Total: '+cart.dataset.total);
  $$('[data-out]',f).forEach(o=>lines.push((o.dataset.label||'Total')+': '+o.textContent));
  done.innerHTML=`<b>${f.dataset.ok||'Sent.'}</b>${lines.map(l=>`<span style="display:block">${l.replace(/</g,'&lt;')}</span>`).join('')}<span class="note" style="display:block;margin-top:8px">Reference ${ref}. Demo only: nothing was sent. On your site this goes to your inbox, phone or booking calendar.</span>`;
  f._sentAt=Date.now();done.classList.add('on');done.setAttribute('tabindex','-1');done.focus({preventScroll:true});done.scrollIntoView({block:'nearest',behavior:'smooth'});
  if(cart&&cart.bwClear)cart.bwClear();}));

/* ---- uploads: list the photos picked ---- */
$$('input[type=file]').forEach(i=>{const box=document.createElement('span');box.className='file-pick';box.setAttribute('aria-hidden','true');
  const say=()=>{const n=i.files.length;box.innerHTML=`<b>${n?'Change photos':'Add photos'}</b><span>${n?[...i.files].map(f=>f.name).join(', '):'From your phone or computer'}</span>`;};
  say();i.classList.add('sr');i.after(box);
  i.addEventListener('change',()=>{say();const o=i.dataset.list&&document.getElementById(i.dataset.list);if(o)o.textContent='';});});

/* ---- before / after ---- */
$$('.ba input').forEach(r=>{const set=()=>r.closest('.ba').style.setProperty('--cut',r.value+'%');r.addEventListener('input',set);set();});

/* ---- check a zip code against the service area ---- */
$$('[data-zips]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const z=$('input',f).value.trim(),o=$('.zip-out',f),Z=JSON.parse(f.dataset.zips);
  o.textContent=!/^\d{5}$/.test(z)?'Enter a five-digit zip code.':Z[z]?`Yes, we come to ${Z[z]}. ${f.dataset.yes||''}`:(f.dataset.no||'That one is outside our usual area, but ask anyway: we sometimes travel for bigger jobs.');}));

/* ---- day chips: a "which day" date field becomes a row of tappable day cards (2026-11-15: no raw mm/dd/yyyy anywhere).
   Two weeks from min (or tomorrow), capped by max; re-drawn if a shop script sets min/max later (Cottontail's season window).
   The real input stays as the value, hidden. Birthdays (autocomplete=bday) keep the styled date field. */
$$('[data-q] input[type=date]:not([autocomplete=bday])').forEach(inp=>{
  const step=inp.closest('[data-q]'),solo=$$('input:not([type=hidden]),select,textarea',step).length===1;
  const row=document.createElement('div');row.className='q-days';row.setAttribute('role','group');row.setAttribute('aria-label',step.dataset.q);
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const draw=()=>{row.textContent='';const t=new Date();t.setHours(12,0,0,0);t.setDate(t.getDate()+1);
    let d=inp.min?new Date(inp.min+'T12:00'):t;if(d<t)d=t;const end=inp.max?new Date(inp.max+'T12:00'):null;
    for(let k=0;k<14&&(!end||d<=end);k++,d=new Date(d.getTime()+864e5)){const v=iso(d),b=document.createElement('button');b.type='button';b.className='q-day';b.dataset.v=v;
      b.dataset.sumText=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});b.setAttribute('aria-pressed',String(inp.value===v));
      b.innerHTML=`<small>${d.toLocaleDateString('en-US',{weekday:'short'})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-US',{month:'short'})}</small>`;
      b.setAttribute('aria-label',d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}));
      b.addEventListener('click',()=>{inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
        $$('.q-day',row).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});row.appendChild(b);}};
  draw();new MutationObserver(draw).observe(inp,{attributes:true,attributeFilter:['min','max']});
  const lab=inp.closest('label');(lab||inp).classList.add('sr');(lab||inp).after(row);inp.tabIndex=-1;
  if(solo)step.dataset.qAuto='.q-day';});


/* ---- one question at a time (Tristan, 2026-11-15: "the simple page with a hook being all you see until things come out afterwards").
   Any element with data-steps: each child marked data-q="Question" becomes a step. Only the first shows; answering it collapses it
   to a one-line summary ("Oil change ✓ Change") and the next step slides in beneath. Contact details go in the last step.
   How a step is answered:
   - a single <select> becomes a row of tappable choices (the select stays as the value, hidden);
   - data-q-auto="selector": a click on a matching button answers it (time slots, days, barbers);
   - anything else gets a Next button that checks the fields first.
   The step holding the submit button is the last one. data-q-sum="selector,..." picks what the summary shows.
   el.bwSteps.done(i) marks a step answered from code (e.g. a hand-off that pre-fills the form). */
$$('[data-steps]').forEach(root=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps=$$('[data-q]',root).filter(s=>s.closest('[data-steps]')===root);
  const done=steps.map(()=>false);let reopened=-1;
  const clean=t=>String(t).replace(/\s+/g,' ').trim();
  steps.forEach((s,i)=>{
    const body=document.createElement('div');body.className='rv-in';while(s.firstChild)body.appendChild(s.firstChild);
    const final=!!$('[type=submit]',body);
    const sel=$$('select',body),others=$$('input:not([type=hidden]),textarea',body);
    const chips=!s.hasAttribute('data-q-keep')&&sel.length===1&&!others.length&&!s.dataset.qAuto;
    if(chips){const se=sel[0],row=document.createElement('div');row.className='q-opts';row.setAttribute('role','group');row.setAttribute('aria-label',s.dataset.q);
      [...se.options].forEach(o=>{const b=document.createElement('button');b.type='button';b.className='q-opt';b.textContent=o.textContent;b.setAttribute('aria-pressed','false');
        b.addEventListener('click',()=>{se.value=o.value;se.dispatchEvent(new Event('input',{bubbles:true}));se.dispatchEvent(new Event('change',{bubbles:true}));
          $$('.q-opt',row).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));answer(i);});row.appendChild(b);});
      const lab=se.closest('label');(lab||se).classList.add('sr');lab?lab.after(row):se.after(row);s._sel=se;}
    if(!final&&!chips&&!s.dataset.qAuto){const nx=document.createElement('button');nx.type='button';nx.className='btn q-next';nx.textContent='Next';
      nx.addEventListener('click',()=>{blankToEmpty(body);const bad=$$('input:not([type=hidden]),select,textarea',body).find(f=>!f.checkValidity());if(bad){bad.reportValidity();return;}answer(i);});
      body.appendChild(nx);}
    if(s.dataset.qAuto)body.addEventListener('click',e=>{if(!e.isTrusted)return;const b=e.target.closest(s.dataset.qAuto);if(b&&!b.disabled)setTimeout(()=>answer(i),0);}); // scripts pre-picking a day don't count
    const head=document.createElement('p');head.className='q-h';head.innerHTML=`<span class="q-n">${i+1}</span>`;head.appendChild(document.createTextNode(s.dataset.q));
    const sum=document.createElement('button');sum.type='button';sum.className='q-sum';sum.hidden=true;sum.innerHTML='<b></b><span aria-hidden="true">✓</span><u>Change</u>';
    sum.addEventListener('click',()=>{reopened=i;flow(false);setTimeout(()=>{const f=$('[aria-pressed="true"],input:not([type=hidden]),select,textarea,button',s._body);f&&f.focus({preventScroll:true});},reduce?0:340);});
    const wrapBody=document.createElement('div');wrapBody.className='reveal q-body';wrapBody.appendChild(body);
    const inner=document.createElement('div');inner.className='rv-in';inner.append(head,sum,wrapBody);
    s.classList.add('reveal','q-step');s.appendChild(inner);s._body=body;s._wrap=wrapBody;s._sum=sum;s._final=final;});
  function value(s){
    if(s.dataset.qSum)return s.dataset.qSum.split(',').map(q=>{const e=$(q.trim(),root);return e?clean(e.value!==undefined&&e.tagName!=='P'&&e.tagName!=='B'&&e.tagName!=='SPAN'?e.value:e.textContent):'';}).filter(Boolean).join(' · ');
    if(s._sel)return clean(s._sel.selectedOptions[0].textContent);
    if(s.dataset.qText){const f=$$('input:not([type=hidden]),select,textarea',s._body);   // e.g. "{0} kids · {1} adults"
      return s.dataset.qText.split(' · ').map(part=>{const m=part.match(/\{(\d+)\}/);if(!m)return part;const e=f[+m[1]];if(!e)return '';
        const v=e.type==='checkbox'?(e.checked?'yes':''):e.tagName==='SELECT'?e.selectedOptions[0].textContent:e.value;return v&&v!=='0'?clean(part.replace(m[0],e.type==='checkbox'?'':clean(v))):'';}).filter(Boolean).join(' · ');}
    if(s.dataset.qAuto){const b=$$(s.dataset.qAuto,s._body).find(x=>x.getAttribute('aria-pressed')==='true');return b?clean(b.dataset.sumText||[...b.childNodes].map(n=>n.textContent).filter(t=>t.trim()).join(' · ')):'';}
    return $$('input:not([type=hidden]),select,textarea',s._body).map(f=>{
      if(f.type==='checkbox'||f.type==='radio')return f.checked?clean(f.value!=='on'?f.value:(f.closest('label')||{}).textContent||''):'';
      if(f.tagName==='SELECT')return clean(f.selectedOptions[0].textContent);
      if(f.type==='file')return f.files.length?f.files.length+(f.files.length>1?' photos':' photo'):'';
      if(f.type==='date'&&f.value)return new Date(f.value+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      return clean(f.value);}).filter(Boolean).join(' · ')||'Skipped';}
  function show(el,on){el.classList.toggle('on',on);if(on)el.removeAttribute('inert');else el.setAttribute('inert','');}
  function flow(move){let first=-1;
    steps.forEach((s,i)=>{const reach=i===0||done.slice(0,i).every(Boolean),open=reach&&(!done[i]||reopened===i||s._final);
      show(s,reach);show(s._wrap,open);if(s._sel){const v=s._sel.value;$$('.q-opt',s._body).forEach((b,k)=>b.setAttribute('aria-pressed',String(done[i]&&s._sel.options[k].value===v)));}s._sum.hidden=!(done[i]&&!open);if(done[i]&&!s._final)$('b',s._sum).textContent=value(s);
      if(reach&&!done[i]&&first<0)first=i;});
    if(move&&first>=0){const t=steps[first];setTimeout(()=>{const r=t.getBoundingClientRect();if(r.bottom>innerHeight-24||r.top<0)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
      const f=$('.q-opt,[aria-pressed]:not(:disabled),input:not([type=hidden]),select,textarea',t._body);f&&f.focus({preventScroll:true});},reduce?0:340);}}
  function answer(i){done[i]=true;reopened=-1;flow(true);}
  root.bwSteps={done(i){done[i]=true;reopened=-1;flow(false);},refresh(){flow(false);}};
  root.classList.add('q-ready');flow(false);});

})();
