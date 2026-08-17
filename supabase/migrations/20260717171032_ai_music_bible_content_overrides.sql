-- Owner-only editorial overrides for the canonical AI Music Practice Bible.
-- The TypeScript catalog remains the safe fallback; this table stores only
-- deliberate edits and is never exposed through the browser Supabase client.
create table if not exists public.ai_music_bible_content_overrides (
  content_kind text not null check (content_kind in ('prompt_move', 'lyric_move', 'taiwanese_entry')),
  content_key text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (content_kind, content_key)
);

create index if not exists ai_music_bible_content_overrides_kind_idx
  on public.ai_music_bible_content_overrides (content_kind, updated_at desc);

alter table public.ai_music_bible_content_overrides enable row level security;

-- All reads and writes go through authenticated server routes using the
-- service key, after the route verifies the user's Supabase access token and
-- owner email. Do not grant browser roles access to this table.
revoke all on table public.ai_music_bible_content_overrides from anon, authenticated;
grant all on table public.ai_music_bible_content_overrides to service_role;
