# Listen Bar Legacy 88 Rotation Retired - 2026-07-06

## Summary

Production briefly showed `88 / 396` again because 54 community public tracks were soft-deleted in two system-like batches around 2026-07-06 Taiwan time. This violated the current Bar Heartbreak rule because no genre was over the 36-track public-pool limit.

## Production Fix

- Applied Supabase migration `20260706_listen_bar_retire_legacy_88_rotation.sql`.
- Replaced `public.process_listen_bar_rotation_limits()` with the 36-per-genre rule only.
- Revoked execute from `anon` and `authenticated`; only `service_role` keeps execute.
- Added `trg_listen_bar_block_legacy_public_capacity_removal` to block legacy/global 88 removals and unmarked public-pool soft deletes.
- Restored the bad-batch public tracks. Live public count returned to 142.

## Verified State

- `https://aipoger.com/api/listen-bar/tracks?lang=zh` returns 142 tracks.
- `https://aipoger.com/api/listen-bar/process-rotation` reports `activePublic=142`, `publicOverflow=0`, `wouldRemoveCount=0`, `enabledForMutation=false`.
- DB guard test confirmed the legacy `88-song public pool capacity rotation eviction.` update is blocked.
- Live `/listen-bar?lang=zh` browser DOM shows `公播 142/396` and `公播歌池 142 / 396`.

## Rule Going Forward

The global 88-track Bar Heartbreak rule is retired. It may remain only in old migration history or old moderation-note repair context. Operationally, capacity eviction can only happen when the same fixed genre has more than 36 active public tracks, and it must carry the `36-song genre public pool capacity rotation eviction.` note.
