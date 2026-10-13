-- Independent blind comparisons. No writes to official Battle votes or records.
create table if not exists public.blind_listen_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_a_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  track_b_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  state text not null default 'pending' check(state in ('pending','voted','skipped')),
  choice text check(choice in ('A','B','tie')),
  active_side text check(active_side in ('A','B')),
  last_position numeric not null default 15,
  last_tick_at timestamptz,
  heard_a numeric not null default 0 check(heard_a between 0 and 30),
  heard_b numeric not null default 0 check(heard_b between 0 and 30),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '2 hours',
  completed_at timestamptz,
  check(track_a_id <> track_b_id),
  check((state='voted')=(choice is not null))
);
create unique index if not exists blind_listen_unique_pair on public.blind_listen_questions
  (user_id,least(track_a_id,track_b_id),greatest(track_a_id,track_b_id));
create unique index if not exists blind_listen_one_pending on public.blind_listen_questions(user_id) where state='pending';
create index if not exists blind_listen_a_idx on public.blind_listen_questions(track_a_id) where state='voted';
create index if not exists blind_listen_b_idx on public.blind_listen_questions(track_b_id) where state='voted';
create table if not exists public.creator_credit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check(delta=3),
  reason text not null check(reason='blind_compare'),
  source_id uuid not null unique references public.blind_listen_questions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists creator_credit_user_idx on public.creator_credit_entries(user_id,created_at desc);
alter table public.blind_listen_questions enable row level security;
alter table public.creator_credit_entries enable row level security;
revoke all on public.blind_listen_questions,public.creator_credit_entries from public,anon,authenticated;
grant select,insert,update,delete on public.blind_listen_questions,public.creator_credit_entries to service_role;

create or replace function public.blind_track_eligible(p_track uuid,p_user uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.listen_bar_tracks t where t.id=p_track
    and t.source='community' and t.is_active and not t.is_featured_official
    and t.review_status='approved' and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null and t.created_by is distinct from p_user
    and t.created_at <= now()
    and now() < ((t.created_at at time zone 'Asia/Taipei')+interval '3 months') at time zone 'Asia/Taipei'
    and t.duration_seconds>=45 and nullif(btrim(t.audio_path),'') is not null);
$$;
revoke all on function public.blind_track_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.blind_track_eligible(uuid,uuid) to service_role;

create or replace function public.issue_blind_question(p_user uuid,p_a uuid,p_b uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare q public.blind_listen_questions%rowtype; result uuid;
begin
  if p_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('blind:'||p_user::text,0));
  select * into q from public.blind_listen_questions where user_id=p_user and state='pending' for update;
  if found then
    if q.expires_at>now() and public.blind_track_eligible(q.track_a_id,p_user) and public.blind_track_eligible(q.track_b_id,p_user) then return q.id; end if;
    update public.blind_listen_questions set state='skipped',active_side=null where id=q.id;
  end if;
  if p_a=p_b or not public.blind_track_eligible(p_a,p_user) or not public.blind_track_eligible(p_b,p_user)
    or (select genre from public.listen_bar_tracks where id=p_a) is distinct from
       (select genre from public.listen_bar_tracks where id=p_b) then
    raise exception 'Unavailable pair' using errcode='42501';
  end if;
  insert into public.blind_listen_questions(user_id,track_a_id,track_b_id) values(p_user,p_a,p_b)
    on conflict do nothing returning id into result;
  return result;
