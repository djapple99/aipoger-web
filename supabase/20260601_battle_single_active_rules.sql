-- AIPOGER Battle active-entry rules
-- Run in Supabase SQL Editor. Safe to run more than once.
--
-- Product rule:
-- 1. Drop Battle and 24H Full Song can coexist for the same account.
-- 2. 24H Full Song is not "once per calendar day".
-- 3. Each account can have only one active 24H Full Song entry at a time.
-- 4. Active 24H statuses are queued / matched / live.
-- 5. Finished / cancelled / expired entries release the user to create the next one.

drop index if exists public.daily_battle_entries_one_per_user_per_taipei_day;

create unique index if not exists daily_battle_entries_one_active_per_user
on public.daily_battle_entries (user_id)
where status in ('queued', 'matched', 'live');

-- Keep old Drop Battle invites from occupying the single active Drop lock forever.
-- The app also runs /api/battle-pool/process-fallbacks from Vercel Cron every 5 minutes.
update public.battle_queue
set status = 'cancelled',
    updated_at = now()
where status in ('searching', 'waiting', 'waiting_challenge', 'public_voting', 'ghost_battle')
  and expires_at <= now();
