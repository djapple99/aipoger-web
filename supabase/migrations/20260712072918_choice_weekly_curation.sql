-- AIPOGER Choice weekly curation.
-- Choice is a human-managed selection from the existing Showtime catalog.
-- It is intentionally separate from social publishing and never changes a
-- work's audio, Battle result, certification, or public Heart history.

create table if not exists public.aipoger_choice_collections (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  title text,
  intro text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aipoger_choice_collections_week_start_monday_check
    check (extract(isodow from week_start) = 1),
  constraint aipoger_choice_collections_title_length_check
    check (title is null or char_length(title) <= 120),
  constraint aipoger_choice_collections_intro_length_check
    check (intro is null or char_length(intro) <= 500)
);

create table if not exists public.aipoger_choice_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.aipoger_choice_collections(id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  constraint aipoger_choice_items_source_kind_check
    check (source_kind in ('listen_bar_track', 'battle_archive')),
  constraint aipoger_choice_items_position_check
    check (position between 1 and 99),
  constraint aipoger_choice_items_unique_source_per_collection
    unique (collection_id, source_kind, source_id),
  constraint aipoger_choice_items_unique_position_per_collection
    unique (collection_id, position)
);

create index if not exists aipoger_choice_collections_published_week_idx
  on public.aipoger_choice_collections (is_published, week_start desc)
  where is_published = true;

create index if not exists aipoger_choice_items_collection_position_idx
  on public.aipoger_choice_items (collection_id, position);

alter table public.aipoger_choice_collections enable row level security;
alter table public.aipoger_choice_items enable row level security;

-- Browser clients never read or write these tables directly. Public Choice
-- output is resolved by a narrow server route; owner operations go through the
-- authenticated admin API using the server-only service role.
revoke all on table public.aipoger_choice_collections from anon, authenticated;
revoke all on table public.aipoger_choice_items from anon, authenticated;

comment on table public.aipoger_choice_collections is
  'Human-curated weekly AIPOGER Choice selections from the Showtime catalog. Not a ranking or automated winner system.';

comment on table public.aipoger_choice_items is
  'Ordered Showtime catalog references for a human-curated AIPOGER Choice week.';
