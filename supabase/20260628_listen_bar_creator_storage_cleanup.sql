-- AIPOGER 傷心酒吧 Bar Heartbreak：creator upload cleanup policies
-- 可重複執行。讓前台投稿在資料表 insert 失敗時，可以清掉自己剛上傳到 community 目錄的音檔/封面。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'listen-bar-audio',
    'listen-bar-audio',
    true,
    104857600,
    array[
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/vnd.wave',
      'audio/aiff',
      'audio/x-aiff',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg'
    ]::text[]
  ),
  (
    'listen-bar-covers',
    'listen-bar-covers',
    true,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listen_bar_storage_creator_insert_audio on storage.objects;
create policy listen_bar_storage_creator_insert_audio
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listen-bar-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'community'
);

drop policy if exists listen_bar_storage_creator_insert_covers on storage.objects;
create policy listen_bar_storage_creator_insert_covers
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listen-bar-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'community'
);

drop policy if exists listen_bar_storage_creator_delete_audio on storage.objects;
create policy listen_bar_storage_creator_delete_audio
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listen-bar-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'community'
);

drop policy if exists listen_bar_storage_creator_delete_covers on storage.objects;
create policy listen_bar_storage_creator_delete_covers
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listen-bar-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'community'
);
