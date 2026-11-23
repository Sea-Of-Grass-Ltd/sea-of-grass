import { SHOPS, lockup, shortMark, round, sign, print, fitText, on, ink } from './shops.js';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches, $ = s => document.querySelector(s);

// 1 one Book button in view: the header's hides while a page one is on screen
{ const seen = new Set(), io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); document.body.classList.toggle('book-in-page', seen.size > 0); });
  document.querySelectorAll('[data-book]').forEach(b => io.observe(b)); }

// 2 sign size: the same logo twice, once through a small saved JPEG (really encoded here), once as the drawing
{ const pane = $('[data-jpeg]'), range = $('#blow'), out = $('#blow-out'), pair = $('.blow-pair');
  const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 36; c.height = 51; const x = c.getContext('2d'); x.fillStyle = '#4F0423'; x.fillRect(0,0,36,51); x.drawImage(img,0,0,36,51);
    const j = new Image(); j.onload = () => { x.drawImage(j,0,0); pane.append(c); pane.dataset.ready = 1; }; j.src = c.toDataURL('image/jpeg', .5); c.setAttribute('role','img'); c.setAttribute('aria-label','The logo as a small saved picture'); };
  img.src = '/bunnyworld/bunny-burritos/mark.svg';
  const STOPS = ['Business card','Menu','Van door','Shop sign'];
  const set = () => { const v = +range.value, k = Math.pow(11, v/100) * (pair.clientWidth > 520 ? 1.3 : 1); pair.style.setProperty('--k', k.toFixed(3)); pair.style.setProperty('--dy', (-v/100*6).toFixed(1)+'px'); out.value = STOPS[Math.min(3, Math.floor(v/25.1))]; range.setAttribute('aria-valuetext', out.value); };
  range.addEventListener('input', () => { touched = true; set(); }); let touched = false; addEventListener('resize', set); set();
  // the first time it is seen it grows once by itself, so the point is made without a drag
  if (!still) new IntersectionObserver((es,io) => { if (!es.some(e=>e.isIntersecting)) return; io.disconnect(); const t0 = performance.now()+500; const f = n => { if (touched) return; const p = Math.min(1,Math.max(0,(n-t0)/2200)); range.value = 100*(p*p*(3-2*p)); set(); if (p<1) requestAnimationFrame(f); }; requestAnimationFrame(f); },{threshold:.6}).observe(pair); }

