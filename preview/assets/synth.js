// Tristan's visual synthesizer, the engine from the tristan.design front door (copied unchanged except where noted: no saved state, the observer watches the canvas itself).
// EYESY-style visual engine — original implementation of the 13 modes listed in the user's screenshots.
(function(){
const cv=document.getElementById('viz');if(!cv)return;
const ctx=cv.getContext('2d');
let w=0,h=0,dpr=1,t=0,raf=0,trig=0;
const S={k:[0.63,0.15,0.03,0.045,0.31],mode:-1,persist:true,fg:0.734,bg:0.487,brand:false};

const save=()=>{};
const K=i=>S.k[i-1];
// Brand palette (Bento ink + decorative fills) or the free hue wheel.
const FGP=['#000000','#2665d6','#780016','#061492','#254f1a','#d6a337','#e9c0e9','#ffffff'];
const BGP=['#d2e823','#f3f3f1','#ffffff','#e8efd6','#e9c0e9','#2665d6','#780016','#254f1a','#000000'];
const wrap01=v=>((v%1)+1)%1;
const at=(arr,v)=>arr[Math.min(arr.length-1,Math.floor(wrap01(v)*arr.length))];
function pick(v,l){if(S.brand)return at(FGP,v);return'hsl('+(wrap01(v)*360).toFixed(1)+' 92% '+(l==null?55:l)+'%)'}
function bgcol(){if(S.brand)return at(BGP,S.bg);return'hsl('+(wrap01(S.bg)*360).toFixed(1)+' 92% 34%)'}
function stepIn(cur,arr,d){const n=arr.length,i=Math.min(n-1,Math.floor(wrap01(cur)*n));return((i+d+n)%n+0.5)/n}
let an=null,abuf=null,alevel=0,aenv=0,aavg=0.02;
function readAudio(){if(!an)return;an.getByteTimeDomainData(abuf);let sum=0;for(let i=0;i<abuf.length;i++){const d=(abuf[i]-128)/128;sum+=d*d}
 const rms=Math.sqrt(sum/abuf.length);
 aavg=aavg*0.96+rms*0.04;
 if(rms>Math.max(0.035,aavg*1.45)&&trig<0.45)trig=1;
 aenv=Math.max(rms*3.4,aenv*0.86);
 alevel=Math.min(1,aenv);}
function wave(p){if(an){const i=Math.min(abuf.length-1,Math.floor(((p%1)+1)%1*abuf.length));return(abuf[i]-128)/128*2.2}return Math.sin(p*Math.PI*6+t*1.7)*0.55+Math.sin(p*Math.PI*17-t*2.3)*0.28+Math.sin(p*Math.PI*31+t*0.9)*0.17}
function peak(){if(an)return Math.min(1,alevel*1.15+trig*0.4);return Math.min(1,(0.5+0.5*Math.sin(t*0.8))*0.8+trig)}
// audio-reactive size multiplier: quiet collapses, hits bloom (EYESY-style)
function amp(){return an?(0.22+peak()*1.5):(0.6+peak()*0.7)}
function hash(a,b){const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)}

function clear(){if(S.persist)return;ctx.fillStyle=bgcol();ctx.fillRect(0,0,w,h)}
function paintBg(){ctx.fillStyle=bgcol();ctx.fillRect(0,0,w,h)}
const CELL_CAP=1400;
function capCols(cols){let c=Math.max(3,Math.round(cols));while(c>3&&c*Math.max(2,Math.round(c*h/w))>CELL_CAP)c--;return c}
function gridDims(){const cols=capCols(3+K(1)*16),rows=Math.max(2,Math.round(cols*h/w));return[cols,rows,w/cols,h/rows]}

function cells(fn){const[cols,rows,cw,ch]=gridDims();for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)fn(c,r,c*cw+cw/2,r*ch+ch/2,cw,ch,cols,rows)}

