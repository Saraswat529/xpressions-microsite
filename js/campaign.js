/*
 * Campaign toolkit (campaign.html): tracked links + QR codes, three promotional creatives
 * rendered on canvas, the traffic report, A/B experiment results and the dated campaign log.
 * Depends on js/config.js and qrcode-generator (cdnjs). No other libraries.
 */
(function () {
  'use strict';
  const d = document;
  const cfg = window.XP_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const SITE = (cfg.siteUrl || 'https://saraswat529.github.io/xpressions-microsite/').replace(/\/?$/, '/');
  const CAMPAIGN = (cfg.campaign && cfg.campaign.name) || 'xp27_nov';
  const EDITION = cfg.edition || "Xpressions'27";
  const LOGO = cfg.logo || 'img/logo-xpressions-27.jpg';
  const $ = (id) => d.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  /* ---------- tracked links ---------- */
  function link(source, medium, content, page) {
    const q = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: CAMPAIGN, utm_content: content });
    return SITE + '?' + q.toString() + (page || '');
  }
  const PRESETS = [
    { label: 'Instagram post', note: 'Creative 1 caption and comments', source: 'instagram', medium: 'social', content: 'post_countmein', page: '#register' },
    { label: 'Instagram story', note: 'Creative 2 link sticker', source: 'instagram', medium: 'story', content: 'story_explorer', page: '' },
    { label: 'Campus poster QR', note: 'Creative 3, printed on notice boards', source: 'campus', medium: 'print', content: 'poster_qr', page: '' },
    { label: 'Instagram bio', note: 'Link in the @ximbxpressions bio', source: 'instagram', medium: 'social', content: 'bio', page: '' },
    { label: 'WhatsApp groups', note: 'Class, club and hostel groups', source: 'whatsapp', medium: 'messaging', content: 'group_message', page: '' },
    { label: 'LinkedIn post', note: 'Student and alumni network', source: 'linkedin', medium: 'social', content: 'post', page: '' },
    { label: 'Email', note: 'Student mailing lists', source: 'email', medium: 'email', content: 'mailer', page: '' }
  ];

  /* ---------- QR drawing (qrcode-generator) ---------- */
  function drawQR(g, text, x, y, size, dark) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), quiet = 3;
    const cell = Math.floor(size / (n + quiet * 2));
    const real = cell * (n + quiet * 2), off = Math.floor((size - real) / 2);
    g.fillStyle = '#ffffff';
    g.fillRect(x, y, size, size);
    g.fillStyle = dark || '#0a0e1f';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) g.fillRect(x + off + (c + quiet) * cell, y + off + (r + quiet) * cell, cell, cell);
    }
  }
  function qrCanvas(text, size) {
    const c = d.createElement('canvas');
    c.width = c.height = size;
    drawQR(c.getContext('2d'), text, 0, 0, size);
    return c;
  }
  function qrPoster(item, url) {
    const c = d.createElement('canvas');
    c.width = 900; c.height = 1040;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    drawQR(g, url, 60, 50, 780);
    g.fillStyle = '#0a0e1f'; g.textAlign = 'center';
    g.font = '700 40px "Hanken Grotesk", sans-serif'; g.fillText(EDITION + ' · ' + item.label, 450, 900);
    g.fillStyle = '#4a5275'; g.font = '500 26px "Hanken Grotesk", sans-serif';
    g.fillText(item.source + ' / ' + item.medium + ' / ' + item.content, 450, 950);
    return c;
  }
  function download(canvas, name) {
    const a = d.createElement('a');
    a.download = name;
    a.href = canvas.toDataURL('image/png');
    d.body.appendChild(a); a.click(); a.remove();
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const t = d.createElement('textarea'); t.value = text; d.body.appendChild(t); t.select(); d.execCommand('copy'); t.remove(); }
    const old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = old; }, 1400);
  }
  function linkCard(item) {
    const url = link(item.source, item.medium, item.content, item.page);
    const card = d.createElement('div');
    card.className = 'link-card';
    card.appendChild(qrCanvas(url, 224));
    const meta = d.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = '<b>' + esc(item.label) + '</b>' + (item.note ? '<span class="muted small">' + esc(item.note) + '</span>' : '') +
      '<span class="url">' + esc(url) + '</span><div class="row"><button class="btn sm" type="button" data-copy>Copy link</button><button class="btn sm" type="button" data-qr>Download QR</button></div>';
    card.appendChild(meta);
    meta.querySelector('[data-copy]').addEventListener('click', (e) => copy(url, e.currentTarget));
    meta.querySelector('[data-qr]').addEventListener('click', () => download(qrPoster(item, url), 'qr-' + item.source + '-' + item.content + '.png'));
    return card;
  }

  /* ---------- creatives ---------- */
  const MASCOT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="400" height="460">' +
    '<path d="M14 40l-2.5 4.5M26 40l2.5 4.5" stroke="#1a1100" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="28" rx="13" ry="13" fill="#ffa534" stroke="#1a1100" stroke-width="2"/>' +
    '<path d="M11 17c0-7 4-11.5 9-11.5S29 10 29 17z" fill="#52c7ff" stroke="#1a1100" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M11.6 14.6h16.8" stroke="#ff6aa6" stroke-width="2.6"/><path d="M5.5 17.5h29" stroke="#1a1100" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="15" cy="26" r="3.4" fill="#fff"/><circle cx="25" cy="26" r="3.4" fill="#fff"/><circle cx="15.9" cy="26.6" r="1.7" fill="#0a0e1f"/><circle cx="25.9" cy="26.6" r="1.7" fill="#0a0e1f"/>' +
    '<path d="M15.5 33q4.5 3.6 9 0" stroke="#1a1100" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="10.5" cy="31" r="1.8" fill="#ff6aa6" opacity=".7"/><circle cx="29.5" cy="31" r="1.8" fill="#ff6aa6" opacity=".7"/></svg>';
  const DISP = '"Unbounded", "Trebuchet MS", sans-serif', BODY = '"Hanken Grotesk", "Segoe UI", sans-serif';
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  let assets = null;
  async function getAssets() {
    if (assets) return assets;
    try { await Promise.all([d.fonts.load('700 60px Unbounded'), d.fonts.load('500 30px "Hanken Grotesk"'), d.fonts.load('700 30px "Hanken Grotesk"')]); } catch (e) { /* system fonts */ }
    const [logo, mascot] = await Promise.all([loadImg(LOGO), loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MASCOT))]);
    assets = { logo, mascot };
    return assets;
  }
  function stage(g, W, H) {
    g.fillStyle = '#0a0e1f'; g.fillRect(0, 0, W, H);
    const glow = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(10,14,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
    glow(W * 0.1, H * 0.15, W * 0.8, 'rgba(82,199,255,.22)');
    glow(W * 0.95, H * 0.85, W * 0.8, 'rgba(255,106,166,.18)');
    glow(W * 0.5, H * 0.5, W * 0.6, 'rgba(255,165,52,.08)');
    const zig = (y, dir) => { const s = Math.round(W / 40); for (let x = 0; x < W; x += s) { g.fillStyle = (x / s) % 2 ? '#ffa534' : '#52c7ff'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s / 2, y + dir * s * 0.8); g.lineTo(x + s, y); g.fill(); } };
    zig(0, 1); zig(H, -1);
    g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) { const x = (i * 397) % W, y = (i * 613) % H; g.fillStyle = ['#ffa534', '#52c7ff', '#ff6aa6', '#ffe066'][i % 4]; g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
  }
  function logo(g, img, cx, y, w) {
    const h = w * img.naturalHeight / img.naturalWidth;
    g.globalCompositeOperation = 'screen';
    g.drawImage(img, cx - w / 2, y, w, h);
    g.globalCompositeOperation = 'source-over';
    return y + h;
  }
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t;
    }
    if (line) g.fillText(line, x, yy);
    return yy + lh;
  }
  function pill(g, text, cx, y, font, bg, fg, padX, h) {
    g.font = font;
    const w = g.measureText(text).width + padX * 2;
    g.fillStyle = bg; g.beginPath(); g.roundRect(cx - w / 2, y, w, h, h / 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cx, y + h / 2 + 2); g.textBaseline = 'alphabetic';
    return w;
  }
  function qrCard(g, url, x, y, size, label) {
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(x - 14, y - 14, size + 28, size + 28 + (label ? 50 : 0), 22); g.fill();
    drawQR(g, url, x, y, size);
    if (label) { g.fillStyle = '#0a0e1f'; g.font = '700 26px ' + BODY; g.textAlign = 'center'; g.fillText(label, x + size / 2, y + size + 34); }
  }
  function daysToGo() {
    const start = new Date(cfg.festStart || '2027-01-31T00:00:00+05:30').getTime();
    return Math.max(0, Math.ceil((start - Date.now()) / 86400000));
  }
  const DATES = '31 Jan – 1 Feb 2027 · XIM University, Bhubaneswar';

  const CREATIVES = [
    {
      id: 'post_countmein', title: 'Creative 1: "Count me in"', format: 'Instagram feed post', size: [1080, 1080],
      angle: 'Message: pick the events you want. Low-effort action ("one tap, no forms") aimed at students who already know the fest.',
      source: 'instagram', medium: 'social', page: '#register',
      async draw(g, W, H, url, a) {
        stage(g, W, H);
        let y = logo(g, a.logo, W / 2, 70, 520) + 40;
        g.textAlign = 'center'; g.fillStyle = '#eef1fb'; g.font = '700 70px ' + DISP;
        g.fillText('Which events', W / 2, y + 60); g.fillStyle = '#ffa534'; g.fillText('are you going to?', W / 2, y + 145);
        g.fillStyle = '#a6aecb'; g.font = '500 36px ' + BODY;
        g.fillText('29 events. One tap each. No forms.', W / 2, y + 215);
        const chips = [['Decibelz', '#ff6aa6'], ['Comedy night', '#ffa534'], ['MPower', '#52c7ff'], ['X-Athon', '#7dffb2'], ['Celebrity pro show', '#ffa534'], ['Footloose', '#ff6aa6']];
        const rows = [[]];
        let cx = 0;
        g.font = '700 30px ' + BODY;
        chips.forEach((c) => {
          const w = g.measureText(c[0]).width + 56;
          if (cx + w > W - 160 && rows[rows.length - 1].length) { rows.push([]); cx = 0; }
          rows[rows.length - 1].push([c, w]);
          cx += w + 16;
        });
        let cy = y + 260;
        rows.forEach((r) => {
          const total = r.reduce((s, it) => s + it[1], 0) + 16 * (r.length - 1);
          let x = (W - total) / 2;
          r.forEach(([c, w]) => { g.strokeStyle = c[1]; g.lineWidth = 3; g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.roundRect(x, cy, w, 60, 30); g.fill(); g.stroke(); g.fillStyle = '#eef1fb'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c[0], x + w / 2, cy + 32); g.textBaseline = 'alphabetic'; x += w + 16; });
          cy += 76;
        });
        pill(g, 'Tap "Count Me In" · link in bio', W / 2 - 120, H - 230, '700 34px ' + BODY, '#ffa534', '#1a1100', 34, 80);
        qrCard(g, url, W - 250, H - 320, 180, null);
        g.fillStyle = '#a6aecb'; g.font = '500 26px ' + BODY; g.textAlign = 'center'; g.fillText(DATES, W / 2, H - 70);
      }
    },
    {
      id: 'story_explorer', title: 'Creative 2: "Find the Explorer"', format: 'Instagram story (9:16)', size: [1080, 1920],
      angle: 'Message: a game to play. Curiosity hook for people who do not follow the fest yet; the payoff is a badge and a certificate.',
      source: 'instagram', medium: 'story', page: '',
      async draw(g, W, H, url, a) {
        stage(g, W, H);
        let y = logo(g, a.logo, W / 2, 120, 640) + 70;
        const gr = g.createRadialGradient(W / 2, y + 240, 20, W / 2, y + 240, 330);
        gr.addColorStop(0, 'rgba(255,165,52,.45)'); gr.addColorStop(1, 'rgba(255,165,52,0)');
        g.fillStyle = gr; g.fillRect(0, y - 100, W, 680);
        g.drawImage(a.mascot, W / 2 - 200, y, 400, 460);
        y += 540;
        g.textAlign = 'center'; g.fillStyle = '#eef1fb'; g.font = '700 74px ' + DISP;
        g.fillText('9 Explorers', W / 2, y); g.fillText('are hiding', W / 2, y + 90);
        g.fillStyle = '#ffa534'; g.fillText('on our website.', W / 2, y + 180);
        g.fillStyle = '#a6aecb'; g.font = '500 40px ' + BODY;
        wrap(g, 'Follow the clues, find them all and unlock the Explorer badge and your own certificate.', W / 2, y + 270, W - 200, 54);
        pill(g, 'Tap the link sticker to play', W / 2, H - 510, '700 40px ' + BODY, '#ffa534', '#1a1100', 44, 96);
        qrCard(g, url, W / 2 - 100, H - 370, 200, 'or scan');
        g.fillStyle = '#a6aecb'; g.font = '500 30px ' + BODY; g.textAlign = 'center'; g.fillText(DATES, W / 2, H - 48);
      }
    },
    {
      id: 'poster_qr', title: 'Creative 3: "The countdown is on"', format: 'A4 campus poster (print, 150 dpi)', size: [1240, 1754],
      angle: 'Message: save the date. Urgency through a live countdown, with a large QR code for notice boards, hostels and the canteen.',
      source: 'campus', medium: 'print', page: '',
      async draw(g, W, H, url, a) {
        stage(g, W, H);
        let y = logo(g, a.logo, W / 2, 110, 860) + 60;
        g.textAlign = 'center';
        g.fillStyle = '#52c7ff'; g.font = '700 34px ' + BODY; g.fillText('THE MANAGEMENT AND CULTURAL FEST OF XIM UNIVERSITY', W / 2, y);
        g.fillStyle = '#eef1fb'; g.font = '700 92px ' + DISP; g.fillText('31 JAN – 1 FEB', W / 2, y + 130);
        g.fillStyle = '#ffa534'; g.font = '700 64px ' + DISP; g.fillText(daysToGo() + ' days to go', W / 2, y + 230);
        g.fillStyle = '#a6aecb'; g.font = '500 38px ' + BODY; g.fillText('Business battles · Stage nights · Pro show · 29 events', W / 2, y + 300);
        const q = 460;
        qrCard(g, url, W / 2 - q / 2, y + 370, q, 'SCAN ME');
        g.fillStyle = '#eef1fb'; g.font = '700 40px ' + BODY;
        wrap(g, 'Scan to explore events, play the hunt', W / 2, y + 370 + q + 130, W - 120, 52);
        g.fillText('and register your intent.', W / 2, y + 370 + q + 182);
        g.fillStyle = '#a6aecb'; g.font = '500 28px ' + BODY; g.fillText('XIM University, Bhubaneswar · @ximbxpressions', W / 2, H - 80);
      }
    }
  ];

  async function renderCreative(cr, canvas) {
    const a = await getAssets();
    const [W, H] = cr.size;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    await cr.draw(g, W, H, link(cr.source, cr.medium, cr.id, cr.page), a);
  }
  function buildCreatives() {
    const host = $('creativeCards');
    CREATIVES.forEach((cr) => {
      const url = link(cr.source, cr.medium, cr.id, cr.page);
      const card = d.createElement('article');
      card.className = 'creative';
      card.innerHTML = '<h3>' + esc(cr.title) + '</h3><p><span class="tag">' + esc(cr.format) + '</span> <span class="muted small">' + cr.size.join(' × ') + ' px</span></p>' +
        '<canvas data-creative="' + cr.id + '" role="img" aria-label="' + esc(cr.title + ', ' + cr.format) + '"></canvas>' +
        '<p class="small">' + esc(cr.angle) + '</p><p class="small muted">Tracked as <code>' + cr.source + ' / ' + cr.medium + ' / ' + cr.id + '</code></p>' +
        '<div class="row"><button class="btn primary sm" type="button" data-dl>Download PNG</button><button class="btn sm" type="button" data-copy>Copy its link</button></div>';
      host.appendChild(card);
      const canvas = card.querySelector('canvas');
      renderCreative(cr, canvas).catch(() => { card.insertAdjacentHTML('beforeend', '<p class="err">Could not render this creative.</p>'); });
      card.querySelector('[data-dl]').addEventListener('click', () => download(canvas, 'xpressions27-' + cr.id + '.png'));
      card.querySelector('[data-copy]').addEventListener('click', (e) => copy(url, e.currentTarget));
    });
  }

  /* ---------- Supabase ---------- */
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
  const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '–');

  /* ---------- report ---------- */
  let lastReport = null;
  function renderReport(r) {
    lastReport = r;
    const t = r.totals || {};
    $('kVisits').textContent = t.visits || 0;
    $('kVisitors').textContent = t.visitors || 0;
    $('kCta').textContent = t.cta_clicks || 0;
    $('kIntents').textContent = t.intents || 0;
    $('kExplorers').textContent = t.explorers || 0;
    $('firstEvent').textContent = t.first_event ? 'Tracking since ' + new Date(t.first_event).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) + '.' : '';
    const ch = (r.by_channel || []).filter((c) => c.visits > 0 || c.intents > 0);
    $('channelRows').innerHTML = ch.length ? ch.map((c) =>
      '<tr><td>' + esc(c.source) + '</td><td>' + esc(c.medium) + '</td><td class="num">' + c.visits + '</td><td class="num">' + c.visitors + '</td><td class="num">' + pct(c.cta_visitors, c.visitors) + '</td><td class="num">' + c.intent_visitors + '</td><td class="num">' + pct(c.intent_visitors, c.visitors) + '</td></tr>').join('')
      : '<tr><td colspan="7" class="muted">No visits recorded yet. Share a tracked link to start.</td></tr>';
    const ct = r.by_content || [];
    $('contentRows').innerHTML = ct.length ? ct.map((c) =>
      '<tr><td>' + esc(c.source + ' / ' + c.medium) + '</td><td>' + esc(c.campaign) + '</td><td>' + esc(c.content) + '</td><td class="num">' + c.visits + '</td><td class="num">' + c.intent_visitors + '</td></tr>').join('')
      : '<tr><td colspan="5" class="muted">No tagged visits yet.</td></tr>';
    const days = r.by_day || [];
    const max = Math.max(1, ...days.map((x) => x.visits));
    $('days').innerHTML = days.length ? days.map((x) =>
      '<div class="day-row"><span>' + new Date(x.day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</span><span class="bar"><i style="width:' + (x.visits / max * 100) + '%"></i></span><span class="num">' + x.visits + ' visits</span></div>').join('')
      : '<p class="muted small">No data yet.</p>';
    renderExperiment(r.experiment || []);
  }

  /* ---------- experiment ---------- */
  function phi(z) { // standard normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const p = 0.3989423 * Math.exp(-z * z / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  function ztest(x1, n1, x2, n2) {
    if (!n1 || !n2) return null;
    const p = (x1 + x2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    if (!se) return null;
    const z = (x2 / n2 - x1 / n1) / se;
    return { z, p: 2 * (1 - phi(Math.abs(z))) };
  }
  function renderExperiment(rows) {
    const e = cfg.experiment || {};
    const get = (v) => rows.find((r) => r.variant === v) || { visitors: 0, cta_visitors: 0, intent_visitors: 0 };
    const A = get('a'), B = get('b');
    const card = (k, r, label) => {
      const rate = r.visitors ? r.cta_visitors / r.visitors : 0;
      return '<div class="variant"><span class="tag">Version ' + k.toUpperCase() + (k === 'a' ? ' · control' : ' · challenger') + '</span><p class="hl">' + esc(label) + '</p>' +
        '<p class="rate">' + (r.visitors ? (rate * 100).toFixed(1) + '%' : '–') + '</p><p class="small muted">clicked "Register Your Intent Now"</p><div class="bar"><i style="width:' + (rate * 100) + '%"></i></div>' +
        '<p class="small">' + r.visitors + ' visitors · ' + r.cta_visitors + ' clicked · ' + r.intent_visitors + ' registered interest (' + pct(r.intent_visitors, r.visitors) + ')</p></div>';
    };
    $('abCards').innerHTML = card('a', A, (e.a && e.a.label) || 'A') + card('b', B, (e.b && e.b.label) || 'B');
    const MIN = 30;
    let v;
    if (A.visitors < MIN || B.visitors < MIN) {
      v = 'Not enough data to call a winner yet: version A has ' + A.visitors + ' visitors and B has ' + B.visitors + '. Aim for at least ' + MIN + ' each, and treat small-sample results as directional only.';
    } else {
      const t = ztest(A.cta_visitors, A.visitors, B.cta_visitors, B.visitors);
      const ra = A.cta_visitors / A.visitors, rb = B.cta_visitors / B.visitors;
      const lead = rb > ra ? 'B' : 'A', lift = ra ? ((rb - ra) / ra * 100) : 0;
      v = t && t.p < 0.05
        ? 'Version ' + lead + ' wins on click-through (' + (rb * 100).toFixed(1) + '% vs ' + (ra * 100).toFixed(1) + '%, ' + (lift >= 0 ? '+' : '') + lift.toFixed(0) + '% relative, p = ' + t.p.toFixed(3) + '). The difference is statistically significant at the 5% level.'
        : 'No significant difference yet (A ' + (ra * 100).toFixed(1) + '% vs B ' + (rb * 100).toFixed(1) + '%' + (t ? ', p = ' + t.p.toFixed(2) : '') + '). Version ' + lead + ' is ahead, but the gap could still be chance.';
    }
    $('verdict').textContent = v;
  }

  async function loadReport() {
    if (!LIVE) { setStatus('setup', 'Supabase is not configured in js/config.js'); return; }
    try {
      const r = await rpc('get_traffic_report');
      $('setup').hidden = true;
      renderReport(r || {});
      setStatus('live', 'Live · updated ' + new Date().toLocaleTimeString());
    } catch (e) {
      if (e.status === 404 || /function|schema cache/i.test(e.message)) { $('setup').hidden = false; setStatus('setup', 'Waiting for one-time database setup'); }
      else setStatus('error', 'Could not load the report (' + e.message + ')');
      renderExperiment([]);
    }
  }

  /* ---------- campaign log ---------- */
  let logRows = [];
  async function loadLog() {
    if (!LIVE) { $('logRows').innerHTML = '<tr><td colspan="6" class="muted">Database not configured.</td></tr>'; return; }
    try {
      logRows = (await rpc('get_campaign_log')) || [];
      $('logRows').innerHTML = logRows.length ? logRows.map((r) =>
        '<tr><td>' + new Date(r.entry_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</td><td>' + esc(r.channel) + '</td><td>' + esc(r.action) + '</td><td>' +
        (r.link ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener">Open</a>' : '') + '</td><td>' + esc(r.author || '') + '</td><td><button class="btn sm" type="button" data-del="' + r.id + '" aria-label="Delete entry from ' + esc(r.entry_date) + '">Delete</button></td></tr>').join('')
        : '<tr><td colspan="6" class="muted">No entries yet.</td></tr>';
    } catch (e) {
      $('logRows').innerHTML = '<tr><td colspan="6" class="muted">The log will appear once <code>supabase/campaign.sql</code> has been run.</td></tr>';
    }
  }
  function setupLogForm() {
    const f = $('logForm'), msg = $('logMsg');
    f.date.value = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
    const say = (text, ok) => { msg.textContent = text; msg.className = ok ? 'ok' : 'err'; };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = { date: f.date.value, channel: f.channel.value.trim(), action: f.action.value.trim(), link: f.link.value.trim(), author: f.author.value.trim(), pass: f.passcode.value };
      const bad = [];
      [['date', !v.date], ['channel', !v.channel], ['action', v.action.length < 5], ['passcode', !v.pass], ['link', v.link && !/^https?:\/\/\S+$/i.test(v.link)]].forEach(([k, b]) => { f[k].setAttribute('aria-invalid', b ? 'true' : 'false'); if (b) bad.push(k); });
      if (bad.length) { say('Please check: ' + bad.join(', ') + '.'); f[bad[0]].focus(); return; }
      f.querySelector('[type=submit]').disabled = true;
      try {
        await rpc('add_campaign_log', { p_passcode: v.pass, p_date: v.date, p_channel: v.channel, p_action: v.action, p_link: v.link || null, p_author: v.author || null });
        say('Added to the log.', true);
        f.action.value = ''; f.link.value = '';
        loadLog();
      } catch (err) {
        say(/passcode/i.test(err.message) ? 'Wrong team passcode.' : 'Could not save: ' + err.message);
      } finally { f.querySelector('[type=submit]').disabled = false; }
    });
    $('logRows').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      if (!f.passcode.value) { say('Enter the team passcode in the form below first.'); f.passcode.focus(); return; }
      if (!confirm('Delete this log entry? This cannot be undone.')) return;
      try { await rpc('delete_campaign_log', { p_passcode: f.passcode.value, p_id: Number(b.dataset.del) }); say('Entry deleted.', true); loadLog(); }
      catch (err) { say(/passcode/i.test(err.message) ? 'Wrong team passcode.' : 'Could not delete: ' + err.message); }
    });
  }

  /* ---------- CSV ---------- */
  function csv(name, header, rows) {
    const q = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
    const blob = new Blob([[header.join(',')].concat(rows.map((r) => r.map(q).join(','))).join('\n')], { type: 'text/csv' });
    const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- init ---------- */
  function init() {
    $('cName').textContent = CAMPAIGN;
    const c = cfg.campaign || {};
    const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    $('cDates').textContent = c.start ? fmt(c.start) + ' to ' + fmt(c.end) : '';
    const host = $('linkCards');
    if (window.qrcode) { PRESETS.forEach((p) => host.appendChild(linkCard(p))); buildCreatives(); }
    else host.innerHTML = '<p class="err">The QR code library did not load. Check your connection and reload.</p>';
    $('builder').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.currentTarget, err = $('builderErr');
      const s = slug(f.source.value), m = slug(f.medium.value), ct = slug(f.content.value);
      const missing = [['source', s], ['medium', m], ['content', ct]].filter((x) => !x[1]).map((x) => x[0]);
      ['source', 'medium', 'content'].forEach((k) => f[k].setAttribute('aria-invalid', missing.includes(k) ? 'true' : 'false'));
      if (missing.length) { err.hidden = false; err.textContent = 'Please fill in: ' + missing.join(', ') + ' (letters and numbers).'; return; }
      err.hidden = true;
      $('customOut').prepend(linkCard({ label: 'Custom: ' + s + ' / ' + m, note: 'Content: ' + ct, source: s, medium: m, content: ct, page: f.page.value }));
    });
    $('refresh').addEventListener('click', () => { loadReport(); loadLog(); });
    $('csvTraffic').addEventListener('click', () => {
      if (!lastReport) return;
      csv('xpressions27-traffic-by-channel.csv', ['source', 'medium', 'visits', 'visitors', 'cta_visitors', 'intent_visitors', 'intents'],
        (lastReport.by_channel || []).map((r) => [r.source, r.medium, r.visits, r.visitors, r.cta_visitors, r.intent_visitors, r.intents]));
    });
    $('csvLog').addEventListener('click', () => csv('xpressions27-campaign-log.csv', ['date', 'channel', 'action', 'link', 'author'], logRows.map((r) => [r.entry_date, r.channel, r.action, r.link, r.author])));
    setupLogForm();
    loadReport();
    loadLog();
    setInterval(() => { if (!d.hidden) loadReport(); }, 30000);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
  window.XPCampaign = { CREATIVES, PRESETS, link, renderCreative, qrPoster };
})();
