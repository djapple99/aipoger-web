-- Additive Credit release. No backfill, balance rewrite, APC import or data deletion.
-- Existing blind receipts and personal 168h free-upload windows remain authoritative.
-- Keep creator_credit_entries, its blind-only CHECKs, source uniqueness and grants unchanged.
create table if not exists public.creator_credit_participation_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  delta integer not null, reason text not null, source_id uuid not null unique,
  event_key text not null, created_at timestamptz not null default clock_timestamp(),
  unique(user_id,event_key),
  constraint creator_credit_participation_policy check (
    (reason='daily_visit' and delta=15) or
    (reason in ('heart','restore_heart') and delta=3) or (reason='reverse_heart' and delta=-3) or
    (reason in ('review','restore_review') and delta=10) or (reason='reverse_review' and delta=-10) or
    (reason='extra_submission' and delta=-60)));
create index if not exists creator_credit_participation_user_idx on public.creator_credit_participation_entries(user_id,created_at desc);
alter table public.creator_credit_participation_entries enable row level security;
revoke all on public.creator_credit_participation_entries from public,anon,authenticated;
grant select,insert on public.creator_credit_participation_entries to service_role;
create or replace view public.creator_credit_history with (security_invoker=true) as
  select id,user_id,delta,reason,source_id,created_at from public.creator_credit_entries
  union all
  select id,user_id,delta,reason,source_id,created_at from public.creator_credit_participation_entries;
revoke all on public.creator_credit_history from public,anon,authenticated;
grant select on public.creator_credit_history to service_role;
alter table public.listen_bar_tracks add column if not exists credit_submission_confirmed boolean not null default false;

create table if not exists public.creator_credit_launch (id boolean primary key default true check(id), enabled_at timestamptz not null default clock_timestamp());
insert into public.creator_credit_launch(id) values(true) on conflict do nothing;
create table if not exists public.creator_credit_awards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  kind text not null check(kind in ('heart','review')), track_id uuid not null,
  active boolean not null default false, version integer not null default 0, comment_id uuid, heart_vote_date date,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  unique(user_id,kind,track_id));
create table if not exists public.creator_credit_review_texts (
  body_hash text primary key, user_id uuid not null references auth.users(id), track_id uuid not null,
  created_at timestamptz not null default clock_timestamp());
alter table public.creator_credit_launch enable row level security;
alter table public.creator_credit_awards enable row level security;
alter table public.creator_credit_review_texts enable row level security;
revoke all on public.creator_credit_launch,public.creator_credit_awards,public.creator_credit_review_texts from public,anon,authenticated;
grant select,insert,update on public.creator_credit_launch,public.creator_credit_awards,public.creator_credit_review_texts to service_role;
create schema if not exists aipoger_private;
revoke all on schema aipoger_private from public,anon,authenticated;

-- Lock BEFORE existing monthly-chart hooks, matching save_work_review's user-first order.
-- This prevents a Heart/post/review lock inversion; no public caller can execute it.
create or replace function aipoger_private.credit_source_lock() returns trigger
language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
  for u in select distinct value from unnest(array[
    case when tg_op<>'INSERT' then old.user_id end,
    case when tg_op<>'DELETE' then new.user_id end]) value where value is not null order by value loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function aipoger_private.credit_source_lock() from public,anon,authenticated;
create trigger aaa_creator_credit_reaction_lock before insert or update or delete on public.listen_bar_track_reactions
for each row execute function aipoger_private.credit_source_lock();
create trigger aaa_creator_credit_comment_lock before insert or update or delete on public.listen_bar_track_comments
for each row execute function aipoger_private.credit_source_lock();
create trigger aaa_creator_credit_rating_lock before insert or update or delete on public.mv_work_ratings
for each row execute function aipoger_private.credit_source_lock();
create or replace function aipoger_private.credit_upload_lock() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.source='community' and new.created_by is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.created_by::text,0));
  end if;
  return new;
end;
$$;
revoke all on function aipoger_private.credit_upload_lock() from public,anon,authenticated;
create trigger aaa_creator_credit_upload_lock before insert on public.listen_bar_tracks
for each row execute function aipoger_private.credit_upload_lock();

-- New credits and spending share the same per-member transaction lock.
-- Legacy blind income is positive-only; concurrent arrival can only increase funds.
create or replace function aipoger_private.credit_ledger_lock() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,0));
  return new;
end;
$$;
revoke all on function aipoger_private.credit_ledger_lock() from public,anon,authenticated;
create trigger creator_credit_ledger_lock before insert on public.creator_credit_participation_entries
for each row execute function aipoger_private.credit_ledger_lock();

create or replace function public.creator_credit_reconcile(p_user uuid,p_kind text,p_track uuid,p_active boolean)
returns integer language plpgsql security invoker set search_path='' as $$
declare a public.creator_credit_awards%rowtype; amount integer; why text;
begin
  if p_kind not in ('heart','review') or p_user is null or p_track is null then raise exception 'Invalid award'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  insert into public.creator_credit_awards(user_id,kind,track_id) values(p_user,p_kind,p_track) on conflict do nothing;
  select * into a from public.creator_credit_awards where user_id=p_user and kind=p_kind and track_id=p_track for update;
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


