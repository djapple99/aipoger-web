# 2026-07-12 Showtime and Choice Admin Handoff

## Decision

- `/admin/showtime` is the owner-only operational surface for Showtime catalog intake and public-display control.
- `/admin/choice` is the owner-only weekly human-curation surface for AIPOGER Choice.
- Choice remains a slim post-catalog curation list on `/rank#choice-weekly`; it is not a ranking board, an automated winner, Daily Spotlight, or a social publishing workflow.

## Data and Safety

- Production migration `20260712072918 choice_weekly_curation` created:
  - `public.aipoger_choice_collections`
  - `public.aipoger_choice_items`
- Both tables have RLS enabled and direct `anon` / `authenticated` access revoked. Public Choice is resolved only by `/api/choice/current`; owner writes go through authenticated admin APIs with the server-only service role.
- The migration is additive only. It does not modify historic songs, Battle records, votes, Hearts, daily spotlights, social drafts, or media.

## Management Boundaries

- Showtime admin may certify an eligible active public Bar Heartbreak community work as the fixed `airplay` recognition source, which sets it to `showcase` and stops challenges.
- It may soft-hide/restore public display for certified tracks and Battle archives. It cannot edit audio, existing recognition source, Battle result, votes, Hearts, or reopen challenges.
- Choice admin creates Monday-based week drafts, selects 5-10 currently public Showtime works, adjusts order, and publishes or withdraws the weekly list.
- Hiding/withdrawing a Showtime work makes it ineligible for new Choice selections and blocks a publish attempt if an existing selected work is no longer public.
- `/admin/social` remains the only social drafts, approval, and manual publishing console. Choice does not generate drafts or send external posts.

## Front Stage

- `/rank` reads `/api/choice/current` and renders the latest published Choice as compact cover rows after the unified Showtime catalog.
- When no Choice is published, the compatibility anchor and human-curation explanation remain without a fake selection.
- Profile owner admin entry includes both `Showtime` and `Choice` links.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed with the pre-existing 11 warnings only.
- `npm test` passed: 154 tests.
- `npm run build` passed and includes `/admin/showtime`, `/admin/choice`, and `/api/choice/current`.
- Supabase migration verification confirmed both Choice tables exist with RLS enabled.
