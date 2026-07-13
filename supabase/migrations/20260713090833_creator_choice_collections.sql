-- Creator Choice collections are separate from the owner-operated weekly
-- AIPOGER Choice. A creator must have earned Showtime recognition before the
-- server API allows them to create or publish one of these collections.

create table if not exists public.aipoger_creator_choice_collections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  curator_name text not null,
  week_start date not null,
  title text,
  intro text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aipoger_creator_choice_collections_week_start_monday_check
    check (extract(isodow from week_start) = 1),
  constraint aipoger_creator_choice_collections_curator_name_length_check
    check (char_length(curator_name) between 1 and 80),
  constraint aipoger_creator_choice_collections_title_length_check
    check (title is null or char_length(title) <= 120),
  constraint aipoger_creator_choice_collections_intro_length_check
    check (intro is null or char_length(intro) <= 500),
  constraint aipoger_creator_choice_collections_creator_week_unique
    unique (creator_id, week_start)
);

create table if not exists public.aipoger_creator_choice_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.aipoger_creator_choice_collections(id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  constraint aipoger_creator_choice_items_source_kind_check
    check (source_kind in ('listen_bar_track', 'battle_archive')),
  constraint aipoger_creator_choice_items_position_check
    check (position between 1 and 99),
  constraint aipoger_creator_choice_items_unique_source_per_collection
    unique (collection_id, source_kind, source_id),
  constraint aipoger_creator_choice_items_unique_position_per_collection
    unique (collection_id, position)
);

create index if not exists aipoger_creator_choice_collections_public_idx
  on public.aipoger_creator_choice_collections (is_published, published_at desc)
  where is_published = true;

create index if not exists aipoger_creator_choice_collections_creator_idx
  on public.aipoger_creator_choice_collections (creator_id, week_start desc);

create index if not exists aipoger_creator_choice_items_collection_position_idx
  on public.aipoger_creator_choice_items (collection_id, position);

alter table public.aipoger_creator_choice_collections enable row level security;
alter table public.aipoger_creator_choice_items enable row level security;

-- All reads and writes use narrow server routes with service-role access.
-- Do not expose curator collection writes directly through the Data API.
revoke all on table public.aipoger_creator_choice_collections from anon, authenticated;
revoke all on table public.aipoger_creator_choice_items from anon, authenticated;

alter table public.listen_bar_tracks
  add column if not exists support_url_label text;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_support_url_label_length_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_support_url_label_length_check
  check (support_url_label is null or char_length(support_url_label) <= 80);

comment on table public.aipoger_creator_choice_collections is
  'Creator-published Choice playlists. Only creators with an existing Showtime-certified community work may manage them; selections reference public Showtime works from any creator.';

comment on table public.aipoger_creator_choice_items is
  'Ordered public Showtime references belonging to a creator Choice playlist.';

comment on column public.listen_bar_tracks.support_url_label is
  'Short creator-supplied explanation of an approved external support/listening link, for example a YouTube channel, MV, or tip page. AIPOGER does not process payments.';
