/*
 * Xpressions'27 site configuration.
 *
 * The "Register Your Intent" tracker stores interest in a shared Supabase database
 * so every visitor and the organisers see the same numbers. Until the two Supabase
 * values below are filled in, the site still works: visitors' picks are kept on their
 * own device and are sent to the database automatically the next time they visit
 * after it is switched on. No fake numbers are ever shown.
 *
 * Setup steps: see README.md ("Switch on the live intent tracker").
 */
window.XP_CONFIG = Object.assign({
  // Branding used by the scripts (countdown, certificate, messages). The logo file is also
  // referenced in index.html (header, hero, footer, favicons, share image), all under img/.
  edition: "Xpressions'27",
  logo: 'img/logo-xpressions-27.jpg',
  // A/B experiment (js/track.js). Variant A is the headline already in index.html.
  // Visitors are split 50/50 and keep their variant. Preview with ?ab=a or ?ab=b.
  experiment: {
    id: 'hero_headline',
    selector: '#p-home .hero h1',
    a: { label: 'Compete. Perform. Celebrate.' },
    b: {
      label: 'Find your stage at Xpressions\'27.',
      html: '<span class="w" style="--i:0">Find</span> <span class="w" style="--i:1">your</span> <em class="w" style="--i:2">stage.</em>'
    },
    metric: 'Share of visitors who click the hero "Register Your Intent Now" button'
  },
  // Campaign period and the canonical public URL used to build tracked links and QR codes.
  campaign: { name: 'xp27_nov', start: '2026-11-08', end: '2026-11-20' },
  siteUrl: 'https://saraswat529.github.io/xpressions-microsite/',
  // Supabase project URL, for example: https://abcdefghijkl.supabase.co
  supabaseUrl: 'https://nfgdufbxvbhkcndufzhf.supabase.co',
  // Supabase "anon public" API key. It is designed to be public; the database only
  // allows the actions defined in supabase/schema.sql.
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZ2R1ZmJ4dmJoa2NuZHVmemhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NTkwNTIsImV4cCI6MjExMDIzNTA1Mn0.Z6K5fA79bODt8-HDPRZeQSIRIIOBItKNIZleb2kpON0',
  // How often live interest counts refresh, in seconds.
  pollSeconds: 20,
  // Fest dates shown on event cards until a detailed schedule is out.
  festDates: '31 Jan to 1 Feb 2027',
  // Countdown target (IST).
  festStart: '2027-01-31T00:00:00+05:30',
  festEnd: '2027-02-02T00:00:00+05:30'
}, window.XP_CONFIG || {});
