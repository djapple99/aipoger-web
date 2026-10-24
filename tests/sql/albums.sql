-- Transaction-only production-schema verification; no fixture or quota survives.
begin;
do $$
declare owner_id uuid; reader_id uuid; a uuid; b uuid; other_id uuid; album_id uuid;
  before_rating text; after_rating text; receipt uuid:=gen_random_uuid();
begin
  select id into owner_id from auth.users where lower(email)='djapple99@gmail.com' and email_confirmed_at is not null limit 1;
  select id into reader_id from auth.users where id<>owner_id and email_confirmed_at is not null limit 1;
  if owner_id is null or reader_id is null then raise exception 'Fixture identities unavailable'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,audio_path,duration_seconds)
    values('Album rollback A','QA','Original 自我風格','community',true,'approved',owner_id,'qa-rollback-a.mp3',180) returning id into a;
  insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,audio_path,duration_seconds)
    values('Album rollback B','QA','Original 自我風格','community',true,'approved',owner_id,'qa-rollback-b.mp3',180) returning id into b;
  insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,work_kind,album_track_ids)
    values('Album rollback collection','QA','Original 自我風格','community',true,'approved',owner_id,'album',array[b,a]) returning id into album_id;
  assert (select album_track_ids=array[b,a] from public.listen_bar_tracks where id=album_id), 'Album sequence changed';
  begin
    insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,work_kind,album_track_ids)
      values('Album rollback duplicate','QA','Original 自我風格','community',true,'approved',owner_id,'album',array[a,a]);
    raise exception 'Duplicate member accepted';
  exception when invalid_parameter_value then null; end;
  begin
    insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,work_kind,album_track_ids)
      values('Album rollback nested','QA','Original 自我風格','community',true,'approved',owner_id,'album',array[a,album_id]);
    raise exception 'Nested album accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.listen_bar_tracks set work_kind='album' where id=a;
    assert (select work_kind='single' from public.listen_bar_tracks where id=a), 'Authenticated reclassification accepted';
  exception when insufficient_privilege then assert sqlerrm='WORK_CLASSIFICATION_LOCKED'; end;
  execute 'reset role';
  -- A foreign-owned public member must also fail, even for a direct authenticated insert.
  perform set_config('request.jwt.claim.sub',reader_id::text,true);
  insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,audio_path)
    values('Album rollback foreign','QA','Original 自我風格','community',true,'approved',reader_id,'qa-rollback-other.mp3') returning id into other_id;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  begin
    insert into public.listen_bar_tracks(title,artist,genre,source,is_active,review_status,created_by,work_kind,album_track_ids)
      values('Album rollback forged','QA','Original 自我風格','community',true,'approved',owner_id,'album',array[a,other_id]);
    raise exception 'Foreign member accepted';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform public.save_work_review(a,reader_id,8.8,'Rollback historical comment','QA',receipt,'music');
  select md5(row_to_json(r)::text) into before_rating from public.mv_work_ratings r where track_id=a and user_id=reader_id;
  update public.listen_bar_tracks set work_kind='album',work_classified_at=now(),work_classification_note='Rollback classification' where id=a;
  select md5(row_to_json(r)::text) into after_rating from public.mv_work_ratings r where track_id=a and user_id=reader_id;
  assert before_rating=after_rating, 'Historical rating changed';
  assert not exists(select 1 from public.work_rating_summaries() where track_id=a), 'Album counted in singles';
  assert not public.blind_track_eligible(a,reader_id), 'Album eligible for blind singles';
  assert not public.monthly_chart_public_track((select t from public.listen_bar_tracks t where id=a)), 'Album eligible for monthly singles';
  begin
    perform public.save_work_review(a,reader_id,9.0,'','QA',gen_random_uuid(),'music');
    raise exception 'Album review rating accepted';
  exception when insufficient_privilege then assert sqlerrm='ALBUM_RATING_DISABLED'; end;
  begin
    update public.mv_work_ratings set score=9.0 where track_id=a and user_id=reader_id;
    raise exception 'Direct album rating update accepted';
  exception when insufficient_privilege then assert sqlerrm='ALBUM_RATING_DISABLED'; end;
  begin
    insert into public.mv_work_ratings(track_id,user_id,score) values(album_id,reader_id,10);
    raise exception 'Direct album rating insert accepted';
  exception when insufficient_privilege then assert sqlerrm='ALBUM_RATING_DISABLED'; end;
  perform public.save_work_review(album_id,reader_id,null,'Rollback album discussion','QA',gen_random_uuid(),'music');
  assert exists(select 1 from public.listen_bar_track_comments where track_id=album_id and user_id=reader_id), 'Album discussion blocked';
  assert (select count(*)=1 from public.mv_review_receipts where user_id=reader_id and request_id=receipt), 'Historical receipt lost';
  -- Existing single rating still works.
  perform public.save_work_review(b,reader_id,7.2,'','QA',gen_random_uuid(),'music');
  assert exists(select 1 from public.work_rating_summaries() where track_id=b and total=7.2), 'Single rating regressed';
  execute 'set local role anon';
  assert (select count(*)=1 from public.listen_bar_tracks where id=album_id), 'Public album invisible';
  execute 'reset role';
  assert not has_function_privilege('authenticated','public.save_work_review(uuid,uuid,numeric,text,text,uuid,text)','execute');
  assert not has_table_privilege('anon','public.mv_work_ratings','select');
end $$;
select 'PASS: authenticated ordered album insert, duplicate/nested/foreign rejection, historical preservation, album rating exclusion/denial, comments, singles, anonymous visibility, private grants' as verification;
rollback;
