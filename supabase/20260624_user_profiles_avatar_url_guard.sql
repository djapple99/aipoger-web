-- AIPOGER profile avatar URL compatibility.
-- The avatar upload API can work through fighter_profiles/auth metadata first,
-- but user_profiles.avatar_url should exist so older reads and future UI stay aligned.

alter table public.user_profiles
  add column if not exists avatar_url text;

comment on column public.user_profiles.avatar_url is
'Public URL for profile avatar (avatars bucket: {id}/avatar.png)';
