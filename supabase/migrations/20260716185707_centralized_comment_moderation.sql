-- Centralized moderation for persistent comments across Bar Heartbreak,
-- Choice, and the AI Music Practice Bible.
--
-- The Bible comments table is repeated here intentionally because the earlier
-- additive migration has not reached every environment. All statements are
-- idempotent and preserve existing comments as visible.

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

alter table public.listen_bar_track_comments
  add column if not exists moderation_status text not null default 'visible',
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz;

alter table public.aipoger_choice_collection_comments
  add column if not exists moderation_status text not null default 'visible',
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz;

alter table public.ai_music_bible_entry_comments
  add column if not exists moderation_status text not null default 'visible',
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz;

do $$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array[
    'listen_bar_track_comments',
    'aipoger_choice_collection_comments',
    'ai_music_bible_entry_comments'
  ]
  loop
    constraint_name := target_table || '_moderation_status_check';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = ('public.' || target_table)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (moderation_status in (''visible'', ''hidden''))',
        target_table,
        constraint_name
      );
    end if;
  end loop;
end $$;

create index if not exists listen_bar_track_comments_moderation_idx
  on public.listen_bar_track_comments (moderation_status, created_at desc);

create index if not exists aipoger_choice_collection_comments_moderation_idx
  on public.aipoger_choice_collection_comments (moderation_status, created_at desc);

create index if not exists ai_music_bible_entry_comments_moderation_idx
  on public.ai_music_bible_entry_comments (moderation_status, created_at desc);

alter table public.listen_bar_track_comments enable row level security;
alter table public.aipoger_choice_collection_comments enable row level security;
alter table public.ai_music_bible_entry_comments enable row level security;

-- All three comment surfaces now use their narrow server APIs. Browser clients
-- no longer need direct table grants, which also prevents a commenter from
-- changing moderation fields on their own row.
revoke all on table public.listen_bar_track_comments from public, anon, authenticated;
revoke all on table public.aipoger_choice_collection_comments from public, anon, authenticated;
revoke all on table public.ai_music_bible_entry_comments from public, anon, authenticated;

grant all on table public.listen_bar_track_comments to service_role;
grant all on table public.aipoger_choice_collection_comments to service_role;
grant all on table public.ai_music_bible_entry_comments to service_role;

drop policy if exists listen_bar_track_comments_public_read on public.listen_bar_track_comments;
drop policy if exists listen_bar_track_comments_insert_public on public.listen_bar_track_comments;
drop policy if exists listen_bar_track_comments_insert_authenticated on public.listen_bar_track_comments;
drop policy if exists listen_bar_track_comments_update_own on public.listen_bar_track_comments;

comment on column public.listen_bar_track_comments.moderation_status is
  'Owner moderation state. Hidden rows stay preserved for audit and can be restored.';
comment on column public.aipoger_choice_collection_comments.moderation_status is
  'Owner moderation state. Hidden rows stay preserved for audit and can be restored.';
comment on column public.ai_music_bible_entry_comments.moderation_status is
  'Owner moderation state. Hidden rows stay preserved for audit and can be restored.';
