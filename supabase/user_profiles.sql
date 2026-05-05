create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  points integer not null default 0,
  last_points_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "users can read own profile" on public.user_profiles;
create policy "users can read own profile"
on public.user_profiles
for select
using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.user_profiles;
create policy "users can insert own profile"
on public.user_profiles
for insert
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.user_profiles;
create policy "users can update own profile"
on public.user_profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create or replace function public.award_daily_login_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.user_profiles%rowtype;
  now_ts timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into profile_row
  from public.user_profiles
  where id = auth.uid();

  if profile_row.id is null then
    insert into public.user_profiles (id, display_name, points, last_points_at)
    values (auth.uid(), null, 100, now_ts);
    return 100;
  end if;

  if profile_row.last_points_at is null
     or now_ts - profile_row.last_points_at >= interval '24 hours' then
    update public.user_profiles
    set points = profile_row.points + 100,
        last_points_at = now_ts
    where id = auth.uid();
    return profile_row.points + 100;
  end if;

  return profile_row.points;
end;
$$;

revoke all on function public.award_daily_login_points() from public;
grant execute on function public.award_daily_login_points() to authenticated;
