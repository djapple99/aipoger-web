-- Retire recognition, not songs or results. Apply before deploying the app.
-- Existing grants, RLS, audio, Hearts, favorites and archives are untouched.
begin;

alter table public.listen_bar_tracks
  add column if not exists ai_music_certification_retired_at timestamptz;

-- Snapshot the old exemption once, including defense-qualified works whose
-- recognition was computed at read time rather than persisted. A fixed cutoff
-- prevents a replay of this migration from recognizing later defense wins.
with legacy_defenders as (
  select i.defender_track_id
  from public.ai_music_challenge_invites i
  join public.battles b on b.id = i.battle_id
  join public.battle_result_archives a on a.battle_id = b.id
  where i.status = 'accepted'
    and i.challenger_user_id <> i.defender_user_id
    and b.battle_type = 'ai_music_challenge'
    and a.archived_at <= timestamptz '2026-09-17 15:22:44+00'
    and coalesce(nullif(a.winner, ''), b.winner) = 'fighter_a'
    and case
      when coalesce(a.result_payload->>'audienceCount', a.result_payload->>'audience_count', a.total_votes::text, '0') ~ '^[0-9]+([.][0-9]+)?$'
      then coalesce(a.result_payload->>'audienceCount', a.result_payload->>'audience_count', a.total_votes::text, '0')::numeric >= 3
      else false
    end
  group by i.defender_track_id
  having count(distinct i.challenger_user_id) >= 6
)
update public.listen_bar_tracks t
set ai_music_challenge_status = 'showcase',
    ai_music_challenge_updated_at = now(),
    ai_music_certification_retired_at = now()
where t.ai_music_certification_retired_at is null
  and (t.ai_music_showtime_certified or t.id in (select defender_track_id from legacy_defenders));

comment on column public.listen_bar_tracks.ai_music_showtime_certified is
  'Historical recognition only. No new certifications; never an Explore visibility or creator-management gate.';
comment on column public.listen_bar_tracks.ai_music_certification_retired_at is
  'One-time legacy retirement/exemption snapshot. Initial challenge status is showcase; creators may explicitly opt in again. Never a public badge.';

-- Normalize obsolete trigger/RPC writes rather than aborting their parent
-- battle settlement. Recognition history is immutable; ordinary metadata,
-- moderation and explicit challenge preference updates still pass through.
create or replace function public.freeze_retired_showtime_certification()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.ai_music_showtime_certified := false;
    new.ai_music_showtime_certified_at := null;
    new.ai_music_showtime_certification_source := null;
    new.ai_music_certification_retired_at := null;
  else
    if row(new.ai_music_showtime_certified, new.ai_music_showtime_certified_at, new.ai_music_showtime_certification_source)
       is distinct from row(old.ai_music_showtime_certified, old.ai_music_showtime_certified_at, old.ai_music_showtime_certification_source) then
      new.ai_music_challenge_status := old.ai_music_challenge_status;
      new.ai_music_challenge_updated_at := old.ai_music_challenge_updated_at;
      new.ai_music_showtime_public_removed_at := old.ai_music_showtime_public_removed_at;
      new.ai_music_showtime_public_removed_by := old.ai_music_showtime_public_removed_by;
      new.ai_music_showtime_public_removal_note := old.ai_music_showtime_public_removal_note;
      new.is_active := old.is_active;
      new.review_status := old.review_status;
      new.hidden_at := old.hidden_at;
      new.removed_at := old.removed_at;
    end if;
    new.ai_music_showtime_certified := old.ai_music_showtime_certified;
    new.ai_music_showtime_certified_at := old.ai_music_showtime_certified_at;
    new.ai_music_showtime_certification_source := old.ai_music_showtime_certification_source;
    new.ai_music_certification_retired_at := old.ai_music_certification_retired_at;
  end if;
  return new;
end;
$$;
revoke all on function public.freeze_retired_showtime_certification() from public, anon, authenticated;

create or replace trigger zzzz_freeze_retired_showtime_certification
before insert or update on public.listen_bar_tracks
for each row execute function public.freeze_retired_showtime_certification();

-- Catch even a later-named BEFORE trigger attempting to restore recognition.
-- Do not restrict this to UPDATE OF: other triggers may mutate NEW implicitly.
create or replace function public.assert_showtime_certification_retired()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.ai_music_showtime_certified or new.ai_music_showtime_certified_at is not null
       or new.ai_music_showtime_certification_source is not null
       or new.ai_music_certification_retired_at is not null then
      raise exception 'Showtime certification is retired';
    end if;
  elsif row(new.ai_music_showtime_certified, new.ai_music_showtime_certified_at, new.ai_music_showtime_certification_source, new.ai_music_certification_retired_at)
     is distinct from row(old.ai_music_showtime_certified, old.ai_music_showtime_certified_at, old.ai_music_showtime_certification_source, old.ai_music_certification_retired_at) then
    raise exception 'Historical Showtime recognition is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.assert_showtime_certification_retired() from public, anon, authenticated;

create or replace trigger assert_showtime_certification_retired
after insert or update on public.listen_bar_tracks
for each row execute function public.assert_showtime_certification_retired();

commit;
