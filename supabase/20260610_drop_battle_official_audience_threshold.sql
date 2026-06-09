-- AIPOGER: a Drop Battle result becomes official only with at least 3 distinct audience voters.
-- Below the threshold, the battle may settle in the arena, but it must not archive to Honor Board
-- or update per-song official battle stats.

create or replace function public.drop_battle_official_audience_min()
returns integer
language sql
immutable
as $$
  select 3;
$$;

revoke all on function public.drop_battle_official_audience_min() from public;
grant execute on function public.drop_battle_official_audience_min() to anon, authenticated, service_role;

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
  signed_audience_count integer := 0;
  guest_audience_count integer := 0;
  audience_voter_count integer := 0;
  official_audience_min integer := public.drop_battle_official_audience_min();
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
    count(*) filter (where voted_for = 'fighter_b')::integer,
    count(distinct user_id)::integer
  into vote_left, vote_right, signed_audience_count
  from public.battle_votes
  where battle_id = p_battle_id
    and voter_role = 'audience'
    and user_id is not null;

  select
    count(*) filter (where voted_for = 'fighter_a')::integer,
    count(*) filter (where voted_for = 'fighter_b')::integer,
    count(distinct guest_id)::integer
  into guest_vote_left, guest_vote_right, guest_audience_count
  from public.battle_guest_votes
  where battle_id = p_battle_id
    and guest_id is not null;

  vote_left := greatest(0, coalesce(vote_left, 0)) + greatest(0, coalesce(guest_vote_left, 0));
  vote_right := greatest(0, coalesce(vote_right, 0)) + greatest(0, coalesce(guest_vote_right, 0));
  audience_voter_count := greatest(0, coalesce(signed_audience_count, 0)) + greatest(0, coalesce(guest_audience_count, 0));

  if audience_voter_count < official_audience_min then
    raise exception 'Official Drop Battle archive requires at least % distinct audience voters', official_audience_min;
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
    coalesce(p_result_payload, '{}'::jsonb) || jsonb_build_object(
      'songStats', stats_snapshot,
      'audienceCount', audience_voter_count,
      'officialAudienceMin', official_audience_min
    ),
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
