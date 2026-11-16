/* Hop Along: click a can and its tile grows into a fact sheet (FLIP layout animation); on phones it opens as a bottom sheet.
   The tap list's "More info +" opens the same view. Facts are made up for the demo. */
(() => {
  const FACTS = {
    'bunny-hop-ipa': { style: 'IPA', abv: '6.8%', ibu: 62, notes: 'Pine, grapefruit pith, a dry snap at the end.', grain: 'Simcoe, Centennial and Cascade on Colorado two-row with a touch of crystal malt.', food: 'A green chile burger, or the al pastor from Bunny Burritos.', local: 'The long, low line on the horizon under the leap is the Dakota Hogback, west of town.', tap: 'On tap now · 16oz $7 · 4-pack to go $16', inks: 'black, amber and pine green' },
    'long-ear-hazy': { style: 'Hazy IPA', abv: '6.5%', ibu: 35, notes: 'Mango, orange juice, soft and pillowy.', grain: 'Citra, Mosaic and El Dorado on oats and wheat.', food: 'Spicy wings, Thai takeout, anything with lime.', local: 'The tufts round the bunny are blue grama, Colorado’s state grass: look for the eyelash seed heads.', tap: 'On tap now · on nitro Fridays · 4-pack to go $16', inks: 'black, haze lilac and juicy orange' },
    'clover-field-pils': { style: 'Pilsner', abv: '4.9%', ibu: 32, notes: 'Crackers, honeysuckle, crisp and clean.', grain: 'Saaz hops on pilsner malt, lagered six weeks.', food: 'Pretzels, fish tacos, a long afternoon.', local: 'That white tower on the horizon is a grain elevator, the tallest thing in most prairie towns.', tap: 'On tap now · 16oz $7 · 4-pack to go $16', inks: 'black, clover green and butter yellow' },
    'carrot-top-kolsch': { style: 'Kölsch', abv: '5.0%', ibu: 22, notes: 'Honey, ripe pear, a clean dry finish.', grain: 'Hallertau hops on pilsner malt, with honey from a Berthoud hive.', food: 'Farm salads, soft cheese, a picnic on the patio.', local: 'The striped field behind the bunnies is sugar beets, Northern Colorado’s old cash crop.', tap: 'On tap now · 16oz $7 · 4-pack to go $16', inks: 'black, carrot orange and leaf green' },
    'burrow-stout': { style: 'Stout', abv: '7.2%', ibu: 38, notes: 'Cold-brew coffee, dark chocolate, toasted bread.', grain: 'Roast barley and chocolate malt, East Kent Goldings, coffee from the Warren Bakehouse next door.', food: 'Carrot cake from the Warren, or slow-smoked brisket.', local: 'The ridge under the moon is the Hogback again, this time at night from inside the burrow.', tap: 'Back on tap this week · 4-pack to go $16', inks: 'black, night navy and cream' },
    'thistle-sour': { style: 'Sour', abv: '5.5%', ibu: 8, notes: 'Raspberry, lime zest, bright and tart.', grain: 'Kettle-soured wheat beer with raspberry and lime.', food: 'Goat cheese, ceviche, a hot afternoon.', local: 'The yellow sprig among the thistles is rabbitbrush, or chamisa, which blooms along every ditch in fall.', tap: 'Kicked: back Thursday · 4-packs sold out', inks: 'black, raspberry and lime green' },
  };
  const grid = document.querySelector('.cans'); if (!grid) return;
  const tiles = [...grid.querySelectorAll('.can')];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 640px)').matches;
  let open = null, lastFocus = null;

  const panel = (k, name, id) => {
    const f = FACTS[k];
    return `<div class="facts" id="${id}" role="region" aria-label="${name}: the facts">
      <button class="fx" type="button" aria-label="Close">&times;</button>
      <p class="label">${f.style} &middot; ${f.abv} ABV &middot; ${f.ibu} IBU</p>
      <h3 tabindex="-1">${name}</h3>
      <dl>
        <div><dt>Tastes like</dt><dd>${f.notes}</dd></div>
        <div><dt>Hops &amp; malt</dt><dd>${f.grain}</dd></div>
        <div><dt>Goes with</dt><dd>${f.food}</dd></div>
        <div class="find"><dt>Find the Berthoud detail</dt><dd>${f.local}</dd></div>
        <div><dt>On tap</dt><dd>${f.tap}</dd></div>
      </dl>
      <p class="ink">Label printed in three inks: ${f.inks}.</p>
    </div>`;
  };

  /* FLIP: measure every tile, change the layout, then play each tile from where it was */
  const flip = (change) => {
    if (reduce()) { change(); grid.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 200 }); return; }
    const first = new Map(tiles.map(t => [t, t.getBoundingClientRect()]));
    change();
    tiles.forEach(t => {
      const a = first.get(t), b = t.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
      if (!dx && !dy && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;
      t.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transformOrigin: '0 0', transform: 'none' }],
        { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  };

  const close = () => {
    if (!open) return;
    const t = open; open = null;
    const btn = t.querySelector('.can-open'); btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('aria-controls');
    if (t.classList.contains('sheet-open')) {
      const sh = document.querySelector('.can-sheet');
      sh.classList.remove('on'); document.body.classList.remove('sheet-lock');
      setTimeout(() => sh.remove(), reduce() ? 0 : 320); t.classList.remove('sheet-open');
    } else {
      flip(() => { t.classList.remove('open'); t.style.gridRow = ''; t.style.gridColumn = ''; t.style.background = ''; t.querySelector('.facts')?.remove(); grid.classList.remove('has-open'); });
    }
    (lastFocus || btn).focus({ preventScroll: true }); lastFocus = null;
  };

  const show = (t, from) => {
    if (open === t) { close(); return; }
    if (open) close();
    const k = t.dataset.key, name = t.querySelector('b').textContent, id = 'facts-' + k;
    const btn = t.querySelector('.can-open');
    lastFocus = from || btn; open = t;
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-controls', id);
    if (phone()) {
      const sh = document.createElement('div');
      sh.className = 'can-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', name);
      sh.style.setProperty('--panel', getComputedStyle(t).getPropertyValue('--panel'));
      sh.innerHTML = `<div class="sheet-bg"></div><div class="sheet"><span class="grip" aria-hidden="true"></span>${t.querySelector('picture').outerHTML}${panel(k, name, id)}</div>`;
      document.body.appendChild(sh); document.body.classList.add('sheet-lock'); t.classList.add('sheet-open');
      requestAnimationFrame(() => requestAnimationFrame(() => sh.classList.add('on')));
      sh.querySelector('.sheet-bg').addEventListener('click', close);
      sh.querySelector('.fx').addEventListener('click', close);
      setTimeout(() => sh.querySelector('.fx').focus(), 60);
      return;
    }
    const i = tiles.indexOf(t), row = Math.floor(i / 3) + 1, col = i % 3;
    flip(() => { grid.classList.add('has-open'); t.classList.add('open'); t.style.gridRow = `${row} / span 2`; t.style.gridColumn = `${col === 2 ? 2 : col + 1} / span 2`; t.insertAdjacentHTML('beforeend', panel(k, name, id)); });
    t.querySelector('.fx').addEventListener('click', close);
    try { /* match the open tile to the photo's own backdrop so the can sits seamlessly */
      const img = t.querySelector('.can-open img'), cv = document.createElement('canvas'); cv.width = cv.height = 1;
      const cx = cv.getContext('2d'); cx.drawImage(img, 4, 4, 2, 2, 0, 0, 1, 1); const [r_, g_, b_] = cx.getImageData(0, 0, 1, 1).data;
      t.style.background = `rgb(${r_},${g_},${b_})`;
    } catch (e) {}
    setTimeout(() => { /* measure after the layout animation, then bring the whole block into view */
      const r = t.getBoundingClientRect();
      const target = r.top + r.height / 2 - innerHeight / 2 + 30;
      scrollTo({ top: scrollY + target, behavior: reduce() ? 'auto' : 'smooth' });
    }, reduce() ? 0 : 540);
    setTimeout(() => t.querySelector('.facts h3')?.focus({ preventScroll: true }), 0);
  };

  tiles.forEach(t => t.querySelector('.can-open').addEventListener('click', () => show(t)));
  document.querySelectorAll('.more[data-key]').forEach(b => b.addEventListener('click', () => {
    const t = tiles.find(x => x.dataset.key === b.dataset.key); if (!t) return;
    if (!phone()) document.getElementById('cans').scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => show(t, b), phone() || reduce() ? 0 : 450);
  }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(); });
  document.addEventListener('click', e => { if (open && !open.classList.contains('sheet-open') && !open.contains(e.target) && !e.target.closest('.more')) close(); });
  /* keep keyboard focus inside the phone sheet */
  document.addEventListener('keydown', e => {
    const sh = document.querySelector('.can-sheet.on'); if (!sh || e.key !== 'Tab') return;
    const f = [...sh.querySelectorAll('button')]; if (f.length) { e.preventDefault(); f[0].focus(); }
  });
})();
