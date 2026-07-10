# 2026-07-10 Showtime Founder Catalog Handoff

## Decision

Showtime founder catalog intake is a persisted certification path, not a new public automatic rule. For the 2026-07-10 owner-confirmed founder batch, eligible public community works with `public_time <= now() - 30 days` move into Showtime, including exactly-30-day works. The app still must not promise `30 hearts`, `7 public days`, or `30 days` as public Showtime-entry rules.

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

Because the two demo tracks were not identified unambiguously at that point, the first run stopped at preview. No production soft delete and no founder batch Showtime write was performed in that run.

2026-07-10 update: the additive `listen_bar_tracks` Showtime migration was applied to Supabase production and verified by `information_schema`.

The two demo Battle archive cards were later confirmed by the owner from the live Showtime screenshot and soft-hidden from public Showtime display, without deleting the archive/result history:

- `AIPO-000060` / battle `7cda58b9-0e89-410d-b0a5-fb02dd81a8e4` / `网易云音乐人` / `夜色狂欢`
- `AIPO-000062` / battle `84951a3f-5ac8-48e6-9e92-96fa6c76ecd5` / `飄浪a勇哥` / `命に嫌われている`

Supabase production now also has `battle_result_archives.showtime_public_removed_at`, `showtime_public_removed_by`, `showtime_public_removal_note`, and `showtime_updated_at` from `supabase/20260710_showtime_archive_public_removal.sql`. Public Showtime catalog reads must keep filtering `showtime_public_removed_at is null`.

2026-07-10 30-day check and apply: production read-only preview confirmed `45` eligible public community works at or older than the 30-day cutoff. The youngest eligible work was already `31.63` days old, so no current production row was exactly on the 30.00-day boundary, but the preview/apply condition remains inclusive (`public_time <= cutoff`). The owner then confirmed that at-or-over-30-day works should move to Showtime, and the `45` candidates were written to production with `ai_music_showtime_certified=true` and `ai_music_showtime_certification_source='founder_catalog'` at `2026-07-10T10:37:03.399Z`.

After the write, `/api/ai-music/tracks?surface=showtime` still returned `0` because production was missing `listen_bar_tracks.support_url` and `support_url_status`; the route fell back to legacy selects that do not include Showtime fields. `supabase/20260710_listen_bar_support_url_schema.sql` was added and applied to production. The live Showtime API then returned `45` tracks.

## Verification

- Unit tests cover persisted Showtime surface split, old flow blocking, creator Showtime metadata limits, guarded preview/apply path, and removal of public Heart/day eligibility promises.
- Unit tests cover Battle archive Showtime soft removals so hidden archive records keep their history but leave the public catalog.
- Unit tests cover the inclusive 30-day founder catalog cutoff and optional demo soft-delete guard.
- Unit tests cover the `support_url` schema needed to keep Showtime AI Music API reads on the modern select path.
- TypeScript casts are intentionally local to Supabase select result boundaries because shared select-field strings are not parseable by the generated Supabase type parser.
- Do not infer demo songs by fuzzy title matching. Any future public-removal operation should use exact owner-confirmed IDs or battle codes.