function gridCirclesOutlined(){ctx.lineWidth=1+K(5)*7;cells((c,r,x,y,cw,ch)=>{const s=(0.15+K(2)*0.45)*Math.min(cw,ch)*amp();ctx.strokeStyle=pick(S.fg+hash(c,r)*K(4));ctx.beginPath();ctx.arc(x,y,Math.max(1,s),0,6.2832);ctx.stroke()})}
function gridCirclesFilled(colorMode){cells((c,r,x,y,cw,ch,cols,rows)=>{const blk=(c+Math.floor(r/2))%3===0;if(blk){ctx.fillStyle=pick(S.fg+0.5,44);ctx.fillRect(x-cw/2,y-ch/2,cw,ch)}const s=(0.12+K(2)*0.4)*Math.min(cw,ch)*amp();const v=colorMode==='patchwork'?S.fg+hash(Math.floor(c/2),Math.floor(r/2))*K(4)*2:S.fg+K(4)*0.15;ctx.fillStyle=pick(v);ctx.beginPath();ctx.arc(x,y,Math.max(1,s),0,6.2832);ctx.fill()})}
function poly(x,y,s,n,rot){ctx.beginPath();for(let i=0;i<n;i++){const a=rot+i/n*6.2832;const px=x+Math.cos(a)*s,py=y+Math.sin(a)*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
function gridPolygons(colorMode){const n=3+Math.round(K(3)*5);cells((c,r,x,y,cw,ch,cols)=>{const s=(0.2+K(2)*0.55)*Math.min(cw,ch)*amp();const rot=t*(0.2+K(5)*1.6)+hash(c,r)*6.28;let v;if(colorMode==='column')v=S.fg+c/cols*K(4)*2;else if(colorMode==='patchwork')v=S.fg+hash(Math.floor(c/1.5),Math.floor(r/1.5))*K(4)*2;else v=S.fg+K(4)*0.1;ctx.fillStyle=pick(v);poly(x,y,Math.max(1,s),n,rot);ctx.fill()})}
function gridTriangles(){cells((c,r,x,y,cw,ch)=>{const up=(c+r)%2===0,s=(0.5+K(2)*0.5),hw=cw/2*s,hh=ch/2*s*amp();ctx.fillStyle=pick(S.fg+((c*0.13+r*0.07)*K(4)));ctx.beginPath();if(up){ctx.moveTo(x,y-hh);ctx.lineTo(x+hw,y+hh);ctx.lineTo(x-hw,y+hh)}else{ctx.moveTo(x,y+hh);ctx.lineTo(x+hw,y-hh);ctx.lineTo(x-hw,y-hh)}ctx.closePath();ctx.fill()})}
function hertsi(){const n=Math.max(4,Math.round(6+K(1)*60)),bh=h/n;for(let i=0;i<n;i++){const p=i/n,amp2=(0.2+K(2)*0.8),th=bh*(0.1+Math.abs(wave(p+t*0.05*K(3)))*amp2*(an?1.5:0.9));ctx.fillStyle=pick(S.fg+p*K(4)*0.6);ctx.fillRect(0,i*bh+(bh-th)/2,w,Math.max(1,th))}}
function mirrorGrid(inverse){const n=Math.max(4,Math.round(8+K(1)*70)),bh=h/2/n;for(let i=0;i<n;i++){const p=i/n,ph=t*(0.3+K(3)*3)+p*(4+K(5)*20),th=bh*(0.15+Math.abs(Math.sin(ph))*(0.3+K(2)*0.9)*(an?0.6+peak()*1.2:1));ctx.fillStyle=pick(S.fg+p*K(4)*(inverse?1.6:0.5));const y1=h/2-i*bh-th/2,y2=h/2+i*bh-th/2;ctx.fillRect(0,y1,w,Math.max(1,th));ctx.fillRect(0,y2,w,Math.max(1,th));if(inverse){const cw=w/2/n,tw=cw*(0.2+Math.abs(Math.cos(ph))*(0.3+K(2)*0.9));ctx.globalAlpha=0.55;ctx.fillRect(w/2-i*cw-tw/2,0,Math.max(1,tw),h);ctx.fillRect(w/2+i*cw-tw/2,0,Math.max(1,tw),h);ctx.globalAlpha=1}}}
function radiatingSquare(){const steps=Math.max(3,Math.round(4+K(1)*26)),max=Math.hypot(w,h)*0.5*(0.35+K(2)*0.8),cx=w/2,cy=h/2;for(let i=steps;i>0;i--){const p=i/steps,r=max*p*(0.55+amp()*0.5),step=Math.floor(p*(2+K(5)*10))/(2+K(5)*10);ctx.fillStyle=pick(S.fg+step*K(4)*2,40+p*30);ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*(0.2+K(3)*1.2)+p*3)*0.35);ctx.fillRect(-r,-r,r*2,r*2);ctx.restore()}}
function sequins(){const cols=Math.max(8,capCols(14+K(1)*70)),cw=w/cols,rows=Math.max(4,Math.round(h/cw)),ch=h/rows;const f1=2+K(2)*18,f2=2+K(3)*18;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const u=c/cols,v=r/rows;const m=Math.sin(u*f1*3.1+t*0.8)*Math.sin(v*f2*3.1-t*0.6)+Math.sin((u+v)*f1*1.7+t*0.4);const s=Math.max(0,(m+1.6)/3)*Math.min(cw,ch)*0.5*amp();if(s<0.4)continue;ctx.fillStyle=pick(S.fg+m*0.08*K(4),62);ctx.beginPath();ctx.arc(c*cw+cw/2,r*ch+ch/2,s,0,6.2832);ctx.fill()}}


