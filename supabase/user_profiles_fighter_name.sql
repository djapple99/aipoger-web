-- 鬥士名稱（與 battle_queue / 表單同步，供登入後自動帶入）
alter table public.user_profiles
  add column if not exists fighter_name text;

comment on column public.user_profiles.fighter_name is 'Last saved fighter display name for battle setup / matchmaking';
