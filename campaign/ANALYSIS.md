# Xpressions'27: Step 5 analytics, interpretation and optimisation

**Data source:** the microsite's own anonymous analytics (Supabase). **Live report:** https://saraswat529.github.io/xpressions-microsite/analytics.html
**Data window:** 20 Nov 2026, 8:34 pm IST (when tracking started) to 25 Nov 2026, 12:57 pm IST.
Figures below are a snapshot at that time. The live report keeps updating, so refresh these numbers before you present.

## 1. Metrics

| # | Metric | Value | Notes |
| --- | --- | --- | --- |
| 1 | Users / sessions | **32 users, 37 sessions** | 25 sessions on 20 Nov, 12 on 25 Nov |
| 2 | Traffic by source / medium | (direct) 31 · vercel.com / referral 5 · instagram / story 1 | 84% of sessions were untagged ("direct") |
| 3 | Engagement rate | **13.5%** (5 of 37) | Engaged = 10+ s in view, 2+ pages or an action |
| 4 | Average engagement time | Not yet available | Time-on-screen tracking started 25 Nov, 12:55 pm IST |
| 5 | Views by page / per session | Home 37 · Register 6 · others 0 · **1.14 views per session** | Nobody opened Highlights, Programme, Competitions or FAQ |
| 6 | CTA clicks | **6 clicks** in 5 sessions (13.5% of sessions) | Hero button "Register Your Intent Now" |
| 7 | Registration starts / completions | **6 starts** (reached the event picker) · **0 completions** | Completion = a saved "Count Me In" tap (interest, not a ticket) |
| 8 | Conversion rate by channel | 0% for every channel | No session registered interest |
| 9 | Search impressions, clicks, CTR | Not yet available | Site not yet verified in Google Search Console (see section 5) |
| 10 | Mobile vs desktop | Not yet available | Device tracking started 25 Nov, 12:55 pm IST; all earlier sessions are "unknown" |

## 2. Interpretation

**Channels generating the most visitors.** Direct traffic dominates: 31 of 37 sessions. These visits arrived without a tracked link, for example from a typed or pasted URL, an untagged share, or a chat app that strips referrers. The only tracked campaign channel recorded is the Instagram story (1 session). A vercel.com referral sent 5 sessions from 2 users. **Implication:** the campaign was mostly shared without the tracked links, so channel performance cannot be compared fairly yet.

**Pages and content that attract attention.** Attention went almost entirely to the home page (37 views). The only other page visited was Register (6 views), reached through the hero button. Highlights, Programme, Competitions and FAQ received no visits. Content clicks (artist pop-ups, gallery, event details) were only tracked from 25 Nov, so no data yet.

**Meaningful actions.** 13.5% of sessions clicked "Register Your Intent Now", but no session completed a registration of interest. The schedule download ("Add to calendar") was added on 25 Nov, so there's no data yet.

**Where visitors abandon the intended journey.**

| Step | Sessions | Drop-off |
| --- | --- | --- |
| 1. Landed | 37 | |
| 2. Started registering (reached the event picker) | 6 (16%) | −84% |
| 3. Registered interest | 0 (0%) | **−100%** |

- 31 sessions left from the home page without reaching the event picker.
- **All 6 sessions that reached the Register page left without tapping an event.** This is the critical leak.

**A/B headline test.** Version A ("Compete. Perform. Celebrate.") got a 22.2% CTA click rate (4 of 18 sessions). Version B ("Find your stage.") got 5.3% (1 of 19). A is ahead, but the difference isn't statistically significant (z = −1.51, p = 0.13), and each version has fewer than the 30 sessions planned. **Result: directional only. Keep A as the default until more data arrives.**

## 3. Improvement implemented and its observed effect

**Finding:** visitors reached the Register page but never registered. The event picker sat below a notice and needed scrolling, and the home page had no way to register directly.

**Changes (live 25 Nov 2026, 12:55 pm IST):**
1. Moved the event picker to the top of the Register page.
2. Added one-tap "Count Me In" buttons to the home page's "Most wanted" cards, so visitors can register without leaving Home.
3. Added an "Add to calendar" schedule download (.ics, with a reminder the day before) on Home, Programme and Register.

**How the effect is measured:** the analytics report automatically compares sessions before and after 12:55 pm IST on 25 Nov.
- **Primary metric:** the conversion rate (the share of sessions that register interest).
- **Secondary metrics:** the share of picker visitors who complete, and schedule downloads.

| Metric | Before (to 25 Nov 12:55) | After | Change |
| --- | --- | --- | --- |
| Sessions | 37 | *update from the live report* | |
| Reached the event picker | 16.2% | | |
| Picker → registered | 0% (0 of 6) | | |
| Conversion rate | 0.0% | | |
| Schedule downloads | n/a | | |

**Observed effect so far:** at the time of writing, no sessions had arrived after the change, so the effect cannot be reported yet. The report shows "too early to measure" until at least 20 sessions arrive after the change. It then shows the before/after figures with a significance test. Fill in the table from the "Improvement" section of the live report before presenting.

## 4. Recommended changes

1. **Share only the tracked links and QR codes** from the campaign toolkit (WhatsApp, Instagram post, story and bio, posters, LinkedIn, email). With 84% of traffic untagged, nothing can be said about which channel works.
2. **Fix the picker leak first.** It's done (section 3). Next, test showing the five most popular events at the top of the picker instead of all 29.
3. **Make the home page lead to more than one page.** Nobody explored beyond Home and Register. Add short teasers linking to Competitions (with one-tap buttons) and Highlights (artist pop-ups), and track whether views per session rise above 1.14.
4. **Keep headline A as the default** while the A/B test gathers at least 30 sessions per version.
5. **Verify the site in Google Search Console** and submit `sitemap.xml`, so search impressions, clicks and CTR can be reported.
6. **Re-check mobile vs desktop** once there are 20+ sessions of each. If mobile converts worse, keep the main action on the first screen for phones.

## 5. Search Console setup (metric 9)

1. Open https://search.google.com/search-console and add a **URL-prefix** property: `https://saraswat529.github.io/xpressions-microsite/`.
2. Choose the **HTML file** verification method and download the file Google gives you. Send it to the web team to add to the site, then click **Verify**.
3. In **Sitemaps**, submit `sitemap.xml`.
4. After a few days, copy Impressions, Clicks and Average position from **Performance** into the Search section of the analytics report (team passcode). The report calculates CTR.

## 6. Limitations

- **Very small sample:** 37 sessions from 32 users. Each visit moves the percentages a lot, so these are indications, not conclusions.
- **Late start:** tracking began on 20 Nov at 8:34 pm IST, after most of the 8–20 Nov campaign. Earlier visits weren't recorded, because the site host keeps no visitor logs.
- **Late-added metrics:** engagement time, device type, registration-start events, content clicks and schedule downloads were added on 25 Nov, so they cover only the most recent period.
- **Anonymous IDs:** one person on two devices counts as two users, and clearing the browser creates a new user.
- **Opt-outs:** visitors with Do Not Track or Global Privacy Control enabled, or who block scripts, aren't counted (a deliberate, ethical choice).
- **Sample data in the counters:** the event interest counters on the site include sample data prepared for the mock presentation. This analysis uses only the separate visit analytics, which are real recorded sessions.
- **Observational before/after:** the comparison isn't a controlled experiment. Traffic sources and timing differ between the two periods, so any change is an association, not proof of cause.
- **Search data:** Search Console figures are entered by hand and lag by 2–3 days.
