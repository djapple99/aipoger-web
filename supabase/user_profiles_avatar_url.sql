-- user_profiles：頭像 URL（與 Storage avatars/{userId}/avatar.png 對應）
-- 在 Supabase SQL Editor 執行一次即可。

alter table public.user_profiles
  add column if not exists avatar_url text;

comment on column public.user_profiles.avatar_url is 'Public URL for profile avatar (avatars bucket: {id}/avatar.png)';