// --- colour helper: css -> [r,g,b] (cached) ---
const colorCache=new Map();let probeX=null;
function rgb(css){let c=colorCache.get(css);if(c)return c;if(!probeX){const el=document.createElement('canvas');el.width=el.height=1;probeX=el.getContext('2d')}probeX.fillStyle=css;probeX.fillRect(0,0,1,1);const d=probeX.getImageData(0,0,1,1).data;c=[d[0],d[1],d[2]];colorCache.set(css,c);return c}
let prevTrig=0;function fired(){const f=trig>0.85&&prevTrig<=0.85;prevTrig=trig;return f}

// --- Hypnogrid: modular sequence tiling, scaled up from a small buffer ---
let hgC=null,hgX=null;
function hypnogrid(){const al=an?alevel:0.25+0.2*Math.sin(t*0.7),bl=K(5)*0.6;
 const k1=K(1)*(1-bl)+al*bl,k2=K(2)*(1-bl)+al*bl,k3=K(3);
 const sqrtx=Math.sqrt(1+k1*9),modval=Math.max(2,Math.floor(2+Math.pow(k2,0.7)*10));
 const n=Math.max(24,Math.min(168,Math.round(28+k3*140)));
 if(!hgC){hgC=document.createElement('canvas');hgX=hgC.getContext('2d')}
 if(hgC.width!==n){hgC.width=hgC.height=n}
 const a=new Int32Array(n);for(let i=1;i<n;i++)a[i]=a[i-1]+((Math.floor(i*sqrtx)%modval)===1?1:-1);
 const pal=[];for(let i=0;i<4;i++)pal.push(rgb(pick(S.fg+i*0.25*(0.15+K(4)*1.85))));
 const img=hgX.createImageData(n,n),d=img.data;
 for(let y=0;y<n;y++){const ay=a[y];for(let x=0;x<n;x++){const c=pal[((a[x]+ay)%4+4)%4],o=(y*n+x)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255}}
 hgX.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(hgC,0,0,w,h)}

