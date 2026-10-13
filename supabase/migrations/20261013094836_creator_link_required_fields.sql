-- SQL CHECK permits NULL, so explicitly require all link identity fields when
-- there is no hosted audio. This closes the nullable-provider case without
-- rewriting any existing submission or changing grants/policies.
alter table public.listen_bar_tracks add constraint creator_track_external_fields_required
  check (audio_path is not null or (external_provider is not null and external_media_id is not null and external_url is not null)) not valid;
alter table public.listen_bar_tracks validate constraint creator_track_external_fields_required;
notify pgrst, 'reload schema';
