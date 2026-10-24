-- Creator replies are discussions, separate from original reviews and ratings.
-- No backfill, daily cap, balance rewrite, or change to existing award policies.
create table if not exists public.work_comment_replies (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  comment_id uuid not null references public.listen_bar_track_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  display_name text not null check(char_length(btrim(display_name)) between 1 and 80),
  body text not null check(char_length(btrim(body)) between 1 and 280),
  moderation_status text not null default 'visible' check(moderation_status in ('visible','hidden')),
  awarded_credit smallint not null default 0 check(awarded_credit in (0,2)),
  created_at timestamptz not null default clock_timestamp(),
  unique(user_id,request_id)
);
create index if not exists work_comment_replies_track_idx on public.work_comment_replies(track_id,created_at,id);
create index if not exists work_comment_replies_comment_idx on public.work_comment_replies(comment_id);
create index if not exists work_comment_replies_user_idx on public.work_comment_replies(user_id);
alter table public.work_comment_replies enable row level security;
revoke all on public.work_comment_replies from public,anon,authenticated;
grant select,insert,update on public.work_comment_replies to service_role;

-- A permanent receipt survives deletion/moderation of the comment or its replies.
-- One original comment earns at most one award, regardless of retries or reposts.
create table if not exists public.creator_credit_reply_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  delta integer not null default 2 check(delta=2),
  reason text not null default 'creator_reply' check(reason='creator_reply'),
  source_id uuid not null unique,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists creator_credit_reply_awards_user_idx on public.creator_credit_reply_awards(user_id,created_at desc);
alter table public.creator_credit_reply_awards enable row level security;
revoke all on public.creator_credit_reply_awards from public,anon,authenticated;
grant select,insert on public.creator_credit_reply_awards to service_role;
drop trigger if exists creator_credit_reply_ledger_lock on public.creator_credit_reply_awards;
create trigger creator_credit_reply_ledger_lock before insert on public.creator_credit_reply_awards
for each row execute function aipoger_private.credit_ledger_lock();

create or replace view public.creator_credit_history with (security_invoker=true) as
  select id,user_id,delta,reason,source_id,created_at from public.creator_credit_entries
  union all select id,user_id,delta,reason,source_id,created_at from public.creator_credit_participation_entries
  union all select id,user_id,delta,reason,source_id,created_at from public.creator_credit_reply_awards;
revoke all on public.creator_credit_history from public,anon,authenticated;
grant select on public.creator_credit_history to service_role;

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
  if not exists(select 1 from auth.users where id=p_user and is_anonymous is not true) then
    raise exception 'REPLY_SIGN_IN' using errcode='42501';
  end if;
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
