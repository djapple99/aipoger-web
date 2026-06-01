-- ============================================================
-- 緊急：建立 battle-audio bucket + Storage policies（bucket 不存在時）
-- ------------------------------------------------------------
-- 在 Supabase Dashboard → SQL Editor 以 postgres 執行；可重複執行。
-- 執行後請到 Storage 確認已出現 battle-audio。
-- 擂台讀對手音檔另需執行：battle_arena_rls_and_storage.sql（若尚未）
-- ============================================================

-- ---- 1) Bucket（無則建立，有則更新 MIME／大小）----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'battle-audio',
  'battle-audio',
  false,
  209715200,
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---- 2) 自己資料夾（第一段為 user id）：上傳／讀／改／刪 ----
DROP POLICY IF EXISTS "authenticated upload own audio" ON storage.objects;
CREATE POLICY "authenticated upload own audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'battle-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "authenticated read own audio" ON storage.objects;
CREATE POLICY "authenticated read own audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'battle-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "authenticated update own audio" ON storage.objects;
CREATE POLICY "authenticated update own audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'battle-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'battle-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "authenticated delete own audio" ON storage.objects;
CREATE POLICY "authenticated delete own audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'battle-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---- 3) 擂台：讀取「battles 引用到的音檔路徑」（與 battle_arena_rls_and_storage.sql 同名，可重跑）----
DROP POLICY IF EXISTS "authenticated read battle referenced audio" ON storage.objects;
CREATE POLICY "authenticated read battle referenced audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'battle-audio'
  AND EXISTS (
    SELECT 1
    FROM public.battles b
    WHERE b.audio_a_path = storage.objects.name
       OR b.audio_b_path = storage.objects.name
  )
);

DROP POLICY IF EXISTS anon_read_battle_referenced_audio ON storage.objects;
CREATE POLICY anon_read_battle_referenced_audio
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'battle-audio'
  AND EXISTS (
    SELECT 1
    FROM public.battles b
    WHERE b.audio_a_path = storage.objects.name
       OR b.audio_b_path = storage.objects.name
  )
);
