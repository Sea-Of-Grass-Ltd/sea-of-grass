// Old Town Marketplace demo: open-now strip, floor map, directory, events, and the one-question space form.
// All shop data comes from shops.json so the same records can feed other pages later.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h12 = h => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

  fetch('shops.json').then(r => r.json()).then(start);

  function start(data) {
    const M = data.marketplace;
    const byId = Object.fromEntries(data.shops.map(s => [s.id, s]));
    const byUnit = {};
    for (const s of data.shops) for (const u of s.units) byUnit[u] = s;
    const spaces = Object.fromEntries((data.spaces || []).map(s => [s.unit, s]));
    const cat = id => data.categories[id] || id;

    // ---- open now (marketplace hours, in Longmont's time zone)
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: M.timezone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
    const t = +parts.hour + +parts.minute / 60;
    const isOpen = t >= M.hours.open && t < M.hours.close;
    const strip = $('[data-open]');
    strip.classList.toggle('is-open', isOpen);
    $('[data-open-head]', strip).textContent = isOpen
      ? `Open now until ${h12(M.hours.close)}`
      : `Closed now, opens at ${h12(M.hours.open)} ${t < M.hours.open ? 'today' : 'tomorrow'}`;

    // ---- the card (map and directory both open it)
    const dlg = $('[data-card]'), body = $('[data-card-body]');
    function where(s) {
      if (!s.unitConfirmed || !s.units.length) return `<p class="where tbc">Spot in the building still to be confirmed with the marketplace.</p>`;
      const lv = u => ({ A: 'main floor', B: 'main floor', C: 'upstairs', D: 'mezzanine' }[u[0]]);
      return `<p class="where mono">${s.units.map(u => `${esc(u)} · ${lv(u)}`).join('<br>')}</p>`;
    }
    function openCard(s, unit) {
      const c = s.categories[0];
      body.innerHTML = s.shop === false
        ? `<p class="tag mono c-coming">${esc(unit)}</p><h3 id="card-h">${esc(s.name)}</h3><p>${esc(s.sells)}</p>`
        : `<p class="tag mono c-${c}">${s.categories.map(cat).join(' · ')}</p>
           <h3 id="card-h">${esc(s.name)}</h3>
           ${where(s)}
           <p>${esc(s.sells)}</p>
           ${s.tbc ? `<p class="tbc">${esc(s.tbc)}</p>` : ''}
           <p class="hours"><strong>Hours:</strong> <span class="tbc">the shop sets its own, inside the building's ${h12(M.hours.open)} to ${h12(M.hours.close)}.</span></p>
           ${s.links.length ? `<div class="links">${s.links.map(l => `<a class="${l.kind === 'order' ? 'btn' : 'link'}" href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('')}</div>` : ''}`;
      dlg.showModal();
    }
    $('[data-card-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // tap outside

    // ---- floor map
    const tabs = $('[data-tabs]'), plan = $('[data-plan]');
    data.levels.forEach((lv, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.role = 'tab'; b.dataset.levelTab = lv.id; b.textContent = lv.name;
      b.setAttribute('aria-selected', i === 0); b.setAttribute('aria-controls', 'lv-' + lv.id);
      tabs.append(b);
      const sec = document.createElement('div');
      sec.className = 'level'; sec.id = 'lv-' + lv.id; sec.role = 'tabpanel'; sec.hidden = i > 0;
      sec.innerHTML = lv.bands.map(band => `
        <div class="bandrow${band.units.every(u => u.startsWith('tbc:')) ? ' dashed' : ''}">
          <p class="bl mono">${esc(band.label)}</p>
          <div class="units">${band.units.map(cell).join('')}</div>
        </div>`).join('') + (lv.id === 'main' ? '<p class="door mono"><span>Front door on Main Street</span><span>East entry by A8</span></p>' : '');
      plan.append(sec);
    });
    function cell(u) {
      if (u.startsWith('tbc:')) {
        const s = byId[u.slice(4)];
        return `<button type="button" class="unit c-${s.categories[0]}" data-unit="${esc(u)}" data-tbc aria-label="${esc(s.name)}, spot to confirm"><b>?</b><span>${esc(s.short)}</span></button>`;
      }
      const s = byUnit[u];
      if (s) return `<button type="button" class="unit c-${s.categories[0]}" data-unit="${u}" aria-label="${u}, ${esc(s.name)}"><b>${u}</b><span>${esc(s.short)}</span></button>`;
      if (spaces[u]) return `<button type="button" class="unit c-coming" data-unit="${u}" aria-label="${u}, ${esc(spaces[u].name)}"><b>${u}</b><span>Coming soon</span></button>`;
      return `<div class="unit empty" aria-hidden="true"><b>${u}</b><span>Not listed</span></div>`;
    }
    tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-level-tab]'); if (!b) return;
      $$('[data-level-tab]', tabs).forEach(x => x.setAttribute('aria-selected', x === b));
      $$('.level', plan).forEach(l => { l.hidden = l.id !== 'lv-' + b.dataset.levelTab; });
    });
    plan.addEventListener('click', e => {
      const b = e.target.closest('button[data-unit]'); if (!b) return;
      const u = b.dataset.unit;
      if (u.startsWith('tbc:')) openCard(byId[u.slice(4)]);
      else if (byUnit[u]) openCard(byUnit[u], u);
      else if (spaces[u]) openCard({ ...spaces[u], shop: false, categories: ['coming'] }, u);
    });
    const used = [...new Set(data.shops.map(s => s.categories[0]))];
    $('[data-legend]').innerHTML = used.map(c => `<span class="key"><i class="c-${c}"></i>${esc(cat(c))}</span>`).join('') + '<span class="key"><i class="dash"></i>Spot to confirm</span>';

    // ---- directory with filters
    const FILTERS = ['all', 'food', 'boutiques', 'art', 'collectibles', 'wellness'];
    const chips = $('[data-chips]'), list = $('[data-directory]');
    chips.innerHTML = FILTERS.map(f => `<button type="button" class="chip" data-filter="${f}" aria-pressed="${f === 'all'}">${f === 'all' ? 'All' : esc(cat(f))}</button>`).join('');
    const sorted = [...data.shops].sort((a, b) => a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, '')));
    list.innerHTML = sorted.map(s => `
      <li data-shop="${s.id}" data-cats="${s.categories.join(' ')}">
        <button type="button" class="row">
          <i class="sw c-${s.categories[0]}${s.unitConfirmed ? '' : ' dash'}" aria-hidden="true"></i>
          <span class="nm">${esc(s.name)}</span>
          <span class="un mono">${s.unitConfirmed && s.units.length ? esc(s.units.join(' ')) : 'Spot tbc'}</span>
          <span class="ln">${esc(s.sells.split(/(?<=\.)\s/)[0])}</span>
        </button>
      </li>`).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      $$('[data-filter]', chips).forEach(x => x.setAttribute('aria-pressed', x === b));
      const f = b.dataset.filter;
      $$('[data-shop]', list).forEach(li => { li.hidden = f !== 'all' && !li.dataset.cats.split(' ').includes(f); });
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('[data-shop]'); if (li) openCard(byId[li.dataset.shop]);
    });

    // ---- events
    $('[data-events]').innerHTML = data.events.map(ev => `
      <li data-event="${ev.id}">
        <p class="when mono">${esc(ev.when)}</p>
        <h3><a href="${esc(ev.href)}" target="_blank" rel="noopener">${esc(ev.title)}</a></h3>
        <p>${esc(ev.text)}</p>
        ${ev.tbc ? `<p class="tbc">${esc(ev.tbc)}</p>` : ''}
      </li>`).join('');
    const calendar = $('[data-calendar]');
    calendar.href = M.calendar; calendar.target = '_blank'; calendar.rel = 'noopener';
  }

  // ---- "Thinking of opening a shop here?" one question at a time
  const form = $('[data-lease]');
  const order = ['sell', 'size', 'who', 'review'];
  const show = id => order.forEach(q => { $(`[data-q="${q}"]`, form).hidden = q !== id; });
  const valid = {
    sell: () => form.sell.value.trim().length > 1,
    size: () => !!form.querySelector('[name="size"]:checked'),
    who: () => form.name.value.trim() && form.reach.value.trim(),
  };
  form.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (!q) return;
    const i = order.indexOf(q.dataset.q);
    if (e.target.closest('[data-next]')) {
      const ok = valid[q.dataset.q]();
      $('.err', q).hidden = !!ok;
      if (!ok) return;
      if (order[i + 1] === 'review') {
        $('[data-sum]', form).innerHTML = [['You would sell', form.sell.value], ['Room', form.querySelector('[name="size"]:checked').value], ['Name', form.name.value], ['Reach you at', form.reach.value]]
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v.trim())}</dd></div>`).join('');
      }
      show(order[i + 1]);
      const next = $(`[data-q="${order[i + 1]}"]`, form);
      const f = next.querySelector('textarea, input') || next.querySelector('.ask');
      if (!f.matches('input, textarea')) f.tabIndex = -1;
      f.focus({ preventScroll: true });
    } else if (e.target.closest('[data-back]')) {
      show(order[i - 1]);
    }
  });
  form.addEventListener('submit', e => e.preventDefault());
})();
