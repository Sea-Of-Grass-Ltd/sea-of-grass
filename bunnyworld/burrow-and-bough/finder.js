/* Burrow & Bough: the gift finder and the wrap. Three taps pick a bundle of two or three things from the shop's own
   catalog; then you choose paper, ribbon and a tag, and the box wraps itself. Bundle pictures are copied from the
   product tiles, so when the tiles get photos the finder shows them too. Nothing is sent anywhere. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const card=$('#finder');if(!card)return;
const body=$('[data-fbody]',card),stepEl=$('[data-fstep]',card),back=$('[data-fback]',card);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const money=n=>'$'+(Number.isInteger(n)?n:n.toFixed(2));
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* the catalog: names match the product tiles' "Add to bag" buttons */
const ITEMS=[
 {k:'Hand-thrown carrot mug',short:'Carrot mug',price:28,who:['friend','family','self','host'],vibe:['cozy','crafty'],note:'Thrown by Rosa at her Loveland kiln. The carrot is pressed in with a thumb.'},
 {k:'Prairie candle',short:'Prairie candle',price:22,who:['host','friend','family'],vibe:['cozy','fancy'],note:'Poured in small batches two blocks from us. Sage and sweetgrass, forty hours.'},
 {k:'Bunny-ear beanie',short:'Bunny-ear beanie',price:34,who:['friend','family','self'],vibe:['cozy','crafty'],note:'Knit by Mae, who has made four hundred of these and still laughs at the ears.'},
 {k:'Front Range print, 11x14',short:'Front Range print',price:40,who:['self','friend','host'],vibe:['crafty','fancy'],note:'Screen-printed in three inks by Hollis, sketched from a county road at dusk.'},
 {k:'Silver hare earrings',short:'Silver hare earrings',price:48,who:['friend','self','family'],vibe:['fancy'],note:'Sawn and filed by hand at a bench in Masonville. Each hare leaps a little differently.'},
 {k:'Local honey, 12 oz',short:'Local honey',price:14,who:['host','family','friend'],vibe:['tasty','cozy'],note:"From Tomás's hives in the next county over. The bees did most of the work."}];
ITEMS.forEach(it=>{const b=$(`.prod [data-add="${it.k}"]`);it.btn=b;it.tile=b&&b.closest('.prod').querySelector('.ob');});

const Q=[
 {id:'who',q:"Who's it for?",opts:[['friend','A friend'],['family','Family'],['self','Yourself'],['host','A host']]},
 {id:'vibe',q:'What do they love?',opts:[['cozy','Cozy nights'],['crafty','Handmade things'],['tasty','Something tasty'],['fancy','A little fancy']]},
 {id:'budget',q:"What's the budget?",opts:[['lo','Under $50'],['mid','$50 to $90'],['hi','Go big, $90+']]}];
const BUD={lo:[0,50],mid:[50,90],hi:[90,999]};
const LABEL={friend:'a friend',family:'family',self:'you',host:'a host',cozy:'cozy nights',crafty:'handmade things',tasty:'something tasty',fancy:'a little fancy'};

const PAPERS=[['check','Tomato check'],['stripe','Mustard stripe'],['pin','Indigo pinstripe'],['kraft','Plain kraft']];
const RIBBONS=[['#f4f1e0','Cream'],['#c42121','Tomato'],['#5a6a92','Indigo'],['#d9a531','Mustard']];

let pick={},bundles=[],bi=0,wrap={paper:'check',ribbon:'#f4f1e0',msg:''},step=0;

