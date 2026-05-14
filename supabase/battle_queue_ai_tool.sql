-- battle_queue：每位鬥士使用的 AI 工具（供擂台顯示與寫入 battles.ai_tool_a/b）
-- 請在 Supabase SQL Editor 執行（需已存在 mvp_points_and_levels 的 battles.ai_tool_* 欄位）。

alter table public.battle_queue
  add column if not exists ai_tool text;

comment on column public.battle_queue.ai_tool is 'AI tool label for this queue row (e.g. Suno, Udio)';

-- 配對成功建立 battles 時帶入雙方 AI 工具
create or replace function public.attempt_matchmaking(p_queue_id uuid)
returns public.battle_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  me_row public.battle_queue%rowtype;
  opponent_row public.battle_queue%rowtype;
  battle_row public.battles%rowtype;
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

  if me_row.status <> 'waiting' then
    return me_row;
  end if;

  select *
  into opponent_row
  from public.battle_queue
  where status = 'waiting'
    and genre = me_row.genre
    and user_id <> me_row.user_id
    and id <> me_row.id
  order by created_at asc
  for update skip locked
  limit 1;

  if opponent_row.id is null then
    return me_row;
  end if;

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
    ai_tool_a,
    ai_tool_b
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
    nullif(trim(me_row.ai_tool), ''),
    nullif(trim(opponent_row.ai_tool), '')
  )
  returning * into battle_row;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = opponent_row.user_id,
    match_group_id = battle_row.id
  where id = me_row.id;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = me_row.user_id,
    match_group_id = battle_row.id
  where id = opponent_row.id;

  select *
  into me_row
  from public.battle_queue
  where id = p_queue_id;

  return me_row;
end;
$$;

revoke all on function public.attempt_matchmaking(uuid) from public;
grant execute on function public.attempt_matchmaking(uuid) to authenticated;
