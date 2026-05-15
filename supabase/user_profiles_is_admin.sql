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

-- 設為管理員：請改成你的 user id 或 email（二擇一執行）

-- 方式 A：已知 UUID（愛波哥帳號，來自專案 emergency_set_apc_balance.sql）
update public.user_profiles
set is_admin = true
where id = '3336dd37-7fe8-4203-bd55-9eb1067ca047';

-- 方式 B：依登入 email（取消註解並改 email）
-- update public.user_profiles p
-- set is_admin = true
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('your@email.com');
