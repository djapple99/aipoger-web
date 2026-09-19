-- Choice comments belong to the playlist collection, not to individual songs.
-- Public reads and authenticated writes are mediated by the narrow server API.

create table if not exists public.aipoger_choice_collection_comments (
  id uuid primary key default gen_random_uuid(),
  collection_kind text not null,
  collection_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  body text not null,
  created_at timestamptz not null default now(),
  constraint aipoger_choice_collection_comments_kind_check
    check (collection_kind in ('official', 'creator')),
  constraint aipoger_choice_collection_comments_display_name_length_check
    check (char_length(display_name) between 1 and 80),
  constraint aipoger_choice_collection_comments_body_not_blank_check
    check (length(trim(body)) > 0),
  constraint aipoger_choice_collection_comments_body_length_check
    check (char_length(body) <= 280)
);

create index if not exists aipoger_choice_collection_comments_lookup_idx
  on public.aipoger_choice_collection_comments (collection_kind, collection_id, created_at asc);

create index if not exists aipoger_choice_collection_comments_user_idx
  on public.aipoger_choice_collection_comments (user_id, created_at desc);

alter table public.aipoger_choice_collection_comments enable row level security;

revoke all on table public.aipoger_choice_collection_comments from anon, authenticated;

comment on table public.aipoger_choice_collection_comments is
  'Public comments for published official and creator Choice playlists. Access is mediated by the Choice comments API.';
