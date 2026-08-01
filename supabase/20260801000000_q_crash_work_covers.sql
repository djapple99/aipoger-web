-- AIPOGER Q Crash: keep each submitted work's cover with its own Drop.
-- Additive migration; existing battles continue to use their stored cover values.

alter table public.battle_queue
  add column if not exists cover_url text;

comment on column public.battle_queue.cover_url is
  'Optional signed cover URL captured for the submitted work; Q Crash copies it into the battle side.';
