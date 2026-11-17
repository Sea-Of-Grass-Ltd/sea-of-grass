/* Sizes the EYESY canvas to the pink panel and builds a mask that keeps the synth
   clear of the headline, clock and copy (Tristan, 2026-11-16). */
(function(){
  var hero=document.querySelector('.hero'),box=hero&&hero.querySelector('.hero-viz'),copy=hero&&hero.querySelector('.hero-copy'),photo=hero&&hero.querySelector('.hero-photo');
  if(!box||!copy)return;
  function fit(){
    var r=hero.getBoundingClientRect(),c=copy.getBoundingClientRect(),p=photo&&photo.getBoundingClientRect();
    var side=p&&p.left>r.left+r.width*.3, W=side?p.left-r.left:r.width;
    box.style.setProperty('--vw',W+'px');
    var x0=Math.max(0,c.left-r.left), y0=c.top-r.top, y1=c.bottom-r.top, f=90;
    // strong around the edges, gone behind the words: a horizontal and a vertical fade, intersected
    var mx='linear-gradient(to right,#000 0,#000 '+Math.max(0,x0-f)+'px,transparent '+(x0-10)+'px,transparent '+(c.right-r.left+10)+'px,#000 '+(c.right-r.left+f)+'px)';
    var my='linear-gradient(to bottom,#000 0,#000 '+Math.max(0,y0-f)+'px,transparent '+(y0-10)+'px,transparent '+(y1+10)+'px,#000 '+(y1+f)+'px)';
    box.style.setProperty('--vm',mx+','+my);
    box.style.webkitMaskComposite='source-over';box.style.maskComposite='add';
    window.EYESY&&window.EYESY.resize();
  }
  // Warren's pinks: background and foreground hues on the bakery pink (333°)
  if(window.EYESY){EYESY.S.bg=0.925;EYESY.S.fg=0.93;EYESY.S.mode=8;EYESY.S.persist=false;EYESY.reset()} // mode 8 = Glitter Bomb, kept faint
  fit();addEventListener('resize',fit);document.fonts&&document.fonts.ready.then(fit);
})();
