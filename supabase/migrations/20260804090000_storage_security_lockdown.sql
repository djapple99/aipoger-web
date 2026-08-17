-- AIPOGER Storage security lockdown.
-- Public buckets keep public downloads; object listing and anonymous uploads are removed.
-- battle-audio remains private and keeps only owner/battle-referenced access policies.

-- Remove global or bucket-wide anonymous access.
drop policy if exists "Allow anon uploads" on storage.objects;
drop policy if exists "Allow anon read" on storage.objects;
drop policy if exists "Allow all battle-audio read" on storage.objects;
drop policy if exists "Allow all battle-audio upload" on storage.objects;
drop policy if exists "Allow authenticated upload" on storage.objects;
drop policy if exists "Allow avatar upload" on storage.objects;
drop policy if exists "Allow avatar/cover upload" on storage.objects;
drop policy if exists "Allow cover upload" on storage.objects;
drop policy if exists "Allow hooks upload" on storage.objects;
drop policy if exists "Allow public read" on storage.objects;
drop policy if exists "Allow public read all" on storage.objects;
drop policy if exists "listen_bar_storage_public_read" on storage.objects;
drop policy if exists "quiz_audio_storage_public_read" on storage.objects;
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists anon_insert_battle_audio_hooks on storage.objects;
drop policy if exists anon_update_battle_audio_hooks on storage.objects;

-- The avatars bucket is public for downloads, but uploads remain owner-scoped.
drop policy if exists "avatars authenticated insert own folder" on storage.objects;
create policy "avatars authenticated insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars authenticated update own folder" on storage.objects;
create policy "avatars authenticated update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars authenticated delete own folder" on storage.objects;
create policy "avatars authenticated delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
