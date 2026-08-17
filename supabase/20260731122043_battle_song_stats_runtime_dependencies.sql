-- AIPOGER: repair the song-level battle-stat dependencies used by the
-- production archive_battle_result() function.
--
-- This migration is additive and intentionally does not backfill historical
-- archives. New official results are recorded from this point forward; old
-- under-threshold archives are not turned into formal song statistics.

create extension if not exists pgcrypto;

create table if not exists public.battle_song_stats (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  song_key text not null,
  display_title text not null,
  genre text,
  ai_tool text,
  latest_audio_path text,
  battle_count integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  no_contests integer not null default 0,
  total_votes_for integer not null default 0,
  total_votes_against integer not null default 0,
  honor_board_count integer not null default 0,
  latest_battle_id uuid references public.battles(id) on delete set null,
  last_battled_at timestamptz,
  honor_spotlight_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battle_song_stats_song_key_not_blank check (length(trim(song_key)) > 0),
  constraint battle_song_stats_display_title_not_blank check (length(trim(display_title)) > 0),
  constraint battle_song_stats_counts_non_negative check (
    battle_count >= 0
    and wins >= 0
    and losses >= 0
    and no_contests >= 0
    and total_votes_for >= 0
    and total_votes_against >= 0
    and honor_board_count >= 0
  )
);

create unique index if not exists battle_song_stats_owner_song_key_uidx
on public.battle_song_stats (owner_user_id, song_key);

create index if not exists battle_song_stats_owner_updated_idx
on public.battle_song_stats (owner_user_id, updated_at desc);

create index if not exists battle_song_stats_public_power_idx
on public.battle_song_stats (wins desc, total_votes_for desc, battle_count desc, updated_at desc);

alter table public.battle_song_stats enable row level security;
revoke all on table public.battle_song_stats from anon, authenticated;
grant select on table public.battle_song_stats to anon, authenticated;
grant all on table public.battle_song_stats to service_role;

drop policy if exists battle_song_stats_public_read on public.battle_song_stats;
create policy battle_song_stats_public_read
on public.battle_song_stats
for select
to anon, authenticated
using (true);

drop policy if exists battle_song_stats_service_manage on public.battle_song_stats;
create policy battle_song_stats_service_manage
on public.battle_song_stats
for all
to service_role
using (true)
with check (true);

create table if not exists public.battle_song_stat_events (
  id uuid primary key default gen_random_uuid(),
  song_stats_id uuid not null references public.battle_song_stats(id) on delete cascade,
  battle_id uuid not null references public.battles(id) on delete cascade,
  side text not null check (side in ('fighter_a', 'fighter_b')),
  result text not null check (result in ('win', 'loss', 'no_contest')),
  votes_for integer not null default 0,
  votes_against integer not null default 0,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battle_song_stat_events_votes_non_negative check (
    votes_for >= 0 and votes_against >= 0
  )
);

create unique index if not exists battle_song_stat_events_battle_song_uidx
on public.battle_song_stat_events (battle_id, song_stats_id);

create index if not exists battle_song_stat_events_song_event_idx
on public.battle_song_stat_events (song_stats_id, event_at desc);

alter table public.battle_song_stat_events enable row level security;
revoke all on table public.battle_song_stat_events from anon, authenticated;
grant all on table public.battle_song_stat_events to service_role;

drop policy if exists battle_song_stat_events_service_manage on public.battle_song_stat_events;
create policy battle_song_stat_events_service_manage
on public.battle_song_stat_events
for all
to service_role
using (true)
with check (true);

alter table public.battle_queue
  add column if not exists song_stats_id uuid references public.battle_song_stats(id) on delete set null;

alter table public.battles
  add column if not exists song_stats_a_id uuid references public.battle_song_stats(id) on delete set null,
  add column if not exists song_stats_b_id uuid references public.battle_song_stats(id) on delete set null;

alter table public.battle_result_archives
  add column if not exists winner_song_stats_id uuid references public.battle_song_stats(id) on delete set null,
  add column if not exists opponent_song_stats_id uuid references public.battle_song_stats(id) on delete set null,
  add column if not exists winner_song_battle_count integer not null default 0,
  add column if not exists winner_song_wins integer not null default 0,
  add column if not exists winner_song_losses integer not null default 0,
  add column if not exists winner_song_no_contests integer not null default 0,
  add column if not exists winner_song_total_votes_for integer not null default 0,
  add column if not exists winner_song_total_votes_against integer not null default 0,
  add column if not exists winner_song_honor_board_count integer not null default 0;

create index if not exists battle_result_archives_winner_song_stats_idx
on public.battle_result_archives (winner_song_stats_id, archived_at desc);

