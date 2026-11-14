/*
 * Xpressions '26 site configuration.
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
