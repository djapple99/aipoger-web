-- Additive: old audio, queues, votes and archives are not rewritten.
alter table public.battle_queue
  add column if not exists submission_mode text not null default 'legacy',
  add column if not exists drop_playback_mode text,
  add column if not exists link_playback jsonb,
  add column if not exists referenced_work_id uuid,
  add column if not exists q_crash_invite_id uuid references public.q_crash_cards(id) on delete restrict;
create index if not exists battle_queue_q_crash_invite_id_idx on public.battle_queue(q_crash_invite_id);
create unique index if not exists battle_queue_one_link_q_crash_join on public.battle_queue(q_crash_invite_id,user_id) where q_crash_invite_id is not null and status in ('searching','waiting_challenge','matched','active');
create index if not exists battle_queue_referenced_work_id_idx on public.battle_queue(referenced_work_id);
alter table public.battles
  add column if not exists drop_playback_mode text,
  add column if not exists playback_a jsonb,
  add column if not exists playback_b jsonb;
alter table public.battle_queue drop constraint if exists battle_queue_source_type_check;
alter table public.battle_queue add constraint battle_queue_source_type_check check(source_type in ('upload','suno','youtube','work'));
alter table public.battle_queue drop constraint if exists battle_queue_drop_duration_seconds_check;
alter table public.battle_queue add constraint battle_queue_drop_duration_seconds_check check(drop_duration_seconds is null or (drop_duration_seconds > 0 and (submission_mode <> 'legacy' or drop_duration_seconds <= 60)));
alter table public.battle_queue add constraint battle_queue_submission_mode_check check(submission_mode in ('legacy','drop','q_crash'));
alter table public.battle_queue add constraint battle_queue_link_contract check(submission_mode = 'legacy' or (
  source_type in ('suno','youtube','work') and source_url is not null and audio_path is null
  and rights_confirmed_at is not null and duration_seconds > 0 and link_playback is not null
  and (link_playback->>'type') in ('upload','suno','youtube')
  and (link_playback->>'start')::numeric >= 0 and (link_playback->>'seconds')::numeric > 0
  and (link_playback->>'start')::numeric + (link_playback->>'seconds')::numeric <= duration_seconds + 0.1
  and ((submission_mode = 'q_crash' and drop_playback_mode is null)
    or (submission_mode = 'drop' and drop_playback_mode in ('60','90','full','legacy45')))
));
create or replace function public.guard_battle_link_entry() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op = 'INSERT' and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Use link submission.' using errcode='42501';
  end if;
  if tg_op = 'UPDATE' and (
    new.submission_mode is distinct from old.submission_mode or
    new.drop_playback_mode is distinct from old.drop_playback_mode or
    new.link_playback is distinct from old.link_playback or
    new.source_type is distinct from old.source_type or
    new.source_url is distinct from old.source_url or
    new.referenced_work_id is distinct from old.referenced_work_id or new.q_crash_invite_id is distinct from old.q_crash_invite_id or
    (old.submission_mode <> 'legacy' and (
      new.duration_seconds is distinct from old.duration_seconds or
      new.drop_duration_seconds is distinct from old.drop_duration_seconds or
      new.audio_path is distinct from old.audio_path or
      new.title is distinct from old.title or new.creator is distinct from old.creator or
      new.genre is distinct from old.genre or
      new.rights_confirmed_at is distinct from old.rights_confirmed_at or
      new.challenge_target_queue_id is distinct from old.challenge_target_queue_id or
      new.scheduled_start_at is distinct from old.scheduled_start_at or
      new.cancellation_evaluation_at is distinct from old.cancellation_evaluation_at
    ))
  ) then raise exception 'Battle source is locked.' using errcode='42501'; end if;
  return new;
end; $$;
revoke all on function public.guard_battle_link_entry() from public,anon,authenticated;
grant execute on function public.guard_battle_link_entry() to service_role;
drop trigger if exists guard_battle_link_entry on public.battle_queue;
create trigger guard_battle_link_entry before insert or update on public.battle_queue for each row execute function public.guard_battle_link_entry();

