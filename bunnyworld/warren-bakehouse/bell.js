/* The Warren Bakehouse: one quiet line under the headline saying when the next bread comes out.
   Worked out once from Colorado time when the page loads. It doesn't tick: the bakery's hours are the news, not a countdown. */
(function(){
const el=document.querySelector('[data-next]');if(!el)return;
const BELL=6*60+30;                                   // 6:30 am, in minutes
const CLOSE={0:13*60,2:14*60,3:14*60,4:14*60,5:14*60,6:14*60};   // closed Monday (1)
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'short',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),min=(+p.hour%24)*60+(+p.minute);
const shut=m=>{const h=Math.floor(m/60);return(h>12?h-12:h)+' pm';};
if(day in CLOSE&&min<BELL){el.textContent='This morning’s bread comes out at 6:30.';return;}
if(day in CLOSE&&min<CLOSE[day]){el.textContent=`The bread came out at 6:30 this morning, and we’re open until ${shut(CLOSE[day])}.`;return;}
for(let k=1;k<8;k++){const d=(day+k)%7;if(d in CLOSE){el.textContent=`We’re closed now. The next bread comes out ${k===1?'tomorrow':'on '+DAYS[d]} at 6:30 am.`;return;}}
})();
