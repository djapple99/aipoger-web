-- Keep profile fields used by the current application schema-aligned.
-- Additive and safe to re-run; existing rows are not rewritten.

alter table public.user_profiles
  add column if not exists avatar_url text;

comment on column public.user_profiles.avatar_url is
  'Public URL for profile avatar (avatars bucket: {id}/avatar.png)';

alter table public.user_profiles
  add column if not exists fighter_name text;

comment on column public.user_profiles.fighter_name is
  'Last saved fighter display name for battle setup / matchmaking';
