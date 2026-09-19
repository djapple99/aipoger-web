-- Drop Battle full-song extension for Honor Board.
-- Creators may publish the complete song only when a Drop reaches Honor Board.
-- If the creator does not opt in, only the Drop clip is public.

alter table public.battle_queue
  add column if not exists full_audio_path text,
  add column if not exists full_audio_sha256 text,
  add column if not exists full_audio_original_name text,
  add column if not exists full_audio_duration_seconds numeric(10, 2),
  add column if not exists full_audio_public boolean not null default false;

alter table public.battle_queue drop constraint if exists battle_queue_full_audio_sha256_format;
alter table public.battle_queue
  add constraint battle_queue_full_audio_sha256_format
  check (full_audio_sha256 is null or full_audio_sha256 ~ '^[a-f0-9]{64}$');

alter table public.battle_queue drop constraint if exists battle_queue_full_audio_public_requires_path;
alter table public.battle_queue
  add constraint battle_queue_full_audio_public_requires_path
  check (full_audio_public = false or nullif(trim(coalesce(full_audio_path, '')), '') is not null);

create index if not exists battle_queue_public_full_audio_idx
on public.battle_queue (full_audio_public, full_audio_path)
where full_audio_public = true and full_audio_path is not null;

comment on column public.battle_queue.full_audio_path is
'Private battle-audio storage path for the creator-approved complete song. Public playback is allowed only when full_audio_public is true and the Drop reaches Honor Board.';
comment on column public.battle_queue.full_audio_public is
'Creator opt-in: if true, Honor Board may expose a signed Full Song URL after the Drop becomes an official archived result.';

update storage.buckets
set allowed_mime_types = array(
  select distinct mime
  from unnest(coalesce(allowed_mime_types, array[]::text[]) || array[
    'audio/flac',
    'audio/x-flac'
  ]::text[]) as mime
)
where id = 'battle-audio';
