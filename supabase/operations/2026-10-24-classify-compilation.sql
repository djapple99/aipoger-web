-- Explicitly authorized one-work classification. Keeps original IDs/assets/time,
-- every interaction row and all Credit records; aborts if any preservation check fails.
-- The existing update trigger advances updated_at for this classification edit;
-- original created_at, media, counters and every other field must remain identical.
begin isolation level repeatable read;
do $$
declare v_id uuid:='95450736-b981-442a-9da5-6eb9bf49097e'; v_before jsonb; v_after jsonb; v_count integer;
begin
  perform 1 from public.listen_bar_tracks where id=v_id for update;
  if not exists(select 1 from public.listen_bar_tracks where id=v_id
    and created_by='ef97fe22-888b-4722-a3a4-0cf69a2ebe5f'
    and youtube_url='https://www.youtube.com/watch?v=8sNY25QdMFA' and work_kind='single') then
    raise exception 'Approved classification target changed or already classified';
  end if;
  select jsonb_build_object(
    'listen_bar_track_comments',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.listen_bar_track_comments x where track_id=v_id),
    'listen_bar_track_reactions',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.listen_bar_track_reactions x where track_id=v_id),
    'mv_work_ratings',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.mv_work_ratings x where track_id=v_id),
    'mv_review_receipts',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.mv_review_receipts x where track_id=v_id),
    'creator_credit_entries',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_entries x where true),
    'creator_credit_participation_entries',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_participation_entries x where true),
    'creator_credit_history',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_history x where true),
    'creator_credit_awards',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_awards x where true),
    'creator_credit_review_texts',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_review_texts x where true),
    'original_work',(select to_jsonb(t)-array['work_kind','album_track_ids','album_duration_seconds','work_classified_at','work_classification_note','updated_at'] from public.listen_bar_tracks t where id=v_id)
  ) into v_before;
  update public.listen_bar_tracks set work_kind='album',album_duration_seconds=1464,
    work_classified_at=now(),work_classification_note='多首歌曲連續合輯，依單曲／專輯內容分類規則移至專輯區；原互動與評分紀錄保留，不計入單曲榜。'
    where id=v_id and work_kind='single';
  get diagnostics v_count=row_count;
  assert v_count=1, 'Classification did not update exactly one work';
  select jsonb_build_object(
    'listen_bar_track_comments',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.listen_bar_track_comments x where track_id=v_id),
    'listen_bar_track_reactions',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.listen_bar_track_reactions x where track_id=v_id),
    'mv_work_ratings',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.mv_work_ratings x where track_id=v_id),
    'mv_review_receipts',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.mv_review_receipts x where track_id=v_id),
    'creator_credit_entries',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_entries x where true),
    'creator_credit_participation_entries',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_participation_entries x where true),
    'creator_credit_history',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_history x where true),
    'creator_credit_awards',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_awards x where true),
    'creator_credit_review_texts',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(x)::text,'' order by to_jsonb(x)::text),''))) from public.creator_credit_review_texts x where true),
    'original_work',(select to_jsonb(t)-array['work_kind','album_track_ids','album_duration_seconds','work_classified_at','work_classification_note','updated_at'] from public.listen_bar_tracks t where id=v_id)
  ) into v_after;
  assert v_before=v_after, 'Classification changed original work data, interactions or Credit records';
  assert not exists(select 1 from public.work_rating_summaries() where track_id=v_id), 'Album still in rating summaries';
  assert not public.blind_track_eligible(v_id,null), 'Album still eligible for blind singles';
  assert not public.monthly_chart_public_track((select t from public.listen_bar_tracks t where id=v_id)), 'Album still in monthly singles';
  perform set_config('aipoger.album_conversion_proof',jsonb_build_object('id',v_id,'preserved',true,'records',v_after-'original_work','originalCreatedAt',v_after->'original_work'->'created_at','audioDurationPreserved',v_after->'original_work'->'duration_seconds','kind','album','videoDurationSeconds',1464)::text,true);
end $$;
select current_setting('aipoger.album_conversion_proof')::jsonb as conversion;
commit;
