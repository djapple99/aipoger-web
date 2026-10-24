-- Album classification is additive; the separately authorized conversion keeps
-- its original work ID, assets, timestamps and all interaction records.
alter table public.listen_bar_tracks
  add column if not exists work_kind text not null default 'single',
  add column if not exists album_track_ids uuid[] not null default '{}',
  add column if not exists album_duration_seconds integer,
  add column if not exists work_classified_at timestamptz,
  add column if not exists work_classification_note text;
alter table public.listen_bar_tracks
  add constraint listen_bar_work_kind_check check(work_kind in ('single','album')),
  add constraint listen_bar_album_items_check check(
    (work_kind='single' and cardinality(album_track_ids)=0) or
    (work_kind='album' and (cardinality(album_track_ids)=0 or cardinality(album_track_ids) between 2 and 50))),
  add constraint listen_bar_album_duration_check check(album_duration_seconds is null or album_duration_seconds between 1 and 86400);
alter table public.listen_bar_tracks drop constraint creator_track_external_fields_required;
alter table public.listen_bar_tracks add constraint creator_track_external_fields_required check (
  (work_kind='album' and cardinality(album_track_ids)>=2) or audio_path is not null or
  (external_provider is not null and external_media_id is not null and external_url is not null));
alter table public.listen_bar_tracks drop constraint creator_track_media_source;
alter table public.listen_bar_tracks add constraint creator_track_media_source check(
  (work_kind='album' and cardinality(album_track_ids)>=2 and audio_path is null and external_provider is null and external_media_id is null and external_url is null)
  or (cardinality(album_track_ids)=0 and (
    (nullif(btrim(audio_path),'') is not null and external_provider is null and external_media_id is null and external_url is null)
    or (audio_path is null and external_provider in ('youtube','suno','spotify') and external_media_id is not null and external_url is not null and (
      (external_provider='youtube' and external_media_id ~ '^[A-Za-z0-9_-]{11}$' and external_url='https://www.youtube.com/watch?v='||external_media_id)
      or (external_provider='suno' and external_media_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and external_url='https://suno.com/song/'||external_media_id)
      or (external_provider='spotify' and external_media_id ~ '^[A-Za-z0-9]{22}$' and external_url='https://open.spotify.com/track/'||external_media_id))))));
create index if not exists listen_bar_album_catalog on public.listen_bar_tracks(created_at desc,id) where work_kind='album' and is_active;

create or replace function public.guard_album_work() returns trigger language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  if TG_OP='UPDATE' and (new.work_kind,new.album_track_ids,new.album_duration_seconds,new.work_classification_note,new.work_classified_at)
    is distinct from (old.work_kind,old.album_track_ids,old.album_duration_seconds,old.work_classification_note,old.work_classified_at)
    and current_user not in ('postgres','service_role') then
    raise exception 'WORK_CLASSIFICATION_LOCKED' using errcode='42501';
  end if;
  if new.work_kind='album' and cardinality(new.album_track_ids)>0 and
    (TG_OP='INSERT' or new.album_track_ids is distinct from old.album_track_ids) then
    if new.source<>'community' or new.created_by is null or
      array_position(new.album_track_ids,null) is not null or
      (select count(distinct x) from unnest(new.album_track_ids) x)<>cardinality(new.album_track_ids) then
      raise exception 'INVALID_ALBUM_TRACKS' using errcode='22023';
    end if;
    perform 1 from public.listen_bar_tracks where id=any(new.album_track_ids) for share;
    select count(*) into n from public.listen_bar_tracks t where t.id=any(new.album_track_ids)
      and t.created_by=new.created_by and t.source='community' and t.work_kind='single'
      and t.is_active and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
      and t.ai_music_showtime_public_removed_at is null
      and (nullif(btrim(t.audio_path),'') is not null or t.external_url is not null);
    if n<>cardinality(new.album_track_ids) then raise exception 'ALBUM_TRACKS_NOT_OWNED_OR_UNAVAILABLE' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_album_work() from public,anon,authenticated;
grant execute on function public.guard_album_work() to service_role;
create trigger guard_album_work before insert or update on public.listen_bar_tracks for each row execute function public.guard_album_work();

create or replace function public.guard_album_rating() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from public.listen_bar_tracks where id=new.track_id and work_kind='album') then
    raise exception 'ALBUM_RATING_DISABLED' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_album_rating() from public,anon,authenticated;
grant execute on function public.guard_album_rating() to service_role;
create trigger guard_album_rating before insert or update of score,track_id on public.mv_work_ratings for each row execute function public.guard_album_rating();

CREATE OR REPLACE FUNCTION public.save_work_review(p_track_id uuid, p_user_id uuid, p_score numeric, p_body text, p_name text, p_request_id uuid, p_surface text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  if p_score is not null and t.work_kind='album' then
    raise exception 'ALBUM_RATING_DISABLED' using errcode='42501';
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
$function$;

CREATE OR REPLACE FUNCTION public.work_rating_summaries()
 RETURNS TABLE(track_id uuid, average numeric, people bigint, total numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select r.track_id, avg(r.score), count(*), sum(r.score)
  from public.mv_work_ratings r
  join public.listen_bar_tracks t on t.id=r.track_id
  left join public.listen_bar_track_comments c on c.id=r.comment_id
  where t.work_kind='single' and t.is_active and t.source='community' and not t.is_featured_official
    and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null
    and r.user_id is distinct from t.created_by
    and (r.comment_id is null or c.moderation_status='visible')
  group by r.track_id;
$function$;

CREATE OR REPLACE FUNCTION public.blind_track_eligible(p_track uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.listen_bar_tracks t where t.id=p_track
    and t.work_kind='single' and t.source='community' and t.is_active and not t.is_featured_official
    and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null and t.created_by is distinct from p_user
    and t.created_at <= now()
    and now() < ((t.created_at at time zone 'Asia/Taipei')+interval '3 months') at time zone 'Asia/Taipei'
    and t.duration_seconds>=45 and nullif(btrim(t.audio_path),'') is not null);
$function$;

revoke all on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) to service_role;
revoke all on function public.work_rating_summaries() from public,anon,authenticated;
grant execute on function public.work_rating_summaries() to service_role;
revoke all on function public.blind_track_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.blind_track_eligible(uuid,uuid) to service_role;
