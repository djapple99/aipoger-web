-- AIPOGER listen_bar_tracks support URL schema required by Showtime display management.
-- Production had Showtime columns but was missing these existing app-facing fields,
-- which forced AI Music track APIs into legacy fallback selects.

alter table public.listen_bar_tracks
  add column if not exists support_url text,
  add column if not exists support_url_status text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listen_bar_tracks_support_url_status_check'
  ) then
    alter table public.listen_bar_tracks
      add constraint listen_bar_tracks_support_url_status_check
      check (support_url_status in ('none','pending','approved','rejected','disabled'));
  end if;
end $$;

comment on column public.listen_bar_tracks.support_url is
  'External creator support/listening/tip URL. AIPOGER does not process payments in this MVP.';

comment on column public.listen_bar_tracks.support_url_status is
  'Moderation state for external creator support URL.';
