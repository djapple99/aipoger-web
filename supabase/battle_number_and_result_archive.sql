-- AIPOGER：Battle 編號 + 成果封存
-- 在 Supabase SQL Editor 執行。可重複執行。

create sequence if not exists public.battle_number_seq;

alter table public.battles
  add column if not exists battle_number bigint,
  add column if not exists result_archived_at timestamptz;

update public.battles
set battle_number = nextval('public.battle_number_seq')
where battle_number is null;

alter table public.battles
  alter column battle_number set default nextval('public.battle_number_seq');

create unique index if not exists battles_battle_number_uidx
on public.battles (battle_number);

create table if not exists public.battle_result_archives (
  battle_id uuid primary key references public.battles(id) on delete cascade,
  battle_number bigint not null,
  battle_code text not null,
  winner text not null check (winner in ('fighter_a', 'fighter_b')),
  winner_user_id uuid not null,
  winner_name text not null,
  winner_song_name text not null,
  winner_ai_tool text,
  opponent_user_id uuid not null,
  opponent_name text not null,
  opponent_song_name text not null,
  final_vote_left integer not null default 0,
  final_vote_right integer not null default 0,
  total_votes integer not null default 0,
  audience_review text,
  result_payload jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now()
);

create unique index if not exists battle_result_archives_code_uidx
on public.battle_result_archives (battle_code);

alter table public.battle_result_archives enable row level security;

drop policy if exists "public can read battle result archives" on public.battle_result_archives;
create policy "public can read battle result archives"
on public.battle_result_archives
for select
to anon, authenticated
using (true);

grant select on table public.battle_result_archives to anon, authenticated;

create or replace function public.format_battle_code(p_battle_number bigint)
returns text
language sql
stable
as $$
  select 'AIPO-' || lpad(coalesce(p_battle_number, 0)::text, 6, '0');
$$;

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
as $$
declare
  battle_row public.battles%rowtype;
  archive_row public.battle_result_archives%rowtype;
  battle_no bigint;
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
    p_winner,
    case when p_winner = 'fighter_a' then battle_row.fighter_a_user_id else battle_row.fighter_b_user_id end,
    case when p_winner = 'fighter_a' then battle_row.fighter_a_name else battle_row.fighter_b_name end,
    case when p_winner = 'fighter_a' then battle_row.song_a_name else battle_row.song_b_name end,
    case when p_winner = 'fighter_a' then battle_row.ai_tool_a else battle_row.ai_tool_b end,
    case when p_winner = 'fighter_a' then battle_row.fighter_b_user_id else battle_row.fighter_a_user_id end,
    case when p_winner = 'fighter_a' then battle_row.fighter_b_name else battle_row.fighter_a_name end,
    case when p_winner = 'fighter_a' then battle_row.song_b_name else battle_row.song_a_name end,
    greatest(0, coalesce(p_final_vote_left, 0)),
    greatest(0, coalesce(p_final_vote_right, 0)),
    greatest(0, coalesce(p_final_vote_left, 0)) + greatest(0, coalesce(p_final_vote_right, 0)),
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
  set result_archived_at = archive_row.archived_at
  where id = p_battle_id;

  return archive_row;
end;
$$;

revoke all on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) from public;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to authenticated;
