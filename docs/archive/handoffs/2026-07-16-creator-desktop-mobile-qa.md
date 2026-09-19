# 2026-07-16 Creator Desktop and Mobile QA

## Scope

- Production creator session on desktop and mobile viewports.
- Profile, creator Showtime / Choice management, public Choice, Explore AI Music, Bar Heartbreak, Drop Battle lobby, upload, crop, and metadata entry.
- No Battle, Choice, profile, or music content was published, removed, or modified during smoke testing.

## Production fixes

- Added a mobile volume control to the Explore bottom player while retaining the compact desktop player.
- Added Escape close and dialog focus behavior to the lyrics HUD.
- Removed mobile horizontal overflow from selected Creator Choice tracks and raised mobile action targets to 44 px.
- Fixed `/api/choice/saved` by querying real `user_profiles` columns and loading Choice items separately from their collections.
- Added state-correct Choice save accessibility labels and `aria-pressed`.
- Added mobile top spacing to Creator Choice and public Choice so the fixed home logo does not cover page content.

## Verification

- Full Node test suite: 180 tests passed.
- `npx tsc --noEmit`: passed after every production fix.
- `npm run lint`: passed with 12 existing warnings and no errors.
- `npm run build`: passed locally; all three Vercel production builds completed successfully.
- Production alias: `https://aipoger.com`.
- Final deployment: `dpl_tGnHvieTEJXZMzpVEdasjLufj92G`.

## Live smoke results

- Mobile Creator Choice: no horizontal overflow; selected-track buttons are 44 px.
- Mobile and desktop Explore: playback and seek work; mobile volume changes; lyrics HUD closes with Escape.
- Profile: saved `愛波哥 Choice` appears without the partial-data warning.
- Public Choice: 10 playable tracks, recommendation article, saved state, share action, and no header overlap.
- Bar Heartbreak: playback reached ready state 4; mobile volume moved from 0.72 to 0.71 and was restored; 11 genres and 12H copy remain visible.
- Drop crop: synthetic eight-second MP3 loaded; lyrics accepted `中文 空格 English space `; Space outside the textarea advanced playback; metadata step exposed all 11 genres.
- Drop Battle lobby: four gatekeeper cards loaded on mobile with no stale loading or horizontal overflow.

## Commits

- `ab25371` Fix creator mobile playback and Choice management
- `d61a085` Fix saved Choice profile query
- `8c72e76` Prevent Choice mobile header overlap
