create extension if not exists pgcrypto;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  target_title text,
  target_url text,
  reason text not null,
  description text,
  evidence_url text,
  contact_email text,
  context text,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_ip text,
  user_agent text,
  status text not null default 'open',
  priority text not null default 'normal',
  action_taken text,
  admin_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reports_target_type_check check (
    target_type in ('listen_bar_track','battle','battle_result','creator','profile','support_link','comment','other')
  ),
  constraint content_reports_reason_check check (
    reason in ('copyright','unauthorized_voice_or_sample','impersonation','scam_or_suspicious_payment','illegal_or_harmful','privacy_or_harassment','spam','other')
  ),
  constraint content_reports_status_check check (status in ('open','reviewing','resolved','rejected')),
  constraint content_reports_priority_check check (priority in ('low','normal','high','urgent'))
);

create index if not exists content_reports_status_created_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_user_id, created_at desc);

create or replace function public.set_content_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_reports_set_updated_at on public.content_reports;
create trigger content_reports_set_updated_at
before update on public.content_reports
for each row execute function public.set_content_reports_updated_at();

alter table public.content_reports enable row level security;

drop policy if exists "Anyone can submit content reports" on public.content_reports;
create policy "Anyone can submit content reports"
on public.content_reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "Owner admins can read content reports" on public.content_reports;
create policy "Owner admins can read content reports"
on public.content_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
);

drop policy if exists "Owner admins can update content reports" on public.content_reports;
create policy "Owner admins can update content reports"
on public.content_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
);

grant insert on public.content_reports to anon, authenticated;
grant select, update on public.content_reports to authenticated;

alter table public.listen_bar_tracks
  add column if not exists review_status text not null default 'approved',
  add column if not exists moderation_note text,
  add column if not exists hidden_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists support_url text,
  add column if not exists support_url_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listen_bar_tracks_review_status_check'
  ) then
    alter table public.listen_bar_tracks
      add constraint listen_bar_tracks_review_status_check
      check (review_status in ('pending','approved','featured','hidden','removed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listen_bar_tracks_support_url_status_check'
  ) then
    alter table public.listen_bar_tracks
      add constraint listen_bar_tracks_support_url_status_check
      check (support_url_status in ('none','pending','approved','rejected','disabled'));
  end if;
end $$;

create index if not exists listen_bar_tracks_review_status_created_idx
  on public.listen_bar_tracks (review_status, created_at desc);

comment on table public.content_reports is 'User-submitted moderation reports for songs, battles, creator pages, links, and comments.';
comment on column public.listen_bar_tracks.support_url is 'External creator support/listening/tip URL. AIPOGER does not process payments in this MVP.';
comment on column public.listen_bar_tracks.support_url_status is 'Moderation state for external creator support URL.';
