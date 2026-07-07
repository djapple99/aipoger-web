-- Keep Bar Heartbreak MV URL validation aligned with the app normalizer.

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_youtube_url_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_youtube_url_check
  check (
    youtube_url is null
    or (
      length(youtube_url) <= 300
      and youtube_url ~* '^https?://((www|m|music)[.])?(youtube[.]com|youtu[.]be)/'
    )
  );
