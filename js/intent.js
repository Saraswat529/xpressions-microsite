/*
 * "Register Your Intent": per-event interest tracker.
 *
 * Interest is NOT a registration. Counts come only from the shared Supabase
 * database (see supabase/schema.sql); nothing is invented or hardcoded.
 *  - Each browser gets a random visitor ID; the database allows one row per
 *    (event, visitor), so repeated clicks never double count.
 *  - Visitors can withdraw at any time.
 *  - Counts refresh every few seconds while the page is visible.
 *  - If the database is not configured yet, picks are kept on the device and
 *    synced automatically once it is.
 *
 * Event data is read from the existing competition cards in index.html
 * (.comp[data-event]); the cards are enhanced in place.
 */
(function () {
  'use strict';
  const d = document;
  const XP = window.XP;
  const cfg = window.XP_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const POLL = Math.max(10, Number(cfg.pollSeconds) || 20) * 1000;
  const WHEN = (cfg.festDates || '31 Jan to 1 Feb 2027') + ' · timing to be announced';
  const LABELS = ["I'm Interested!", 'Count Me In!', 'I Plan to Attend!', 'Add Me to the Crowd!'];
  const CATS = { nights: "Xpressions '26 nights", business: 'Business and management', stage: 'Stage and cultural', social: 'Social and informal' };
  const SHORT = { nights: 'Nights', business: 'Business', stage: 'Stage', social: 'Social' };

  const events = [];
  const byId = {};
  const counts = {};
  const pending = {};
  let mine = {};
  let vid = '';
  let status = LIVE ? 'loading' : 'offline';
  let lastSync = 0;
  let pollTimer = 0;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function rpc(name, body) {
    const url = cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/rpc/' + name;
    return fetch(url, {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---------- rendering ---------- */
  function label(i) { return LABELS[i % LABELS.length]; }

  function countHTML(id) {
    if (!LIVE) return '<span class="ev-soon">Live count opens soon</span>';
    if (counts[id] == null) return '<b>…</b><span> interested</span>';
    const n = counts[id];
    return '<b>' + n + '</b><span> ' + (n === 1 ? 'person' : 'people') + ' interested</span>';
  }

  function intentButton(ev, extra) {
    return '<button class="intent-btn' + (extra || '') + '" type="button" data-intent="' + ev.id + '" aria-pressed="' + (!!mine[ev.id]) + '" aria-label="' + XP.esc(ev.label + ' ' + ev.name) + '">' +
      '<span class="ib-off">' + XP.esc(ev.label) + '</span><span class="ib-on">' + XP.icon('check') + "You're in</span><span class=\"ib-out\">Withdraw</span></button>";
  }

  function renderEvent(id, from) {
    const on = !!mine[id];
    d.querySelectorAll('[data-intent="' + id + '"]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('busy', !!pending[id]);
    });
    d.querySelectorAll('[data-count-for="' + id + '"]').forEach((c) => {
      const prevB = c.querySelector('b');
      const prevNum = prevB ? parseInt(prevB.textContent, 10) : NaN;
      c.innerHTML = countHTML(id);
      const b = c.querySelector('b');
      if (b && LIVE && counts[id] != null) {
        const start = from != null ? from : (isNaN(prevNum) ? 0 : prevNum);
        if (start !== counts[id]) {
          XP.animateNumber(b, start, counts[id]);
          c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
        }
      }
    });
    d.querySelectorAll('.comp.ev[data-event="' + id + '"], .hub-row[data-row="' + id + '"]').forEach((n) => n.classList.toggle('is-in', on));
  }

  function enhanceCard(card, i) {
    const ev = {
      id: card.dataset.event,
      cat: card.dataset.cat || 'stage',
      icon: card.dataset.icon || 'star',
      img: card.dataset.img || '',
      name: (card.querySelector('b') || card).textContent.trim(),
      org: (card.querySelector('small') || { textContent: '' }).textContent.trim(),
      desc: (card.querySelector('p') || { textContent: '' }).textContent.trim(),
      when: card.dataset.when || WHEN,
      tent: card.hasAttribute('data-tentative'),
      label: label(i)
    };
    events.push(ev);
    byId[ev.id] = ev;
    card.classList.add('ev', 'cat-' + ev.cat);
    const body = XP.el('div', { class: 'ev-body' });
    while (card.firstChild) body.appendChild(card.firstChild);
    const vis = XP.el('div', { class: 'ev-visual', 'aria-hidden': 'true' });
    vis.innerHTML = (ev.img ? '<img src="' + ev.img + '" alt="" loading="lazy">' : '') + '<span class="ev-ico">' + XP.icon(ev.icon) + '</span><span class="ev-cat">' + SHORT[ev.cat] + '</span>';
    body.insertAdjacentHTML('beforeend', '<p class="ev-when">' + XP.icon('cal') + '<span>' + XP.esc(ev.when) + '</span></p>');
    const foot = XP.el('div', { class: 'ev-foot' });
    foot.innerHTML = '<p class="ev-count" data-count-for="' + ev.id + '">' + countHTML(ev.id) + '</p><div class="ev-actions">' + intentButton(ev) +
      '<button class="ev-more" type="button" data-details="' + ev.id + '" aria-label="More details about ' + XP.esc(ev.name) + '">More details</button></div>';
    card.append(vis, body, foot);
  }

  /* ---------- event details modal ---------- */
  function openDetails(id) {
    const ev = byId[id];
    if (!ev) return;
    const box = XP.el('div', { class: 'ev-detail cat-' + ev.cat });
    box.innerHTML =
      '<div class="ev-visual big" aria-hidden="true">' + (ev.img ? '<img src="' + ev.img + '" alt="">' : '') + '<span class="ev-ico">' + XP.icon(ev.icon) + '</span><span class="ev-cat">' + XP.esc(CATS[ev.cat]) + '</span></div>' +
      '<p class="eyebrow">' + XP.esc(CATS[ev.cat]) + (ev.org ? ' · ' + XP.esc(ev.org) : '') + '</p>' +
      '<p class="ev-desc">' + XP.esc(ev.desc) + '</p>' +
      '<dl class="ev-dl"><div><dt>When</dt><dd>' + XP.esc(ev.when) + '</dd></div>' +
      '<div><dt>Where</dt><dd>XIM University Old Campus, Bhubaneswar</dd></div>' +
      '<div><dt>Rules, eligibility and fees</dt><dd>To be announced by the organising team <span class="tag">Tentative</span></dd></div></dl>' +
      '<div class="ev-foot"><p class="ev-count" data-count-for="' + ev.id + '" aria-live="polite">' + countHTML(ev.id) + '</p><div class="ev-actions">' + intentButton(ev) + '</div></div>' +
      '<p class="hub-note">Showing interest is not a registration. It helps the organisers plan. Official registrations will open separately.</p>';
    XP.modal({ title: ev.name, content: box, className: 'ev-modal' });
    renderEvent(id);
    XP.count('details');
  }

  /* ---------- toggle ---------- */
  async function toggle(id) {
    const ev = byId[id];
    if (!ev || pending[id]) return;
    const on = !mine[id];
    const before = counts[id];
    pending[id] = true;
    if (on) mine[id] = { at: Date.now(), synced: false }; else delete mine[id];
    saveMine();
    if (LIVE && counts[id] != null) counts[id] = Math.max(0, counts[id] + (on ? 1 : -1));
    renderEvent(id, before);
    feedback(ev, on);
    if (LIVE) {
      try {
        const c = await rpc('set_intent', { p_event: id, p_visitor: vid, p_interested: on });
        counts[id] = Number(c) || 0;
        if (on && mine[id]) mine[id].synced = true;
        saveMine();
        setStatus('live');
      } catch (err) {
        if (on) delete mine[id]; else mine[id] = { at: Date.now(), synced: true };
        counts[id] = before;
        saveMine();
        XP.toast("Couldn't save that", 'Check your connection and try again.', '⚠️');
      }
    }
    pending[id] = false;
    renderEvent(id);
    afterChange();
  }

  function feedback(ev, on) {
    if (!on) { XP.toast('Interest withdrawn', 'You can change your mind any time.', '↩️'); return; }
    const awarded = XP.store.get('intentXP', {});
    if (!awarded[ev.id]) { awarded[ev.id] = 1; XP.store.set('intentXP', awarded); XP.addXP(15); }
    XP.toast("You're on the list for " + ev.name + '!', LIVE ? 'Interest only, not a registration. +15 XP' : 'Saved on this device. It will count once the live tracker opens. +15 XP', '🎉');
  }

  function saveMine() { XP.store.set('intents', mine); }

  function afterChange() {
    XP.setCount('intents', Object.keys(mine).length);
    renderPicks();
    renderHot();
    d.dispatchEvent(new CustomEvent('xp:intents', { detail: Object.keys(mine).length }));
  }

  /* ---------- live counts ---------- */
  function setStatus(s) {
    status = s;
    if (s === 'live') lastSync = Date.now();
    const node = d.getElementById('hubStatus');
    if (!node) return;
    node.className = 'hub-status ' + s;
    node.innerHTML = s === 'live' ? '<i></i>Live counts · refreshing every ' + Math.round(POLL / 1000) + ' seconds'
      : s === 'loading' ? '<i></i>Connecting to live counts…'
      : s === 'error' ? "<i></i>Live counts are unreachable right now. Your picks are safe and we'll retry."
      : '<i></i>The live tracker opens soon. Your picks are saved on this device and will be counted automatically.';
  }

  async function refresh() {
    if (!LIVE || d.hidden) return;
    try {
      const rows = await rpc('get_intent_counts');
      const old = Object.assign({}, counts);
      (rows || []).forEach((r) => { counts[r.event_id] = Number(r.interested) || 0; });
      events.forEach((ev) => { if (counts[ev.id] == null) counts[ev.id] = 0; });
      events.forEach((ev) => { if (old[ev.id] !== counts[ev.id] && !pending[ev.id]) renderEvent(ev.id, old[ev.id] == null ? 0 : old[ev.id]); });
      renderHot();
      setStatus('live');
    } catch (e) {
      setStatus('error');
    }
  }

  async function syncPending() {
    const ids = Object.keys(mine).filter((id) => byId[id] && !mine[id].synced);
    for (const id of ids) {
      try {
        const c = await rpc('set_intent', { p_event: id, p_visitor: vid, p_interested: true });
        const prev = counts[id];
        counts[id] = Number(c) || 0;
        mine[id].synced = true;
        saveMine();
        renderEvent(id, prev);
      } catch (e) { break; }
    }
    if (ids.length) renderHot();
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(refresh, POLL);
    d.addEventListener('visibilitychange', () => { if (!d.hidden && Date.now() - lastSync > POLL / 2) refresh(); });
  }

  /* ---------- register page hub ---------- */
  let hubFilter = 'all';
  function buildHub() {
    const host = d.getElementById('intentHub');
    if (!host) return;
    host.innerHTML =
      '<p class="hub-status" id="hubStatus"></p>' +
      '<div class="hub-picks" id="hubPicks"><div class="picks-body"></div></div>' +
      '<div class="hub-filters" role="group" aria-label="Filter events by category">' +
      ['all', 'nights', 'business', 'stage', 'social'].map((c) => '<button type="button" class="chip-btn" data-filter="' + c + '" aria-pressed="' + (c === 'all') + '" data-fx="sm">' + (c === 'all' ? 'All events' : SHORT[c]) + '</button>').join('') + '</div>' +
      '<ul class="hub-list">' + events.map((ev) =>
        '<li class="hub-row cat-' + ev.cat + (mine[ev.id] ? ' is-in' : '') + '" data-row="' + ev.id + '" data-cat="' + ev.cat + '">' +
        '<span class="hub-ico" aria-hidden="true">' + XP.icon(ev.icon) + '</span>' +
        '<div class="hub-name"><button type="button" class="hub-link" data-details="' + ev.id + '" data-fx="sm">' + XP.esc(ev.name) + '</button><small>' + SHORT[ev.cat] + (ev.org ? ' · ' + XP.esc(ev.org) : '') + '</small></div>' +
        '<p class="ev-count" data-count-for="' + ev.id + '">' + countHTML(ev.id) + '</p>' + intentButton(ev, ' sm') + '</li>').join('') + '</ul>' +
      '<p class="hub-note"><strong>Interest is not a registration.</strong> These numbers show how many people plan to attend each event, so the organisers can plan venues and capacity. Official registrations and passes will open separately and will be announced on Instagram.</p>';
    host.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filter]');
      if (!f) return;
      hubFilter = f.dataset.filter;
      host.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === f)));
      host.querySelectorAll('.hub-row').forEach((r) => { r.hidden = hubFilter !== 'all' && r.dataset.cat !== hubFilter; });
    });
    setStatus(status);
    renderPicks();
    XP.reveal(host);
  }

  function renderPicks() {
    const box = d.querySelector('#hubPicks .picks-body');
    if (!box) return;
    const ids = Object.keys(mine).filter((id) => byId[id]);
    box.innerHTML = ids.length
      ? '<p><b>Your picks: ' + ids.length + ' event' + (ids.length === 1 ? '' : 's') + '</b></p><ul class="pick-chips">' + ids.map((id) => '<li><button type="button" class="pick-chip cat-' + byId[id].cat + '" data-details="' + id + '" data-fx="sm">' + XP.esc(byId[id].name) + '</button></li>').join('') + '</ul>'
      : '<p><b>Your picks: none yet.</b> Tap a button below to tell us what you want to attend.</p>';
  }

  /* ---------- home: most wanted (live data only) ---------- */
  function renderHot() {
    const sec = d.getElementById('hotSection'), host = d.getElementById('hotEvents');
    if (!sec || !host) return;
    if (!LIVE || status !== 'live') { sec.hidden = true; return; }
    const top = events.filter((e) => counts[e.id] > 0).sort((a, b) => counts[b.id] - counts[a.id]).slice(0, 3);
    if (!top.length) { sec.hidden = true; return; }
    const max = counts[top[0].id];
    host.innerHTML = top.map((ev, i) =>
      '<button type="button" class="hot-card cat-' + ev.cat + '" data-details="' + ev.id + '"><span class="hot-rank">#' + (i + 1) + '</span><span class="hot-name">' + XP.esc(ev.name) + '<small>' + SHORT[ev.cat] + '</small></span>' +
      '<span class="hot-bar"><i style="width:' + Math.max(8, counts[ev.id] / max * 100) + '%"></i></span><span class="hot-n"><b>' + counts[ev.id] + '</b> interested</span></button>').join('');
    sec.hidden = false;
    XP.reveal(sec);
  }

  /* ---------- init ---------- */
  XP.ready.then(() => {
    vid = XP.store.get('vid', '');
    if (!vid) { vid = uuid(); XP.store.set('vid', vid); }
    mine = XP.store.get('intents', {}) || {};
    d.querySelectorAll('.comp[data-event]').forEach(enhanceCard);
    Object.keys(mine).forEach((id) => { if (!byId[id]) delete mine[id]; });
    buildHub();
    events.forEach((ev) => renderEvent(ev.id));
    XP.setCount('intents', Object.keys(mine).length);

    d.addEventListener('click', (e) => {
      const ib = e.target.closest('[data-intent]');
      if (ib) { e.preventDefault(); toggle(ib.dataset.intent); return; }
      const det = e.target.closest('[data-details]');
      if (det) { e.preventDefault(); openDetails(det.dataset.details); return; }
      const card = e.target.closest('.comp.ev');
      if (card && !e.target.closest('a, button, .explorer')) openDetails(card.dataset.event);
    });

    XP.intentCount = () => Object.keys(mine).length;
    XP.openEvent = openDetails;
    d.dispatchEvent(new CustomEvent('xp:intents', { detail: Object.keys(mine).length }));

    if (LIVE) {
      setStatus('loading');
      refresh().then(() => { if (status === 'live') syncPending(); });
      startPolling();
    } else {
      setStatus('offline');
    }
  });
})();