// --- T - Flow Field Drift: particles painting a rotating flow field ---
const FF={x:[],y:[],s:[],env:0,vel:0,shock:0,to:0,rot:0,ang:null,gw:22,gh:13};
function flowFieldDrift(){const P=FF;
 if(!P.ang){P.ang=[];for(let y=0;y<P.gh;y++)P.ang.push(new Float32Array(P.gw))}
 const rms=an?Math.min(1,alevel*0.9):0.22+0.18*Math.sin(t*0.9);
 P.vel+=(rms-P.env)*0.4;P.vel*=0.85;P.env=Math.min(1,Math.max(0,P.env+P.vel));
 if(fired())P.shock=15;
 let namp=1;if(P.shock>0){namp=1+2*(P.shock/15);P.shock--}
 const ns=(0.5+K(2)*2.5)*namp,target=Math.round(180+K(1)*420);
 while(P.x.length<target){P.x.push(Math.random()*w);P.y.push(Math.random()*h);P.s.push(0.7+Math.random()*0.6)}
 while(P.x.length>target){P.x.pop();P.y.pop();P.s.pop()}
 P.to+=0.005+P.env*0.04;const z=P.to+Math.sin(t*0.2)*2;
 for(let y=0;y<P.gh;y++){const row=P.ang[y];for(let x=0;x<P.gw;x++){const fx=x*0.3*ns,fy=y*0.4*ns;row[x]=Math.sin(fx+z*0.3)*2+Math.cos(fy+z*0.2)*2+Math.sin(x*0.1*ns+y*0.2*ns+z*0.15)*1.5+Math.sin(fx*0.7+z)+Math.cos(fy*0.5+z*0.8)}}
 const spd=(1+K(3)*4)*(0.7+P.env*1.2)*(w/1280+0.35);
 P.rot+=0.002+P.env*0.003;const cr=Math.cos(P.rot),sr=Math.sin(P.rot);
 const base=Math.min(w,h)/120+(1-K(1))*Math.min(w,h)/110,cw=w/P.gw,chh=h/P.gh;
 for(let i=0;i<P.x.length;i++){let px=P.x[i],py=P.y[i];
  const gx=Math.min(P.gw-1,Math.max(0,Math.floor(px/cw))),gy=Math.min(P.gh-1,Math.max(0,Math.floor(py/chh))),ang=P.ang[gy][gx];
  px+=Math.cos(ang)*spd*P.s[i];py+=Math.sin(ang)*spd*P.s[i];
  if(px<-5||px>w+5||py<-5||py>h+5){const e=Math.floor(Math.random()*4);if(e===0){px=Math.random()*w;py=0}else if(e===1){px=Math.random()*w;py=h-1}else if(e===2){px=0;py=Math.random()*h}else{px=w-1;py=Math.random()*h}}
  P.x[i]=px;P.y[i]=py;
  const rx=px-w/2,ry=py-h/2,dx=w/2+rx*cr-ry*sr,dy=h/2+rx*sr+ry*cr;
  const rad=Math.min(Math.min(w,h)/44,base+(Math.abs(rx)+Math.abs(ry))/300)*(an?0.45+peak()*1.1:1);
  ctx.fillStyle=pick(S.fg+(((ang/6.2832)%1+1)%1*0.25+P.env*0.15)*K(4)*2,62);
  ctx.beginPath();ctx.arc(dx,dy,Math.max(0.7,rad),0,6.2832);ctx.fill()}}

