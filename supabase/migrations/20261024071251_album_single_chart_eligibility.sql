-- Retain immutable monthly snapshots, while public single-chart eligibility
-- follows the work's current classification, including archived chart reads.
create or replace function public.monthly_chart_public_track(t public.listen_bar_tracks)
returns boolean language sql stable set search_path='' as $$
  select coalesce(t.work_kind='single' and t.source='community' and t.is_active
    and lower(trim(t.review_status))='approved'
    and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null
    and nullif(trim(t.audio_path),'') is not null,false);
$$;
revoke all on function public.monthly_chart_public_track(public.listen_bar_tracks) from public,anon,authenticated,service_role;
