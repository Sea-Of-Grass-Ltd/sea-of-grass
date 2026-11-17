/* The hold box wears a braided-loaf plait, generated to its size by ../ornament.js (Neo-Baroque, 2026-11-17).
   Putting something on hold sends a ripple of light once round the braid. */
(function(){var c=document.querySelector('.cart');if(!c||!window.BWOrnament)return;
  var f=BWOrnament.plaitFrame(c,{depth:3,cell:innerWidth<560?7:9,width:.58,ink:'#5A0C3C',fill:'#FF9EC8'});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-add]'))setTimeout(f.ripple,60)});})();
