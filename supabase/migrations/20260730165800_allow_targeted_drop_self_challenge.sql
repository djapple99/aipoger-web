-- Production migration 20260730165800: allow a creator to intentionally compare two own Drops by targeting their
-- existing open card. Automatic matchmaking must continue to exclude self.

alter table public.battles
  drop constraint if exists battles_distinct_fighters;

alter table public.battles
  drop constraint if exists battles_distinct_queues;

alter table public.battles
  add constraint battles_distinct_queues
  check (
    queue_a_id is null
    or queue_b_id is null
    or queue_a_id <> queue_b_id
  );

comment on constraint battles_distinct_queues on public.battles is
  'A battle must use two different queue entries. Same-user self challenge is allowed only when the creator intentionally targets another own Drop queue.';

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
  opponent_level integer := 1;
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

  if me_row.match_group_id is not null then
    return me_row;
  end if;

  if me_row.status not in ('searching', 'waiting', 'waiting_challenge') then
    return me_row;
  end if;

  select coalesce(level, 1)
  into me_level
  from public.user_profiles
  where id = me_row.user_id;

  select q.*
  into opponent_row
  from public.battle_queue q
  left join public.user_profiles op on op.id = q.user_id
  where q.status in ('searching', 'waiting', 'waiting_challenge')
    and q.match_group_id is null
    and (p_target_queue_id is not null or q.user_id <> me_row.user_id)
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

  select coalesce(level, 1)
  into opponent_level
  from public.user_profiles
  where id = opponent_row.user_id
  for update;

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
        when me_row.scheduled_start_at = battle_scheduled_start_at then me_row.cancellation_evaluation_at
        when opponent_row.scheduled_start_at = battle_scheduled_start_at then opponent_row.cancellation_evaluation_at
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
    case when battle_scheduled_start_at is not null and battle_scheduled_start_at > now() then 'active' else 'live' end,
    'formal',
    true,
    nullif(trim(me_row.ai_tool), ''),
    nullif(trim(opponent_row.ai_tool), ''),
    nullif(trim(me_row.lyrics), ''),
    nullif(trim(opponent_row.lyrics), ''),
    coalesce(battle_scheduled_start_at, now()),
    battle_scheduled_start_at,
    battle_cancellation_evaluation_at,
    battle_stake,
    battle_pot,
    50
  )
  returning * into battle_row;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = opponent_row.user_id,
    match_group_id = battle_row.id,
    matched_at = now()
  where id = me_row.id
    and match_group_id is null;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = me_row.user_id,
    match_group_id = battle_row.id,
    matched_at = now()
  where id = opponent_row.id
    and match_group_id is null;

  perform public.create_battle_notification(
    me_row.user_id,
    me_row.id,
    battle_row.id,
    'battle_matched',
    '找到對手了',
    '找到對手了！公測期免 APC 入場，請回來確認參戰。',
    jsonb_build_object('opponentName', opponent_row.fighter_name, 'stakeApc', battle_stake, 'potApc', battle_pot)
  );

  perform public.create_battle_notification(
    opponent_row.user_id,
    opponent_row.id,
    battle_row.id,
    'battle_matched',
    '找到對手了',
    '找到對手了！公測期免 APC 入場，請回來確認參戰。',
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
