-- News engagement is separate from work ratings, Hearts and Credit.
-- Only the server API may access these tables after verifying auth.getUser.
create table if not exists public.music_news_likes (
  article_slug text not null check (article_slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_slug, user_id)
);
create index if not exists music_news_likes_user_idx on public.music_news_likes(user_id);

create table if not exists public.music_news_comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null check (article_slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden')),
  moderation_note text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  unique (user_id, request_id)
);
create index if not exists music_news_comments_public_idx on public.music_news_comments(article_slug, created_at desc, id desc) where moderation_status = 'visible';
create index if not exists music_news_comments_user_idx on public.music_news_comments(user_id, created_at desc);
create index if not exists music_news_comments_moderated_by_idx on public.music_news_comments(moderated_by) where moderated_by is not null;
alter table public.music_news_likes enable row level security;
alter table public.music_news_comments enable row level security;
revoke all on public.music_news_likes, public.music_news_comments from public, anon, authenticated;
grant select, insert, update, delete on public.music_news_likes, public.music_news_comments to service_role;

create or replace function public.read_music_news_discussion(p_slug text, p_user uuid default null, p_before timestamptz default null, p_before_id uuid default null)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with candidates as (
    select id, display_name, body, created_at from public.music_news_comments
    where article_slug = p_slug and moderation_status = 'visible'
      and (p_before is null or (created_at,id) < (p_before,p_before_id))
    order by created_at desc, id desc limit 21
  ), page as (select * from candidates order by created_at desc,id desc limit 20)
  select jsonb_build_object(
    'likeCount', (select count(*) from public.music_news_likes where article_slug=p_slug),
    'liked', exists(select 1 from public.music_news_likes where article_slug=p_slug and user_id=p_user),
    'commentCount', (select count(*) from public.music_news_comments where article_slug=p_slug and moderation_status='visible'),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id',id,'displayName',display_name,'body',body,'createdAt',created_at) order by created_at desc,id desc) from page),'[]'::jsonb),
    'nextCursor', case when (select count(*) from candidates)>20 then
      (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at asc,id asc limit 1) else null end
  );
$$;

create or replace function public.set_music_news_like(p_user uuid, p_slug text, p_liked boolean)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_user is null or p_liked is null then raise exception 'NEWS_INVALID_INPUT' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('news-like:'||p_slug,0));
  if p_liked then
    insert into public.music_news_likes(article_slug,user_id) values(p_slug,p_user) on conflict do nothing;
  else
    delete from public.music_news_likes where article_slug=p_slug and user_id=p_user;
  end if;
  return jsonb_build_object('liked',p_liked,'likeCount',(select count(*) from public.music_news_likes where article_slug=p_slug));
end;
$$;

create or replace function public.save_music_news_comment(p_user uuid, p_slug text, p_request uuid, p_name text, p_body text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_comment public.music_news_comments; v_replayed boolean := false;
begin
  if p_user is null or p_request is null or p_name is null or char_length(btrim(p_name)) not between 1 and 80
    or p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then
    raise exception 'NEWS_INVALID_INPUT' using errcode='22023';
  end if;
  -- Serialize this member's submissions across articles, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended('news-comment:'||p_user::text,0));
  select * into v_comment from public.music_news_comments where user_id=p_user and request_id=p_request;
  if found then
    if v_comment.article_slug is distinct from p_slug or v_comment.body is distinct from btrim(p_body) then
      raise exception 'NEWS_REQUEST_CONFLICT' using errcode='22023';
    end if;
    if v_comment.moderation_status <> 'visible' then raise exception 'NEWS_COMMENT_UNAVAILABLE' using errcode='42501'; end if;
    v_replayed := true;
  else
    if (select count(*) from public.music_news_comments where user_id=p_user and created_at>now()-interval '1 hour')>=12 then
      raise exception 'NEWS_RATE_LIMIT' using errcode='P0001';
    end if;
    insert into public.music_news_comments(article_slug,user_id,request_id,display_name,body)
      values(p_slug,p_user,p_request,btrim(p_name),btrim(p_body)) returning * into v_comment;
  end if;
  return jsonb_build_object('comment',jsonb_build_object('id',v_comment.id,'displayName',v_comment.display_name,'body',v_comment.body,'createdAt',v_comment.created_at),
    'commentCount',(select count(*) from public.music_news_comments where article_slug=p_slug and moderation_status='visible'),'replayed',v_replayed);
end;
$$;

revoke all on function public.read_music_news_discussion(text,uuid,timestamptz,uuid), public.set_music_news_like(uuid,text,boolean), public.save_music_news_comment(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.read_music_news_discussion(text,uuid,timestamptz,uuid), public.set_music_news_like(uuid,text,boolean), public.save_music_news_comment(uuid,text,uuid,text,text) to service_role;
