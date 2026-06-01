-- AIPOGER 90 Second Battle System
-- Run in Supabase SQL Editor after the existing battle_queue / battles / chat_and_votes files.
-- This adds waiting room timing, APC prediction/support, viewer XP, and Realtime publication.

-- ============================================================
-- 1. Battle lifecycle fields
-- ============================================================
alter table public.battles
  add column if not exists waiting_room_started_at timestamptz not null default now(),
  add column if not exists battle_started_at timestamptz,
  add column if not exists battle_ended_at timestamptz,
  add column if not exists fighter_a_elo integer not null default 1200,
  add column if not exists fighter_b_elo integer not null default 1200,
  add column if not exists fighter_a_elo_delta integer not null default 0,
  add column if not exists fighter_b_elo_delta integer not null default 0,
  add column if not exists viewer_count_peak integer not null default 0,
  add column if not exists prediction_accuracy numeric(5,2) not null default 0;

comment on column public.battles.waiting_room_started_at is '90 second hype waiting room start time';
comment on column public.battles.battle_started_at is 'Set when countdown reaches zero and battle begins';
comment on column public.battles.prediction_accuracy is 'Correct pre-battle predictions divided by all settled predictions, percent';

-- ============================================================
-- 2. Viewer progression
-- ============================================================
create table if not exists public.viewer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  prediction_streak integer not null default 0,
  best_prediction_streak integer not null default 0,
  badge_title text not null default 'Rookie Predictor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.viewer_profiles enable row level security;

drop policy if exists "viewer profiles are readable by authenticated users" on public.viewer_profiles;
create policy "viewer profiles are readable by authenticated users"
on public.viewer_profiles
for select
to authenticated
using (true);

drop policy if exists "users can insert own viewer profile" on public.viewer_profiles;
create policy "users can insert own viewer profile"
on public.viewer_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own viewer profile" on public.viewer_profiles;
create policy "users can update own viewer profile"
on public.viewer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_viewer_profiles_updated_at on public.viewer_profiles;
create trigger set_viewer_profiles_updated_at
before update on public.viewer_profiles
for each row execute function public.set_updated_at();

-- ============================================================
-- 3. APC support / prediction table
-- ============================================================
create table if not exists public.battle_predictions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('fighter_a', 'fighter_b')),
  stake_apc integer not null check (stake_apc in (50, 100, 250)),
  reward_apc integer not null default 0,
  xp_gain integer not null default 0,
  correct boolean,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_prediction_per_user_per_battle unique (battle_id, user_id)
);

alter table public.battle_predictions enable row level security;

drop policy if exists "authenticated users can read battle predictions" on public.battle_predictions;
create policy "authenticated users can read battle predictions"
on public.battle_predictions
for select
to authenticated
using (true);

drop policy if exists "users can insert own battle prediction" on public.battle_predictions;
create policy "users can insert own battle prediction"
on public.battle_predictions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own unsettled battle prediction" on public.battle_predictions;
create policy "users can update own unsettled battle prediction"
on public.battle_predictions
for update
to authenticated
using (auth.uid() = user_id and settled_at is null)
with check (auth.uid() = user_id);

drop trigger if exists set_battle_predictions_updated_at on public.battle_predictions;
create trigger set_battle_predictions_updated_at
before update on public.battle_predictions
for each row execute function public.set_updated_at();

create index if not exists battle_predictions_battle_side_idx
on public.battle_predictions (battle_id, side);

create index if not exists battle_predictions_user_created_idx
on public.battle_predictions (user_id, created_at desc);

-- ============================================================
-- 4. Prediction RPC
-- ============================================================
create or replace function public.viewer_badge_for_xp(p_xp integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_xp, 0) >= 900 then 'Battle Oracle'
    when coalesce(p_xp, 0) >= 420 then 'Elite Scout'
    when coalesce(p_xp, 0) >= 120 then 'Hook Analyst'
    else 'Rookie Predictor'
  end;
$$;

create or replace function public.prediction_reward_for_stake(p_stake integer)
returns integer
language sql
immutable
as $$
  select case p_stake
    when 250 then 400
    when 100 then 160
    else 80
  end;
$$;

create or replace function public.prediction_xp_for_stake(p_stake integer, p_correct boolean)
returns integer
language sql
immutable
as $$
  select case p_stake
    when 250 then 25
    when 100 then 10
    else 5
  end + case when p_correct then 20 else 4 end;
$$;

