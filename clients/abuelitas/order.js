// Order ahead: one question at a time, then a hand-off to the bakery's Square ordering page.
// We never take orders or payment ourselves; Square keeps the menu and money in their register.
(() => {
  const TEL = 'tel:+17202189808';
  const square = (window.ABUELITAS_SQUARE_URL || document.body.dataset.square || '').trim();
  const box = document.getElementById('order');
  const steps = [...box.querySelectorAll('[data-q]')];

  const show = name => {
    for (const s of steps) s.hidden = s.dataset.q !== name;
    const s = box.querySelector(`[data-q="${name}"]`);
    const f = s.querySelector('input, a, button');
    if (f && name !== 'when') f.focus({ preventScroll: true });
  };

  // the Square step: their link once we have it, a plain draft note and the call until then
  const go = box.querySelector('[data-square-go]');
  if (square) {
    const a = document.createElement('a');
    a.className = 'btn'; a.href = square; a.dataset.square = ''; a.textContent = 'Open the order page';
    go.append(a);
  } else {
    const note = document.createElement('p');
    note.className = 'draft-note';
    note.textContent = 'Draft: the bakery’s Square ordering link goes here once the owner sends it, and a phone call works until then.';
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.dataset.call = ''; b.textContent = 'Call the bakery';
    go.before(note); go.append(b);
  }

  box.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.pick) show(t.dataset.pick);
    else if (t.hasAttribute('data-back')) { box.querySelector('form').reset(); show('when'); }
    else if (t.hasAttribute('data-call')) location.href = TEL;
  });

  box.querySelector('[data-q="people"]').addEventListener('submit', e => {
    e.preventDefault();
    const n = Math.max(1, Math.round(+e.target.people.value || 0));
    box.querySelector('[data-n]').textContent = n;
    show('party');
  });

  show('when');
})();
