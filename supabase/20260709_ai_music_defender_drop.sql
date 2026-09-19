-- AIPOGER Explore AI Music defender Drop readiness.
-- Current rule: a track can be open to Explore challenges only after the creator
-- prepares a lockable 60s defender Drop. Pending attack invites block replacing
-- that defender Drop.

alter table public.listen_bar_tracks
  add column if not exists ai_music_defender_drop_audio_path text,
  add column if not exists ai_music_defender_drop_audio_sha256 text,
  add column if not exists ai_music_defender_drop_original_name text,
  add column if not exists ai_music_defender_drop_duration_seconds numeric,
  add column if not exists ai_music_defender_drop_lyrics text,
  add column if not exists ai_music_defender_drop_prepared_at timestamptz;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_ai_music_open_requires_defender_drop;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_ai_music_open_requires_defender_drop
  check (
    ai_music_challenge_status <> 'open'
    or nullif(trim(ai_music_defender_drop_audio_path), '') is not null
  ) not valid;

create index if not exists listen_bar_tracks_ai_music_defender_drop_ready_idx
on public.listen_bar_tracks (ai_music_challenge_status, ai_music_defender_drop_prepared_at desc)
where source = 'community'
  and is_active = true
  and ai_music_challenge_status = 'open'
  and nullif(trim(ai_music_defender_drop_audio_path), '') is not null;

comment on column public.listen_bar_tracks.ai_music_defender_drop_audio_path is
'Battle-audio storage path for the prepared 60s defender Drop used by Explore AI Music challenges.';

comment on column public.listen_bar_tracks.ai_music_defender_drop_prepared_at is
'Timestamp when the creator last prepared the defender Drop for Explore AI Music challenges.';

create or replace function public.prevent_ai_music_defender_drop_change_with_pending_invite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    old.ai_music_defender_drop_audio_path is distinct from new.ai_music_defender_drop_audio_path
    or old.ai_music_defender_drop_audio_sha256 is distinct from new.ai_music_defender_drop_audio_sha256
    or old.ai_music_defender_drop_original_name is distinct from new.ai_music_defender_drop_original_name
    or old.ai_music_defender_drop_duration_seconds is distinct from new.ai_music_defender_drop_duration_seconds
    or old.ai_music_defender_drop_lyrics is distinct from new.ai_music_defender_drop_lyrics
  )
  and exists (
    select 1
    from public.ai_music_challenge_invites invites
    where invites.defender_track_id = old.id
      and invites.status = 'pending'
    limit 1
  ) then
    raise exception '有待回覆攻擂邀請時不能修改守擂 Drop。';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_ai_music_defender_drop_change_with_pending_invite on public.listen_bar_tracks;
create trigger trg_prevent_ai_music_defender_drop_change_with_pending_invite
before update of
  ai_music_defender_drop_audio_path,
  ai_music_defender_drop_audio_sha256,
  ai_music_defender_drop_original_name,
  ai_music_defender_drop_duration_seconds,
  ai_music_defender_drop_lyrics
on public.listen_bar_tracks
for each row
execute function public.prevent_ai_music_defender_drop_change_with_pending_invite();
