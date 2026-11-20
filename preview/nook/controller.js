(function(){const d=document.querySelector('main.cb .cbx'),st=document.querySelector('main.cb .cbx-stage');if(!d||!st)return;
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const SETS={mode:[['syne','Syne'],['bricolage','Bricolage'],['caps','Syne caps']],shape:[['open','Open'],['card','Card'],['round','Round'],['cut','Cut']],
  color:[['night','Night'],['moss','Moss'],['plum','Plum'],['dawn','Dawn']],fx:[['off','Off'],['grass','Grass'],['stars','Stars']]};
const KEY={mode:'mode',shape:'shape',color:'color',fx:'fx'},at={mode:0,shape:0,color:0,fx:0};
const tabs=[...d.querySelectorAll('.vzd-tabs button')],ps=[...d.querySelectorAll('.vzd-p')];
tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.setAttribute('aria-selected',String(x===t)));ps.forEach(p=>p.hidden=p.dataset.p!==t.dataset.tab);}));
function set(k,i){const L=SETS[k];i=(i+L.length)%L.length;at[k]=i;st.dataset[KEY[k]]=L[i][0];const p=d.querySelector(`.vzd-p[data-p="${k}"]`);p.querySelector('b').textContent=L[i][1];p.querySelector('small').textContent=`${i+1} of ${L.length}`;if(k==='fx')stars();}
ps.forEach(p=>p.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>set(p.dataset.p,at[p.dataset.p]+(+b.dataset.step)))));
d.querySelector('.cbx-reset').addEventListener('click',()=>{for(const k in SETS)set(k,0);});
// his stars in the strip: the inked six-point and painted five-point, cream with an orange one now and then; they twinkle unless motion is reduced
const cv=st.querySelector('.cbx-stars'),x=cv.getContext('2d');let S=[],run=false,t0=0;
function starR(th,tips){for(let i=0;i<tips.length;i++){let[a,L]=tips[i],[a2,L2]=tips[(i+1)%tips.length];a*=Math.PI/180;let b=a2*Math.PI/180;if(b<=a)b+=2*Math.PI;let t=th;while(t<a)t+=2*Math.PI;while(t>=a+2*Math.PI)t-=2*Math.PI;
  if(t<=b){const u=(t-a)/(b-a),ri=.2;if(u<.5){const k=u/.5;return L+(ri-L)*(1-Math.pow(1-k,2.2));}const k=(1-u)/.5;return L2+(ri-L2)*(1-Math.pow(1-k,2.2));}}return .2;}
const six=[[-90,1],[-30,.6],[30,.6],[90,1],[150,.6],[210,.6]],five=[0,1,2,3,4].map(i=>[-90+72*i,.95]),NP=48,R6=[],R5=[];
for(let i=0;i<NP;i++){const th=2*Math.PI*i/NP-Math.PI/2;R6.push(starR(th,six));R5.push(starR(th,five));}
function lay(){const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);
  let s=11;const rnd=()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;},n=Math.round(r.width/34);S=[];for(let i=0;i<n;i++)S.push({x:(i+.2+rnd()*.6)/n,y:.15+rnd()*.7,z:5+rnd()*rnd()*9,k:rnd()<.5?6:5,o:rnd()<.06,a:rnd()*6,ph:rnd()*6.3});draw(0);}
function draw(t){const w=cv.width,h=cv.height,dpr=w/Math.max(1,cv.getBoundingClientRect().width);x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,w,h);
  for(const p of S){const R=p.k===6?R6:R5,z=p.z*dpr;x.globalAlpha=still?1:.55+.45*Math.sin(t*1.6+p.ph)**2;x.setTransform(z,0,0,z,p.x*w,p.y*h);x.fillStyle=p.o?'#E8913A':'#F1E8D2';x.beginPath();
    for(let i=0;i<NP;i++){const th=2*Math.PI*i/NP-Math.PI/2+p.a,r=R[i];i?x.lineTo(Math.cos(th)*r,Math.sin(th)*r):x.moveTo(Math.cos(th)*r,Math.sin(th)*r);}x.closePath();x.fill();}x.globalAlpha=1;}
let vis=false;new IntersectionObserver(es=>{vis=es[0].isIntersecting;stars();}).observe(cv);
function stars(){const on=st.dataset.fx==='stars';if(on&&!S.length)lay();if(on&&!still&&vis&&!run){run=true;t0=performance.now();requestAnimationFrame(tick);}if(on&&still)draw(0);}
function tick(now){if(st.dataset.fx!=='stars'||!vis){run=false;return;}draw((now-t0)/1000);requestAnimationFrame(tick);}
addEventListener('resize',()=>{if(S.length){S=[];stars();}});
window.sogCbx={state:()=>({...st.dataset}),starsMoving:()=>run};
})();
