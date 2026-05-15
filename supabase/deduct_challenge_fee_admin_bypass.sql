-- 快速修復：djapple99@gmail.com 免扣 APC（單獨執行即可，不需 is_admin 欄位）
-- Supabase SQL Editor → Run

create or replace function public.deduct_challenge_fee(user_uuid uuid, fee integer default 200)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
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

  select apc_balance into current_balance from public.user_profiles where id = user_uuid;
  if current_balance is null or current_balance < fee then
    return false;
  end if;

  update public.user_profiles set apc_balance = apc_balance - fee where id = user_uuid;
  return true;
end;
$$;

revoke all on function public.deduct_challenge_fee(uuid, integer) from public;
grant execute on function public.deduct_challenge_fee(uuid, integer) to authenticated;
