-- Keep immutable monthly source snapshots. Owner decisions resolve only equal
-- scores; unresolved closed months retain frozen counts while awaiting review.
begin;
select pg_advisory_xact_lock(724193, 1);

create table if not exists public.monthly_chart_decisions (
  id bigint generated always as identity primary key,
  month date not null check (extract(day from month) = 1),
  supporter_count bigint not null check (supporter_count >= 3),
  member_ids uuid[] not null check (cardinality(member_ids) >= 2),
  ordered_ids uuid[] not null check (cardinality(ordered_ids) = cardinality(member_ids)),
  decided_by uuid not null,
  decided_at timestamptz not null default clock_timestamp()
);
alter table public.monthly_chart_decisions enable row level security;
revoke all on public.monthly_chart_decisions from public, anon, authenticated, service_role;
grant select on public.monthly_chart_decisions to service_role;
create index if not exists monthly_chart_decisions_lookup
  on public.monthly_chart_decisions(month, supporter_count, id desc);
drop trigger if exists monthly_chart_decisions_immutable on public.monthly_chart_decisions;
create trigger monthly_chart_decisions_immutable before update or delete or truncate
  on public.monthly_chart_decisions for each statement execute function public.monthly_chart_reject_rewrite();

create or replace function public.monthly_chart_decision_source(p_month date)
returns table (track_id uuid, title text, artist text, genre text, ai_tool text, lyrics text,
  supporter_count bigint, global_rank bigint, genre_rank bigint)
language sql stable security definer set search_path = '' as $$
  select c.* from public.monthly_chart_candidates(p_month) c
    where not exists (select 1 from public.monthly_chart_months m where m.month = p_month)
  union all
  select e.track_id,e.title,e.artist,e.genre,e.ai_tool,e.lyrics,e.supporter_count,e.global_rank,e.genre_rank
    from public.monthly_chart_entries e where e.month = p_month;
$$;

create or replace function public.monthly_chart_tie_groups(p_month date)
returns table (supporter_count bigint, member_ids uuid[], ordered_ids uuid[], decision_id bigint)
language sql stable security definer set search_path = '' as $$
  with groups as (
    select c.supporter_count, array_agg(c.track_id order by c.track_id) as member_ids
    from public.monthly_chart_decision_source(p_month) c where c.supporter_count >= 3
    group by c.supporter_count having count(*) > 1
  )
  select g.supporter_count, g.member_ids, d.ordered_ids, d.id
  from groups g left join lateral (
    select x.id, x.ordered_ids from public.monthly_chart_decisions x
    where x.month=p_month and x.supporter_count=g.supporter_count and x.member_ids=g.member_ids
    order by x.id desc limit 1
  ) d on true;
$$;

-- Preserve the existing validation, genre aliases, settlement and visibility
-- contract behind a private base function; replay must not rename the wrapper.
do $$ begin
  if to_regprocedure('public.read_monthly_chart_base(text,text)') is null then
    alter function public.read_monthly_chart(text,text) rename to read_monthly_chart_base;
  end if;
end $$;
revoke all on function public.read_monthly_chart_base(text,text) from public, anon, authenticated, service_role;

