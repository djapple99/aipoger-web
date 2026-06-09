-- AIPOGER: song-level battle stats for Drop Battle records.
-- Run in Supabase SQL Editor. Safe to run multiple times.
--
-- Scope:
-- - No URL upload.
-- - No creator song-library UI.
-- - V1 groups the same creator's repeated Drop Battle entries by normalized song title.

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

grant select on table public.battle_song_stats to anon, authenticated;

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
  constraint battle_song_stat_events_votes_non_negative check (votes_for >= 0 and votes_against >= 0)
);

create unique index if not exists battle_song_stat_events_battle_song_uidx
on public.battle_song_stat_events (battle_id, song_stats_id);

create index if not exists battle_song_stat_events_song_event_idx
on public.battle_song_stat_events (song_stats_id, event_at desc);

alter table public.battle_song_stat_events enable row level security;

drop policy if exists battle_song_stat_events_service_manage on public.battle_song_stat_events;
create policy battle_song_stat_events_service_manage
on public.battle_song_stat_events
for all
to service_role
using (true)
with check (true);

alter table public.battle_queue
  add column if not exists ai_tool text,
  add column if not exists song_stats_id uuid references public.battle_song_stats(id) on delete set null;

alter table public.battles
  add column if not exists ai_tool_a text,
  add column if not exists ai_tool_b text,
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
set search_path = public
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

revoke all on function public.ensure_battle_song_stat(uuid, text, text, text, text) from public;
grant execute on function public.ensure_battle_song_stat(uuid, text, text, text, text) to authenticated;
grant execute on function public.ensure_battle_song_stat(uuid, text, text, text, text) to service_role;

create or replace function public.set_battle_queue_song_stats_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.song_stats_id is null then
    new.song_stats_id := public.ensure_battle_song_stat(
      new.user_id,
      new.original_file_name,
      new.genre,
      new.ai_tool,
      new.audio_path
    );
  end if;

  return new;
end;
$$;

drop trigger if exists battle_queue_set_song_stats_id on public.battle_queue;
create trigger battle_queue_set_song_stats_id
before insert or update of user_id, original_file_name, genre, ai_tool, audio_path, song_stats_id
on public.battle_queue
for each row
execute function public.set_battle_queue_song_stats_id();

create or replace function public.refresh_battle_song_stat(p_song_stats_id uuid)
returns public.battle_song_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  refreshed public.battle_song_stats%rowtype;
begin
  if p_song_stats_id is null then
    return null;
  end if;

  update public.battle_song_stats s
  set battle_count = coalesce(agg.battle_count, 0),
      wins = coalesce(agg.wins, 0),
      losses = coalesce(agg.losses, 0),
      no_contests = coalesce(agg.no_contests, 0),
      total_votes_for = coalesce(agg.total_votes_for, 0),
      total_votes_against = coalesce(agg.total_votes_against, 0),
      honor_board_count = coalesce(agg.wins, 0),
      latest_battle_id = agg.latest_battle_id,
      last_battled_at = agg.last_battled_at,
      updated_at = now()
  from (
    select
      count(*)::integer as battle_count,
      count(*) filter (where result = 'win')::integer as wins,
      count(*) filter (where result = 'loss')::integer as losses,
      count(*) filter (where result = 'no_contest')::integer as no_contests,
      coalesce(sum(votes_for), 0)::integer as total_votes_for,
      coalesce(sum(votes_against), 0)::integer as total_votes_against,
      (array_agg(battle_id order by event_at desc, updated_at desc))[1] as latest_battle_id,
      max(event_at) as last_battled_at
    from public.battle_song_stat_events
    where song_stats_id = p_song_stats_id
  ) agg
  where s.id = p_song_stats_id
  returning s.* into refreshed;

  return refreshed;
end;
$$;

revoke all on function public.refresh_battle_song_stat(uuid) from public;
grant execute on function public.refresh_battle_song_stat(uuid) to service_role;

