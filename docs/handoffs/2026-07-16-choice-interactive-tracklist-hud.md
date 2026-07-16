# Choice 互動歌單 HUD

## Latest Product Decision

- Choice cards show the authored issue title only. Curator name and week date remain separate metadata; do not render a duplicated `curator Choice | authored title` string.
- The single tracklist icon keeps a compact desktop hover/focus order preview. Clicking it opens the complete interactive HUD on desktop; mobile tap opens the same HUD.
- The HUD header places authored title/date beside the stored recommendation intro.
- Every HUD row exposes the existing Showtime/song favorite Heart and a play command. These are song interactions, separate from the Choice card's collection-level Heart.
- The HUD footer exposes Play All and the full public Choice link. All playback uses the shared bottom queue player.
- The public `/choice/{id}?kind=official|creator` page keeps Return to Showtime, collection Heart, comments, share, per-song Heart/play, Play All, seek, previous/next, and mobile volume.

## Verification Required

- Desktop: six-column Choice/Showtime density, card title de-duplication, hover preview, interactive HUD song Heart/play, Play All, full share link, bottom player.
- Mobile: card title wrapping, interactive HUD row controls, scroll containment, bottom player seek/volume, no header or account-dock overlap.
- Production: API response, audio progress, no console errors, `aipoger.com` screenshots, and a live link returning to `#showtime-catalog`.

## Implementation And Local Verification

- `choiceDisplayTitle` now returns the authored issue title and falls back to `curator Choice` only when no authored title exists.
- `/rank` reuses `/api/honor-board/interactions` for song-level HUD saves, so the same Showtime/song favorite record is shown outside Choice.
- The public Choice page loads and toggles the same per-song records and includes Heart/play controls in both its visible playlist and compact HUD.
- Desktop screenshot: `output/playwright/choice-2026-07-16/latest-choice-hud-desktop.png`.
- Mobile screenshots: `output/playwright/choice-2026-07-16/latest-choice-hud-mobile.png`, `latest-choice-mobile-playing.png`, and `latest-choice-public-mobile.png`.
- Local Browser QA passed: authored title, intro/date header, 10 ordered songs, per-song Heart/play, modal close on playback, Play All, full public link, Return to Showtime, seek, mobile volume, and real audio progress (`currentTime > 2`, `paused=false`). Console errors: 0.
- Automated checks: `npm test` 183/183; `npx tsc --noEmit`; `npm run lint` with 0 errors and the same 11 pre-existing warnings; `npm run build` passed.
