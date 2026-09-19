-- AIPOGER Q Crash: post-result listening preference.
-- This is a separate signal from the official sealed vote and never changes
-- the winner, five-axis feedback, Battle archive, song stats, or Showtime.

create extension if not exists pgcrypto;

create table if not exists public.q_crash_post_result_preferences (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_side text not null check (preferred_side in ('fighter_a', 'fighter_b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint q_crash_post_result_preferences_one_account unique (battle_id, user_id)
);

create index if not exists q_crash_post_result_preferences_battle_side_idx
on public.q_crash_post_result_preferences (battle_id, preferred_side);

alter table public.q_crash_post_result_preferences enable row level security;

revoke all on table public.q_crash_post_result_preferences from public, anon, authenticated;
grant all on table public.q_crash_post_result_preferences to service_role;

drop policy if exists q_crash_post_result_preferences_service_manage on public.q_crash_post_result_preferences;
create policy q_crash_post_result_preferences_service_manage
on public.q_crash_post_result_preferences
for all
to service_role
using (true)
with check (true);

create or replace function public.validate_q_crash_post_result_preference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_battle_type text;
  target_status text;
  target_fighter_a_user_id uuid;
  target_fighter_b_user_id uuid;
begin
  select battle_type, status, fighter_a_user_id, fighter_b_user_id
  into target_battle_type, target_status, target_fighter_a_user_id, target_fighter_b_user_id
  from public.battles
  where id = new.battle_id;

  if not found or target_battle_type <> 'q_crash' then
    raise exception 'Post-result preference requires a Q Crash battle';
  end if;

  if target_status <> 'q_crash_finished' then
    raise exception 'Post-result preference opens only after an official Q Crash result';
  end if;

  if new.user_id = target_fighter_a_user_id or new.user_id = target_fighter_b_user_id then
    raise exception 'Q Crash work owners cannot submit post-result preferences';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_q_crash_post_result_preference() from public, anon, authenticated;
grant execute on function public.validate_q_crash_post_result_preference() to service_role;

drop trigger if exists trg_validate_q_crash_post_result_preference on public.q_crash_post_result_preferences;
create trigger trg_validate_q_crash_post_result_preference
before insert or update on public.q_crash_post_result_preferences
for each row
execute function public.validate_q_crash_post_result_preference();

comment on table public.q_crash_post_result_preferences is
'Optional signed-in listener preference after an official Q Crash result. This signal is separate from the sealed official vote.';

comment on column public.q_crash_post_result_preferences.preferred_side is
'The work the listener prefers after the result is public; changing it never changes the official result.';
