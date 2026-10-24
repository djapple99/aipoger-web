-- Retain service-only membership verification through auth.getUser in the API.
-- No Auth grants, public RPC access, or changes to existing records.
create or replace function public.save_work_comment_reply(
  p_user uuid,p_track uuid,p_comment uuid,p_body text,p_name text,p_request uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  t public.listen_bar_tracks%rowtype;
  c public.listen_bar_track_comments%rowtype;
  r public.work_comment_replies%rowtype;
  award_id uuid;
  earned integer := 0;
begin
  if p_user is null or p_track is null or p_comment is null or p_request is null
    or coalesce(char_length(btrim(p_body)),0) not between 1 and 280
    or coalesce(char_length(btrim(p_name)),0) not between 1 and 80 then
    raise exception 'REPLY_INVALID' using errcode='22023';
  end if;
  -- Actor is bound by the authenticated server API; clients cannot call this RPC.
  -- Keep Auth rows private: service_role does not need SELECT on auth.users.
  -- Same user-first lock as other earnings and spending; safe with concurrent replies.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  select * into t from public.listen_bar_tracks where id=p_track for share;
  if not found or t.source<>'community' or not t.is_active or t.review_status<>'approved'
    or t.hidden_at is not null or t.removed_at is not null or t.ai_music_showtime_public_removed_at is not null then
    raise exception 'REPLY_UNAVAILABLE' using errcode='42501';
  end if;
  if t.created_by is distinct from p_user then raise exception 'REPLY_CREATOR_ONLY' using errcode='42501'; end if;
  select * into c from public.listen_bar_track_comments where id=p_comment and track_id=p_track for share;
  if not found or c.moderation_status<>'visible' or c.user_id is null then
    raise exception 'REPLY_UNAVAILABLE' using errcode='42501';
  end if;
  if c.user_id=p_user then raise exception 'REPLY_SELF' using errcode='42501'; end if;
  select * into r from public.work_comment_replies where user_id=p_user and request_id=p_request;
  if found then
    if r.track_id<>p_track or r.comment_id<>p_comment or r.body<>btrim(p_body) then
      raise exception 'REPLY_REQUEST_CONFLICT' using errcode='22023';
    end if;
    if r.moderation_status<>'visible' then raise exception 'REPLY_UNAVAILABLE' using errcode='42501'; end if;
    return jsonb_build_object('reply',jsonb_build_object('id',r.id,'commentId',r.comment_id,'name',r.display_name,'text',r.body,'createdAt',r.created_at),'creditAwarded',r.awarded_credit);
  end if;
  insert into public.creator_credit_reply_awards(user_id,source_id) values(p_user,p_comment)
    on conflict(source_id) do nothing returning id into award_id;
  if award_id is not null then earned:=2; end if;
  insert into public.work_comment_replies(track_id,comment_id,user_id,request_id,display_name,body,awarded_credit)
    values(p_track,p_comment,p_user,p_request,btrim(p_name),btrim(p_body),earned) returning * into r;
  insert into public.battle_notifications(user_id,type,title,body,metadata)
    values(c.user_id,'work_comment_reply','〈'||coalesce(t.title,'你的作品')||'〉的創作者回覆了你的評論',btrim(p_name)||'：'||btrim(p_body),
      jsonb_build_object('trackId',p_track,'trackTitle',t.title,'commentId',p_comment,'replyId',r.id,'replierName',btrim(p_name),
        'href','/works/'||p_track::text||'#comment-'||p_comment::text));
  return jsonb_build_object('reply',jsonb_build_object('id',r.id,'commentId',r.comment_id,'name',r.display_name,'text',r.body,'createdAt',r.created_at),'creditAwarded',earned);
end;
$$;
revoke all on function public.save_work_comment_reply(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_work_comment_reply(uuid,uuid,uuid,text,text,uuid) to service_role;
