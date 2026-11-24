// Burrow & Bough kit. Every piece reads burrow-*.svg
const bbi=(v,s='')=>`<img class="bi" style="${s}" src="burrow-${v}.svg" alt="">`;
const bbRow=(n,d,p)=>`<div class="bbr"><b>${n}</b><b>${p}</b><i>${d}</i></div>`;
const bbPat=c=>Array.from({length:c},(_,i)=>`<div>${bbi((i+Math.floor(i/6))%2?'sq-ink':'sq-lilac')}</div>`).join('');
const bbHalf=`<div class="bbhz"><div class="bbz1">${bbi('amp-ink')}</div><div class="bbz2">${bbi('amp-lilac')}</div></div>`;
const KIT_BURROW=[
['Your logo',`<div class="bb bbl bbc" style="aspect-ratio:1.5">${bbi('word-ink','width:80cqw')}</div>`],
['The other way round',`<div class="bb bbd bbc" style="aspect-ratio:1.5">${bbi('word-lilac','width:80cqw')}</div>`],
['A short version',`<div class="bb bbl" style="aspect-ratio:1.5;overflow:hidden">${bbi('wide-ink','position:absolute;inset:0;width:100%;height:100%;object-fit:cover')}</div>`],
['The ground, for screens',`<div class="bb bbl" style="aspect-ratio:1.5;overflow:hidden">${bbHalf}</div>`],
['A round version',`<div class="bb bbround"><div>${bbi('round-ink','width:100%')}</div></div>`],
['In one color',`<div class="bb bb2"><div style="background:#fff">${bbi('word-black')}</div><div style="background:#000">${bbi('word-white')}</div></div>`],
['Your colors',`<div class="bb bbcol"><i style="background:#DBCBFD;color:#220A33"><b>Lilac</b>#DBCBFD</i><i style="background:#220A33;color:#DBCBFD"><b>Ink</b>#220A33</i><i style="background:#9E39E5;color:#fff"><b>Violet</b>#9E39E5</i></div>`],
['Two fonts',`<div class="bb bbl bbf"><b>Made nearby. Wrapped here.</b><em>Newsreader, for headlines</em><div>Thrown by Rosa at her Loveland kiln, with the carrot pressed in by thumb.</div><em>Instrument Sans, for the rest</em></div>`],
['Wrapping paper',`<div class="bb bbwrap">${bbPat(24)}</div>`],
['The bag',`<div class="bb bbbag"><div><u></u>${bbi('word-ink')}</div></div>`],
['The window',`<div class="bb bbwin"><div>${bbi('word-white')}<span>Gifts and home goods</span></div></div>`],
['A gift tag',`<div class="bb bbd bbc" style="aspect-ratio:1.5"><div class="bbtag"><u></u>${bbi('sq-ink')}<span>To &amp; from</span></div></div>`],
['A stamp',`<div class="bb bbc" style="aspect-ratio:1.5;background:#C9A77F"><div class="bbst">${bbi('word-ink')}</div></div>`],
['The shelf list',`<div class="bb bbmn"><div class="bbh"><span>New this week</span></div><div class="bbll">${bbRow('Hand-thrown carrot mug','Thrown by Rosa in Loveland.','$28')+bbRow('Prairie candle','Sage and sweetgrass, forty hours.','$22')+bbRow('Bunny-ear beanie','Mae knits every one by hand.','$34')+bbRow('Front Range print','Three inks, signed by Hollis.','$40')+bbRow('Silver hare earrings','Sawn and filed in Masonville.','$48')+bbRow('Local honey','Raw, from Tom&aacute;s&rsquo;s hives.','$14')}</div><div class="bbft">Gift wrap on anything, $4</div></div>`],
['A business card',`<div class="bb bb2c"><div class="bbcd bbl">${bbi('wide-ink','position:absolute;inset:0;width:100%;height:100%;object-fit:cover')}</div><div class="bbcd bbd">${bbi('word-lilac')}<div>Gifts and home goods<br>Berthoud, Colorado</div></div></div>`],
['Profile pictures',`<div class="bb bbpf"><div class="bbl">${bbi('sq-ink')}</div><div class="bbl">${bbi('round-ink')}</div><div class="bbd">${bbi('round-lilac')}</div></div>`],
['One page that says why it looks the way it does',`<div class="bb bbwhy"><div class="bbl">${bbi('wide-ink','position:absolute;inset:0;width:100%;height:100%;object-fit:cover')}</div><div class="bby"><h4>Why the &amp; changes color</h4><ol><li><b>The burrow</b>In the top word the &amp; is dug out. It&rsquo;s a tunnel through the letters.</li><li><b>The bough</b>In the bottom word it turns solid, like a branch. One stroke draws both names.</li><li><b>The line between</b>The color flips at the gap between the words. That gap is the ground.</li><li><b>The block</b>Both words are exactly the same width, so it stacks, stamps and folds like a parcel.</li><li><b>The letters</b>Heavy, with short blunt feet. They leave room for the &amp; without losing a name.</li><li><b>The short one</b>The &amp; by itself: dark above, light below. Repeat it and you have wrapping paper.</li></ol></div></div>`,'w']];
KIT_BURROW.forEach(r=>r[1]='<div class="bx">'+r[1]+'</div>');
