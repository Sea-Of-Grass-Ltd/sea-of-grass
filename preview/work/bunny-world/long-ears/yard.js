/* Long Ears: the August Test (your yard as lawn vs water-wise, month by month), a rebate check that hands to a
   pre-filled quote, and the sprinkler blowout / start-up route booker. All figures are demo estimates from typical
   Front Range numbers; nothing is sent. */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON=MONTHS.map(m=>m.slice(0,3));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const money=n=>'$'+Math.round(n).toLocaleString('en-US');

/* ---- the August Test ---- */
// share of the yearly irrigation need that falls in each month (Jan..Dec)
const TURF_M=[0,0,0,.04,.14,.2,.24,.22,.12,.04,0,0], WW_M=[0,0,0,.02,.12,.2,.24,.22,.14,.06,0,0];
const TURF_GAL=18, WW_GAL=4, PRICE=7.5/1000, MOW_VISIT=45;
const MOWS=[0,0,0,2,4.3,4.3,4.3,4.3,4.3,2,0,0];          // visits a month on a lawn
const WW_UPKEEP=[0,0,.5,1,1,1,1,1,1,1,.5,0];               // hours of weeding and tidying on a water-wise yard
const NOW={turf:{name:'Lawn',w:1,m:1},patchy:{name:'Patchy lawn',w:.8,m:.8},dirt:{name:'New lawn (sod)',w:1.15,m:1}};
const LOOK_T=['Dormant, tan','Dormant, tan','Greening slowly','Green, first mow','Lush, mow weekly','Lush if watered daily','Stressed: brown edges','Brown unless watered daily','Recovering, still thirsty','Last mow, going tan','Dormant','Dormant, tan'];
const LOOK_W=['Gold seed heads in the snow','Gold and silver','Sage waking up','First green on the grasses','Penstemon flowering','Blue grama in bloom','Rabbitbrush budding','Gold and green, no stress','Rabbitbrush in full yellow','Grasses turning copper','Copper and gold','Gold seed heads'];
const NOTE=['January: nothing needs water; the water-wise yard still has winter structure.','February: both rest. Snow does the watering.','March: the lawn starts asking for water before it looks green.','April: the first mow, and the first sprinkler start-up.','May: lawns drink twice what the native grasses do.','June: watering days get restricted in a dry year.','July: peak heat. The lawn takes most of your summer water bill.','August: the test. The lawn browns in the heat or drinks every day; the water-wise yard looks its best.','September: the lawn is still thirsty; rabbitbrush turns the native yard yellow.','October: the last mow, then the blowout.','November: both go dormant. Time to book the blowout.','December: rest. Plan next year’s yard.'];
const size=$('[data-size]'),month=$('[data-month]'),turfFig=$('[data-turf]');
const st={size:2500,now:'turf',m:7};
function calc(m){const N=NOW[st.now],a=st.size;
  const gt=a*TURF_GAL*N.w*TURF_M[m],gw=a*WW_GAL*WW_M[m];
  const visits=MOWS[m]*N.m,mowH=visits*(a/1000)*.5,wwH=WW_UPKEEP[m]*(a/2500);
  return{gt,gw,bt:gt*PRICE,bw:gw*PRICE,mowH,wwH,visits};}
function year(){let g=0,b=0,h=0,mow=0;for(let m=0;m<12;m++){const c=calc(m);g+=c.gt-c.gw;b+=c.bt-c.bw;h+=c.mowH-c.wwH;mow+=c.visits*MOW_VISIT;}return{g,b,h,mow};}
function draw(){const m=st.m,c=calc(m),N=NOW[st.now];
  $('[data-size-out]').textContent=fmt(st.size)+' sq ft';$('[data-month-out]').textContent=MONTHS[m];
  $('[data-g-turf]').textContent=c.gt?fmt(c.gt)+' gal':'none';$('[data-g-ww]').textContent=c.gw?fmt(c.gw)+' gal':'none';
  $('[data-b-turf]').textContent=c.bt>=1?money(c.bt):'$0';$('[data-b-ww]').textContent=c.bw>=1?money(c.bw):'$0';
  $('[data-h-turf]').textContent=c.mowH?`${c.mowH.toFixed(1)} hrs mowing`:'none';$('[data-h-ww]').textContent=c.wwH?`${c.wwH.toFixed(1)} hrs tidying`:'none';
  $('[data-turf-name]').textContent=N.name;$('[data-turf-look]').textContent=LOOK_T[m];$('[data-ww-look]').textContent=LOOK_W[m];
  $('[data-note]').textContent=NOTE[m];
  // the lawn browns with summer stress and goes tan when dormant; the water-wise yard stays steady
  const stress=[.8,.8,.55,.15,0,.15,.55,1,.5,.45,.8,.8][m];
  turfFig.style.setProperty('--sep',(stress*.85).toFixed(2));turfFig.style.setProperty('--sat',(1-stress*.55).toFixed(2));turfFig.style.setProperty('--hue',(-stress*28).toFixed(0)+'deg');
  turfFig.classList.toggle('hot',m===7);
  const y=year();
  $('[data-year]').innerHTML=`Switching this yard saves about <b>${fmt(y.g)} gallons</b> and <b>${money(y.b)}</b> in water a year, plus <b>${fmt(y.h)} hours</b> of mowing (or about <b>${money(y.mow)}</b> if you pay someone).`;
  reb();}
