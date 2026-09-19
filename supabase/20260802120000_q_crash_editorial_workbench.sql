-- AIPOGER Q Crash: owner-only editorial metadata for each submitted work.
-- This never changes the Drop audio, sealed votes, winner, or Battle archive.

create extension if not exists pgcrypto;

create table if not exists public.q_crash_work_editorial (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null unique references public.battle_queue(id) on delete cascade,
  cover_path text,
  full_song_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint q_crash_work_editorial_cover_path_length_check
    check (cover_path is null or char_length(cover_path) between 1 and 500),
  constraint q_crash_work_editorial_full_song_url_check
    check (full_song_url is null or (char_length(full_song_url) between 1 and 500 and full_song_url ~* '^https://'))
);

create index if not exists q_crash_work_editorial_updated_at_idx
on public.q_crash_work_editorial (updated_at desc);

create table if not exists public.q_crash_work_editorial_audit (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.battle_queue(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  previous_cover_path text,
  next_cover_path text,
  previous_full_song_url text,
  next_full_song_url text,
  changed_at timestamptz not null default now()
);

create index if not exists q_crash_work_editorial_audit_queue_idx
on public.q_crash_work_editorial_audit (queue_id, changed_at desc);

alter table public.q_crash_work_editorial enable row level security;
alter table public.q_crash_work_editorial_audit enable row level security;

revoke all on table public.q_crash_work_editorial from public, anon, authenticated;
revoke all on table public.q_crash_work_editorial_audit from public, anon, authenticated;
grant all on table public.q_crash_work_editorial to service_role;
grant all on table public.q_crash_work_editorial_audit to service_role;

drop policy if exists q_crash_work_editorial_service_manage on public.q_crash_work_editorial;
create policy q_crash_work_editorial_service_manage
on public.q_crash_work_editorial
for all
to service_role
using (true)
with check (true);

drop policy if exists q_crash_work_editorial_audit_service_manage on public.q_crash_work_editorial_audit;
create policy q_crash_work_editorial_audit_service_manage
on public.q_crash_work_editorial_audit
for all
to service_role
using (true)
with check (true);

create or replace function public.q_crash_work_editorial_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.q_crash_work_editorial_set_updated_at() from public, anon, authenticated;
grant execute on function public.q_crash_work_editorial_set_updated_at() to service_role;

drop trigger if exists trg_q_crash_work_editorial_updated_at on public.q_crash_work_editorial;
create trigger trg_q_crash_work_editorial_updated_at
before update on public.q_crash_work_editorial
for each row
execute function public.q_crash_work_editorial_set_updated_at();

comment on table public.q_crash_work_editorial is
'Owner-only Q Crash display metadata. It is separate from sealed Battle evidence and results.';

comment on table public.q_crash_work_editorial_audit is
'Owner-only audit trail for Q Crash cover and complete-version link edits.';

comment on column public.q_crash_work_editorial.cover_path is
'Stable private Storage object path. Public routes create short-lived signed URLs.';

comment on column public.q_crash_work_editorial.full_song_url is
'Optional external HTTPS page for the complete version, shown only after an official result.';
