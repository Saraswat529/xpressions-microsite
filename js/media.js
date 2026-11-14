/*
 * Interactive media: artist spotlights and the full-screen photo gallery.
 *
 * Artist names marked with data-media="key" open a spotlight pop-up.
 * Only genuine links are used. No official performance recordings were found
 * online for past headliners, so each spotlight shows a clearly marked video slot.
 * ORGANISERS: paste a YouTube link into the matching `video` field below and the
 * pop-up will embed it automatically (privacy-enhanced youtube-nocookie player).
 */
(function () {
  'use strict';
  const d = document;
  const XP = window.XP;
  const REELS = { label: 'Xpressions reels on Instagram', url: 'https://www.instagram.com/ximbxpressions/reels/' };

  const MEDIA = {
    'vishal-shekhar': {
      name: 'Vishal-Shekhar', when: 'Celeblitz 2015 and Xpressions, January 2023',
      blurb: 'The composer duo closed Celeblitz in 2015 and came back to headline again in January 2023.',
      video: '',
      links: [
        { label: 'Press report: Vishal-Shekhar rock the stage at XIMB (Sambad English)', url: 'https://sambadenglish.com/vishal-shekhar-rock-the-stage-in-ximb/' },
        { label: 'Press preview of the 2023 show (OdishaBytes)', url: 'https://odishabytes.com/ximb-gears-up-for-xpressions-vishal-shekhar-to-enthrals-bhubaneswar-crowd/' }
      ]
    },
    'farhan-akhtar': {
      name: 'Farhan Akhtar', when: 'Celeblitz, 12 November 2017 (20th year)',
      blurb: "Farhan Live closed the fest's 20th-year edition at Celeblitz, the celebrity night.",
      video: '',
      links: [
        { label: 'Report: Farhan Live at Xpressions 2017 (InsideIIM)', url: 'https://insideiim.com/farhan-live-xpressions2017-ximb' },
        { label: 'Report: Farhan Akhtar sets the stage on fire (Sambad English)', url: 'https://sambadenglish.com/farhan-akhtar-sets-the-stage-on-fire-at-xpressions17' }
      ]
    },
    'sunidhi-chauhan': {
      name: 'Sunidhi Chauhan', when: 'Celeblitz, November 2018',
      blurb: 'Sunidhi Chauhan headlined Celeblitz, the closing celebrity night of Xpressions 2018.',
      video: '',
      links: [
        { label: 'Pre-fest report: Sunidhi Chauhan set to perform (OrissaPOST)', url: 'https://www.orissapost.com/sunidhi-chauhan-set-to-perform-at-xpressions/' },
        { label: 'Fest recap, Xpressions 2018 (OfficeChai)', url: 'https://officechai.com/startups/ximb-conducts-xpressions-management-cultural-fest/' }
      ]
    },
    'mika-singh': {
      name: 'Mika Singh', when: 'Celeblitz 2019',
      blurb: "Mika Singh brought the curtain down on Xpressions '19 at Celeblitz.",
      video: '',
      links: [{ label: 'Coverage of Xpressions 2019, day 3 (Boldsky)', url: 'https://www.boldsky.com/art-culture/xpressions-2019-here-are-the-details-of-day-3-130834.html' }]
    },
    'kumar-varun': { name: 'Kumar Varun', when: 'Xpressions 2019', blurb: 'Stand-up comedy at Xpressions 2019.', video: '', links: [] },
    'karunesh-talwar': { name: 'Karunesh Talwar', when: 'Xpressions, January 2023', blurb: 'Stand-up comedy at the January 2023 edition.', video: '', links: [] },
    'darshan-raval': {
      name: 'Darshan Raval', when: "Celebrity night, Xpressions '23 (January 2024)",
      blurb: 'Darshan Raval sang the celebrity night of the January 2024 edition.',
      video: '',
      links: [{ label: "Report: XIM Bhubaneswar inaugurates Xpressions '23 (TechStory)", url: 'https://techstory.in/xim-bhubaneswar-inaugurates-xpressions-23/' }]
    },
    'sachin-jigar': { name: 'Sachin-Jigar', when: 'Day three, January 2024', blurb: 'The composer duo played day three of the January 2024 edition.', video: '', links: [] },
    'aakash-gupta': { name: 'Aakash Gupta', when: 'January 2024', blurb: 'Stand-up comedy at the January 2024 edition.', video: '', links: [] },
    'amaal-mallik': { name: 'Amaal Mallik', when: "Pro show, Xpressions '25 (1 March 2026)", blurb: "Headlined the Xpressions '25 pro show at XIM Ground.", video: '', links: [{ label: "Reveal, invite and pro show reels (Instagram)", url: REELS.url }] },
    'aashish-solanki': { name: 'Aashish Solanki', when: "Comedy night, Xpressions '25 (28 February 2026)", blurb: "Opened Day 1 of Xpressions '25 with a comedy night.", video: '', links: [{ label: 'Invite and comedy night reels (Instagram)', url: REELS.url }] },
    'xenial-secrets': { name: 'The Xenial Secrets', when: "Sunburn Night, Xpressions '25 (28 February 2026)", blurb: "Played the EDM night that followed the comedy show at Xpressions '25.", video: '', links: [{ label: 'EDM night reels (Instagram)', url: REELS.url }] },
    'satyabrat': { name: 'Satyabrat', when: "Xpressions '25 (28 February 2026)", blurb: "Stand-up comedy on the Xpressions '25 poster.", video: '', links: [] }
  };
  XP.MEDIA = MEDIA;

  function ytId(u) {
    const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function openArtist(key) {
    const m = MEDIA[key];
    if (!m) return;
    const id = ytId(m.video);
    const links = m.links.concat(m.links.some((l) => l.url === REELS.url) ? [] : [REELS]);
    const box = XP.el('div', { class: 'media-pop' });
    box.innerHTML =
      '<p class="eyebrow">' + XP.esc(m.when) + '</p>' +
      '<p class="media-blurb">' + XP.esc(m.blurb) + '</p>' +
      '<div class="media-frame">' + (id
        ? '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?rel=0" title="' + XP.esc(m.name) + ' at Xpressions" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>'
        : '<div class="media-ph"><span class="media-ph-ico" aria-hidden="true">' + XP.icon('play') + '</span><strong>Performance video coming soon</strong><span>We could not find an official recording of this set yet. Catch the latest fest moments on Instagram meanwhile.</span><code class="org-note">Organisers: add a YouTube link at MEDIA["' + key + '"].video in js/media.js</code></div>') +
      '</div>' +
      '<ul class="media-links">' + links.map((l) => '<li><a href="' + l.url + '" target="_blank" rel="noopener">' + XP.icon('link') + '<span>' + XP.esc(l.label) + '</span></a></li>').join('') + '</ul>';
    XP.modal({ title: m.name, content: box, className: 'wide media-modal' });
    XP.count('media');
  }
  XP.openArtist = openArtist;

  /* ---------- full-screen gallery ---------- */
  let gallery = [];
  function collect() {
    gallery = Array.from(d.querySelectorAll('#p-highlights .gallery .figure')).map((f) => {
      const img = f.querySelector('img');
      return { src: img.getAttribute('src'), alt: img.alt, cap: (f.querySelector('figcaption') || { textContent: '' }).textContent.trim() };
    });
  }
  function openGallery(src) {
    if (!gallery.length) collect();
    let i = Math.max(0, gallery.findIndex((g) => g.src === src));
    const box = XP.el('div', { class: 'lb' });
    box.innerHTML =
      '<figure class="lb-fig"><div class="lb-stage"><img alt=""></div><figcaption><span class="lb-cap"></span><span class="lb-n"></span></figcaption></figure>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Previous photo" data-fx="sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button class="lb-nav lb-next" type="button" aria-label="Next photo" data-fx="sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '<div class="lb-thumbs" role="group" aria-label="Choose a photo">' + gallery.map((g, k) => '<button type="button" data-k="' + k + '" aria-label="Photo ' + (k + 1) + ': ' + XP.esc(g.alt) + '" data-fx="sm"><img src="' + g.src + '" alt=""></button>').join('') + '</div>';
    const img = box.querySelector('.lb-stage img'), stage = box.querySelector('.lb-stage');
    function show(k) {
      i = (k + gallery.length) % gallery.length;
      const g = gallery[i];
      img.src = g.src; img.alt = g.alt;
      box.querySelector('.lb-cap').textContent = g.cap;
      box.querySelector('.lb-n').textContent = (i + 1) + ' / ' + gallery.length;
      box.querySelectorAll('.lb-thumbs button').forEach((b, k2) => b.setAttribute('aria-current', String(k2 === i)));
      stage.classList.remove('swap'); void stage.offsetWidth; stage.classList.add('swap');
      const name = g.src.split('/').pop().replace(/\.\w+$/, '');
      d.dispatchEvent(new CustomEvent('xp:lightbox', { detail: { name, stage } }));
    }
    box.querySelector('.lb-prev').addEventListener('click', () => show(i - 1));
    box.querySelector('.lb-next').addEventListener('click', () => show(i + 1));
    box.querySelector('.lb-thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) show(+b.dataset.k); });
    let sx = null;
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 40) show(i + (e.clientX < sx ? 1 : -1)); sx = null; });
    XP.modal({
      title: 'Photo gallery', content: box, className: 'lightbox',
      onKey: (e) => { if (e.key === 'ArrowRight') show(i + 1); else if (e.key === 'ArrowLeft') show(i - 1); }
    });
    show(i);
    XP.count('gallery');
  }
  XP.openGallery = openGallery;

  XP.ready.then(() => {
    collect();
    d.querySelectorAll('.figure img').forEach((img) => {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Open full-screen gallery: ' + img.alt);
      img.classList.add('zoomable');
    });
    d.addEventListener('click', (e) => {
      const m = e.target.closest('[data-media]');
      if (m) { e.preventDefault(); openArtist(m.dataset.media); return; }
      const img = e.target.closest('.figure img.zoomable');
      if (img) openGallery(img.getAttribute('src'));
    });
    d.addEventListener('keydown', (e) => {
      const img = e.target.closest && e.target.closest('.figure img.zoomable');
      if (img && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openGallery(img.getAttribute('src')); }
    });
  });
})();
