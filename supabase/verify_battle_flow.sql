-- ============================================================
-- 驗證：Storage bucket、battles 資料、佇列（SQL Editor 執行）
-- ------------------------------------------------------------
-- 前端請設 NEXT_PUBLIC_AUTH_BYPASS=false，再走：
--   setup → hook-cut → matchmaking → /battle/[真實 UUID]
-- ============================================================

-- 1) bucket 是否存在
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'battle-audio';

-- 2) 最近擂台列（應有 fighter 名、曲名、audio_*_path）
SELECT id, status, genre,
       fighter_a_name, fighter_b_name, song_a_name, song_b_name,
       audio_a_path, audio_b_path, created_at
FROM public.battles
ORDER BY created_at DESC
LIMIT 5;

-- 3) 最近配對佇列（matched 時 match_group_id = battles.id）
SELECT id, user_id, status, genre, match_group_id, audio_path, created_at
FROM public.battle_queue
ORDER BY created_at DESC
LIMIT 8;

-- 4) 指定使用者的 APC（將 UUID 換成自己）
SELECT id, apc_balance, level, total_wins
FROM public.user_profiles
WHERE id = '3336dd37-7fe8-4203-bd55-9eb1067ca047';
