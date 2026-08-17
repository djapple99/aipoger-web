-- AIPOGER Admin Analytics V1: append-only event log for product and music analytics.
-- Safe to run repeatedly. This creates the event foundation; dashboard aggregation stays in app code.

create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  song_id uuid,
  battle_id uuid,
  creator_id uuid references auth.users(id) on delete set null,
  page_path text,
  referrer text,
  source text,
  user_agent text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint analytics_events_type_check check (
    event_type in (
      'page_view',
      'session_start',
      'song_play',
      'song_finish',
      'song_skip',
      'song_pause',
      'song_resume',
      'like',
      'reaction',
      'comment',
      'register',
      'login',
      'upload_song',
      'delete_song',
      'battle_enter',
      'battle_vote',
      'open_heartbreak_bar',
      'open_honor_board',
      'open_creator_profile',
      'share_song'
    )
  ),
  constraint analytics_events_session_not_blank check (length(trim(session_id)) > 0),
  constraint analytics_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists analytics_events_created_idx
on public.analytics_events (created_at desc);

create index if not exists analytics_events_type_created_idx
on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_session_created_idx
on public.analytics_events (session_id, created_at desc);

create index if not exists analytics_events_song_created_idx
on public.analytics_events (song_id, created_at desc)
where song_id is not null;

create index if not exists analytics_events_battle_created_idx
on public.analytics_events (battle_id, created_at desc)
where battle_id is not null;

create index if not exists analytics_events_user_created_idx
on public.analytics_events (user_id, created_at desc)
where user_id is not null;

alter table public.analytics_events enable row level security;

grant insert on table public.analytics_events to anon, authenticated;
grant select on table public.analytics_events to authenticated;

drop policy if exists analytics_events_anon_insert on public.analytics_events;
create policy analytics_events_anon_insert
on public.analytics_events
for insert
to anon
with check (user_id is null);

drop policy if exists analytics_events_authenticated_insert on public.analytics_events;
create policy analytics_events_authenticated_insert
on public.analytics_events
for insert
to authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists analytics_events_owner_admin_read on public.analytics_events;
create policy analytics_events_owner_admin_read
on public.analytics_events
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

comment on table public.analytics_events is
  'Append-only AIPOGER product analytics event log. Playback minutes are accumulated from metadata.playedSeconds on song_finish/song_pause/song_skip events.';
