/*
 * Step 5 analytics report (analytics.html). Reads get_analytics_report() and get_search_stats()
 * from Supabase (see supabase/analytics.sql) and renders the metrics, funnel, device split,
 * before/after effect of the improvement in config.improvements, and data-driven findings.
 */
(function () {
  'use strict';
  const d = document;
  const cfg = window.XP_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const imp = (cfg.improvements || [])[0] || null;
  const $ = (id) => d.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '–');
  const rate = (a, b) => (b ? a / b : 0);
  const secs = (s) => { s = Math.round(s || 0); if (!s) return '0s'; const m = Math.floor(s / 60); return m ? m + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's'; };
  const label = (src, med) => esc(src) + ' / ' + esc(med);
  const PAGE = { home: 'Home', highlights: 'Highlights', programme: 'Programme', competitions: 'Competitions', register: 'Register', faq: 'FAQ' };

  function rpc(name, body) {
    return fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(async (r) => {
      if (!r.ok) { let m = 'HTTP ' + r.status; try { const j = await r.json(); m = j.message || m; } catch (e) { /* ignore */ } const err = new Error(m); err.status = r.status; throw err; }
      const t = await r.text();
      return t ? JSON.parse(t) : null;
    });
  }
  function setStatus(cls, text) { $('status').className = 'status ' + cls; $('status').querySelector('span').textContent = text; }

  /* two-proportion z-test */
  function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const p = 0.3989423 * Math.exp(-z * z / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  function ztest(x1, n1, x2, n2) { if (!n1 || !n2) return null; const p = (x1 + x2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); if (!se) return null; const z = (x2 / n2 - x1 / n1) / se; return { z, p: 2 * (1 - phi(Math.abs(z))) }; }

  let report = null, search = [];

  function renderSummary(t) {
    $('kUsers').textContent = t.users;
    $('kSessions').textContent = t.sessions;
    $('kEngRate').textContent = pct(t.engaged_sessions, t.sessions);
    $('kEngTime').textContent = t.sessions_with_time ? secs(t.engage_total / Math.max(1, t.users)) : 'n/a';
    $('kViews').textContent = t.views;
    $('kVps').textContent = t.sessions ? (t.views / t.sessions).toFixed(2) : '–';
    $('kCta').textContent = t.cta_clicks;
    $('kStarts').textContent = t.reg_start_sessions;
    $('kDone').textContent = t.completions;
    $('kConv').textContent = pct(t.converted_sessions, t.sessions);
    $('kDl').textContent = t.download_sessions;
  }

  function renderChannels(rows) {
    $('chRows').innerHTML = rows.length ? rows.map((c) =>
      '<tr><td>' + label(c.source, c.medium) + '</td><td class="num">' + c.users + '</td><td class="num">' + c.sessions + '</td><td class="num">' + pct(c.engaged_sessions, c.sessions) + '</td><td class="num">' +
      (c.sessions_with_time ? secs(c.engage_total / c.sessions) : 'n/a') + '</td><td class="num">' + pct(c.cta_sessions, c.sessions) + '</td><td class="num">' + c.reg_start_sessions + '</td><td class="num">' + c.converted_sessions + '</td><td class="num">' + pct(c.converted_sessions, c.sessions) + '</td></tr>').join('')
      : '<tr><td colspan="9" class="muted">No sessions yet.</td></tr>';
  }

  function renderPages(pages, content) {
    const max = Math.max(1, ...pages.map((p) => p.views));
    $('pageBars').innerHTML = pages.length ? pages.map((p) =>
      '<div class="day-row"><span>' + esc(PAGE[p.page] || p.page) + '</span><span class="bar"><i style="width:' + (p.views / max * 100) + '%"></i></span><span class="num">' + p.views + ' views</span></div>').join('')
      : '<p class="muted small">No page views yet.</p>';
    $('contentRows').innerHTML = content.length ? content.map((c) => '<tr><td>' + esc(nice(c.item)) + '</td><td class="num">' + c.interactions + '</td><td class="num">' + c.sessions + '</td></tr>').join('')
      : '<tr><td colspan="3" class="muted">No content clicks recorded yet (content tracking started 25 Nov).</td></tr>';
  }
  function nice(s) {
    return String(s).replace(/^artist:/, 'Artist spotlight: ').replace(/^event:/, 'Event details: ').replace(/^gallery$/, 'Photo gallery').replace(/^hunt_open$/, 'Explorer hunt opened').replace(/^passport$/, 'Festival passport').replace(/^calendar$/, 'Schedule download (.ics)').replace(/^google_calendar$/, 'Add to Google Calendar').replace(/^e(\d)$/, 'Explorer $1 found');
  }

  function renderFunnel(f, exits) {
    const steps = [
      ['Landed', 'Sessions that opened the site', f.landed],
      ['Engaged', '10+ s in view, 2+ pages or an action', f.engaged],
      ['Reached the event picker', 'Register or Competitions page', f.reached_events],
      ['Started registering', 'Picker reached or event details opened', f.reg_start],
      ['Registered interest', 'Tapped "Count Me In" for an event', f.converted]
    ];
    let worst = -1, worstIdx = -1;
    $('funnelSteps').innerHTML = steps.map((s, i) => {
      const prev = i ? steps[i - 1][2] : s[2];
      const drop = i && prev ? 1 - s[2] / prev : 0;
      if (i && prev && drop > worst) { worst = drop; worstIdx = i; }
      return '<div class="f-step" data-i="' + i + '"><div class="lbl"><b>' + (i + 1) + '. ' + s[0] + '</b><small>' + s[1] + '</small></div>' +
        '<div class="f-bar"><i style="width:' + (f.landed ? s[2] / f.landed * 100 : 0) + '%"></i><span>' + s[2] + ' (' + pct(s[2], f.landed) + ')</span></div>' +
        '<div class="f-drop">' + (i ? (prev ? '−' + (drop * 100).toFixed(0) + '% from step ' + i : '–') : 'start') + '</div></div>';
    }).join('');
    if (worstIdx > 0) { const el = $('funnelSteps').querySelector('[data-i="' + worstIdx + '"] .f-drop'); if (el) el.classList.add('bad'); }
    $('exitRows').innerHTML = exits.length ? exits.map((x) => '<tr><td>' + esc(PAGE[x.page] || x.page) + '</td><td class="num">' + x.sessions + '</td><td class="num">' + x.after_seeing_events + '</td></tr>').join('')
      : '<tr><td colspan="3" class="muted">No data yet.</td></tr>';
    return { steps, worstIdx, worst };
  }

  function renderDevices(rows) {
    $('devRows').innerHTML = rows.length ? rows.map((r) =>
      '<tr><td>' + esc(r.device.charAt(0).toUpperCase() + r.device.slice(1)) + '</td><td class="num">' + r.users + '</td><td class="num">' + r.sessions + '</td><td class="num">' + pct(r.engaged_sessions, r.sessions) + '</td><td class="num">' +
      (r.sessions_with_time ? secs(r.engage_total / r.sessions) : 'n/a') + '</td><td class="num">' + (r.sessions ? (r.views / r.sessions).toFixed(2) : '–') + '</td><td class="num">' + pct(r.cta_sessions, r.sessions) + '</td><td class="num">' + pct(r.converted_sessions, r.sessions) + '</td></tr>').join('')
      : '<tr><td colspan="8" class="muted">No data yet.</td></tr>';
  }

  function renderSearch() {
    $('searchRows').innerHTML = search.length ? search.map((s) =>
      '<tr><td>' + esc(s.period_start) + ' to ' + esc(s.period_end) + '</td><td class="num">' + s.impressions + '</td><td class="num">' + s.clicks + '</td><td class="num">' + pct(s.clicks, s.impressions) + '</td><td class="num">' + (s.avg_position != null ? Number(s.avg_position).toFixed(1) : '–') + '</td><td>' + esc(s.top_query || '') + '</td></tr>').join('') +
      (search.length > 1 ? '<tr><td><b>Total</b></td><td class="num"><b>' + search.reduce((a, s) => a + s.impressions, 0) + '</b></td><td class="num"><b>' + search.reduce((a, s) => a + s.clicks, 0) + '</b></td><td class="num"><b>' + pct(search.reduce((a, s) => a + s.clicks, 0), search.reduce((a, s) => a + s.impressions, 0)) + '</b></td><td></td><td></td></tr>' : '')
      : '<tr><td colspan="6" class="muted">No Search Console figures added yet. Add them below once Google has crawled the site.</td></tr>';
  }

  function renderImprovement(change) {
    const box = $('impBody');
    if (!imp) { box.innerHTML = '<p class="muted">No improvement recorded in js/config.js.</p>'; return null; }
    const when = new Date(imp.launched);
    const before = (change || []).find((r) => r.period === 'before') || { sessions: 0, users: 0, engaged_sessions: 0, reached_events: 0, reg_start_sessions: 0, cta_sessions: 0, converted_sessions: 0, download_sessions: 0 };
    const after = (change || []).find((r) => r.period === 'after') || { sessions: 0, users: 0, engaged_sessions: 0, reached_events: 0, reg_start_sessions: 0, cta_sessions: 0, converted_sessions: 0, download_sessions: 0 };
    const row = (name, a, b, fmt) => '<tr><td>' + name + '</td><td class="num">' + fmt(before, a) + '</td><td class="num">' + fmt(after, b) + '</td></tr>';
    const r = (num, den) => (o) => pct(o[num], o[den]);
    let verdict;
    const MIN = 20;
    if (after.sessions < MIN) {
      verdict = 'Too early to measure: only ' + after.sessions + ' session' + (after.sessions === 1 ? '' : 's') + ' since the change went live (' + before.sessions + ' before). This section updates automatically; aim for at least ' + MIN + ' sessions after the change before drawing conclusions.';
    } else {
      const t = ztest(before.converted_sessions, before.sessions, after.converted_sessions, after.sessions);
      const cb = rate(before.converted_sessions, before.sessions), ca = rate(after.converted_sessions, after.sessions);
      const dir = ca > cb ? 'rose' : ca < cb ? 'fell' : 'did not change';
      verdict = 'Conversion ' + dir + ' from ' + (cb * 100).toFixed(1) + '% (' + before.sessions + ' sessions before) to ' + (ca * 100).toFixed(1) + '% (' + after.sessions + ' sessions after)' +
        (t ? ', p = ' + t.p.toFixed(3) + '. ' + (t.p < 0.05 ? 'The difference is statistically significant at the 5% level.' : 'The difference is not statistically significant yet, so treat it as directional.') : '.') +
        ' Traffic sources also changed between the two periods, so this is an observed association rather than proof of cause.';
    }
    box.innerHTML =
      '<h3>' + esc(imp.title) + '</h3>' +
      '<p class="small"><b>Launched:</b> ' + when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) + ' IST</p>' +
      '<p class="small"><b>What the data showed:</b> ' + esc(imp.finding) + '</p>' +
      '<p class="small"><b>What we changed:</b> ' + esc(imp.change) + '</p>' +
      '<p class="small"><b>How we measure it:</b> ' + esc(imp.metric) + '</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Metric</th><th class="num">Before</th><th class="num">After</th></tr></thead><tbody>' +
      row('Sessions', 0, 0, (o) => o.sessions) +
      row('Engagement rate', 0, 0, r('engaged_sessions', 'sessions')) +
      row('Reached the event picker', 0, 0, r('reached_events', 'sessions')) +
      row('Picker → registered (of those who reached it)', 0, 0, r('converted_sessions', 'reg_start_sessions')) +
      row('Conversion rate (sessions that registered)', 0, 0, r('converted_sessions', 'sessions')) +
      row('Schedule downloads (sessions)', 0, 0, (o) => o.download_sessions) +
      '</tbody></table></div><p class="verdict">' + esc(verdict) + '</p>';
    return { before, after };
  }

  function renderFindings(rep, fun, effect) {
    const t = rep.totals, out = [], recs = [];
    const ch = rep.by_channel.slice().sort((a, b) => b.sessions - a.sessions);
    if (ch.length) {
      const top = ch[0];
      out.push('<b>' + label(top.source, top.medium) + '</b> brought the most visitors: ' + top.sessions + ' of ' + t.sessions + ' sessions (' + pct(top.sessions, t.sessions) + ').' +
        (top.source === '(direct)' ? ' "Direct" means no tracked link or referrer, such as typed URLs, bookmarks, chat apps that strip referrers, or untagged shares.' : ''));
      const tagged = ch.filter((c) => c.source !== '(direct)');
      if (tagged.length) out.push('Tagged and referral channels: ' + tagged.map((c) => label(c.source, c.medium) + ' (' + c.sessions + ')').join(', ') + '.');
      if (top.source === '(direct)' && rate(top.sessions, t.sessions) > 0.5) recs.push('Share only the tracked links and QR codes from the campaign toolkit. Most traffic is untagged, so channel performance cannot be compared.');
    }
    const pages = rep.pages.filter((p) => p.page !== 'home').sort((a, b) => b.views - a.views);
    if (pages.length) out.push('After Home, the most-viewed page is <b>' + esc(PAGE[pages[0].page] || pages[0].page) + '</b> (' + pages[0].views + ' views). Views per session: ' + (t.sessions ? (t.views / t.sessions).toFixed(2) : '–') + '.');
    if (rep.content.length) out.push('Most-clicked content: <b>' + esc(nice(rep.content[0].item)) + '</b> (' + rep.content[0].interactions + ' clicks).');
    out.push('CTA: ' + t.cta_sessions + ' of ' + t.sessions + ' sessions (' + pct(t.cta_sessions, t.sessions) + ') clicked "Register Your Intent Now"; ' + t.converted_sessions + ' session' + (t.converted_sessions === 1 ? '' : 's') + ' registered interest (' + pct(t.converted_sessions, t.sessions) + ').');
    if (fun.worstIdx > 0) {
      const s = fun.steps[fun.worstIdx], p = fun.steps[fun.worstIdx - 1];
      out.push('The biggest drop-off is between <b>' + p[0].toLowerCase() + '</b> and <b>' + s[0].toLowerCase() + '</b>: ' + p[2] + ' → ' + s[2] + ' sessions (−' + (fun.worst * 100).toFixed(0) + '%). This is where visitors abandon the intended journey.');
      if (fun.worstIdx >= 3) recs.push('Reduce friction at the event picker: keep the picker at the top of the Register page, show one-tap buttons on Home, and test a shorter list of the most popular events first (now implemented; see the improvement section).');
      if (fun.worstIdx === 2) recs.push('More visitors need to reach the event picker: make the hero button wording more specific (the A/B test) and link the "Most wanted" cards straight to the picker.');
      if (fun.worstIdx === 1) recs.push('Many visits bounce in under 10 seconds: make the first screen load faster on mobile and lead with the dates and a single clear action.');
    }
    const dev = rep.by_device.filter((r) => r.device !== 'unknown');
    const mob = dev.find((r) => r.device === 'mobile'), desk = dev.find((r) => r.device === 'desktop');
    if (mob && desk) {
      out.push('Mobile: ' + mob.sessions + ' sessions, engagement ' + pct(mob.engaged_sessions, mob.sessions) + ', conversion ' + pct(mob.converted_sessions, mob.sessions) + '. Desktop: ' + desk.sessions + ' sessions, engagement ' + pct(desk.engaged_sessions, desk.sessions) + ', conversion ' + pct(desk.converted_sessions, desk.sessions) + '.');
      if (rate(mob.converted_sessions, mob.sessions) < rate(desk.converted_sessions, desk.sessions)) recs.push('Mobile converts worse than desktop: keep the main action within the first screen on phones and test a sticky "Pick your events" bar on mobile.');
    } else if (dev.length) out.push('Device data so far: ' + dev.map((r) => r.device + ' ' + r.sessions + ' sessions').join(', ') + '.');
    else out.push('Device-level data starts from 25 Nov (earlier sessions show as "unknown").');
    const ex = rep.experiment || [];
    const A = ex.find((x) => x.variant === 'a'), B = ex.find((x) => x.variant === 'b');
    if (A && B) out.push('A/B headline test: A ("' + esc((cfg.experiment.a || {}).label || 'A') + '") ' + pct(A.cta_sessions, A.sessions) + ' CTA click rate over ' + A.sessions + ' sessions, vs B ("' + esc((cfg.experiment.b || {}).label || 'B') + '") ' + pct(B.cta_sessions, B.sessions) + ' over ' + B.sessions + '. ' + ((A.sessions < 30 || B.sessions < 30) ? 'Too few sessions to declare a winner.' : ''));
    if (!search.length) recs.push('Verify the site in Google Search Console and submit sitemap.xml, so search impressions, clicks and CTR can be reported.');
    const conv = ch.filter((c) => c.sessions >= 5 && c.source !== '(direct)').sort((a, b) => rate(b.converted_sessions, b.sessions) - rate(a.converted_sessions, a.sessions))[0];
    recs.push(conv ? 'Put more effort into ' + label(conv.source, conv.medium) + ', which converts best among tagged channels (' + pct(conv.converted_sessions, conv.sessions) + '), and reuse its creative in other channels.'
      : 'Once each tagged channel has at least 5 sessions, put more effort into the one with the best conversion rate and reuse its creative.');
    $('autoFindings').innerHTML = out.map((x) => '<li>' + x + '</li>').join('');
    $('recs').innerHTML = recs.map((x) => '<li>' + x + '</li>').join('');
    const limits = [
      'Small sample: ' + t.sessions + ' sessions from ' + t.users + ' users. Percentages move a lot with each visit and are directional, not conclusive.',
      'Anonymous browser IDs: one person on two devices counts as two users, and clearing the browser creates a new user.',
      'Visitors whose browsers send Do Not Track or Global Privacy Control, or who block scripts, are not counted.',
      'Engagement time, device type, registration starts, downloads and content clicks were added on 25 Nov, so earlier sessions lack them.',
      'The event interest counters shown on the site include sample data prepared for the mock presentation; this report uses only the separate visit analytics, which are real recorded sessions.',
      'Tracking began on 20 Nov, after most of the 8–20 Nov campaign; earlier visits were not recorded because the site host keeps no visitor logs.',
      'Search Console figures are entered by hand and lag by 2–3 days.',
      'The before/after comparison is observational: traffic mix and timing changed between periods, so effects cannot be attributed to the change alone.'
    ];
    $('limits').innerHTML = limits.map((x) => '<li>' + esc(x) + '</li>').join('');
  }

  async function load() {
    if (!LIVE) { setStatus('setup', 'Supabase is not configured in js/config.js'); return; }
    try {
      const [rep, srch] = await Promise.all([
        rpc('get_analytics_report', { p_change: imp ? imp.launched : null }),
        rpc('get_search_stats').catch(() => [])
      ]);
      report = rep; search = srch || [];
      $('setup').hidden = true;
      if (rep.first_event) $('since').textContent = 'Data since ' + new Date(rep.first_event).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) + '.';
      renderSummary(rep.totals);
      renderChannels(rep.by_channel || []);
      renderPages(rep.pages || [], rep.content || []);
      const fun = renderFunnel(rep.funnel, rep.exits || []);
      renderDevices(rep.by_device || []);
      renderSearch();
      const eff = renderImprovement(rep.change);
      renderFindings(rep, fun, eff);
      setStatus('live', 'Live · updated ' + new Date().toLocaleTimeString());
    } catch (e) {
      if (e.status === 404 || /function|schema cache/i.test(e.message)) { $('setup').hidden = false; setStatus('setup', 'Waiting for one-time database setup'); }
      else setStatus('error', 'Could not load the report (' + e.message + ')');
    }
  }

  function setupSearchForm() {
    const f = $('searchForm'), msg = $('searchMsg');
    const say = (t, ok) => { msg.textContent = t; msg.className = ok ? 'ok' : 'err'; };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const impr = parseInt(f.impr.value, 10), clicks = parseInt(f.clicks.value, 10);
      const bad = [];
      if (!f.start.value) bad.push('from');
      if (!f.end.value || f.end.value < f.start.value) bad.push('to');
      if (isNaN(impr) || impr < 0) bad.push('impressions');
      if (isNaN(clicks) || clicks < 0 || clicks > impr) bad.push('clicks');
      if (!f.passcode.value) bad.push('passcode');
      if (bad.length) { say('Please check: ' + bad.join(', ') + '.'); return; }
      try {
        await rpc('add_search_stats', { p_passcode: f.passcode.value, p_start: f.start.value, p_end: f.end.value, p_impressions: impr, p_clicks: clicks, p_position: f.pos.value ? Number(f.pos.value) : null, p_query: f.query.value || null });
        say('Added.', true);
        search = await rpc('get_search_stats'); renderSearch();
      } catch (err) { say(/passcode/i.test(err.message) ? 'Wrong team passcode.' : 'Could not save: ' + err.message); }
    });
  }

  function init() {
    $('cName').textContent = (cfg.campaign && cfg.campaign.name) || 'xp27_nov';
    $('refresh').addEventListener('click', load);
    $('jsonDl').addEventListener('click', () => {
      if (!report) return;
      const a = d.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ report, search, improvement: imp }, null, 2)], { type: 'application/json' }));
      a.download = 'xpressions27-analytics-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
    });
    setupSearchForm();
    load();
    setInterval(() => { if (!d.hidden) load(); }, 60000);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
