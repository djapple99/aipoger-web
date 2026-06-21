-- AIPOGER Bar Heartbreak production schema alignment.
-- Safe to run more than once.
--
-- Keeps the public/admin Listen Bar APIs on the modern select path so creator
-- metadata such as description, moderation state, and lifecycle status are not
-- dropped by legacy fallbacks.

alter table public.listen_bar_tracks
  add column if not exists description text,
  add column if not exists audio_sha256 text,
  add column if not exists bar_phase text not null default 'public',
  add column if not exists promoted_at timestamptz,
  add column if not exists hidden_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists moderation_note text;

update public.listen_bar_tracks
set bar_phase = 'public'
where bar_phase is null;

update public.listen_bar_tracks
set promoted_at = coalesce(promoted_at, created_at)
where source = 'community'
  and is_active = true
  and bar_phase = 'public'
  and promoted_at is null;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_bar_phase_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_bar_phase_check
  check (bar_phase in ('challenger', 'public'));

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_review_status_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_review_status_check
  check (review_status in ('pending', 'approved', 'featured', 'hidden', 'removed', 'completed', 'rejected'));

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_audio_sha256_format;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_audio_sha256_format
  check (audio_sha256 is null or audio_sha256 ~ '^[a-f0-9]{64}$');

create index if not exists listen_bar_tracks_public_rotation_idx
  on public.listen_bar_tracks (source, is_active, bar_phase, positive_reaction_count desc, created_at desc);

create index if not exists listen_bar_tracks_challenger_judgment_idx
  on public.listen_bar_tracks (source, is_active, bar_phase, created_at, positive_reaction_count desc)
  where source = 'community';

create index if not exists listen_bar_tracks_review_status_created_idx
  on public.listen_bar_tracks (review_status, created_at desc);

create unique index if not exists listen_bar_tracks_audio_sha256_active_uniq
  on public.listen_bar_tracks (audio_sha256)
  where audio_sha256 is not null
    and is_active = true;

comment on column public.listen_bar_tracks.description is
  'One-line creator supplied track description shown on Bar Heartbreak now-playing UI.';

comment on column public.listen_bar_tracks.audio_sha256 is
  'SHA-256 fingerprint for blocking duplicate active Bar Heartbreak audio uploads.';
