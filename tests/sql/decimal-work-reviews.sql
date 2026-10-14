-- Transaction-only verification: no fixtures, scores, comments or notices persist.
begin;
do $$
declare
  v_owner uuid; v_reader uuid; v_third uuid; v_track uuid;
  v_request uuid := gen_random_uuid(); v_n bigint; v_avg numeric; v_total numeric; v_bad numeric;
begin
  select id into v_owner from auth.users where lower(email)='djapple99@gmail.com' and email_confirmed_at is not null limit 1;
  select id into v_reader from auth.users where id<>v_owner limit 1;
  select id into v_third from auth.users where id not in (v_owner,v_reader) limit 1;
  if v_owner is null or v_reader is null or v_third is null then raise exception 'Fixture account unavailable'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  insert into public.listen_bar_tracks(title,artist,genre,source,is_featured_official,is_active,review_status,created_by,audio_path,youtube_url)
    values('Decimal work transaction verification','QA','EDM 百大電音','community',false,true,'approved',v_owner,'qa-rollback.mp3',null) returning id into v_track;
  perform public.save_work_review(v_track,v_reader,4.8,'具體的音樂與畫面評論，這是一筆會回滾的測試。','QA',v_request,'music');
  perform public.save_work_review(v_track,v_reader,4.8,'具體的音樂與畫面評論，這是一筆會回滾的測試。','QA',v_request,'mv');
  select count(*) into v_n from public.listen_bar_track_comments where track_id=v_track;
  if v_n<>1 then raise exception 'Cross-surface retry duplicated comment'; end if;
  perform public.save_work_review(v_track,v_third,6.8,'','QA',gen_random_uuid(),'music');
  select people,average,total into v_n,v_avg,v_total from public.work_rating_summaries() where track_id=v_track;
  if v_n<>2 or v_avg<>5.8 or v_total<>11.6 then raise exception 'Decimal average/total failed'; end if;
  -- Existing deployed integer clients still work and replace the same latest rating.
  perform public.save_mv_review(v_track,v_reader,9,'','QA',gen_random_uuid());
  select people,average,total into v_n,v_avg,v_total from public.work_rating_summaries() where track_id=v_track;
  if v_n<>2 or v_avg<>7.9 or v_total<>15.8 then raise exception 'Edit duplicated audience or failed to replace score'; end if;
  foreach v_bad in array array[0,11,4.85,'NaN'::numeric,'Infinity'::numeric] loop
    begin
      perform public.save_work_review(v_track,v_reader,v_bad,'','QA',gen_random_uuid(),'music');
      raise exception 'Invalid score was allowed: %',v_bad;
    exception when invalid_parameter_value then null; end;
  end loop;
  begin
    perform public.save_work_review(v_track,v_owner,10,'','QA',gen_random_uuid(),'music');
    raise exception 'Self score was allowed';
  exception when insufficient_privilege then null; end;
  perform public.save_work_review(v_track,v_owner,null,'作者可討論自己的作品','QA',gen_random_uuid(),'music');
  select people,total into v_n,v_total from public.work_rating_summaries() where track_id=v_track;
  if v_n<>2 or v_total<>15.8 then raise exception 'Comment text added chart points'; end if;
  update public.listen_bar_track_comments set moderation_status='hidden' where track_id=v_track and user_id=v_reader;
  select people,average,total into v_n,v_avg,v_total from public.work_rating_summaries() where track_id=v_track;
  if v_n<>1 or v_avg<>6.8 or v_total<>6.8 then raise exception 'Moderated score included'; end if;
  update public.listen_bar_tracks set hidden_at=now() where id=v_track;
  if exists(select 1 from public.work_rating_summaries() where track_id=v_track) then raise exception 'Hidden score leaked'; end if;
  begin
    perform public.save_work_review(v_track,v_third,8.7,'','QA',gen_random_uuid(),'music');
    raise exception 'Hidden review was allowed';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('authenticated','public.save_work_review(uuid,uuid,numeric,text,text,uuid,text)','execute')
    or has_function_privilege('anon','public.work_rating_summaries()','execute')
    or has_table_privilege('anon','public.mv_work_ratings','select')
    or has_table_privilege('authenticated','public.mv_work_ratings','insert') then raise exception 'Private access exposed'; end if;
end $$;
select 'PASS: decimals, average/total, original work, old-client edits, cross-surface retry, author, moderation, text-only, private grants; all writes rolled back' as verification;
rollback;
