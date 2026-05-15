-- 管理員：免扣 APC 挑戰費（deduct_challenge_fee 直接回傳 true）
-- 在 Supabase SQL Editor 執行（建議在 mvp_points_and_levels.sql 之後）

alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.user_profiles.is_admin is 'When true, deduct_challenge_fee skips APC deduction';

-- 防止使用者透過 API 自行把 is_admin 改成 true
create or replace function public.user_profiles_guard_is_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false) and auth.uid() is not null and auth.uid() = new.id then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_guard_is_admin on public.user_profiles;
create trigger trg_user_profiles_guard_is_admin
before insert or update on public.user_profiles
for each row
execute function public.user_profiles_guard_is_admin();

-- 扣挑戰費：管理員免扣點
create or replace function public.deduct_challenge_fee(user_uuid uuid, fee integer default 200)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  admin_flag boolean;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'Not allowed';
  end if;

  if exists (
    select 1
    from auth.users u
    where u.id = user_uuid
      and lower(trim(coalesce(u.email, ''))) in ('djapple99@gmail.com')
  ) then
    return true;
  end if;

  select coalesce(is_admin, false), apc_balance
  into admin_flag, current_balance
  from public.user_profiles
  where id = user_uuid;

  if admin_flag then
    return true;
  end if;

  if current_balance is null or current_balance < fee then
    return false;
  end if;

  update public.user_profiles
  set apc_balance = apc_balance - fee
  where id = user_uuid;

  return true;
end;
$$;

revoke all on function public.deduct_challenge_fee(uuid, integer) from public;
grant execute on function public.deduct_challenge_fee(uuid, integer) to authenticated;

-- 設為管理員：djapple99@gmail.com（無 profile 列時會自動建立）
insert into public.user_profiles (id, is_admin)
select u.id, true
from auth.users u
where lower(u.email) = lower('djapple99@gmail.com')
on conflict (id) do update set is_admin = excluded.is_admin;

-- 若上面影響 0 列，代表 auth.users 尚無此 email，請先用該信箱登入一次再重跑本檔。

-- 備用：已知 UUID
-- update public.user_profiles set is_admin = true where id = '3336dd37-7fe8-4203-bd55-9eb1067ca047';
