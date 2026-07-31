-- AIPOGER Q Crash: asynchronous 60-second Drop Battle.
-- Additive migration. Existing live Drop Battle behavior is unchanged.

create extension if not exists pgcrypto;

alter table public.battle_queue
  add column if not exists drop_duration_seconds numeric;

alter table public.battle_queue
  drop constraint if exists battle_queue_drop_duration_seconds_check;

alter table public.battle_queue
  add constraint battle_queue_drop_duration_seconds_check
  check (
    drop_duration_seconds is null
    or (drop_duration_seconds > 0 and drop_duration_seconds <= 60)
  );

create table if not exists public.q_crash_cards (
  id uuid primary key default gen_random_uuid(),
  founder_user_id uuid not null references auth.users(id) on delete cascade,
  founder_queue_id uuid not null unique references public.battle_queue(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  challenger_user_id uuid references auth.users(id) on delete set null,
  challenger_queue_id uuid unique references public.battle_queue(id) on delete restrict,
  battle_id uuid unique references public.battles(id) on delete set null,
  status text not null default 'q_crash_pending_invite',
  duration_minutes integer not null default 120,
  invite_expires_at timestamptz not null default (now() + interval '24 hours'),
  voting_started_at timestamptz,
  voting_ends_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint q_crash_cards_status_check check (
    status in (
      'q_crash_pending_invite',
      'q_crash_joining',
      'q_crash_voting',
      'q_crash_finished',
      'q_crash_insufficient',
      'q_crash_cancelled'
    )
  ),
  constraint q_crash_cards_duration_check check (duration_minutes in (30, 120, 360, 1440))
);

alter table public.battles
  add column if not exists q_crash_card_id uuid references public.q_crash_cards(id) on delete set null,
  add column if not exists voting_ends_at timestamptz,
  add column if not exists winner_queue_id uuid references public.battle_queue(id) on delete set null;

alter table public.battles drop constraint if exists battles_status_check;
alter table public.battles
  add constraint battles_status_check
  check (
    status in (
      'pending',
      'live',
      'finished',
      'cancelled',
      'active',
      'completed',
      'expired',
      'ghost_battle',
      'public_voting',
      'cancelled_no_challenger',
      'cancelled_founder',
      'q_crash_voting',
      'q_crash_finished',
      'q_crash_insufficient',
      'q_crash_cancelled'
    )
  );

alter table public.battles drop constraint if exists battles_battle_type_check;
alter table public.battles
  add constraint battles_battle_type_check
  check (battle_type in ('formal', 'ghost_battle', 'public_voting', 'ai_music_challenge', 'q_crash'));

create table if not exists public.q_crash_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  voted_for text not null check (voted_for in ('fighter_a', 'fighter_b')),
  created_at timestamptz not null default now(),
  constraint q_crash_votes_one_account_per_battle unique (battle_id, user_id)
);

create index if not exists q_crash_cards_pending_expiry_idx
on public.q_crash_cards (status, invite_expires_at)
where status = 'q_crash_pending_invite';

create index if not exists q_crash_cards_voting_deadline_idx
on public.q_crash_cards (status, voting_ends_at)
where status = 'q_crash_voting';

create index if not exists q_crash_cards_founder_active_idx
on public.q_crash_cards (founder_user_id, status, created_at desc);

create index if not exists q_crash_votes_battle_side_idx
on public.q_crash_votes (battle_id, voted_for);

create index if not exists battles_q_crash_deadline_idx
on public.battles (battle_type, status, voting_ends_at)
where battle_type = 'q_crash';

alter table public.q_crash_cards enable row level security;
alter table public.q_crash_votes enable row level security;

revoke all on table public.q_crash_cards from anon, authenticated;
revoke all on table public.q_crash_votes from anon, authenticated;
grant all on table public.q_crash_cards to service_role;
grant all on table public.q_crash_votes to service_role;

drop policy if exists q_crash_cards_service_manage on public.q_crash_cards;
create policy q_crash_cards_service_manage
on public.q_crash_cards
for all
to service_role
using (true)
with check (true);

drop policy if exists q_crash_votes_service_manage on public.q_crash_votes;
create policy q_crash_votes_service_manage
on public.q_crash_votes
for all
to service_role
using (true)
with check (true);

create or replace function public.q_crash_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.q_crash_set_updated_at() from public, anon, authenticated;
grant execute on function public.q_crash_set_updated_at() to service_role;

drop trigger if exists trg_q_crash_cards_updated_at on public.q_crash_cards;
create trigger trg_q_crash_cards_updated_at
before update on public.q_crash_cards
for each row
execute function public.q_crash_set_updated_at();

comment on table public.q_crash_cards is
'Q Crash invitation/card lifecycle. Voting starts only after two locked queue entries exist.';

comment on table public.q_crash_votes is
'Server-only sealed Q Crash votes. Tallies stay hidden until the server settles the deadline.';

comment on column public.battles.winner_queue_id is
'Canonical winning work entry for song-first Q Crash results.';

comment on column public.battles.voting_ends_at is
'Server-enforced Q Crash voting deadline; never inferred from the live Battle schedule.';

create or replace function public.block_unsealed_q_crash_battle_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_battle_type text;
  target_status text;
begin
  select battle_type, status
  into target_battle_type, target_status
  from public.battles
  where id = new.battle_id;

  if target_battle_type = 'q_crash'
    and target_status = 'q_crash_voting'
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Q Crash votes must use the sealed server vote route';
  end if;
  return new;
end;
$$;

revoke all on function public.block_unsealed_q_crash_battle_votes() from public, anon, authenticated;
grant execute on function public.block_unsealed_q_crash_battle_votes() to service_role;

drop trigger if exists trg_block_unsealed_q_crash_battle_votes on public.battle_votes;
create trigger trg_block_unsealed_q_crash_battle_votes
before insert or update on public.battle_votes
for each row
execute function public.block_unsealed_q_crash_battle_votes();
