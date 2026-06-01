-- AIPOGER APC Prediction + Vote Integrity
-- APC is platform points only: no crypto, no cash value, no cash-equivalent language.
-- Design:
--   Waiting Room support = emotional pre-battle pick, fixed max 88 APC.
--   Battle final vote = independent music judgment, support data hidden during battle.
--   Correct final vote reward = +100 APC after winner settlement.

-- 1. Lock support amount to 88 APC.
alter table if exists public.battle_predictions
  drop constraint if exists battle_predictions_stake_apc_check;

alter table if exists public.battle_predictions
  add constraint battle_predictions_stake_apc_check
  check (stake_apc = 88);

comment on table public.battle_predictions is
'Pre-battle APC support/prediction. Platform points only, fixed 88 APC cap, hidden during battle.';

-- 2. Viewer progression titles: music/listener wording.
create or replace function public.viewer_badge_for_xp(p_xp integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_xp, 0) >= 900 then 'Battle Oracle'
    when coalesce(p_xp, 0) >= 420 then 'Trend Hunter'
    when coalesce(p_xp, 0) >= 120 then 'Hook Analyst'
    else 'Rookie Listener'
  end;
$$;

-- 3. Support RPC: only fixed 88 APC, upsert one support per user per battle.
create or replace function public.support_battle_prediction(
  p_battle_id uuid,
  p_side text,
  p_stake_apc integer default 88
)
returns public.battle_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
  existing_row public.battle_predictions%rowtype;
  support_row public.battle_predictions%rowtype;
  current_balance integer := 0;
  old_stake integer := 0;
  delta_stake integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_side not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid support side';
  end if;

  if p_stake_apc <> 88 then
    raise exception 'Support amount is fixed at 88 APC';
  end if;

  select * into battle_row
  from public.battles
  where id = p_battle_id
  for update;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if coalesce(battle_row.status, '') not in ('live', 'waiting_room') then
    raise exception 'Support window is closed';
  end if;

  if battle_row.waiting_room_started_at is not null
    and now() >= battle_row.waiting_room_started_at + interval '90 seconds' then
    raise exception 'Support window is closed';
  end if;

  select *
  into existing_row
  from public.battle_predictions
  where battle_id = p_battle_id
    and user_id = auth.uid()
  for update;

  old_stake := coalesce(existing_row.stake_apc, 0);
  delta_stake := 88 - old_stake;

  if delta_stake > 0 then
    select coalesce(apc_balance, 0)
    into current_balance
    from public.user_profiles
    where id = auth.uid()
    for update;

    if current_balance < delta_stake then
      raise exception 'APC 不足 88，請先透過登入或 傷心酒吧 Bar Heartbreak 累積平台點數。';
    end if;

    perform public.award_battle_points(auth.uid(), -delta_stake, 'prediction_support', null, p_battle_id, '90 秒等待室 APC 支持');
  end if;

  insert into public.battle_predictions (battle_id, user_id, side, stake_apc)
  values (p_battle_id, auth.uid(), p_side, 88)
  on conflict (battle_id, user_id)
  do update set side = excluded.side, stake_apc = 88, updated_at = now()
  returning * into support_row;

  return support_row;
end;
$$;

revoke all on function public.support_battle_prediction(uuid, text, integer) from public;
grant execute on function public.support_battle_prediction(uuid, text, integer) to authenticated;

-- 4. Final vote: no APC deduction, no stake. Correct final winner vote is rewarded during settlement.
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_voted_for not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid vote target';
  end if;

  select * into battle_row from public.battles where id = p_battle_id;
  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.winner is not null or battle_row.status = 'finished' then
    raise exception 'Battle already settled';
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

  insert into public.battle_votes (battle_id, user_id, voted_for, voter_role, stake_apc)
  values (p_battle_id, auth.uid(), p_voted_for, 'audience', 0)
  returning * into existing_vote;

  return existing_vote;
end;
$$;

revoke all on function public.cast_vote(uuid, text) from public;
grant execute on function public.cast_vote(uuid, text) to authenticated;

-- 5. Correct final vote reward helper for settlement functions.
-- Add this loop to custom settlement functions if needed:
--   for voter_row in
--     select user_id from public.battle_votes
--     where battle_id = p_battle_id and voter_role = 'audience' and voted_for = p_winner
--   loop
--     perform public.award_battle_points(voter_row.user_id, 100, 'correct_final_vote_reward', null, p_battle_id, 'Final vote music judgment reward');
--   end loop;
