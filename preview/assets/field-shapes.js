/* Field shapes: what each style's "grass" is made of. The same grains, the same physics and the same harmonies (meadow,
   grid, S, visualizer, the falling close); only the piece changes. Dew keeps its blades (drawn by the page's own meadowDraw).
   Ledger: circles, a halftone of dots and rings with the red as its flowers. Ember: Colorado wildflowers as flat poster
   cutouts (columbine, paintbrush, blanket flower, flax). Clay: an engraving of leaves, sprouts and stippled pods. Dusk: a silver bead field.
   window.sogShapes.kind() names the current style's piece ('grass' means: use the blades). */
(()=>{
const KIND={simple:'circles',brutal:'y2k',neu:'pebbles',dusk:'stars'};
function kind(){const h=document.documentElement;if(h.hasAttribute('data-scheme'))return'grass';return KIND[h.dataset.theme]||'grass';}
const hsh=i=>((i*2654435761)>>>0)/4294967296;
function rgb(col){col=(col||'').trim();const m=/^#([0-9a-f]{6})$/i.exec(col);if(m)return[1,3,5].map(j=>parseInt(col.slice(j,j+2),16));const n=col.match(/\d+(\.\d+)?/g);return n?[+n[0],+n[1],+n[2]]:[120,120,120];}
function tone(col,k){const [r,g,b]=rgb(col);return k>0?`rgb(${r+(255-r)*k|0},${g+(255-g)*k|0},${b+(255-b)*k|0})`:`rgb(${r*(1+k)|0},${g*(1+k)|0},${b*(1+k)|0})`;}
// one path per colour: thousands of pieces, a handful of fills
function batch(c,g,cols,pick,shape,fill,stroke,lw){const N=cols.length;
  for(let q=0;q<N;q++){c.beginPath();let any=false;for(let i=0;i<g.n;i++){if(pick(i)!==q)continue;shape(c,g,i);any=true;}
    if(!any)continue;if(fill){c.fillStyle=cols[q];c.fill();}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke===true?cols[q]:stroke;c.stroke();}}}
function circles(c,g,COL,FL){ // Ledger (Refero: The New Yorker + V–A–C): an annotated index in ink. Open rings, hairline rules and dashes, a few small arrows; red rubric dots as its flowers
  const d=g.d0,INK=COL,red=FL[0]||'#DB3334',k=i=>g.seed[i]?4:Math.floor(hsh(i+3)*10);   // 0-3 rings, 4 red, 5-6 rules, 7 dashes, 8 arrows, 9 small dots
  batch(c,g,[INK],i=>k(i)<4?0:-1,(c,g,i)=>{const r=d*(.3+.3*hsh(i+5));c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},false,true,1.15);
  batch(c,g,[INK],i=>k(i)===5||k(i)===6?0:-1,(c,g,i)=>{const L=d*(.5+.5*hsh(i+6)),v=hsh(i+9)<.35;v?(c.moveTo(g.x[i],g.y[i]-L),c.lineTo(g.x[i],g.y[i]+L)):(c.moveTo(g.x[i]-L,g.y[i]),c.lineTo(g.x[i]+L,g.y[i]));},false,true,1.15);
  batch(c,g,[INK],i=>k(i)===7?0:-1,(c,g,i)=>{const L=d*.32;c.moveTo(g.x[i]-L*2.2,g.y[i]);c.lineTo(g.x[i]-L*.6,g.y[i]);c.moveTo(g.x[i]+L*.6,g.y[i]);c.lineTo(g.x[i]+L*2.2,g.y[i]);},false,true,1.15);
  c.fillStyle=INK;c.textAlign='center';c.textBaseline='middle';const ORN=['\u261E','\u2766','\u2042','\u00A7','\u00B6','\u273B'];   // printer's ornaments in place of arrows (Refero: The New Yorker, Esquire): manicule, fleuron, asterism, section, pilcrow, star
  for(let i=0;i<g.n;i++){if(k(i)!==8)continue;const o=Math.floor(hsh(i+2)*ORN.length),sz=d*(1.15+.35*hsh(i+6));c.font=`${sz|0}px Georgia,"Times New Roman",serif`;c.save();c.translate(g.x[i],g.y[i]);c.rotate((hsh(i+4)-.5)*.5);c.fillText(ORN[o],0,0);c.restore();}
  batch(c,g,[INK],i=>k(i)===9?0:-1,(c,g,i)=>{const r=d*.14;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  batch(c,g,[red],i=>k(i)===4?0:-1,(c,g,i)=>{const r=d*.36;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);}
function y2k(c,g,COL,FL){ // Ember: Colorado wildflowers as flat poster cutouts (Refero: THE1's hard-edged flat colour, no outlines or shine). Columbine, Indian paintbrush, blanket flower, flax, among green leaves
  const d=g.d0,GR=['#027B49','#1E5E3A'],CO='#FA4D43',PK='#F19EC8',WH='#FFFFFF',YE='#FBB833',DK='#1F1F1F',P=Math.PI;
  const kind=i=>g.seed[i]||hsh(i+31)<.3?1+Math.floor(hsh(i+13)*4):0;   // 0 leaf, 1 columbine, 2 paintbrush, 3 blanket flower, 4 flax
  const leaf=(c,x,y,a,L,w)=>{const s=Math.sin(a),co=Math.cos(a),tx=x+s*L,ty=y-co*L;c.moveTo(x-co*w,y-s*w);c.lineTo(tx,ty);c.lineTo(x+co*w,y+s*w);c.closePath();};
  batch(c,g,GR,i=>kind(i)===0?Math.floor(hsh(i+1)*2):-1,(c,g,i)=>{const L=d*(1.3+.6*hsh(i+4)),a=g.a[i];leaf(c,g.x[i]-Math.sin(a)*L*.45,g.y[i]+Math.cos(a)*L*.45,a+(hsh(i+5)-.5)*.4,L,L*.16);},true,false);
  const R=i=>d*(.55+.25*hsh(i+9));
  const star=(c,x,y,a,n,r1,r2)=>{for(let k=0;k<n*2;k++){const t=a+k*P/n,r=k%2?r2:r1;k?c.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r):c.moveTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}c.closePath();};
  // columbine: five long pointed sepals, five round petals, a gold eye
  batch(c,g,[PK,CO,WH],i=>kind(i)===1?i%3:-1,(c,g,i)=>star(c,g.x[i],g.y[i],g.a[i]-P/2,5,R(i),R(i)*.28),true,false);
  batch(c,g,[WH,YE],i=>kind(i)===1?(i%3===2?1:0):-1,(c,g,i)=>{const r=R(i)*.34;for(let k=0;k<5;k++){const t=g.a[i]-P/2+P/5+k*2*P/5,x=g.x[i]+Math.cos(t)*r*.8,y=g.y[i]+Math.sin(t)*r*.8;c.moveTo(x+r*.62,y);c.arc(x,y,r*.62,0,6.2832);}},true,false);
  batch(c,g,[YE],i=>kind(i)===1?0:-1,(c,g,i)=>{const r=R(i)*.2;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  // Indian paintbrush: an upright spike of pointed coral bracts
  batch(c,g,[CO],i=>kind(i)===2?0:-1,(c,g,i)=>{const r=R(i),a=g.a[i],s=Math.sin(a),co=Math.cos(a);for(let k=0;k<3;k++){const bx=g.x[i]+s*r*(k*.55-.4),by=g.y[i]-co*r*(k*.55-.4),w=r*(.55-k*.13);
    c.moveTo(bx-co*w,by-s*w);c.lineTo(bx+s*r*.7,by-co*r*.7);c.lineTo(bx+co*w,by+s*w);c.lineTo(bx-s*r*.15,by+co*r*.15);c.closePath();}},true,false);
  // blanket flower: coral rays with gold tips round a dark centre
  batch(c,g,[YE],i=>kind(i)===3?0:-1,(c,g,i)=>star(c,g.x[i],g.y[i],g.a[i],8,R(i),R(i)*.62),true,false);
  batch(c,g,[CO],i=>kind(i)===3?0:-1,(c,g,i)=>star(c,g.x[i],g.y[i],g.a[i],8,R(i)*.72,R(i)*.45),true,false);
  batch(c,g,[DK],i=>kind(i)===3?0:-1,(c,g,i)=>{const r=R(i)*.26;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  // flax: five round petals
  batch(c,g,[WH,PK],i=>kind(i)===4?(i%4===0?1:0):-1,(c,g,i)=>{const r=R(i)*.42;for(let k=0;k<5;k++){const t=g.a[i]+k*2*P/5,x=g.x[i]+Math.cos(t)*r,y=g.y[i]+Math.sin(t)*r;c.moveTo(x+r*.75,y);c.arc(x,y,r*.75,0,6.2832);}},true,false);
  batch(c,g,[YE],i=>kind(i)===4?0:-1,(c,g,i)=>{const r=R(i)*.16;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);}
// the colour behind a canvas (the first ancestor with a background), so engraved pieces can be cut out of it
const GC=new WeakMap();function groundOf(cv){let g=GC.get(cv);if(g&&performance.now()-g.t<1500)return g.c;let e=cv,c='#2C4A6E';
  while(e&&e!==document.documentElement){const b=getComputedStyle(e).backgroundColor;if(b&&!/rgba\(.*,\s*0\)$/.test(b)&&b!=='transparent'){c=b;break;}e=e.parentElement;}
  const v=cv.closest&&cv.closest('#opening');if(v){const lg=getComputedStyle(v).getPropertyValue('--lf-ground').trim();if(lg)c=lg;}
  GC.set(cv,{c,t:performance.now()});return c;}
function pebbles(c,g,COL,FL){ // Clay: an engraving, in the same hand as the Front Range border behind it. Each leaf is cut from the ground colour, drawn in cream: outline, midrib, hatching on its shadow side; sprouts on a stem; stippled seed pods
  const d=g.d0,INK='#F4F1E0',GR=groundOf(c.canvas),P=Math.PI,m=GR.match(/\d+(\.\d+)?/g),rgb=GR[0]==='#'?[1,3,5].map(j=>parseInt(GR.slice(j,j+2),16)):(m||[44,74,110]).slice(0,3).map(Number);
  const TONE=[-.22,-.1,0,.1].map(k=>`rgb(${rgb.map(v=>Math.round(k<0?v*(1+k):v+(255-v)*k)).join(',')})`);   // leaves cut from a few depths of the ground: the engraving has light and shade
  const kindOf=i=>g.seed[i]?2:(hsh(i+21)<.16?1:0);
  const base=(g,i,L)=>{const a=g.a[i];return[g.x[i]-Math.sin(a)*L*.45,g.y[i]+Math.cos(a)*L*.45];};
  const leafPath=(c,x,y,a,L,w)=>{const s=Math.sin(a),co=Math.cos(a),tx=x+s*L,ty=y-co*L,mx=x+s*L*.45,my=y-co*L*.45,nx=co*w,ny=s*w;
    c.moveTo(x,y);c.quadraticCurveTo(mx-nx,my-ny,tx,ty);c.quadraticCurveTo(mx+nx,my+ny,x,y);};
  const leafInk=(c,x,y,a,L,w,dense)=>{const s=Math.sin(a),co=Math.cos(a);c.moveTo(x,y);c.lineTo(x+s*L*.9,y-co*L*.9);   // midrib
    const n=dense?5:3;for(let k=1;k<=n;k++){const t=k/(n+1),bx=x+s*L*t,by=y-co*L*t,ww=w*Math.sin(t*P)*.85;c.moveTo(bx,by);c.lineTo(bx+co*ww+s*ww*.35,by+s*ww-co*ww*.35);}};   // hatching on the shadow side
  c.lineCap='round';c.lineJoin='round';
  for(let i=0;i<g.n;i++){const k=kindOf(i),x0=g.x[i],y0=g.y[i];
    if(k===0){const L=d*(1.6+.7*hsh(i+4)),[x,y]=base(g,i,L),a=g.a[i]+(hsh(i+5)-.5)*.5,w=L*.4;
      c.beginPath();leafPath(c,x,y,a,L,w);c.fillStyle=TONE[Math.floor(hsh(i+1)*4)];c.fill();c.globalAlpha=.92;c.lineWidth=1.1;c.strokeStyle=INK;c.stroke();
      c.beginPath();leafInk(c,x,y,a,L,w,hsh(i+9)<.5);c.globalAlpha=.55;c.lineWidth=.75;c.stroke();c.globalAlpha=1;}
    else if(k===1){const L=d*.85,[x,y]=base(g,i,L*1.4),a=g.a[i],sx=x+Math.sin(a)*L*.7,sy=y-Math.cos(a)*L*.7;
      c.beginPath();c.moveTo(x,y);c.lineTo(sx,sy);c.lineWidth=.9;c.strokeStyle=INK;c.stroke();
      for(const o of[-.7,.7]){c.beginPath();leafPath(c,sx,sy,a+o,L*.8,L*.3);c.fillStyle=GR;c.fill();c.lineWidth=.9;c.stroke();}}
    else{const r=d*.42,cone=i%2;c.beginPath();
      if(cone){c.moveTo(x0-r,y0+r*.6);c.quadraticCurveTo(x0,y0-r*2.2,x0+r,y0+r*.6);c.quadraticCurveTo(x0,y0+r*1.1,x0-r,y0+r*.6);}else{c.moveTo(x0+r,y0);c.ellipse(x0,y0,r,r*.8,g.a[i],0,6.2832);}
      c.fillStyle=GR;c.fill();c.lineWidth=1;c.strokeStyle=INK;c.stroke();
      c.fillStyle=INK;c.beginPath();for(let k=0;k<7;k++){const ang=hsh(i*7+k)*6.2832,rr=Math.sqrt(hsh(i*11+k))*r*.7,px=x0+Math.cos(ang)*rr,py=y0+Math.sin(ang)*rr*.8-(cone?r*.3:0);c.moveTo(px+.7,py);c.arc(px,py,.7,0,6.2832);}c.fill();}}}   // stipple
function stars(c,g,COL,FL){ // Dusk (Refero: Channel Studio + Josephmark): a silver particle sculpture on black. Beads grow and brighten toward the top of the heap and fade into black below; a few coral beads are its flowers, no glows
  const d=g.d0,coral=FL[0]||'#FF7777';let top=1e9,bot=-1e9;for(let i=0;i<g.n;i++){if(g.y[i]<top)top=g.y[i];if(g.y[i]>bot)bot=g.y[i];}const span=Math.max(1,bot-top);
  const lvl=i=>{const near=1-(g.y[i]-top)/span,h=hsh(i+3);return Math.min(4,Math.floor((near*.75+h*.35)*5));};   // 0 dim/deep .. 4 bright/near
  const TONES=['rgba(114,114,114,.25)','rgba(140,140,140,.45)','rgba(170,170,170,.65)','rgba(202,202,202,.85)','rgba(230,230,230,1)'];
  batch(c,g,TONES,i=>g.seed[i]?-1:lvl(i),(c,g,i)=>{const r=d*(.12+.07*lvl(i)+.05*hsh(i+5));c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  batch(c,g,[coral],i=>g.seed[i]&&hsh(i+8)<.6?0:-1,(c,g,i)=>{const r=d*.3;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);}
const D={circles,y2k,pebbles,stars};
const SCALE={grass:1,circles:1.3,y2k:2.1,pebbles:2.3,stars:1};   // how big each style's piece is, against Dew's blades
window.sogShapes={kind,scale:()=>SCALE[kind()]||1,draw(c,g,COL,FL,k){k=k||kind();const f=D[k];if(!f)return false;c.save();c.lineJoin='round';f(c,g,COL,FL||[]);c.restore();return true;}};
})();
