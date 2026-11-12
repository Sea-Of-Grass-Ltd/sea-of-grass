/* Dusk's spotlight: one warm pool of light falls from above onto the meadow (after Format's stage, Refero).
   The pointer leads it across the stage and it follows slowly, like a follow-spot; the pieces in the pool are lit
   amber (field-shapes.js reads window.sogSpot), the rest stay silhouettes. Dusk only. */
(function(){
const SEC=document.getElementById('opening');if(!SEC)return;
const on=()=>document.documentElement.dataset.theme==='dusk'&&!document.documentElement.hasAttribute('data-scheme');
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=SEC.clientWidth||innerWidth,sx=W*.5,tx=sx,run=false;
function put(){W=SEC.clientWidth||innerWidth;const r=Math.max(160,W*.2);window.sogSpot={x:sx,r,k:1};SEC.style.setProperty('--sx',sx+'px');SEC.style.setProperty('--sr',r+'px');const o=window.sogOpening;if(o&&o.wake)o.wake();}
function step(){const d=tx-sx;sx+=d*.06;put();if(Math.abs(d)>.5&&on())requestAnimationFrame(step);else run=false;}
function go(){if(still){sx=tx;put();return;}if(!run){run=true;requestAnimationFrame(step);}}
addEventListener('pointermove',e=>{if(!on())return;const r=SEC.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)return;tx=e.clientX-r.left;go();},{passive:true});   // the titles sit in a layer above the stage, so listen on the page
document.documentElement.addEventListener('pointerleave',()=>{if(!on())return;tx=W*.5;go();});
addEventListener('resize',()=>{tx=sx=(SEC.clientWidth||innerWidth)*.5;put();});
document.addEventListener('sog-theme',()=>{if(on()){tx=sx=(SEC.clientWidth||innerWidth)*.5;put();}});
put();
})();
