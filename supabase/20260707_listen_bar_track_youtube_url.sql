-- Add optional YouTube MV link metadata for Bar Heartbreak tracks.

alter table public.listen_bar_tracks
  add column if not exists youtube_url text;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_youtube_url_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_youtube_url_check
  check (
    youtube_url is null
    or (
      length(youtube_url) <= 300
      and youtube_url ~* '^https?://(www\\.|m\\.)?(youtube\\.com|youtu\\.be)/'
    )
  );

comment on column public.listen_bar_tracks.youtube_url is
  'Optional creator-supplied YouTube MV URL shown as a simple Watch MV action in Bar Heartbreak.';
