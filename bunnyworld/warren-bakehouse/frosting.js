/* Frosting on the bottom edge of Warren's flat colour panels (Tristan, 2026-11-16; reworked 11-17 after
   "it just looks like running paint"). Frosting, not paint: a thick lumpy lip, short fat rounded drips,
   a soft shadow underneath, a darker rim where the frosting curls under, and a glossy highlight streak.
   It moves like something stiff: drips breathe a little, give slightly when you scroll fast, and now and
   then one creeps a little longer, holds, and pulls back. Nothing falls off. */
(function(){
  var still=matchMedia('(prefers-reduced-motion: reduce)').matches, H=96;
  var bands=[], vel=0, lastY=scrollY, lastT=performance.now();
  function hash(a){var n=Math.sin(a*127.1)*43758.5453;return n-Math.floor(n)}
  function cnv(){return document.createElement('canvas')}
  function add(sel,opts){
    var el=document.querySelector(sel); if(!el) return;
    var box=document.createElement('div'); box.className='drips'; box.setAttribute('aria-hidden','true');
    var cv=cnv(); box.appendChild(cv); el.parentNode.insertBefore(box,el.nextSibling);
    bands.push({el:el,box:box,cv:cv,ctx:cv.getContext('2d'),m:cnv(),s:cnv(),seed:opts.seed,region:opts.region,
      W:0,dpr:1,col:getComputedStyle(el).backgroundColor,drips:[],stretch:0,
      next:performance.now()+5000+hash(opts.seed)*8000,creep:null,on:false});
  }
  function lip(b,x){return 6+1.6*Math.sin(x/21+b.seed)+1*Math.sin(x/8.3+b.seed*2)}
  function layout(b){
    var r=b.el.getBoundingClientRect(),reg=b.region?b.region(r):{x:0,w:r.width};
    b.box.style.display=reg?'':'none'; if(!reg) return;
    b.W=reg.w;b.box.style.setProperty('--dl',reg.x+'px');b.box.style.setProperty('--dw',reg.w+'px');
    b.dpr=Math.min(2,devicePixelRatio||1);
    [b.cv,b.m,b.s].forEach(function(k){k.width=Math.round(b.W*b.dpr);k.height=Math.round(H*b.dpr)});
    b.drips=[];var x=14+hash(b.seed)*30,j=0;
    while(x<b.W-8){var r1=hash(b.seed*31+j+1),r2=hash(b.seed*17+j+31);
      var hr=5+r2*4, len=r1<.5? hr*1.2+2 : hr*2.6+r1*12;
      b.drips.push({x:x,hr:hr,len:len,r:r1});
      x+=hr*3+22+hash(b.seed*7+j+57)*70;j++}
  }
  // one drip, like ganache: wide where it leaves the lip, pinching to a neck, then a fat round bulb
  function drip(c,x,top,len,hr){
    var w=hr*1.45,n=hr*.62,cr=hr*.88,tip=top+len,by=tip-cr,sh=top+hr*.6;
    if(len<hr*3.2){ // a short lobe: no neck
      c.moveTo(x-w-hr,top-2);c.quadraticCurveTo(x-w,top-1,x-w*.9,sh);
      c.bezierCurveTo(x-w*.9,tip-1,x-hr*.3,tip,x,tip);c.bezierCurveTo(x+hr*.3,tip,x+w*.9,tip-1,x+w*.9,sh);
      c.quadraticCurveTo(x+w,top-1,x+w+hr,top-2);c.closePath();return}
    var ny=Math.max(sh+2,by-cr*1.05);
    c.moveTo(x-w-hr,top-2);c.quadraticCurveTo(x-w,top-1,x-w,sh);
    c.bezierCurveTo(x-w,sh+(ny-sh)*.55,x-n,ny-(ny-sh)*.35,x-n,ny);
    c.bezierCurveTo(x-n,ny+cr*.25,x-cr,by-cr*.45,x-cr,by);
    c.arc(x,by,cr,Math.PI,0,true);
    c.bezierCurveTo(x+cr,by-cr*.45,x+n,ny+cr*.25,x+n,ny);
    c.bezierCurveTo(x+n,ny-(ny-sh)*.35,x+w,sh+(ny-sh)*.55,x+w,sh);
    c.quadraticCurveTo(x+w,top-1,x+w+hr,top-2);c.closePath()}
  function draw(b,now){
    var t=now/1000,d,i,lens=[];
    b.stretch+=(Math.min(1,Math.abs(vel)/2.5)-b.stretch)*.06;
    if(!b.creep&&now>b.next&&b.drips.length){d=b.drips[Math.floor(hash(b.seed+now)*b.drips.length)];
      if(d.r>=.3)b.creep={d:d,start:now};b.next=now+12000+hash(now*.001+b.seed)*10000}
    for(i=0;i<b.drips.length;i++){d=b.drips[i];
      var L=d.len+(.5+.5*Math.sin(t*(.18+.12*d.r)+i*1.7))*1.5*d.r+b.stretch*(2+d.r*4);
      if(b.creep&&b.creep.d===d){var e=(now-b.creep.start)/1000,k=e<6?e/6:e<10?1:e<18?1-(e-10)/8:0;
        k=k*k*(3-2*k);L+=k*7;if(e>=18)b.creep=null}
      lens.push(L)}
    // 1. the frosting shape, in the panel's own colour
    var m=b.m.getContext('2d');m.setTransform(b.dpr,0,0,b.dpr,0,0);m.clearRect(0,0,b.W,H);m.fillStyle=b.col;
    m.beginPath();m.moveTo(-2,-2);for(var x=-2;x<=b.W+4;x+=4)m.lineTo(x,lip(b,x));m.lineTo(b.W+4,-2);m.closePath();
    for(i=0;i<b.drips.length;i++){d=b.drips[i];var top=lip(b,d.x)-3;drip(m,d.x,top,Math.min(H-14-top,lens[i]),d.hr)}
    m.fill();
    // 2. onto the page with a soft shadow underneath
    var c=b.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,b.cv.width,b.cv.height);
    c.save();c.shadowColor='rgba(40,0,20,.1)';c.shadowBlur=4*b.dpr;c.shadowOffsetY=2*b.dpr;c.drawImage(b.m,0,0);c.restore();
    // 3. the darker rim where the frosting rounds under (the shape minus itself lifted a few px)
    var s=b.s.getContext('2d');s.setTransform(1,0,0,1,0,0);s.globalCompositeOperation='source-over';s.clearRect(0,0,b.s.width,b.s.height);
    s.drawImage(b.m,0,0);s.globalCompositeOperation='destination-out';s.drawImage(b.m,0,-3*b.dpr);
    s.globalCompositeOperation='source-in';s.fillStyle='rgba(60,0,30,.08)';s.fillRect(0,0,b.s.width,b.s.height);
    c.drawImage(b.s,0,0);
    // 4. the gloss: a streak down each drip and broken streaks along the lip
    c.setTransform(b.dpr,0,0,b.dpr,0,0);c.lineCap='round';c.strokeStyle='rgba(255,255,255,.22)';
    for(i=0;i<b.drips.length;i++){d=b.drips[i];var tp=lip(b,d.x),L2=Math.min(H-14-tp+3,lens[i]);if(L2<d.hr*1.6)continue;
      c.lineWidth=d.hr*.22;c.beginPath();c.moveTo(d.x-d.hr*.7,tp+2);c.lineTo(d.x-d.hr*.3,tp-3+L2-d.hr*1.1);c.stroke()}
    c.lineWidth=1.5;c.strokeStyle='rgba(255,255,255,.16)';c.beginPath();
    for(x=8;x<b.W;x+=6){var on=hash(b.seed*3+Math.floor(x/60))>.35&&(x%60)<40;var y=lip(b,x)*.45;if(on){if((x%60)<6)c.moveTo(x,y);else c.lineTo(x,y)}}
    c.stroke()}
  function frame(now){
    var dt=Math.max(1,now-lastT);vel=vel*.85+((scrollY-lastY)/dt*16)*.15;lastY=scrollY;lastT=now;
    var any=false;for(var i=0;i<bands.length;i++){if(bands[i].on){draw(bands[i],now);any=true}}
    raf=any?requestAnimationFrame(frame):0}
  var raf=0;function kick(){if(!raf&&!still)raf=requestAnimationFrame(frame)}
  // the hero drips only under its pink half (not on phones, where the photo comes last); the cake panel drips full width
  add('.hero',{seed:3,region:function(r){var p=document.querySelector('.hero-photo'),pr=p&&p.getBoundingClientRect();
    return pr&&pr.left>r.left+r.width*.3?{x:0,w:pr.left-r.left}:null}});
  add('.cake',{seed:11});
  function relayout(){bands.forEach(function(b){layout(b);if(b.W)draw(b,performance.now())})}
  relayout();addEventListener('resize',relayout);document.fonts&&document.fonts.ready.then(relayout);
  if(still)return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){bands.forEach(function(b){if(b.box===e.target)b.on=e.isIntersecting})});kick()},{rootMargin:'100px'});
  bands.forEach(function(b){io.observe(b.box)});
})();
