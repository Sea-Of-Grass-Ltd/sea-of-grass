/* Cottontail Farm: the page follows the season. Summer is sunflower U-pick on August weekends, fall is the Harvest
   Festival (Sep 23 to Oct 31). In season the page opens on what's on; out of season it opens on the festival (the
   farm's big draw) rather than the resting field, and one line near the bottom shows the other seasons. What's open
   on the map is worked out from today's Colorado date. Tickets are timed entry with
   spots left and sold-out slots (demo data, the same for everyone). Nothing is sent. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const money=n=>'$'+(Number.isInteger(n)?n:n.toFixed(2));
const hash=s=>{let h=11;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;};

/* today in Colorado */
function today(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  const d=new Date(+p.year,+p.month-1,+p.day);return{d,y:+p.year,min:(+p.hour%24)*60+(+p.minute)};}
const T=today();
const ymd=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const fmtD=d=>d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const fmtT=m=>{let h=Math.floor(m/60),mm=m%60;const ap=h>=12?'pm':'am';h=h%12||12;return h+(mm?':'+String(mm).padStart(2,'0'):'')+' '+ap;};

/* when each season runs (this year, or next once it has passed) */
function window_(s,y){if(s==='summer')return[new Date(y,7,1),new Date(y,7,31)];if(s==='fall')return[new Date(y,8,23),new Date(y,9,31)];return null;}
function nextWindow(s){let w=window_(s,T.y);if(ymd(w[1])<ymd(T.d))w=window_(s,T.y+1);return w;}
function openDay(s,d){if(s==='summer')return d.getMonth()===7&&(d.getDay()===0||d.getDay()===6);if(s==='fall'){const v=ymd(d)%10000;return v>=923&&v<=1031;}return false;}
function hoursOf(s,d){if(s==='summer')return[8*60,19*60];if(s==='fall')return(d.getDay()>=1&&d.getDay()<=4)?[10*60,18*60]:[9*60,19*60];return null;}
function current(){const v=ymd(T.d)%10000;if(v>=801&&v<=831)return'summer';if(v>=901&&v<=1031)return'fall';return'off';}   // Sep 1-22: the festival is coming
const NOW=current();

const ATT={sunflowers:['Sunflower field','summer'],maze:['Corn maze','fall'],patch:['Pumpkin patch','fall'],hayride:['Hayride loop','fall'],barn:['Barn & farm stand','summer fall'],corral:['Bunny corral','fall'],food:['Food trucks','summer fall'],parking:['Parking','summer fall']};
const DESC=Object.fromEntries($$('.a-list li').map(li=>[li.dataset.att,$('small',li).textContent]));

const COPY={
 summer:{kick:'Sunflower U-pick · August weekends',h:'A field of<br>sunflowers.',lede:'We grow two acres of sunflowers taller than you are, and every ticket comes with five stems and a pair of clippers to borrow.',cta:'Get sunflower tickets'},
 fall:{kick:'Harvest Festival · Sep 23 to Oct 31',h:'Lost in the<br>maze yet?',lede:'Come get lost in eight acres of corn, pick a pumpkin off the vine, ride the hay wagon round the fields and warm up with a cider doughnut.',cta:'Get festival tickets'},
 off:{kick:'Off-season · the fields are resting',h:'See you in<br>August.',lede:'The sunflowers go in the ground in May and bloom the first weekend of August, and we’ll email you the morning tickets go on sale.',cta:'Join the mailing list'}};

let shown=NOW==='off'?'fall':NOW;
const NAME={summer:'in summer',fall:'at the festival',off:'in the off-season'};
function daysUntil(d){return Math.round((d-T.d)/86400000);}
function statusFor(key,s){const[name,ss]=ATT[key];
  if(!ss.split(' ').includes(s))return{t:s==='off'?'Closed for the season':'Not this season',c:'no'};
  if(s==='off')return{t:'Closed for the season',c:'no'};
  if(s!==NOW||s==='fall'&&ymd(T.d)%10000<923){const w=nextWindow(s);return{t:'From '+MON[w[0].getMonth()]+' '+w[0].getDate(),c:'soon'};}
  if(!openDay(s,T.d)){let d=T.d;for(let k=1;k<10;k++){d=add(T.d,k);if(openDay(s,d))break;}return{t:'Next open '+fmtD(d),c:'soon'};}
  const H=hoursOf(s,T.d);
  if(T.min<H[0])return{t:'Opens '+fmtT(H[0]),c:'soon'};if(T.min>=H[1])return{t:'Closed for today',c:'no'};
  return{t:'Open till '+fmtT(H[1]),c:'open'};}

