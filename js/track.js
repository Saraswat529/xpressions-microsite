/*
 * Campaign tracking and the A/B headline experiment.
 *
 * Attribution: links and QR codes carry UTM parameters (utm_source, utm_medium, utm_campaign,
 * utm_content). On arrival they are saved for the browsing session and then removed from the
 * address bar, so a copied link does not mis-attribute. Visits without UTM fall back to the
 * referring site, or "(direct)".
 *
 * Experiment: each visitor is randomly and permanently assigned headline A (control) or B.
 * Append ?ab=a or ?ab=b to preview a variant (preview visits are not counted).
 *
 * Ethics: anonymous only (a random browser id, no names, emails, IPs or fingerprints). Browsers
 * that send Do Not Track or Global Privacy Control are never logged. Nothing is sent until the
 * database functions in supabase/campaign.sql exist; failures are silent and never affect the page.
 * Public API: window.XPTrack.log(kind, detail)
 */
(function () {
  'use strict';
  const cfg = window.XP_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const exp = cfg.experiment || {};
  const params = new URLSearchParams(location.search);
  const optOut = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;

  const ls = {
    get(k) { try { const v = localStorage.getItem('xp:' + k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('xp:' + k, JSON.stringify(v)); } catch (e) { /* blocked */ } }
  };
  const ss = {
    get(k) { try { const v = sessionStorage.getItem('xp:' + k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem('xp:' + k, JSON.stringify(v)); } catch (e) { /* blocked */ } }
  };
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16); crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  /* ---------- visitor + session + attribution ---------- */
  let vid = ls.get('vid');
  if (!vid) { vid = uuid(); ls.set('vid', vid); }
  const utm = {};
  ['source', 'medium', 'campaign', 'content'].forEach((k) => { const v = params.get('utm_' + k); if (v) utm[k] = v.slice(0, 80); });
  let sess = ss.get('session');
  if (!sess || utm.source) {
    let ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { ref = ''; }
    if (ref === location.hostname) ref = '';
    sess = {
      id: uuid(),
      source: utm.source || (ref ? ref.replace(/^www\./, '') : '(direct)'),
      medium: utm.medium || (ref ? 'referral' : '(none)'),
      campaign: utm.campaign || '(none)',
      content: utm.content || '(none)',
      logged: {}
    };
    ss.set('session', sess);
  }
  // Clean UTM parameters out of the address bar (keeps the hash route).
  if (Object.keys(utm).length && history.replaceState) {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => params.delete(k));
    const q = params.toString();
    history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  /* ---------- experiment assignment ---------- */
  const forced = (params.get('ab') || '').toLowerCase();
  const preview = forced === 'a' || forced === 'b';
  let variant = null;
  if (exp.id && exp.b) {
    const key = 'ab:' + exp.id;
    variant = preview ? forced : ls.get(key);
    if (variant !== 'a' && variant !== 'b') { variant = Math.random() < 0.5 ? 'a' : 'b'; ls.set(key, variant); }
    if (variant === 'b') {
      const h1 = document.querySelector(exp.selector || '#p-home .hero h1');
      if (h1) h1.innerHTML = exp.b.html;
    }
    document.documentElement.setAttribute('data-ab-' + exp.id, variant);
  }

  /* ---------- logging ---------- */
  const canLog = LIVE && !optOut && !preview;
  let count = 0;
  let disabled = !!ss.get('trackOff');
  function send(kind, detail) {
    if (!canLog || disabled || count >= 70) return;
    count++;
    const body = {
      p_visitor: vid, p_session: sess.id, p_kind: kind,
      p_source: sess.source, p_medium: sess.medium, p_campaign: sess.campaign, p_content: sess.content,
      p_variant: variant, p_detail: detail ? String(detail).slice(0, 120) : null
    };
    try {
      fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/rpc/log_event', {
        method: 'POST', keepalive: true,
        headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then((r) => {
        // Database functions not installed yet: stop trying for this session.
        if (r.status === 404) { disabled = true; ss.set('trackOff', 1); }
      }).catch(() => { /* tracking must never affect the page */ });
    } catch (e) { /* ignore */ }
  }
  function once(kind, detail) {
    const k = kind + ':' + (detail || '');
    if (sess.logged[k]) return;
    sess.logged[k] = 1;
    ss.set('session', sess);
    send(kind, detail);
  }

  window.XPTrack = {
    log: send, once,
    variant: () => variant,
    attribution: () => ({ source: sess.source, medium: sess.medium, campaign: sess.campaign, content: sess.content }),
    enabled: () => canLog
  };

  once('visit', (location.hash || '#home').slice(1));

  const pages = ['home', 'highlights', 'programme', 'competitions', 'register', 'faq'];
  const currentSection = () => { const h = (location.hash || '').slice(1); return pages.indexOf(h) > -1 ? h : 'home'; };
  once('section', currentSection());
  addEventListener('hashchange', () => once('section', currentSection()));

  document.addEventListener('click', (e) => {
    const cta = e.target.closest && e.target.closest('[data-cta]');
    if (cta) send('cta_click', cta.getAttribute('data-cta'));
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (a && a.hostname !== location.hostname) send('outbound', a.hostname.replace(/^www\./, ''));
  }, true);
  document.addEventListener('xp:intent', (e) => { if (e.detail && e.detail.on) send('intent', e.detail.id); });
  document.addEventListener('xp:explorer', (e) => send('explorer', e.detail && e.detail.id));
})();