// --- T - Font Patterns: one unicode glyph tiled in a staggered grid ---
const GLYPHSETS=[[0x25a0,0x25ff],[0x2190,0x21bb],[0x2500,0x257f],[0x2580,0x259f],[0x2800,0x28ff],[0x25b2,0x25cf]];
let fpGlyph=String.fromCharCode(0x25a0);
function fontPatterns(){
 if(fired()){const s=GLYPHSETS[Math.min(GLYPHSETS.length-1,Math.floor(wrap01(K(3))*GLYPHSETS.length))];fpGlyph=String.fromCharCode(s[0]+Math.floor(Math.random()*(s[1]-s[0]+1)))}
 const size=Math.max(9,(5+K(2)*Math.min(w,h)*0.42)*(an?0.55+peak()*0.9:1));
 const shift=(K(1)-0.5)*w*0.42,stepX=w/8,stepY=h/8;
 ctx.font='400 '+size.toFixed(1)+'px "Apple Symbols","Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans","Arial Unicode MS",sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=pick(S.fg+K(4)*0.8);
 for(let j=-1;j<10;j++)for(let i=-1;i<10;i++)ctx.fillText(fpGlyph,i*stepX+(i%2===0?shift:0),j*stepY)}

// --- T - Ball of Mirrors: frame feedback, flipped and rescaled ---
let bomA=null,bomB=null;
function bomSurf(c){if(!c){c=document.createElement('canvas')}const iw=Math.max(1,Math.round(w)),ih=Math.max(1,Math.round(h));if(c.width!==iw||c.height!==ih){c.width=iw;c.height=ih}return c}
function ballOfMirrors(){bomA=bomSurf(bomA);bomB=bomSurf(bomB);
 if(fired()||(an&&peak()>0.8&&Math.random()<0.3)){const r=Math.min(w,h)*0.05*(0.6+peak());ctx.fillStyle=pick(S.fg+Math.random()*K(4)*2,58);ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,Math.max(2,r),0,6.2832);ctx.fill()}
 const sw=Math.max(6,K(3)*w),sh=Math.max(6,K(4)*h),dx=K(1)*w,dy=K(2)*h;
 ctx.save();ctx.translate(dx+sw,dy);ctx.scale(-1,1);ctx.imageSmoothingEnabled=true;ctx.drawImage(bomA,0,0,sw,sh);ctx.restore();
 const bx=bomB.getContext('2d');bx.clearRect(0,0,bomB.width,bomB.height);bx.drawImage(cv,0,0,bomB.width,bomB.height);
 const sp=bomA;bomA=bomB;bomB=sp}

// ============ ports of the EYESY python modes ============
// audio_in[] equivalent: int16-ish sample at index i (python modes divide these by 85..100)
const AI=i=>wave((((i%100)+100)%100)/100)*15000*(an?0.35+peak()*1.5:1);

// --- S - Circle Scope: 50-segment rotating scope of lines + dots ---
let csRot=0,csJ=0,csLX=null,csLY=null;
function circleScope(){const xr=w,yr=h,crad=xr*0.016;
 if(K(3)<0.48)csRot-=(0.48-K(3))*50*0.6;else if(K(3)>0.52)csRot+=(K(3)-0.52)*50*0.6;
 const sizer=K(1)*3;let lw,cr;
 if(sizer<1){lw=1;cr=sizer*2*crad}else if(sizer<=2){lw=(sizer-1)*22+1;cr=0}else{lw=(sizer-2)*22+1;cr=(sizer-2)*2*crad+3}
 let R0=(K(2)*2*(xr*0.313))-(xr*0.117);
 for(let i=0;i<50;i++){csJ+=i<=24?1:-1;
  const R=R0+AI(csJ)/100;
  const x=R*Math.cos((i/50)*6.28)+xr/2,y=R*Math.sin((i/50)*6.28)+yr/2;
  const ra=csRot*Math.PI/180,ca=Math.cos(ra),sa=Math.sin(ra);
  const rx=(x-xr/2)*ca-(y-yr/2)*sa+xr/2,ry=(x-xr/2)*sa+(y-yr/2)*ca+yr/2;
  if(csLX==null){csLX=rx;csLY=ry}
  const col=pick(S.fg+wrap01(i*K(4)+0.5));
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,lw);ctx.beginPath();ctx.moveTo(csLX,csLY);ctx.lineTo(rx,ry);ctx.stroke();
  csLX=rx;csLY=ry;
  if(cr>=1){ctx.fillStyle=col;ctx.beginPath();ctx.arc(rx,ry,cr,0,6.2832);ctx.fill()}}}