size.addEventListener('input',()=>{st.size=+size.value;draw();});
month.addEventListener('input',()=>{st.m=+month.value;draw();});
$$('input[name=now]').forEach(r=>r.addEventListener('change',()=>{st.now=r.value;draw();}));
$$('.t-ticks span').forEach((t,i)=>{t.addEventListener('click',()=>{month.value=i;st.m=i;draw();});});

/* ---- rebate check ---- */
const REB={'80513':['Berthoud',.75,1500],'80537':['Loveland',1,3000],'80538':['Loveland',1,3000],'80501':['Longmont',1,2500],'80503':['Longmont',1,2500],'80504':['Longmont',1,2500],'80525':['Fort Collins',1,3000],'80526':['Fort Collins',1,3000],'80528':['Fort Collins',1,3000],'80550':['Windsor',.5,1000],'80534':['Johnstown',.5,1000],'80542':['Mead',.5,1000]};
const rebOut=$('[data-reb-out]'),zipIn=$('#t-zip');let rebate=null;
function reb(){if(!rebate)return;const[city,per,cap]=rebate,cost=st.size*6,r=Math.min(cap,st.size*per);
  rebOut.innerHTML=`<b>${city}:</b> a turf-replacement rebate of about ${money(per*1).replace('$1','$1.00')}${per<1?'':''} a square foot, up to ${money(cap)}. For ${fmt(st.size)} sq ft that&rsquo;s about <b>${money(r)}</b> off a switch costing around ${money(cost)}, so roughly <b>${money(cost-r)}</b> after the rebate.`;}
$('[data-reb]').addEventListener('submit',e=>{e.preventDefault();const z=zipIn.value.trim();
  if(!/^\d{5}$/.test(z)){rebate=null;rebOut.textContent='Enter a five-digit zip code.';return;}
  rebate=REB[z]||null;if(!rebate){rebOut.textContent='We don’t have a rebate on file for that zip. Your water provider may still offer one; we’ll check when we quote.';return;}reb();});
/* hand the numbers to the quote form */
$('[data-toquote]').addEventListener('click',()=>{const y=year();
  $('[data-q-job]').value='Xeriscape or new landscape';$('[data-q-size]').value=st.size;
  const cost=st.size*6;$('[data-q-budget]').value=cost<2000?'Under $2,000':cost<10000?'$2,000 – $10,000':cost<25000?'$10,000 – $25,000':'Over $25,000';
  const ft=$('[data-fromtest]');ft.hidden=false;
  ft.innerHTML=`<b>From your August Test:</b> ${fmt(st.size)} sq ft of ${NOW[st.now].name.toLowerCase()}, about ${fmt(y.g)} gallons a year to save${rebate?`, ${rebate[0]} rebate`:''}. We&rsquo;ll start from these.`;
  $('[data-q-notes]').value=`August Test: ${fmt(st.size)} sq ft, ${NOW[st.now].name.toLowerCase()} now${rebate?', zip '+zipIn.value.trim():''}.`;});
draw();

/* ---- blowout / start-up route booker ---- */
const AREAS=$$('[data-b-area] option').map(o=>o.textContent);
const CREW=[[2,4],[1,3],[2,5],[1,4],[3],[2],[1,5]];        // weekdays the crew is already in each area (1 = Mon)
const DAYN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WINS=[['8 to 11 am',8],['11 am to 2 pm',11],['2 to 5 pm',14]];
const PRICE_B=95,OFF=15;
function today(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return new Date(+p.year,+p.month-1,+p.day);}
const T=today();
function season(){const m=T.getMonth(),d=T.getDate(),y=T.getFullYear();
  if((m===8&&d>=15)||m===9||m===10)return{k:'blowout',name:'blowout',from:new Date(Math.max(T,new Date(y,8,22))),to:new Date(y,10,30)};
  if(m>=2&&m<=4)return{k:'startup',name:'spring start-up',from:new Date(Math.max(T,new Date(y,3,1))),to:new Date(y,4,31)};
  const ny=m>=11?y+1:y;return{k:'startup',name:'spring start-up',from:new Date(ny,3,1),to:new Date(ny,4,31),early:true};}
