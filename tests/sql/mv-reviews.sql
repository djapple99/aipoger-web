-- Transaction-only verification. No fixture, rating, comment, notification or quota persists.
begin;
do $$
declare
  v_owner uuid; v_reader uuid; v_third uuid; v_track uuid;
  v_request uuid := gen_random_uuid(); v_n bigint; v_avg numeric;
begin
  select id into v_owner from auth.users where lower(email)='djapple99@gmail.com' and email_confirmed_at is not null limit 1;
  select id into v_reader from auth.users where id<>v_owner limit 1;
  select id into v_third from auth.users where id not in (v_owner,v_reader) limit 1;
  if v_owner is null or v_reader is null or v_third is null then raise exception 'Fixture account unavailable'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  insert into public.listen_bar_tracks(title,artist,genre,source,is_featured_official,is_active,review_status,created_by,audio_path,youtube_url)
    values('MV transaction verification','QA','EDM 百大電音','community',false,true,'approved',v_owner,'qa-rollback.mp3','https://www.youtube.com/watch?v=MdxaU0l3FzI') returning id into v_track;
  perform public.save_mv_review(v_track,v_reader,8,'具體的音樂與畫面評論，這是一筆會回滾的測試。','QA',v_request);
  perform public.save_mv_review(v_track,v_reader,8,'具體的音樂與畫面評論，這是一筆會回滾的測試。','QA',v_request);
  select count(*) into v_n from public.listen_bar_track_comments where track_id=v_track;
  if v_n<>1 then raise exception 'Retry duplicated comment'; end if;
  perform public.save_mv_review(v_track,v_reader,10,'','QA',gen_random_uuid());
  perform public.save_mv_review(v_track,v_third,6,'','QA',gen_random_uuid());
  select people,average into v_n,v_avg from public.mv_rating_summaries() where track_id=v_track;
  if v_n<>2 or v_avg<>8.0 then raise exception 'Distinct average failed'; end if;
  begin
    perform public.save_mv_review(v_track,v_owner,10,'','QA',gen_random_uuid());
    raise exception 'Self score was allowed';
  exception when insufficient_privilege then null; end;
  perform public.save_mv_review(v_track,v_owner,null,'作者可討論自己的作品','QA',gen_random_uuid());
  begin
    perform public.save_mv_review(v_track,v_reader,11,'','QA',gen_random_uuid());
    raise exception 'Invalid score was allowed';
  exception when invalid_parameter_value then null; end;
  update public.listen_bar_track_comments set moderation_status='hidden' where track_id=v_track and user_id=v_reader;
  select people,average into v_n,v_avg from public.mv_rating_summaries() where track_id=v_track;
  if v_n<>1 or v_avg<>6.0 then raise exception 'Moderated rating included'; end if;
  update public.listen_bar_tracks set hidden_at=now() where id=v_track;
  if exists(select 1 from public.mv_rating_summaries() where track_id=v_track) then raise exception 'Hidden summary leaked'; end if;
  begin
    perform public.save_mv_review(v_track,v_third,8,'','QA',gen_random_uuid());
    raise exception 'Hidden review was allowed';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('authenticated','public.save_mv_review(uuid,uuid,integer,text,text,uuid)','execute')
    or has_function_privilege('anon','public.mv_rating_summaries()','execute')
    or has_table_privilege('anon','public.mv_work_ratings','select')
    or has_table_privilege('authenticated','public.mv_work_ratings','insert') then raise exception 'Private access exposed'; end if;
end $$;
select 'PASS: unique people, average, edits, retries, author, moderation, hidden work, private grants; all writes rolled back' as verification;
rollback;
