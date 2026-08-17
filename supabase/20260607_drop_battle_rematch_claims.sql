-- AIPOGER Drop Battle 5s king-of-hill rematch claims.
-- Scope: 90s Drop Battle only. Do not apply this to 24H Full Song battles.

create table if not exists public.drop_battle_rematch_claims (
  id uuid primary key default gen_random_uuid(),
  source_battle_id uuid not null references public.battles(id) on delete cascade,
  winner_user_id uuid not null references auth.users(id) on delete cascade,
  winner_side text not null check (winner_side in ('fighter_a', 'fighter_b')),
  defender_queue_id uuid not null references public.battle_queue(id) on delete restrict,
  claimer_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'claimed', 'uploaded', 'expired', 'cancelled')),
  claim_window_started_at timestamptz not null,
  claim_window_ends_at timestamptz not null,
  claimed_at timestamptz,
  upload_deadline_at timestamptz,
  next_battle_id uuid references public.battles(id) on delete set null,
  next_queue_id uuid references public.battle_queue(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drop_battle_rematch_claims_source_unique unique (source_battle_id),
  constraint drop_battle_rematch_claims_upload_requires_claimer check (
    status <> 'claimed' or (claimer_user_id is not null and claimed_at is not null and upload_deadline_at is not null)
  ),
  constraint drop_battle_rematch_claims_uploaded_requires_next check (
    status <> 'uploaded' or (claimer_user_id is not null and next_battle_id is not null and next_queue_id is not null)
  )
);

create index if not exists drop_battle_rematch_claims_status_deadline_idx
on public.drop_battle_rematch_claims (status, claim_window_ends_at, upload_deadline_at);

create index if not exists drop_battle_rematch_claims_claimer_active_idx
on public.drop_battle_rematch_claims (claimer_user_id, status, upload_deadline_at)
where claimer_user_id is not null and status = 'claimed';

alter table public.drop_battle_rematch_claims enable row level security;

drop policy if exists "authenticated can read drop rematch claims" on public.drop_battle_rematch_claims;
create policy "authenticated can read drop rematch claims"
on public.drop_battle_rematch_claims
for select
to authenticated
using (true);

drop policy if exists "service can manage drop rematch claims" on public.drop_battle_rematch_claims;
create policy "service can manage drop rematch claims"
on public.drop_battle_rematch_claims
for all
to service_role
using (true)
with check (true);

drop trigger if exists set_drop_battle_rematch_claims_updated_at on public.drop_battle_rematch_claims;
create trigger set_drop_battle_rematch_claims_updated_at
before update on public.drop_battle_rematch_claims
for each row
execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.drop_battle_rematch_claims;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