const S=season();
const hash=s=>{let h=13;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;};
const areaSel=$('[data-b-area]'),daysEl=$('[data-b-days]'),winsEl=$('[data-b-wins]'),sumEl=$('[data-b-sum]'),pick=$('[data-b-pick]');
let bk={day:null,win:null};
$('[data-b-kick]').textContent=S.k==='blowout'?'Fall sprinkler blowouts':'Spring sprinkler start-ups';
$('[data-b-h]').textContent=S.k==='blowout'?'Book your blowout':'Book your spring start-up';
$('[data-b-sub]').textContent=(S.k==='blowout'?'Compressed air through every zone before the first hard freeze, so nothing cracks. ':'We turn the water on, check every head and set the timer for the season. ')+`$${PRICE_B}, or $${PRICE_B-OFF} on a day our crew is already on your street.`+(S.early?` Booking opens now for April.`:'');
const crewText=i=>CREW[i].map(d=>DAYN[d]+'s').join(' and ');
$('[data-ann]').innerHTML=S.k==='blowout'?`Fall blowouts are booking &middot; crews in Berthoud on ${crewText(0)} &middot; book before the first hard freeze`:`Spring start-ups book from April &middot; crews in Berthoud on ${crewText(0)}`;
function drawDays(){const a=+areaSel.value;daysEl.innerHTML='';bk={day:null,win:null};pick.value='';
  $('[data-b-crew]').innerHTML=`Our crew is in <b>${AREAS[a]}</b> on <b>${crewText(a)}</b>: $${OFF} off those days.`;
  let d=new Date(S.from),n=0,first=null;if(+d===+T)d.setDate(d.getDate()+1);
  while(d<=S.to&&n<10){const wd=d.getDay();if(wd>=1&&wd<=5){const dd=new Date(d),crew=CREW[a].includes(wd);
      const free=WINS.filter((w,i)=>hash(dd.toDateString()+a+i)%4!==0).length;
      const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','false');b.disabled=!free;if(crew)b.classList.add('crew');if(!free)b.classList.add('full');
      b.innerHTML=`<span>${MON[dd.getMonth()]} ${dd.getDate()}</span><b>${DAYN[wd].slice(0,3)}</b><i>${!free?'Full':crew?`Crew day · $${PRICE_B-OFF}`:`$${PRICE_B}`}</i>`;
      b.setAttribute('aria-label',`${DAYN[wd]}, ${MONTHS[dd.getMonth()]} ${dd.getDate()}${!free?', full':crew?', crew is nearby, $'+(PRICE_B-OFF):''}`);
      b.onclick=()=>{$$('button',daysEl).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));bk.day={d:dd,crew};bk.win=null;drawWins();sum();};
      daysEl.appendChild(b);if(free&&!first)first=crew?b:first||b;if(crew&&free&&first&&!first.classList.contains('crew'))first=b;n++;}
    d.setDate(d.getDate()+1);}
  if(!n)daysEl.innerHTML='<p class="note">No days left this season. Call us and we’ll squeeze you in.</p>';
  winsEl.innerHTML='';if(first)first.click();sum();}
function drawWins(){winsEl.innerHTML='';const a=+areaSel.value;WINS.forEach(([t],i)=>{const full=hash(bk.day.d.toDateString()+a+i)%4===0;
  const b=document.createElement('button');b.type='button';b.textContent=full?`${t} · full`:t;b.disabled=full;b.setAttribute('aria-pressed','false');if(full)b.classList.add('full');
  b.onclick=()=>{$$('button',winsEl).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));bk.win=t;sum();};winsEl.appendChild(b);});}
function sum(){if(bk.day&&bk.win){const p=PRICE_B-(bk.day.crew?OFF:0);const s=`${S.name[0].toUpperCase()+S.name.slice(1)}, ${DAYN[bk.day.d.getDay()]} ${MON[bk.day.d.getMonth()]} ${bk.day.d.getDate()}, ${bk.win}, $${p}${bk.day.crew?' (crew day)':''}`;
    sumEl.innerHTML=`<b>${s}</b>`;pick.value=s;}else{sumEl.textContent=bk.day?'Now pick a window.':'Pick a day and a window.';pick.value='';}}
areaSel.addEventListener('change',drawDays);drawDays();
})();
