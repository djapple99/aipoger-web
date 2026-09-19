-- AIPOGER Explore AI Music challenge loop.
-- Current rule: Explore works come from the AI music public airplay / Bar Heartbreak
-- data flow. Creators control each track's challenge state, challengers can send
-- up to 6 tower-challenge invites per Taiwan day, and pending defender approval
-- battles allow 5s previews but no voting.

create extension if not exists pgcrypto;

alter table public.listen_bar_tracks
  add column if not exists ai_music_challenge_status text not null default 'showcase',
  add column if not exists ai_music_challenge_updated_at timestamptz not null default now();

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_ai_music_challenge_status_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_ai_music_challenge_status_check
  check (ai_music_challenge_status in ('showcase', 'open', 'custom'));

create index if not exists listen_bar_tracks_ai_music_challenge_open_idx
on public.listen_bar_tracks (ai_music_challenge_status, source, is_active, bar_phase, created_at desc)
where source = 'community' and is_active = true;

comment on column public.listen_bar_tracks.ai_music_challenge_status is
'Explore AI Music direct challenge status: showcase = 僅展示, open = 等人挑戰, custom = 自定開戰.';

create table if not exists public.ai_music_challenge_invites (
  id uuid primary key default gen_random_uuid(),
  defender_track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  defender_user_id uuid not null references auth.users(id) on delete cascade,
  challenger_user_id uuid not null references auth.users(id) on delete cascade,
  defender_queue_id uuid references public.battle_queue(id) on delete set null,
  challenger_queue_id uuid references public.battle_queue(id) on delete set null,
  battle_id uuid references public.battles(id) on delete set null,
  status text not null default 'pending',
  scheduled_start_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_music_challenge_invites_status_check
    check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  constraint ai_music_challenge_invites_distinct_users_check
    check (defender_user_id <> challenger_user_id)
);

alter table public.ai_music_challenge_invites
  add column if not exists defender_queue_id uuid references public.battle_queue(id) on delete set null,
  add column if not exists challenger_queue_id uuid references public.battle_queue(id) on delete set null,
  add column if not exists battle_id uuid references public.battles(id) on delete set null,
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours'),
  add column if not exists responded_at timestamptz;

create index if not exists ai_music_challenge_invites_challenger_day_idx
on public.ai_music_challenge_invites (challenger_user_id, created_at desc);

create index if not exists ai_music_challenge_invites_defender_pending_idx
on public.ai_music_challenge_invites (defender_user_id, status, created_at desc)
where status = 'pending';

create index if not exists ai_music_challenge_invites_track_pending_idx
on public.ai_music_challenge_invites (defender_track_id, status, created_at desc);

create or replace function public.ai_music_challenge_invites_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ai_music_challenge_invites_updated_at on public.ai_music_challenge_invites;
create trigger trg_ai_music_challenge_invites_updated_at
before update on public.ai_music_challenge_invites
for each row
execute function public.ai_music_challenge_invites_set_updated_at();

alter table public.ai_music_challenge_invites enable row level security;

grant select on table public.ai_music_challenge_invites to authenticated;
grant insert, update, delete on table public.ai_music_challenge_invites to service_role;

drop policy if exists ai_music_challenge_invites_read_own on public.ai_music_challenge_invites;
create policy ai_music_challenge_invites_read_own
on public.ai_music_challenge_invites
for select
to authenticated
using (defender_user_id = auth.uid() or challenger_user_id = auth.uid());

drop policy if exists ai_music_challenge_invites_service_manage on public.ai_music_challenge_invites;
create policy ai_music_challenge_invites_service_manage
on public.ai_music_challenge_invites
for all
to service_role
using (true)
with check (true);

alter table public.battles drop constraint if exists battles_status_check;
alter table public.battles
  add constraint battles_status_check
  check (
    status in (
      'pending',
      'live',
      'finished',
      'cancelled',
      'active',
      'completed',
      'expired',
      'ghost_battle',
      'public_voting',
      'cancelled_no_challenger',
      'cancelled_founder'
    )
  );

alter table public.battles drop constraint if exists battles_battle_type_check;
alter table public.battles
  add constraint battles_battle_type_check
  check (battle_type in ('formal', 'ghost_battle', 'public_voting', 'ai_music_challenge'));

create index if not exists battles_ai_music_challenge_pending_idx
on public.battles (battle_type, status, scheduled_start_at, created_at desc)
where battle_type = 'ai_music_challenge';

create or replace function public.cast_vote(
  p_battle_id uuid,
  p_voted_for text default null
)
returns public.battle_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_vote public.battle_votes%rowtype;
  battle_row public.battles%rowtype;
  current_balance integer := 0;
  resolved_start timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_voted_for not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid vote target';
  end if;

  select *
  into battle_row
  from public.battles
  where id = p_battle_id;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.winner is not null
    or battle_row.status in ('finished', 'cancelled', 'cancelled_no_challenger', 'cancelled_founder', 'completed', 'expired')
    or battle_row.battle_ended_at is not null then
    raise exception 'Battle already settled';
  end if;

  if battle_row.status = 'pending' then
    raise exception 'Voting is not open while waiting for defender acceptance';
  end if;

  resolved_start := coalesce(battle_row.battle_started_at, battle_row.started_at, battle_row.scheduled_start_at);
  if battle_row.status = 'active'
    and resolved_start is not null
    and resolved_start > now() then
    raise exception 'Voting is not open yet';
  end if;

  if auth.uid() in (battle_row.fighter_a_user_id, battle_row.fighter_b_user_id) then
    raise exception 'Fighters cannot vote in their own Battle';
  end if;

  select *
  into existing_vote
  from public.battle_votes
  where battle_id = p_battle_id
    and user_id = auth.uid()
  for update;

  if existing_vote.id is not null then
    update public.battle_votes
    set voted_for = p_voted_for
    where id = existing_vote.id
    returning * into existing_vote;
    return existing_vote;
  end if;

  select coalesce(apc_balance, 0)
  into current_balance
  from public.user_profiles
  where id = auth.uid()
  for update;

  if current_balance < 50 then
    raise exception 'APC 不足 50，請先去 傷心酒吧 Bar Heartbreak 放歌或每日登入累積點數。';
  end if;

  perform public.award_battle_points(auth.uid(), -50, 'audience_vote_stake', null, p_battle_id, '觀眾投票下注');

  insert into public.battle_votes (battle_id, user_id, voted_for, voter_role, stake_apc)
  values (p_battle_id, auth.uid(), p_voted_for, 'audience', 50)
  returning * into existing_vote;

  return existing_vote;
end;
$$;

revoke all on function public.cast_vote(uuid, text) from public;
grant execute on function public.cast_vote(uuid, text) to authenticated;
