/* Hop Along: "This week" works out each night's date from today's date in Colorado, so the posters always
   show the next Thursday, Friday, Saturday and Sunday, soonest first. An event that has already started today
   moves to next week. Each poster carries data-wd (0 = Sunday) and data-at ("19:00"). */
(() => {
  const list = document.querySelector('.posters'); if (!list) return;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), mins = (+p.hour % 24) * 60 + (+p.minute);
  const noon = Date.UTC(+p.year, +p.month - 1, +p.day, 12);
  const posters = [...list.querySelectorAll('.poster[data-wd]')].map(li => {
    const [h, m] = li.dataset.at.split(':').map(Number);
    let k = (+li.dataset.wd - today + 7) % 7;
    if (k === 0 && mins >= h * 60 + m) k = 7;
    const d = new Date(noon + k * 864e5);
    li.querySelector('.day').textContent = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    li.querySelector('.date').textContent = d.getUTCDate();
    return { li, k };
  });
  posters.sort((a, b) => a.k - b.k).forEach(x => list.appendChild(x.li));
})();
