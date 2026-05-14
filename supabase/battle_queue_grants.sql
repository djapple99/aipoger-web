-- ============================================================
-- battle_queue：補 GRANT（INSERT 成功但 0 列回傳／或 400 時先跑）
-- ------------------------------------------------------------
-- PostgREST 需要 authenticated 角色對表有 INSERT/SELECT/UPDATE 權限。
-- 在 SQL Editor 執行；可重複執行。
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.battle_queue to authenticated;

-- 若仍無法寫入，請確認 RLS policy 已建立（見 battle_matchmaking.sql）：
--   "users can insert own queue row" / read / update
