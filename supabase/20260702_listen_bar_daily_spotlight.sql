-- AIPOGER Today Spotlight / 每日推薦歌
-- Rule: date-based by Asia/Taipei calendar, not a rolling 24-hour countdown.
-- Old spotlights remain addressable by date; /today always points at today's date.

create extension if not exists pgcrypto;

create table if not exists public.listen_bar_daily_spotlights (
  id uuid primary key default gen_random_uuid(),
  spotlight_date date not null unique,
  track_id uuid not null references public.listen_bar_tracks(id) on delete restrict,
  headline text,
  intro text,
  caption text,
  media_path text,
  media_type text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listen_bar_daily_spotlights
  add column if not exists headline text,
  add column if not exists intro text,
  add column if not exists caption text,
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listen_bar_daily_spotlights'
      and column_name = 'title'
  ) then
    update public.listen_bar_daily_spotlights
    set headline = coalesce(headline, title)
    where headline is null;

    alter table public.listen_bar_daily_spotlights
      alter column title drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listen_bar_daily_spotlights'
      and column_name = 'short_caption'
  ) then
    update public.listen_bar_daily_spotlights
    set caption = coalesce(caption, short_caption)
    where caption is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listen_bar_daily_spotlights'
      and column_name = 'status'
  ) then
    update public.listen_bar_daily_spotlights
    set is_active = status in ('active', 'published', 'ready')
    where status is not null;

    alter table public.listen_bar_daily_spotlights
      alter column status set default 'active';
  end if;
end $$;

create index if not exists listen_bar_daily_spotlights_active_date_idx
on public.listen_bar_daily_spotlights (spotlight_date desc)
where is_active = true;

create index if not exists listen_bar_daily_spotlights_track_idx
on public.listen_bar_daily_spotlights (track_id);

alter table public.listen_bar_daily_spotlights enable row level security;

grant select on public.listen_bar_daily_spotlights to anon, authenticated;
grant insert, update, delete on public.listen_bar_daily_spotlights to authenticated;

drop policy if exists listen_bar_daily_spotlights_public_read on public.listen_bar_daily_spotlights;
create policy listen_bar_daily_spotlights_public_read
on public.listen_bar_daily_spotlights
for select
to anon, authenticated
using (is_active = true);

drop policy if exists listen_bar_daily_spotlights_admin_write on public.listen_bar_daily_spotlights;
create policy listen_bar_daily_spotlights_admin_write
on public.listen_bar_daily_spotlights
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

create or replace function public.listen_bar_daily_spotlights_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_listen_bar_daily_spotlights_touch_updated_at on public.listen_bar_daily_spotlights;
create trigger trg_listen_bar_daily_spotlights_touch_updated_at
before update on public.listen_bar_daily_spotlights
for each row
execute function public.listen_bar_daily_spotlights_touch_updated_at();