function combos(){const [lo,hi]=BUD[pick.budget],out=[];
  const n=ITEMS.length;
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){out.push([a,b]);for(let c=b+1;c<n;c++)out.push([a,b,c]);}
  return out.map(ix=>{const its=ix.map(i=>ITEMS[i]),t=its.reduce((s,i)=>s+i.price,0);
      let sc=its.reduce((s,i)=>s+(i.who.includes(pick.who)?2:0)+(i.vibe.includes(pick.vibe)?3:0),0);
      if(its.length===3&&pick.budget!=='lo')sc+=1.5;
      const mid=(lo+Math.min(hi,lo+60))/2;sc-=Math.abs(t-mid)/40;
      return{its,t,sc};})
    .filter(c=>c.t>=lo&&c.t<hi&&c.its.some(i=>i.vibe.includes(pick.vibe)))
    .sort((x,y)=>y.sc-x.sc);}

function thumb(it,cls){const o=it.tile;if(!o)return'';return`<span class="${cls}" style="${o.getAttribute('style')||''}" aria-hidden="true">${o.innerHTML}</span>`;}
function focusHead(){const h=$('.f-q',body);if(h)h.focus({preventScroll:true});}
function setStep(t){stepEl.textContent=t;}

function ask(){const q=Q[step];setStep(`Gift finder · step ${step+1} of 3`);back.hidden=step===0;
  body.innerHTML=`<h2 class="f-q" tabindex="-1">${q.q}</h2><div class="f-opts" role="group" aria-label="${q.q}">${q.opts.map(([v,t])=>`<button type="button" class="f-opt" data-v="${v}" aria-pressed="${pick[q.id]===v}">${t}</button>`).join('')}</div><p class="f-dots" aria-hidden="true">${Q.map((_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('')}</p>`;
  $$('.f-opt',body).forEach(b=>b.addEventListener('click',()=>{pick[q.id]=b.dataset.v;
    if(step<2){step++;ask();}else{bundles=combos();bi=0;show();}
    focusHead();}));}

function show(){step=3;back.hidden=false;setStep('Gift finder · your bundle');
  const c=bundles[bi];
  if(!c){body.innerHTML=`<h2 class="f-q" tabindex="-1">Nothing fits that one yet.</h2><p class="f-lead">Try another budget; the makers are working on it.</p><div class="f-acts"><button type="button" class="btn" data-again>Start over</button></div>`;$('[data-again]',body).onclick=again;return;}
  body.innerHTML=`<h2 class="f-q" tabindex="-1">For ${LABEL[pick.who]}, who loves ${LABEL[pick.vibe]}</h2>
   <ul class="bundle">${c.its.map(it=>`<li>${thumb(it,'b-ob')}<div><p class="b-name"><b>${it.short}</b><span>${money(it.price)}</span></p><p class="b-note">${it.note}</p></div></li>`).join('')}</ul>
   <p class="b-total"><span>${c.its.length} things from local makers</span><b>${money(c.t)}</b></p>
   <div class="f-acts"><button type="button" class="btn" data-wrap>Wrap it &rarr;</button>${bundles.length>1?'<button type="button" class="btn ghost" data-swap>Show me another</button>':''}<button type="button" class="f-link" data-again>Start over</button></div>`;
  $('[data-wrap]',body).onclick=()=>{wrapStep();focusHead();};
  const sw=$('[data-swap]',body);if(sw)sw.onclick=()=>{bi=(bi+1)%Math.min(bundles.length,5);show();focusHead();};
  $('[data-again]',body).onclick=again;}

function again(){pick={};step=0;ask();focusHead();}

function pkgHTML(c){return`<div class="pkg paper-${wrap.paper}" style="--rib:${wrap.ribbon}" data-pkg>
   <div class="p-gifts">${c.its.map(it=>thumb(it,'p-ob')).join('')}</div>
   <div class="p-box"></div><div class="p-paper"></div><div class="p-flap l"></div><div class="p-flap r"></div>
   <div class="p-rib v"></div><div class="p-rib h"></div>
   <div class="p-bow"><i class="lp a"></i><i class="lp b"></i><i class="tl a"></i><i class="tl b"></i><i class="kn"></i></div>
   <div class="p-tag"><span class="str"></span><span class="card" data-tagtxt>${esc(wrap.msg)||'To you, from me'}</span></div></div>`;}

