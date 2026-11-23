// The nine Bunny World demo brands, as they already are on their own pages (bunnyworld/*/style.css and index.html):
// wordmarks, colours and type are lifted from there; only the short and round marks and the printed pieces are new.
// col: [ground, ink on ground, accent, second, dark]. Names of the colours stay out: the hex is what a printer needs.
export const SHOPS = [
 { id:'bunny-burritos', name:'Bunny Burritos', trade:'Restaurant', col:['#4F0423','#FFFFFF','#E10600','#FFC7C6','#260212'], hf:'Anton', hw:400, up:1, bf:'Work Sans', logo:['Bunny','Burritos'], lc:'#E10600', mark:'/bunnyworld/bunny-burritos/mark.svg', short:'BB', sign:'arch', print:{k:'list',t:'Menu',rows:[['Al pastor tacos','$11'],['Chips & three salsas','$5.50'],['Horchata, large','$4']]} },
 { id:'hare-today', name:'Hare Today', trade:'Barbershop', col:['#0D0D0D','#F4F3F0','#BF1B17','#F4F3F0','#0D0D0D'], hf:'Big Shoulders Display', hw:900, up:1, bf:'Inter', logo:['Hare Today'], lc:'#F4F3F0', mark:'/bunnyworld/hare-today/brand/mark-paper.svg', markInk:'/bunnyworld/hare-today/brand/mark-ink.svg', short:'HT', sign:'rect', print:{k:'list',t:'Prices',rows:[['The Cut','$38'],['Skin Fade','$42'],['Head Shave','$35'],['Beard Trim','$22']]} },
 { id:'hopwell-chiro', name:'Hopwell', trade:'Chiropractor', col:['#D7D7CB','#192830','#CDD3BB','#55646B','#192830'], hf:'Albert Sans', hw:400, bf:'Figtree', logo:['hopwell'], lc:'#192830', short:'h', sign:'round', print:{k:'card',t:'Your next visit',rows:['Day','Time']} },
 { id:'bunny-auto', name:'Bunny Auto', trade:'Auto repair', col:['#111214','#FFFFFF','#FFC000','#A7A9AE','#000000'], hf:'Barlow Condensed', hw:700, up:1, bf:'Barlow', logo:['Bunny Auto'], lc:'#FFC000', ls:.16, short:'BA', sign:'rect', print:{k:'list',t:'Service',rows:[['Oil & filter change','$59'],['Tire rotation','$49'],['Brake pads, one axle','$189']]} },
 { id:'warren-bakehouse', name:'The Warren', trade:'Bakery', col:['#5A0C3C','#FFF6EA','#FF9EC8','#FFF6EA','#008168'], hf:'Young Serif', hw:400, bf:'Inclusive Sans', logo:['The Warren','Bakehouse'], lc:'#FFF6EA', short:'W', sign:'arch', print:{k:'bag'} },
 { id:'hop-along', name:'Hop Along', trade:'Brewery', col:['#ACD084','#0E0E0E','#2B3D73','#FEF7E6','#2B3D73'], hf:'Fraunces', hw:900, soft:1, bf:'Archivo', logo:['Hop','Along'], lc:'#0E0E0E', short:'HA', sign:'round', print:{k:'glass'} },
 { id:'cottontail-farm', name:'Cottontail Farm', trade:'Farm festival', col:['#F05537','#161719','#FFBAE9','#F5F5F0','#161719'], hf:'Gabarito', hw:900, bf:'Hanken Grotesk', logo:['Cottontail','Farm'], lc:'#161719', short:'C', sign:'rect', print:{k:'ticket'} },
 { id:'burrow-and-bough', name:'Burrow & Bough', trade:'Gift shop', col:['#F7F7F8','#220A33','#9E39E5','#EFE3ED','#220A33'], hf:'Newsreader', hw:600, bf:'Instrument Sans', logo:['Burrow','& Bough'], lc:'#220A33', short:'B&B', sign:'round', print:{k:'tag'} },
 { id:'long-ears', name:'Long Ears', trade:'Landscaping', col:['#07503F','#E8FE85','#B2CEE7','#E8FE85','#07503F'], hf:'Bricolage Grotesque', hw:800, bf:'Hanken Grotesk', logo:['long','ears'], lc:'#E8FE85', short:'le', sign:'rect', print:{k:'yard'} }
];
const lum = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
export const on = h => lum(h) > .22 ? '#14121F' : '#FFFFFF';
export const ink = (s,bg) => [s.lc,s.col[1],s.col[2],s.col[4]].find(c => ratio(c,bg) >= 3) || on(bg);
const esc = t => t.replace(/&/g,'&amp;');
const tx = (s,t) => esc(s.up ? t.toUpperCase() : t);
const face = s => `font-family="'${s.hf}',sans-serif" font-weight="${s.hw}"${s.soft?` style="font-variation-settings:'SOFT' 100,'WONK' 1"`:''}`;
// a line of the shop's lettering, sized to sit inside w (the width is measured after the fonts are in: fitText)
const line = (s,t,x,y,w,max,fill) => `<text class="fit" data-w="${w}" data-max="${max}" x="${x}" y="${y}" text-anchor="middle" font-size="${max}" ${face(s)} fill="${fill}"${s.ls?` letter-spacing="${s.ls}em"`:''}>${tx(s,t)}</text>`;
const markOn = (s,bg) => s.mark && (lum(bg) > .3 && s.markInk ? s.markInk : s.mark);
export function lockup(s,bg) {
  const c = ink(s,bg), m = markOn(s,bg), n = s.logo.length, W = 320;
  const top = m ? 112 : 0, lh = n > 1 ? 66 : 74, H = top + n*lh + 18;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.name)} logo">${m?`<image href="${m}" x="${W/2-50}" y="0" width="100" height="104" preserveAspectRatio="xMidYMid meet"/>`:''}${s.logo.map((t,i)=>line(s,t,W/2,top+(i+1)*lh-6,W-16,n>1?66:76,c)).join('')}</svg>`;
}
export function shortMark(s,bg) {
  const m = markOn(s,bg); const c = ink(s,bg);
  return m ? `<svg viewBox="0 0 120 120" role="img" aria-label="Short logo"><image href="${m}" x="14" y="8" width="92" height="104" preserveAspectRatio="xMidYMid meet"/></svg>`
   : `<svg viewBox="0 0 120 120" role="img" aria-label="Short logo">${line(s,s.short,60,s.short.length>2?78:88,104,s.short.length>2?56:84,c).replace(/letter-spacing="[^"]*"/,'')}</svg>`;
}
export function round(s,bg,id) {
  const c = ink(s,bg), inner = c, txt = on(c) === '#FFFFFF' && ratio(c,bg) < 3 ? '#fff' : bg;
  const around = tx(s,s.name), m = markOn(s,c);
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Round logo"><circle cx="100" cy="100" r="96" fill="${inner}"/><circle cx="100" cy="100" r="60" fill="none" stroke="${txt}" stroke-width="2.5"/><defs><path id="${id}" d="M100 100 m-71 0 a71 71 0 1 1 142 0 a71 71 0 1 1 -142 0"/></defs><text font-size="21" ${face(s)} fill="${txt}" textLength="436" lengthAdjust="spacing"><textPath href="#${id}" startOffset="0">${around} · ${around} · </textPath></text><text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-size="${s.short.length>2?38:56}" ${face(s)} fill="${txt}">${tx(s,s.short)}</text></svg>`;
}
export function sign(s, wall) {
  const [g,,a,,d] = s.col, bd = s.id==='hare-today'?'#F4F3F0':s.id==='warren-bakehouse'?'#FFF6EA':s.id==='bunny-auto'?'#FFC000':s.id==='hopwell-chiro'?'#192830':s.id==='burrow-and-bough'?'#9E39E5':s.id==='long-ears'?'#E8FE85':s.id==='cottontail-farm'?'#161719':s.id==='hop-along'?'#2B3D73':'#260212';
  const c = s.id==='hopwell-chiro'?'#D7D7CB':s.id==='burrow-and-bough'?'#F7F7F8':s.id==='hop-along'?'#ACD084':s.id==='cottontail-farm'?'#FFBAE9':s.id==='bunny-burritos'?'#E10600':d==='#000000'?'#000000':d;
  const iron = lum(wall) > .12 ? '#14121F' : '#E9E4DA';
  const shape = s.sign==='round' ? `<circle cx="214" cy="176" r="102" fill="${bd}"/><circle cx="214" cy="176" r="92" fill="none" stroke="${c}" stroke-width="3"/>`
   : s.sign==='arch' ? `<path d="M100 282V170a114 100 0 0 1 228 0v112z" fill="${bd}"/><path d="M111 271V170a103 89 0 0 1 206 0v101z" fill="none" stroke="${c}" stroke-width="3"/>`
   : `<rect x="84" y="92" width="260" height="168" rx="4" fill="${bd}"/><rect x="94" y="102" width="240" height="148" fill="none" stroke="${c}" stroke-width="3"/>`;
  const n = s.logo.length, w = s.sign==='round'?(s.logo.length>1?136:150):s.sign==='arch'?156:200, fs = s.sign==='round'?48:s.sign==='arch'?50:60, cy = s.sign==='arch'?196:176, lh = fs*.98;
  const top = s.sign==='round'?74:s.sign==='arch'?70:92;
  return `<svg viewBox="0 0 400 300" role="img" aria-label="${esc(s.name)} hanging sign"><g fill="none" stroke="${iron}" stroke-width="7"><path d="M24 26V126"/><path d="M24 44H346"/><path d="M24 112C60 112 92 88 92 44"/></g><g stroke="${iron}" stroke-width="4"><path d="M150 44V${top+(s.sign==='round'?24:s.sign==='arch'?18:0)}"/><path d="M278 44V${top+(s.sign==='round'?24:s.sign==='arch'?18:0)}"/></g>${shape}${s.logo.map((t,i)=>line(s,t,214,cy+(i-(n-1)/2)*lh+fs*.34,w,fs,c)).join('')}</svg>`;
}
export function print(s) {
  const p = s.print, [g,,a,b,d] = s.col, bf = `font-family="'${s.bf}',sans-serif"`;
  const paper = '#FFFFFF', k = lum(d) < .25 ? d : '#14121F';
  const body = {
   list: () => `<rect x="30" y="14" width="200" height="292" fill="${paper}"/><rect x="30" y="14" width="200" height="74" fill="${g}"/>${line(s,s.name,130,62,170,36,ink(s,g))}<text x="48" y="122" font-size="20" ${face(s)} fill="${k}">${tx(s,p.t)}</text>${p.rows.map(([t,v],i)=>`<g ${bf} font-size="12.5" fill="${k}"><text x="48" y="${156+i*34}">${esc(t)}</text><text x="212" y="${156+i*34}" text-anchor="end" font-weight="700">${v}</text></g><path d="M48 ${166+i*34}H212" stroke="${k}" stroke-opacity=".22"/>`).join('')}`,
   card: () => `<rect x="18" y="78" width="224" height="148" rx="3" fill="#F4F4EC"/>${line(s,'hopwell',130,130,150,40,k)}<g ${bf} font-size="13" fill="${k}"><text x="40" y="168">${p.t}</text>${p.rows.map((t,i)=>`<text x="${40+i*98}" y="196" fill="#55646B" font-size="11">${t}</text><path d="M${40+i*98} 212h84" stroke="${k}"/>`).join('')}</g>`,
   bag: () => `<path d="M52 70L208 70 222 306H38z" fill="#FFF6EA"/><path d="M52 70l10-34 12 10 14-12 14 12 14-12 14 12 14-12 14 12 14-12 14 12 10-10 12 34z" fill="#EFE0D2"/><path d="M52 70H208" stroke="#5A0C3C" stroke-opacity=".25"/>${line(s,'The Warren',130,178,128,40,'#5A0C3C')}${line(s,'Bakehouse',130,214,128,40,'#5A0C3C')}`,
   glass: () => `<path d="M76 40H184L170 290H90z" fill="#FEF7E6"/><path d="M79 84H181L171 284H89z" fill="#E3A93C"/><path d="M76 40H184L181 92Q160 104 130 92T79 92z" fill="#FFFDF6"/>${line(s,'Hop',130,180,72,44,'#2B3D73')}${line(s,'Along',130,218,72,44,'#2B3D73')}`,
   ticket: () => `<path d="M62 24H198V100a12 12 0 0 0 0 24V296H62V124a12 12 0 0 0 0-24z" fill="#F5F5F0"/><path d="M78 112H182" stroke="#161719" stroke-dasharray="5 6"/>${line(s,'Admit one',130,74,104,26,'#161719')}${line(s,'Cottontail',130,176,108,40,'#F05537')}${line(s,'Farm',130,214,108,40,'#F05537')}<text x="130" y="262" text-anchor="middle" ${bf} font-size="12" fill="#161719">Harvest Festival</text>`,
   tag: () => `<path d="M130 24L206 84V296H54V84z" fill="#9E39E5"/><circle cx="130" cy="72" r="9" fill="${g}"/><path d="M130 72C118 34 150 18 134 0" fill="none" stroke="#220A33" stroke-width="3"/>${line(s,'Burrow',130,176,124,40,'#F7F7F8')}${line(s,'& Bough',130,214,124,40,'#F7F7F8')}<path d="M78 262H182" stroke="#F7F7F8" stroke-opacity=".7"/>`,
   yard: () => `<path d="M82 180V306M178 180V306" stroke="#E9E4DA" stroke-width="6"/><rect x="22" y="56" width="216" height="140" fill="#E8FE85"/>${line(s,'long ears',130,136,180,56,'#07503F')}<text x="130" y="168" text-anchor="middle" ${bf} font-size="14" font-weight="600" fill="#07503F">Landscaping</text>`
  }[p.k]();
  const label = {list:p.t,card:'appointment card',bag:'bread bag',glass:'pint glass',ticket:'ticket',tag:'gift tag',yard:'yard sign'}[p.k];
  return `<svg viewBox="0 0 260 320" role="img" aria-label="${esc(s.name)} ${label}">${body}</svg>`;
}
// shrink each line until it fits its width
export function fitText(root) {
  root.querySelectorAll('text.fit').forEach(t => { t.setAttribute('font-size', t.dataset.max); const w = t.getComputedTextLength(); if (w > +t.dataset.w) t.setAttribute('font-size', (+t.dataset.max * t.dataset.w / w).toFixed(2)); });
}
