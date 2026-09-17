-- MONTHLY CHART reads only effective community Heart rows. No saves, Battle,
-- Choice, cached totals, or invented pre-launch history participate.
begin;

create table if not exists public.monthly_chart_config (
  singleton boolean primary key default true check (singleton),
  first_month date not null check (extract(day from first_month) = 1),
  enabled_at timestamptz not null default clock_timestamp()
);

create table if not exists public.monthly_chart_months (
  month date primary key check (extract(day from month) = 1),
  finalized_at timestamptz not null default clock_timestamp(),
  min_supporters integer not null default 3 check (min_supporters = 3)
);

create table if not exists public.monthly_chart_entries (
  month date not null references public.monthly_chart_months(month),
  -- Deliberately not a track FK: deletion must not rewrite historical ranks.
  track_id uuid not null,
  title text not null,
  artist text not null,
  genre text not null,
  ai_tool text not null,
  lyrics text not null,
  supporter_count bigint not null check (supporter_count > 0),
  global_rank bigint,
  genre_rank bigint,
  primary key (month, track_id),
  check ((supporter_count < 3 and global_rank is null and genre_rank is null)
    or (supporter_count >= 3 and global_rank > 0 and genre_rank > 0))
);

alter table public.monthly_chart_config enable row level security;
alter table public.monthly_chart_months enable row level security;
alter table public.monthly_chart_entries enable row level security;
revoke all on public.monthly_chart_config, public.monthly_chart_months,
  public.monthly_chart_entries from public, anon, authenticated, service_role;
grant select on public.monthly_chart_config, public.monthly_chart_months,
  public.monthly_chart_entries to service_role;

create index if not exists monthly_chart_entries_genre_idx
  on public.monthly_chart_entries(month, genre, genre_rank);
create index if not exists monthly_chart_heart_month_idx
  on public.listen_bar_track_reactions(vote_date, track_id, user_id)
  where reaction = 'heart';

create or replace function public.monthly_chart_current_month()
returns date language sql volatile set search_path = '' as $$
  select date_trunc('month', clock_timestamp() at time zone 'Asia/Taipei')::date;
$$;

-- First deployment's Taiwan month is the only launch boundary. Re-running this
-- migration does not move it, and deploying later never fabricates September.
insert into public.monthly_chart_config(singleton, first_month)
values (true, public.monthly_chart_current_month()) on conflict do nothing;

create or replace function public.monthly_chart_public_track(t public.listen_bar_tracks)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(t.source = 'community' and t.is_active
    and lower(trim(t.review_status)) = 'approved'
    and t.hidden_at is null and t.removed_at is null
    and t.ai_music_showtime_public_removed_at is null
    and nullif(trim(t.audio_path), '') is not null, false);
$$;

create or replace function public.monthly_chart_candidates(p_month date)
returns table (
  track_id uuid, title text, artist text, genre text, ai_tool text, lyrics text,
  supporter_count bigint, global_rank bigint, genre_rank bigint
)
language sql stable security definer set search_path = '' as $$
  with counts as (
    select t.id as track_id, coalesce(t.title, '') as title,
      coalesce(t.artist, '') as artist, coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') as genre,
      coalesce(t.ai_tool, '') as ai_tool, coalesce(t.lyrics, '') as lyrics,
      count(distinct r.user_id) as supporter_count
    from public.listen_bar_tracks t
    join public.listen_bar_track_reactions r on r.track_id = t.id
      and r.reaction = 'heart' and r.user_id is distinct from t.created_by
      -- vote_date is the existing Asia/Taipei calendar-day key. These DATE
      -- bounds are exactly [Taipei month start, next Taipei month start).
      and r.vote_date >= p_month and r.vote_date < (p_month + interval '1 month')::date
      and r.vote_date <= (statement_timestamp() at time zone 'Asia/Taipei')::date
    where public.monthly_chart_public_track(t)
      and t.created_at < ((p_month + interval '1 month')::timestamp at time zone 'Asia/Taipei')
    group by t.id
  )
  select counts.*,
    case when supporter_count >= 3 then rank() over (order by supporter_count desc) end,
    case when supporter_count >= 3 then rank() over (partition by genre order by supporter_count desc) end
  from counts where supporter_count > 0;
$$;

create or replace function public.finalize_monthly_charts()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_current date;
  v_first date;
  v_month date;
  v_count integer := 0;
begin
  v_current := public.monthly_chart_current_month();
  select first_month into strict v_first from public.monthly_chart_config where singleton;
  -- Ordinary reads do not take the global write lock after all closed months
  -- exist. Only the once-per-month closure competes with source writes.
  if not exists (
    select 1 from generate_series(v_first::timestamp,
      (v_current - interval '1 month')::timestamp, interval '1 month') g
    where not exists (select 1 from public.monthly_chart_months m where m.month = g::date)
  ) then
    return 0;
  end if;
  -- Shared by all source writes and finalizers. A transaction spanning midnight
  -- must finish before its month is counted. The row PK is a second safeguard.
  perform pg_advisory_xact_lock(724193, 1);
  v_current := public.monthly_chart_current_month();
  select first_month into strict v_first from public.monthly_chart_config where singleton;
  for v_month in
    select g::date from generate_series(v_first::timestamp,
      (v_current - interval '1 month')::timestamp, interval '1 month') g
    where not exists (select 1 from public.monthly_chart_months m where m.month = g::date)
    order by g
  loop
    -- A header exists even when no tracks qualify (or there are no Hearts).
    insert into public.monthly_chart_months(month) values (v_month);
    insert into public.monthly_chart_entries
      (month, track_id, title, artist, genre, ai_tool, lyrics, supporter_count, global_rank, genre_rank)
    select v_month, c.* from public.monthly_chart_candidates(v_month) c;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.monthly_chart_before_source_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Lazy reads and cron are fallback paths; close before post-boundary edits,
  -- cancellation, cascade deletion, or moderation can change the old inputs.
  -- This serializes source-write transactions, not public reads. Keep callers'
  -- transactions short; a long-running source write delays month closure.
  perform pg_advisory_xact_lock(724193, 1);
  perform public.finalize_monthly_charts();
  return null;
