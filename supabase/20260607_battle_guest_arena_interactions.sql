-- AIPOGER Battle arena guest interactions.
-- Scope: 90s Drop Battle arena only. Bar Heartbreak remains authenticated for voting/comments.

create table if not exists public.battle_guest_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  guest_id text not null check (guest_id ~ '^guest-[A-Za-z0-9-]{8,74}$'),
  voted_for text not null check (voted_for in ('fighter_a', 'fighter_b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battle_guest_votes_one_per_guest unique (battle_id, guest_id)
);

create index if not exists battle_guest_votes_battle_idx
on public.battle_guest_votes (battle_id, voted_for);

alter table public.battle_guest_votes enable row level security;

grant select on table public.battle_guest_votes to anon, authenticated;

drop policy if exists battle_guest_votes_public_read on public.battle_guest_votes;
create policy battle_guest_votes_public_read
on public.battle_guest_votes
for select
to anon, authenticated
using (true);

drop policy if exists service_can_manage_battle_guest_votes on public.battle_guest_votes;
create policy service_can_manage_battle_guest_votes
on public.battle_guest_votes
for all
to service_role
using (true)
with check (true);

drop trigger if exists set_battle_guest_votes_updated_at on public.battle_guest_votes;
create trigger set_battle_guest_votes_updated_at
before update on public.battle_guest_votes
for each row
execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.battle_guest_votes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

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
    result_payload
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
    coalesce(p_result_payload, '{}'::jsonb)
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
      archived_at = now()
  returning * into archive_row;

  update public.battles
  set winner = effective_winner,
      status = 'finished',
      battle_ended_at = coalesce(battle_ended_at, now()),
      updated_at = now()
  where id = battle_row.id;

  return archive_row;
end;
$archive_battle_result$;

revoke all on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) from public;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to authenticated;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to service_role;
