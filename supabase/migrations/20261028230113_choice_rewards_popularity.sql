-- Authorized 2026-10-29 Asia/Taipei: Choice publication +50, valid comments +10.
-- Own songs are allowed. No historical rewards or existing ledger rewrites.
create table public.choice_credit_awards (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 collection_kind text not null check(collection_kind in ('creator','official')), collection_id uuid not null,
 reason text not null, delta integer not null, week_start date, comment_id uuid,
 source_id uuid not null unique default gen_random_uuid(), created_at timestamptz not null default clock_timestamp(),
 unique(user_id,reason,collection_kind,collection_id),
 check((reason='choice_publish' and delta=50 and collection_kind='creator' and week_start is not null and comment_id is null)
    or (reason='choice_review' and delta=10 and week_start is null and comment_id is not null))
);
create unique index choice_publish_week_once on public.choice_credit_awards(user_id,week_start) where reason='choice_publish';
create unique index choice_publish_collection_once on public.choice_credit_awards(collection_id) where reason='choice_publish';
create table aipoger_private.choice_first_publications(collection_id uuid primary key, user_id uuid not null, week_start date not null);
-- Existing publications stay ineligible after withdrawal/republication. No credits are issued.
insert into aipoger_private.choice_first_publications select id,creator_id,week_start from public.aipoger_creator_choice_collections where is_published;
create table aipoger_private.choice_review_text_claims(body_hash text primary key,comment_id uuid not null);
create table aipoger_private.choice_first_saves(
 collection_kind text not null,collection_id uuid not null,user_id uuid not null,first_saved_at timestamptz not null,
 primary key(collection_kind,collection_id,user_id));
insert into aipoger_private.choice_first_saves select collection_kind,collection_id,user_id,created_at from public.aipoger_choice_collection_hearts;
alter table public.choice_credit_awards enable row level security;
alter table aipoger_private.choice_first_publications enable row level security;
alter table aipoger_private.choice_review_text_claims enable row level security;
alter table aipoger_private.choice_first_saves enable row level security;
revoke all on public.choice_credit_awards,aipoger_private.choice_first_publications,aipoger_private.choice_review_text_claims,aipoger_private.choice_first_saves from public,anon,authenticated;
grant select on public.choice_credit_awards to service_role;
create trigger choice_credit_ledger_lock before insert on public.choice_credit_awards for each row execute function aipoger_private.credit_ledger_lock();
create or replace view public.creator_credit_history with(security_invoker=true) as
 select id,user_id,delta,reason,source_id,created_at from public.creator_credit_entries
 union all select id,user_id,delta,reason,source_id,created_at from public.creator_credit_participation_entries
 union all select id,user_id,delta,reason,source_id,created_at from public.creator_credit_reply_awards
 union all select id,user_id,delta,reason,source_id,created_at from public.bible_expression_copy_receipts
 union all select id,user_id,delta,reason,source_id,created_at from public.choice_credit_awards;
revoke all on public.creator_credit_history from public,anon,authenticated;
grant select on public.creator_credit_history to service_role;

create function aipoger_private.choice_publication_reward() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_week date := date_trunc('week',now() at time zone 'Asia/Taipei')::date; v_seen boolean; v_count integer;
begin
 select exists(select 1 from aipoger_private.choice_first_publications where collection_id=new.id) into v_seen;
 if v_seen and tg_op='UPDATE' and (new.week_start<>old.week_start or new.creator_id<>old.creator_id) then
   raise exception '已發布的 Choice 不能改週次或策展人。' using errcode='22023';
 end if;
 if not new.is_published or v_seen then return new; end if;
 if new.week_start<>v_week then raise exception '首次發布請選擇本週；每週一份 Choice。' using errcode='22023'; end if;
 if nullif(btrim(new.title),'') is null or nullif(btrim(new.intro),'') is null then
   raise exception '發布前請填寫歌單標題與推薦文字。' using errcode='22023';
 end if;
 select count(*) into v_count from public.aipoger_creator_choice_items where collection_id=new.id;
 if v_count<5 or v_count>10 then raise exception '發布 Choice 需要 5–10 首歌曲。' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=new.creator_id and not coalesce(is_anonymous,false)) then
   raise exception '請登入會員後發布。' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text,0));
 -- Keep the weekly publication limit even if a previously published collection is deleted.
 if exists(select 1 from aipoger_private.choice_first_publications where user_id=new.creator_id and week_start=v_week and collection_id<>new.id) then
   raise exception '這週已發布過一份 Choice，刪除不重置每週額度。' using errcode='22023';
 end if;
 insert into aipoger_private.choice_first_publications values(new.id,new.creator_id,v_week) on conflict do nothing;
 insert into public.choice_credit_awards(user_id,collection_kind,collection_id,reason,delta,week_start)
 values(new.creator_id,'creator',new.id,'choice_publish',50,v_week) on conflict do nothing;
 return new;
