# Daily Spotlight Retirement Handoff

Date: 2026-07-10

## Active product direction

- Daily Spotlight is retired from Bar Heartbreak, Explore, `/admin/listen-bar`, and social publishing. Do not introduce a single-track replacement.
- Bar Heartbreak remains the submission and public-airplay surface.
- AIPOGER Choice is the only human curation direction: 5-10 cross-genre works each week, without ranking or an automated weekly-winner claim.
- `/admin/social` remains the only social draft, approval, and manual publishing console.

## Compatibility and data preservation

- `/today?lang=<lang>` is retained only for old links and returns a 307 redirect to `/rank?lang=<lang>#choice-weekly`.
- `/listen-bar?spotlight=...` is ignored and opens the normal radio with no selected-song override or Spotlight panel.
- The app no longer contains the Daily Spotlight API route or helper. Existing `listen_bar_daily_spotlights` rows, historical media, migrations, and social drafts remain untouched.
- No SQL or destructive data operation is part of this retirement.
