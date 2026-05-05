create table if not exists public.battle_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fighter_name text not null,
  genre text not null,
  audio_path text not null,
  original_file_name text not null,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  opponent_user_id uuid references auth.users(id) on delete set null,
  match_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists battle_queue_waiting_idx
on public.battle_queue (status, genre, created_at);

alter table public.battle_queue enable row level security;

drop policy if exists "users can insert own queue row" on public.battle_queue;
create policy "users can insert own queue row"
on public.battle_queue
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can read own queue row" on public.battle_queue;
create policy "users can read own queue row"
on public.battle_queue
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can update own queue row" on public.battle_queue;
create policy "users can update own queue row"
on public.battle_queue
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_battle_queue_updated_at on public.battle_queue;
create trigger set_battle_queue_updated_at
before update on public.battle_queue
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
  generated_match_id uuid;
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

  generated_match_id := gen_random_uuid();

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = opponent_row.user_id,
    match_group_id = generated_match_id
  where id = me_row.id;

  update public.battle_queue
  set
    status = 'matched',
    opponent_user_id = me_row.user_id,
    match_group_id = generated_match_id
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
