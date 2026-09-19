# 2026-07-11 Full-Site Smoothness Audit

## Scope

- Production browser audit at 1440x900 and 390x844.
- Checked home, Explore AI Music, Bar Heartbreak, Drop Battle, Battle entry, Showtime, Profile, auth, music analysis, Bible, About, Partners, legacy redirects, public APIs, admin route health, and Chinese/English/Japanese/Korean layout paths.

## Fixed

- Desktop Drop Battle start-challenge star no longer covers genre filters or cards.
- Mobile Profile and Battle Entry headers clear the fixed global controls.
- Logged-out visitors no longer see a fake Profile notification bell; Profile redirects to auth with its return path.
- Bar Heartbreak no longer displays two copies of the idle Explore hint.
- `/watch` preserves supported language while redirecting to `/battle`.
- Music analysis cold-start timeout reports `202 warming` instead of a false `503` server failure.

## Verified

- Explore GUIDE, Escape close, audio playback, seek bar, lyrics HUD, challenge-ready badge, and Explore-native share URL.
- Explore 103 works, Showtime 45 certified works, Bar Heartbreak 103 public tracks, rotation dry-run, messages, and official gatekeeper APIs.
- No horizontal overflow or broken covers on the core desktop/mobile routes after the fixes.
- `npm test`: 146 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: 0 errors, 11 existing warnings.
- `npm run build`: passed.

## External Risk

- The Render-hosted music analysis service can cold-start. The AIPOGER UI keeps polling and now treats that state as warming; it returned healthy after wake-up during this audit.