create or replace function public.support_battle_prediction(
  p_battle_id uuid,
  p_side text,
  p_stake_apc integer
)
returns public.battle_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
  existing_row public.battle_predictions%rowtype;
  prediction_row public.battle_predictions%rowtype;
  current_balance integer := 0;
  old_stake integer := 0;
  delta_stake integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_side not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid prediction side';
  end if;

  if p_stake_apc not in (50, 100, 250) then
    raise exception 'Prediction support must be 50, 100, or 250 APC';
  end if;

  select * into battle_row
  from public.battles
  where id = p_battle_id
  for update;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.status in ('finished', 'cancelled') or battle_row.winner is not null then
    raise exception 'Battle is already closed';
  end if;

  if now() >= coalesce(battle_row.waiting_room_started_at, battle_row.created_at) + interval '90 seconds' then
    raise exception 'Prediction window is closed';
  end if;

  if auth.uid() in (battle_row.fighter_a_user_id, battle_row.fighter_b_user_id) then
    raise exception 'Creators cannot predict their own battle';
  end if;

  insert into public.viewer_profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select *
  into existing_row
  from public.battle_predictions
  where battle_id = p_battle_id and user_id = auth.uid()
  for update;

  old_stake := coalesce(existing_row.stake_apc, 0);
  delta_stake := p_stake_apc - old_stake;

  if delta_stake > 0 then
    select coalesce(apc_balance, 0)
    into current_balance
    from public.user_profiles
    where id = auth.uid()
    for update;

    if current_balance < delta_stake then
      raise exception 'APC 不足，請先去 傷心酒吧 Bar Heartbreak 或每日登入累積點數。';
    end if;

    perform public.award_battle_points(auth.uid(), -delta_stake, 'prediction_support_stake', null, p_battle_id, '90 秒等待室 APC 支持');
  elsif delta_stake < 0 then
    perform public.award_battle_points(auth.uid(), -delta_stake, 'prediction_support_refund', null, p_battle_id, '90 秒等待室改低支持退還 APC');
  end if;

  insert into public.battle_predictions (battle_id, user_id, side, stake_apc)
  values (p_battle_id, auth.uid(), p_side, p_stake_apc)
  on conflict (battle_id, user_id)
  do update set side = excluded.side, stake_apc = excluded.stake_apc, updated_at = now()
  returning * into prediction_row;

  return prediction_row;
end;
$$;

revoke all on function public.support_battle_prediction(uuid, text, integer) from public;
grant execute on function public.support_battle_prediction(uuid, text, integer) to authenticated;

-- ============================================================
-- 5. Lifecycle RPCs
-- ============================================================
create or replace function public.start_90s_battle(p_battle_id uuid)
returns public.battles
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
begin
  select * into battle_row from public.battles where id = p_battle_id for update;
  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  update public.battles
  set battle_started_at = coalesce(battle_started_at, now()), status = 'live', updated_at = now()
  where id = p_battle_id
  returning * into battle_row;

  return battle_row;
end;
$$;

revoke all on function public.start_90s_battle(uuid) from public;
grant execute on function public.start_90s_battle(uuid) to authenticated;

create or replace function public.settle_90s_battle(p_battle_id uuid, p_winner text)
returns public.battles
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
  prediction_row public.battle_predictions%rowtype;
  xp_gain integer;
  reward integer;
  is_correct boolean;
  total_predictions integer := 0;
  correct_predictions integer := 0;
  elo_delta integer := 16;
begin
  if p_winner not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid winner';
  end if;

  select * into battle_row from public.battles where id = p_battle_id for update;
  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.winner is not null or battle_row.status = 'finished' then
    return battle_row;
  end if;

  update public.battles
  set
    winner = p_winner,
    status = 'finished',
    battle_ended_at = now(),
    fighter_a_elo_delta = case when p_winner = 'fighter_a' then elo_delta else -elo_delta end,
    fighter_b_elo_delta = case when p_winner = 'fighter_b' then elo_delta else -elo_delta end,
    updated_at = now()
  where id = p_battle_id
  returning * into battle_row;

  for prediction_row in
    select * from public.battle_predictions
    where battle_id = p_battle_id and settled_at is null
    for update
  loop
    is_correct := prediction_row.side = p_winner;
    xp_gain := public.prediction_xp_for_stake(prediction_row.stake_apc, is_correct);
    reward := case when is_correct then public.prediction_reward_for_stake(prediction_row.stake_apc) else 0 end;

    update public.battle_predictions
    set correct = is_correct, reward_apc = reward, xp_gain = xp_gain, settled_at = now(), updated_at = now()
    where id = prediction_row.id;

    if reward > 0 then
      perform public.award_battle_points(prediction_row.user_id, reward, 'prediction_reward', null, p_battle_id, '90 秒 Battle 預測命中獎勵');
    end if;

    insert into public.viewer_profiles (user_id, xp, prediction_streak, best_prediction_streak, badge_title)
    values (
      prediction_row.user_id,
      xp_gain,
      case when is_correct then 1 else 0 end,
      case when is_correct then 1 else 0 end,
      public.viewer_badge_for_xp(xp_gain)
    )
    on conflict (user_id) do update
    set
      xp = public.viewer_profiles.xp + excluded.xp,
      prediction_streak = case when is_correct then public.viewer_profiles.prediction_streak + 1 else 0 end,
      best_prediction_streak = greatest(
        public.viewer_profiles.best_prediction_streak,
        case when is_correct then public.viewer_profiles.prediction_streak + 1 else 0 end
      ),
      badge_title = public.viewer_badge_for_xp(public.viewer_profiles.xp + excluded.xp),
      updated_at = now();
  end loop;

  select count(*), count(*) filter (where correct is true)
  into total_predictions, correct_predictions
  from public.battle_predictions
  where battle_id = p_battle_id and settled_at is not null;

  if total_predictions > 0 then
    update public.battles
    set prediction_accuracy = round((correct_predictions::numeric / total_predictions::numeric) * 100, 2)
    where id = p_battle_id
    returning * into battle_row;
  end if;

  return battle_row;
end;
$$;

revoke all on function public.settle_90s_battle(uuid, text) from public;
grant execute on function public.settle_90s_battle(uuid, text) to authenticated;

-- ============================================================
-- 6. Realtime publication
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.battles;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.battle_votes;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.battle_predictions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
