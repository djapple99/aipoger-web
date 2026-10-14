-- Read-only community recognition; never changes votes, works, Credit or archives.
create or replace function public.showtime_community_summary()
returns jsonb language sql stable security invoker set search_path='' as $$
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
  ), activity as (
    select 'reviewers' kind,c.user_id,count(distinct c.track_id) amount,max(c.created_at) latest
      from valid_reviews c group by c.user_id
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
$$;
revoke all on function public.showtime_community_summary() from public,anon,authenticated;
grant execute on function public.showtime_community_summary() to service_role;
create index if not exists showtime_recent_reviews_idx on public.listen_bar_track_comments(created_at desc)
  where moderation_status='visible';
