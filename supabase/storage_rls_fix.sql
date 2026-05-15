-- 修復 Storage RLS：允許已登入用戶上傳頭像和封面
-- 在 Supabase SQL Editor 執行

-- 刪除舊政策（如果有的話）
DROP POLICY IF EXISTS "Allow avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow cover upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow hooks upload" ON storage.objects;

-- 允許已認證用戶上傳頭像
CREATE POLICY "Allow avatar upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'battle-audio'
  AND (
    name LIKE '%/avatar.%'
    OR name LIKE '%/avatar'
  )
);

-- 允許已認證用戶上傳封面
CREATE POLICY "Allow cover upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'battle-audio'
  AND (
    name LIKE '%/cover.%'
    OR name LIKE '%/cover'
  )
);

-- 允許已認證用戶上傳 Hook 音檔
CREATE POLICY "Allow hooks upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'battle-audio'
  AND name LIKE '%/hooks/%'
);

-- 允許所有人讀取所有已上傳的檔案（公開展示用）
DROP POLICY IF EXISTS "Allow public read all" ON storage.objects;
CREATE POLICY "Allow public read all" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'battle-audio');

-- 允許已認證用戶刪除自己的檔案
DROP POLICY IF EXISTS "Allow owner delete" ON storage.objects;
CREATE POLICY "Allow owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);