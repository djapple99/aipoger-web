-- AIPOGER winner release flow.
-- A creator decides at upload time whether the complete song may be released
-- after an official win. Only the winning creator may later submit a YouTube
-- MV URL; the public URL is exposed only from an official archived result.

alter table public.battle_queue
  add column if not exists full_audio_path text,
  add column if not exists full_audio_sha256 text,
  add column if not exists full_audio_original_name text,
  add column if not exists full_audio_duration_seconds numeric(10, 2),
  add column if not exists full_audio_public boolean not null default false,
  add column if not exists full_song_youtube_url text;

alter table public.battle_queue drop constraint if exists battle_queue_full_audio_sha256_format;
alter table public.battle_queue
  add constraint battle_queue_full_audio_sha256_format
  check (full_audio_sha256 is null or full_audio_sha256 ~ '^[a-f0-9]{64}$');

alter table public.battle_queue drop constraint if exists battle_queue_full_audio_public_requires_path;
alter table public.battle_queue
  add constraint battle_queue_full_audio_public_requires_path
  check (full_audio_public = false or nullif(trim(coalesce(full_audio_path, '')), '') is not null);

alter table public.battle_queue drop constraint if exists battle_queue_full_song_youtube_url_check;
alter table public.battle_queue
  add constraint battle_queue_full_song_youtube_url_check
  check (
    full_song_youtube_url is null
    or (
      char_length(full_song_youtube_url) between 1 and 300
      and full_song_youtube_url ~* '^https://(www\\.)?(youtube\\.com|youtu\\.be)/'
    )
  );

create index if not exists battle_queue_winner_release_youtube_idx
on public.battle_queue (full_song_youtube_url)
where full_song_youtube_url is not null;

create or replace function public.prevent_battle_queue_release_rewrite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and (
    new.full_audio_public is distinct from old.full_audio_public
    or new.full_audio_path is distinct from old.full_audio_path
    or new.full_audio_sha256 is distinct from old.full_audio_sha256
    or new.full_audio_original_name is distinct from old.full_audio_original_name
    or new.full_audio_duration_seconds is distinct from old.full_audio_duration_seconds
    or new.full_song_youtube_url is distinct from old.full_song_youtube_url
  ) then
    raise exception 'Creator release fields are server-controlled after upload.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_battle_queue_release_rewrite() from public, anon, authenticated;
grant execute on function public.prevent_battle_queue_release_rewrite() to service_role;

drop trigger if exists trg_prevent_battle_queue_release_rewrite on public.battle_queue;
create trigger trg_prevent_battle_queue_release_rewrite
before update on public.battle_queue
for each row
execute function public.prevent_battle_queue_release_rewrite();

comment on column public.battle_queue.full_audio_public is
'Creator opt-in captured at upload: the complete song may be exposed after an official result. It is immutable for client updates.';

comment on column public.battle_queue.full_song_youtube_url is
'Creator-submitted YouTube MV URL, writable only by the winner-release server flow after an official win.';