// --- S - Gradient Cloud: swelling column of circles swept side to side ---
let gcRate=0;
function gradientCloud(){const xr=w,yr=h,x240=xr*0.188,xhalf=xr/2,y480=yr*0.667;
 const xpos1=K(1)*4*x240-2*x240,n=Math.min(560,Math.round(yr/2)),tt=t;
 const sway=x240+xhalf*Math.sin(0.5+tt)*K(3);
 const yb=K(2)*y480+30*Math.cos(1+tt),sy=yr/2/n;
 for(let i=0;i<n;i++){const ypos=yb+AI(i%99)/100;
  gcRate+=K(4)*0.02;
  const rad=30+20*Math.sin(i*K(3)*3+tt);
  const xp=xr/2+sway*Math.sin(i*1+tt);
  if(rad<0.5)continue;
  ctx.fillStyle=pick(S.fg+gcRate);ctx.beginPath();ctx.arc(xp+xpos1,i*(sy*2)+ypos,rad,0,6.2832);ctx.fill()}}

// --- S - Gradient Column: tall stack of small circles, audio-puffed sideways ---
let gcolRate=0;
function gradientColumn(){const xr=w,yr=h,x12=xr*0.009375;
 const cool=Math.min(620,Math.round(K(1)*(yr-10))+10),yoff=(yr/2)-K(1)*(yr/2);
 const xtra=K(2)*(xr-2)+2,swell=K(3)*0.999+0.001,tt=t,sy=cool>0?(yr/2)/cool:1;
 for(let i=0;i<cool;i++){const puff=(AI(i%99)*0.00003058)*(yr/2);
  gcolRate=(gcolRate+K(4)*0.002)%1;
  const rad=Math.abs(x12+x12*Math.sin(i*0.1*swell+tt));
  const xp=(xr/2-xtra/144)+(xtra/2)*Math.sin(i*2.5+tt);
  if(rad<0.5)continue;
  ctx.fillStyle=pick(S.fg+wrap01(i*0.02+gcolRate));ctx.beginPath();ctx.arc(xp+puff,i*sy*2+yoff,rad,0,6.2832);ctx.fill()}}

// --- S - Sound Jaws: two rows of teeth over a shrinking frame-feedback loop ---
let sjC=null;
function soundJaws(){const xr=w,yr=h;
 if(!sjC)sjC=document.createElement('canvas');
 const iw=Math.max(1,Math.round(w)),ih=Math.max(1,Math.round(h));
 if(sjC.width!==iw||sjC.height!==ih){sjC.width=iw;sjC.height=ih}
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(sjC,xr*0.039,yr*0.069,xr-xr*0.078,yr-yr*0.139);
 const col=pick(S.fg+wrap01(t*0.06*(0.2+K(4)*3)));
 const teeth=Math.max(1,Math.round(K(1)*10));
 let tw=(xr-xr*0.1*teeth);if(tw<=0)tw=0.1*xr;
 let clench=K(3)*(0.156*xr)-tw/2;
 if(tw>xr/2)clench=K(1)*(0.156*xr)-xr*0.39;
 const shape=Math.floor(K(2)*3);
 if(shape<1)clench=K(1)*(0.156*xr)-xr*0.078;
 ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=tw;
 for(let i=0;i<20;i++){const bot=i>=10,k=bot?i-10:i;
  const x=k*tw+tw/2,y0=bot?yr:0,a=Math.abs(AI(i)/85);
  const y1=bot?y0-a-clench:y0+a+clench;
  ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
  const d=bot?-1:1;
  if(shape===1){ctx.beginPath();ctx.moveTo(x-tw/2,y1);ctx.lineTo(x,y1+d*tw/2);ctx.lineTo(x+tw/2,y1);ctx.closePath();ctx.fill()}
  else if(shape>=2){ctx.beginPath();ctx.arc(x,y1,Math.max(1,tw/2),0,6.2832);ctx.fill()}}
 const sx=sjC.getContext('2d');sx.clearRect(0,0,iw,ih);sx.drawImage(cv,0,0,iw,ih)}

