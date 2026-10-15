-- 2026-10-15: ratings are final, comment text has one successful edit, only Owner deletes.
-- Additive: preserve existing scores/comments/receipts/ledger; no historical award backfill.
alter table public.listen_bar_track_comments add column if not exists review_edit_count integer not null default 0 check(review_edit_count>=0);

create or replace function public.work_review_owner(p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from auth.users where id=p_user and is_anonymous is not true
    and email_confirmed_at is not null and lower(trim(coalesce(email,''))) in ('djapple99@gmail.com','aipoger99@gmail.com'));
$$;
revoke all on function public.work_review_owner(uuid) from public,anon,authenticated;
grant execute on function public.work_review_owner(uuid) to service_role;
grant execute on function public.creator_credit_review_valid(text) to service_role;

create or replace function public.creator_credit_reconcile(p_user uuid,p_kind text,p_track uuid,p_active boolean)
returns integer language plpgsql security invoker set search_path='' as $$
declare a public.creator_credit_awards%rowtype; amount integer; why text;
begin
  if p_kind not in ('heart','review') or p_user is null or p_track is null then raise exception 'Invalid award'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  insert into public.creator_credit_awards(user_id,kind,track_id) values(p_user,p_kind,p_track) on conflict do nothing;
  select * into a from public.creator_credit_awards where user_id=p_user and kind=p_kind and track_id=p_track for update;
  -- Review awards are final. Preserve historical reversals without minting them again.
  if p_kind='review' and (not p_active or a.version>0) then return 0; end if;
  if a.active=p_active then return 0; end if;
  amount := case when p_kind='heart' then 3 else 10 end;
  why := case when not p_active then 'reverse_'||p_kind when a.version=0 then p_kind else 'restore_'||p_kind end;
  update public.creator_credit_awards set active=p_active,version=version+1,updated_at=clock_timestamp() where id=a.id;
  insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key)
  values(p_user,case when p_active then amount else -amount end,why,gen_random_uuid(),a.id::text||':'||(a.version+1)::text);
  return case when p_active then amount else -amount end;
end;
$$;
revoke all on function public.creator_credit_reconcile(uuid,text,uuid,boolean) from public,anon,authenticated;