create or replace function public.creator_credit_visit(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare amount integer := 0; total bigint; day text := (clock_timestamp() at time zone 'Asia/Taipei')::date::text;
begin
  if p_user is null then raise exception 'Sign in first' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key)
  values(p_user,15,'daily_visit',gen_random_uuid(),'visit:'||day) on conflict(user_id,event_key) do nothing;
  if found then amount := 15; end if;
  select coalesce(sum(delta),0) into total from public.creator_credit_history where user_id=p_user;
  return jsonb_build_object('awarded',amount,'balance',greatest(total,0),'debt',greatest(-total,0),'day',day);
end;
$$;
revoke all on function public.creator_credit_visit(uuid) from public,anon,authenticated;
grant execute on function public.creator_credit_visit(uuid) to service_role;

create or replace function public.creator_credit_review_valid(p_body text) returns boolean
language sql immutable security invoker set search_path='' as $$
  with s as (select lower(regexp_replace(normalize(coalesce(p_body,''),NFKC),'[^[:alnum:]一-龥ぁ-んァ-ン가-힣]','','g')) v)
  select length(v)>=20 and (select count(distinct x) from regexp_split_to_table(v,'') x)>=4
    and v !~ '(.)\1{5,}' and v !~ '(.{2,12})\1{2,}' from s;
$$;
revoke all on function public.creator_credit_review_valid(text) from public,anon,authenticated;


create or replace function public.creator_credit_check_review(p_user uuid,p_track uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare c public.listen_bar_track_comments%rowtype; valid boolean := false; sig text; claimed boolean; amount integer;
begin
  if not exists(select 1 from public.listen_bar_tracks where id=p_track) then return 0; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
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

create or replace function aipoger_private.credit_review_source() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.user_id is not null then perform public.creator_credit_check_review(old.user_id,old.track_id); end if;
    return old;
  end if;
  if new.user_id is not null then perform public.creator_credit_check_review(new.user_id,new.track_id); end if;
  return new;
end;
$$;
revoke all on function aipoger_private.credit_review_source() from public,anon,authenticated;
create trigger creator_credit_rating_source after insert or update or delete on public.mv_work_ratings
for each row execute function aipoger_private.credit_review_source();
create trigger creator_credit_comment_source after update or delete on public.listen_bar_track_comments
for each row execute function aipoger_private.credit_review_source();

create or replace function aipoger_private.credit_heart_source() returns trigger
language plpgsql security definer set search_path='' as $$
declare u uuid; track uuid; active boolean := false; fresh boolean := false; event_day date; bound_day date;
begin
  u := case when tg_op='DELETE' then old.user_id else new.user_id end;
  track := case when tg_op='DELETE' then old.track_id else new.track_id end;
  if not exists(select 1 from public.listen_bar_tracks where id=track) then return null; end if;
  if tg_op<>'DELETE' then
    fresh := new.created_at >= (select enabled_at from public.creator_credit_launch where id);
    if tg_op='UPDATE' and new.reaction is distinct from old.reaction then fresh := true; end if;
    active := new.reaction='heart' and new.vote_date=(clock_timestamp() at time zone 'Asia/Taipei')::date
      and fresh
      and exists(select 1 from public.listen_bar_tracks t where t.id=track and t.created_by is distinct from u
        and t.source='community' and not t.is_featured_official and t.is_active and t.review_status='approved'
        and t.hidden_at is null and t.removed_at is null and t.ai_music_showtime_public_removed_at is null)
      and exists(select 1 from auth.users where id=u and is_anonymous is not true);
  end if;
  event_day := case when tg_op='DELETE' then old.vote_date else new.vote_date end;
  select heart_vote_date into bound_day from public.creator_credit_awards where user_id=u and track_id=track and kind='heart';
  if not active and bound_day is not null and bound_day<>event_day then return null; end if;
  if active or exists(select 1 from public.creator_credit_awards where user_id=u and kind='heart' and track_id=track) then
    perform public.creator_credit_reconcile(u,'heart',track,active);
    if active then update public.creator_credit_awards set heart_vote_date=event_day where user_id=u and track_id=track and kind='heart'; end if;
  end if;
  return null;
end;
$$;
revoke all on function aipoger_private.credit_heart_source() from public,anon,authenticated;
create trigger creator_credit_heart_source after insert or update or delete on public.listen_bar_track_reactions
for each row execute function aipoger_private.credit_heart_source();

-- Keep the existing Auth identity, confirmed Owner exception, free counter and trigger.
create or replace function public.listen_bar_count_creator_upload() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_now timestamptz := clock_timestamp(); w public.listen_bar_creator_upload_windows%rowtype; total bigint;
begin
  if new.source is distinct from 'community' then return new; end if;
  if auth.uid() is null or new.created_by is distinct from auth.uid() then raise exception '只能用自己的帳號投稿。'; end if;
  if exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.is_anonymous is not true
    and lower(trim(coalesce(u.email,''))) in ('djapple99@gmail.com','aipoger99@gmail.com')) then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.created_by::text,0));
  select * into w from public.listen_bar_creator_upload_windows where creator_id=new.created_by for update;
  if not found or w.started_at+interval '168 hours'<=v_now then
    insert into public.listen_bar_creator_upload_windows(creator_id,started_at,upload_count) values(new.created_by,v_now,1)
    on conflict(creator_id) do update set started_at=v_now,upload_count=1;
  elsif w.upload_count<3 then
    update public.listen_bar_creator_upload_windows set upload_count=upload_count+1 where creator_id=new.created_by;
  else
    if not new.credit_submission_confirmed then raise exception 'CREDIT_CONFIRM_REQUIRED: 額外投稿需確認扣60 Credit。' using errcode='P0001'; end if;
    select coalesce(sum(delta),0) into total from public.creator_credit_history where user_id=new.created_by;
    if total<0 then raise exception 'CREDIT_DEBT: 請先補足待追回欠額。' using errcode='P0001'; end if;
    if total<60 then raise exception 'CREDIT_INSUFFICIENT: 額外投稿需60 Credit。' using errcode='P0001'; end if;
    insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key)
    values(new.created_by,-60,'extra_submission',new.id,'submission:'||new.id::text);
  end if;
  return new;
