/* Frosting that drips off the bottom edge of Warren's flat colour panels (Tristan, 2026-11-16).
   Drip shape from the Grasset study's "drops" band, hung upside down. Not a synth: it behaves
   like frosting. Drips swell gently, stretch when you scroll fast and settle back, and every
   so often one grows heavy and lets a bead fall. Each band has its own spacing. */
(function(){
  var still=matchMedia('(prefers-reduced-motion: reduce)').matches, TAU=Math.PI*2, H=96;
  var bands=[], vel=0, lastY=scrollY, lastT=performance.now();
  function hash(a){var n=Math.sin(a*127.1)*43758.5453;return n-Math.floor(n)}
  function add(sel,opts){
    var el=document.querySelector(sel); if(!el) return;
    var box=document.createElement('div'); box.className='drips'; box.setAttribute('aria-hidden','true');
    var cv=document.createElement('canvas'); box.appendChild(cv); el.parentNode.insertBefore(box,el.nextSibling);
    bands.push({el:el,box:box,cv:cv,ctx:cv.getContext('2d'),seed:opts.seed,region:opts.region,
      W:0,X:0,dpr:1,col:getComputedStyle(el).backgroundColor,drips:[],stretch:0,next:performance.now()+4000+hash(opts.seed)*9000,bead:null,on:false});
  }
  function layout(b){
    var r=b.el.getBoundingClientRect(),reg=b.region?b.region(r):{x:0,w:r.width};
    b.box.style.display=reg?'':'none'; if(!reg) return;
    b.X=reg.x;b.W=reg.w;b.box.style.setProperty('--dl',reg.x+'px');b.box.style.setProperty('--dw',reg.w+'px');
    b.dpr=Math.min(2,devicePixelRatio||1);b.cv.width=Math.round(b.W*b.dpr);b.cv.height=Math.round(H*b.dpr);
    b.drips=[];var x=6+hash(b.seed)*12,j=0;
    while(x<b.W+20){var r1=hash(b.seed*31+j+1),r2=hash(b.seed*17+j+31);
      var hr=5+r2*4, len=r1<.2? hr*1.6+3 : hr*2+4+r1*30;
      b.drips.push({x:x,hr:hr,len:len,r:r1,heavy:0});
      x+=hr*2+10+hash(b.seed*7+j+57)*26;j++}
  }
  function drip(c,x,len,hr){ // flared where it leaves the lip, a soft neck, a fat round bead
    var fl=hr*1.5,nk=hr*.8;
    c.beginPath();c.moveTo(x-nk-fl,0);c.quadraticCurveTo(x-nk,0,x-nk,Math.min(len-hr,fl));
    c.lineTo(x-nk,len-hr*1.4);c.bezierCurveTo(x-nk,len-hr*.9,x-hr,len-hr*1.1,x-hr,len-hr*.4);
    c.arc(x,len-hr*.4,hr,Math.PI,0,true);
    c.bezierCurveTo(x+hr,len-hr*1.1,x+nk,len-hr*.9,x+nk,len-hr*1.4);
    c.lineTo(x+nk,Math.min(len-hr,fl));c.quadraticCurveTo(x+nk,0,x+nk+fl,0);c.closePath();c.fill()}
  function draw(b,now){
    var c=b.ctx,t=now/1000;c.setTransform(b.dpr,0,0,b.dpr,0,0);c.clearRect(0,0,b.W,H);c.fillStyle=b.col;
    c.fillRect(0,0,b.W,4);
    // scroll stretch: a spring toward the current scroll speed
    b.stretch+=(Math.min(1,Math.abs(vel)/2.5)-b.stretch)*.08;
    // now and then one drip grows heavy and lets go of a bead
    if(!b.bead&&now>b.next&&b.drips.length){var d=b.drips[Math.floor(hash(b.seed+now)*b.drips.length)];
      if(d.r>=.2){b.bead={d:d,start:now,phase:0}} b.next=now+10000+hash(now*.001+b.seed)*10000}
    for(var i=0;i<b.drips.length;i++){var d=b.drips[i];
      var swell=(.5+.5*Math.sin(t*(.25+.25*d.r)+i*1.7))*7*d.r;
      var len=d.len+swell+b.stretch*(8+d.r*18)*(d.r<.2?.3:1);
      if(b.bead&&b.bead.d===d&&b.bead.phase===0){var k=Math.min(1,(now-b.bead.start)/2600);len+=k*k*14;d.heavy=len;
        if(k>=1){b.bead.phase=1;b.bead.y=len-d.hr*.4;b.bead.v=0;b.bead.t0=now}}
      drip(c,d.x,Math.min(H-6,len),d.hr)}
    if(b.bead&&b.bead.phase===1){var bd=b.bead,dt=(now-bd.t0)/1000;var y=bd.y+120*dt*dt+4;
      var a=Math.max(0,1-(y-bd.y)/50);c.globalAlpha=a;c.beginPath();c.arc(bd.d.x,y,bd.d.hr*.7,0,TAU);c.fill();c.globalAlpha=1;
      if(a<=0) b.bead=null}
  }
  function frame(now){
    var dt=Math.max(1,now-lastT);vel=vel*.85+((scrollY-lastY)/dt*16)*.15;lastY=scrollY;lastT=now;
    var any=false;for(var i=0;i<bands.length;i++){if(bands[i].on){draw(bands[i],now);any=true}}
    raf=any?requestAnimationFrame(frame):0}
  var raf=0;function kick(){if(!raf&&!still)raf=requestAnimationFrame(frame)}
  // the panels: the hero drips only under its pink half (not on phones, where the photo is last); the cake panel drips full width
  add('.hero',{seed:3,region:function(r){var p=document.querySelector('.hero-photo'),pr=p&&p.getBoundingClientRect();
    return pr&&pr.left>r.left+r.width*.3?{x:0,w:pr.left-r.left}:null}});
  add('.cake',{seed:11});
  function relayout(){bands.forEach(function(b){layout(b);draw(b,performance.now())})}
  relayout();addEventListener('resize',relayout);document.fonts&&document.fonts.ready.then(relayout);
  if(still)return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){bands.forEach(function(b){if(b.box===e.target)b.on=e.isIntersecting})});kick()},{rootMargin:'100px'});
  bands.forEach(function(b){io.observe(b.box)});
})();
