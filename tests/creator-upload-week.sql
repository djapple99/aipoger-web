-- Integration smoke test. Always roll back; never publish fixture songs.
begin;
do $$
declare
  v_user uuid;
  v_track uuid;
  v_started timestamptz;
  v_count integer;
  v_quota jsonb;
begin
  select u.id into v_user from auth.users u
  where not exists (select 1 from public.listen_bar_creator_upload_windows w where w.creator_id = u.id)
    and not exists (select 1 from public.listen_bar_tracks t where t.created_by = u.id)
  limit 1;
  if v_user is null then raise exception 'No unused test identity available'; end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  v_quota := public.listen_bar_my_upload_quota();
  assert (v_quota->>'used')::integer = 0;

  for i in 1..3 loop
    insert into public.listen_bar_tracks(title,audio_path,source,created_by,genre,is_active)
    values ('Quota rollback test', 'quota-rollback/' || gen_random_uuid() || '.mp3', 'community',v_user,'EDM 百大電音',false)
    returning id into v_track;
  end loop;
  select started_at,upload_count into v_started,v_count
  from public.listen_bar_creator_upload_windows where creator_id=v_user;
  assert v_count = 3;
  update public.listen_bar_tracks set title='Quota metadata edit' where id=v_track;
  delete from public.listen_bar_tracks where id=v_track;
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 3;
  begin
    insert into public.listen_bar_tracks(title,audio_path,source,created_by,genre,is_active)
    values ('Fourth must fail','quota-rollback/' || gen_random_uuid() || '.mp3','community',v_user,'EDM 百大電音',false);
    raise exception 'Fourth upload was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'CREATOR_WEEKLY_UPLOAD_LIMIT:%' then raise; end if;
  end;
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 3;

  update public.listen_bar_creator_upload_windows
  set started_at=clock_timestamp()-interval '168 hours' where creator_id=v_user;
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 0;
  assert public.listen_bar_my_upload_quota()->>'resetsAt' is null;
  insert into public.listen_bar_tracks(title,audio_path,source,created_by,genre,is_active)
  values ('New window','quota-rollback/' || gen_random_uuid() || '.mp3','community',v_user,'EDM 百大電音',false);
  select started_at,upload_count into v_started,v_count
  from public.listen_bar_creator_upload_windows where creator_id=v_user;
  assert v_count = 1;
  assert v_started > clock_timestamp()-interval '1 minute';

  -- A later failure rolls back the counter with the track insert.
  begin
    insert into public.listen_bar_tracks(title,audio_path,source,created_by,genre,is_active)
    values ('Rolled back','quota-rollback/' || gen_random_uuid() || '.mp3','community',v_user,'EDM 百大電音',false);
    raise exception using errcode='P0002',message='simulate rollback';
  exception when sqlstate 'P0002' then null;
  end;
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 1;
  assert (select started_at=v_started from public.listen_bar_creator_upload_windows where creator_id=v_user);

  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 0;
  assert not has_table_privilege('authenticated','public.listen_bar_creator_upload_windows','UPDATE');
  assert not has_table_privilege('anon','public.listen_bar_creator_upload_windows','SELECT');
  assert not has_function_privilege('anon','public.listen_bar_my_upload_quota()','EXECUTE');
end;
$$;
select 'Quota assertions passed: third allowed, fourth blocked, deletion and edits retain count, 168-hour expiry, rollback and access isolation' as result;
rollback;
