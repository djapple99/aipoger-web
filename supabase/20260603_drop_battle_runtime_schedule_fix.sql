-- AIPOGER Drop Battle runtime schedule fix.
-- Safe to run more than once.
--
-- Purpose:
-- 1. Ensure scheduled_start_at / cancellation_evaluation_at exist on queue and battle rows.
-- 2. Make process_battle_pool_fallbacks use cancellation_evaluation_at / scheduled_start_at,
--    not the legacy 24-hour expires_at, when deciding that a waiting challenge is due.
-- 3. Keep notification copy schedule-neutral instead of saying "24 hours".

alter table public.battle_queue
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz;

alter table public.battles
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz,
  add column if not exists cancellation_reason text;

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
          coalesce(entry.scheduled_start_at, entry.expires_at) + interval '1 minute'
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