create or replace function public.normalize_battle_song_key(p_title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          lower(trim(coalesce(p_title, ''))),
          '\.(mp3|wav|aiff|aif|m4a)$',
          '',
          'i'
        ),
        '\s+',
        ' ',
        'g'
      ),
      ''
    ),
    'untitled-drop'
  );
$$;

revoke all on function public.normalize_battle_song_key(text) from public, anon, authenticated;
grant execute on function public.normalize_battle_song_key(text) to service_role;

create or replace function public.ensure_battle_song_stat(
  p_owner_user_id uuid,
  p_title text,
  p_genre text default null,
  p_ai_tool text default null,
  p_audio_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := coalesce(nullif(trim(coalesce(p_title, '')), ''), 'Untitled Drop');
  clean_key text := public.normalize_battle_song_key(p_title);
  stat_id uuid;
begin
  if p_owner_user_id is null then
    return null;
  end if;

  insert into public.battle_song_stats (
    owner_user_id,
    song_key,
    display_title,
    genre,
    ai_tool,
    latest_audio_path
  )
  values (
    p_owner_user_id,
    clean_key,
    clean_title,
    nullif(trim(coalesce(p_genre, '')), ''),
    nullif(trim(coalesce(p_ai_tool, '')), ''),
    nullif(trim(coalesce(p_audio_path, '')), '')
  )
  on conflict (owner_user_id, song_key) do update
  set display_title = case
        when excluded.display_title <> 'Untitled Drop' then excluded.display_title
        else public.battle_song_stats.display_title
      end,
      genre = coalesce(excluded.genre, public.battle_song_stats.genre),
      ai_tool = coalesce(excluded.ai_tool, public.battle_song_stats.ai_tool),
      latest_audio_path = coalesce(excluded.latest_audio_path, public.battle_song_stats.latest_audio_path),
      updated_at = now()
  returning id into stat_id;

  return stat_id;
end;
$$;

revoke all on function public.ensure_battle_song_stat(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ensure_battle_song_stat(uuid, text, text, text, text) to service_role;

create or replace function public.battle_song_stats_snapshot(p_song_stats_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', id,
        'battleCount', battle_count,
        'wins', wins,
        'losses', losses,
        'noContests', no_contests,
        'totalVotesFor', total_votes_for,
        'totalVotesAgainst', total_votes_against,
        'honorBoardCount', honor_board_count,
        'winRate', case
          when battle_count > 0 then round((wins::numeric / battle_count::numeric) * 100)::integer
          else 0
        end
      )
      from public.battle_song_stats
      where id = p_song_stats_id
    ),
    '{}'::jsonb
  );
$$;

revoke all on function public.battle_song_stats_snapshot(uuid) from public;
grant execute on function public.battle_song_stats_snapshot(uuid) to anon, authenticated, service_role;

