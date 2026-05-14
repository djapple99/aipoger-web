create table if not exists public.battle_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fighter_name text not null,
  genre text not null,
  audio_path text not null,
  original_file_name text not null,
  ai_tool text,
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

-- attempt_matchmaking 定義在 supabase/battles.sql（建立 battles 列並寫入 ai_tool_a/b）。
-- 若曾單獨執行本檔舊版函式，請改執行 supabase/battle_queue_ai_tool.sql 以同步欄位與函式本體。
