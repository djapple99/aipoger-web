-- Preserve all existing scores and receipts. Music/MV use one decimal score per member/work.
alter table public.mv_work_ratings alter column score type numeric using score::numeric;
alter table public.mv_work_ratings drop constraint if exists work_rating_one_decimal;
alter table public.mv_work_ratings add constraint work_rating_one_decimal check (score = trunc(score,1));

create or replace function public.work_rating_summaries()
returns table(track_id uuid, average numeric, people bigint, total numeric)
language sql stable security invoker set search_path = '' as $$
  select r.track_id, avg(r.score), count(*), sum(r.score)
  from public.mv_work_ratings r
  join public.listen_bar_tracks t on t.id=r.track_id
  left join public.listen_bar_track_comments c on c.id=r.comment_id
  where t.is_active and t.source='community' and not t.is_featured_official
    and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null
    and r.user_id is distinct from t.created_by
    and (r.comment_id is null or c.moderation_status='visible')
  group by r.track_id;
$$;
revoke all on function public.work_rating_summaries() from public, anon, authenticated;
grant execute on function public.work_rating_summaries() to service_role;

-- Previous deployed clients retain their integer RPC and rounded public summary.
create or replace function public.mv_rating_summaries()
returns table(track_id uuid, average numeric, people bigint)
language sql stable security invoker set search_path = '' as $$
  select track_id, round(average,1), people from public.work_rating_summaries();
$$;
revoke all on function public.mv_rating_summaries() from public, anon, authenticated;
grant execute on function public.mv_rating_summaries() to service_role;

create or replace function public.save_work_review(
  p_track_id uuid, p_user_id uuid, p_score numeric, p_body text, p_name text, p_request_id uuid, p_surface text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t public.listen_bar_tracks%rowtype;
  c public.listen_bar_track_comments%rowtype;
  receipt public.mv_review_receipts%rowtype;
  result jsonb;
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
      comment_id=coalesce(excluded.comment_id,mv_work_ratings.comment_id);
  end if;
  result := jsonb_build_object('myScore',p_score,'comment',case when c.id is not null then
    jsonb_build_object('id',c.id,'name',c.display_name,'text',c.body,'createdAt',c.created_at) else null end);
  insert into public.mv_review_receipts(user_id,request_id,track_id,result) values(p_user_id,p_request_id,p_track_id,result);
  return result;
end;
$$;
revoke all on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.save_work_review(uuid,uuid,numeric,text,text,uuid,text) to service_role;

notify pgrst, 'reload schema';
