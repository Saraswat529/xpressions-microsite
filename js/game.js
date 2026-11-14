/*
 * "Find the Xpressions Explorer": a site-wide hidden-object hunt.
 * 9 Explorers over 3 levels. Level 1 hides on the home page, level 2 across other
 * sections, level 3 only appears after you interact (open an FAQ answer, pick an
 * event, open the gallery). Each level unlocks when the previous one is cleared.
 * Players get clues, not exact locations. Progress is saved in this browser.
 */
(function () {
  'use strict';
  const d = document;
  const XP = window.XP;

  const MASCOT = '<svg viewBox="0 0 40 46" aria-hidden="true" focusable="false">' +
    '<path d="M14 40l-2.5 4.5M26 40l2.5 4.5" stroke="#1a1100" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="28" rx="13" ry="13" fill="#ffa534" stroke="#1a1100" stroke-width="2"/>' +
    '<path d="M11 17c0-7 4-11.5 9-11.5S29 10 29 17z" fill="#52c7ff" stroke="#1a1100" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M11.6 14.6h16.8" stroke="#ff6aa6" stroke-width="2.6"/>' +
    '<path d="M5.5 17.5h29" stroke="#1a1100" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="15" cy="26" r="3.4" fill="#fff"/><circle cx="25" cy="26" r="3.4" fill="#fff"/>' +
    '<circle cx="15.9" cy="26.6" r="1.7" fill="#0a0e1f"/><circle cx="25.9" cy="26.6" r="1.7" fill="#0a0e1f"/>' +
    '<path d="M15.5 33q4.5 3.6 9 0" stroke="#1a1100" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="10.5" cy="31" r="1.8" fill="#ff6aa6" opacity=".7"/><circle cx="29.5" cy="31" r="1.8" fill="#ff6aa6" opacity=".7"/>' +
    '</svg>';
  XP.mascot = MASCOT;

  const LEVELS = [
    { n: 1, name: 'Warm-up', desc: 'Three Explorers are easy to spot somewhere on the home page.' },
    { n: 2, name: 'Backstage', desc: 'Smaller and shyer. They hide across other sections of the site.' },
    { n: 3, name: 'Deep dive', desc: 'These only appear when you interact with the site.' }
  ];
  const FAQ_STAY = () => Array.from(d.querySelectorAll('#p-faq details')).find((x) => /stay/i.test(x.querySelector('summary').textContent));
  const SPOTS = [
    { id: 'e1', level: 1, page: 'home', anchor: '#p-home .hero .figure', style: 'top:-24px;right:18px', size: 46,
      clue: 'I always want a front-row view of the crowd. Check the big night-show photo.', found: 'Spotted at the night show!' },
    { id: 'e2', level: 1, page: 'home', anchor: '#p-home .stats', style: 'top:-34px;right:6%', size: 40,
      clue: "Numbers make me dizzy, so I'm sitting on top of the fest's statistics.", found: 'Caught sitting on the stats!' },
    { id: 'e3', level: 1, page: 'home', anchor: '#p-home .cta-band', style: 'bottom:14px;left:18px', size: 42,
      clue: 'Scroll to the very end of the home page, where the big invitation waits.', found: 'Found waiting for the next fest!' },
    { id: 'e4', level: 2, page: 'highlights', anchor: '#p-highlights .timeline', style: 'bottom:-16px;right:4%', size: 30, opacity: 0.85,
      clue: 'I hum along to every headliner who has played here. Find the list of headline acts.', found: 'Humming along to the headliners!' },
    { id: 'e5', level: 2, page: 'programme', anchor: '#p-programme .days .day:nth-child(3)', style: 'top:12px;right:14px', size: 28, opacity: 0.85,
      clue: 'I saved myself a seat for the second day of last year’s fest. Check the programme.', found: 'Saving a seat for Day 2!' },
    { id: 'e6', level: 2, page: 'competitions', anchor: '.comp[data-event="decibelz"] .ev-visual', style: 'bottom:6px;left:12px', size: 30, opacity: 0.9,
      clue: 'Where bands battle, I headbang. Find the band battle card.', found: 'Headbanging at Decibelz!' },
    { id: 'e7', level: 3, page: 'faq', anchor: () => { const x = FAQ_STAY(); return x && x.querySelector('p'); }, inline: true, size: 24, opacity: 0.8,
      clue: 'Looking for a place to sleep? Some answers stay folded until you ask the right question.', found: 'Found snoozing in the FAQ!' },
    { id: 'e8', level: 3, page: 'register', anchor: '#hubPicks', style: 'top:10px;right:12px', size: 26, opacity: 0.85, needsPicks: true,
      clue: "Pick an event you'd like to attend, and I'll sneak into your list of picks.", found: 'Already on your list of picks!' },
    { id: 'e9', level: 3, page: 'highlights', lightbox: 'judges', style: 'bottom:12%;right:10%', size: 30, opacity: 0.85,
      clue: 'I sneak into the full-screen photo gallery. Look closely at the judges.', found: 'Judging from the best seat!' }
  ];
  const TOTAL = SPOTS.length;

  let found = XP.store.get('hunt', {}) || {};
  let revealed = XP.store.get('huntClues', {}) || {};
  const mounted = {};

  const foundCount = () => SPOTS.filter((s) => found[s.id]).length;
  const levelDone = (n) => SPOTS.filter((s) => s.level === n).every((s) => found[s.id]);
  const unlocked = (n) => n === 1 || levelDone(n - 1);
  const currentLevel = () => (levelDone(1) ? (levelDone(2) ? 3 : 2) : 1);
  XP.huntStatus = () => ({ found: foundCount(), total: TOTAL, level: currentLevel() });

  function makeButton(spot) {
    const b = d.createElement('button');
    b.type = 'button';
    b.className = 'explorer lv' + spot.level + (spot.inline ? ' inline' : '');
    b.dataset.spot = spot.id;
    b.dataset.fx = 'off';
    b.setAttribute('aria-label', 'Hidden Xpressions Explorer');
    b.innerHTML = MASCOT;
    if (spot.style) b.style.cssText = spot.style;
    b.style.setProperty('--s', spot.size + 'px');
    if (spot.opacity) b.style.setProperty('--o', spot.opacity);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); find(spot, b); });
    return b;
  }

  function mountAll() {
    SPOTS.forEach((spot) => {
      if (found[spot.id] || !unlocked(spot.level) || spot.lightbox) return;
      if (spot.needsPicks && !(XP.intentCount && XP.intentCount() > 0)) {
        if (mounted[spot.id]) { mounted[spot.id].remove(); delete mounted[spot.id]; }
        return;
      }
      if (mounted[spot.id] && mounted[spot.id].isConnected) return;
      const host = typeof spot.anchor === 'function' ? spot.anchor() : d.querySelector(spot.anchor);
      if (!host) return;
      if (!spot.inline) host.classList.add('has-explorer');
      const b = makeButton(spot);
      host.appendChild(b);
      mounted[spot.id] = b;
    });
  }

  function find(spot, b) {
    if (found[spot.id]) return;
    found[spot.id] = Date.now();
    XP.store.set('hunt', found);
    const r = b.getBoundingClientRect();
    if (window.XPFX) XPFX.burst(r.left + r.width / 2, r.top + r.height / 2, { size: 'xl' });
    b.classList.add('found');
    b.disabled = true;
    setTimeout(() => b.remove(), 700);
    delete mounted[spot.id];
    XP.addXP(25);
    const n = foundCount();
    updateFab(true);
    XP.toast('Explorer found! ' + n + ' of ' + TOTAL, spot.found + ' +25 XP', '🔍');
    if (levelDone(spot.level)) {
      if (spot.level === 1) XP.unlock('l1');
      if (spot.level === 2) XP.unlock('l2');
      if (spot.level < 3) {
        setTimeout(() => {
          XP.toast('Level ' + (spot.level + 1) + ' unlocked: ' + LEVELS[spot.level].name, 'New Explorers have scattered. Open the hunt for clues.', '🗝️');
          mountAll();
        }, 1300);
      } else {
        setTimeout(finale, 1100);
      }
    }
  }

  function finale() {
    if (window.XPFX) XPFX.celebrate('max');
    XP.unlock('explorer');
    setTimeout(openPanel, 900);
  }

  function updateFab(bounce) {
    const c = d.getElementById('fabCount'), fab = d.getElementById('fabGame');
    if (!c || !fab) return;
    const n = foundCount();
    c.textContent = n === TOTAL ? 'All found!' : n + ' of ' + TOTAL + ' found';
    fab.setAttribute('aria-label', 'Find the Xpressions Explorer! ' + n + ' of ' + TOTAL + ' found');
    if (bounce) { fab.classList.remove('bounce'); void fab.offsetWidth; fab.classList.add('bounce'); }
  }

  /* ---------- the hunt panel ---------- */
  function openPanel() {
    const n = foundCount();
    const box = XP.el('div', { class: 'hunt' });
    if (n === TOTAL) { renderReward(box); }
    else {
      const lvl = currentLevel();
      box.innerHTML =
        '<div class="hunt-hero"><span class="hunt-mascot" aria-hidden="true">' + MASCOT + '</span><div>' +
        '<p>Nine tiny Explorers are hiding around this site. Find them all to earn the <b>Xpressions Explorer</b> badge and your own certificate.</p>' +
        '<p class="hunt-small">Tap an Explorer when you see one. Clues help, but they never give the exact spot.</p></div></div>' +
        '<div class="hunt-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + n + '" aria-label="Explorers found"><span style="width:' + (n / TOTAL * 100) + '%"></span><b>' + n + ' of ' + TOTAL + ' found</b></div>' +
        '<ol class="hunt-levels">' + LEVELS.map((L) => {
          const done = levelDone(L.n), open = unlocked(L.n);
          const spots = SPOTS.filter((s) => s.level === L.n);
          return '<li class="' + (done ? 'done' : open ? 'open' : 'locked') + '"><div class="hl-head"><b>Level ' + L.n + ': ' + L.name + '</b><span>' +
            (done ? 'Cleared' : open ? spots.filter((s) => found[s.id]).length + ' of ' + spots.length : 'Locked') + '</span></div><p>' + L.desc + '</p>' +
            (open && !done ? '<ul class="hunt-clues">' + spots.map((s, k) => found[s.id]
              ? '<li class="got">' + XP.icon('check') + '<span>Explorer ' + (k + 1) + ' found</span></li>'
              : (revealed[s.id]
                ? '<li><span class="clue">' + XP.esc(s.clue) + '</span></li>'
                : '<li><button type="button" class="clue-btn" data-clue="' + s.id + '" data-fx="sm">Reveal clue ' + (k + 1) + '</button></li>')).join('') + '</ul>' : '') + '</li>';
        }).join('') + '</ol>' +
        '<div class="btn-row"><button type="button" class="btn primary" data-close>Start hunting</button></div>';
      box.addEventListener('click', (e) => {
        const c = e.target.closest('[data-clue]');
        if (!c) return;
        const s = SPOTS.find((x) => x.id === c.dataset.clue);
        revealed[s.id] = 1;
        XP.store.set('huntClues', revealed);
        const li = c.parentElement;
        li.innerHTML = '<span class="clue">' + XP.esc(s.clue) + '</span>';
        li.classList.add('just');
      });
    }
    XP.modal({ title: n === TOTAL ? 'You found them all!' : 'Find the Xpressions Explorer!', content: box, className: 'hunt-modal' });
  }
  XP.openHunt = openPanel;

  /* ---------- reward screen + certificate ---------- */
  function renderReward(box) {
    box.innerHTML =
      '<div class="reward"><div class="medal" aria-hidden="true"><span class="medal-rays"></span><span class="medal-face">' + MASCOT + '</span></div>' +
      '<p class="reward-title">Achievement unlocked: Xpressions Explorer</p>' +
      "<p>You found all nine Explorers. That makes you one of the most curious people at Xpressions ’26. Make it official with your certificate.</p>" +
      '<form class="cert-form" novalidate><label for="certName">Name for your certificate</label>' +
      '<div class="cert-row"><input id="certName" name="certName" type="text" maxlength="40" autocomplete="name" required aria-describedby="certHelp certErr" placeholder="Your name">' +
      '<button type="submit" class="btn primary">Create certificate</button></div>' +
      '<p id="certHelp" class="hunt-small">2 to 40 letters. It stays on your device.</p><p id="certErr" class="cert-err" role="alert" hidden></p></form>' +
      '<div class="cert-out" hidden><img alt="Your Xpressions Explorer certificate"><a class="btn ghost" download="xpressions-explorer-certificate.png">Download certificate</a></div>' +
      '<div class="btn-row reward-actions"><button type="button" class="btn ghost" data-replay>Replay the fireworks</button><button type="button" class="btn ghost" data-reset>Hide them again</button></div></div>';
    const form = box.querySelector('form'), input = box.querySelector('#certName'), err = box.querySelector('#certErr');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, ' ');
      let msg = '';
      if (name.length < 2) msg = 'Please enter at least 2 characters.';
      else if (name.length > 40) msg = 'Please keep it to 40 characters or fewer.';
      else if (!/^[\p{L}\p{M} .'-]+$/u.test(name)) msg = 'Use letters, spaces, apostrophes, full stops or hyphens only.';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.hidden = !msg; err.textContent = msg;
      if (msg) { input.focus(); return; }
      const url = await drawCertificate(name);
      const out = box.querySelector('.cert-out');
      out.querySelector('img').src = url;
      out.querySelector('a').href = url;
      out.hidden = false;
      if (window.XPFX) XPFX.celebrate('small');
    });
    let resetArmed = false;
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-replay]') && window.XPFX) XPFX.celebrate('max');
      const r = e.target.closest('[data-reset]');
      if (r) {
        if (!resetArmed) { resetArmed = true; r.textContent = 'Tap again to restart the hunt'; return; }
        found = {}; revealed = {};
        XP.store.set('hunt', found); XP.store.set('huntClues', revealed);
        updateFab(); mountAll(); XP.closeModal();
        XP.toast('The Explorers are hiding again', 'Your badges stay. Happy hunting!', '🙈');
      }
    });
  }

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  async function drawCertificate(name) {
    const W = 1600, H = 1100, c = d.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    try { await Promise.all([d.fonts.load('700 60px Unbounded'), d.fonts.load('500 30px "Hanken Grotesk"')]); } catch (e) { /* fall back to system fonts */ }
    const disp = '"Unbounded", "Trebuchet MS", sans-serif', body = '"Hanken Grotesk", "Segoe UI", sans-serif';
    g.fillStyle = '#0a0e1f'; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, 900);
    glow.addColorStop(0, 'rgba(82,199,255,.18)'); glow.addColorStop(1, 'rgba(10,14,31,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 28) {
      g.fillStyle = (x / 28) % 2 ? '#ffa534' : '#52c7ff';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, 22); g.lineTo(x + 28, 0); g.fill();
      g.beginPath(); g.moveTo(x, H); g.lineTo(x + 14, H - 22); g.lineTo(x + 28, H); g.fill();
    }
    g.strokeStyle = '#2b3668'; g.lineWidth = 4; g.strokeRect(60, 70, W - 120, H - 140);
    g.strokeStyle = 'rgba(255,165,52,.6)'; g.lineWidth = 2; g.strokeRect(78, 88, W - 156, H - 176);
    const mascot = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MASCOT.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" ')));
    g.drawImage(mascot, W / 2 - 80, 140, 160, 184);
    g.textAlign = 'center';
    g.fillStyle = '#52c7ff'; g.font = '700 30px ' + disp; g.fillText('CERTIFICATE OF EXPLORATION', W / 2, 390);
    g.fillStyle = '#a6aecb'; g.font = '500 34px ' + body; g.fillText('This certifies that', W / 2, 470);
    let size = 92;
    g.font = '700 ' + size + 'px ' + disp;
    while (g.measureText(name).width > W - 300 && size > 40) { size -= 4; g.font = '700 ' + size + 'px ' + disp; }
    g.shadowColor = 'rgba(255,165,52,.55)'; g.shadowBlur = 30;
    g.fillStyle = '#ffa534'; g.fillText(name, W / 2, 590);
    g.shadowBlur = 0;
    g.fillStyle = '#eef1fb'; g.font = '500 36px ' + body;
    g.fillText('found all nine hidden Xpressions Explorers', W / 2, 680);
    g.fillText("on the Xpressions ’26 microsite.", W / 2, 730);
    g.fillStyle = '#a6aecb'; g.font = '500 28px ' + body;
    const when = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    g.fillText('Awarded on ' + when, W / 2, 830);
    g.fillStyle = '#eef1fb'; g.font = '700 34px ' + disp; g.fillText("XPRESSIONS ’26", W / 2, 930);
    g.fillStyle = '#a6aecb'; g.font = '500 24px ' + body; g.fillText('31 Jan to 1 Feb 2027 · XIM University, Bhubaneswar', W / 2, 972);
    return c.toDataURL('image/png');
  }

  XP.ready.then(() => {
    const fab = d.getElementById('fabGame');
    if (fab) {
      fab.querySelector('.fab-mascot').innerHTML = MASCOT;
      fab.addEventListener('click', openPanel);
    }
    updateFab();
    mountAll();
    d.addEventListener('xp:intents', mountAll);
    d.addEventListener('xp:page', mountAll);
    d.addEventListener('xp:lightbox', (e) => {
      const st = e.detail.stage;
      st.querySelectorAll('.explorer').forEach((x) => x.remove());
      SPOTS.forEach((spot) => {
        if (spot.lightbox !== e.detail.name || found[spot.id] || !unlocked(spot.level)) return;
        st.appendChild(makeButton(spot));
      });
    });
  });
})();
