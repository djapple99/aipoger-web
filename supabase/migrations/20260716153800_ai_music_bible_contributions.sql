create table if not exists public.ai_music_bible_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contribution_kind text not null check (contribution_kind in ('feedback', 'suggestion')),
  entry_key text,
  payload jsonb not null default '{}'::jsonb,
  contributor_name text,
  source_version text,
  request_fingerprint text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'merged')),
  reviewer_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_music_bible_contributions_status_created_idx
  on public.ai_music_bible_contributions (review_status, created_at desc);

create index if not exists ai_music_bible_contributions_fingerprint_created_idx
  on public.ai_music_bible_contributions (request_fingerprint, created_at desc);

create index if not exists ai_music_bible_contributions_entry_created_idx
  on public.ai_music_bible_contributions (entry_key, created_at desc)
  where entry_key is not null;

alter table public.ai_music_bible_contributions enable row level security;

revoke all on table public.ai_music_bible_contributions from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_music_bible_contributions to service_role;

comment on table public.ai_music_bible_contributions is
  'Moderated feedback and suggestions for the AIPOGER AI Music Bible. Public clients have no direct table access.';
