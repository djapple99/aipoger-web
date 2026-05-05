insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battle-audio',
  'battle-audio',
  false,
  52428800,
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated upload own audio" on storage.objects;
create policy "authenticated upload own audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'battle-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated read own audio" on storage.objects;
create policy "authenticated read own audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'battle-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated update own audio" on storage.objects;
create policy "authenticated update own audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'battle-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'battle-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated delete own audio" on storage.objects;
create policy "authenticated delete own audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'battle-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
