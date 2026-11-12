/* Dusk's spotlight: one warm pool of light falls from above onto the meadow (after Format's stage, Refero).
   The pointer leads it across the stage and it follows slowly, like a follow-spot; the pieces in the pool are lit
   amber (field-shapes.js reads window.sogSpot), the rest stay silhouettes. Dusk only. */
(function(){
const SEC=document.getElementById('opening');if(!SEC)return;
const on=()=>document.documentElement.dataset.theme==='dusk'&&!document.documentElement.hasAttribute('data-scheme');
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=SEC.clientWidth||innerWidth,sx=W*.5,tx=sx,run=false;
// the light's hue drifts slowly round a warm-to-cool loop: amber, rose, violet, dusk blue, and back (one turn a minute)
const HUES=[[242,190,104],[236,128,104],[176,120,214],[98,140,226],[242,190,104]];let tint=HUES[0].slice(),lastWake=0;
function hue(now){const u=(now/60000)%1*(HUES.length-1),i=Math.floor(u),f=u-i,s=f*f*(3-2*f);tint=HUES[i].map((v,j)=>v+(HUES[i+1][j]-v)*s);}
function put(){W=SEC.clientWidth||innerWidth;const r=Math.max(160,W*.2);window.sogSpot={x:sx,r,k:1,tint};SEC.style.setProperty('--spot',tint.map(v=>v|0).join(','));SEC.style.setProperty('--sx',sx+'px');SEC.style.setProperty('--sr',r+'px');}
function step(){const d=tx-sx;sx+=d*.06;put();const o=window.sogOpening;if(o&&o.wake)o.wake();if(Math.abs(d)>.5&&on())requestAnimationFrame(step);else run=false;}
function go(){if(still){sx=tx;put();return;}if(!run){run=true;requestAnimationFrame(step);}}
addEventListener('pointermove',e=>{if(!on())return;const r=SEC.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)return;tx=e.clientX-r.left;go();},{passive:true});   // the titles sit in a layer above the stage, so listen on the page
document.documentElement.addEventListener('pointerleave',()=>{if(!on())return;tx=W*.5;go();});
addEventListener('resize',()=>{tx=sx=(SEC.clientWidth||innerWidth)*.5;put();});
document.addEventListener('sog-theme',()=>{if(on()){tx=sx=(SEC.clientWidth||innerWidth)*.5;put();}});
function drift(now){if(on()&&!still){const b=SEC.getBoundingClientRect();if(b.bottom>0&&b.top<innerHeight){hue(now);if(!run)put();else window.sogSpot.tint=tint;if(now-lastWake>120){lastWake=now;const o=window.sogOpening;if(o&&o.wake)o.wake();}}}requestAnimationFrame(drift);}
requestAnimationFrame(drift);
put();
})();
