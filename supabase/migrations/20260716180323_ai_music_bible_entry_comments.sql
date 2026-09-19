-- Public discussion for the two large AI Music Bible indexes.
-- Reads and authenticated writes are mediated by the narrow same-origin API.

create table if not exists public.ai_music_bible_entry_comments (
  id uuid primary key default gen_random_uuid(),
  entry_kind text not null,
  entry_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  body text not null,
  created_at timestamptz not null default now(),
  constraint ai_music_bible_entry_comments_kind_check
    check (entry_kind in ('artist_dna', 'prompt_recipe')),
  constraint ai_music_bible_entry_comments_entry_key_length_check
    check (char_length(entry_key) between 1 and 80),
  constraint ai_music_bible_entry_comments_display_name_length_check
    check (char_length(display_name) between 1 and 80),
  constraint ai_music_bible_entry_comments_body_not_blank_check
    check (length(trim(body)) > 0),
  constraint ai_music_bible_entry_comments_body_length_check
    check (char_length(body) <= 280)
);

create index if not exists ai_music_bible_entry_comments_lookup_idx
  on public.ai_music_bible_entry_comments (entry_kind, entry_key, created_at asc);

create index if not exists ai_music_bible_entry_comments_user_idx
  on public.ai_music_bible_entry_comments (user_id, created_at desc);

alter table public.ai_music_bible_entry_comments enable row level security;

revoke all on table public.ai_music_bible_entry_comments from public, anon, authenticated;
grant all on table public.ai_music_bible_entry_comments to service_role;

comment on table public.ai_music_bible_entry_comments is
  'Public comments for indexed artist DNA and prompt recipes. All access is server mediated.';
