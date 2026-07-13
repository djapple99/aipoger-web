# 2026-07-14 Showtime Current Catalog And Choice Selection

## Decision

- `/admin/showtime` is only for works that are already Showtime-certified and currently public. It must not duplicate Bar Heartbreak by listing all songs or airplay candidates.
- The owner can edit display metadata for creator-submitted Showtime works, including a multi-line `Showtime 評語／作品介紹`, plus cover, lyrics, and approved external links. Audio, certification source, Hearts, votes, and Battle records remain immutable here.
- Official and eligible creator Choice catalogs use only current public selectable Showtime works. When no weekly draft exists, the first `+` creates that week’s draft and adds the chosen work in one flow.

## Implementation

- `loadShowtimeAdminCatalog()` filters tracks to certified, publicly visible Showtime works and archives to public, selectable official Battle records.
- The Showtime admin page no longer exposes candidate, hidden, certification, or restore controls. It presents the current catalog, edit action, and public-display withdrawal action.
- `/admin/choice` and `/profile/choice` now keep their compact six-cover catalogs usable before a user manually creates a draft.

## Release Checks

- No schema migration or production SQL is required for this correction; it changes existing server filtering and UI flow only.
- Verify live `/admin/showtime` contains only current public Showtime works and `/profile/choice` enables the first-song `+` before a draft exists.
