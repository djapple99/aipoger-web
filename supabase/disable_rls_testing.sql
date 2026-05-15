-- 僅供本機 / 暫時測試：關閉 RLS 方便直接讀寫（勿在正式環境長期保留）
-- 在 Supabase SQL Editor 執行；若要還原請改為 ENABLE ROW LEVEL SECURITY 並還原 policies。

ALTER TABLE public.battles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