// --- Bar Bounce: spectrum bars with circles bouncing off them ---
const BB={h:new Float32Array(32),c:[],last:0};
function barBounce(){const xr=w,yr=h;
 const bars=Math.max(1,Math.round(1+K(1)*31)),cn=Math.floor(K(2)*12+0.001),mix=K(4);
 const now=performance.now();let dt=(now-(BB.last||now))/1000;BB.last=now;dt=Math.max(1/120,Math.min(1/15,dt));
 for(let i=0;i<bars;i++){const v=Math.min(1,Math.abs(AI(Math.floor(i*(100/bars))))/32767*4);BB.h[i]=BB.h[i]*0.85+v*0.15}
 const bw=xr/bars,maxH=yr*0.9,rects=[];
 for(let i=0;i<bars;i++){const bh=BB.h[i]*maxH*(0.6+0.8*mix),x=i*bw,y=yr-bh;
  ctx.fillStyle=pick(S.fg+wrap01(i*0.11+BB.h[i]*0.6*K(3)*2));ctx.fillRect(x,y,Math.ceil(bw),bh);
  rects.push({l:x,r:x+bw,t:y,b:yr,cx:x+bw/2,cy:y+bh/2,wd:bw,i:i})}
 while(BB.c.length<cn){const r=6+Math.random()*22;BB.c.push({x:r+Math.random()*(xr-2*r),y:Math.random()*yr/2,r:r,vx:-120+Math.random()*240,vy:-80+Math.random()*160,h:Math.random()})}
 while(BB.c.length>cn)BB.c.pop();
 for(const c of BB.c){c.vy+=50*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.x-c.r<0){c.x=c.r;c.vx*=-0.8}if(c.x+c.r>xr){c.x=xr-c.r;c.vx*=-0.8}
  if(c.y-c.r<0){c.y=c.r;c.vy*=-0.8}if(c.y+c.r>yr){c.y=yr-c.r;c.vy*=-0.85}}
 for(let i=0;i<BB.c.length;i++)for(let j=i+1;j<BB.c.length;j++){const a=BB.c[i],b=BB.c[j];
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),md=a.r+b.r;
  if(d>0&&d<md){const ov=0.5*(md-d+1),nx=dx/d,ny=dy/d;
   a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
   const tvx=a.vx,tvy=a.vy;a.vx=b.vx*0.9;a.vy=b.vy*0.9;b.vx=tvx*0.9;b.vy=tvy*0.9}}
 for(const c of BB.c)for(const rc of rects){const nx=Math.max(rc.l,Math.min(c.x,rc.r)),ny=Math.max(rc.t,Math.min(c.y,rc.b));
  const dx=c.x-nx,dy=c.y-ny;
  if(dx*dx+dy*dy<=c.r*c.r&&c.y<rc.cy){c.y=rc.t-c.r-0.5;c.vy=-Math.abs(c.vy)*0.85-BB.h[rc.i]*200;c.vx+=(c.x-rc.cx)/(rc.wd/2)*60}}
 for(const c of BB.c){ctx.globalAlpha=0.35;ctx.fillStyle='#000';ctx.beginPath();ctx.arc(c.x+3,c.y+3,c.r,0,6.2832);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=pick(S.fg+c.h*K(4)*2);ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,6.2832);ctx.fill()}}