end;
$$;

drop trigger if exists monthly_chart_before_track_write on public.listen_bar_tracks;
create trigger monthly_chart_before_track_write
  before insert or update or delete or truncate on public.listen_bar_tracks
  for each statement execute function public.monthly_chart_before_source_write();
drop trigger if exists monthly_chart_before_reaction_write on public.listen_bar_track_reactions;
create trigger monthly_chart_before_reaction_write
  before insert or update or delete or truncate on public.listen_bar_track_reactions
  for each statement execute function public.monthly_chart_before_source_write();

create or replace function public.monthly_chart_reject_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'MONTHLY_CHART_IMMUTABLE';
end;
$$;

drop trigger if exists monthly_chart_config_immutable on public.monthly_chart_config;
create trigger monthly_chart_config_immutable before update or delete or truncate
  on public.monthly_chart_config for each statement execute function public.monthly_chart_reject_rewrite();
drop trigger if exists monthly_chart_months_immutable on public.monthly_chart_months;
create trigger monthly_chart_months_immutable before update or delete or truncate
  on public.monthly_chart_months for each statement execute function public.monthly_chart_reject_rewrite();
drop trigger if exists monthly_chart_entries_immutable on public.monthly_chart_entries;
create trigger monthly_chart_entries_immutable before update or delete or truncate
  on public.monthly_chart_entries for each statement execute function public.monthly_chart_reject_rewrite();

create or replace function public.read_monthly_chart(p_month text default null, p_genre text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_current date := public.monthly_chart_current_month();
  v_month date;
  v_first date;
  v_genre text := nullif(nullif(trim(p_genre), ''), 'all');
  v_finalized timestamptz;
  v_tracks jsonb;
  v_months jsonb;
begin
  if p_month is not null and p_month !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then
    raise exception using errcode = '22023', message = 'MONTHLY_CHART_INVALID_MONTH';
  end if;
  v_month := case when p_month is null then v_current else (p_month || '-01')::date end;
  if v_month > v_current then
    raise exception using errcode = '22023', message = 'MONTHLY_CHART_FUTURE_MONTH';
  end if;
  select first_month into strict v_first from public.monthly_chart_config where singleton;
  if v_month < v_first then
    raise exception using errcode = 'P0002', message = 'MONTHLY_CHART_NOT_ENABLED';
  end if;
  if length(v_genre) > 100 then
    raise exception using errcode = '22023', message = 'MONTHLY_CHART_INVALID_GENRE';
  end if;
  perform public.finalize_monthly_charts();
  v_current := public.monthly_chart_current_month();
  if p_month is null then v_month := v_current; end if;
  select finalized_at into v_finalized from public.monthly_chart_months where month = v_month;

  with entries as (
    select c.* from public.monthly_chart_candidates(v_month) c where v_month = v_current
    union all
    select e.track_id, e.title, e.artist, e.genre, e.ai_tool, e.lyrics,
      e.supporter_count, e.global_rank, e.genre_rank
    from public.monthly_chart_entries e where e.month = v_month and v_month < v_current
  ), visible as (
    select e.*, case when v_genre is null then e.global_rank else e.genre_rank end as display_rank,
      t.audio_path, t.cover_path
    from entries e join public.listen_bar_tracks t on t.id = e.track_id
    where public.monthly_chart_public_track(t) and (v_genre is null or e.genre = v_genre)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', track_id, 'title', title, 'artist', artist, 'genre', genre,
    'aiTool', ai_tool, 'lyrics', lyrics, 'rank', display_rank,
    'supporterCount', supporter_count, 'audioPath', audio_path, 'coverPath', cover_path
  ) order by display_rank nulls last, supporter_count desc, track_id), '[]'::jsonb)
  into v_tracks from visible;

  select jsonb_agg(to_char(month, 'YYYY-MM') order by month desc) into v_months
    from (select month from public.monthly_chart_months union select v_current) months;
  return jsonb_build_object('currentMonth', to_char(v_current, 'YYYY-MM'),
    'availableMonths', v_months, 'month', to_char(v_month, 'YYYY-MM'),
    'status', case when v_month = v_current then 'live' else 'final' end,
    'minSupporters', 3, 'finalizedAt', v_finalized, 'tracks', v_tracks);
end;
$$;

revoke all on function public.monthly_chart_current_month() from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_public_track(public.listen_bar_tracks) from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_candidates(date) from public, anon, authenticated, service_role;
revoke all on function public.finalize_monthly_charts() from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_before_source_write() from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_reject_rewrite() from public, anon, authenticated, service_role;
revoke all on function public.read_monthly_chart(text, text) from public, anon, authenticated, service_role;
grant execute on function public.finalize_monthly_charts() to service_role;
grant execute on function public.read_monthly_chart(text, text) to service_role;

commit;
