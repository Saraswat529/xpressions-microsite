/*
 * Fireworks and confetti engine.
 * Two fixed canvases: one behind the content (ambient background fireworks) and one
 * above it (click bursts). A single requestAnimationFrame loop runs only while
 * particles exist, so the page is idle between effects. Respects reduced motion.
 * Public API: window.XPFX.burst(x, y, {size}), XPFX.celebrate(level), XPFX.pop(el)
 */
(function () {
  'use strict';
  const d = document;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const COLORS = ['#ffa534', '#52c7ff', '#ff6aa6', '#ffe066', '#9b8cff', '#7dffb2'];
  const SPARKS = { sm: 14, md: 24, lg: 40, xl: 64 };
  const CONFETTI = { sm: 0, md: 8, lg: 18, xl: 34 };

  let bg, fg, bctx, fctx, W = 0, H = 0, dpr = 1, cap = 460;
  const fgP = [], bgP = [], rockets = [];
  let running = false, last = 0, bgTimer = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];

  function makeCanvas(cls) {
    const c = d.createElement('canvas');
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    d.body.appendChild(c);
    return c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    for (const c of [bg, fg]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cap = W < 700 ? 240 : 460;
  }

  function spark(list, x, y, ang, speed, color, life, alpha) {
    list.push({ t: 0, age: 0, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      c: color, life, a: alpha, g: 0.05, drag: 0.962, w: rand(1.2, 2.4) });
  }

  function confettiPiece(x, y, vx, vy) {
    return { t: 1, age: 0, x, y, vx, vy, c: pick(COLORS), life: rand(80, 130), a: 1,
      g: 0.13, drag: 0.975, w: rand(5, 9), h: rand(3, 6), r: rand(0, 6.28), vr: rand(-0.25, 0.25) };
  }

  function burst(x, y, opts) {
    if (!fg || reduceMQ.matches) return;
    const size = (opts && opts.size) || 'md';
    let n = SPARKS[size] || SPARKS.md;
    let m = CONFETTI[size] || 0;
    if (fgP.length > cap) { n = Math.min(n, 8); m = 0; }
    const a = pick(COLORS), b = pick(COLORS);
    const speed = size === 'sm' ? 3 : size === 'md' ? 4.2 : 5.4;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rand(-0.15, 0.15);
      spark(fgP, x, y, ang, rand(speed * 0.45, speed), i % 3 ? a : b, rand(26, 44), 1);
    }
    const spread = size === 'xl' ? 1.3 : 0.9;
    for (let i = 0; i < m; i++) {
      const ang = -Math.PI / 2 + rand(-spread, spread);
      const sp = rand(3, 8.5);
      fgP.push(confettiPiece(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp));
    }
    kick();
  }

  function celebrate(level) {
    if (!fg || reduceMQ.matches) return;
    const big = level === 'max';
    const n = big ? 8 : 3;
    for (let i = 0; i < n; i++) {
      setTimeout(() => burst(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.5), { size: big ? 'xl' : 'lg' }), i * (big ? 220 : 170));
    }
    if (big) {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          for (let k = 0; k < (W < 700 ? 8 : 14); k++) fgP.push(confettiPiece(rand(0, W), -12, rand(-1, 1), rand(1, 3.5)));
          kick();
        }, i * 160);
      }
    }
  }

  function pop(el) {
    if (!el || !el.classList || reduceMQ.matches) return;
    el.classList.remove('fx-pop');
    void el.offsetWidth;
    el.classList.add('fx-pop');
    clearTimeout(el._fxT);
    el._fxT = setTimeout(() => el.classList.remove('fx-pop'), 520);
  }

  /* Ambient background fireworks */
  function launch() {
    if (reduceMQ.matches || d.hidden || !bg) return;
    rockets.push({ x: rand(W * 0.08, W * 0.92), y: H + 10, vy: -rand(6.5, 9), ty: rand(H * 0.12, H * 0.5), c: pick(COLORS) });
    kick();
  }
  function explode(r) {
    const n = W < 700 ? 34 : 52;
    const c2 = pick(COLORS);
    for (let i = 0; i < n; i++) spark(bgP, r.x, r.y, (i / n) * Math.PI * 2, rand(1.5, 3.6), i % 2 ? r.c : c2, rand(55, 85), 0.42);
  }
  function schedule() {
    clearTimeout(bgTimer);
    bgTimer = setTimeout(() => { launch(); schedule(); }, rand(2800, 6000));
  }

  function step(list, ctx, k) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += k;
      if (p.age >= p.life || p.y > H + 40) { list.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, k);
      p.vy = p.vy * Math.pow(p.drag, k) + p.g * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      const fade = 1 - p.age / p.life;
      if (p.t === 0) {
        ctx.globalAlpha = p.a * fade;
        ctx.strokeStyle = p.c;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        p.r += p.vr * k;
        ctx.globalAlpha = Math.min(1, fade * 1.8);
        ctx.fillStyle = p.c;
        const cos = Math.cos(p.r), sin = Math.sin(p.r);
        ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
        const h = p.h * (0.35 + Math.abs(Math.cos(p.age * 0.12)));
        ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }

  function tick(now) {
    const k = last ? Math.min(2.5, (now - last) / 16.67) : 1;
    last = now;
    fctx.clearRect(0, 0, W, H);
    bctx.clearRect(0, 0, W, H);
    fctx.lineCap = bctx.lineCap = 'round';
    bctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.y += r.vy * k;
      r.vy *= Math.pow(0.985, k);
      bctx.globalAlpha = 0.5;
      bctx.strokeStyle = r.c;
      bctx.lineWidth = 2;
      bctx.beginPath();
      bctx.moveTo(r.x, r.y);
      bctx.lineTo(r.x, r.y - r.vy * 3);
      bctx.stroke();
      if (r.y <= r.ty || r.vy > -1.2) { explode(r); rockets.splice(i, 1); }
    }
    step(bgP, bctx, k);
    step(fgP, fctx, k);
    fctx.globalAlpha = bctx.globalAlpha = 1;
    if (fgP.length || bgP.length || rockets.length) requestAnimationFrame(tick);
    else { running = false; last = 0; fctx.clearRect(0, 0, W, H); bctx.clearRect(0, 0, W, H); }
  }
  function kick() {
    if (!running) { running = true; last = 0; requestAnimationFrame(tick); }
  }

  /* Every clickable thing gets a burst. Never prevents or delays the default action. */
  const SEL = 'a[href], button, summary, [role="button"], .card, .comp, .stat, .chip, [data-fx]';
  function onClick(e) {
    if (!e.target.closest || e.target.closest('[data-fx="off"]')) return;
    const el = e.target.closest(SEL);
    if (!el) return;
    let size = el.dataset.fx;
    if (!size) {
      if (el.matches('.intent-btn')) size = el.getAttribute('aria-pressed') === 'true' ? 'sm' : 'xl';
      else if (el.matches('.btn.primary')) size = 'lg';
      else if (el.closest('.nav, .site-footer, .xp-modal')) size = 'sm';
      else size = 'md';
    }
    let x = e.clientX, y = e.clientY;
    if (!e.detail || (!x && !y)) {
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    burst(x, y, { size });
    pop(el);
  }

  function init() {
    bg = makeCanvas('fx-bg');
    fg = makeCanvas('fx-fg');
    bctx = bg.getContext('2d');
    fctx = fg.getContext('2d');
    resize();
    addEventListener('resize', resize, { passive: true });
    d.addEventListener('click', onClick, true);
    if (!reduceMQ.matches) { setTimeout(launch, 1200); schedule(); }
    d.addEventListener('visibilitychange', () => {
      if (d.hidden) clearTimeout(bgTimer);
      else if (!reduceMQ.matches) schedule();
    });
  }

  window.XPFX = { burst, celebrate, pop };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
