// Bunny Auto kit. Every piece reads bunny-auto-*.svg
const bau=(v,s='')=>`<img class="ba" style="${s}" src="bunny-auto-${v}.svg" alt="">`;
const baPis=`<path d="M-20-130A20 20 0 0 1 20-130V-130H-20Z"/><path d="M-20-126H20V-118H-20Z"/><path d="M-20-114H20V-70H12V-80A12 12 0 0 0-12-80V-70H-20Z"/><path d="M-8-20V-80A8 8 0 0 1 8-80V-20Z"/>`;
const baRun=`<svg class="barun" viewBox="-96 -162 192 226" role="img" aria-label="The two pistons pump"><g transform="rotate(-20)"><g class="p1">${baPis}</g></g><g transform="rotate(20)"><g class="p2">${baPis}</g></g><circle r="60" fill="#FFC000"/><circle r="56"/><g class="pin"><circle r="12" fill="#FFC000"/></g></svg>`;
const baRow=(n,d,p)=>`<div class="bar"><b>${n}</b><b>${p}</b><i>${d}</i></div>`;
const baPat=(()=>{let s='';for(let y=0;y<3;y++)for(let x=0;x<8;x++){const f=(x+y)%2;s+=`<g transform="translate(${x*48+24} ${y*80+(f?9:82)}) scale(.5 ${f?-.5:.5})" fill="#FFC000">${baPis}</g>`}return `<svg viewBox="0 0 336 224" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="260" fill="#000"/>${s}</svg>`})();
const KIT_BUNNYAUTO=[
['Your logo',`<div class="by by1 byc" style="aspect-ratio:1.5">${bau('stack-black','width:82cqw')}</div>`],
['On one line',`<div class="by by0 byc" style="aspect-ratio:1.5">${bau('line-yellow','width:84cqw')}</div>`],
['A short version',`<div class="by by1 byc" style="aspect-ratio:1.5">${bau('mark-black','height:54cqw')}</div>`],
['It runs, for screens',`<div class="by by1 byc" style="aspect-ratio:1.5">${baRun}</div>`],
['For very small places',`<div class="by by0 bysm">${bau('small-yellow','width:34cqw')}${bau('small-yellow','width:17cqw')}${bau('small-yellow','width:9cqw')}</div>`],
['In one color',`<div class="by by2"><div style="background:#fff">${bau('stack-black')}</div><div style="background:#000">${bau('stack-white')}</div></div>`],
['Your colors',`<div class="by bycol"><i style="background:#FFC000;color:#000"><b>Yellow</b>#FFC000</i><i style="background:#000;color:#fff"><b>Black</b>#000000</i><i style="background:#fff;color:#000"><b>White</b>#FFFFFF</i></div>`],
['One font, two jobs',`<div class="by byf"><b>We fix what is broken and tell you what can wait.</b><em>Barlow Condensed Bold, for headlines</em><div>The final price is on the ticket you sign.</div><em>Barlow Medium, for the rest</em></div>`],
['The bay door',`<div class="by bydoor"><div>${bau('mark-black')}</div><u></u><u></u><u></u><u></u></div>`],
['The sign on the road',`<div class="by byroad"><div>${bau('stack-black')}</div><s></s></div>`],
['A pattern, for the shop rags',`<div class="by bypat">${baPat}</div>`],
['The price board',`<div class="by bymn"><div class="byhd">${bau('mark-black')}<span>Starting prices</span></div><div class="byl">${baRow('Oil &amp; filter change','Synthetic blend, up to 5 qt. 30 min','$59')+baRow('Brake pads, one axle','Lifetime warranty on the pads. 90 min','$189')+baRow('Tire rotation &amp; balance','All four, with a tread report. 45 min','$49')+baRow('Check engine scan','Explained in plain words. 30 min','$89')+baRow('Battery','Tested for free, replaced if it needs it. 30 min','$149')+baRow('A/C recharge','Leaks checked first. 60 min','$129')}</div><div class="byft">2 year parts and labor warranty</div></div>`],
['A key tag',`<div class="by by0 byc" style="aspect-ratio:1.5"><div class="bytag"><u></u>${bau('mark-black')}</div></div>`],
['A business card',`<div class="by by2c"><div class="bycd by1">${bau('mark-black')}</div><div class="bycd by0">${bau('line-yellow')}<div>88 Warren Rd, Berthoud<br>(970) 555-0177<br>Doors open at 7:30 on weekdays</div></div></div>`],
['Profile pictures',`<div class="by bypf"><div class="by1">${bau('mark-black')}</div><div class="by0">${bau('mark-yellow')}</div><div style="background:#fff">${bau('mark-black')}</div></div>`],
['One page that says why it looks the way it does',`<div class="by bywhy"><div class="by1">${bau('mark-black','width:58%')}</div><div class="byy"><h4>Why the engine has ears</h4><ol><li><b>The V-twin</b>Two pistons and a crank. It&rsquo;s an engine first, and then you see who it is.</li><li><b>The ears</b>Each piston has a round top, two ring grooves and a rod. They lean 20 degrees each way.</li><li><b>The gap</b>Every gap in it is the same width, so it cuts clean in vinyl or steel.</li><li><b>The name</b>The letters are the same parts. An N is a piston, a U is one upside down, and the O is the crank.</li><li><b>The colors</b>Yellow and black, as they&rsquo;ve always been here. It has to be read from across the road.</li><li><b>Small</b>Under half an inch, use the one with a single ring.</li></ol></div></div>`,'w']];
KIT_BUNNYAUTO.forEach(r=>r[1]='<div class="bx">'+r[1]+'</div>');
