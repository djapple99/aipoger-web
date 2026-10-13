-- Actual authenticated RLS context, with no lasting songs or quota changes.
begin;
do $$
declare v_owner uuid;
begin
  select id into v_owner from auth.users
    where lower(trim(email))='djapple99@gmail.com'
      and email_confirmed_at is not null and is_anonymous is not true;
  if v_owner is null then raise exception 'Owner identity unavailable'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
end;
$$;
set local role authenticated;
do $$
declare
  v_owner uuid := auth.uid();
  v_quota jsonb;
  v_media text;
begin
  v_quota := public.listen_bar_my_upload_quota();
  assert (v_quota->>'unlimited')::boolean = true;
  assert v_quota->>'limit' is null;
  assert v_quota->>'resetsAt' is null;
  for i in 1..6 loop
    if i % 2 = 0 then
      v_media := substr(replace(gen_random_uuid()::text,'-',''),1,11);
      insert into public.listen_bar_tracks(title,source,created_by,genre,is_active,
        audio_path,external_provider,external_media_id,external_url)
      values ('Quota rollback owner test','community',v_owner,'Original 自我風格',true,
        null,'youtube',v_media,'https://www.youtube.com/watch?v=' || v_media);
    else
      insert into public.listen_bar_tracks(title,source,created_by,genre,is_active,audio_path)
      values ('Quota rollback owner test','community',v_owner,'Original 自我風格',true,
        'quota-rollback/' || gen_random_uuid() || '.mp3');
    end if;
  end loop;
  assert (select count(*)=6 from public.listen_bar_tracks
    where created_by=v_owner and title='Quota rollback owner test');
  assert (public.listen_bar_my_upload_quota()->>'unlimited')::boolean = true;
  assert (public.listen_bar_my_upload_quota()->>'used')::integer = 0;
  begin
    insert into public.listen_bar_tracks(title,source,created_by,genre,is_active,audio_path)
    values ('Quota rollback owner forgery','community',gen_random_uuid(),'Original 自我風格',true,
      'quota-rollback/' || gen_random_uuid() || '.mp3');
    raise exception using errcode='P0002',message='Owner ownership forgery accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> '只能用自己的帳號投稿。' then raise; end if;
  end;
end;
$$;
reset role;
select 'Owner assertions passed: six mixed link/file songs under authenticated RLS, no quota consumed, ownership remains enforced' as result;
rollback;
