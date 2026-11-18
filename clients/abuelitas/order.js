// The order: Add on any menu item, a cart, then one question at a time (when, who), then Square checkout.
// We never take payment. "Pay on Square" sends the cart to a small server piece (server/server.mjs), which asks
// Square for a checkout page holding these items and answers with its link; the browser goes there to pay,
// and the order lands on the bakery's register. Until that server piece is live, the last step says "draft".
(() => {
  const TEL = 'tel:+17202189808';
  const ENDPOINT = String('ABUELITAS_CHECKOUT' in window ? window.ABUELITAS_CHECKOUT : document.body.dataset.checkout || '').trim();
  const KEEP = 'abuelitas-order';
  const box = document.getElementById('order');
  const steps = [...box.querySelectorAll('[data-q]')];
  const bar = document.querySelector('[data-cartbar]');
  const names = {};
  document.querySelectorAll('[data-key]').forEach(el => { names[el.dataset.key] = el.dataset.name; });

  // cart: key -> qty, in the order things were added
  const cart = new Map();
  try { for (const [k, q] of JSON.parse(localStorage.getItem(KEEP) || '[]')) if (names[k] && q > 0) cart.set(k, q); } catch {}
  const save = () => { try { localStorage.setItem(KEEP, JSON.stringify([...cart])); } catch {} };
  const count = () => [...cart.values()].reduce((a, b) => a + b, 0);
  const set = (k, q) => { if (q > 0) cart.set(k, Math.min(q, 99)); else cart.delete(k); save(); render(); };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, sr, attr, cls = 'mini') => { const b = el('button', cls, label); b.type = 'button'; b.setAttribute(attr, ''); b.append(el('span', 'sr', sr)); return b; };

  // controls on every menu item: Add, then a little stepper
  document.querySelectorAll('#menu [data-key]').forEach(item => {
    const k = item.dataset.key, n = names[k];
    const wrap = el('div', 'qty');
    const add = btn('Add', ' ' + n, 'data-add', 'add');
    const stepper = el('div', 'stepper'); stepper.hidden = true;
    const qty = el('span', 'n'); qty.setAttribute('data-qty', '');
    stepper.append(btn('−', ' one ' + n, 'data-less'), qty, btn('+', ' one more ' + n, 'data-more'));
    wrap.append(add, stepper);
    item.append(wrap);
    add.onclick = () => set(k, 1);
    stepper.querySelector('[data-less]').onclick = () => set(k, (cart.get(k) || 0) - 1);
    stepper.querySelector('[data-more]').onclick = () => set(k, (cart.get(k) || 0) + 1);
  });

  const lines = box.querySelector('[data-lines]'), review = box.querySelector('[data-review]');
  function render() {
    document.querySelectorAll('#menu [data-key]').forEach(item => {
      const q = cart.get(item.dataset.key) || 0;
      item.querySelector('[data-add]').hidden = q > 0;
      item.querySelector('.stepper').hidden = q === 0;
      item.querySelector('[data-qty]').textContent = q;
      item.classList.toggle('in', q > 0);
    });
    lines.replaceChildren(...[...cart].map(([k, q]) => {
      const li = el('li'); li.dataset.line = k;
      const s = el('div', 'stepper');
      s.append(btn('−', ' fewer ' + names[k], 'data-less'), btn('+', ' more ' + names[k], 'data-more'));
      s.firstChild.onclick = () => set(k, q - 1); s.lastChild.onclick = () => set(k, q + 1);
      li.append(el('span', 'nm', `${q} × ${names[k]}`), s);
      return li;
    }));
    const n = count();
    box.querySelector('[data-empty]').hidden = n > 0;
    box.querySelector('[data-total-note]').hidden = n === 0;
    box.querySelector('[data-q="cart"] [data-next]').disabled = n === 0;
    bar.hidden = n === 0 || orderInView;
    document.body.classList.toggle('has-cart', n > 0);
    bar.querySelector('[data-count]').textContent = n;
    if (n === 0 && ['when', 'who', 'pay'].includes(current)) show('cart');
  }

  // the bar is a way to the order, so it steps aside while the order itself is on screen
  let orderInView = false;
  new IntersectionObserver(([e]) => { orderInView = e.isIntersecting; bar.hidden = count() === 0 || orderInView; }, { threshold: 0.15 }).observe(box);

  const order = ['cart', 'when', 'who', 'pay'];
  let current = 'cart';
  function show(name) {
    current = name;
    for (const s of steps) s.hidden = s.dataset.q !== name;
    if (name === 'pay') fillReview();
    const f = box.querySelector(`[data-q="${name}"]`).querySelector('input, select');
    if (f) f.focus({ preventScroll: true });
  }

  const who = box.querySelector('[data-q="who"]');
  const nameIn = who.querySelector('input[name="name"]'), phoneIn = who.querySelector('input[name="phone"]');
  const when = box.querySelector('#when');

  function fillReview() {
    review.replaceChildren(...[...cart].map(([k, q]) => el('li', '', `${q} × ${names[k]}`)));
    box.querySelector('[data-review-who]').textContent =
      `For ${nameIn.value.trim()}, ${when.options[when.selectedIndex].text.toLowerCase()}, at the Old Town Marketplace.`;
    const go = box.querySelector('[data-pay-go]');
    go.replaceChildren();
    box.querySelector('[data-q="pay"] .draft-note')?.remove();
    if (ENDPOINT) {
      go.append(Object.assign(el('button', 'btn', 'Pay on Square'), { type: 'button' }));
      go.firstChild.setAttribute('data-pay', '');
    } else {
      const note = el('p', 'draft-note', 'Draft: checkout through Square goes live once the bakery connects its Square account, and a phone call works until then.');
      go.before(note);
      const b = el('button', 'btn', 'Call the bakery'); b.type = 'button'; b.setAttribute('data-call', '');
      go.append(b);
    }
  }

  async function pay(b) {
    b.disabled = true; b.textContent = 'Opening Square…';
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [...cart].map(([key, qty]) => ({ key, qty })), pickup: when.value, name: nameIn.value.trim(), phone: phoneIn.value.trim() }) });
      const { url } = await r.json();
      if (!r.ok || !/^https:\/\//.test(url || '')) throw new Error('no checkout link');
      location.href = url;
    } catch {
      b.disabled = false; b.textContent = 'Pay on Square';
      box.querySelector('[data-q="pay"] [data-err]')?.remove();
      const e = el('p', 'err', 'Square didn’t answer just now, so please try again or call the bakery.'); e.setAttribute('data-err', ''); e.setAttribute('role', 'alert');
      b.parentElement.after(e);
    }
  }

  box.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-next')) {
      if (current === 'who') {
        const err = who.querySelector('[data-err]');
        if (!nameIn.value.trim() || phoneIn.value.replace(/\D/g, '').length < 10) { err.textContent = 'Please add a name and a mobile number, so the bakery can reach you about the order.'; (nameIn.value.trim() ? phoneIn : nameIn).focus(); return; }
        err.textContent = '';
      }
      show(order[order.indexOf(current) + 1]);
    }
    else if (t.hasAttribute('data-back')) show(order[Math.max(0, order.indexOf(current) - 1)]);
    else if (t.hasAttribute('data-party')) show('people');
    else if (t.hasAttribute('data-to-cart')) { box.querySelector('form').reset(); show('cart'); }
    else if (t.hasAttribute('data-call')) location.href = TEL;
    else if (t.hasAttribute('data-pay')) pay(t);
  });

  box.querySelector('[data-q="people"]').addEventListener('submit', e => {
    e.preventDefault();
    box.querySelector('[data-n]').textContent = Math.max(1, Math.round(+e.target.people.value || 0));
    show('party');
  });

  bar.querySelector('[data-open-cart]').addEventListener('click', () => show('cart'));

  show('cart');
  render();
})();
