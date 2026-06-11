-- AIPOGER 傷心酒吧 Bar Heartbreak：官方輪播歌單資料表 + Storage buckets
-- 執行位置：Supabase Dashboard → SQL Editor
-- 執行後可使用 /admin/listen-bar 管理輪播歌曲。

create extension if not exists pgcrypto;

alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

-- 將新管理信箱設為管理員。若尚未用該信箱登入，登入後再重跑本檔即可。
insert into public.user_profiles (id, is_admin)
select u.id, true
from auth.users u
where lower(trim(coalesce(u.email, ''))) = 'aipoger99@gmail.com'
on conflict (id) do update set is_admin = excluded.is_admin;

create table if not exists public.listen_bar_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default 'AIPOGER',
  ai_tool text,
  genre text,
  mood text,
  description text,
  bpm integer check (bpm is null or (bpm > 0 and bpm < 400)),
  duration_seconds integer check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 3600)),
  lyrics text,
  audio_path text not null,
  cover_path text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listen_bar_tracks is 'AIPOGER 傷心酒吧 Bar Heartbreak official rotation playlist.';
comment on column public.listen_bar_tracks.audio_path is 'Supabase Storage path in listen-bar-audio bucket.';
comment on column public.listen_bar_tracks.cover_path is 'Supabase Storage path in listen-bar-covers bucket.';

create index if not exists listen_bar_tracks_active_order_idx
on public.listen_bar_tracks (is_active, sort_order, created_at desc);

create or replace function public.listen_bar_tracks_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_listen_bar_tracks_updated_at on public.listen_bar_tracks;
create trigger trg_listen_bar_tracks_updated_at
before update on public.listen_bar_tracks
for each row
execute function public.listen_bar_tracks_set_updated_at();

alter table public.listen_bar_tracks enable row level security;

grant select on table public.listen_bar_tracks to anon;
grant select, insert, update, delete on table public.listen_bar_tracks to authenticated;

drop policy if exists listen_bar_tracks_public_read_active on public.listen_bar_tracks;
create policy listen_bar_tracks_public_read_active
on public.listen_bar_tracks
for select
to anon, authenticated
using (is_active = true);

drop policy if exists listen_bar_tracks_admin_read_all on public.listen_bar_tracks;
create policy listen_bar_tracks_admin_read_all
on public.listen_bar_tracks
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists listen_bar_tracks_admin_insert on public.listen_bar_tracks;
create policy listen_bar_tracks_admin_insert
on public.listen_bar_tracks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists listen_bar_tracks_admin_update on public.listen_bar_tracks;
create policy listen_bar_tracks_admin_update
on public.listen_bar_tracks
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists listen_bar_tracks_admin_delete on public.listen_bar_tracks;
create policy listen_bar_tracks_admin_delete
on public.listen_bar_tracks
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'listen-bar-audio',
    'listen-bar-audio',
    true,
    52428800,
    array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff', 'audio/mp4', 'audio/aac', 'audio/ogg']::text[]
  ),
  (
    'listen-bar-covers',
    'listen-bar-covers',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listen_bar_storage_public_read on storage.objects;
create policy listen_bar_storage_public_read
on storage.objects
for select
to public
using (bucket_id in ('listen-bar-audio', 'listen-bar-covers'));

drop policy if exists listen_bar_storage_admin_insert on storage.objects;
create policy listen_bar_storage_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('listen-bar-audio', 'listen-bar-covers')
  and exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists listen_bar_storage_admin_update on storage.objects;
create policy listen_bar_storage_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id in ('listen-bar-audio', 'listen-bar-covers')
  and exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
)
with check (
  bucket_id in ('listen-bar-audio', 'listen-bar-covers')
  and exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists listen_bar_storage_admin_delete on storage.objects;
create policy listen_bar_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('listen-bar-audio', 'listen-bar-covers')
  and exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);
