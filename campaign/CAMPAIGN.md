# Xpressions'27 traffic-generation campaign

**Campaign:** `xp27_nov` · **Period:** 8 to 20 November 2026 · **Goal:** bring students to the microsite, get them to explore it, and get them to register interest in events.

The live results, the A/B test and the dated log are on the campaign toolkit page:
https://saraswat529.github.io/xpressions-microsite/campaign.html

## 1. Promotional creatives (3 messages, 3 formats)

| # | File | Format | Message | Tracked as |
| --- | --- | --- | --- | --- |
| 1 | `creatives/xpressions27-post_countmein.png` | Instagram feed post, 1080×1080 | **"Which events are you going to?"** A low-effort action (one tap, no forms) for students who already know the fest. | instagram / social / post_countmein |
| 2 | `creatives/xpressions27-story_explorer.png` | Instagram story, 1080×1920 | **"9 Explorers are hiding on our website."** A curiosity and game hook for people who don't follow the fest yet. | instagram / story / story_explorer |
| 3 | `creatives/xpressions27-poster_qr.png` | A4 campus poster, 1240×1754 (150 dpi) | **"31 Jan – 1 Feb · N days to go."** Save the date with a countdown, plus a large QR code for notice boards, hostels and the canteen. | campus / print / poster_qr |

You can regenerate all three from the toolkit page (the "Download PNG" button). The poster's countdown is recalculated each time.

## 2. Channels and trackable links

Each channel has its own UTM-tagged link and QR code (PNG files are in `qr/`). The site saves the source when a visitor arrives, then removes the tags from the address bar.

| Channel | Link |
| --- | --- |
| Instagram post (creative 1) | https://saraswat529.github.io/xpressions-microsite/?utm_source=instagram&utm_medium=social&utm_campaign=xp27_nov&utm_content=post_countmein#register |
| Instagram story (creative 2) | https://saraswat529.github.io/xpressions-microsite/?utm_source=instagram&utm_medium=story&utm_campaign=xp27_nov&utm_content=story_explorer |
| Campus poster QR (creative 3) | https://saraswat529.github.io/xpressions-microsite/?utm_source=campus&utm_medium=print&utm_campaign=xp27_nov&utm_content=poster_qr |
| Instagram bio | https://saraswat529.github.io/xpressions-microsite/?utm_source=instagram&utm_medium=social&utm_campaign=xp27_nov&utm_content=bio |
| WhatsApp groups | https://saraswat529.github.io/xpressions-microsite/?utm_source=whatsapp&utm_medium=messaging&utm_campaign=xp27_nov&utm_content=group_message |
| LinkedIn post | https://saraswat529.github.io/xpressions-microsite/?utm_source=linkedin&utm_medium=social&utm_campaign=xp27_nov&utm_content=post |
| Student email | https://saraswat529.github.io/xpressions-microsite/?utm_source=email&utm_medium=email&utm_campaign=xp27_nov&utm_content=mailer |

You can make more links (for example for a club or a reel) with the "Make a custom link" form on the toolkit page.

## 3. Marketing experiment: A/B headline test

- **Hypothesis:** a personal, invitation-style headline ("Find your stage.") gets more visitors to act than the original slogan ("Compete. Perform. Celebrate.").
- **Design:** each new visitor is randomly assigned version A or B (50/50) and keeps it on return visits. Everything else on the page is identical.
- **Primary metric:** the share of visitors who click "Register Your Intent Now" in the hero. **Secondary metric:** the share who register interest in at least one event.
- **Analysis:** a two-proportion z-test, computed live on the toolkit page. A winner is declared only with at least 30 visitors per version and p < 0.05. Otherwise the result is reported as directional only.
- **Ethics:** both headlines are truthful and lead to the same content. Data is anonymous, using a random browser ID with no names, emails, IP addresses or fingerprints. Browsers that send Do Not Track or Global Privacy Control are excluded. The test is disclosed in the site's FAQ ("Does this site track me?"). Preview links (`?ab=a` and `?ab=b`) are never counted.

## 4. What is measured

Visits, unique visitors, section views, clicks on "Register Your Intent", interests registered, Explorers found and outbound clicks (Instagram, Luma). Each is broken down by source, medium and creative, plus visits per day. Everything is aggregated on the toolkit page and can be downloaded as CSV.

## 5. Dated log of campaign actions

Kept in the database and shown on the toolkit page, where anyone in the team can add entries with the team passcode. It can be downloaded as CSV. Log every action, such as a post, story, poster run, group message or email, with its date, channel and a link or proof.

## Setup (one time)

Run `supabase/campaign.sql` in the Supabase SQL Editor, after changing the team passcode in the file. Tracking starts as soon as it has run. Visits from before that point were not recorded, because GitHub Pages keeps no visitor logs. Backfill earlier actions in the dated log.
