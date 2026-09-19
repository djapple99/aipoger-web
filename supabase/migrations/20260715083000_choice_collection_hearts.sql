-- Choice collection hearts are separate from individual song Hearts.
-- A signed-in listener may save or remove a public official/creator Choice
-- without changing any song-level reaction or cooldown semantics.

create table if not exists public.aipoger_choice_collection_hearts (
  id uuid primary key default gen_random_uuid(),
  collection_kind text not null,
  collection_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint aipoger_choice_collection_hearts_kind_check
    check (collection_kind in ('official', 'creator')),
  constraint aipoger_choice_collection_hearts_unique_listener
    unique (collection_kind, collection_id, user_id)
);

create index if not exists aipoger_choice_collection_hearts_lookup_idx
  on public.aipoger_choice_collection_hearts (collection_kind, collection_id);

alter table public.aipoger_choice_collection_hearts enable row level security;

-- Public counts and listener mutations are resolved by a narrow server route.
-- Do not expose the listener identity list through the browser Data API.
revoke all on table public.aipoger_choice_collection_hearts from anon, authenticated;

comment on table public.aipoger_choice_collection_hearts is
  'Listener saves for published AIPOGER Choice and creator Choice collections. Separate from song Hearts.';
