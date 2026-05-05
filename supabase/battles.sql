create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  queue_a_id uuid not null references public.battle_queue(id) on delete restrict,
  queue_b_id uuid not null references public.battle_queue(id) on delete restrict,
  fighter_a_user_id uuid not null references auth.users(id) on delete restrict,
  fighter_b_user_id uuid not null references auth.users(id) on delete restrict,
  fighter_a_name text not null,
  fighter_b_name text not null,
  song_a_name text not null,
  song_b_name text not null,
  audio_a_path text not null,
  audio_b_path text not null,
  genre text not null,
  status text not null default 'live' check (status in ('live', 'finished', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battles_distinct_fighters check (fighter_a_user_id <> fighter_b_user_id),
  constraint battles_distinct_queues check (queue_a_id <> queue_b_id)
);

create index if not exists battles_status_created_idx
on public.battles (status, created_at desc);

alter table public.battles enable row level security;

drop policy if exists "authenticated can read battles" on public.battles;
create policy "authenticated can read battles"
on public.battles
for select
to authenticated
using (true);

drop policy if exists "service can manage battles" on public.battles;
create policy "service can manage battles"
on public.battles
for all
to service_role
using (true)
with check (true);

drop trigger if exists set_battles_updated_at on public.battles;
create trigger set_battles_updated_at
before update on public.battles
for each row
execute function public.set_updated_at();

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
    status
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
    'live'
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
