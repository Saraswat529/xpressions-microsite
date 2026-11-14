/*
 * Core interaction layer for the Xpressions microsite.
 * Builds on the existing hash router in index.html (it listens to the same
 * hashchange events and never replaces the original show() logic).
 * Provides: storage, icons, toasts, modals, festival passport (XP, badges, section
 * progress), nav indicator, page transitions, scroll reveals, count-ups,
 * parallax decor, countdown, floating buttons and small surprises.
 * Public API on window.XP.
 */
(function () {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const cfg = window.XP_CONFIG || {};
  const XP = (window.XP = window.XP || {});
  root.classList.add('xp');
  XP.reduced = () => reduceMQ.matches;

  /* ---------- storage (every access guarded) ---------- */
  XP.store = {
    get(k, def) {
      try { const v = localStorage.getItem('xp:' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem('xp:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem('xp:' + k); } catch (e) { /* ignore */ } }
  };

  /* ---------- helpers ---------- */
  XP.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  XP.el = function (tag, attrs, html) {
    const e = d.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  const el = XP.el, esc = XP.esc;

  /* ---------- icon set (simple line icons, currentColor) ---------- */
  const P = {
    home: '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>',
    ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    rocket: '<path d="M12 2c3 3 4 7 3 12H9C8 9 9 5 12 2zM9 14l-3 3 1 3 3-2M15 14l3 3-1 3-3-2M12 8v.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    leaf: '<path d="M5 19c0-9 6-14 15-15-1 9-6 15-15 15zM5 19l7-7"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17v.01"/>',
    dance: '<circle cx="13" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M11 15l-1-5 4-2 3 3 3-1M10 10l-4 2"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    mask: '<path d="M4 4h16v6a8 8 0 0 1-16 0zM8 9h.01M16 9h.01M9 14c1.5 1.5 4.5 1.5 6 0"/>',
    megaphone: '<path d="M3 10v4h4l8 5V5L7 10zM18 9a4 4 0 0 1 0 6"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 2 0 3 0a4 4 0 0 0 4-4c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
    run: '<circle cx="14" cy="4" r="2"/><path d="M6 21l3-5 3 2 1 4M9 16l1-6 4 1 2 3h3M10 10l-3 1-2 3"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5M16 14a2 2 0 1 0 0-.01M6 12h6M6 16h6"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0zM9 9h.01M15 9h.01"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3a9 9 0 0 1 9 9"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    gamepad: '<path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L13.5 14h-3L9 15.6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  XP.icon = (name) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.star) + '</svg>';

  /* ---------- toasts ---------- */
  let toastBox;
  XP.toast = function (title, body, icon) {
    if (!toastBox) return;
    const t = el('div', { class: 'toast' });
    t.innerHTML = '<span class="toast-ico" aria-hidden="true">' + (icon || '✨') + '</span><div><strong>' + esc(title) + '</strong>' + (body ? '<p>' + esc(body) + '</p>' : '') + '</div>';
    toastBox.appendChild(t);
    const cap = innerWidth < 640 ? 2 : 3;
    while (toastBox.children.length > cap) toastBox.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3800);
  };

  /* ---------- modal ---------- */
  let current = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe';
  XP.modal = function (opts) {
    if (current) current.close(true);
    const wrap = el('div', { class: 'xp-modal ' + (opts.className || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'xpModalTitle' });
    wrap.innerHTML = '<div class="xp-modal-backdrop" data-close></div><div class="xp-modal-box"><button class="xp-modal-close" type="button" aria-label="Close" data-close data-fx="off">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<h2 class="xp-modal-title" id="xpModalTitle"></h2><div class="xp-modal-body"></div></div>';
    wrap.querySelector('.xp-modal-title').textContent = opts.title || '';
    const body = wrap.querySelector('.xp-modal-body');
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);
    const prev = d.activeElement;
    d.body.appendChild(wrap);
    d.body.classList.add('xp-lock');
    let closed = false;
    function close(silent) {
      if (closed) return;
      closed = true;
      d.removeEventListener('keydown', onKey, true);
      wrap.classList.add('closing');
      setTimeout(() => { wrap.remove(); if (!d.querySelector('.xp-modal:not(.closing)')) d.body.classList.remove('xp-lock'); }, 200);
      if (current === api) current = null;
      if (opts.onClose) opts.onClose();
      if (!silent && prev && prev.focus) prev.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        const f = Array.from(wrap.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === d.activeElement);
        if (!f.length) return;
        const first = f[0], lastF = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && d.activeElement === lastF) { e.preventDefault(); first.focus(); }
        return;
      }
      if (opts.onKey) opts.onKey(e);
    }
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    d.addEventListener('keydown', onKey, true);
    const api = { close, wrap, body };
    current = api;
    const focusEl = (opts.focus && wrap.querySelector(opts.focus)) || wrap.querySelector('.xp-modal-close');
    focusEl.focus({ preventScroll: true });
    return api;
  };
  XP.closeModal = () => { if (current) current.close(); };

  /* ---------- number animation ---------- */
  XP.animateNumber = function (node, from, to, dur) {
    if (!node) return;
    if (reduceMQ.matches || from === to || from == null) { node.textContent = to; return; }
    const t0 = performance.now(), len = dur || 700;
    cancelAnimationFrame(node._raf);
    const stepFn = (t) => {
      const k = Math.min(1, (t - t0) / len), e = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(from + (to - from) * e);
      if (k < 1) node._raf = requestAnimationFrame(stepFn);
    };
    node._raf = requestAnimationFrame(stepFn);
  };

  /* ---------- festival passport: XP, sections, badges ---------- */
  const PAGES = ['home', 'highlights', 'programme', 'competitions', 'register', 'faq'];
  const PAGE_NAMES = { home: 'Home', highlights: 'Highlights', programme: 'Programme', competitions: 'Competitions', register: 'Register', faq: 'FAQ' };
  const PAGE_ICONS = { home: 'home', highlights: 'star', programme: 'cal', competitions: 'trophy', register: 'ticket', faq: 'chat' };
  XP.PAGES = PAGES;
  const BADGES = [
    { id: 'curious', icon: '🧭', name: 'Curious Visitor', desc: 'Visit 3 sections of the site' },
    { id: 'tour', icon: '🗺️', name: 'Full Tour', desc: 'Visit all 6 sections' },
    { id: 'countmein', icon: '🎟️', name: 'Count Me In', desc: 'Register your intent for an event' },
    { id: 'squad', icon: '🙌', name: 'Front Row Squad', desc: 'Show interest in 5 events' },
    { id: 'gallery', icon: '🖼️', name: 'Gallery Gazer', desc: 'Open the full-screen photo gallery' },
    { id: 'media', icon: '🎤', name: 'Backstage Pass', desc: 'Open an artist spotlight' },
    { id: 'faq', icon: '💡', name: 'Question Master', desc: 'Open 4 FAQ answers' },
    { id: 'stars', icon: '🌠', name: 'Star Catcher', desc: 'Catch a shooting star that drifts by' },
    { id: 'l1', icon: '🔍', name: 'Explorer Rookie', desc: 'Clear level 1 of the Explorer hunt' },
    { id: 'l2', icon: '🕵️', name: 'Explorer Pro', desc: 'Clear level 2 of the Explorer hunt' },
    { id: 'explorer', icon: '👑', name: 'Xpressions Explorer', desc: 'Find all 9 hidden Explorers' },
    { id: 'secret', icon: '🦉', name: 'Night Owl', desc: 'Hint: the logo loves attention', secret: true }
  ];
  XP.BADGES = BADGES;
  const prog = Object.assign({ xp: 0, pages: {}, badges: {}, n: {}, faq: {} }, XP.store.get('progress', {}));
  XP.progress = prog;
  let chip, bar;

  function save() { XP.store.set('progress', prog); renderChip(); }
  XP.addXP = function (n) {
    prog.xp += n; save();
    if (chip) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
  };
  XP.count = function (key, inc) { prog.n[key] = (prog.n[key] || 0) + (inc == null ? 1 : inc); save(); checkBadges(); return prog.n[key]; };
  XP.setCount = function (key, val) { prog.n[key] = val; save(); checkBadges(); };
  XP.unlock = function (id) {
    if (prog.badges[id]) return false;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return false;
    prog.badges[id] = Date.now();
    XP.addXP(50);
    XP.toast('Achievement unlocked: ' + b.name, b.desc + ' · +50 XP', b.icon);
    if (window.XPFX) XPFX.celebrate(id === 'explorer' || id === 'tour' ? 'max' : 'small');
    return true;
  };
  function checkBadges() {
    const p = Object.keys(prog.pages).length, n = prog.n;
    if (p >= 3) XP.unlock('curious');
    if (p >= PAGES.length) XP.unlock('tour');
    if ((n.intents || 0) >= 1) XP.unlock('countmein');
    if ((n.intents || 0) >= 5) XP.unlock('squad');
    if ((n.gallery || 0) >= 1) XP.unlock('gallery');
    if ((n.media || 0) >= 1) XP.unlock('media');
    if (Object.keys(prog.faq).length >= 4) XP.unlock('faq');
    if ((n.stars || 0) >= 1) XP.unlock('stars');
  }

  const RING = 2 * Math.PI * 13;
  function renderChip() {
    if (!chip) return;
    const n = Object.keys(prog.pages).length;
    chip.querySelector('.xp-ring-fg').style.strokeDashoffset = RING * (1 - n / PAGES.length);
    chip.querySelector('.xp-n').textContent = prog.xp;
    chip.querySelector('.xp-sec').textContent = n + '/' + PAGES.length;
    chip.setAttribute('aria-label', 'Festival passport: ' + prog.xp + ' XP, ' + n + ' of ' + PAGES.length + ' sections explored');
    if (bar) bar.style.width = (n / PAGES.length * 100) + '%';
  }

  function openPassport() {
    const n = Object.keys(prog.pages).length;
    const unlocked = BADGES.filter((b) => prog.badges[b.id]).length;
    const hunt = XP.huntStatus ? XP.huntStatus() : null;
    const box = el('div', { class: 'passport' });
    box.innerHTML =
      '<div class="pp-top"><div class="pp-xp"><b>' + prog.xp + '</b><span>XP</span></div><p>' +
      (n === PAGES.length ? "Congratulations! You've explored every section." : "You've explored " + n + ' of ' + PAGES.length + ' sections. Keep going!') + '</p></div>' +
      '<div class="pp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + PAGES.length + '" aria-valuenow="' + n + '" aria-label="Sections explored"><span style="width:' + (n / PAGES.length * 100) + '%"></span></div>' +
      '<ul class="pp-pages">' + PAGES.map((p) => '<li><a href="#' + p + '" class="' + (prog.pages[p] ? 'on' : '') + '">' + XP.icon(PAGE_ICONS[p]) + '<span>' + PAGE_NAMES[p] + '</span>' + (prog.pages[p] ? '<em class="sr-only"> (visited)</em>' : '') + '</a></li>').join('') + '</ul>' +
      (hunt ? '<div class="pp-hunt"><span class="pp-mascot" aria-hidden="true">' + (XP.mascot || '') + '</span><div><b>Explorer hunt: ' + hunt.found + ' of ' + hunt.total + ' found</b><small>Level ' + hunt.level + ' of 3</small></div><button type="button" class="btn ghost sm" data-open-hunt>Open the hunt</button></div>' : '') +
      '<h3>Badges <small>' + unlocked + ' of ' + BADGES.length + '</small></h3>' +
      '<ul class="pp-badges">' + BADGES.map((b) => {
        const on = !!prog.badges[b.id], hide = b.secret && !on;
        return '<li class="' + (on ? 'on' : '') + '"><span class="pp-badge-ico" aria-hidden="true">' + (hide ? '❔' : b.icon) + '</span><b>' + (hide ? 'Secret badge' : esc(b.name)) + (on ? '<span class="sr-only"> (unlocked)</span>' : '') + '</b><small>' + esc(b.desc) + '</small></li>';
      }).join('') + '</ul>' +
      '<p class="pp-note">How to earn XP: visit sections (+10), show interest in events (+15), find Explorers (+25), unlock badges (+50). Progress is saved in this browser only, with no sign-in.</p>';
    const m = XP.modal({ title: 'Your festival passport', content: box, className: 'passport-modal' });
    box.addEventListener('click', (e) => {
      if (e.target.closest('a[href^="#"]')) m.close(true);
      if (e.target.closest('[data-open-hunt]')) { m.close(true); setTimeout(() => XP.openHunt && XP.openHunt(), 220); }
    });
  }
  XP.openPassport = openPassport;

  /* ---------- header: passport chip, progress bar, nav icons and ink ---------- */
  let nav, ink;
  function buildHeader() {
    const barEl = d.querySelector('.site-header .bar');
    const brand = d.querySelector('.brand');
    nav = d.getElementById('nav');
    if (!barEl || !nav) return;
    chip = el('button', { class: 'xp-chip', type: 'button', id: 'xpChip' });
    chip.innerHTML = '<svg class="xp-ring" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" class="xp-ring-bg"/><circle cx="16" cy="16" r="13" class="xp-ring-fg" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + RING.toFixed(1) + '"/></svg><span class="xp-sec" aria-hidden="true"></span><span class="xp-label" aria-hidden="true"><b class="xp-n">0</b> XP</span>';
    brand.after(chip);
    chip.addEventListener('click', openPassport);
    const pb = el('div', { class: 'xp-progress', 'aria-hidden': 'true' });
    bar = el('span');
    pb.appendChild(bar);
    d.querySelector('.site-header').appendChild(pb);
    nav.querySelectorAll('a[data-link]').forEach((a) => {
      a.insertAdjacentHTML('afterbegin', '<span class="nav-ico">' + XP.icon(PAGE_ICONS[a.dataset.link]) + '</span>');
    });
    ink = el('span', { class: 'nav-ink', 'aria-hidden': 'true' });
    nav.prepend(ink);
    addEventListener('resize', placeInk, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(placeInk);
    renderChip();
  }
  function placeInk() {
    if (!ink) return;
    const a = nav.querySelector('a[aria-current="page"]');
    if (!a || getComputedStyle(ink).display === 'none') return;
    ink.style.width = a.offsetWidth + 'px';
    ink.style.height = a.offsetHeight + 'px';
    ink.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)';
    ink.classList.add('ready');
  }

  /* ---------- page change hook ---------- */
  let firstPage = true, wipe;
  function currentPage() {
    const s = d.querySelector('.page:not([hidden])');
    return s ? s.getAttribute('data-page') : 'home';
  }
  function onPage() {
    const name = currentPage();
    placeInk();
    if (!prog.pages[name]) {
      prog.pages[name] = Date.now();
      prog.xp += 10;
      save();
      const n = Object.keys(prog.pages).length;
      if (n > 1) XP.toast('New section discovered: ' + PAGE_NAMES[name], "You've explored " + n + ' of ' + PAGES.length + ' sections · +10 XP', '🧭');
      checkBadges();
    }
    const sec = d.querySelector('.page[data-page="' + name + '"]');
    if (sec && !firstPage && !reduceMQ.matches) {
      sec.classList.remove('page-in'); void sec.offsetWidth; sec.classList.add('page-in');
      wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
    }
    firstPage = false;
    XP.reveal(sec || d);
    d.dispatchEvent(new CustomEvent('xp:page', { detail: name }));
  }
  XP.currentPage = currentPage;

  /* ---------- scroll reveal + stat count-up ---------- */
  const RV = '.section > h2, .section > .sub, .card, .comp, .figure, .timeline li, .step, .day, .faq details, .stat, .notice, .latest, .cta-band, .hub-row, .hot-card, .countdown';
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
      if (en.target.matches('.stat')) countUp(en.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;
  XP.reveal = function (scope) {
    (scope || d).querySelectorAll(RV).forEach((n) => {
      if (n.classList.contains('rv') || n.closest('.xp-modal')) return;
      n.classList.add('rv');
      const i = Array.prototype.indexOf.call(n.parentElement.children, n);
      n.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      if (io && !reduceMQ.matches) io.observe(n);
      else { n.classList.add('in'); if (n.matches('.stat')) countUp(n); }
    });
    scheduleFallback();
  };
  /* Safety net: if IntersectionObserver is throttled or unavailable, reveal whatever is on screen
     after scrolling stops, so content can never stay invisible. */
  let fallbackT = 0;
  function revealVisible() {
    const limit = innerHeight * 0.98;
    d.querySelectorAll('.page:not([hidden]) .rv:not(.in), #hotSection .rv:not(.in)').forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) {
        n.classList.add('in');
        if (io) io.unobserve(n);
        if (n.matches('.stat')) countUp(n);
      }
    });
  }
  const scheduleFallback = () => { clearTimeout(fallbackT); fallbackT = setTimeout(revealVisible, 450); };
  addEventListener('scroll', scheduleFallback, { passive: true });
  addEventListener('resize', scheduleFallback, { passive: true });
  XP.revealVisible = revealVisible;

  function countUp(stat) {
    const b = stat.querySelector('b');
    if (!b || b.dataset.done) return;
    b.dataset.done = '1';
    const txt = b.textContent, m = txt.match(/\d+/);
    if (!m || reduceMQ.matches) return;
    const target = +m[0], from = target > 1900 ? target - 40 : 0, t0 = performance.now(), dur = 1500;
    const stepFn = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      b.textContent = txt.replace(m[0], Math.round(from + (target - from) * e));
      if (k < 1) requestAnimationFrame(stepFn);
    };
    requestAnimationFrame(stepFn);
  }

  /* ---------- parallax decor + stage lights ---------- */
  const SHAPES = {
    ring: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#52c7ff" stroke-width="2.5"/></svg>',
    star: '<svg viewBox="0 0 40 40"><path d="M20 4l3.6 12.4L36 20l-12.4 3.6L20 36l-3.6-12.4L4 20l12.4-3.6z" fill="#ffa534"/></svg>',
    x: '<svg viewBox="0 0 40 40"><path d="M10 10l20 20M30 10L10 30" stroke="#ff6aa6" stroke-width="4" stroke-linecap="round"/></svg>',
    dot: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="6" fill="#9b8cff"/></svg>'
  };
  function decor() {
    d.body.prepend(el('div', { class: 'stage-lights', 'aria-hidden': 'true' }));
    if (reduceMQ.matches) return;
    const layer = el('div', { class: 'decor', 'aria-hidden': 'true' });
    const order = ['ring', 'star', 'x', 'dot', 'star', 'ring', 'x', 'star', 'dot', 'ring'];
    const items = order.map((s, i) => {
      const it = el('i', { class: 'd-' + s });
      it.innerHTML = '<span>' + SHAPES[s] + '</span>';
      it.style.left = (4 + ((i * 37) % 92)) + '%';
      it.firstChild.style.animationDelay = (-i * 1.7) + 's';
      layer.appendChild(it);
      return { n: it, p: ((i * 53) % 97) / 100, s: 0.04 + (i % 4) * 0.035 };
    });
    d.body.prepend(layer);
    let ticking = false;
    const place = () => {
      const span = innerHeight + 120, y = scrollY;
      items.forEach((o) => {
        let pos = (o.p * span - y * o.s) % span;
        if (pos < 0) pos += span;
        o.n.style.transform = 'translate3d(0,' + (pos - 60).toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    place();
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } }, { passive: true });
    addEventListener('resize', place, { passive: true });
  }

  /* ---------- hero: word animation already in markup; add live countdown ---------- */
  function countdown() {
    const host = d.querySelector('#p-home .hero-copy');
    if (!host || !cfg.festStart) return;
    const start = new Date(cfg.festStart).getTime(), end = new Date(cfg.festEnd || cfg.festStart).getTime();
    if (isNaN(start)) return;
    const box = el('div', { class: 'countdown', role: 'timer', 'aria-label': "Countdown to Xpressions '26" });
    host.appendChild(box);
    const units = [['days', 86400], ['hrs', 3600], ['min', 60], ['sec', 1]];
    box.innerHTML = '<p class="cd-label">Xpressions ’26 begins in</p><div class="cd-cells">' + units.map((u) => '<span class="cd-cell"><b data-u="' + u[0] + '">00</b><small>' + u[0] + '</small></span>').join('') + '</div>';
    const cells = {};
    box.querySelectorAll('b[data-u]').forEach((b) => { cells[b.dataset.u] = b; });
    function tickCd() {
      const now = Date.now();
      if (now >= end) { box.innerHTML = '<p class="cd-label">Thanks for coming to Xpressions ’26! Highlights are on the way.</p>'; return; }
      if (now >= start) { box.innerHTML = '<p class="cd-label cd-live">Xpressions ’26 is happening right now!</p>'; return; }
      let s = Math.floor((start - now) / 1000);
      units.forEach((u) => {
        const v = Math.floor(s / u[1]); s -= v * u[1];
        const txt = String(v).padStart(2, '0');
        if (cells[u[0]].textContent !== txt) {
          cells[u[0]].textContent = txt;
          if (u[0] !== 'days' && !reduceMQ.matches) { cells[u[0]].classList.remove('flip'); void cells[u[0]].offsetWidth; cells[u[0]].classList.add('flip'); }
        }
      });
      setTimeout(tickCd, 1000 - (now % 1000) + 5);
    }
    tickCd();
  }

  /* ---------- floating buttons ---------- */
  function fabs() {
    const box = el('div', { class: 'fabs' });
    box.innerHTML =
      '<button class="fab fab-top" type="button" aria-label="Back to top" data-fx="sm">' + XP.icon('up') + '</button>' +
      '<div class="fab-social"><div class="social-menu" id="socialMenu" hidden>' +
      '<a href="https://www.instagram.com/ximbxpressions" target="_blank" rel="noopener">' + XP.icon('insta') + '<span>Instagram</span></a>' +
      '<a href="https://www.instagram.com/ximbxpressions/reels/" target="_blank" rel="noopener">' + XP.icon('play') + '<span>Reels</span></a>' +
      '<a href="https://luma.com/user/usr-GfukqIi26hdF0ZC" target="_blank" rel="noopener">' + XP.icon('cal') + '<span>Luma</span></a>' +
      '</div><button class="fab fab-share" type="button" aria-expanded="false" aria-controls="socialMenu" aria-label="Xpressions on social media">' + XP.icon('share') + '</button></div>' +
      '<button class="fab-game" type="button" id="fabGame"><span class="fab-mascot" aria-hidden="true"></span><span class="fab-lbl">Find the Explorer!<small id="fabCount"></small></span></button>';
    d.body.appendChild(box);
    const top = box.querySelector('.fab-top');
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' }));
    let shown = false;
    const onScroll = () => { const s = scrollY > 600; if (s !== shown) { shown = s; top.classList.toggle('show', s); } };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const share = box.querySelector('.fab-share'), menu = box.querySelector('#socialMenu');
    const setMenu = (open) => { menu.hidden = !open; share.setAttribute('aria-expanded', String(open)); };
    share.addEventListener('click', () => setMenu(menu.hidden));
    d.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.fab-social')) setMenu(false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); share.focus(); } });
  }

  /* ---------- surprises ---------- */
  const FACTS = [
    'Xpressions began in 1998 and is run by XIM students.',
    "Farhan Akhtar played Celeblitz in 2017, the fest's 20th year.",
    'Sunidhi Chauhan headlined Xpressions in 2018.',
    'The 2021 edition went fully online in February 2022, with 24 events.',
    "More than 25 partner brands backed Xpressions '25.",
    'X-Athon is a 10 km run for a cause.',
    "Editions are named for the academic year, so Xpressions '26 happens in 2027."
  ];
  function surprises() {
    const brand = d.querySelector('.brand');
    let clicks = 0, timer;
    brand.addEventListener('click', () => {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 1600);
      if (clicks >= 5) {
        clicks = 0;
        if (window.XPFX) XPFX.celebrate('max');
        if (!XP.unlock('secret')) XP.toast('The fest never sleeps', 'You already found this secret. Enjoy the show.', '🦉');
      }
    });
    if (reduceMQ.matches) return;
    let shownStars = 0;
    const spawn = () => {
      if (d.hidden || shownStars >= 3 || d.querySelector('.xp-modal')) { plan(); return; }
      shownStars++;
      const s = el('button', { class: 'shooting-star', type: 'button', 'aria-label': 'Catch the shooting star', 'data-fx': 'lg' });
      s.innerHTML = SHAPES.star;
      const left = Math.random() < 0.5;
      s.style.top = (18 + Math.random() * 55) + 'vh';
      s.style[left ? 'left' : 'right'] = '10px';
      d.body.appendChild(s);
      const gone = setTimeout(() => s.remove(), 9000);
      s.addEventListener('click', () => {
        clearTimeout(gone);
        s.remove();
        XP.addXP(5);
        XP.count('stars');
        XP.toast('You caught a shooting star! +5 XP', FACTS[(Math.random() * FACTS.length) | 0], '🌠');
      });
      plan();
    };
    const plan = () => setTimeout(spawn, 50000 + Math.random() * 50000);
    plan();
  }

  /* ---------- activity tracking for badges ---------- */
  function tracking() {
    d.addEventListener('toggle', (e) => {
      const det = e.target;
      if (!det.matches || !det.matches('.faq details') || !det.open) return;
      const key = (det.querySelector('summary') || det).textContent.trim().slice(0, 40);
      if (!prog.faq[key]) { prog.faq[key] = 1; save(); checkBadges(); }
    }, true);
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="instagram.com/ximbxpressions/reels"]');
      if (a) XP.count('reels');
    });
  }

  /* ---------- init ---------- */
  function init() {
    toastBox = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    d.body.appendChild(toastBox);
    wipe = el('div', { class: 'wipe', 'aria-hidden': 'true' });
    d.body.appendChild(wipe);
    decor();
    buildHeader();
    countdown();
    fabs();
    surprises();
    tracking();
    addEventListener('hashchange', onPage);
    onPage();
    checkBadges();
    if (window.console) console.log('%cXpressions ’26', 'font:700 20px sans-serif;color:#ffa534', '\nYou found the console. Psst: tap the logo five times.');
  }
  XP.ready = new Promise((res) => {
    const go = () => { init(); res(); };
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', go); else go();
  });
})();
