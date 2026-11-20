// The "Tired of annoying calls?" section: the old way against the new way (Tristan, 2026-11-20).
// Old way: the rotary phone nags. Each ignored call rings three times, harder each time (a wobble, then the handset
// jumping, then a little shuffle), then a long pause and a missed call, and on to the next question. Lifting the
// handset answers it by hand, but it rings again after a pause: the old way never ends.
// New way: tapping Sold out on the Bunny Burritos register above (#demo-stage) cuts the ring mid-shake, the phone
// slumps, and every call shows as answered by the site. We listen for the visitor's own click on that button and
// read its aria-pressed; the register's own file is untouched.
// Sound: a synthesised two-partial bell (no audio file), louder and more rattly each ring, capped. Browsers block
// sound until the visitor taps or clicks something, so it rings silently until then. A bell toggle mutes it for the
// visit (sessionStorage); reduced motion starts muted. Nothing sounds off screen or in a hidden tab.
// Runs without the 3D phone too (reduced motion, low power): the ringing card itself picks up when clicked.
// Hooks on #calls: data-mode (old | new), data-stage (0-3), data-call, data-audio (locked | on | muted).

function init(sec) {
  const pace = window.__callsPace || 1;                         // tests run the clock faster
  const S = ms => ms * pace;
  const phone = sec.querySelector('sog-phone');
  const cards = [...sec.querySelectorAll('dl.calls > div[data-call]')];
  const byKey = k => cards.find(c => c.dataset.call === k);
  const order = ['horchata', 'open', 'ahead'];                  // "Any horchata left?" rings first
  const nudge = sec.querySelector('.calls-nudge');
  const muteBtn = sec.querySelector('.calls-mute');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => innerWidth < 900;
  const STATE = { ringing: 'Ringing…', hand: 'You had to answer it', missed: 'Missed call', site: 'Answered by your site' };

  let pendingClunk = false;
  let mode = 'old', stage = 0, callIx = 0, timer = 0, visible = false, lifted = false, started = false;
  sec.dataset.mode = mode; sec.dataset.stage = '0';
  sec.querySelector('dl.calls')?.classList.add('live');

  const setCard = (card, st) => {
    card.classList.remove('ringing', 'hand', 'missed', 'site');
    if (st) card.classList.add(st);
    card.querySelector('.call-state').textContent = st ? STATE[st] : '';
  };
  const setStage = n => { stage = n; sec.dataset.stage = String(n); };
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, S(ms)); };

  // ---- sound ---------------------------------------------------------------------------------------------------
  const KEY = 'sog-phone-sound';
  let muted = (() => { try { const v = sessionStorage.getItem(KEY); return v ? v === 'off' : reduce; } catch { return reduce; } })();
  let ctx = null, master = null;
  const showAudio = () => { sec.dataset.audio = muted ? 'muted' : (ctx && ctx.state === 'running' ? 'on' : 'locked'); };
  const paintMute = () => { muteBtn?.setAttribute('aria-pressed', String(muted)); muteBtn?.setAttribute('aria-label', muted ? 'Unmute the phone' : 'Mute the phone'); showAudio(); };
  paintMute();
  const unlock = () => {                                          // only ever from a real tap, click or key
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().then(showAudio, () => {});
    showAudio();
  };
  ['pointerdown', 'keydown', 'touchend'].forEach(t => document.addEventListener(t, unlock, { capture: true, passive: true }));
  muteBtn?.addEventListener('click', () => {
    muted = !muted;
    try { sessionStorage.setItem(KEY, muted ? 'off' : 'on'); } catch {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    paintMute();
  });
  const live = () => ctx && ctx.state === 'running' && !muted && visible && !document.hidden;
  const voices = new Set();
  const hushAll = () => { voices.forEach(v => { try { v.stop(); } catch {} }); voices.clear(); };
  const sound = (type, st) => {
    (window.__callsLog || []).push({ type, st, at: performance.now() });   // for recording the clip's sound track
    if (live()) SYNTH[type](ctx, master, st, ctx.currentTime + 0.02, voices);
  };
  window.__callsSynth = SYNTH;
  // ---- the old way: a call rings up to three times, harder each time ---------------------------------------------
  const RING = [0, 2700, 2300, 1900];                             // one ring plus its gap, shorter as it nags
  const tell = (type, detail) => phone?.dispatchEvent(new CustomEvent(type, { detail }));
  const ring = n => {
    if (mode !== 'old' || lifted) return;
    if (!visible || document.hidden) { later(() => ring(n), 800); return; }
    const card = byKey(order[callIx % order.length]);
    sec.dataset.call = card.dataset.call;
    setCard(card, 'ringing'); setStage(n);
    tell('nag', { stage: n, ms: S(1100), gentle: narrow() });
    sound('bell', n);
    later(() => {
      if (n < 3) return ring(n + 1);
      setCard(card, 'missed'); setStage(0); tell('nag-end');      // three in a row, then a long pause
      callIx++;
      later(() => ring(1), 9000);
    }, RING[n]);
  };
  const start = () => { if (started || mode !== 'old') return; started = true; later(() => ring(1), 500); };

  // lifting the handset: the owner answers by hand, then it starts again
  const pickUp = () => {
    if (mode !== 'old') { sound('dial'); return; }
    lifted = true; clearTimeout(timer); hushAll(); sound('dial');
    const card = byKey(order[callIx % order.length]);
    if (stage > 0 || card.classList.contains('ringing')) { setCard(card, 'hand'); callIx++; }
    setStage(0); tell('nag-end');
  };
  const hangUp = () => { if (!lifted) return; lifted = false; if (mode === 'old') later(() => ring(1), 3500); };
  phone?.addEventListener('pickup', pickUp);
  phone?.addEventListener('hangup', hangUp);
  // without the 3D phone (or by keyboard), the ringing card itself picks up
  cards.forEach(c => c.addEventListener('click', () => { if (mode === 'old' && c.classList.contains('ringing')) { pickUp(); later(() => { lifted = false; ring(1); }, 6000); } }));

  // ---- the new way: Sold out on the register above -------------------------------------------------------------
  const soldOut = () => document.querySelector('#demo-stage [data-act="soldout"]')?.getAttribute('aria-pressed') === 'true';
  const toNew = () => {
    if (mode === 'new') return;
    mode = 'new'; sec.dataset.mode = 'new';
    clearTimeout(timer); hushAll(); setStage(0); lifted = false;
    tell('hush');
    if (visible) sound('clunk'); else pendingClunk = true;        // the thud lands when you see it slump
    cards.forEach(c => setCard(c, 'site'));
    if (nudge) nudge.textContent = 'Your site answered first.';
  };
  const toOld = () => {
    if (mode === 'old') return;
    mode = 'old'; sec.dataset.mode = 'old'; started = false;
    cards.forEach(c => setCard(c, null));
    if (nudge) nudge.innerHTML = '<a href="#demo-stage">Tap Sold out above and watch.</a>';
    tell('wake'); if (visible) start();
  };
  // only the visitor's own tap counts: on wide screens the pinned register scene taps Sold out by itself as it
  // scrolls past (flow.js), and that scripted click shouldn't hush the phone before anyone has met it
  document.addEventListener('click', e => {
    if (!e.isTrusted || !e.target.closest?.('#demo-stage [data-act="soldout"]')) return;
    toNew();   // any real tap hushes it, whichever way the button ends up (it may already be pressed by the scene)
  }, true);

  // ---- pacing: something happens as soon as it scrolls in; nothing while it's away ----------------------------
  new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    if (visible) { if (pendingClunk) { pendingClunk = false; setTimeout(() => sound('clunk'), 250); } start(); } else hushAll();
  }), { threshold: 0.25 }).observe(sec);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hushAll(); });
}