end;
$$;
revoke all on function public.issue_blind_question(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.issue_blind_question(uuid,uuid,uuid) to service_role;

-- Time accrues only for one active side; server elapsed time caps client reports.
-- This resists fast/repeated requests, but does not claim to prove attention.
create or replace function public.tick_blind_question(p_user uuid,p_question uuid,p_side text,p_event text,p_position numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.blind_listen_questions%rowtype; elapsed numeric; amount numeric:=0;
begin
  if p_side not in ('A','B') or p_event not in ('play','progress','pause') or p_position is null or p_position<15 or p_position>45 then
    raise exception 'Invalid listening event' using errcode='22023';
  end if;
  select * into q from public.blind_listen_questions where id=p_question and user_id=p_user for update;
  if not found or q.state<>'pending' or q.expires_at<=now() then raise exception 'Unavailable question' using errcode='42501'; end if;
  if not public.blind_track_eligible(q.track_a_id,p_user) or not public.blind_track_eligible(q.track_b_id,p_user) then
    raise exception 'Unavailable work' using errcode='42501';
  end if;
  if q.active_side=p_side and q.last_tick_at is not null then
    elapsed:=greatest(0,extract(epoch from clock_timestamp()-q.last_tick_at));
    amount:=least(6,elapsed,greatest(0,p_position-q.last_position));
    if p_side='A' then q.heard_a:=least(30,q.heard_a+amount); else q.heard_b:=least(30,q.heard_b+amount); end if;
  end if;
  update public.blind_listen_questions set heard_a=q.heard_a,heard_b=q.heard_b,
    active_side=case when p_event='pause' then null else p_side end,
    last_position=p_position,last_tick_at=clock_timestamp() where id=q.id;
  return jsonb_build_object('heardA',q.heard_a,'heardB',q.heard_b);
end;
$$;
revoke all on function public.tick_blind_question(uuid,uuid,text,text,numeric) from public,anon,authenticated;
grant execute on function public.tick_blind_question(uuid,uuid,text,text,numeric) to service_role;

create or replace function public.complete_blind_question(p_user uuid,p_question uuid,p_choice text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.blind_listen_questions%rowtype; balance bigint;
begin
  if p_choice is null or p_choice not in ('A','B','tie') then raise exception 'Invalid choice' using errcode='22023'; end if;
  select * into q from public.blind_listen_questions where id=p_question and user_id=p_user for update;
  if not found then raise exception 'Unavailable question' using errcode='42501'; end if;
  if q.state='voted' then
    select coalesce(sum(delta),0) into balance from public.creator_credit_entries where user_id=p_user;
    return jsonb_build_object('choice',q.choice,'awarded',0,'balance',balance,'replayed',true);
  end if;
  if q.state<>'pending' or q.expires_at<=now() or not public.blind_track_eligible(q.track_a_id,p_user)
    or not public.blind_track_eligible(q.track_b_id,p_user) then raise exception 'Unavailable work' using errcode='42501'; end if;
  -- Small tolerance covers timeupdate/network timing at the 45-second cutoff.
  if q.heard_a<28.5 or q.heard_b<28.5 then raise exception 'Listen to both excerpts first' using errcode='22023'; end if;
  update public.blind_listen_questions set state='voted',choice=p_choice,active_side=null,completed_at=now() where id=q.id;
  insert into public.creator_credit_entries(user_id,delta,reason,source_id) values(p_user,3,'blind_compare',q.id);
  select coalesce(sum(delta),0) into balance from public.creator_credit_entries where user_id=p_user;
  return jsonb_build_object('choice',p_choice,'awarded',3,'balance',balance,'replayed',false);
end;
$$;
revoke all on function public.complete_blind_question(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_blind_question(uuid,uuid,text) to service_role;

create or replace function public.blind_popularity_summaries()
returns table(track_id uuid,people bigint,preference_points numeric)
language sql stable security invoker set search_path='' as $$
  with outcomes as (
    select q.user_id,q.track_a_id track_id,case q.choice when 'A' then 1 when 'tie' then 0.5 else 0 end points
      from public.blind_listen_questions q where q.state='voted'
    union all
    select q.user_id,q.track_b_id,case q.choice when 'B' then 1 when 'tie' then 0.5 else 0 end
      from public.blind_listen_questions q where q.state='voted'
  ), listeners as (
    select o.track_id,o.user_id,avg(o.points) points from outcomes o
      join public.listen_bar_tracks t on t.id=o.track_id
      where public.blind_track_eligible(t.id,o.user_id)
      group by o.track_id,o.user_id
  )
  select l.track_id,count(*),sum(l.points) from listeners l group by l.track_id;
$$;
revoke all on function public.blind_popularity_summaries() from public,anon,authenticated;
grant execute on function public.blind_popularity_summaries() to service_role;
