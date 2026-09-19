-- Cover moderation audit foreign keys so auth user deletion and moderator
-- lookups do not require a full table scan. These indexes are additive and
-- safe to apply to environments where the comment tables already exist.

create index if not exists listen_bar_track_comments_moderated_by_idx
  on public.listen_bar_track_comments (moderated_by);

create index if not exists aipoger_choice_collection_comments_moderated_by_idx
  on public.aipoger_choice_collection_comments (moderated_by);

create index if not exists ai_music_bible_entry_comments_moderated_by_idx
  on public.ai_music_bible_entry_comments (moderated_by);
