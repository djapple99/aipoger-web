-- AIPOGER Choice may use a dedicated curator-selected cover.
-- Additive and reversible: existing collections continue using their first
-- selected work cover until an owner uploads a Choice cover.

alter table public.aipoger_choice_collections
  add column if not exists cover_path text;

alter table public.aipoger_creator_choice_collections
  add column if not exists cover_path text;

comment on column public.aipoger_choice_collections.cover_path is
  'Optional dedicated cover for this official Choice collection. Stored in the listen-bar-covers bucket.';

comment on column public.aipoger_creator_choice_collections.cover_path is
  'Optional dedicated cover for this creator Choice collection. Stored in the listen-bar-covers bucket.';