function drawSeason(){document.body.dataset.season=shown;const C=COPY[shown];
  $('[data-s-kick]').textContent=C.kick;$('[data-s-h]').innerHTML=C.h;$('[data-s-lede]').textContent=C.lede;
  $('[data-s-acts]').innerHTML=`<a class="btn" href="#tickets">${C.cta}</a>`;
  // the one line that shows the other seasons (a demo control, so it lives near the bottom, not in the header)
  const real=NOW==='off'?'It’s the off-season at the farm right now':NOW==='summer'?'It’s sunflower season at the farm right now':'It’s festival season at the farm right now';
  $('[data-season-note]').textContent=shown===NOW?`${real}, and this is the page as it looks today.`:shown==='fall'&&NOW==='off'?`${real}, so the page is showing the festival as it looks in October.`:`You’re looking at the page as it looks ${NAME[shown]}.`;
  $('[data-season-btns]').innerHTML=['summer','fall','off'].filter(k=>k!==shown).map(k=>`<button type="button" class="seas-btn" data-show-season="${k}">See it ${NAME[k]}</button>`).join('');
  $$('[data-show-season]').forEach(b=>b.onclick=()=>{shown=b.dataset.showSeason;drawSeason();$('[data-season-btns] button')?.focus({preventScroll:true});});
  drawMap();drawTickets();}

/* ---- map ---- */
const card=$('[data-mcard]');let openKey=null;
function drawMap(){$$('.pin').forEach(p=>{const st=statusFor(p.dataset.att,shown);p.dataset.st=st.c;});
  $$('.a-list li').forEach(li=>{const st=statusFor(li.dataset.att,shown);li.dataset.st=st.c;$('[data-astat]',li).textContent=st.t;});
  if(openKey)showCard(openKey);}
function showCard(k){openKey=k;const st=statusFor(k,shown),pin=$(`.pin[data-att="${k}"]`);
  card.innerHTML=`<button type="button" class="mc-x" aria-label="Close">&times;</button><b>${ATT[k][0]}</b><p>${DESC[k]}</p><span class="mc-st st-${st.c}">${st.t}</span>`;
  card.hidden=false;const x=parseFloat(pin.style.left),y=parseFloat(pin.style.top);
  card.style.left=Math.min(Math.max(x,18),72)+'%';card.style.top=(y>55?y-4:y+6)+'%';card.classList.toggle('up',y>55);
  $('.mc-x',card).onclick=()=>{card.hidden=true;openKey=null;$$('.pin,.a-item').forEach(p=>p.setAttribute('aria-pressed','false'));pin.focus();};
  $$('.pin,.a-item').forEach(p=>p.setAttribute('aria-pressed',String(p.dataset.att===k)));}
$$('.pin,.a-item').forEach(b=>b.addEventListener('click',()=>{showCard(b.dataset.att);if(b.classList.contains('a-item')&&matchMedia('(max-width:860px)').matches)$('[data-map]').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!card.hidden){card.hidden=true;openKey=null;}});

/* ---- tickets ---- */
const PRICES={summer:[['adult','Adults',12,'13 and up · five stems each'],['kid','Kids',8,'3 to 12 · two stems each'],['tot','Under 3',0,'Free']],
 fall:[['adult','Adults',18,'13 and up'],['kid','Kids',14,'3 to 12 · a small pumpkin each'],['tot','Under 3',0,'Free']]};
const CAP={summer:40,fall:120};
const tix=$('[data-tix]'),off=$('[data-tix-off]'),tdays=$('[data-tdays]'),tslots=$('[data-tslots]'),heads=$('[data-heads]'),tsum=$('[data-tsum]'),ttot=$('[data-ttotal]'),tbuy=$('[data-tbuy]'),tdone=$('[data-tdone]');
let tk={s:null,day:null,slot:null,n:{adult:2,kid:1,tot:0}};
function slotsOf(s,d){const H=hoursOf(s,d),out=[];const step=s==='summer'?60:30;
  for(let m=H[0];m<=H[1]-(s==='summer'?60:90);m+=step){const key=ymd(d)+'-'+m+s;const wkend=d.getDay()===0||d.getDay()===6,busy=wkend?1:.5;
    const groups=s==='fall'&&!wkend&&m<12*60;const taken=groups?CAP[s]:Math.floor((hash(key)%1000)/1000*CAP[s]*busy*.7+(m>=H[0]+120&&m<=H[0]+300?CAP[s]*(wkend?.45:.3):0));const left=Math.max(0,CAP[s]-taken);
    const past=ymd(d)===ymd(T.d)&&m<=T.min;out.push({m,left,past,groups});}
  return out;}