create or replace function public.read_monthly_chart(p_month text default null, p_genre text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_month date;
  v_tracks jsonb;
  v_pending boolean;
  v_genre text := nullif(nullif(trim(p_genre), ''), 'all');
begin
  v_result := public.read_monthly_chart_base(p_month,p_genre);
  v_month := ((v_result->>'month') || '-01')::date;
  select exists(select 1 from public.monthly_chart_tie_groups(v_month) where ordered_ids is null) into v_pending;
  with source as (
    select c.*, g.member_ids, g.ordered_ids,
      array_position(g.ordered_ids,c.track_id) as owner_position,
      count(*) over(partition by c.genre,c.supporter_count) as genre_ties
    from public.monthly_chart_decision_source(v_month) c
    left join public.monthly_chart_tie_groups(v_month) g on c.supporter_count=g.supporter_count
  ), ranked as (
    select s.*,
      (s.supporter_count>=3 and s.member_ids is not null and s.ordered_ids is null
        and (v_genre is null or s.genre_ties>1)) as pending,
      case when s.supporter_count<3 then null
        when v_genre is null then s.global_rank + coalesce(s.owner_position-1,0)
        else s.genre_rank + row_number() over(partition by s.genre,s.supporter_count
          order by s.owner_position nulls last,s.track_id)-1 end as display_rank
    from source s
  )
  select coalesce(jsonb_agg(t.item || jsonb_build_object(
    'rank',case when r.pending then null else r.display_rank end,
    'rankPending',r.pending)
    order by r.supporter_count desc,r.display_rank,r.track_id),'[]'::jsonb)
  into v_tracks
  from jsonb_array_elements(v_result->'tracks') t(item)
  join ranked r on r.track_id=(t.item->>'id')::uuid;
  return v_result || jsonb_build_object('tracks',v_tracks,
    'status',case when v_result->>'status'='final' and v_pending then 'awaiting_decision' else v_result->>'status' end);
end;
$$;

create or replace function public.decide_monthly_chart_tie(p_month text, p_supporter_count bigint,
  p_ordered_ids uuid[], p_actor uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_chart jsonb;
  v_month date;
  v_members uuid[];
  v_submitted uuid[];
  v_existing bigint;
  v_id bigint;
begin
  if p_actor is null or p_supporter_count is null or p_supporter_count < 3
    or p_ordered_ids is null or cardinality(p_ordered_ids)<2 then
    raise exception using errcode='22023',message='MONTHLY_CHART_INVALID_DECISION';
  end if;
  perform pg_advisory_xact_lock(724193,1);
  v_chart := public.read_monthly_chart_base(p_month,null);
  v_month := ((v_chart->>'month') || '-01')::date;
  select g.member_ids,g.decision_id into v_members,v_existing
    from public.monthly_chart_tie_groups(v_month) g where g.supporter_count=p_supporter_count;
  select array_agg(x order by x) into v_submitted from unnest(p_ordered_ids) x;
  if v_members is null or v_submitted is distinct from v_members then
    raise exception using errcode='40001',message='MONTHLY_CHART_GROUP_CHANGED';
  end if;
  if v_chart->>'status'='final' and v_existing is not null then
    raise exception using errcode='55000',message='MONTHLY_CHART_DECISION_FINAL';
  end if;
  insert into public.monthly_chart_decisions(month,supporter_count,member_ids,ordered_ids,decided_by)
    values(v_month,p_supporter_count,v_members,p_ordered_ids,p_actor) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_monthly_chart(p_month text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_chart jsonb; v_month date; v_groups jsonb; v_history jsonb; v_pending_months jsonb;
begin
  v_chart := public.read_monthly_chart(p_month,null);
  v_month := ((v_chart->>'month') || '-01')::date;
  select coalesce(jsonb_agg(jsonb_build_object('supporterCount',g.supporter_count,
    'memberIds',g.member_ids,'orderedIds',g.ordered_ids,
    'locked',v_chart->>'status'<>'live' and g.decision_id is not null,
    'tracks',(select jsonb_agg(jsonb_build_object('id',c.track_id,'title',c.title,'artist',c.artist,
      'genre',c.genre,'supporterCount',c.supporter_count,'rank',c.global_rank)
      order by coalesce(array_position(g.ordered_ids,c.track_id),0),c.track_id)
      from public.monthly_chart_decision_source(v_month) c where c.track_id=any(g.member_ids)))
    order by g.supporter_count desc),'[]'::jsonb) into v_groups from public.monthly_chart_tie_groups(v_month) g;
  select coalesce(jsonb_agg(to_jsonb(d) order by d.id desc),'[]'::jsonb) into v_history
    from (select id,supporter_count,ordered_ids,decided_at,decided_by from public.monthly_chart_decisions
      where month=v_month order by id desc limit 100) d;
  select coalesce(jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),'count',g.count)
    order by m.month desc),'[]'::jsonb) into v_pending_months
  from (select month from public.monthly_chart_months union select public.monthly_chart_current_month()) m
  cross join lateral (select count(*) from public.monthly_chart_tie_groups(m.month) where ordered_ids is null) g
  where g.count>0;
  return jsonb_build_object('chart',v_chart,'groups',v_groups,'history',v_history,'pendingMonths',v_pending_months);
end;
$$;

revoke all on function public.monthly_chart_decision_source(date), public.monthly_chart_tie_groups(date),
  public.read_monthly_chart(text,text), public.decide_monthly_chart_tie(text,bigint,uuid[],uuid),
  public.admin_monthly_chart(text) from public,anon,authenticated,service_role;
grant execute on function public.read_monthly_chart(text,text), public.decide_monthly_chart_tie(text,bigint,uuid[],uuid),
  public.admin_monthly_chart(text) to service_role;
commit;
