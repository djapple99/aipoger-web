-- AIPOGER Q Crash full-song track sources.
-- Additive migration: ordinary Drop Battle keeps its existing 60s workflow.

alter table public.battle_queue
  alter column audio_path drop not null;

alter table public.battle_queue
  add column if not exists source_type text not null default 'upload',
  add column if not exists source_url text,
  add column if not exists title text,
  add column if not exists creator text,
  add column if not exists duration_seconds numeric(10, 2),
  add column if not exists rights_confirmed_at timestamptz;

alter table public.battle_queue
  drop constraint if exists battle_queue_source_type_check;

alter table public.battle_queue
  add constraint battle_queue_source_type_check
  check (source_type in ('suno', 'upload'));

alter table public.battle_queue
  drop constraint if exists battle_queue_source_url_length_check;

alter table public.battle_queue
  add constraint battle_queue_source_url_length_check
  check (source_url is null or char_length(source_url) between 1 and 2048);

alter table public.battle_queue
  drop constraint if exists battle_queue_duration_seconds_check;

alter table public.battle_queue
  add constraint battle_queue_duration_seconds_check
  check (duration_seconds is null or duration_seconds > 0);

-- Preserve existing queue rows without treating them as newly confirmed Q Crash tracks.
update public.battle_queue
set
  source_url = coalesce(source_url, audio_path),
  title = coalesce(nullif(trim(title), ''), original_file_name),
  creator = coalesce(nullif(trim(creator), ''), fighter_name),
  duration_seconds = coalesce(duration_seconds, drop_duration_seconds)
where source_url is null
   or title is null
   or creator is null
   or duration_seconds is null;

alter table public.battles
  alter column audio_a_path drop not null,
  alter column audio_b_path drop not null;

comment on column public.battle_queue.source_type is
'Unified Q Crash track source: suno for a public HTTPS Suno link, upload for an AIPOGER Storage object.';

comment on column public.battle_queue.source_url is
'Q Crash source URL or private battle-audio object key. Suno links are stored only as legal public HTTPS links; no Suno audio is copied.';

comment on column public.battle_queue.rights_confirmed_at is
'Server timestamp recorded after the submitter confirms creation or permission for this track.';

comment on column public.battle_queue.drop_duration_seconds is
'Legacy Drop Battle/Q Crash metadata. The Q Crash full-song flow no longer writes or validates this column.';

alter table public.q_crash_cards
  drop constraint if exists q_crash_cards_duration_check;

alter table public.q_crash_cards
  add constraint q_crash_cards_duration_check
  check (duration_minutes between 30 and 4320);

comment on column public.q_crash_cards.duration_minutes is
'Q Crash voting window in whole minutes: 30 minutes through 3 days. The server starts the immutable deadline when Work B locks.';

notify pgrst, 'reload schema';