create or replace function public.create_battle_link_entry(p_actor uuid,p_id uuid,p_entry jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare
  target public.battle_queue%rowtype;
  prior public.battle_queue%rowtype;
  role_target uuid := nullif(p_entry->>'targetId','')::uuid;
  chosen text := p_entry->>'dropMode';
  played numeric := (p_entry->'playback'->>'seconds')::numeric;
  clip_start numeric := (p_entry->'playback'->>'start')::numeric;
  q_card public.q_crash_cards%rowtype;
  own_second boolean := false;
begin
  if coalesce(auth.role(),'') <> 'service_role' or p_actor is null then raise exception 'Not authorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text, 90125));
  select * into prior from public.battle_queue where id=p_id;
  if found then
    if prior.user_id <> p_actor then raise exception 'REQUEST_CONFLICT'; end if;
    return prior.id;
  end if;
  if (p_entry->>'mode') not in ('drop','q_crash') then raise exception 'MODE_INVALID'; end if;
  if nullif(p_entry->>'joinCardId','') is not null then
    if p_entry->>'mode' <> 'q_crash' then raise exception 'MODE_INVALID'; end if;
    select * into q_card from public.q_crash_cards where id=(p_entry->>'joinCardId')::uuid for update;
    if not found or q_card.status <> 'q_crash_pending_invite' or q_card.invite_expires_at <= now()
      or (q_card.invited_user_id is not null and q_card.invited_user_id <> p_actor and q_card.founder_user_id <> p_actor)
      then raise exception 'TARGET_CLOSED'; end if;
    if exists(select 1 from public.battle_queue q where q.q_crash_invite_id=q_card.id and q.user_id=p_actor and q.status in ('searching','waiting_challenge','matched','active')) then raise exception 'ACTIVE_BATTLE_ROLE'; end if;
    own_second := q_card.founder_user_id=p_actor;
    if not own_second then role_target := q_card.founder_queue_id; end if;
  end if;
  if role_target is not null and p_entry->>'mode'='drop' then
    select * into target from public.battle_queue where id=role_target for update;
    if not found or target.submission_mode='q_crash' or target.match_group_id is not null
       or target.status not in ('searching','waiting','waiting_challenge') or target.expires_at <= now()
       or (target.cancellation_evaluation_at is not null and target.cancellation_evaluation_at <= now()) then raise exception 'TARGET_CLOSED'; end if;
    if chosen is distinct from coalesce(target.drop_playback_mode,'legacy45') or target.genre <> p_entry->>'genre' then raise exception 'TARGET_MODE_MISMATCH'; end if;
  elsif p_entry->>'mode'='drop' and (chosen is null or chosen not in ('60','90','full')) then raise exception 'MODE_INVALID'; end if;
  if p_entry->>'mode'='drop' then
    if chosen in ('60','90') and played <> chosen::numeric then raise exception 'MODE_DURATION_MISMATCH'; end if;
    if chosen='full' and (clip_start<>0 or played<>(p_entry->>'duration')::numeric) then raise exception 'MODE_DURATION_MISMATCH'; end if;
  elsif clip_start<>0 or played<>(p_entry->>'duration')::numeric then raise exception 'MODE_DURATION_MISMATCH'; end if;
  if not own_second and exists(select 1 from public.battle_queue q where q.user_id=p_actor
    and q.status in ('searching','waiting','waiting_challenge','matched','active')
    and ((q.challenge_target_queue_id is null) = (role_target is null))
    and coalesce(q.official_gatekeeper_role,'') <> 'defender'
    and (q.match_group_id is not null or (q.expires_at > now() and coalesce(q.cancellation_evaluation_at,q.expires_at)>now()))
    and (q.match_group_id is null or exists(select 1 from public.battles b where b.id=q.match_group_id and b.battle_ended_at is null and ((b.status='q_crash_voting' and b.voting_ends_at>now()) or (b.status in ('live','active') and coalesce(b.scheduled_start_at,b.battle_started_at,b.started_at,b.created_at) + make_interval(secs => coalesce((b.playback_a->>'seconds')::double precision + (b.playback_b->>'seconds')::double precision,90)+45)>now()))))
  ) then raise exception 'ACTIVE_BATTLE_ROLE'; end if;
  insert into public.battle_queue(id,user_id,fighter_name,genre,original_file_name,title,creator,ai_tool,lyrics,
    audio_path,source_type,source_url,cover_url,duration_seconds,drop_duration_seconds,rights_confirmed_at,
    submission_mode,drop_playback_mode,link_playback,referenced_work_id,q_crash_invite_id,challenge_target_queue_id,status,
    scheduled_start_at,cancellation_evaluation_at)
  values(p_id,p_actor,p_entry->>'creator',p_entry->>'genre',p_entry->>'title',p_entry->>'title',p_entry->>'creator',
    p_entry->>'aiTool',nullif(p_entry->>'lyrics',''),null,p_entry->>'sourceType',p_entry->>'sourceUrl',nullif(p_entry->>'cover',''),
    (p_entry->>'duration')::numeric,case when p_entry->>'mode'='drop' then played else null end,now(),
    p_entry->>'mode',chosen,p_entry->'playback',nullif(p_entry->>'workId','')::uuid,q_card.id,role_target,
    case when role_target is null then 'waiting_challenge' else 'searching' end,
    case when role_target is not null and p_entry->>'mode'='drop' then target.scheduled_start_at else nullif(p_entry->>'scheduledStartAt','')::timestamptz end,
    case when role_target is not null and p_entry->>'mode'='drop' then target.cancellation_evaluation_at else nullif(p_entry->>'cancellationEvaluationAt','')::timestamptz end);
  return p_id;
end; $$;
revoke all on function public.create_battle_link_entry(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_battle_link_entry(uuid,uuid,jsonb) to service_role;

create or replace function public.snapshot_battle_link_playback() returns trigger language plpgsql security invoker set search_path=public as $$
declare a public.battle_queue%rowtype; b public.battle_queue%rowtype;
begin
  if tg_op='UPDATE' then
    if new.drop_playback_mode is distinct from old.drop_playback_mode or new.playback_a is distinct from old.playback_a or new.playback_b is distinct from old.playback_b then
      raise exception 'Battle playback is locked.' using errcode='42501';
    end if;
    return new;
  end if;
  select * into a from public.battle_queue where id=new.queue_a_id;
  select * into b from public.battle_queue where id=new.queue_b_id;
  if new.battle_type='q_crash' then
    new.playback_a := a.link_playback; new.playback_b := b.link_playback; return new;
  end if;
  if a.submission_mode='q_crash' or b.submission_mode='q_crash' then raise exception 'MODE_MISMATCH'; end if;
  if a.link_playback is null and b.link_playback is null then return new; end if;
  if coalesce(a.drop_playback_mode,'legacy45') <> coalesce(b.drop_playback_mode,'legacy45') then raise exception 'MODE_MISMATCH'; end if;
  new.drop_playback_mode := coalesce(a.drop_playback_mode,b.drop_playback_mode);
  new.playback_a := coalesce(a.link_playback,jsonb_build_object('type','upload','url',a.audio_path,'start',0,'seconds',least(45,coalesce(a.drop_duration_seconds,45))));
  new.playback_b := coalesce(b.link_playback,jsonb_build_object('type','upload','url',b.audio_path,'start',0,'seconds',least(45,coalesce(b.drop_duration_seconds,45))));
  return new;
end; $$;
revoke all on function public.snapshot_battle_link_playback() from public,anon,authenticated;
grant execute on function public.snapshot_battle_link_playback() to service_role;
drop trigger if exists snapshot_battle_link_playback on public.battles;
create trigger snapshot_battle_link_playback before insert or update on public.battles for each row execute function public.snapshot_battle_link_playback();

CREATE OR REPLACE FUNCTION public.attempt_matchmaking(p_queue_id uuid, p_target_queue_id uuid DEFAULT NULL::uuid)
 RETURNS battle_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    and q.expires_at > now()
    and coalesce(q.cancellation_evaluation_at,q.expires_at) > now()
    and q.submission_mode <> 'q_crash'
    and me_row.submission_mode <> 'q_crash'
    and coalesce(q.drop_playback_mode, 'legacy45') = coalesce(me_row.drop_playback_mode, 'legacy45')
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
$function$;

revoke all on function public.attempt_matchmaking(uuid,uuid) from public,anon;
grant execute on function public.attempt_matchmaking(uuid,uuid) to authenticated,service_role;