end; $$;
revoke all on function aipoger_private.choice_publication_reward() from public,anon,authenticated;
create trigger choice_publication_reward before insert or update on public.aipoger_creator_choice_collections
 for each row execute function aipoger_private.choice_publication_reward();

create function aipoger_private.choice_comment_reward() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_public boolean; v_sig text; v_claim uuid;
begin
 if new.collection_kind='creator' then
   select creator_id,is_published into v_owner,v_public from public.aipoger_creator_choice_collections where id=new.collection_id;
 else
   select created_by,is_published into v_owner,v_public from public.aipoger_choice_collections where id=new.collection_id;
 end if;
 if not coalesce(v_public,false) or v_owner is null or new.user_id=v_owner or new.moderation_status<>'visible'
   or not public.creator_credit_review_valid(new.body) then return new; end if;
 if not exists(select 1 from auth.users where id=new.user_id and not coalesce(is_anonymous,false)) then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if exists(select 1 from public.choice_credit_awards where user_id=new.user_id and reason='choice_review'
    and collection_kind=new.collection_kind and collection_id=new.collection_id) then return new; end if;
 v_sig := md5(lower(regexp_replace(normalize(new.body,NFKC),'[^[:alnum:]一-龥ぁ-んァ-ン가-힣]','','g')));
 insert into aipoger_private.choice_review_text_claims values(v_sig,new.id) on conflict do nothing;
 select comment_id into v_claim from aipoger_private.choice_review_text_claims where body_hash=v_sig;
 if v_claim<>new.id then return new; end if;
 insert into public.choice_credit_awards(user_id,collection_kind,collection_id,reason,delta,comment_id)
 values(new.user_id,new.collection_kind,new.collection_id,'choice_review',10,new.id) on conflict do nothing;
 return new;
end; $$;
revoke all on function aipoger_private.choice_comment_reward() from public,anon,authenticated;
create trigger choice_comment_reward after insert on public.aipoger_choice_collection_comments
 for each row execute function aipoger_private.choice_comment_reward();

-- Server authenticates identity; request ID binds a retry to this exact comment.
create function public.post_choice_comment(p_user uuid,p_request uuid,p_kind text,p_collection uuid,p_name text,p_avatar text,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.aipoger_choice_collection_comments%rowtype; v_public boolean; v_replayed boolean:=false; v_awarded integer;
begin
 if p_request is null or p_user is null or p_kind not in ('creator','official') or p_kind is null
   or nullif(btrim(p_body),'') is null or char_length(p_body)>280 then raise exception '評論資料不完整。' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_user and not coalesce(is_anonymous,false)) then raise exception '請先登入。' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into v_row from public.aipoger_choice_collection_comments where id=p_request;
 if found then
   if v_row.user_id<>p_user or v_row.collection_kind<>p_kind or v_row.collection_id<>p_collection or v_row.body<>btrim(p_body) then
     raise exception '評論請求不一致，請重新送出。' using errcode='22023'; end if;
   v_replayed:=true;
 else
   if p_kind='creator' then select is_published into v_public from public.aipoger_creator_choice_collections where id=p_collection;
   else select is_published into v_public from public.aipoger_choice_collections where id=p_collection; end if;
   if not coalesce(v_public,false) then raise exception '這份 Choice 目前未公開。' using errcode='22023'; end if;
   insert into public.aipoger_choice_collection_comments(id,collection_kind,collection_id,user_id,display_name,avatar_url,body)
    values(p_request,p_kind,p_collection,p_user,p_name,p_avatar,btrim(p_body)) returning * into v_row;
 end if;
 select coalesce(sum(delta),0) into v_awarded from public.choice_credit_awards where comment_id=p_request and user_id=p_user;
 return jsonb_build_object('comment',to_jsonb(v_row),'awarded',case when v_replayed then 0 else v_awarded end,'replayed',v_replayed);