function drawTickets(){const s=shown;tdone.innerHTML='';tdone.classList.remove('on');
  if(s==='off'){tix.hidden=true;off.hidden=false;$('[data-tix-sub]').textContent='Tickets are off sale while the fields rest over the winter.';return;}
  tix.hidden=false;off.hidden=true;
  const w=nextWindow(s);$('[data-tix-sub]').textContent=s==='summer'?'Sunflower U-pick runs on August weekends with entry every hour, and you can stay as long as you like.':'Festival entry is every 30 minutes from Sep 23 to Oct 31, and weekends sell out first.';
  if(tk.s!==s){tk={s,day:null,slot:null,n:{adult:2,kid:1,tot:0}};}
  tdays.innerHTML='';let d=ymd(w[0])<ymd(T.d)?new Date(T.d):new Date(w[0]),count=0,first=null;
  while(ymd(d)<=ymd(w[1])&&count<12){if(openDay(s,d)){const all=slotsOf(s,d),free=all.filter(x=>x.left>0&&!x.past).length;
      const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','false');const dd=new Date(d);
      b.innerHTML=`<span>${dd.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${dd.getDate()}</b><span>${MON[dd.getMonth()]}</span><i>${free?(free<4?'Few left':'Open'):'Sold out'}</i>`;
      b.disabled=!free;if(!free)b.classList.add('sold');b.setAttribute('aria-label',dd.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+(free?'':', sold out'));
      b.onclick=()=>{$$('button',tdays).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));tk.day=dd;tk.slot=null;drawSlots();sumT();};
      tdays.appendChild(b);if(free&&!first)first=b;count++;}
    d=add(d,1);}
  drawHeads();if(first)first.click();}
function drawSlots(){tslots.innerHTML='';slotsOf(tk.s,tk.day).forEach(x=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','false');
  const need=tk.n.adult+tk.n.kid+tk.n.tot;const sold=x.left===0,short=x.left<need;
  b.innerHTML=`<b>${fmtT(x.m)}</b><span>${x.past?'Past':x.groups?'Field trips':sold?'Sold out':x.left<15?x.left+' left':'Open'}</span>`;
  b.disabled=x.past||sold||short;if(sold)b.classList.add('sold');if(!sold&&x.left<15)b.classList.add('few');
  b.onclick=()=>{$$('button',tslots).forEach(y=>y.setAttribute('aria-pressed',String(y===b)));tk.slot=x;sumT();};tslots.appendChild(b);});}
function drawHeads(){heads.innerHTML='';PRICES[tk.s].forEach(([k,n,p,sub])=>{const row=document.createElement('div');row.className='hrow';row.dataset.item=k;
  row.innerHTML=`<div><b>${n}</b><small>${sub}</small></div><span class="hp">${p?money(p):'Free'}</span><div class="step" role="group" aria-label="${n}"><button type="button" aria-label="One fewer ${n}">−</button><output aria-live="polite">${tk.n[k]}</output><button type="button" aria-label="One more ${n}">+</button></div>`;
  const[m,pl]=$$('button',row);m.onclick=()=>{tk.n[k]=Math.max(0,tk.n[k]-1);$('output',row).textContent=tk.n[k];if(tk.day)drawSlots();tk.slot=null;sumT();};
  pl.onclick=()=>{tk.n[k]=Math.min(12,tk.n[k]+1);$('output',row).textContent=tk.n[k];if(tk.day)drawSlots();tk.slot=null;sumT();};heads.appendChild(row);});}
function totalT(){return PRICES[tk.s].reduce((a,[k,n,p])=>a+p*tk.n[k],0);}
function sumT(){const n=tk.n.adult+tk.n.kid+tk.n.tot,t=totalT();ttot.textContent=money(t);
  const ok=tk.day&&tk.slot&&n>0&&(tk.n.adult+tk.n.kid)>0;tbuy.disabled=!ok;
  tsum.innerHTML=ok?`<b>${fmtD(tk.day)}, ${fmtT(tk.slot.m)} entry</b> · ${n} ${n===1?'person':'people'}`:(tk.day?'Now pick an entry time for your group.':'Pick a day and a time to begin.');}
tbuy.addEventListener('click',()=>{const ref='CT-'+(1000+Math.floor(Math.random()*9000));
  tdone.innerHTML=`<b>We’re holding these for 10 minutes.</b><span style="display:block">${fmtD(tk.day)} at ${fmtT(tk.slot.m)} · ${tk.n.adult} adult${tk.n.adult===1?'':'s'}, ${tk.n.kid} kid${tk.n.kid===1?'':'s'}${tk.n.tot?`, ${tk.n.tot} under 3`:''} · ${money(totalT())}</span><span class="note" style="display:block;margin-top:6px">Your booking reference is ${ref}. This is a demo, so nothing was charged; on your site this opens your ticketing checkout.</span>`;
  tdone.classList.add('on');tbuy.disabled=true;});

/* field-trip dates: weekdays in the festival only */
const gd=$('[data-grpdate]');if(gd){const w=nextWindow('fall');gd.min=w[0].toISOString().slice(0,10);gd.max=w[1].toISOString().slice(0,10);}

drawSeason();
})();
