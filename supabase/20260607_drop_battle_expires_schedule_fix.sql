-- AIPOGER Drop Battle schedule cleanup.
-- Safe to run more than once.
--
-- expires_at is only a cleanup/expiry deadline. It must not be promoted into
-- battles.scheduled_start_at. Battle start time may only come from
-- scheduled_start_at or cancellation_evaluation_at.

alter table public.battle_queue
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz;

alter table public.battles
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz;

create or replace function public.copy_queue_schedule_to_battle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_row record;
begin
  if new.scheduled_start_at is not null and new.cancellation_evaluation_at is not null then
    return new;
  end if;

  select
    q.scheduled_start_at,
    q.cancellation_evaluation_at
  into source_row
  from public.battle_queue q
  where q.id in (new.queue_a_id, new.queue_b_id)
    and (q.scheduled_start_at is not null or q.cancellation_evaluation_at is not null)
  order by
    case when q.status = 'waiting_challenge' then 0 else 1 end,
    q.scheduled_start_at desc nulls last,
    case when q.id = new.queue_a_id then 0 else 1 end
  limit 1;

  if not found then
    return new;
  end if;

  new.scheduled_start_at := coalesce(
    new.scheduled_start_at,
    source_row.scheduled_start_at,
    source_row.cancellation_evaluation_at - interval '1 minute'
  );

  if new.scheduled_start_at is not null then
    new.cancellation_evaluation_at := coalesce(
      new.cancellation_evaluation_at,
      source_row.cancellation_evaluation_at,
      new.scheduled_start_at + interval '1 minute'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists copy_queue_schedule_to_battle_before_insert on public.battles;
create trigger copy_queue_schedule_to_battle_before_insert
before insert on public.battles
for each row
execute function public.copy_queue_schedule_to_battle();

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
          entry.cancellation_evaluation_at - interval '1 minute'
        ),
        coalesce(
          entry.cancellation_evaluation_at,
          entry.scheduled_start_at + interval '1 minute'
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