end;
$$;
revoke all on function public.listen_bar_count_creator_upload() from public,anon,authenticated;

create or replace function public.listen_bar_my_upload_quota() returns jsonb
language plpgsql security definer set search_path='' as $$
declare p_user uuid := auth.uid(); w public.listen_bar_creator_upload_windows%rowtype; v_now timestamptz := clock_timestamp(); total bigint; owner boolean; used integer := 0;
begin
  if not exists(select 1 from auth.users where id=p_user and is_anonymous is not true) then raise exception 'Sign in first' using errcode='42501'; end if;
  select exists(select 1 from auth.users u where id=p_user and email_confirmed_at is not null and is_anonymous is not true
    and lower(trim(coalesce(email,''))) in ('djapple99@gmail.com','aipoger99@gmail.com')) into owner;
  select * into w from public.listen_bar_creator_upload_windows where creator_id=p_user;
  if found and w.started_at+interval '168 hours'>v_now then used := w.upload_count; end if;
  select coalesce(sum(delta),0) into total from public.creator_credit_history where user_id=p_user;
  return jsonb_build_object('used',case when owner then 0 else used end,'limit',case when owner then null else 3 end,
    'unlimited',owner,'resetsAt',case when owner or used=0 then null else w.started_at+interval '168 hours' end,
    'serverNow',v_now,'creditEnabled',true,'balance',greatest(total,0),'debt',greatest(-total,0),'extraCost',60,
    'canSubmit',owner or used<3 or total>=60);
end;
$$;
revoke all on function public.listen_bar_my_upload_quota() from public,anon;
grant execute on function public.listen_bar_my_upload_quota() to authenticated;

-- One authoritative snapshot combines historical blind income and all new participation.
create or replace function public.creator_credit_summary(p_user uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  with total as (select coalesce(sum(delta),0) net from public.creator_credit_history where user_id=p_user),
  recent as (select id,delta,reason,created_at from public.creator_credit_history where user_id=p_user order by created_at desc,id limit 50)
  select jsonb_build_object('enabled',true,'balance',greatest(net,0),'debt',greatest(-net,0),
    'entries',coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc,id) from recent),'[]'::jsonb)) from total;
$$;
revoke all on function public.creator_credit_summary(uuid) from public,anon,authenticated;
grant execute on function public.creator_credit_summary(uuid) to service_role;

-- Recoverable author withdrawal; it cannot undo an administrator's moderation.
create or replace function public.edit_work_review(p_user uuid,p_comment uuid,p_body text,p_active boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c public.listen_bar_track_comments%rowtype;
begin
  if p_body is null or length(btrim(p_body))>280 or (p_active and btrim(p_body)='') then raise exception 'Invalid review' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  select * into c from public.listen_bar_track_comments where id=p_comment and user_id=p_user for update;
  if not found or (c.moderation_status<>'visible' and c.moderation_note is distinct from 'author_withdrawn') then raise exception 'Unavailable review' using errcode='42501'; end if;
  update public.listen_bar_track_comments set body=btrim(p_body),moderation_status=case when p_active then 'visible' else 'hidden' end,
    moderation_note=case when p_active then null else 'author_withdrawn' end,updated_at=clock_timestamp() where id=c.id;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.edit_work_review(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.edit_work_review(uuid,uuid,text,boolean) to service_role;
notify pgrst,'reload schema';
