-- 公開頭像 bucket：僅 JPEG / PNG / WebP，單檔 2MB
-- 物件路徑建議：{auth.uid()}/avatar.png（與 App 上傳一致）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 任何人可讀（公開 bucket URL 仍須能列舉／讀取物件時通過 RLS）
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated insert own folder" on storage.objects;
create policy "avatars authenticated insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars authenticated update own folder" on storage.objects;
create policy "avatars authenticated update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars authenticated delete own folder" on storage.objects;
create policy "avatars authenticated delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
