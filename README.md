# Xpressions '26 microsite

A student-made microsite for Xpressions '26 (31 Jan to 1 Feb 2027), the management and cultural fest of XIM University, Bhubaneswar. It is a static site: plain HTML, CSS and JavaScript, with no build step and no dependencies. It is hosted on GitHub Pages.

Live site: https://saraswat529.github.io/xpressions-microsite/

## Files

| File | What it does |
| --- | --- |
| `index.html` | The original site: six pages switched by URL hash (`#home`, `#highlights`, `#programme`, `#competitions`, `#register`, `#faq`). All content lives here. |
| `css/fest.css` | The interactive layer's styles, built on the original colour and font tokens. |
| `js/config.js` | Settings: the Supabase connection for the intent tracker, the fest dates and the countdown. |
| `js/fx.js` | The fireworks and confetti engine: background fireworks plus a burst on every click. |
| `js/fest.js` | Core features: toasts, pop-ups, the festival passport (XP, badges, section progress), the nav indicator, page transitions, scroll reveals, the countdown, floating buttons and surprises. |
| `js/intent.js` | Register Your Intent: event cards, interest buttons, live counters and the picker on the Register page. |
| `js/media.js` | Artist spotlight pop-ups and the full-screen photo gallery. |
| `js/game.js` | The Find the Xpressions Explorer hunt (9 Explorers, 3 levels, with a downloadable certificate at the end). |
| `organisers.html` | The organisers' dashboard: interest per event, the most popular events and totals, with CSV export. |
| `supabase/schema.sql` | The database tables and functions for the intent tracker. |

## Switch on the live intent tracker

The interest counts are shared across every visitor and device, so they need a database. The site uses Supabase, which has a free tier.

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste in all of `supabase/schema.sql`, and click **Run**.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. Paste both into `js/config.js`:
   ```js
   supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
   supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
   ```
5. Commit and push. Counts go live on the site and on `organisers.html`.

The anon key is meant to be public. Row Level Security blocks direct access to the tables, so visitors can only call three functions: `set_intent`, `get_intent_counts` and `get_intent_summary`. Never put the `service_role` key in this repository.

How it behaves:
- **Duplicates:** each browser gets a random visitor ID, and the database keeps one row per event per visitor, so tapping twice never counts twice.
- **Withdrawing:** tapping the button again removes the interest.
- **Updates:** counts refresh every 20 seconds while the page is open (`pollSeconds` in the config).
- **Before the database is connected:** cards say "Live count opens soon". Picks are kept on the visitor's device and are sent automatically on their next visit after the tracker goes live. The site never shows invented numbers.
- **Interest is not registration:** the dashboard keeps confirmed registrations apart and labels them "Not open yet".
- **Limits:** without sign-in, someone who clears their browser can count again. Treat the numbers as planning estimates. For stricter counting, add Supabase Auth or a captcha later.

### Adding or renaming an event

1. In `index.html`, add a card inside a `comp-list`:
   ```html
   <div class="comp" data-event="my-event" data-cat="stage" data-icon="mic"><small>COMMITTEE</small><b>Event name</b><p>Description.</p></div>
   ```
   `data-cat` is one of `nights`, `business`, `stage` or `social`. The available icon names are in `js/fest.js`. You can also add `data-img="img/photo.jpg"` for a photo background, or `data-when="..."` for a specific date and time.
2. Add the same `id` to the `insert into public.events` list in `supabase/schema.sql` and run the SQL again.

## Adding performance videos

Artist names in Highlights and Competitions open a spotlight pop-up. No official recordings of past headline sets were found online, so each pop-up shows a "video coming soon" slot. To fill one, paste a YouTube link into that artist's `video` field in `js/media.js`, for example `video: 'https://www.youtube.com/watch?v=XXXXXXXXXXX'`. It will be embedded with YouTube's privacy-enhanced player. Only add links to genuine recordings.

## Accessibility and performance

- Everything works by keyboard. Pop-ups trap focus and close with Escape. The gallery supports the arrow keys and swiping.
- `prefers-reduced-motion` turns off the fireworks, parallax, transitions and surprises.
- The fireworks use two canvases and one animation loop that stops when idle. Particle counts are capped, and lower on phones.
- Personal progress (XP, badges and the hunt) is stored only in the visitor's browser.

## Running it locally

Serve the folder with any static server, for example `npx serve .` or `python -m http.server`. Opening `index.html` straight from disk mostly works, but use a server to test the tracker.
