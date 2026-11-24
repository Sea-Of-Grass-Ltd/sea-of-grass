// Burrow & Bough kit. Every piece reads burrow-*.svg
const bbi=(v,s='')=>`<img class="bi" style="${s}" src="burrow-${v}.svg" alt="">`;
const bbRow=(n,d,p)=>`<div class="bbr"><b>${n}</b><b>${p}</b><i>${d}</i></div>`;
const bbPat=c=>Array.from({length:c},(_,i)=>{const d=(i+Math.floor(i/6))%2;return `<div class="${d?'bbd':'bbl'}">${bbi(d?'b-lilac':'b-ink')}</div>`}).join('');
const bbNm=(v,w='')=>`<div class="bblk" style="${w}">${bbi('b-'+v)}<strong>Burrow<br>&amp; Bough</strong></div>`;
const KIT_BURROW=[
['Your logo',`<div class="bb bbd bbc" style="aspect-ratio:1.5">${bbi('b-lilac','height:52cqw')}</div>`],
['With your name',`<div class="bb bbl bbc" style="aspect-ratio:1.5">${bbNm('ink')}</div>`],
['The other way round',`<div class="bb bbl bbc" style="aspect-ratio:1.5">${bbi('b-ink','height:52cqw')}</div>`],
['One line, for screens',`<div class="bb bbd bbc" style="aspect-ratio:1.5">${bbi('draw','height:52cqw')}</div>`],
['A round version',`<div class="bb bbround"><div class="bbl bbc" style="display:grid;place-items:center;aspect-ratio:1">${bbi('b-ink','height:50cqw;margin-left:3cqw')}</div></div>`],
['In one color',`<div class="bb bb2"><div style="background:#fff;color:#000">${bbNm('black')}</div><div style="background:#000;color:#fff">${bbNm('white')}</div></div>`],
['Your colors',`<div class="bb bbcol"><i style="background:#DBCBFD;color:#220A33"><b>Lilac</b>#DBCBFD</i><i style="background:#220A33;color:#DBCBFD"><b>Ink</b>#220A33</i><i style="background:#9E39E5;color:#fff"><b>Violet</b>#9E39E5</i></div>`],
['Two fonts',`<div class="bb bbl bbf"><b>Made nearby. Wrapped here.</b><em>Newsreader, for headlines</em><div>Thrown by Rosa at her Loveland kiln, with the carrot pressed in by thumb.</div><em>Instrument Sans, for the rest</em></div>`],
['Wrapping paper',`<div class="bb bbwrap">${bbPat(24)}</div>`],
['The bag',`<div class="bb bbbag"><div><u></u>${bbi('b-ink')}</div></div>`],
['The window',`<div class="bb bbwin"><div>${bbNm('white')}<span>Gifts and home goods</span></div></div>`],
['A gift tag',`<div class="bb bbd bbc" style="aspect-ratio:1.5"><div class="bbtag"><u></u>${bbi('b-ink')}<span>To &amp; from</span></div></div>`],
['A stamp',`<div class="bb bbc" style="aspect-ratio:1.5;background:#C9A77F"><div class="bbst">${bbi('b-ink')}</div></div>`],
['The shelf list',`<div class="bb bbmn"><div class="bbh"><span>New this week</span></div><div class="bbll">${bbRow('Hand-thrown carrot mug','Thrown by Rosa in Loveland.','$28')+bbRow('Prairie candle','Sage and sweetgrass, forty hours.','$22')+bbRow('Bunny-ear beanie','Mae knits every one by hand.','$34')+bbRow('Front Range print','Three inks, signed by Hollis.','$40')+bbRow('Silver hare earrings','Sawn and filed in Masonville.','$48')+bbRow('Local honey','Raw, from Tom&aacute;s&rsquo;s hives.','$14')}</div><div class="bbft">Gift wrap on anything, $4</div></div>`],
['A business card',`<div class="bb bb2c"><div class="bbcd bbl bbc" style="display:grid;place-items:center">${bbi('b-ink','height:40cqw')}</div><div class="bbcd bbd">${bbNm('lilac')}<div class="bbad">Gifts and home goods<br>Berthoud, Colorado</div></div></div>`],
['Profile pictures',`<div class="bb bbpf"><div class="bbl">${bbi('b-ink')}</div><div class="bbd">${bbi('b-lilac')}</div><div style="background:#9E39E5">${bbi('b-white')}</div></div>`],
['One page that says why it looks the way it does',`<div class="bb bbwhy"><div class="bbd">${bbi('b-lilac','height:42cqw')}</div><div class="bby"><h4>A B with an &amp; inside</h4><ol><li><b>Burrow &amp; Bough</b>The B is the first letter of both names, and the &amp; is tucked inside it.</li><li><b>The package</b>The B is a box with square corners. The &amp; is the ribbon, and its leg pokes out at the bottom.</li><li><b>One line</b>It starts at the bottom bar and goes around the box, up the leg and through both loops to the curl.</li><li><b>Two circles</b>Both loops and the curl share one circle. Both bowls share another, exactly twice as big.</li><li><b>One angle</b>Every crossing and every cut end is 60 degrees.</li><li><b>One gap</b>The space around the &amp; is the same all the way around.</li></ol></div></div>`,'w']];
KIT_BURROW.forEach(r=>r[1]='<div class="bx">'+r[1]+'</div>');
