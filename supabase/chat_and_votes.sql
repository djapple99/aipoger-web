-- ============================================================
-- Realtime（Supabase Dashboard）
-- ------------------------------------------------------------
-- 若前端使用 postgres_changes 訂閱 chat_messages / battle_votes / battles，
-- 請在 Project Settings → Database → Replication（或 Realtime 設定）中
-- 啟用 Logical Replication，並將下列表加入 publication（常見名稱：supabase_realtime）：
--   public.battles
--   public.chat_messages
--   public.battle_votes
-- ============================================================
-- chat_messages：鬥歌場即時聊天訊息
-- ============================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_type text not null check (sender_type in ('audience', 'fighter_a', 'fighter_b')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

-- 所有人都能讀取該 battle 的訊息
drop policy if exists "anyone can read battle chat" on public.chat_messages;
create policy "anyone can read battle chat"
on public.chat_messages
for select
to authenticated
using (true);

-- 登入用戶只能寫入自己的訊息
drop policy if exists "users can insert own messages" on public.chat_messages;
create policy "users can insert own messages"
on public.chat_messages
for insert
to authenticated
with check (auth.uid() = user_id);

-- 刪除自己的訊息（可選）
drop policy if exists "users can delete own messages" on public.chat_messages;
create policy "users can delete own messages"
on public.chat_messages
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists chat_messages_battle_created_idx
on public.chat_messages (battle_id, created_at asc);

-- ============================================================
-- battle_votes：投票記錄（一人一票）
-- ============================================================
create table if not exists public.battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  voted_for text not null check (voted_for in ('fighter_a', 'fighter_b')),
  voter_role text not null check (voter_role in ('audience', 'fighter_a', 'fighter_b')),
  created_at timestamptz not null default now(),
  constraint one_vote_per_user_per_battle unique (battle_id, user_id)
);

alter table public.battle_votes enable row level security;

-- 所有人都能讀取投票結果
drop policy if exists "anyone can read battle votes" on public.battle_votes;
create policy "anyone can read battle votes"
on public.battle_votes
for select
to authenticated
using (true);

-- 已登入用戶可以投票（系統端透過函數檢查是否重複）
drop policy if exists "users can insert votes" on public.battle_votes;
create policy "users can insert votes"
on public.battle_votes
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists battle_votes_battle_idx
on public.battle_votes (battle_id);

create index if not exists battle_votes_count_idx
on public.battle_votes (battle_id, voted_for);

-- ============================================================
-- fighter_profiles：鬥士頭像 + 歌曲封面（讓唱片可以顯示）
-- ============================================================
create table if not exists public.fighter_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  song_cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fighter_profiles enable row level security;

drop policy if exists "users can read fighter profiles" on public.fighter_profiles;
create policy "users can read fighter profiles"
on public.fighter_profiles
for select
to authenticated
using (true);

drop policy if exists "users can insert own fighter profile" on public.fighter_profiles;
create policy "users can insert own fighter profile"
on public.fighter_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own fighter profile" on public.fighter_profiles;
create policy "users can update own fighter profile"
on public.fighter_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop trigger if exists set_fighter_profiles_updated_at on public.fighter_profiles;
create trigger set_fighter_profiles_updated_at
before update on public.fighter_profiles
for each row execute function public.set_updated_at();

-- 自動建立 fighter_profiles（OAuth 觸發）
create or replace function public.handle_new_user_fighter_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fighter_profiles (id, display_name, avatar_url, song_cover_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_fighter_profile on auth.users;
create trigger on_auth_user_created_fighter_profile
after insert on auth.users
for each row execute function public.handle_new_user_fighter_profile();

-- ============================================================
-- 投票 RPC：安全地投票（檢查是否重複）
-- ============================================================
create or replace function public.cast_vote(
  p_battle_id uuid,
  p_voted_for text
)
returns public.battle_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_vote public.battle_votes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_voted_for not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid vote target';
  end if;

  -- 檢查是否已經投過
  select * into existing_vote
  from public.battle_votes
  where battle_id = p_battle_id and user_id = auth.uid();

  if existing_vote.id is not null then
    raise exception 'You have already voted in this battle';
  end if;

  insert into public.battle_votes (battle_id, user_id, voted_for, voter_role)
  values (p_battle_id, auth.uid(), p_voted_for, 'audience')
  returning * into existing_vote;

  return existing_vote;
end;
$$;

revoke all on function public.cast_vote(uuid, text) from public;
grant execute on function public.cast_vote(uuid, text) to authenticated;