# Choice Read-only Tracklist and Comments Handoff

**Date:** 2026-07-16  
**Status:** implementation complete; production verification recorded below after release

## Current product decision

- Choice cards remain compact, cover-led cards in the six-column desktop shelf.
- The card cover play button is the only playback entry on the shelf. It starts the saved playlist in order through the shared bottom player.
- The tracklist icon is a read-only preview. Desktop hover/focus and mobile tap reveal ordered tracks; the HUD contains no row play buttons and no Play All action.
- Recommendation copy is shown inline on the card and beside the public-page title. The retired standalone article HUD must not return.
- Collection comments replace the old article-icon action. Public visitors can read; signed-in users can post, delete their own comments, and report other comments.
- Public Choice pages keep Play All and individual play actions, add a visible return to Showtime, and use one persistent bottom player with seek, previous/next, and mobile Web Audio volume fallback.
- A publish/withdraw action persists the current week, title, recommendation copy, and owner curator identity together.
- The signed-in account avatar dock is draggable, saved locally, and clamped inside the viewport after resize.

## Data and security

- Additive table: `public.aipoger_choice_collection_comments`.
- Reads and authenticated writes go through `/api/choice/comments` using server-side collection publication checks.
- Direct `anon` and `authenticated` table access remains revoked; RLS is enabled.
- Comment bodies are limited to 280 characters. Delete is restricted to the comment owner.

## Verification

- `npx tsc --noEmit`: pass.
- `npm test`: 182 / 182 pass.
- `npm run lint`: exit 0; existing warning-only baseline remains.
- `npm run build`: pass.
- Supabase migration `20260716094500_choice_collection_comments.sql`: applied to the linked production project and recorded in remote migration history.
- Supabase security and performance advisors at error level: no issues found.
- Local Playwright desktop/mobile: Choice card playback, public-page Play All, read-only tracklist HUD, comments dialog, mobile seek/volume, return to Showtime, and draggable account dock passed with no console errors.
- Production deploy and live smoke: pending until the release below is completed.
