-- AIPOGER Showtime Battle archive public-display removal support.
-- This is a soft-hide layer for Showtime catalog display only.
-- It keeps the original battle archive/result history intact.

alter table public.battle_result_archives
  add column if not exists showtime_public_removed_at timestamptz,
  add column if not exists showtime_public_removed_by uuid references auth.users(id) on delete set null,
  add column if not exists showtime_public_removal_note text,
  add column if not exists showtime_updated_at timestamptz;

create index if not exists battle_result_archives_showtime_public_idx
  on public.battle_result_archives (archived_at desc)
  where showtime_public_removed_at is null;

comment on column public.battle_result_archives.showtime_public_removed_at is
  'When set, this battle archive is hidden from the public Showtime catalog while retaining the underlying result archive.';

comment on column public.battle_result_archives.showtime_public_removed_by is
  'Admin/user id that requested hiding this archive from the public Showtime catalog, when available.';

comment on column public.battle_result_archives.showtime_public_removal_note is
  'Operational note for why this archive is hidden from the public Showtime catalog.';

comment on column public.battle_result_archives.showtime_updated_at is
  'Last Showtime catalog metadata update timestamp for this battle archive.';
