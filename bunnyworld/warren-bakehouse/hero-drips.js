/* Icing drips hanging off the bottom of the pink hero panel (Tristan, 2026-11-16).
   The shape is the "drops" band from the Grasset study (a stem and a round head),
   turned upside down so it reads as icing; the drips slowly swell and settle. */
(function(){
  var box=document.querySelector('.drips'),hero=document.querySelector('.hero'),photo=hero&&hero.querySelector('.hero-photo');
  if(!box||!hero)return; var cv=box.querySelector('canvas'),ctx=cv.getContext('2d');
  var W=0,H=60,dpr=1,run=false,raf=0,still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PINK=getComputedStyle(hero).backgroundColor||'#FF9EC8', TAU=Math.PI*2;
  function hash(a){var n=Math.sin(a*127.1)*43758.5453;return n-Math.floor(n)}
  function fit(){var r=hero.getBoundingClientRect(),p=photo&&photo.getBoundingClientRect();
    W=p&&p.left>r.left+r.width*.3?p.left-r.left:r.width; box.style.setProperty('--dw',W+'px');
    dpr=Math.min(2,devicePixelRatio||1);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);draw(performance.now())}
  function drip(x,len,hr,sw){ // icing: flared where it leaves the lip, a soft neck, a fat round bead
    var fl=hr*1.5, nk=hr*.8;
    ctx.beginPath();ctx.moveTo(x-nk-fl,0);
    ctx.quadraticCurveTo(x-nk,0,x-nk,Math.min(len-hr,fl));
    ctx.lineTo(x-nk,len-hr*1.4);
    ctx.bezierCurveTo(x-nk,len-hr*.9,x-hr,len-hr*1.1,x-hr,len-hr*.4);
    ctx.arc(x,len-hr*.4,hr,Math.PI,0,true);
    ctx.bezierCurveTo(x+hr,len-hr*1.1,x+nk,len-hr*.9,x+nk,len-hr*1.4);
    ctx.lineTo(x+nk,Math.min(len-hr,fl));
    ctx.quadraticCurveTo(x+nk,0,x+nk+fl,0);ctx.closePath();ctx.fill()}
  function draw(ms){var t=ms/1000;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=PINK;
    ctx.fillRect(0,0,W,4); // the lip the drips hang from
    var x=6,j=0;
    while(x<W+20){var r=hash(j+1),r2=hash(j+31);
      var swell=.5+.5*Math.sin(t*(.25+.25*r)+j*1.7);
      var hr=5+r2*4, sw=hr*1.35, len=hr*2+4+r*30+swell*7*r;
      if(r<.2){len=hr*1.6+3}            // a few barely start
      drip(x,Math.min(H-3,len),hr,sw);
      x+=hr*2+10+hash(j+57)*26; j++}
    if(run&&!still)raf=requestAnimationFrame(draw)}
  fit();addEventListener('resize',fit);document.fonts&&document.fonts.ready.then(fit);
  if(still)return;
  new IntersectionObserver(function(e){if(e[0].isIntersecting){if(!run){run=true;raf=requestAnimationFrame(draw)}}else{run=false;cancelAnimationFrame(raf)}}).observe(box.parentNode===document.body?box:hero);
})();