// ---- the bell, the thud and the dial tone: synthesised, no audio files ------------------------------------------
const osc = (ctx, voices, type, f, t0, t1, out) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(out); o.start(t0); o.stop(t1); voices?.add(o); o.onended = () => voices?.delete(o); return o; };
const SYNTH = {
  // one "brrring-brrring": two bursts of a clapper hammering two slightly detuned bell partials
  bell(ctx, out, st, t0, voices) {
    const peak = [0, 0.05, 0.075, 0.1][st];                       // capped: annoying, never painful
    const rate = [0, 18, 23, 28][st];                              // the clapper speeds up
    for (const b of [0, 0.6]) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(out);
      const a = t0 + b, len = 0.42;
      for (let t = 0; t < len; t += 1 / rate) {
        g.gain.setValueAtTime(peak, a + t);
        g.gain.setValueAtTime(peak * (st === 3 ? 0.12 : 0.25), a + t + 0.5 / rate);
      }
      g.gain.setValueAtTime(0, a + len);
      osc(ctx, voices, 'triangle', 1210, a, a + len + 0.05, g); osc(ctx, voices, 'triangle', 1218 + st * 4, a, a + len + 0.05, g); osc(ctx, voices, 'sine', 3340, a, a + len + 0.05, g);
    }
  },
  clunk(ctx, out, st, t, voices) {                                 // a dull thud as it slumps
    const g = ctx.createGain(); g.connect(out);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const o = osc(ctx, voices, 'sine', 140, t, t + 0.25, g); o.frequency.exponentialRampToValueAtTime(55, t + 0.2);
  },
  dial(ctx, out, st, t, voices) {                                  // a short dial tone when the handset comes up
    const g = ctx.createGain(); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.04); g.gain.setValueAtTime(0.035, t + 1.1); g.gain.linearRampToValueAtTime(0, t + 1.25);
    osc(ctx, voices, 'sine', 350, t, t + 1.3, g); osc(ctx, voices, 'sine', 440, t, t + 1.3, g);
  },
};

const calls = document.getElementById('calls');
if (calls) init(calls);
