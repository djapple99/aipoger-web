-- AIPOGER Q Crash: immutable five-axis listener feedback.
-- Additive migration. Feedback remains sealed until the Q Crash is settled.

create extension if not exists pgcrypto;

create table if not exists public.q_crash_feedback (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  queue_id uuid not null references public.battle_queue(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_key text not null check (feedback_key in ('rhyme', 'impact', 'melody', 'emotion', 'structure')),
  created_at timestamptz not null default now(),
  constraint q_crash_feedback_one_per_work_key unique (battle_id, user_id, queue_id, feedback_key)
);

create index if not exists q_crash_feedback_battle_queue_key_idx
on public.q_crash_feedback (battle_id, queue_id, feedback_key);

create index if not exists q_crash_feedback_user_id_idx
on public.q_crash_feedback (user_id);

alter table public.q_crash_feedback enable row level security;

revoke all on table public.q_crash_feedback from anon, authenticated;
grant all on table public.q_crash_feedback to service_role;

drop policy if exists q_crash_feedback_service_manage on public.q_crash_feedback;
create policy q_crash_feedback_service_manage
on public.q_crash_feedback
for all
to service_role
using (true)
with check (true);

create or replace function public.validate_q_crash_feedback()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_battle_type text;
  target_status text;
  target_voting_ends_at timestamptz;
  target_queue_a_id uuid;
  target_queue_b_id uuid;
  target_fighter_a_user_id uuid;
  target_fighter_b_user_id uuid;
begin
  select
    battle_type,
    status,
    voting_ends_at,
    queue_a_id,
    queue_b_id,
    fighter_a_user_id,
    fighter_b_user_id
  into
    target_battle_type,
    target_status,
    target_voting_ends_at,
    target_queue_a_id,
    target_queue_b_id,
    target_fighter_a_user_id,
    target_fighter_b_user_id
  from public.battles
  where id = new.battle_id;

  if not found or target_battle_type <> 'q_crash' then
    raise exception 'Q Crash feedback requires a Q Crash battle';
  end if;

  if target_status <> 'q_crash_voting'
    or target_voting_ends_at is null
    or target_voting_ends_at <= now() then
    raise exception 'Q Crash feedback is closed';
  end if;

  if new.queue_id <> target_queue_a_id and new.queue_id <> target_queue_b_id then
    raise exception 'Q Crash feedback work does not belong to this battle';
  end if;

  if new.user_id = target_fighter_a_user_id or new.user_id = target_fighter_b_user_id then
    raise exception 'Q Crash work owners cannot submit feedback';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_q_crash_feedback() from public, anon, authenticated;
grant execute on function public.validate_q_crash_feedback() to service_role;

drop trigger if exists trg_validate_q_crash_feedback on public.q_crash_feedback;
create trigger trg_validate_q_crash_feedback
before insert on public.q_crash_feedback
for each row
execute function public.validate_q_crash_feedback();

create or replace function public.reject_q_crash_feedback_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Q Crash feedback is immutable';
end;
$$;

revoke all on function public.reject_q_crash_feedback_changes() from public, anon, authenticated;
grant execute on function public.reject_q_crash_feedback_changes() to service_role;

drop trigger if exists trg_reject_q_crash_feedback_changes on public.q_crash_feedback;
create trigger trg_reject_q_crash_feedback_changes
before update or delete on public.q_crash_feedback
for each row
execute function public.reject_q_crash_feedback_changes();

comment on table public.q_crash_feedback is
'Server-only immutable per-account Q Crash feedback. Aggregates remain sealed until official settlement.';

comment on column public.q_crash_feedback.feedback_key is
'One of rhyme, impact, melody, emotion, or structure; each account may select each key once per work.';
