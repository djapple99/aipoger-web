-- AIPOGER：AI Music Hook Battle 非同步配對 / Battle Pool
-- Supabase CLI 未安裝時，請在 Dashboard SQL Editor 執行本檔。
-- 可重複執行；會保留既有 battle_queue / battles 資料。

-- ============================================================
-- 0. user_profiles：配對等級與 APC 欄位保底
-- ============================================================
alter table public.user_profiles
  add column if not exists apc_balance integer not null default 3000,
  add column if not exists level integer not null default 1,
  add column if not exists total_wins integer not null default 0,
  add column if not exists total_losses integer not null default 0;

create or replace function public.calculate_user_level(wins integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(wins, 0) >= 250 then 10
    when coalesce(wins, 0) >= 200 then 9
    when coalesce(wins, 0) >= 150 then 8
    when coalesce(wins, 0) >= 100 then 7
    when coalesce(wins, 0) >= 80 then 6
    when coalesce(wins, 0) >= 60 then 5
    when coalesce(wins, 0) >= 40 then 4
    when coalesce(wins, 0) >= 20 then 3
    when coalesce(wins, 0) >= 10 then 2
    else 1
  end;
$$;

create or replace function public.battle_stake_for_level(lv integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(lv, 1) >= 8 then 500
    when coalesce(lv, 1) >= 4 then 300
    else 200
end;
$$;

revoke all on function public.battle_stake_for_level(integer) from public;
grant execute on function public.battle_stake_for_level(integer) to authenticated;

create or replace function public.get_level_info(lv integer)
returns jsonb
language sql
stable
as $$
  select case greatest(1, least(10, coalesce(lv, 1)))
    when 1 then '{"name_cn":"訊號啟動者","name_en":"Signal Starter","stage":1,"stage_cn":"音樂工匠","stage_en":"Music Artisan","stake_apc":200,"min_wins":0}'::jsonb
    when 2 then '{"name_cn":"旋律達人","name_en":"Melody Crafter","stage":1,"stage_cn":"音樂工匠","stage_en":"Music Artisan","stake_apc":200,"min_wins":10}'::jsonb
    when 3 then '{"name_cn":"詞曲鬼匠","name_en":"Lyric Ghost","stage":1,"stage_cn":"音樂工匠","stage_en":"Music Artisan","stake_apc":200,"min_wins":20}'::jsonb
    when 4 then '{"name_cn":"流行領航員","name_en":"Pop Navigator","stage":2,"stage_cn":"推薦創作者","stage_en":"Featured Creator","stake_apc":300,"min_wins":40,"perk_cn":"推薦歌曲與 prompt 販售資格"}'::jsonb
    when 5 then '{"name_cn":"優美旋律之王","name_en":"Melody Monarch","stage":2,"stage_cn":"推薦創作者","stage_en":"Featured Creator","stake_apc":300,"min_wins":60,"perk_cn":"推薦歌曲與 prompt 販售資格"}'::jsonb
    when 6 then '{"name_cn":"超狂動感領航員","name_en":"Rhythm Pilot","stage":2,"stage_cn":"推薦創作者","stage_en":"Featured Creator","stake_apc":300,"min_wins":80,"perk_cn":"推薦歌曲與 prompt 販售資格"}'::jsonb
    when 7 then '{"name_cn":"魔幻聲空雕塑家","name_en":"Sonic Sculptor","stage":2,"stage_cn":"推薦創作者","stage_en":"Featured Creator","stake_apc":300,"min_wins":100,"perk_cn":"推薦歌曲與 prompt 販售資格"}'::jsonb
    when 8 then '{"name_cn":"百大 DJ 泰坦","name_en":"Top 100 Titan","stage":3,"stage_cn":"殿堂級大師","stage_en":"Hall Master","stake_apc":500,"min_wins":150,"perk_cn":"頁面空間與推薦歌曲 prompt 販售資格"}'::jsonb
    when 9 then '{"name_cn":"靈性薩滿法老王","name_en":"Spirit Pharaoh","stage":3,"stage_cn":"殿堂級大師","stage_en":"Hall Master","stake_apc":500,"min_wins":200,"perk_cn":"頁面空間與推薦歌曲 prompt 販售資格"}'::jsonb
    else '{"name_cn":"交響樂之教皇","name_en":"Symphony Pope","stage":3,"stage_cn":"殿堂級大師","stage_en":"Hall Master","stake_apc":500,"min_wins":250,"perk_cn":"頁面空間與推薦歌曲 prompt 販售資格"}'::jsonb
  end;
$$;

revoke all on function public.get_level_info(integer) from public;
grant execute on function public.get_level_info(integer) to authenticated;

-- ============================================================
-- 1. battle_queue：新增非同步狀態與排程欄位
-- ============================================================
alter table public.battle_queue
  add column if not exists challenge_target_queue_id uuid references public.battle_queue(id) on delete set null,
  add column if not exists search_deadline_at timestamptz not null default (now() + interval '30 seconds'),
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours'),
  add column if not exists matched_at timestamptz,
  add column if not exists fallback_kind text,
  add column if not exists public_vote_score integer,
  add column if not exists cooldown_until timestamptz,
  add column if not exists ai_tool text,
  add column if not exists lyrics text;

alter table public.battle_queue drop constraint if exists battle_queue_status_check;
alter table public.battle_queue
  add constraint battle_queue_status_check
  check (
    status in (
      'searching',
      'waiting',
      'waiting_challenge',
      'matched',
      'active',
      'completed',
      'expired',
      'ghost_battle',
      'public_voting',
      'cancelled'
    )
  );

alter table public.battle_queue drop constraint if exists battle_queue_fallback_kind_check;
alter table public.battle_queue
  add constraint battle_queue_fallback_kind_check
  check (fallback_kind is null or fallback_kind in ('ghost_battle', 'public_voting'));

create index if not exists battle_queue_pool_idx
on public.battle_queue (status, genre, created_at);

create index if not exists battle_queue_expiry_idx
on public.battle_queue (status, expires_at);

-- 公開挑戰池需要被登入使用者讀取；自己的列仍可完整讀取。
drop policy if exists "authenticated can read open battle pool" on public.battle_queue;
create policy "authenticated can read open battle pool"
on public.battle_queue
for select
to authenticated
using (
  auth.uid() = user_id
  or status in ('waiting_challenge', 'public_voting', 'ghost_battle')
);

-- ============================================================
-- 2. battles：保留 live 相容舊前端，同時標記 battle_type
-- ============================================================
alter table public.battles
  add column if not exists battle_type text not null default 'formal',
  add column if not exists is_async_match boolean not null default false,
  add column if not exists ai_tool_a text,
  add column if not exists ai_tool_b text,
  add column if not exists song_a_cover text,
  add column if not exists song_b_cover text,
  add column if not exists fighter_a_avatar text,
  add column if not exists fighter_b_avatar text,
  add column if not exists lyrics_a text,
  add column if not exists lyrics_b text,
  add column if not exists started_at timestamptz default now(),
  add column if not exists winner text,
  add column if not exists stake_apc integer not null default 200,
  add column if not exists pot_apc integer not null default 400,
  add column if not exists vote_stake_apc integer not null default 50;

alter table public.battles drop constraint if exists battles_status_check;
alter table public.battles
  add constraint battles_status_check
  check (status in ('live', 'finished', 'cancelled', 'active', 'completed', 'expired', 'ghost_battle', 'public_voting'));

alter table public.battles drop constraint if exists battles_battle_type_check;
alter table public.battles
  add constraint battles_battle_type_check
  check (battle_type in ('formal', 'ghost_battle', 'public_voting'));

alter table public.battles drop constraint if exists battles_winner_check;
alter table public.battles
  add constraint battles_winner_check
  check (winner is null or winner in ('fighter_a', 'fighter_b'));

create index if not exists battles_type_status_idx
on public.battles (battle_type, status, created_at desc);

alter table if exists public.battle_votes
  add column if not exists stake_apc integer not null default 50,
  add column if not exists settled_at timestamptz;

-- ============================================================
-- 3. 通知與點數事件
-- ============================================================
create table if not exists public.battle_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_id uuid references public.battle_queue(id) on delete cascade,
  battle_id uuid references public.battles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.battle_notifications enable row level security;

drop policy if exists "users can read own battle notifications" on public.battle_notifications;
create policy "users can read own battle notifications"
on public.battle_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can mark own battle notifications read" on public.battle_notifications;
create policy "users can mark own battle notifications read"
on public.battle_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "service can manage battle notifications" on public.battle_notifications;
create policy "service can manage battle notifications"
on public.battle_notifications
for all
to service_role
using (true)
with check (true);

create index if not exists battle_notifications_user_created_idx
on public.battle_notifications (user_id, created_at desc);

create table if not exists public.battle_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_id uuid references public.battle_queue(id) on delete set null,
  battle_id uuid references public.battles(id) on delete set null,
  event_type text not null,
  points integer not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.battle_point_events enable row level security;

drop policy if exists "users can read own battle point events" on public.battle_point_events;
create policy "users can read own battle point events"
on public.battle_point_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "service can manage battle point events" on public.battle_point_events;
create policy "service can manage battle point events"
on public.battle_point_events
for all
to service_role
using (true)
with check (true);

create index if not exists battle_point_events_user_created_idx
on public.battle_point_events (user_id, created_at desc);

create table if not exists public.public_voting_bets (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.battle_queue(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prediction text not null check (prediction in ('support', 'pass')),
  stake_apc integer not null default 50,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint one_public_voting_bet_per_user unique (queue_id, user_id)
);

alter table public.public_voting_bets enable row level security;

drop policy if exists "users can read public voting bets" on public.public_voting_bets;
create policy "users can read public voting bets"
on public.public_voting_bets
for select
to authenticated
using (true);

drop policy if exists "users can insert own public voting bets" on public.public_voting_bets;
create policy "users can insert own public voting bets"
on public.public_voting_bets
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists public_voting_bets_queue_idx
on public.public_voting_bets (queue_id, prediction);

-- ============================================================
-- 4. 共用函式：通知與點數
-- ============================================================
create or replace function public.create_battle_notification(
  p_user_id uuid,
  p_queue_id uuid,
  p_battle_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
begin
  insert into public.battle_notifications (user_id, queue_id, battle_id, type, title, body, metadata)
  values (p_user_id, p_queue_id, p_battle_id, p_type, p_title, p_body, coalesce(p_metadata, '{}'::jsonb))
  returning id into nid;

  return nid;
end;
$$;

revoke all on function public.create_battle_notification(uuid, uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.create_battle_notification(uuid, uuid, uuid, text, text, text, jsonb) to service_role;

create or replace function public.award_battle_points(
  p_user_id uuid,
  p_points integer,
  p_event_type text,
  p_queue_id uuid default null,
  p_battle_id uuid default null,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance integer;
begin
  insert into public.user_profiles (id, apc_balance)
  values (p_user_id, greatest(0, 3000 + p_points))
  on conflict (id) do update
  set apc_balance = greatest(0, public.user_profiles.apc_balance + p_points)
  returning apc_balance into next_balance;

  insert into public.battle_point_events (user_id, queue_id, battle_id, event_type, points, reason)
  values (p_user_id, p_queue_id, p_battle_id, p_event_type, p_points, p_reason);

  return next_balance;
end;
$$;

revoke all on function public.award_battle_points(uuid, integer, text, uuid, uuid, text) from public;
grant execute on function public.award_battle_points(uuid, integer, text, uuid, uuid, text) to service_role;

create or replace function public.place_public_voting_bet(
  p_queue_id uuid,
  p_prediction text
)
returns public.public_voting_bets
language plpgsql
security definer
set search_path = public
as $$
declare
  queue_row public.battle_queue%rowtype;
  existing_bet public.public_voting_bets%rowtype;
  current_balance integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_prediction not in ('support', 'pass') then
    raise exception 'Invalid public voting prediction';
  end if;

  select *
  into queue_row
  from public.battle_queue
  where id = p_queue_id;

  if queue_row.id is null or queue_row.status <> 'public_voting' then
    raise exception 'Public Voting entry not found';
  end if;

  if queue_row.user_id = auth.uid() then
    raise exception 'Creator cannot bet on their own Public Voting entry';
  end if;

  select *
  into existing_bet
  from public.public_voting_bets
  where queue_id = p_queue_id
    and user_id = auth.uid()
  for update;

  if existing_bet.id is not null then
    raise exception '你已經下注過了，每個 Public Voting 作品只有一次下注機會。';
  end if;

  select coalesce(apc_balance, 0)
  into current_balance
  from public.user_profiles
  where id = auth.uid()
  for update;

  if current_balance < 50 then
    raise exception 'APC 不足 50，請先去 傷心酒吧 Bar Heartbreak 放歌或每日登入累積點數。';
  end if;

  perform public.award_battle_points(auth.uid(), -50, 'public_voting_bet_stake', p_queue_id, null, 'Public Voting 下注');

  insert into public.public_voting_bets (queue_id, user_id, prediction, stake_apc)
  values (p_queue_id, auth.uid(), p_prediction, 50)
  returning * into existing_bet;

  return existing_bet;
end;
$$;

revoke all on function public.place_public_voting_bet(uuid, text) from public;
grant execute on function public.place_public_voting_bet(uuid, text) to authenticated;

-- ============================================================
-- 5. 即時配對：支援指定挑戰與等待池挑戰
-- ============================================================
create or replace function public.attempt_matchmaking(
  p_queue_id uuid,
  p_target_queue_id uuid default null
)
returns public.battle_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  me_row public.battle_queue%rowtype;
  opponent_row public.battle_queue%rowtype;
  battle_row public.battles%rowtype;
  me_level integer := 1;
  me_balance integer := 0;
  opponent_level integer := 1;
  opponent_balance integer := 0;
  battle_stake integer := 0;
  battle_pot integer := 0;
  battle_scheduled_start_at timestamptz;
  battle_cancellation_evaluation_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into me_row
  from public.battle_queue
  where id = p_queue_id
    and user_id = auth.uid()
  for update;

  if me_row.id is null then
    raise exception 'Queue row not found';
  end if;

  if me_row.status not in ('searching', 'waiting', 'waiting_challenge') then
    return me_row;
  end if;

  select coalesce(level, 1)
  into me_level
  from public.user_profiles
  where id = me_row.user_id;

  -- Public beta: APC never blocks Battle entry. APC is retained for rewards/status only.
  me_balance := 0;
  battle_stake := 0;
  battle_pot := 0;

  select q.*
  into opponent_row
  from public.battle_queue q
  left join public.user_profiles op on op.id = q.user_id
  where q.status in ('searching', 'waiting', 'waiting_challenge')
    and q.user_id <> me_row.user_id
    and q.id <> me_row.id
    and q.genre = me_row.genre
    and abs(coalesce(op.level, 1) - coalesce(me_level, 1)) <= 2
    and (
      (p_target_queue_id is not null and q.id = p_target_queue_id)
      or p_target_queue_id is null
    )
  order by
    case when q.status = 'waiting_challenge' then 0 else 1 end,
    q.created_at asc
  for update of q skip locked
  limit 1;

  if opponent_row.id is null then
    return me_row;
  end if;

  select coalesce(level, 1), coalesce(apc_balance, 0)
  into opponent_level, opponent_balance
  from public.user_profiles
  where id = opponent_row.user_id
  for update;

  battle_stake := 0;
  battle_pot := 0;
  battle_scheduled_start_at := case
    when p_target_queue_id is not null then opponent_row.scheduled_start_at
    when me_row.status = 'waiting_challenge' then me_row.scheduled_start_at
    when opponent_row.status = 'waiting_challenge' then opponent_row.scheduled_start_at
    else greatest(me_row.scheduled_start_at, opponent_row.scheduled_start_at)
  end;
  battle_cancellation_evaluation_at := case
    when battle_scheduled_start_at is null then null
    else coalesce(
      case
        when p_target_queue_id is not null then opponent_row.cancellation_evaluation_at
        when me_row.status = 'waiting_challenge' then me_row.cancellation_evaluation_at
        when opponent_row.status = 'waiting_challenge' then opponent_row.cancellation_evaluation_at
        else null
      end,
      battle_scheduled_start_at + interval '1 minute'
    )
  end;

  insert into public.battles (
    queue_a_id,
    queue_b_id,
    fighter_a_user_id,
    fighter_b_user_id,
    fighter_a_name,
    fighter_b_name,
    song_a_name,
    song_b_name,
    audio_a_path,
    audio_b_path,
    genre,
    status,
    battle_type,
    is_async_match,
    ai_tool_a,
    ai_tool_b,
    lyrics_a,
    lyrics_b,
    started_at,
    scheduled_start_at,
    cancellation_evaluation_at,
    stake_apc,
    pot_apc,
    vote_stake_apc
  )
  values (
    me_row.id,
    opponent_row.id,
    me_row.user_id,
    opponent_row.user_id,
    me_row.fighter_name,
    opponent_row.fighter_name,
    me_row.original_file_name,
    opponent_row.original_file_name,
    me_row.audio_path,
    opponent_row.audio_path,
    me_row.genre,
    'live',
    'formal',
    true,
    nullif(trim(me_row.ai_tool), ''),
    nullif(trim(opponent_row.ai_tool), ''),
    nullif(trim(me_row.lyrics), ''),
    nullif(trim(opponent_row.lyrics), ''),
    now(),
    battle_scheduled_start_at,
    battle_cancellation_evaluation_at,
    battle_stake,
    battle_pot,
    50
  )
  returning * into battle_row;

  -- Public beta: no fighter entry stake deduction.

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = opponent_row.user_id,
    match_group_id = battle_row.id,
    matched_at = now()
  where id = me_row.id;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = me_row.user_id,
    match_group_id = battle_row.id,
    matched_at = now()
  where id = opponent_row.id;

  perform public.create_battle_notification(
    me_row.user_id,
    me_row.id,
    battle_row.id,
    'battle_matched',
    '有人接受你的 Hook Battle',
    '有人接受你的 Hook Battle！請在期限內回來確認參戰。',
    jsonb_build_object('opponentName', opponent_row.fighter_name, 'stakeApc', battle_stake, 'potApc', battle_pot)
  );

  perform public.create_battle_notification(
    opponent_row.user_id,
    opponent_row.id,
    battle_row.id,
    'battle_matched',
    '有人接受你的 Hook Battle',
    '有人接受你的 Hook Battle！請在期限內回來確認參戰。',
    jsonb_build_object('opponentName', me_row.fighter_name, 'stakeApc', battle_stake, 'potApc', battle_pot)
  );

  select *
  into me_row
  from public.battle_queue
  where id = p_queue_id;

  return me_row;
end;
$$;

revoke all on function public.attempt_matchmaking(uuid, uuid) from public;
grant execute on function public.attempt_matchmaking(uuid, uuid) to authenticated;

-- Backward-compatible one-argument RPC for older clients.
create or replace function public.attempt_matchmaking(p_queue_id uuid)
returns public.battle_queue
language sql
security definer
set search_path = public
as $$
  select public.attempt_matchmaking(p_queue_id, null::uuid);
$$;

revoke all on function public.attempt_matchmaking(uuid) from public;
grant execute on function public.attempt_matchmaking(uuid) to authenticated;

-- ============================================================
-- 6. 30 秒後轉入等待挑戰池
-- ============================================================
create or replace function public.move_entry_to_waiting_challenge(p_queue_id uuid)
returns public.battle_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.battle_queue%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.battle_queue
  set
    status = 'waiting_challenge',
    search_deadline_at = coalesce(search_deadline_at, now()),
    expires_at = coalesce(expires_at, created_at + interval '24 hours'),
    updated_at = now()
  where id = p_queue_id
    and user_id = auth.uid()
    and status in ('searching', 'waiting')
  returning * into row_out;

  if row_out.id is null then
    select * into row_out from public.battle_queue where id = p_queue_id and user_id = auth.uid();
  end if;

  return row_out;
end;
$$;

revoke all on function public.move_entry_to_waiting_challenge(uuid) from public;
grant execute on function public.move_entry_to_waiting_challenge(uuid) to authenticated;

create or replace function public.cancel_battle_entry(p_queue_id uuid)
returns public.battle_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.battle_queue%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.battle_queue
  set
    status = 'cancelled',
    cooldown_until = now() + interval '10 minutes',
    updated_at = now()
  where id = p_queue_id
    and user_id = auth.uid()
    and status in ('searching', 'waiting', 'waiting_challenge')
  returning * into row_out;

  if row_out.id is not null then
    perform public.award_battle_points(row_out.user_id, -50, 'battle_abandoned', row_out.id, null, '中途取消');
  end if;

  return row_out;
end;
$$;

revoke all on function public.cancel_battle_entry(uuid) from public;
grant execute on function public.cancel_battle_entry(uuid) to authenticated;

-- ============================================================
-- 7. 24 小時 fallback：Ghost Battle 或 Public Voting
-- ============================================================
create or replace function public.award_public_voting_points(p_queue_id uuid, p_score integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.battle_queue%rowtype;
  reward integer;
begin
  select * into q from public.battle_queue where id = p_queue_id for update;
  if q.id is null then
    raise exception 'Queue row not found';
  end if;

  reward := greatest(5, least(30, coalesce(p_score, 5)));

  update public.battle_queue
  set public_vote_score = reward, updated_at = now()
  where id = p_queue_id;

  perform public.award_battle_points(q.user_id, reward, 'public_voting_reward', q.id, null, '公開評分獎勵');

  return reward;
end;
$$;

revoke all on function public.award_public_voting_points(uuid, integer) from public;
grant execute on function public.award_public_voting_points(uuid, integer) to service_role;

create or replace function public.process_battle_pool_fallbacks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.battle_queue%rowtype;
  ghost public.battle_queue%rowtype;
  bid uuid;
  processed integer := 0;
begin
	for entry in
	  select *
	  from public.battle_queue
	  where status = 'waiting_challenge'
	    and coalesce(
	      cancellation_evaluation_at,
	      scheduled_start_at + interval '1 minute',
	      expires_at
	    ) <= now()
	  order by coalesce(
	    cancellation_evaluation_at,
	    scheduled_start_at + interval '1 minute',
	    expires_at
	  ) asc
	  for update skip locked
	loop
    select q.*
    into ghost
    from public.battle_queue q
    left join public.user_profiles ep on ep.id = entry.user_id
    left join public.user_profiles gp on gp.id = q.user_id
    where q.user_id <> entry.user_id
      and q.id <> entry.id
      and q.audio_path is not null
      and q.status in ('matched', 'completed', 'ghost_battle', 'public_voting')
      and q.genre = entry.genre
      and abs(coalesce(gp.level, 1) - coalesce(ep.level, 1)) <= 2
    order by q.created_at desc
    limit 1;

    if ghost.id is not null then
      insert into public.battles (
        queue_a_id,
        queue_b_id,
        fighter_a_user_id,
        fighter_b_user_id,
        fighter_a_name,
        fighter_b_name,
        song_a_name,
        song_b_name,
        audio_a_path,
        audio_b_path,
        genre,
        status,
        battle_type,
        is_async_match,
        ai_tool_a,
        ai_tool_b,
        lyrics_a,
        lyrics_b,
        started_at,
        scheduled_start_at,
        cancellation_evaluation_at
      )
      values (
        entry.id,
        ghost.id,
        entry.user_id,
        ghost.user_id,
        entry.fighter_name,
        ghost.fighter_name,
        entry.original_file_name,
        ghost.original_file_name,
        entry.audio_path,
        ghost.audio_path,
        entry.genre,
        'live',
        'ghost_battle',
        true,
        nullif(trim(entry.ai_tool), ''),
        nullif(trim(ghost.ai_tool), ''),
	        nullif(trim(entry.lyrics), ''),
	        nullif(trim(ghost.lyrics), ''),
	        now(),
	        coalesce(
	          entry.scheduled_start_at,
	          entry.cancellation_evaluation_at - interval '1 minute',
	          entry.expires_at
	        ),
	        coalesce(
	          entry.cancellation_evaluation_at,
	          coalesce(
	            entry.scheduled_start_at,
	            entry.expires_at
	          ) + interval '1 minute'
	        )
	      )
      returning id into bid;

      update public.battle_queue
      set
        status = 'ghost_battle',
        fallback_kind = 'ghost_battle',
        match_group_id = bid,
        opponent_user_id = ghost.user_id,
        updated_at = now()
      where id = entry.id;

      perform public.create_battle_notification(
        entry.user_id,
        entry.id,
	        bid,
	        'battle_fallback_ghost',
	        '已轉入 Ghost Battle',
	        '等待時間結束仍無人挑戰，系統已將你的作品轉入 Ghost Battle',
	        jsonb_build_object('opponentName', ghost.fighter_name)
	      );
    else
      update public.battle_queue
      set
        status = 'public_voting',
        fallback_kind = 'public_voting',
        public_vote_score = 5,
        updated_at = now()
      where id = entry.id;

      perform public.award_battle_points(entry.user_id, 5, 'public_voting_reward', entry.id, null, '無人挑戰轉公開評分');

      perform public.create_battle_notification(
        entry.user_id,
        entry.id,
	        null,
	        'battle_fallback_public_voting',
	        '已轉入 Public Voting',
	        '等待時間結束仍無人挑戰，系統已將你的作品轉入 Public Voting',
	        '{}'::jsonb
	      );
    end if;

    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

revoke all on function public.process_battle_pool_fallbacks() from public;
grant execute on function public.process_battle_pool_fallbacks() to service_role;

-- ============================================================
-- 8. 結算戰鬥：正式 Battle 依新點數規則發獎
-- ============================================================
create or replace function public.settle_battle(p_battle_id uuid, p_winner text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
  winner_id uuid;
  loser_id uuid;
  voter_row record;
begin
  if p_winner not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid winner';
  end if;

  select * into battle_row from public.battles where id = p_battle_id for update;
  if not found then
    raise exception 'Battle not found';
  end if;

  if battle_row.winner is not null or battle_row.status = 'finished' then
    raise exception 'Battle already settled';
  end if;

  update public.battles
  set winner = p_winner, status = 'finished', updated_at = now()
  where id = p_battle_id;

  if p_winner = 'fighter_a' then
    winner_id := battle_row.fighter_a_user_id;
    loser_id := battle_row.fighter_b_user_id;
  else
    winner_id := battle_row.fighter_b_user_id;
    loser_id := battle_row.fighter_a_user_id;
  end if;

  perform public.award_battle_points(winner_id, coalesce(battle_row.pot_apc, 400), 'battle_pot_win', null, p_battle_id, 'Battle 勝利取得獎池');

  for voter_row in
    select user_id
    from public.battle_votes
    where battle_id = p_battle_id
      and voter_role = 'audience'
      and voted_for = p_winner
  loop
    perform public.award_battle_points(voter_row.user_id, 100, 'audience_vote_win', null, p_battle_id, '投票命中返還本金並獲利');
  end loop;

  update public.battle_votes
  set settled_at = now()
  where battle_id = p_battle_id
    and settled_at is null;

  update public.user_profiles
  set
    total_wins = total_wins + 1,
    level = public.calculate_user_level(total_wins + 1)
  where id = winner_id;

  update public.user_profiles
  set
    total_losses = total_losses + 1,
    level = public.calculate_user_level(total_wins)
  where id = loser_id;
end;
$$;

revoke all on function public.settle_battle(uuid, text) from public;
grant execute on function public.settle_battle(uuid, text) to service_role;

-- ============================================================
-- 9. Realtime publication
-- ============================================================
do $pub$
begin
  alter publication supabase_realtime add table public.battle_queue;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'publication supabase_realtime missing; enable Realtime in Dashboard';
end
$pub$;

do $pub$
begin
  alter publication supabase_realtime add table public.battle_notifications;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'publication supabase_realtime missing; enable Realtime in Dashboard';
end
$pub$;
