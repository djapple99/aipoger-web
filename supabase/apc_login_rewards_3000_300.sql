-- AIPOGER：登入送點規則
-- 規則：
-- - djapple99@gmail.com 不領取自動登入獎勵
-- - 其他使用者第一次登入 / 第一次建立 profile：APC 保底 3000
-- - 之後每日登入一次：+300 APC
-- - 每日判斷使用 Asia/Taipei 日期
-- 可重複執行。

alter table public.user_profiles
  add column if not exists apc_balance integer not null default 3000,
  add column if not exists level integer not null default 1,
  add column if not exists total_wins integer not null default 0,
  add column if not exists total_losses integer not null default 0,
  add column if not exists last_sign_in_at timestamptz;

alter table public.user_profiles
  alter column apc_balance set default 3000;

comment on column public.user_profiles.apc_balance is 'APC balance. Non-owner first login bonus: 3000. Daily login bonus: 300.';

create or replace function public.is_aipoger_owner(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(trim(coalesce(u.email, ''))) = lower('djapple99@gmail.com')
  );
$$;

revoke all on function public.is_aipoger_owner(uuid) from public;
grant execute on function public.is_aipoger_owner(uuid) to authenticated;
grant execute on function public.is_aipoger_owner(uuid) to service_role;

create or replace function public.award_signup_bonus(user_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_flag boolean := public.is_aipoger_owner(user_uuid);
  current_balance integer;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'Not allowed';
  end if;

  insert into public.user_profiles (id, apc_balance, level, total_wins, total_losses)
  values (user_uuid, case when owner_flag then 0 else 3000 end, 1, 0, 0)
  on conflict (id) do nothing;

  if owner_flag then
    return;
  end if;

  select apc_balance
  into current_balance
  from public.user_profiles
  where id = user_uuid;

  if current_balance is null or current_balance < 3000 then
    update public.user_profiles
    set apc_balance = 3000
    where id = user_uuid;
  end if;
end;
$$;

revoke all on function public.award_signup_bonus(uuid) from public;
grant execute on function public.award_signup_bonus(uuid) to authenticated;

drop function if exists public.award_daily_login_points(uuid);

create or replace function public.award_daily_login_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner_flag boolean;
  gained integer := 0;
  inserted_count integer := 0;
  last_taipei_date date;
  today_taipei date := (timezone('Asia/Taipei', now()))::date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  owner_flag := public.is_aipoger_owner(uid);

  insert into public.user_profiles (id, apc_balance, level, total_wins, total_losses, last_sign_in_at)
  values (uid, case when owner_flag then 0 else 3000 end, 1, 0, 0, now())
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;

  if owner_flag then
    return 0;
  end if;

  if inserted_count > 0 then
    return 3000;
  end if;

  select (timezone('Asia/Taipei', last_sign_in_at))::date
  into last_taipei_date
  from public.user_profiles
  where id = uid;

  if last_taipei_date is null then
    update public.user_profiles
    set
      apc_balance = greatest(apc_balance, 3000),
      last_sign_in_at = now()
    where id = uid;
    return 3000;
  end if;

  if last_taipei_date < today_taipei then
    update public.user_profiles
    set
      apc_balance = apc_balance + 300,
      last_sign_in_at = now()
    where id = uid;
    gained := 300;
  end if;

  return gained;
end;
$$;

revoke all on function public.award_daily_login_points() from public;
grant execute on function public.award_daily_login_points() to authenticated;

create or replace function public.on_user_profile_apc_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_aipoger_owner(new.id) then
    if new.apc_balance is null or new.apc_balance = 3000 then
      new.apc_balance := 0;
    end if;
    return new;
  end if;

  if new.apc_balance is null or new.apc_balance < 3000 then
    new.apc_balance := 3000;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_award_signup_bonus on public.user_profiles;
create trigger trigger_award_signup_bonus
  before insert on public.user_profiles
  for each row
  execute function public.on_user_profile_apc_default();
