-- ============================================================
-- 擂台觀戰：RLS + Storage 讀取（在 SQL Editor 執行一次即可，可重複執行）
-- ------------------------------------------------------------
-- 1) authenticated：可讀 battles / chat_messages / battle_votes / fighter_profiles
-- 2) anon：同上（未登入觀戰列表、匿名 JWT 簽音檔 URL）
-- 3) 允許讀取「出現在任一 battle 音檔路徑」的 storage.objects（雙方檔案）
-- ============================================================

-- ---- Table privileges（若專案曾 revoke 過會補回）----
grant usage on schema public to postgres, anon, authenticated, service_role;
grant select on table public.battles to authenticated;
grant select on table public.chat_messages to authenticated;
grant select on table public.battle_votes to authenticated;
grant select on table public.fighter_profiles to authenticated;

-- ---- battles：僅保留一組清楚的 SELECT（舊名稱先 drop）----
drop policy if exists "authenticated can read battles" on public.battles;
drop policy if exists "Anyone can read battles" on public.battles;
drop policy if exists "battles_select_authenticated" on public.battles;

create policy "battles_select_authenticated"
on public.battles
for select
to authenticated
using (true);

-- ---- chat_messages ----
drop policy if exists "anyone can read battle chat" on public.chat_messages;
drop policy if exists "chat_messages_select_authenticated" on public.chat_messages;

create policy "chat_messages_select_authenticated"
on public.chat_messages
for select
to authenticated
using (true);

-- ---- battle_votes ----
drop policy if exists "anyone can read battle votes" on public.battle_votes;
drop policy if exists "battle_votes_select_authenticated" on public.battle_votes;

create policy "battle_votes_select_authenticated"
on public.battle_votes
for select
to authenticated
using (true);

-- ---- Storage：除「自己資料夾」外，可讀 battles 引用到的音檔路徑 ----
drop policy if exists "authenticated read battle referenced audio" on storage.objects;

create policy "authenticated read battle referenced audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'battle-audio'
  and exists (
    select 1
    from public.battles b
    where b.audio_a_path = storage.objects.name
       or b.audio_b_path = storage.objects.name
  )
);

-- ---- 訪客（anon）：讀公開擂台（未登入觀戰列表／匿名 JWT 簽音檔 URL）----
grant select on table public.battles to anon;
grant select on table public.chat_messages to anon;
grant select on table public.battle_votes to anon;
grant select on table public.fighter_profiles to anon;

drop policy if exists battles_select_anon on public.battles;
create policy battles_select_anon
on public.battles
for select
to anon
using (true);

drop policy if exists chat_messages_select_anon on public.chat_messages;
create policy chat_messages_select_anon
on public.chat_messages
for select
to anon
using (true);

drop policy if exists battle_votes_select_anon on public.battle_votes;
create policy battle_votes_select_anon
on public.battle_votes
for select
to anon
using (true);

drop policy if exists fighter_profiles_select_anon on public.fighter_profiles;
create policy fighter_profiles_select_anon
on public.fighter_profiles
for select
to anon
using (true);

drop policy if exists anon_read_battle_referenced_audio on storage.objects;
create policy anon_read_battle_referenced_audio
on storage.objects
for select
to anon
using (
  bucket_id = 'battle-audio'
  and exists (
    select 1
    from public.battles b
    where b.audio_a_path = storage.objects.name
       or b.audio_b_path = storage.objects.name
  )
);
