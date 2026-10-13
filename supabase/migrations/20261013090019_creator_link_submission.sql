-- Link submissions keep the existing track ID, reactions, moderation and atomic
-- upload-window trigger. No existing song, audio or history is rewritten.
alter table public.listen_bar_tracks add column if not exists external_provider text;
alter table public.listen_bar_tracks add column if not exists external_media_id text;
alter table public.listen_bar_tracks add column if not exists external_url text;
alter table public.listen_bar_tracks add column if not exists is_music_video boolean not null default false;
alter table public.listen_bar_tracks alter column audio_path drop not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.listen_bar_tracks'::regclass and conname='creator_track_media_source') then
    alter table public.listen_bar_tracks add constraint creator_track_media_source check (
      (nullif(trim(audio_path),'') is not null and external_provider is null and external_media_id is null and external_url is null)
      or (audio_path is null and external_provider in ('youtube','suno','spotify') and external_media_id is not null and external_url is not null and (
        (external_provider='youtube' and external_media_id ~ '^[A-Za-z0-9_-]{11}$' and external_url='https://www.youtube.com/watch?v='||external_media_id)
        or (external_provider='suno' and external_media_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and external_url='https://suno.com/song/'||external_media_id)
        or (external_provider='spotify' and external_media_id ~ '^[A-Za-z0-9]{22}$' and external_url='https://open.spotify.com/track/'||external_media_id)
      ))
    ) not valid;
  end if;
end $$;
alter table public.listen_bar_tracks validate constraint creator_track_media_source;
create unique index if not exists creator_external_source_unique on public.listen_bar_tracks(created_by,external_provider,external_media_id) where external_provider is not null;
comment on column public.listen_bar_tracks.external_url is 'Canonical original-platform link. No copied audio; preview playback confirmation is client advisory, not proof of copyright.';
comment on column public.listen_bar_tracks.is_music_video is 'Creator chooses to include a linked YouTube work in MV discovery; same ID and interactions.';
notify pgrst, 'reload schema';