function wrapStep(){step=4;back.hidden=false;setStep('Wrap it · paper, ribbon, tag');const c=bundles[bi];
  body.innerHTML=`<h2 class="f-q" tabindex="-1">Wrap it</h2>
   <div class="stage">${pkgHTML(c)}</div>
   <div class="w-ctl">
    <fieldset><legend>Paper</legend><div class="sw">${PAPERS.map(([v,t])=>`<label class="sw-p paper-${v}"><input type="radio" name="paper" value="${v}"${wrap.paper===v?' checked':''}><span class="sr">${t}</span></label>`).join('')}</div><p class="sw-name" data-pname>${PAPERS.find(p=>p[0]===wrap.paper)[1]}</p></fieldset>
    <fieldset><legend>Ribbon</legend><div class="sw">${RIBBONS.map(([v,t])=>`<label class="sw-r" style="--c:${v}"><input type="radio" name="ribbon" value="${v}"${wrap.ribbon===v?' checked':''}><span class="sr">${t}</span></label>`).join('')}</div><p class="sw-name" data-rname>${RIBBONS.find(r=>r[0]===wrap.ribbon)[1]}</p></fieldset>
   </div>
   <label class="w-tag">The tag, in our handwriting<input maxlength="48" data-msg value="${esc(wrap.msg)}" placeholder="To you, from me"></label>
   <div class="f-acts"><button type="button" class="btn" data-go>Wrap it up</button></div>
   <p class="w-done" data-done role="status"></p>`;
  const pkg=$('[data-pkg]',body);
  $$('input[name=paper]',body).forEach(r=>r.addEventListener('change',()=>{wrap.paper=r.value;pkg.className=pkg.className.replace(/paper-\w+/,'paper-'+r.value);$('[data-pname]',body).textContent=PAPERS.find(p=>p[0]===r.value)[1];}));
  $$('input[name=ribbon]',body).forEach(r=>r.addEventListener('change',()=>{wrap.ribbon=r.value;pkg.style.setProperty('--rib',r.value);$('[data-rname]',body).textContent=RIBBONS.find(x=>x[0]===r.value)[1];}));
  $('[data-msg]',body).addEventListener('input',e=>{wrap.msg=e.target.value;$('[data-tagtxt]',body).textContent=wrap.msg||'To you, from me';});
  $('[data-go]',body).addEventListener('click',()=>play(pkg,c));}

function play(pkg,c){const go=$('[data-go]',body),done=$('[data-done]',body);
  pkg.classList.remove('s1','s2','s3','s4','s5','wrapped');void pkg.offsetWidth;done.innerHTML='';go.disabled=true;
  const fin=()=>{pkg.classList.add('wrapped');go.disabled=false;go.textContent='Wrap it again';
    done.innerHTML=`<b>Ready for pickup by 3 pm &middot; $4 wrap.</b><button type="button" class="btn" data-bag>Add to bag &middot; ${money(c.t+4)}</button>`;
    $('[data-bag]',done).onclick=e=>{c.its.forEach(it=>it.btn&&it.btn.click());const fee=$('#bg-cart [data-fee]');if(fee&&!fee.checked){fee.checked=true;fee.dispatchEvent(new Event('change',{bubbles:true}));}
      e.target.disabled=true;e.target.textContent='In your bag';window.bwToast&&bwToast('Bundle and gift wrap added to your bag');};};
  if(reduce){pkg.classList.add('s1','s2','s3','s4','s5');fin();return;}
  [['s1',60],['s2',650],['s3',1400],['s4',1900],['s5',2400]].forEach(([c,t])=>setTimeout(()=>pkg.classList.add(c),t));
  setTimeout(fin,3100);}

back.addEventListener('click',()=>{if(step===4){show();}else if(step===3){step=2;ask();}else if(step>0){step--;ask();}focusHead();});
ask();
})();
