-- AIPOGER Battle Lifecycle / User History
-- Run in Supabase SQL Editor. Safe to run multiple times.
--
-- Purpose:
-- 1) Let the server cron settle finished battles with service role.
-- 2) Keep each user's battle history after a 90s Hook Battle closes.

grant execute on function public.settle_90s_battle(uuid, text) to service_role;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb) to service_role;

create table if not exists public.user_battle_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  battle_id uuid references public.battles(id) on delete set null,
  battle_kind text not null default '90s_hook',
  opponent_user_id uuid references auth.users(id) on delete set null,
  opponent_name text,
  song_name text,
  result text not null default 'no_contest',
  votes_for integer not null default 0,
  votes_against integer not null default 0,
  battle_code text,
  created_at timestamptz not null default now(),
  constraint user_battle_history_result_check
    check (result in ('win', 'loss', 'draw', 'no_contest', 'cancelled'))
);

create unique index if not exists user_battle_history_user_battle_kind_idx
on public.user_battle_history (user_id, battle_id, battle_kind)
where battle_id is not null;

create index if not exists user_battle_history_user_created_idx
on public.user_battle_history (user_id, created_at desc);

alter table public.user_battle_history enable row level security;

grant select on table public.user_battle_history to authenticated;

drop policy if exists user_battle_history_read_own on public.user_battle_history;
create policy user_battle_history_read_own
on public.user_battle_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists service_manage_user_battle_history on public.user_battle_history;
create policy service_manage_user_battle_history
on public.user_battle_history
for all
to service_role
using (true)
with check (true);
