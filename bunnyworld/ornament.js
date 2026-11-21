/* Bunny World ornament generator (Neo-Baroque, 2026-11-17).
   Frames are generated live from the element they sit on, never drawn as pictures, so they fit any
   size and redraw when the box changes. First piece: the plait frame.

   plaitFrame: Tristan's plait-and-break (~/Desktop/Traditional Art/plait-and-break.html), turned into
   a border. The lattice covers the whole box; a ring of breaks along the inner edge sends every cord
   back out, so the plait runs round the box and turns its own corners (P26: the run turning the
   corner). Nodes are integer points with x+y odd; a cord steps diagonally, reflects off the frame
   and off breaks, and is over at a node when (going "\" and x even) or (going "/" and x odd), so the
   crossings alternate on their own (P10). Members are banded: an ink outline, then the body (P09, P30).
   The repeat is fitted to the box in whole cells (P25), and the frame is redrawn on resize.

   Dials: depth (cells deep), cell (target px), width (band as a fraction of the cell),
   round (corner rounding), ink, fill. */
(function(){
  var NS='http://www.w3.org/2000/svg', still=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function plaitFrame(el,o){
    o=Object.assign({depth:3,cell:7,width:.62,round:.5,ink:'#5A0C3C',fill:'#FF9EC8',pad:0},o||{});
    var svg=document.createElementNS(NS,'svg');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','orn-plait');
    el.insertBefore(svg,el.firstChild);
    var last='',strands=[],sx=1,sy=1,P0=0;
    function draw(){
      var W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;var k=W+'x'+H;if(k===last)return;last=k;
      // nodes are the points with x+y ODD on an even lattice, and the inner edge sits D in on every side:
      // then neither the outer corners nor the inner corners fall on a node, so no cord ever has to turn
      // straight back on itself, and every cord meeting an edge turns cleanly
      var Dy=o.depth,Dx=o.depth,pad=o.pad+o.cell*.55,ev=function(n){n=Math.round(n);return n&1?n+1:n};
      var Nx=Math.max(2*Dx+2,ev((W-2*pad)/o.cell)),Ny=Math.max(2*Dy+2,ev((H-2*pad)/o.cell));
      sx=(W-2*pad)/Nx;sy=(H-2*pad)/Ny;P0=pad;
      var brk={};
      for(var x=0;x<=Nx;x++)for(var y=0;y<=Ny;y++){if(!((x+y)&1))continue;
        if((y===Dy||y===Ny-Dy)&&x>Dx&&x<Nx-Dx)brk[x+','+y]='H';
        else if((x===Dx||x===Nx-Dx)&&y>Dy&&y<Ny-Dy)brk[x+','+y]='V'}
      var inside=function(x,y){return x>Dx&&x<Nx-Dx&&y>Dy&&y<Ny-Dy};
      strands=trace(Nx,Ny,brk).filter(function(s){return !s.some(function(p){return inside(p[0],p[1])})});
      var bw=Math.min(sx,sy)*2*o.width*.5,out=Math.max(1.6,bw*.32),r=o.round,h='';
      var crossing=function(x,y){return x>0&&x<Nx&&y>0&&y<Ny&&!brk[x+','+y]};
      var px=function(p){return [P0+p[0]*sx,P0+p[1]*sy]};
      var d=function(pts,closed){var s='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
        for(var i=1;i<pts.length;i++)s+='L'+pts[i][0].toFixed(1)+' '+pts[i][1].toFixed(1);return closed?s+'Z':s};
      var band=function(pts,closed,cap){var dd=d(pts,closed),c=cap?' stroke-linecap="'+cap+'"':'';
        return '<path d="'+dd+'" stroke="'+o.ink+'" stroke-width="'+(bw+out).toFixed(2)+'"'+c+'/><path d="'+dd+'" stroke="'+o.fill+'" stroke-width="'+bw.toFixed(2)+'"'+c+'/>'};
      strands.forEach(function(s){h+=band(roundPath(s,r,true,px),true)});
      // the over-passes laid back on top at every crossing: a short straight piece through the node,
      // with flat ends so it melts into its own cord, and the cord going under shows cut on either side
      var ov='';
      strands.forEach(function(s){var L=s.length;
        for(var i=0;i<L;i++){var c=s[i],nx=s[(i+1)%L];
          if(!crossing(c[0],c[1]))continue;var dx=nx[0]-c[0],dy=nx[1]-c[1];
          if((dx===dy)!==(c[0]%2===0))continue;
          var seg=function(e){return d([px([c[0]-dx*e,c[1]-dy*e]),px(c),px([c[0]+dx*e,c[1]+dy*e])],false)};
          ov+='<path d="'+seg(.4)+'" stroke="'+o.ink+'" stroke-width="'+(bw+out).toFixed(2)+'" stroke-linecap="butt"/><path d="'+seg(.5)+'" stroke="'+o.fill+'" stroke-width="'+bw.toFixed(2)+'" stroke-linecap="butt"/>'}});
      h+=ov;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);
      svg.innerHTML='<g fill="none" stroke-linejoin="round" stroke-linecap="round">'+h+'</g><g class="orn-ripple" fill="none" stroke-linecap="round"></g>';
    }
    // something put on hold: a ripple of light runs round the braid once
    function ripple(){
      if(still||!strands.length)return;var g=svg.querySelector('.orn-ripple');if(!g)return;
      var px=function(p){return [P0+p[0]*sx,P0+p[1]*sy]},bw=Math.min(sx,sy)*o.width*.45;
      g.innerHTML='';strands.forEach(function(s){
        var pts=roundPath(s,o.round,true,px),p=document.createElementNS(NS,'path'),dd='M'+pts.map(function(q){return q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('L')+'Z';
        p.setAttribute('d',dd);p.setAttribute('stroke','#FFF6EA');p.setAttribute('stroke-width',bw.toFixed(2));p.setAttribute('stroke-opacity','.8');g.appendChild(p);
        var L=p.getTotalLength();p.style.strokeDasharray='60 '+L;
        p.animate([{strokeDashoffset:60},{strokeDashoffset:-L}],{duration:1600,easing:'ease-in-out'}).onfinish=function(){p.remove()}})}
    // redraw whenever the box changes size or its contents change (a frame on the next paint, so the
    // layout has settled), and once more after fonts load
    var q=0,soon=function(){if(!q)q=requestAnimationFrame(function(){q=0;draw()})};
    new ResizeObserver(soon).observe(el);
    new MutationObserver(function(){setTimeout(soon,30)}).observe(el,{childList:true,subtree:true,characterData:true});
    if(document.fonts)document.fonts.ready.then(soon);
    addEventListener('load',soon);draw();
    return {redraw:function(){last='';draw()},ripple:ripple};
  }

  // every closed cord, from plait-and-break: seed only states whose predecessor is on the panel,
  // and mark a cord's mirror traversal only after walking it
  function trace(Nx,Ny,brk){
    var seen={},out=[],dirs=[[1,1],[1,-1],[-1,1],[-1,-1]];
    var di=function(dx,dy){for(var i=0;i<4;i++)if(dirs[i][0]===dx&&dirs[i][1]===dy)return i};
    var exit=function(x,y,dx,dy){var b=brk[x+','+y];if(b==='H')dy=-dy;else if(b==='V')dx=-dx;
      if(x+dx<0||x+dx>Nx)dx=-dx;if(y+dy<0||y+dy>Ny)dy=-dy;return [dx,dy]};
    for(var x=0;x<=Nx;x++)for(var y=0;y<=Ny;y++){if(!((x+y)&1))continue;
      for(var d0=0;d0<4;d0++){if(seen[x+','+y+':'+d0])continue;
        var qx=x-dirs[d0][0],qy=y-dirs[d0][1];if(qx<0||qx>Nx||qy<0||qy>Ny)continue;
        var path=[],vis=[],cx=x,cy=y,dx=dirs[d0][0],dy=dirs[d0][1],g=0;
        while(g++<20000){var dd=di(dx,dy);if(cx===x&&cy===y&&dd===d0&&path.length)break;
          var e=exit(cx,cy,dx,dy);path.push([cx,cy]);vis.push([cx,cy,dd,e[0],e[1]]);cx+=e[0];cy+=e[1];dx=e[0];dy=e[1]}
        vis.forEach(function(v){seen[v[0]+','+v[1]+':'+v[2]]=1;seen[v[0]+','+v[1]+':'+di(-v[3],-v[4])]=1});
        if(path.length>2)out.push(path)}}
    return out;
  }
  // round the 90-degree turns with a quadratic through the node; straight-through nodes stay
  function roundPath(nodes,r,closed,px){
    var out=[],L=nodes.length,lo=closed?0:1,hi=closed?L:L-1;if(!closed)out.push(px(nodes[0]));
    for(var i=lo;i<hi;i++){var a=nodes[(i-1+L)%L],c=nodes[i],b=nodes[(i+1)%L];
      var v1=[c[0]-a[0],c[1]-a[1]],v2=[b[0]-c[0],b[1]-c[1]];
      if(v1[0]===v2[0]&&v1[1]===v2[1]){out.push(px(c));continue}
      var pa=px([c[0]-v1[0]*r,c[1]-v1[1]*r]),pb=px([c[0]+v2[0]*r,c[1]+v2[1]*r]),pc=px(c);out.push(pa);
      for(var t=1;t<=8;t++){var u=t/9,k=1-u;out.push([k*k*pa[0]+2*k*u*pc[0]+u*u*pb[0],k*k*pa[1]+2*k*u*pc[1]+u*u*pb[1]])}
      out.push(pb)}
    if(!closed)out.push(px(nodes[L-1]));return out;
  }
  window.BWOrnament={plaitFrame:plaitFrame};
})();