create or replace function public.creator_credit_check_review(p_user uuid,p_track uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare c public.listen_bar_track_comments%rowtype; valid boolean := false; sig text; claimed boolean; amount integer;
begin
  if not exists(select 1 from public.listen_bar_tracks where id=p_track) then return 0; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  if exists(select 1 from public.creator_credit_awards where user_id=p_user and track_id=p_track and kind='review' and version>0) then return 0; end if;
  -- New short comments are discussions, not withdrawal of an earlier rewarded review.
  -- First try the latest rated comment, then the already-bound award source.
  for c in select c0.* from public.mv_work_ratings r
  join public.listen_bar_tracks t on t.id=r.track_id
  join public.listen_bar_track_comments c0 on c0.track_id=r.track_id and c0.user_id=r.user_id
  left join public.creator_credit_awards a on a.user_id=r.user_id and a.track_id=r.track_id and a.kind='review'
  where r.user_id=p_user and r.track_id=p_track and (c0.id=r.comment_id or c0.id=a.comment_id)
    and t.created_by is distinct from p_user and t.source='community' and not t.is_featured_official
    and t.is_active and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null and c0.moderation_status='visible'
    and c0.created_at >= (select enabled_at from public.creator_credit_launch where id)
    and public.creator_credit_review_valid(c0.body)
    and exists(select 1 from auth.users u where u.id=p_user and u.is_anonymous is not true)
  order by (c0.id=r.comment_id) desc loop
    sig := md5(lower(regexp_replace(normalize(c.body,NFKC),'[^[:alnum:]一-龥ぁ-んァ-ン가-힣]','','g')));
    insert into public.creator_credit_review_texts(body_hash,user_id,track_id) values(sig,p_user,p_track) on conflict do nothing;
    select exists(select 1 from public.creator_credit_review_texts where body_hash=sig and user_id=p_user and track_id=p_track) into claimed;
    valid := claimed;
    if valid then exit; end if;
  end loop;
  if not valid and not exists(select 1 from public.creator_credit_awards where user_id=p_user and kind='review' and track_id=p_track) then return 0; end if;
  amount := public.creator_credit_reconcile(p_user,'review',p_track,valid);
  if valid then update public.creator_credit_awards set comment_id=c.id where user_id=p_user and track_id=p_track and kind='review'; end if;
  return amount;
end;
$$;
revoke all on function public.creator_credit_check_review(uuid,uuid) from public,anon,authenticated;

create or replace function public.save_work_review(
  p_track_id uuid, p_user_id uuid, p_score numeric, p_body text, p_name text, p_request_id uuid, p_surface text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t public.listen_bar_tracks%rowtype;
  c public.listen_bar_track_comments%rowtype;
  receipt public.mv_review_receipts%rowtype;
  result jsonb;
  r public.mv_work_ratings%rowtype;
  existing_comment uuid;
  owner boolean;
begin
  if p_surface is null or p_surface not in ('music','mv') or p_user_id is null or p_request_id is null or p_body is null or length(btrim(p_body)) > 280
    or (p_score is not null and (p_score not between 1 and 10 or p_score <> trunc(p_score,1)))
    or (p_score is null and btrim(p_body)='') then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into receipt from public.mv_review_receipts where user_id=p_user_id and request_id=p_request_id;
  if found then
    if receipt.track_id <> p_track_id then raise exception 'Invalid receipt' using errcode='22023'; end if;
    return receipt.result;
  end if;
  select * into t from public.listen_bar_tracks where id=p_track_id for share;
  if not found or not t.is_active or t.source <> 'community' or t.is_featured_official
    or t.review_status <> 'approved' or t.hidden_at is not null or t.removed_at is not null
    or t.ai_music_showtime_public_removed_at is not null then
    raise exception 'Unavailable work' using errcode='42501';
  end if;
  if p_score is not null and t.created_by=p_user_id then
    raise exception 'Creators cannot rate their own work' using errcode='42501';
  end if;
  owner := public.work_review_owner(p_user_id);
  select * into r from public.mv_work_ratings where track_id=p_track_id and user_id=p_user_id for update;
  if r.user_id is not null and p_score is not null and p_score is distinct from r.score and not owner then
    raise exception 'REVIEW_SCORE_LOCKED' using errcode='42501';
  end if;
  select id into existing_comment from public.listen_bar_track_comments where track_id=p_track_id and user_id=p_user_id
    order by (id=r.comment_id) desc nulls last, created_at desc, id desc limit 1;
  if btrim(p_body) <> '' and existing_comment is not null then
    raise exception 'REVIEW_ALREADY_EXISTS' using errcode='42501';
  end if;
  if r.comment_id is not null and exists(select 1 from public.listen_bar_track_comments where id=r.comment_id and moderation_status<>'visible') then
    raise exception 'REVIEW_UNAVAILABLE' using errcode='42501';
  end if;
  if btrim(p_body) <> '' then
    insert into public.listen_bar_track_comments(track_id,user_id,display_name,body)
    values(p_track_id,p_user_id,coalesce(nullif(left(btrim(p_name),48),''),'AIPOGER'),btrim(p_body)) returning * into c;
    if t.created_by is not null and t.created_by<>p_user_id then
      insert into public.battle_notifications(user_id,type,title,body,metadata)
      values(t.created_by,'listen_bar_track_comment','你的作品〈'||t.title||'〉收到新留言',c.display_name||' 留言：'||c.body,
        jsonb_build_object('trackId',t.id,'commentId',c.id,'commenterName',c.display_name,'href',case when p_surface='mv' then '/mv?track='||t.id else '/ai-music?track='||t.id||'&comments=1' end));
    end if;
  end if;
  if p_score is not null then
    insert into public.mv_work_ratings(track_id,user_id,score,comment_id) values(p_track_id,p_user_id,p_score,c.id)
    on conflict(track_id,user_id) do update set score=excluded.score, updated_at=now(),
      comment_id=coalesce(mv_work_ratings.comment_id,excluded.comment_id,existing_comment);
    if existing_comment is not null and r.user_id is null then
      update public.mv_work_ratings set comment_id=existing_comment where track_id=p_track_id and user_id=p_user_id;
    end if;
  end if;
  if p_score is null and r.user_id is not null and r.comment_id is null and c.id is not null then
    update public.mv_work_ratings set comment_id=c.id where track_id=p_track_id and user_id=p_user_id;
  end if;
  result := jsonb_build_object('myScore',coalesce(p_score,r.score),'comment',case when c.id is not null then
    jsonb_build_object('id',c.id,'name',c.display_name,'text',c.body,'createdAt',c.created_at) else null end);
  insert into public.mv_review_receipts(user_id,request_id,track_id,result) values(p_user_id,p_request_id,p_track_id,result);
  return result;
end;
$$;
revoke all on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) to service_role;


-- Both new and legacy edit RPCs enforce the same permissions; no client-supplied owner flag.
create or replace function public.edit_work_review(p_user uuid,p_comment uuid,p_body text,p_active boolean,p_score numeric) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c public.listen_bar_track_comments%rowtype; owner boolean; sig text; awarded boolean; current_score numeric;
begin
  if p_user is null or p_active is null or p_body is null or length(btrim(p_body))>280 or (p_active and btrim(p_body)='')
    or (p_score is not null and (p_score not between 1 and 10 or p_score<>trunc(p_score,1))) then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  owner := public.work_review_owner(p_user);
  select * into c from public.listen_bar_track_comments where id=p_comment;
  if not found or (p_active and c.user_id is distinct from p_user) or (not p_active and not owner) then
    raise exception 'REVIEW_OWNER_ONLY' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(coalesce(c.user_id,p_user)::text,0));
  select * into c from public.listen_bar_track_comments where id=p_comment for update;
  if not found then raise exception 'REVIEW_UNAVAILABLE' using errcode='42501'; end if;
  if not p_active then
    update public.listen_bar_track_comments set moderation_status='hidden',moderation_note='owner_deleted',
      moderated_by=p_user,moderated_at=clock_timestamp(),updated_at=clock_timestamp() where id=c.id;
    return jsonb_build_object('ok',true);
  end if;
  if c.moderation_status<>'visible' then raise exception 'REVIEW_UNAVAILABLE' using errcode='42501'; end if;
  select score into current_score from public.mv_work_ratings where track_id=c.track_id and user_id=p_user;
  if p_score is not null and p_score is distinct from current_score then
    if not owner then raise exception 'REVIEW_SCORE_LOCKED' using errcode='42501'; end if;
    if exists(select 1 from public.listen_bar_tracks where id=c.track_id and created_by=p_user) then
      raise exception 'Creators cannot rate their own work' using errcode='42501';
    end if;
  end if;
  if btrim(p_body) is distinct from c.body then
    if not owner and c.review_edit_count>=1 then raise exception 'REVIEW_EDIT_LIMIT' using errcode='42501'; end if;
    select exists(select 1 from public.creator_credit_awards where user_id=p_user and track_id=c.track_id
      and kind='review' and comment_id=c.id and version>0) into awarded;
    if awarded and not owner then
      if not public.creator_credit_review_valid(p_body) then raise exception 'REVIEW_CONTENT_REQUIRED' using errcode='22023'; end if;
      sig := md5(lower(regexp_replace(normalize(btrim(p_body),NFKC),'[^[:alnum:]一-龥ぁ-んァ-ン가-힣]','','g')));
      insert into public.creator_credit_review_texts(body_hash,user_id,track_id) values(sig,p_user,c.track_id) on conflict do nothing;
      if not exists(select 1 from public.creator_credit_review_texts where body_hash=sig and user_id=p_user and track_id=c.track_id) then
        raise exception 'REVIEW_CONTENT_REQUIRED' using errcode='22023';
      end if;
    end if;
    update public.listen_bar_track_comments set body=btrim(p_body),review_edit_count=review_edit_count+1,updated_at=clock_timestamp() where id=c.id;
  end if;
  if p_score is not null and p_score is distinct from current_score then
    insert into public.mv_work_ratings(track_id,user_id,score,comment_id) values(c.track_id,p_user,p_score,c.id)
      on conflict(track_id,user_id) do update set score=excluded.score,updated_at=clock_timestamp();
  end if;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.edit_work_review(uuid,uuid,text,boolean,numeric) from public,anon,authenticated;
grant execute on function public.edit_work_review(uuid,uuid,text,boolean,numeric) to service_role;

create or replace function public.edit_work_review(p_user uuid,p_comment uuid,p_body text,p_active boolean) returns jsonb
language sql security invoker set search_path='' as $$
  select public.edit_work_review(p_user,p_comment,p_body,p_active,null::numeric);
$$;
revoke all on function public.edit_work_review(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.edit_work_review(uuid,uuid,text,boolean) to service_role;

-- Older integer clients must not bypass final scores.
create or replace function public.save_mv_review(p_track_id uuid,p_user_id uuid,p_score integer,p_body text,p_name text,p_request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select public.save_work_review(p_track_id,p_user_id,p_score::numeric,p_body,p_name,p_request_id,'mv');
$$;
revoke all on function public.save_mv_review(uuid,uuid,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_mv_review(uuid,uuid,integer,text,text,uuid) to service_role;
notify pgrst,'reload schema';
