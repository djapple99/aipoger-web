-- Additive repair for raw genre aliases splitting monthly genre partitions.
-- Do not change tracks, Hearts, launch month, or existing snapshot scores/ranks.
begin;

-- Coordinate the function switch with source writes and month closure.
select pg_advisory_xact_lock(724193, 1);

-- Existing and future headers identify the effective Heart scoring contract.
-- Genre normalization changes classification, not this scoring algorithm.
alter table public.monthly_chart_months
  add column if not exists scoring_version text not null default 'distinct_non_author_heart_v1'
  constraint monthly_chart_months_scoring_version_check
  check (scoring_version = 'distinct_non_author_heart_v1');

create or replace function public.monthly_chart_canonical_genre(p_value text)
returns text language sql immutable set search_path = '' as $$
  with cleaned as (
    -- Match JavaScript String.trim() in src/lib/music-genres.ts.
    select btrim(coalesce(p_value, ''),
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') as value
  ), aliases(canonical, alternatives) as (
    values
      ('K-Pop 韓式動感', array['k-pop動感風', 'k-pop 動感風', 'kpop 韓式動感']),
      ('Rap 街頭說唱', array['說唱街頭風']),
      ('Disco / Funk / City-Pop', array['復古city-pop', '復古 city-pop', 'city pop / disco / funk 城市律動']),
      ('R&B 深情瞬間', array['感人抒情']),
      ('Band Rock 熱血搖滾', array['熱血搖滾']),
      ('EDM 百大電音', array['動感電音']),
      ('Jazz / Bossa 微醺時刻', array[]::text[]),
      ('Spiritual / Ambient 放鬆宇宙', array['心靈 ambient 宇宙', 'spiritual ambient universe']),
      ('Chinese Fusion 新派古風', array[]::text[]),
      ('台語熊high', array['台語熊 high', 'taiwanese bear high']),
      ('Original 自我風格', array['自我風格', 'custom style', 'ai music', 'pop'])
  )
  select coalesce((select canonical from aliases
    where lower(cleaned.value) = lower(canonical) or lower(cleaned.value) = any(alternatives)),
    nullif(cleaned.value, ''), 'Original 自我風格') from cleaned;
$$;

create or replace function public.monthly_chart_valid_genre(p_value text)
returns boolean language sql immutable set search_path = '' as $$
  -- Canonicalization preserves the shared display fallback; eligibility still
  -- requires an explicitly supplied genre from the current eleven-genre set.
  select nullif(btrim(coalesce(p_value, ''),
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') is not null
    and public.monthly_chart_canonical_genre(p_value) = any(array[
      'K-Pop 韓式動感', 'Rap 街頭說唱', 'Disco / Funk / City-Pop',
      'R&B 深情瞬間', 'Band Rock 熱血搖滾', 'EDM 百大電音',
      'Jazz / Bossa 微醺時刻', 'Spiritual / Ambient 放鬆宇宙',
      'Chinese Fusion 新派古風', '台語熊high', 'Original 自我風格'
    ]);
$$;

create or replace function public.monthly_chart_candidates(p_month date)
returns table (
  track_id uuid, title text, artist text, genre text, ai_tool text, lyrics text,
  supporter_count bigint, global_rank bigint, genre_rank bigint
)
language sql stable security definer set search_path = '' as $$
  with counts as (
    select t.id as track_id, coalesce(t.title, '') as title,
      coalesce(t.artist, '') as artist, public.monthly_chart_canonical_genre(t.genre) as genre,
      coalesce(t.ai_tool, '') as ai_tool, coalesce(t.lyrics, '') as lyrics,
      count(distinct r.user_id) as supporter_count
    from public.listen_bar_tracks t
    join public.listen_bar_track_reactions r on r.track_id = t.id
      and r.reaction = 'heart' and r.user_id is distinct from t.created_by
      and r.vote_date >= p_month and r.vote_date < (p_month + interval '1 month')::date
      and r.vote_date <= (statement_timestamp() at time zone 'Asia/Taipei')::date
    -- This is a public Bar chart, not Explore eligibility: eight-loss Explore
    -- retirement alone does not unpublish a Bar song. Explicit removals still do.
    where public.monthly_chart_public_track(t)
      and public.monthly_chart_valid_genre(t.genre)
      and t.created_at < ((p_month + interval '1 month')::timestamp at time zone 'Asia/Taipei')
    group by t.id
  )
  select counts.*,
    case when supporter_count >= 3 then rank() over (order by supporter_count desc) end,
    case when supporter_count >= 3 then rank() over (partition by genre order by supporter_count desc) end
  from counts where supporter_count > 0;
$$;

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
  if v_genre is not null then v_genre := public.monthly_chart_canonical_genre(v_genre); end if;
  if v_genre is not null and not public.monthly_chart_valid_genre(v_genre) then
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
    -- Old snapshots become discoverable under canonical filters, but retain
    -- their original genre labels AND ranks. Never repartition a final chart.
    where public.monthly_chart_public_track(t)
      and public.monthly_chart_valid_genre(t.genre)
      and public.monthly_chart_valid_genre(e.genre)
      and (v_genre is null or public.monthly_chart_canonical_genre(e.genre) = v_genre)
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

revoke all on function public.monthly_chart_canonical_genre(text) from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_valid_genre(text) from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_candidates(date) from public, anon, authenticated, service_role;
revoke all on function public.read_monthly_chart(text, text) from public, anon, authenticated, service_role;
grant execute on function public.read_monthly_chart(text, text) to service_role;

commit;