// --- Randumbizer LFO Sweep: drives another mode with slow polyrhythmic knob LFOs ---
const RZ={idx:-1,sw:0,ph:[0,0,0,0,0],last:0,cnt:0};
const RZ_RATES=[16,24,10,32,48],RZ_OFF=[0,1.05,2.09,3.14,4.19],RZ_IVL=[8,16,32,64];
function randumbizer(){
 const now=t,dt=RZ.last?Math.max(0.001,Math.min(0.2,now-RZ.last)):1/30;RZ.last=now;
 const ivl=RZ_IVL[Math.min(3,Math.floor(K(3)*4))];
 const pool=MODES.length-1;
 if(RZ.idx<0||now-RZ.sw>ivl){RZ.sw=now;let n=RZ.idx;if(pool>1)while(n===RZ.idx)n=Math.floor(Math.random()*pool);else n=0;RZ.idx=n}
 RZ.cnt++;if(RZ.cnt>Math.max(2,K(2)*100)){RZ.cnt=0;trig=1}
 const sp=0.1+K(1)*1.9,kb=S.k.slice();
 for(let i=0;i<5;i++){RZ.ph[i]+=6.2832*(sp/RZ_RATES[i])*dt;S.k[i]=0.5+0.5*Math.sin(RZ.ph[i]+RZ_OFF[i])}
 try{ctx.save();MODES[RZ.idx].f();ctx.restore()}catch(e){ctx.restore()}
 S.k=kb;
 const v=kb[3]*0.78;if(v>0.01){ctx.globalAlpha=v;ctx.fillStyle=bgcol();ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}}

const MODES=[
{n:'Bubble Wrap',f:gridCirclesOutlined},
{n:'Neon Nostalgia',f:()=>gridPolygons('column')},
{n:'Prism Panic',f:()=>gridPolygons('patchwork')},
{n:'Groove Juice',f:()=>gridPolygons('uniform')},
{n:'Slime Funk Meltdown',f:hertsi},
{n:'Hypno Waffle',f:hypnogrid},
{n:'Disco Maze',f:()=>mirrorGrid(true)},
{n:'Portal Punch',f:radiatingSquare},
{n:'Glitter Bomb',f:sequins},
{n:'Lava Lamp',f:flowFieldDrift},
{n:'Wingding Rave',f:fontPatterns},
{n:'Spirograph Sludge',f:circleScope},
{n:'Goo Tube',f:gradientColumn},
{n:'Chomp',f:soundJaws},
{n:'Bouncy Castle',f:barBounce},
{n:'Chaos Engine',f:randumbizer}];
if(S.mode<0||S.mode>=MODES.length)S.mode=MODES.length-1;

function resize(){const r=cv.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,(r.width||1)>720?1.25:2);w=r.width;h=r.height;cv.width=w*dpr;cv.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
let last=0;
function frame(now){raf=requestAnimationFrame(frame);if(now-last<32)return;last=now;t+=0.033;trig*=0.85;readAudio();clear();ctx.save();MODES[S.mode].f();ctx.restore()}
window.EYESY={S,MODES,save,resize,trigger:()=>{trig=1},reset(){paintBg()},
 stepFg(d){S.brand?S.fg=stepIn(S.fg,FGP,d):S.fg=wrap01(S.fg+0.07*d)},
 stepBg(d){S.brand?S.bg=stepIn(S.bg,BGP,d):S.bg=wrap01(S.bg+0.07*d)},
 fgSwatch(){return pick(S.fg)},bgSwatch(){return bgcol()},
 setAnalyser(node){an=node||null;abuf=an?new Uint8Array(an.fftSize):null;alevel=0},
 hasAudio(){return!!an},
 redraw(){clear();ctx.save();MODES[S.mode].f();ctx.restore()}};
resize();window.addEventListener('resize',()=>{resize();paintBg();if(!raf)window.EYESY.redraw()});
const hero=cv;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const io=new IntersectionObserver(es=>{const vis=es[0].isIntersecting;if(vis&&!raf&&!reduce)raf=requestAnimationFrame(frame);else if(!vis&&raf){cancelAnimationFrame(raf);raf=0}});
if(hero)io.observe(hero);
if(reduce)window.EYESY.redraw();else raf=requestAnimationFrame(frame);
})();
