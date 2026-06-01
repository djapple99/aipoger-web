-- battle_queue / battles：鬥士上傳歌詞並帶入擂台顯示
-- 可重複執行；不會清除既有資料。

alter table public.battle_queue
  add column if not exists lyrics text;

alter table public.battles
  add column if not exists lyrics_a text,
  add column if not exists lyrics_b text;

comment on column public.battle_queue.lyrics is 'Optional lyrics uploaded with the hook cut.';
comment on column public.battles.lyrics_a is 'Fighter A lyrics (optional, shown in arena).';
comment on column public.battles.lyrics_b is 'Fighter B lyrics (optional, shown in arena).';

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
    ai_tool_b,
    lyrics_a,
    lyrics_b
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
    nullif(trim(opponent_row.ai_tool), ''),
    nullif(trim(me_row.lyrics), ''),
    nullif(trim(opponent_row.lyrics), '')
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

drop function if exists public.create_test_arena_battle(text, text, text, text, text, text);

create or replace function public.create_test_arena_battle(
  p_fighter_a_name text,
  p_song_a_name text,
  p_audio_a_path text,
  p_genre text,
  p_ai_tool_a text default null,
  p_cover_url text default null,
  p_lyrics_a text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  opp uuid;
  qa uuid;
  qb uuid;
  bid uuid;
  audio_b text := '__test__/opponent-placeholder.wav';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if trim(coalesce(p_audio_a_path, '')) = '' then
    raise exception 'p_audio_a_path required';
  end if;

  select au.id into opp
  from auth.users au
  where au.id <> uid
  order by au.created_at asc
  limit 1;

  if opp is null then
    raise exception 'Need at least two registered users to create a test battle (fighter B).';
  end if;

  insert into public.battle_queue (
    user_id, fighter_name, genre, audio_path, original_file_name, ai_tool, lyrics, status
  )
  values (
    uid,
    coalesce(nullif(trim(p_fighter_a_name), ''), '鬥士 A'),
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    trim(p_audio_a_path),
    coalesce(nullif(trim(p_song_a_name), ''), 'Track A'),
    nullif(trim(p_ai_tool_a), ''),
    nullif(trim(p_lyrics_a), ''),
    'cancelled'
  )
  returning id into qa;

  insert into public.battle_queue (
    user_id, fighter_name, genre, audio_path, original_file_name, ai_tool, lyrics, status
  )
  values (
    opp,
    '測試對手',
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    audio_b,
    'Track B (test)',
    null,
    null,
    'cancelled'
  )
  returning id into qb;

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
    ai_tool_b,
    song_a_cover,
    lyrics_a,
    lyrics_b,
    started_at
  )
  values (
    qa,
    qb,
    uid,
    opp,
    coalesce(nullif(trim(p_fighter_a_name), ''), '鬥士 A'),
    '測試對手',
    coalesce(nullif(trim(p_song_a_name), ''), 'Track A'),
    '—',
    trim(p_audio_a_path),
    audio_b,
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    'live',
    nullif(trim(p_ai_tool_a), ''),
    null,
    nullif(trim(p_cover_url), ''),
    nullif(trim(p_lyrics_a), ''),
    null,
    now()
  )
  returning id into bid;

  if p_cover_url is not null and trim(p_cover_url) <> '' then
    insert into public.fighter_profiles (id, song_cover_url)
    values (uid, trim(p_cover_url))
    on conflict (id) do update set
      song_cover_url = excluded.song_cover_url,
      updated_at = now();
  end if;

  return bid;
end;
$$;

revoke all on function public.create_test_arena_battle(text, text, text, text, text, text, text) from public;
grant execute on function public.create_test_arena_battle(text, text, text, text, text, text, text) to authenticated;

comment on function public.create_test_arena_battle is 'Skip matchmaking: create live battle row for solo test (with optional lyrics).';
