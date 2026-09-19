-- AIPOGER Showtime founder catalog migration support.
-- This file adds persistent Showtime state only. Do not use it to mutate
-- real track certification or demo-removal data without the read-only preview
-- and owner confirmation required by the 2026-07-10 founder catalog spec.

alter table public.listen_bar_tracks
  add column if not exists ai_music_showtime_certified boolean not null default false,
  add column if not exists ai_music_showtime_certified_at timestamptz,
  add column if not exists ai_music_showtime_certification_source text,
  add column if not exists ai_music_showtime_public_removed_at timestamptz,
  add column if not exists ai_music_showtime_public_removed_by uuid references auth.users(id) on delete set null,
  add column if not exists ai_music_showtime_public_removal_note text,
  add column if not exists ai_music_showtime_updated_at timestamptz;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_ai_music_showtime_source_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_ai_music_showtime_source_check
  check (
    ai_music_showtime_certification_source is null
    or ai_music_showtime_certification_source in ('battle', 'defense', 'airplay', 'founder_catalog')
  );

create index if not exists listen_bar_tracks_showtime_public_idx
on public.listen_bar_tracks (ai_music_showtime_certified, ai_music_showtime_certified_at desc, created_at desc)
where ai_music_showtime_certified = true
  and ai_music_showtime_public_removed_at is null;

create index if not exists listen_bar_tracks_showtime_creator_idx
on public.listen_bar_tracks (created_by, ai_music_showtime_certified, ai_music_showtime_certified_at desc)
where ai_music_showtime_certified = true;

comment on column public.listen_bar_tracks.ai_music_showtime_certified is
'Persistent AIPOGER Showtime certification flag. Certified works leave Explore and Bar Heartbreak public listings.';

comment on column public.listen_bar_tracks.ai_music_showtime_certified_at is
'Timestamp when the work entered the unified AIPOGER Showtime catalog.';

comment on column public.listen_bar_tracks.ai_music_showtime_certification_source is
'Internal recognition source: battle, defense, airplay, or founder_catalog. Public UI maps this to normal recognition copy without exposing batch criteria.';

comment on column public.listen_bar_tracks.ai_music_showtime_public_removed_at is
'Creator/admin soft removal timestamp for the public Showtime display. Underlying track, votes, hearts, battle history, and recognition records remain.';
