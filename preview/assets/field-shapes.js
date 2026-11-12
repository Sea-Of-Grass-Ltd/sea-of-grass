/* Field shapes: what each style's "grass" is made of. The same grains, the same physics and the same harmonies (meadow,
   grid, S, visualizer, the falling close); only the piece changes. Dew keeps its blades (drawn by the page's own meadowDraw).
   Ledger: circles, a halftone of dots and rings with the red as its flowers. Ember: Y2K shapes with black outlines
   (sparkles, stars, daisies, pills, hearts). Clay: houseplant leaves, sprouts and seed pods. Dusk: moons, twinkles and dots.
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
function circles(c,g,COL,FL){const d=g.d0,red=FL[0]||'#DB3334';
  // dots of three sizes and open rings in ink; the flowers are red dots
  batch(c,g,[COL,tone(COL,.35)],i=>g.seed[i]||hsh(i)<.22?-1:(hsh(i+7)<.3?1:0),(c,g,i)=>{const r=d*(.22+.42*hsh(i+3));c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  batch(c,g,[COL],i=>!g.seed[i]&&hsh(i)<.22?0:-1,(c,g,i)=>{const r=d*(.45+.4*hsh(i+5));c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},false,true,1.4);
  batch(c,g,[red],i=>g.seed[i]?0:-1,(c,g,i)=>{const r=d*.55;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);}
function y2k(c,g,COL,FL){const d=g.d0*.95,P=[...FL,COL].filter(Boolean);
  const S=[(c,x,y,a,s)=>{for(let k=0;k<8;k++){const t=a+k*Math.PI/4,r=k%2?s*.28:s;k?c.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r):c.moveTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}c.closePath();},   // sparkle
    (c,x,y,a,s)=>{for(let k=0;k<10;k++){const t=a+k*Math.PI/5,r=k%2?s*.45:s;k?c.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r):c.moveTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}c.closePath();},   // star
    (c,x,y,a,s)=>{for(let k=0;k<6;k++){const t=a+k*Math.PI/3;c.moveTo(x+Math.cos(t)*s*.55+s*.42,y+Math.sin(t)*s*.55);c.arc(x+Math.cos(t)*s*.55,y+Math.sin(t)*s*.55,s*.42,0,6.2832);}},   // daisy
    (c,x,y,a,s)=>{const ca=Math.cos(a),sa=Math.sin(a),L=s*.9,R=s*.4;c.moveTo(x+ca*L+(-sa)*R,y+sa*L+ca*R);c.arc(x+ca*L,y+sa*L,R,a+Math.PI/2,a-Math.PI/2,true);c.arc(x-ca*L,y-sa*L,R,a-Math.PI/2,a+Math.PI/2,true);c.closePath();},   // pill
    (c,x,y,a,s)=>{c.moveTo(x,y+s*.8);c.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.6,y-s*1.1,x,y-s*.35);c.bezierCurveTo(x+s*.6,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.8);}];   // heart
  const pick=i=>Math.floor(hsh(i+11)*P.length),shape=(c,g,i)=>S[Math.floor(hsh(i)*S.length)](c,g.x[i],g.y[i],g.a[i]+hsh(i+2)*6.28,d*(.42+.22*hsh(i+9)));
  batch(c,g,P,pick,shape,true,'#000',1.1);
  c.fillStyle='#000';c.beginPath();for(let i=0;i<g.n;i++){if(Math.floor(hsh(i)*S.length)!==2)continue;const r=d*.22;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);}c.fill();}   // daisy hearts
function pebbles(c,g,COL,FL){ // Clay (Refero: Houseplant + Beings): real, tactile, organic. Houseplant leaves with a chocolate midrib, little sprouts, terracotta seed pods and cones; flat fills, no shine
  const d=g.d0,LV=['#A9B89A','#7F8F5C','#5E6E43','#C9C7A0'],INK='#3A2016',POD=['#C8643B','#D9A23A','#E4D6C2'];
  const kindOf=i=>g.seed[i]?2:(hsh(i+21)<.16?1:0);
  const leaf=(c,x,y,a,L,w)=>{const s=Math.sin(a),co=Math.cos(a),tx=x+s*L,ty=y-co*L,mx=x+s*L*.45,my=y-co*L*.45,nx=co*w,ny=s*w;   // an ovate leaf from its base to its tip
    c.moveTo(x,y);c.quadraticCurveTo(mx-nx,my-ny,tx,ty);c.quadraticCurveTo(mx+nx,my+ny,x,y);};
  const base=(g,i,L)=>{const a=g.a[i];return[g.x[i]-Math.sin(a)*L*.45,g.y[i]+Math.cos(a)*L*.45];};
  batch(c,g,LV,i=>kindOf(i)===0?Math.floor(hsh(i+1)*LV.length):-1,(c,g,i)=>{const L=d*(1.6+.7*hsh(i+4)),[x,y]=base(g,i,L);leaf(c,x,y,g.a[i]+(hsh(i+5)-.5)*.5,L,L*.42);},true,false);
  batch(c,g,[LV[1]],i=>kindOf(i)===1?0:-1,(c,g,i)=>{const L=d*.85,[x,y]=base(g,i,L*1.4),a=g.a[i];c.moveTo(x,y);c.lineTo(x+Math.sin(a)*L*.7,y-Math.cos(a)*L*.7);   // a sprout: a stem and two small leaves
    const sx=x+Math.sin(a)*L*.7,sy=y-Math.cos(a)*L*.7;leaf(c,sx,sy,a-.7,L*.8,L*.32);leaf(c,sx,sy,a+.7,L*.8,L*.32);},true,true,1.1);
  c.globalAlpha=.55;batch(c,g,[INK],i=>kindOf(i)===0&&hsh(i+7)<.7?0:-1,(c,g,i)=>{const L=d*(1.6+.7*hsh(i+4)),[x,y]=base(g,i,L),a=g.a[i]+(hsh(i+5)-.5)*.5;c.moveTo(x,y);c.lineTo(x+Math.sin(a)*L*.82,y-Math.cos(a)*L*.82);},false,true,.8);c.globalAlpha=1;   // the midribs
  batch(c,g,POD,i=>kindOf(i)===2?i%POD.length:-1,(c,g,i)=>{const x=g.x[i],y=g.y[i],r=d*.42;
    if(i%2){c.moveTo(x-r,y+r*.6);c.quadraticCurveTo(x,y-r*2.2,x+r,y+r*.6);c.quadraticCurveTo(x,y+r*1.1,x-r,y+r*.6);}   // a cone
    else{c.moveTo(x+r,y);c.ellipse(x,y,r,r*.8,g.a[i],0,6.2832);}},true,INK,.8);}   // a seed pod
function stars(c,g,COL,FL){const d=g.d0,P=[tone(COL,.55),tone(COL,.2),...FL];
  batch(c,g,P,i=>g.seed[i]?2+(i%Math.max(1,P.length-2)):(hsh(i+8)<.5?0:1),(c,g,i)=>{const x=g.x[i],y=g.y[i],k=hsh(i),s=d*(.3+.35*hsh(i+3));
    if(k<.3){c.moveTo(x+s,y);c.arc(x,y,s,-.9,3.6);c.arc(x+s*.45,y-s*.2,s*.8,3.3,-.6,true);c.closePath();}   // crescent
    else if(k<.6){for(let j=0;j<8;j++){const t=g.a[i]+j*Math.PI/4,r=j%2?s*.18:s*1.1;j?c.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r):c.moveTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}c.closePath();}   // twinkle
    else{const r=s*.35;c.moveTo(x+r,y);c.arc(x,y,r,0,6.2832);}},true,false);}   // dot
const D={circles,y2k,pebbles,stars};
window.sogShapes={kind,draw(c,g,COL,FL,k){k=k||kind();const f=D[k];if(!f)return false;c.save();c.lineJoin='round';f(c,g,COL,FL||[]);c.restore();return true;}};
})();
