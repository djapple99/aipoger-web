-- Owner-only bookkeeping for external promotion work.
-- This is separate from promoted_at, which records entry into the public radio pool.

alter table public.listen_bar_tracks
  add column if not exists promotion_checked_at timestamptz;

comment on column public.listen_bar_tracks.promotion_checked_at is
  'Owner bookkeeping timestamp for marking that the track has been recorded and promoted externally.';