end; $$;
revoke all on function public.post_choice_comment(uuid,uuid,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.post_choice_comment(uuid,uuid,text,uuid,text,text,text) to service_role;

create function aipoger_private.choice_save_first_time() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into aipoger_private.choice_first_saves values(new.collection_kind,new.collection_id,new.user_id,new.created_at) on conflict do nothing;
 select first_saved_at into new.created_at from aipoger_private.choice_first_saves
 where collection_kind=new.collection_kind and collection_id=new.collection_id and user_id=new.user_id;
 return new;
end; $$;
revoke all on function aipoger_private.choice_save_first_time() from public,anon,authenticated;
create trigger choice_save_first_time before insert on public.aipoger_choice_collection_hearts
 for each row execute function aipoger_private.choice_save_first_time();

create function public.choice_popularity_counts(p_keys text[]) returns jsonb
language sql stable security invoker set search_path='' as $$
 with playlists as (
  select 'creator:'||id::text key,creator_id owner from public.aipoger_creator_choice_collections where is_published
  union all select 'official:'||id::text,created_by from public.aipoger_choice_collections where is_published
 ), counts as (
  select p.key,count(distinct h.user_id) amount from playlists p left join public.aipoger_choice_collection_hearts h
  on h.collection_kind||':'||h.collection_id::text=p.key and h.user_id is distinct from p.owner
  and h.created_at>=now()-interval '30 days' and h.created_at<=now()
  where p.key=any(p_keys[1:48]) group by p.key
 ) select coalesce(jsonb_object_agg(key,amount),'{}'::jsonb) from counts;
$$;
revoke all on function public.choice_popularity_counts(text[]) from public,anon,authenticated;
grant execute on function public.choice_popularity_counts(text[]) to service_role;
CREATE OR REPLACE FUNCTION public.showtime_community_summary()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with public_works as materialized (
    select t.* from public.listen_bar_tracks t
    where t.source='community' and t.is_active and not t.is_featured_official
      and coalesce(t.review_status,'approved')='approved'
      and t.hidden_at is null and t.removed_at is null and t.ai_music_showtime_public_removed_at is null
      and t.created_at<=now()
      and (nullif(btrim(t.audio_path),'') is not null or t.external_url ~
        '^https://(www\.)?(youtube\.com/watch\?v=[A-Za-z0-9_-]{11}|suno\.com/song/[0-9a-fA-F-]{36}|open\.spotify\.com/track/[A-Za-z0-9]{22})$')
  ), valid_reviews as materialized (
    select c.* from public.listen_bar_track_comments c join public_works t on t.id=c.track_id
    where c.user_id is not null and c.user_id is distinct from t.created_by
      and c.moderation_status='visible' and char_length(regexp_replace(c.body,'[[:space:]]','','g'))>=20
      and c.created_at>=now()-interval '30 days' and c.created_at<=now()
  ), choice_reviews as (
 select c.* from public.aipoger_choice_collection_comments c join public.choice_credit_awards a
 on a.comment_id=c.id and a.reason='choice_review'
 where c.moderation_status='visible' and c.created_at>=now()-interval '30 days' and c.created_at<=now()
 and ((c.collection_kind='creator' and exists(select 1 from public.aipoger_creator_choice_collections p where p.id=c.collection_id and p.is_published))
 or (c.collection_kind='official' and exists(select 1 from public.aipoger_choice_collections p where p.id=c.collection_id and p.is_published)))
 ), review_activity as (
 select c.user_id,'work:'||c.track_id::text target,c.created_at from valid_reviews c
 union all select c.user_id,c.collection_kind||':'||c.collection_id::text,c.created_at from choice_reviews c
 ), activity as (
    select 'reviewers' kind,c.user_id,count(distinct c.target) amount,max(c.created_at) latest
      from review_activity c group by c.user_id
    union all
    select 'creators',t.created_by,count(*),max(t.created_at) from public_works t
      where t.created_by is not null and t.created_at>=now()-interval '30 days' group by t.created_by
    union all
    select 'listeners',q.user_id,count(distinct q.id),max(q.completed_at)
      from public.blind_listen_questions q join public.creator_credit_entries e on e.source_id=q.id and e.user_id=q.user_id
      where q.state='voted' and q.choice in ('A','B','tie') and q.heard_a>=8 and q.heard_b>=8
        and e.reason='blind_compare' and e.delta=3
        and q.completed_at>=now()-interval '30 days' and q.completed_at<=now() group by q.user_id
  ), named as (
    select a.*,coalesce(nullif(btrim(f.display_name),''),nullif(btrim(p.fighter_name),''),nullif(btrim(p.display_name),''),
      (select nullif(btrim(c.display_name),'') from valid_reviews c where c.user_id=a.user_id order by c.created_at desc,c.id limit 1),
      'AIPOGER 聽眾') display_name
      from activity a left join public.fighter_profiles f on f.id=a.user_id left join public.user_profiles p on p.id=a.user_id
  ), ranked as (
    select n.*,row_number() over(partition by kind order by amount desc,latest desc,user_id) position from named n
  ), excerpts as (
    select c.id,c.track_id,c.display_name,c.body,c.created_at,t.title,t.cover_path,t.youtube_url,
      row_number() over(partition by c.track_id order by c.created_at desc,c.id) position
      from valid_reviews c join public_works t on t.id=c.track_id
      where c.created_at >= date_trunc('week',now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei'
        and now()<((t.created_at at time zone 'Asia/Taipei')+interval '3 months') at time zone 'Asia/Taipei'
  ), selected_reviews as (select * from excerpts where position=1 order by created_at desc,id limit 2),
  collection_counts as (
    select c.collection_kind||':'||c.collection_id::text record_key,count(*) amount from public.aipoger_choice_collection_comments c
      where c.moderation_status='visible' and (
        (c.collection_kind='creator' and exists(select 1 from public.aipoger_creator_choice_collections p where p.id=c.collection_id and p.is_published))
        or (c.collection_kind='official' and exists(select 1 from public.aipoger_choice_collections p where p.id=c.collection_id and p.is_published)))
      group by c.collection_kind,c.collection_id
  )
  select jsonb_build_object(
    'reviewers',coalesce((select jsonb_agg(jsonb_build_object('name',case when position('@' in display_name)>0 then 'AIPOGER 聽眾' else display_name end,'count',amount) order by position) from ranked where kind='reviewers' and position<=5),'[]'::jsonb),
    'creators',coalesce((select jsonb_agg(jsonb_build_object('name',case when position('@' in display_name)>0 then 'AIPOGER 創作者' else display_name end,'count',amount) order by position) from ranked where kind='creators' and position<=5),'[]'::jsonb),
    'listeners',coalesce((select jsonb_agg(jsonb_build_object('name',case when position('@' in display_name)>0 then 'AIPOGER 聽眾' else display_name end,'count',amount) order by position) from ranked where kind='listeners' and position<=5),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',id,'trackId',track_id,'name',case when position('@' in display_name)>0 then 'AIPOGER 聽眾' else display_name end,'body',body,'title',title,'coverPath',cover_path,'isMv',nullif(btrim(youtube_url),'') is not null) order by created_at desc,id) from selected_reviews),'[]'::jsonb),
    'choiceCommentCounts',coalesce((select jsonb_object_agg(record_key,amount) from collection_counts),'{}'::jsonb),
    'generatedAt',now());
$function$;

revoke all on function public.showtime_community_summary() from public,anon,authenticated;
grant execute on function public.showtime_community_summary() to service_role;
