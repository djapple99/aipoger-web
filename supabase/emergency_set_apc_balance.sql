-- ============================================================
-- 緊急：補足 APC（僅在 SQL Editor 以 postgres 執行；會繞過 RLS）
-- ------------------------------------------------------------
-- 執行前請把 UUID 改成目標使用者（須已存在於 auth.users / user_profiles）
-- ============================================================

UPDATE public.user_profiles
SET apc_balance = 1000
WHERE id = '3336dd37-7fe8-4203-bd55-9eb1067ca047';

-- 若 UPDATE 影響 0 列，代表尚無 profile 列，可改用手動 INSERT（欄位依你專案 mvp 版 user_profiles 為準），例如：
-- INSERT INTO public.user_profiles (id, apc_balance, level, total_wins, total_losses)
-- VALUES ('3336dd37-7fe8-4203-bd55-9eb1067ca047', 1000, 1, 0, 0)
-- ON CONFLICT (id) DO UPDATE SET apc_balance = excluded.apc_balance;
