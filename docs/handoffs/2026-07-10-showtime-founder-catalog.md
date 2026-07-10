# 2026-07-10 Showtime Founder Catalog Handoff

## Decision

Showtime founder catalog intake is a persisted certification path, not a new public automatic rule. The app must not promise `30 hearts`, `7 public days`, or `30 days` as current Showtime entry rules.

## Implementation

- Added persisted Showtime fields for `listen_bar_tracks` in `supabase/20260710_showtime_founder_catalog.sql`.
- Added read-only preview and guarded apply scripts:
  - `npm run showtime:founder-preview`
  - `npm run showtime:founder-apply -- --confirm=showtime-founder-catalog-2026-07-10 ...`
- `/api/ai-music/tracks` now has surface split:
  - default Explore excludes persisted Showtime and Explore-retired works.
  - `surface=showtime` returns certified Showtime works.
- Bar Heartbreak public APIs exclude persisted Showtime works from public airplay, creator Bar management, rotation, and old removal flows.
- AI Music challenge APIs block attacks and defender-drop edits on persisted Showtime works.
- `/api/showtime/my-tracks` lets creators manage only their own Showtime display metadata, reviewed HTTPS support URL, and public-display soft removal.
- Profile now includes Showtime display management for creator-owned certified tracks.
- `/rank` reads Showtime AI Music tracks through `surface=showtime` and shows approved support links with `支持創作者`.

## Production Preview

Read-only preview ran on 2026-07-10 and wrote `docs/handoffs/showtime-founder-catalog-preview.json`.

- Demo confirmation: blocked, `count=0`, status `ambiguous_or_not_exactly_two_do_not_apply`.
- Founder catalog candidates: `45`.
- Exclusions: `140`.
- `write_safe=false`.

Because the two demo tracks were not identified unambiguously, the spec requires stopping at preview. No production soft delete and no founder batch Showtime write was performed.

## Verification

- Unit tests cover persisted Showtime surface split, old flow blocking, creator Showtime metadata limits, guarded preview/apply path, and removal of public Heart/day eligibility promises.
- TypeScript casts are intentionally local to Supabase select result boundaries because shared select-field strings are not parseable by the generated Supabase type parser.
- Before production data writes in a later run, re-run the preview, confirm exactly two demo IDs, and pass explicit IDs to the apply script. Do not infer demo songs by fuzzy title matching.
