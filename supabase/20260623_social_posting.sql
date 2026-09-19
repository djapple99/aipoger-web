-- AIPOGER social posting back office.
-- V1 stores reviewed drafts, platform targets, account connection state, and publish attempts.
-- Secrets/tokens must stay in environment variables or encrypted secret storage, not in these rows.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'manual',
  source_id text,
  language text not null default 'zh',
  title text not null,
  body text,
  cta text,
  link_url text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_source_type_check check (source_type in ('manual', 'battle_result')),
  constraint social_posts_status_check check (status in ('draft', 'needs_review', 'scheduled', 'published', 'failed'))
);

create table if not exists public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  platform text not null,
  publish_mode text not null default 'draft_only',
  status text not null default 'needs_review',
  title text not null,
  content_text text not null,
  target_url text,
  manual_publish_url text,
  media_url text,
  background_audio_url text,
  background_audio_label text,
  notes text,
  external_post_id text,
  error_message text,
  last_attempt_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_post_targets_platform_check check (platform in ('discord', 'x', 'instagram', 'tiktok', 'youtube', 'facebook_group')),
  constraint social_post_targets_publish_mode_check check (publish_mode in ('api', 'manual', 'draft_only')),
  constraint social_post_targets_status_check check (status in ('draft', 'needs_review', 'scheduled', 'published', 'failed')),
  constraint social_post_targets_post_platform_unique unique (post_id, platform)
);

create table if not exists public.social_accounts (
  platform text primary key,
  display_name text,
  connection_status text not null default 'not_connected',
  token_hint text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint social_accounts_platform_check check (platform in ('discord', 'x', 'instagram', 'tiktok', 'youtube', 'facebook_group')),
  constraint social_accounts_connection_status_check check (connection_status in ('not_connected', 'connected', 'needs_review', 'disabled'))
);

create table if not exists public.social_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  target_id uuid references public.social_post_targets(id) on delete set null,
  platform text not null,
  attempted_by uuid references auth.users(id) on delete set null,
  status text not null,
  request_summary jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint social_publish_attempts_platform_check check (platform in ('discord', 'x', 'instagram', 'tiktok', 'youtube', 'facebook_group')),
  constraint social_publish_attempts_status_check check (status in ('published', 'failed', 'skipped'))
);

create index if not exists social_posts_status_created_idx
on public.social_posts (status, created_at desc);

create index if not exists social_posts_source_idx
on public.social_posts (source_type, source_id);

create index if not exists social_post_targets_post_idx
on public.social_post_targets (post_id, platform);

create index if not exists social_publish_attempts_post_idx
on public.social_publish_attempts (post_id, created_at desc);

alter table public.social_posts enable row level security;
alter table public.social_post_targets enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_publish_attempts enable row level security;

grant select, insert, update, delete on table public.social_posts to service_role;
grant select, insert, update, delete on table public.social_post_targets to service_role;
grant select, insert, update, delete on table public.social_accounts to service_role;
grant select, insert on table public.social_publish_attempts to service_role;

drop policy if exists service_manage_social_posts on public.social_posts;
create policy service_manage_social_posts
on public.social_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists service_manage_social_post_targets on public.social_post_targets;
create policy service_manage_social_post_targets
on public.social_post_targets
for all
to service_role
using (true)
with check (true);

drop policy if exists service_manage_social_accounts on public.social_accounts;
create policy service_manage_social_accounts
on public.social_accounts
for all
to service_role
using (true)
with check (true);

drop policy if exists service_manage_social_publish_attempts on public.social_publish_attempts;
create policy service_manage_social_publish_attempts
on public.social_publish_attempts
for all
to service_role
using (true)
with check (true);
