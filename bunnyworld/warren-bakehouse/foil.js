/* Gold-foil sheen: a glint slides across every .foil element as you scroll, and as you tilt a phone (where the browser
   allows it without asking). Reduced motion keeps the foil still. */
(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const r=document.documentElement;let s=0,t=0,cur=0,raf=0;
const set=()=>{raf=0;const want=(s*.06+t)%200;cur+=(want-cur)*.18;if(Math.abs(want-cur)>.05)raf=requestAnimationFrame(set);r.style.setProperty('--fx',cur.toFixed(2)+'%');};
const kick=()=>{if(!raf)raf=requestAnimationFrame(set);};
addEventListener('scroll',()=>{s=scrollY;kick();},{passive:true});
addEventListener('deviceorientation',e=>{if(e.gamma==null)return;t=(e.gamma+45)*1.1;kick();},{passive:true});
s=scrollY;kick();})();
