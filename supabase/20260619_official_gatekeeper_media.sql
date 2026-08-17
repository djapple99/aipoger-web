-- AIPOGER Official Gatekeeper Drop media fields
-- Safe to run more than once.
--
-- Adds optional lyrics and cover art to owner-managed official Drop templates.
-- These fields are copied into the per-challenge Battle Room when a challenger enters.

alter table public.official_gatekeeper_drops
  add column if not exists lyrics text,
  add column if not exists cover_path text;

comment on column public.official_gatekeeper_drops.lyrics is
  'Optional lyrics for the official Gatekeeper Drop, copied into battles.lyrics_a.';

comment on column public.official_gatekeeper_drops.cover_path is
  'Optional battle-audio storage path for official Gatekeeper Drop cover art, copied into battles.song_a_cover.';
