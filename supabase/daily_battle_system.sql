-- AIPOGER Daily Battle / 24H Hook Battle
-- 在 Supabase SQL Editor 執行。可重複執行。
--
-- Phase 1 rule:
-- 每個帳號同時間最多 1 場 24H Full Song active entry。
-- Drop Battle 與 24H Full Song 可共存；此限制只管 24H Full Song。
-- queued / matched / live 會佔用名額；finished / cancelled / expired 釋放名額。

create table if not exists public.daily_battle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  genre text not null default 'AI Music',
  bpm integer,
  mood text,
  ai_tool text,
  pairing_mode text not null default 'auto',
  playback_mode text not null default 'full_track',
  audio_path text not null,
  cover_url text,
  avatar_url text,
  lyrics text,
  status text not null default 'queued',
  entry_date_taipei date not null default ((now() at time zone 'Asia/Taipei')::date),
  matched_battle_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_battle_entries_status_check
    check (status in ('queued', 'matched', 'live', 'finished', 'cancelled', 'expired')),
  constraint daily_battle_entries_pairing_mode_check
    check (pairing_mode in ('auto', 'invite')),
  constraint daily_battle_entries_playback_mode_check
    check (playback_mode in ('full_track')),
  constraint daily_battle_entries_title_not_blank
    check (length(trim(title)) > 0),
  constraint daily_battle_entries_audio_not_blank
    check (length(trim(audio_path)) > 0)
);

alter table public.daily_battle_entries
  add column if not exists pairing_mode text not null default 'auto';

alter table public.daily_battle_entries
  add column if not exists playback_mode text not null default 'full_track';

alter table public.daily_battle_entries
  drop constraint if exists daily_battle_entries_pairing_mode_check;

alter table public.daily_battle_entries
  add constraint daily_battle_entries_pairing_mode_check
  check (pairing_mode in ('auto', 'invite'));

alter table public.daily_battle_entries
  drop constraint if exists daily_battle_entries_playback_mode_check;

alter table public.daily_battle_entries
  add constraint daily_battle_entries_playback_mode_check
  check (playback_mode in ('full_track'));

drop index if exists public.daily_battle_entries_one_per_user_per_taipei_day;

create unique index if not exists daily_battle_entries_one_active_per_user
on public.daily_battle_entries (user_id)
where status in ('queued', 'matched', 'live');

create index if not exists daily_battle_entries_matchmaking_idx
on public.daily_battle_entries (status, genre, created_at)
where status = 'queued';

alter table public.daily_battle_entries enable row level security;

grant select on table public.daily_battle_entries to anon, authenticated;
grant insert, update on table public.daily_battle_entries to authenticated;

drop policy if exists daily_battle_entries_read_own on public.daily_battle_entries;
drop policy if exists daily_battle_entries_public_read on public.daily_battle_entries;
create policy daily_battle_entries_public_read
on public.daily_battle_entries
for select
to anon, authenticated
using (true);

drop policy if exists daily_battle_entries_insert_own on public.daily_battle_entries;
create policy daily_battle_entries_insert_own
on public.daily_battle_entries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists daily_battle_entries_update_own on public.daily_battle_entries;
create policy daily_battle_entries_update_own
on public.daily_battle_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- NOTE:
-- Avoid plpgsql dollar-quoted function blocks here.
-- Some SQL editors accidentally run partial buffers and throw:
-- "unterminated dollar-quoted string".
-- Active-entry limit is enforced by unique index:
-- daily_battle_entries_one_active_per_user

create table if not exists public.daily_battles (
  id uuid primary key default gen_random_uuid(),
  entry_a_id uuid not null references public.daily_battle_entries(id) on delete restrict,
  entry_b_id uuid not null references public.daily_battle_entries(id) on delete restrict,
  status text not null default 'live',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '24 hours'),
  winner_entry_id uuid references public.daily_battle_entries(id) on delete set null,
  result_card_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_battles_status_check check (status in ('live', 'settling', 'finished', 'cancelled')),
  constraint daily_battles_distinct_entries check (entry_a_id <> entry_b_id)
);

create index if not exists daily_battles_live_idx
on public.daily_battles (status, ends_at)
where status = 'live';

alter table public.daily_battles enable row level security;

grant select on table public.daily_battles to anon, authenticated;
grant insert, update on table public.daily_battles to authenticated;

drop policy if exists daily_battles_public_read on public.daily_battles;
create policy daily_battles_public_read
on public.daily_battles
for select
to anon, authenticated
using (true);

create table if not exists public.daily_battle_votes (
  battle_id uuid not null references public.daily_battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  picked_entry_id uuid not null references public.daily_battle_entries(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (battle_id, user_id),
  constraint daily_battle_votes_comment_required check (length(trim(comment)) >= 2)
);

alter table public.daily_battle_votes enable row level security;

grant select on table public.daily_battle_votes to anon, authenticated;
grant insert, update on table public.daily_battle_votes to authenticated;

drop policy if exists daily_battle_votes_public_read on public.daily_battle_votes;
create policy daily_battle_votes_public_read
on public.daily_battle_votes
for select
to anon, authenticated
using (true);

drop policy if exists daily_battle_votes_write_own on public.daily_battle_votes;
create policy daily_battle_votes_write_own
on public.daily_battle_votes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists daily_battle_votes_update_own on public.daily_battle_votes;
create policy daily_battle_votes_update_own
on public.daily_battle_votes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