// 3 the brand board
{ const tabs = $('.w-tabs'), board = $('.w-board'), open = $('[data-open-shop]'); let cur = -1;
  SHOPS.forEach((s,i) => { const b = document.createElement('button'); b.type='button'; b.id='wt-'+s.id; b.setAttribute('role','tab'); b.setAttribute('aria-controls','w-board'); b.textContent=s.name; b.onclick=()=>show(i); tabs.append(b); });
  tabs.addEventListener('keydown', e => { const d = e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0; if (d) { e.preventDefault(); show((cur+d+9)%9); tabs.children[cur].focus(); tabs.children[cur].scrollIntoView({block:'nearest',inline:'center'}); } });
  const cell = (c,bg,html,style='') => `<div class="w-cell ${c}" style="--c:${bg};--i:${on(bg)};${style}">${html}</div>`;
  function html(s) { const [g,,a,b,d] = s.col, uniq = [...new Set(s.col)], sg = s.id==='bunny-burritos'?'#FFC7C6':s.id==='hare-today'?'#BF1B17':s.id==='warren-bakehouse'?'#5A0C3C':s.id==='bunny-auto'?'#2A2C31':s.id==='hopwell-chiro'?'#CDD3BB':s.id==='hop-along'?'#FEF7E6':s.id==='cottontail-farm'?'#F5F5F0':s.id==='burrow-and-bough'?'#EFE3ED':'#B2CEE7';
    const ac = s.id==='long-ears'?'#B2CEE7':a, rd = s.id==='hare-today'?'#F4F3F0':s.id==='warren-bakehouse'?'#FFF6EA':s.id==='bunny-burritos'?'#FFC7C6':s.id==='hopwell-chiro'?'#E4E7DA':s.id==='bunny-auto'?'#FFFFFF':b;
    const hs = `font-family:'${s.hf}',sans-serif;font-weight:${s.hw};${s.up?'text-transform:uppercase;':''}${s.soft?`font-variation-settings:'SOFT' 100,'WONK' 1;`:''}`, pr = s.id==='hare-today'?'#BF1B17':s.id==='bunny-auto'?'#FFC000':s.id==='warren-bakehouse'?'#5A0C3C':s.id==='hopwell-chiro'?'#55646B':s.id==='long-ears'?'#07503F':s.id==='burrow-and-bough'?'#EFE3ED':s.id==='hop-along'?'#2B3D73':s.id==='cottontail-farm'?'#FFBAE9':'#E10600';
    return cell('c-logo',g,lockup(s,g)) + cell('c-short',ac,shortMark(s,ac)) + cell('c-round',rd,round(s,rd,'rp1')) + cell('c-sign',sg,sign(s,sg))
     + `<div class="w-cell c-col">${uniq.map(h=>`<span style="background:${h};color:${on(h)}">${h}</span>`).join('')}</div>`
     + cell('c-h',d,`<b style="${hs}">Aa 123</b><span>${s.hf}</span>`) + cell('c-b','#FFFFFF',`<b style="font-family:'${s.bf}',sans-serif;font-weight:500">Aa 123</b><span>${s.bf}</span>`)
     + cell('c-print',pr,print(s)) + cell('c-stick',g,`<div>${round(s,rd,'rp2')}</div>`); }
  async function show(i, quiet) { if (i === cur) return; cur = i; const s = SHOPS[i];
    [...tabs.children].forEach((t,k)=>{ t.setAttribute('aria-selected',String(k===i)); t.tabIndex = k===i?0:-1; });
    board.setAttribute('aria-labelledby','wt-'+s.id); open.href = `/bunnyworld/${s.id}/`; open.textContent = `Walk into ${s.name} →`;
    try { await Promise.race([Promise.all([`${s.hw} 40px "${s.hf}"`,`500 40px "${s.bf}"`].map(f=>document.fonts.load(f))), new Promise(r=>setTimeout(r,1200))]); } catch {}
    if (cur !== i) return;
    const flip = !quiet && !still && board.children.length;
    if (flip) await Promise.all([...board.children].map((c,k)=>c.animate([{transform:'none'},{transform:'rotateX(-90deg)'}],{duration:170,delay:k*18,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{})));
    if (cur !== i) return;
    board.innerHTML = html(s); fitText(board);
    if (flip) [...board.children].forEach((c,k)=>c.animate([{transform:'rotateX(90deg)'},{transform:'rotateX(-7deg)',offset:.72},{transform:'none'}],{duration:380,delay:k*26,easing:'ease-out',fill:'backwards'})); }
  show(0,true); document.fonts?.ready.then(()=>fitText(board)); }

// 4 the sticker sheet: a tap peels one back along a straight fold (the fold is the mirror line, so the paper back is true)
{ const sheet = $('.sheet'), rt = $('.kit-read b'), rp = $('.kit-read p'), S = SHOPS[0], g='#4F0423', r='#E10600', p='#FFC7C6', dk='#260212';
  const sv = (bg,inner) => `<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="${bg}"/>${inner}</svg>`;
  const M = (x,y,w,h) => `<image href="${S.mark}" x="${x}" y="${y}" width="${w}" height="${h}"/>`, A = `font-family="Anton,sans-serif"`;
  const IT = [
   ['Your logo','The main one, drawn by hand for your shop, in every file type a printer or web page will ask for.',sv(g,M(38,8,44,64)+`<text x="60" y="106" text-anchor="middle" ${A} font-size="23" fill="${r}">BURRITOS</text>`),16],
   ['Short version','The small one, for a pen, a button or the corner of a menu.',sv(p,M(26,12,68,96)),16],
   ['Round version','The one that fits a circle, so it sits right on a profile picture or a cup lid.',`<svg viewBox="0 0 200 200" aria-hidden="true">${round(S,p,'rp3').replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>`,50],
   ['Your colours','Two or three, with the exact numbers for print, paint and screens.',sv(g,`<rect width="40" height="120" fill="${g}"/><rect x="40" width="40" height="120" fill="${r}"/><rect x="80" width="40" height="120" fill="${p}"/>`),16],
   ['Two fonts','One for big words and one for reading, picked to go together.',sv('#fff',`<text x="60" y="84" text-anchor="middle" ${A} font-size="70" fill="${dk}">Aa</text>`),16],
   ['One-page brand sheet','Everything on one page, so anyone who works for you can get it right.',sv('#fff',`<rect x="14" y="14" width="92" height="30" fill="${g}"/>${M(52,16,16,26)}<rect x="14" y="52" width="28" height="22" fill="${r}"/><rect x="46" y="52" width="28" height="22" fill="${p}"/><rect x="78" y="52" width="28" height="22" fill="${dk}"/><text x="14" y="104" ${A} font-size="26" fill="${dk}">Aa Bb</text>`),8],
   ['Sign file','Ready to send to the sign shop at whatever size they need.',sv(p,`<path d="M16 20H104M34 20V36M86 20V36" stroke="${dk}" stroke-width="5"/><rect x="18" y="36" width="84" height="60" fill="${g}"/><text x="60" y="76" text-anchor="middle" ${A} font-size="25" fill="${r}">BUNNY</text>`),16],
   ['Menu or price list','Laid out and ready to print.',sv(r,`<rect x="32" y="14" width="56" height="92" fill="#fff"/><rect x="32" y="14" width="56" height="24" fill="${g}"/>${[52,66,80,94].map(y=>`<path d="M40 ${y}H66M74 ${y}H80" stroke="${dk}" stroke-width="3"/>`).join('')}`),16],
   ['Business card','Front and back, ready for the printer.',sv(g,`<rect x="16" y="36" width="88" height="52" fill="#fff"/>${M(24,44,24,36)}<path d="M58 56H94M58 66H88" stroke="${dk}" stroke-width="3"/>`),16],
   ['Profile pictures','Sized for the places people look you up.',sv(dk,M(28,14,64,92)),50],
   ['A sticker','A file you can have printed and hand out at the counter.',sv(r,`<circle cx="60" cy="60" r="44" fill="#fff"/><circle cx="60" cy="60" r="39" fill="${g}"/>${M(40,30,40,58)}`),50],
   ['Yours outright','You own every file from day one.',sv('#fff',`<text x="60" y="58" text-anchor="middle" ${A} font-size="34" fill="${r}">ALL</text><text x="60" y="96" text-anchor="middle" ${A} font-size="34" fill="${r}">YOURS</text>`),16] ];
  let openEl = null; const BIG = 9999;
  IT.forEach(([t,d,art,rad]) => { const b = document.createElement('button'); b.type='button'; b.className='st'; b.style.setProperty('--r',rad+'%'); b.setAttribute('aria-label',t); b.setAttribute('aria-pressed','false');
    b.innerHTML = `<span class="slot"></span><span class="fw"><span class="face">${art}</span></span><span class="bw"><span class="back"></span></span>`; sheet.append(b);
    const st = { el:b, f:0, to:0, t, d, fw:b.querySelector('.fw'), bw:b.querySelector('.bw'), back:b.querySelector('.back') }; b._st = st; paint(st);
    b.addEventListener('pointerenter',()=>{ if (st!==openEl) go(st,.16); }); b.addEventListener('pointerleave',()=>{ if (st!==openEl) go(st,0); });
    b.addEventListener('click',()=>{ const was = openEl; if (was && was!==st) { was.el.setAttribute('aria-pressed','false'); go(was,0); }
      if (was===st) { openEl=null; b.setAttribute('aria-pressed','false'); go(st,0); } else { openEl=st; b.setAttribute('aria-pressed','true'); go(st,.3); rt.textContent=t; rp.textContent=d; } }); });
  // f = how far the fold has come in from the bottom-right corner (0 flat, 1 all the way off)
  function paint(st) { const s = st.el.clientWidth || 100, D = 2*s*(1-st.f);
    if (st.f < .004) { st.fw.style.clipPath='none'; st.bw.style.display='none'; return; }
    st.fw.style.clipPath = `polygon(${D+BIG}px ${-BIG}px,${D-BIG}px ${BIG}px,${-BIG}px ${-BIG}px)`;
    st.bw.style.display=''; st.bw.style.filter='drop-shadow(-2px -2px 3px rgba(26,21,48,.35))';
    st.back.style.transformOrigin='0 0'; st.back.style.transform=`matrix(0,-1,-1,0,${D},${D})`;
    st.back.style.clipPath = `polygon(${D+BIG}px ${-BIG}px,${D-BIG}px ${BIG}px,${BIG}px ${BIG}px)`; }
  function go(st,to) { st.to=to; if (still) { st.f=to; paint(st); return; } if (st.raf) return; const tick=()=>{ st.f += (st.to-st.f)*.2; if (Math.abs(st.to-st.f)<.003) { st.f=st.to; st.raf=0; paint(st); return; } paint(st); st.raf=requestAnimationFrame(tick); }; st.raf=requestAnimationFrame(tick); }
  addEventListener('resize',()=>[...sheet.children].forEach(b=>paint(b._st)));
  new IntersectionObserver((es,io)=>{ if (es.some(e=>e.isIntersecting)) { io.disconnect(); if (!openEl) sheet.children[0].click(); } },{threshold:.5}).observe(sheet); }

// 5 the price card: its two ways to pay, and the edge lights once when it is reached
{ const tabs=[...document.querySelectorAll('.u-tabs [role=tab]')], pick=(t,f)=>{ tabs.forEach(x=>{ const o=x===t; x.setAttribute('aria-selected',String(o)); x.tabIndex=o?0:-1; document.getElementById(x.getAttribute('aria-controls')).hidden=!o; }); if (f) t.focus(); };
  tabs.forEach((t,i)=>{ t.onclick=()=>pick(t); t.addEventListener('keydown',e=>{ const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0; if (d) { e.preventDefault(); pick(tabs[(i+d+tabs.length)%tabs.length],true); } }); });
  const card=$('.price-band'); new IntersectionObserver((es,io)=>{ if (es.some(e=>e.isIntersecting)) { io.disconnect(); card.classList.add('lit'); } },{threshold:.35}).observe(card); }
addEventListener('load',()=>requestAnimationFrame(()=>dispatchEvent(new Event('resize'))));