create or replace function public.battle_song_stats_snapshot(p_song_stats_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
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
        'winRate', case when battle_count > 0 then round((wins::numeric / battle_count::numeric) * 100)::integer else 0 end
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
set search_path = public
as $$
declare
  battle_row public.battles%rowtype;
  queue_a_stat_id uuid;
  queue_b_stat_id uuid;
  stat_a_id uuid;
  stat_b_id uuid;
  refreshed_a public.battle_song_stats%rowtype;
  refreshed_b public.battle_song_stats%rowtype;
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
      song_stats_id,
      battle_id,
      side,
      result,
      votes_for,
      votes_against,
      event_at
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

    select * into refreshed_a
    from public.refresh_battle_song_stat(stat_a_id);
  end if;

  if stat_b_id is not null then
    insert into public.battle_song_stat_events (
      song_stats_id,
      battle_id,
      side,
      result,
      votes_for,
      votes_against,
      event_at
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

    select * into refreshed_b
    from public.refresh_battle_song_stat(stat_b_id);
  end if;

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

revoke all on function public.record_battle_song_stats_for_battle(uuid, text, integer, integer) from public;
grant execute on function public.record_battle_song_stats_for_battle(uuid, text, integer, integer) to authenticated;
grant execute on function public.record_battle_song_stats_for_battle(uuid, text, integer, integer) to service_role;

create or replace function public.archive_battle_result(
  p_battle_id uuid,
  p_winner text,
  p_final_vote_left integer default 0,
  p_final_vote_right integer default 0,
  p_audience_review text default null,
  p_result_payload jsonb default '{}'::jsonb
)
returns public.battle_result_archives
language plpgsql
security definer
set search_path = public
as $archive_battle_result$
declare
  battle_row public.battles%rowtype;
  archive_row public.battle_result_archives%rowtype;
  battle_no bigint;
  effective_winner text;
  vote_left integer := 0;
  vote_right integer := 0;
  guest_vote_left integer := 0;
  guest_vote_right integer := 0;
  stats_snapshot jsonb := '{}'::jsonb;
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

  effective_winner := coalesce(battle_row.winner, p_winner);
  if effective_winner not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid winner';
  end if;

  if battle_row.winner is not null and battle_row.winner <> p_winner then
    raise exception 'Archive winner % conflicts with battle winner %', p_winner, battle_row.winner;
  end if;

  select
    count(*) filter (where voted_for = 'fighter_a')::integer,
    count(*) filter (where voted_for = 'fighter_b')::integer
  into vote_left, vote_right
  from public.battle_votes
  where battle_id = p_battle_id
    and voter_role = 'audience';

  select
    count(*) filter (where voted_for = 'fighter_a')::integer,
    count(*) filter (where voted_for = 'fighter_b')::integer
  into guest_vote_left, guest_vote_right
  from public.battle_guest_votes
  where battle_id = p_battle_id;

  vote_left := greatest(0, coalesce(vote_left, 0)) + greatest(0, coalesce(guest_vote_left, 0));
  vote_right := greatest(0, coalesce(vote_right, 0)) + greatest(0, coalesce(guest_vote_right, 0));

  if vote_left + vote_right <= 0 then
    raise exception 'Cannot archive battle result without audience votes';
  end if;

  if battle_row.battle_number is null then
    battle_no := nextval('public.battle_number_seq');
    update public.battles
    set battle_number = battle_no
    where id = p_battle_id
    returning battle_number into battle_row.battle_number;
  end if;

  stats_snapshot := public.record_battle_song_stats_for_battle(
    battle_row.id,
    effective_winner,
    vote_left,
    vote_right
  );
  winner_stat_id := nullif(stats_snapshot ->> 'winnerSongStatsId', '')::uuid;
  opponent_stat_id := nullif(stats_snapshot ->> 'opponentSongStatsId', '')::uuid;

  insert into public.battle_result_archives (
    battle_id,
    battle_number,
    battle_code,
    winner,
    winner_user_id,
    winner_name,
    winner_song_name,
    winner_ai_tool,
    opponent_user_id,
    opponent_name,
    opponent_song_name,
    final_vote_left,
    final_vote_right,
    total_votes,
    audience_review,
    result_payload,
    winner_song_stats_id,
    opponent_song_stats_id,
    winner_song_battle_count,
    winner_song_wins,
    winner_song_losses,
    winner_song_no_contests,
    winner_song_total_votes_for,
    winner_song_total_votes_against,
    winner_song_honor_board_count
  )
  values (
    battle_row.id,
    battle_row.battle_number,
    public.format_battle_code(battle_row.battle_number),
    effective_winner,
    case when effective_winner = 'fighter_a' then battle_row.fighter_a_user_id else battle_row.fighter_b_user_id end,
    case when effective_winner = 'fighter_a' then battle_row.fighter_a_name else battle_row.fighter_b_name end,
    case when effective_winner = 'fighter_a' then battle_row.song_a_name else battle_row.song_b_name end,
    case when effective_winner = 'fighter_a' then battle_row.ai_tool_a else battle_row.ai_tool_b end,
    case when effective_winner = 'fighter_a' then battle_row.fighter_b_user_id else battle_row.fighter_a_user_id end,
    case when effective_winner = 'fighter_a' then battle_row.fighter_b_name else battle_row.fighter_a_name end,
    case when effective_winner = 'fighter_a' then battle_row.song_b_name else battle_row.song_a_name end,
    vote_left,
    vote_right,
    vote_left + vote_right,
    nullif(trim(coalesce(p_audience_review, '')), ''),
    coalesce(p_result_payload, '{}'::jsonb) || jsonb_build_object('songStats', stats_snapshot),
    winner_stat_id,
    opponent_stat_id,
    coalesce((stats_snapshot #>> '{winner,battleCount}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,wins}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,losses}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,noContests}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,totalVotesFor}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,totalVotesAgainst}')::integer, 0),
    coalesce((stats_snapshot #>> '{winner,honorBoardCount}')::integer, 0)
  )
  on conflict (battle_id) do update
  set winner = excluded.winner,
      winner_user_id = excluded.winner_user_id,
      winner_name = excluded.winner_name,
      winner_song_name = excluded.winner_song_name,
      winner_ai_tool = excluded.winner_ai_tool,
      opponent_user_id = excluded.opponent_user_id,
      opponent_name = excluded.opponent_name,
      opponent_song_name = excluded.opponent_song_name,
      final_vote_left = excluded.final_vote_left,
      final_vote_right = excluded.final_vote_right,
      total_votes = excluded.total_votes,
      audience_review = excluded.audience_review,
      result_payload = excluded.result_payload,
      winner_song_stats_id = excluded.winner_song_stats_id,
      opponent_song_stats_id = excluded.opponent_song_stats_id,
      winner_song_battle_count = excluded.winner_song_battle_count,
      winner_song_wins = excluded.winner_song_wins,
      winner_song_losses = excluded.winner_song_losses,
      winner_song_no_contests = excluded.winner_song_no_contests,
      winner_song_total_votes_for = excluded.winner_song_total_votes_for,
      winner_song_total_votes_against = excluded.winner_song_total_votes_against,
      winner_song_honor_board_count = excluded.winner_song_honor_board_count,
      archived_at = now()
  returning * into archive_row;

  update public.battles
  set winner = effective_winner,
      status = 'finished',
      battle_ended_at = coalesce(battle_ended_at, now()),
      result_archived_at = archive_row.archived_at,
      updated_at = now()
  where id = battle_row.id;

  return archive_row;
end;
$archive_battle_result$;

revoke all on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) from public;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to authenticated;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to service_role;

update public.battle_queue q
set song_stats_id = public.ensure_battle_song_stat(q.user_id, q.original_file_name, q.genre, q.ai_tool, q.audio_path)
where q.song_stats_id is null
  and q.user_id is not null;

update public.battles b
set song_stats_a_id = coalesce(
      b.song_stats_a_id,
      (select q.song_stats_id from public.battle_queue q where q.id = b.queue_a_id),
      public.ensure_battle_song_stat(b.fighter_a_user_id, b.song_a_name, b.genre, b.ai_tool_a, b.audio_a_path)
    ),
    song_stats_b_id = coalesce(
      b.song_stats_b_id,
      (select q.song_stats_id from public.battle_queue q where q.id = b.queue_b_id),
      public.ensure_battle_song_stat(b.fighter_b_user_id, b.song_b_name, b.genre, b.ai_tool_b, b.audio_b_path)
    )
where b.song_stats_a_id is null
   or b.song_stats_b_id is null;

insert into public.battle_song_stat_events (
  song_stats_id,
  battle_id,
  side,
  result,
  votes_for,
  votes_against,
  event_at
)
select
  case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end,
  a.battle_id,
  a.winner,
  'win',
  case when a.winner = 'fighter_a' then a.final_vote_left else a.final_vote_right end,
  case when a.winner = 'fighter_a' then a.final_vote_right else a.final_vote_left end,
  a.archived_at
from public.battle_result_archives a
join public.battles b on b.id = a.battle_id
where case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end is not null
on conflict (battle_id, song_stats_id) do update
set side = excluded.side,
    result = excluded.result,
    votes_for = excluded.votes_for,
    votes_against = excluded.votes_against,
    event_at = excluded.event_at,
    updated_at = now();

insert into public.battle_song_stat_events (
  song_stats_id,
  battle_id,
  side,
  result,
  votes_for,
  votes_against,
  event_at
)
select
  case when a.winner = 'fighter_a' then b.song_stats_b_id else b.song_stats_a_id end,
  a.battle_id,
  case when a.winner = 'fighter_a' then 'fighter_b' else 'fighter_a' end,
  'loss',
  case when a.winner = 'fighter_a' then a.final_vote_right else a.final_vote_left end,
  case when a.winner = 'fighter_a' then a.final_vote_left else a.final_vote_right end,
  a.archived_at
from public.battle_result_archives a
join public.battles b on b.id = a.battle_id
where case when a.winner = 'fighter_a' then b.song_stats_b_id else b.song_stats_a_id end is not null
on conflict (battle_id, song_stats_id) do update
set side = excluded.side,
    result = excluded.result,
    votes_for = excluded.votes_for,
    votes_against = excluded.votes_against,
    event_at = excluded.event_at,
    updated_at = now();

do $$
declare
  stat record;
begin
  for stat in select id from public.battle_song_stats loop
    perform public.refresh_battle_song_stat(stat.id);
  end loop;
end;
$$;

update public.battle_result_archives a
set winner_song_stats_id = case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end,
    opponent_song_stats_id = case when a.winner = 'fighter_a' then b.song_stats_b_id else b.song_stats_a_id end,
    winner_song_battle_count = coalesce(s.battle_count, 0),
    winner_song_wins = coalesce(s.wins, 0),
    winner_song_losses = coalesce(s.losses, 0),
    winner_song_no_contests = coalesce(s.no_contests, 0),
    winner_song_total_votes_for = coalesce(s.total_votes_for, 0),
    winner_song_total_votes_against = coalesce(s.total_votes_against, 0),
    winner_song_honor_board_count = coalesce(s.honor_board_count, 0),
    result_payload = coalesce(a.result_payload, '{}'::jsonb) || jsonb_build_object(
      'songStats',
      jsonb_build_object(
        'winnerSongStatsId', case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end,
        'opponentSongStatsId', case when a.winner = 'fighter_a' then b.song_stats_b_id else b.song_stats_a_id end,
        'winner', public.battle_song_stats_snapshot(case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end),
        'opponent', public.battle_song_stats_snapshot(case when a.winner = 'fighter_a' then b.song_stats_b_id else b.song_stats_a_id end)
      )
    )
from public.battles b
left join public.battle_song_stats s
  on s.id = case when a.winner = 'fighter_a' then b.song_stats_a_id else b.song_stats_b_id end
where b.id = a.battle_id;
