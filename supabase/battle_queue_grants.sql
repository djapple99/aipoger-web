-- ============================================================
-- battle_queue：補 GRANT（INSERT 成功但 0 列回傳／或 400 時先跑）
-- ------------------------------------------------------------
-- PostgREST 需要 authenticated 角色對表有 INSERT/SELECT/UPDATE 權限。
-- 在 SQL Editor 執行；可重複執行。
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.battle_queue to authenticated;

-- hook-cut 上傳後會立刻呼叫 RPC（需函式已部署，見 battle_queue_ai_tool.sql / battles.sql）
grant execute on function public.attempt_matchmaking(uuid) to authenticated;

-- 配對頁「跳過配對（測試擂臺）」：create_test_arena_battle（見 create_test_arena_battle_rpc.sql）
grant execute on function public.create_test_arena_battle(text, text, text, text, text, text) to authenticated;

-- 若仍無法寫入，請確認 RLS policy 已建立（見 battle_matchmaking.sql）：
--   "users can insert own queue row" / read / update
