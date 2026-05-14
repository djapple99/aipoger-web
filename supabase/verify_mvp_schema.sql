-- =============================================================================
-- 僅驗證（SELECT），不變更資料。請在執行 mvp / publication 之後於 SQL Editor 執行。
-- =============================================================================

-- 2) user_profiles：應有 apc_balance、level、total_wins、total_losses
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'user_profiles'
  AND c.column_name IN ('apc_balance', 'level', 'total_wins', 'total_losses', 'last_sign_in_at', 'ai_tool_preference')
ORDER BY c.column_name;

-- 3) battles：應有 ai_tool_a、ai_tool_b、winner
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'battles'
  AND c.column_name IN ('ai_tool_a', 'ai_tool_b', 'winner')
ORDER BY c.column_name;

-- 4) Realtime：三表應在 publication supabase_realtime 內（若查無列，請到 Dashboard 手動加入或執行 chat_and_votes.sql 末尾）
SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('battles', 'chat_messages', 'battle_votes')
ORDER BY tablename;

-- 預期：user_profiles 至少 4 列（+ last_sign_in_at 等）、battles 3 列、publication 3 列。
