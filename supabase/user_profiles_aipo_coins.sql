-- AIPO Coin：user_profiles 欄位 + 新用戶 INSERT 時自動贈送 1000（僅在建立 profile 列時觸發）

alter table public.user_profiles
  add column if not exists aipo_coins integer not null default 0;

comment on column public.user_profiles.aipo_coins is 'AIPO Coin 餘額；新用戶建立 profile 列時由觸發器設為 1000';

-- 新用戶第一次寫入 user_profiles 時強制贈送 1000（INSERT 專用，UPDATE 不影響）
create or replace function public.set_initial_aipo_coins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.aipo_coins := 1000;
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_initial_aipo_coins on public.user_profiles;
create trigger trg_user_profiles_initial_aipo_coins
before insert on public.user_profiles
for each row
execute function public.set_initial_aipo_coins();

-- OAuth 新用戶在 auth.users 建立後，自動建立 user_profiles（INSERT 會觸發上方規則 → aipo_coins = 1000）
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
