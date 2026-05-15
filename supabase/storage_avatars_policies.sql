-- battle-audio：允許已登入使用者上傳／更新自己的路徑 avatars/{auth.uid()}/avatar.png
-- 須已執行 user_profiles_avatar_url.sql（可選，與 Storage 無硬依賴）
-- 在 Supabase SQL Editor 執行。

drop policy if exists "authenticated upload avatars folder png" on storage.objects;
create policy "authenticated upload avatars folder png"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'battle-audio'
  and name = ('avatars/' || auth.uid()::text || '/avatar.png')
);

drop policy if exists "authenticated update avatars folder png" on storage.objects;
create policy "authenticated update avatars folder png"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'battle-audio'
  and name = ('avatars/' || auth.uid()::text || '/avatar.png')
)
with check (
  bucket_id = 'battle-audio'
  and name = ('avatars/' || auth.uid()::text || '/avatar.png')
);
