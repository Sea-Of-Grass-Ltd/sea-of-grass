/* Field shapes: what each style's "grass" is made of. The same grains, the same physics and the same harmonies (meadow,
   grid, S, visualizer, the falling close); only the piece changes. Dew keeps its blades (drawn by the page's own meadowDraw).
   Ledger: Swiss rules, black bars on 0/45/90 degrees with red squares and dots and a few grotesk figures. Ember: Colorado wildflowers as flat poster
   cutouts (columbine, paintbrush, blanket flower, flax). Clay: houseplant leaves, sprouts and seed pods. Dusk: a silver bead field.
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
function circles(c,g,COL,FL){ // Ledger, Swiss (Refero: SVZ's black with signal-red flashes, Displace's Swiss grotesk; after Müller-Brockmann's musica viva posters): one vocabulary only.
  // Black rules in two weights and three lengths that come to rest on 0, 45 or 90 degrees and swing freely when pushed; red squares and dots as the only accent; a few small grotesk figures like ledger entries
  const d=g.d0,INK=COL,red=FL[0]||'#DB3334',P=Math.PI;
  const mx=x=>{x=Math.imul(x^x>>>16,0x45d9f3b);x=Math.imul(x^x>>>16,0x45d9f3b);return((x^x>>>16)>>>0)/4294967296;},h=(i,s)=>mx(i*97+s*7919);   // well mixed, so the choices don't line up
  const k=i=>g.seed[i]&&h(i,1)<.45?9:Math.floor(h(i,2)*40);          // 0-15 hairlines, 16-21 heavy rules, 22-23 small squares, 24 figures, 25+ and 9 empty: room to breathe
  const A=[0,0,0,P/2,P/2,P/4,-P/4];
  const ang=i=>A[Math.floor(h(i,3)*A.length)]+g.a[i]-Math.sin(g.x[i]*.05)*.18;   // at rest the blade's own sway is taken out, so it sits exactly on its angle
  const L=i=>d*[.6,1.05,1.7][Math.floor(h(i,4)*3)];
  const rule=(c,g,i)=>{const a=ang(i),l=L(i),sx=Math.sin(a)*l,sy=-Math.cos(a)*l;c.moveTo(g.x[i]-sx,g.y[i]-sy);c.lineTo(g.x[i]+sx,g.y[i]+sy);};
  c.lineCap='butt';
  batch(c,g,[INK],i=>k(i)<16&&k(i)!==9?0:-1,rule,false,true,Math.max(1,d*.09));
  batch(c,g,[INK],i=>k(i)>=16&&k(i)<22?0:-1,rule,false,true,Math.max(2.5,d*.26));
  const sq=(c,g,i,r)=>{const a=ang(i),co=Math.cos(a),si=Math.sin(a);const p=[[-r,-r],[r,-r],[r,r],[-r,r]].map(([x,y])=>[g.x[i]+x*co-y*si,g.y[i]+x*si+y*co]);c.moveTo(p[0][0],p[0][1]);for(let j=1;j<4;j++)c.lineTo(p[j][0],p[j][1]);c.closePath();};
  batch(c,g,[INK],i=>k(i)>=22&&k(i)<24?0:-1,(c,g,i)=>sq(c,g,i,d*.16),true,false);
  batch(c,g,[red],i=>g.seed[i]&&k(i)===9?0:-1,(c,g,i)=>{if(h(i,5)<.5)sq(c,g,i,d*.3);else{const r=d*.34;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);}},true,false);
  c.fillStyle=INK;c.textAlign='center';c.textBaseline='middle';c.font=`500 ${Math.round(d*.75)}px Inter,"Helvetica Neue",Helvetica,Arial,sans-serif`;
  for(let i=0;i<g.n;i++){if(k(i)!==24)continue;c.fillText(String(1+Math.floor(h(i,6)*99)).padStart(2,'0'),g.x[i],g.y[i]);}}
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
function stars(c,g,COL,FL){ // Dusk (Refero: Channel Studio + Josephmark): a silver particle sculpture on black. Beads grow and brighten toward the top of the heap and fade into black below; a few coral beads are its flowers, no glows
  const d=g.d0,coral=FL[0]||'#FF7777';let top=1e9,bot=-1e9;for(let i=0;i<g.n;i++){if(g.y[i]<top)top=g.y[i];if(g.y[i]>bot)bot=g.y[i];}const span=Math.max(1,bot-top);
  const lvl=i=>{const near=1-(g.y[i]-top)/span,h=hsh(i+3);return Math.min(4,Math.floor((near*.75+h*.35)*5));};   // 0 dim/deep .. 4 bright/near
  const TONES=['rgba(114,114,114,.25)','rgba(140,140,140,.45)','rgba(170,170,170,.65)','rgba(202,202,202,.85)','rgba(230,230,230,1)'];
  batch(c,g,TONES,i=>g.seed[i]?-1:lvl(i),(c,g,i)=>{const r=d*(.12+.07*lvl(i)+.05*hsh(i+5));c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);
  batch(c,g,[coral],i=>g.seed[i]&&hsh(i+8)<.6?0:-1,(c,g,i)=>{const r=d*.3;c.moveTo(g.x[i]+r,g.y[i]);c.arc(g.x[i],g.y[i],r,0,6.2832);},true,false);}
const D={circles,y2k,pebbles,stars};
const SCALE={grass:1,circles:1.3,y2k:2.1,pebbles:1.5,stars:1};   // how big each style's piece is, against Dew's blades
window.sogShapes={kind,scale:()=>SCALE[kind()]||1,draw(c,g,COL,FL,k){k=k||kind();const f=D[k];if(!f)return false;c.save();c.lineJoin='round';f(c,g,COL,FL||[]);c.restore();return true;}};
})();