create or replace function public.record_battle_song_stats_for_battle(
  p_battle_id uuid,
  p_winner text,
  p_final_vote_left integer default 0,
  p_final_vote_right integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  battle_row public.battles%rowtype;
  queue_a_stat_id uuid;
  queue_b_stat_id uuid;
  stat_a_id uuid;
  stat_b_id uuid;
  winner_stat_id uuid;
  opponent_stat_id uuid;
begin
  if p_winner not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid winner';
  end if;

  select * into battle_row
  from public.battles
  where id = p_battle_id
  for update;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.queue_a_id is not null then
    select song_stats_id into queue_a_stat_id
    from public.battle_queue
    where id = battle_row.queue_a_id;
  end if;

  if battle_row.queue_b_id is not null then
    select song_stats_id into queue_b_stat_id
    from public.battle_queue
    where id = battle_row.queue_b_id;
  end if;

  stat_a_id := coalesce(
    battle_row.song_stats_a_id,
    queue_a_stat_id,
    public.ensure_battle_song_stat(
      battle_row.fighter_a_user_id,
      battle_row.song_a_name,
      battle_row.genre,
      battle_row.ai_tool_a,
      battle_row.audio_a_path
    )
  );

  stat_b_id := coalesce(
    battle_row.song_stats_b_id,
    queue_b_stat_id,
    public.ensure_battle_song_stat(
      battle_row.fighter_b_user_id,
      battle_row.song_b_name,
      battle_row.genre,
      battle_row.ai_tool_b,
      battle_row.audio_b_path
    )
  );

  if stat_a_id is not null and stat_b_id = stat_a_id and battle_row.queue_b_id is not null then
    insert into public.battle_song_stats (
      owner_user_id,
      song_key,
      display_title,
      genre,
      ai_tool,
      latest_audio_path
    )
    values (
      battle_row.fighter_b_user_id,
      public.normalize_battle_song_key(battle_row.song_b_name) || '#work:' || battle_row.queue_b_id::text,
      coalesce(nullif(trim(coalesce(battle_row.song_b_name, '')), ''), 'Untitled Drop'),
      nullif(trim(coalesce(battle_row.genre, '')), ''),
      nullif(trim(coalesce(battle_row.ai_tool_b, '')), ''),
      nullif(trim(coalesce(battle_row.audio_b_path, '')), '')
    )
    on conflict (owner_user_id, song_key) do update
    set genre = coalesce(excluded.genre, public.battle_song_stats.genre),
        ai_tool = coalesce(excluded.ai_tool, public.battle_song_stats.ai_tool),
        latest_audio_path = coalesce(excluded.latest_audio_path, public.battle_song_stats.latest_audio_path),
        updated_at = now()
    returning id into stat_b_id;
  end if;

  update public.battles
  set song_stats_a_id = coalesce(song_stats_a_id, stat_a_id),
      song_stats_b_id = coalesce(song_stats_b_id, stat_b_id)
  where id = battle_row.id;

  if battle_row.queue_a_id is not null and stat_a_id is not null then
    update public.battle_queue
    set song_stats_id = coalesce(song_stats_id, stat_a_id)
    where id = battle_row.queue_a_id;
  end if;

  if battle_row.queue_b_id is not null and stat_b_id is not null then
    update public.battle_queue
    set song_stats_id = coalesce(song_stats_id, stat_b_id)
    where id = battle_row.queue_b_id;
  end if;

  if stat_a_id is not null then
    insert into public.battle_song_stat_events (
      song_stats_id, battle_id, side, result, votes_for, votes_against, event_at
    )
    values (
      stat_a_id,
      battle_row.id,
      'fighter_a',
      case when p_winner = 'fighter_a' then 'win' else 'loss' end,
      greatest(0, coalesce(p_final_vote_left, 0)),
      greatest(0, coalesce(p_final_vote_right, 0)),
      now()
    )
    on conflict (battle_id, song_stats_id) do update
    set side = excluded.side,
        result = excluded.result,
        votes_for = excluded.votes_for,
        votes_against = excluded.votes_against,
        updated_at = now();
  end if;

  if stat_b_id is not null then
    insert into public.battle_song_stat_events (
      song_stats_id, battle_id, side, result, votes_for, votes_against, event_at
    )
    values (
      stat_b_id,
      battle_row.id,
      'fighter_b',
      case when p_winner = 'fighter_b' then 'win' else 'loss' end,
      greatest(0, coalesce(p_final_vote_right, 0)),
      greatest(0, coalesce(p_final_vote_left, 0)),
      now()
    )
    on conflict (battle_id, song_stats_id) do update
    set side = excluded.side,
        result = excluded.result,
        votes_for = excluded.votes_for,
        votes_against = excluded.votes_against,
        updated_at = now();
  end if;

  update public.battle_song_stats s
  set battle_count = agg.battle_count,
      wins = agg.wins,
      losses = agg.losses,
      no_contests = agg.no_contests,
      total_votes_for = agg.total_votes_for,
      total_votes_against = agg.total_votes_against,
      honor_board_count = agg.wins,
      latest_battle_id = agg.latest_battle_id,
      last_battled_at = agg.last_battled_at,
      updated_at = now()
  from (
    select
      event.song_stats_id,
      count(*)::integer as battle_count,
      count(*) filter (where event.result = 'win')::integer as wins,
      count(*) filter (where event.result = 'loss')::integer as losses,
      count(*) filter (where event.result = 'no_contest')::integer as no_contests,
      coalesce(sum(event.votes_for), 0)::integer as total_votes_for,
      coalesce(sum(event.votes_against), 0)::integer as total_votes_against,
      (array_agg(event.battle_id order by event.event_at desc, event.updated_at desc))[1] as latest_battle_id,
      max(event.event_at) as last_battled_at
    from public.battle_song_stat_events event
    where event.song_stats_id in (stat_a_id, stat_b_id)
    group by event.song_stats_id
  ) agg
  where s.id = agg.song_stats_id;

  winner_stat_id := case when p_winner = 'fighter_a' then stat_a_id else stat_b_id end;
  opponent_stat_id := case when p_winner = 'fighter_a' then stat_b_id else stat_a_id end;

  return jsonb_build_object(
    'winnerSongStatsId', winner_stat_id,
    'opponentSongStatsId', opponent_stat_id,
    'winner', public.battle_song_stats_snapshot(winner_stat_id),
    'opponent', public.battle_song_stats_snapshot(opponent_stat_id),
    'fighterA', public.battle_song_stats_snapshot(stat_a_id),
    'fighterB', public.battle_song_stats_snapshot(stat_b_id)
  );
end;
$$;

revoke all on function public.record_battle_song_stats_for_battle(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.record_battle_song_stats_for_battle(uuid, text, integer, integer)
to service_role;
