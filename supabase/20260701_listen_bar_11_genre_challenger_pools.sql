-- AIPOGER Bar Heartbreak: 11-genre pools and per-genre Challenger lanes.
-- 2026-07-01 late rule update:
-- - fixed listen-bar genres increase from 10 to 11 with 台語熊 High before Original
-- - public/all is a playback view, not an upload genre
-- - each genre has a 36-track public pool; total public target is 396
-- - Challenger lanes are scoped by creator + genre, with the same 3/2/1 ladder
-- - 2026-07-01..2026-07-05 is a cleanup grace period: promote after 24H, but do not evict until 2026-07-06 00:00 +08

create or replace function public.aipoger_migrate_music_genre_labels()
returns table(table_name text, updated_rows integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_table text;
  changed integer;
begin
  foreach target_table in array array[
    'listen_bar_tracks',
    'battle_queue',
    'battles',
    'battle_song_stats',
    'daily_battle_entries',
    'official_gatekeeper_drops'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      table_name := target_table;
      updated_rows := 0;
      return next;
      continue;
    end if;

    execute format(
      $sql$
      update public.%I
      set genre = case genre
        when 'K-pop動感風' then 'K-Pop 韓式動感'
        when 'K-pop 動感風' then 'K-Pop 韓式動感'
        when 'K-Pop動感風' then 'K-Pop 韓式動感'
        when '說唱街頭風' then 'Rap 街頭說唱'
        when '復古City-Pop' then 'City Pop / Disco / Funk 城市律動'
        when '復古 City-Pop' then 'City Pop / Disco / Funk 城市律動'
        when 'Disco / Funk / City-Pop' then 'City Pop / Disco / Funk 城市律動'
        when '感人抒情' then 'R&B 深情瞬間'
        when '熱血搖滾' then 'Band Rock 熱血搖滾'
        when '動感電音' then 'EDM 百大電音'
        when 'Spiritual / Ambient 放鬆宇宙' then '心靈 Ambient 宇宙'
        when '心靈宗教放鬆宇宙' then '心靈 Ambient 宇宙'
        when '自我風格' then 'Original 自我風格'
        when 'Custom Style' then 'Original 自我風格'
        when 'AI Music' then 'Original 自我風格'
        when 'Pop' then 'Original 自我風格'
        when 'Electronic;Pop;Non-Music;Brit Pop;Disco;Downtempo;Eurodance;House;Trip Hop;Chillout;Easy Listening;Pop Rock;Soft Rock;Spoken Word;Singer-Songwriter' then 'EDM 百大電音'
        else genre
      end
      where genre in (
        'K-pop動感風',
        'K-pop 動感風',
        'K-Pop動感風',
        '說唱街頭風',
        '復古City-Pop',
        '復古 City-Pop',
        'Disco / Funk / City-Pop',
        '感人抒情',
        '熱血搖滾',
        '動感電音',
        'Spiritual / Ambient 放鬆宇宙',
        '心靈宗教放鬆宇宙',
        '自我風格',
        'Custom Style',
        'AI Music',
        'Pop',
        'Electronic;Pop;Non-Music;Brit Pop;Disco;Downtempo;Eurodance;House;Trip Hop;Chillout;Easy Listening;Pop Rock;Soft Rock;Spoken Word;Singer-Songwriter'
      )
      $sql$,
      target_table
    );

    get diagnostics changed = row_count;
    table_name := target_table;
    updated_rows := changed;
    return next;
  end loop;
end;
$$;

revoke all on function public.aipoger_migrate_music_genre_labels() from public;
grant execute on function public.aipoger_migrate_music_genre_labels() to service_role;

comment on function public.aipoger_migrate_music_genre_labels() is
'Migrates AIPOGER genre labels into the 2026-07-01 11-genre taxonomy across known genre-bearing tables.';

select * from public.aipoger_migrate_music_genre_labels();

create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_challengers integer := 0;
  active_public_tracks integer := 0;
  challenger_slot_limit integer := 3;
  is_admin_user boolean := false;
  new_genre text := coalesce(nullif(trim(new.genre), ''), 'Original 自我風格');
begin
  select coalesce(p.is_admin, false)
  into is_admin_user
  from public.user_profiles p
  where p.id = auth.uid();

  if new.source = 'community' then
    if auth.uid() is null then
      raise exception '請先登入後再投稿 傷心酒吧 Bar Heartbreak。';
    end if;

    if new.created_by is distinct from auth.uid() then
      raise exception '只能用自己的帳號投稿。';
    end if;

    if nullif(trim(coalesce(new.genre, '')), '') is null then
      raise exception '請從固定類型選單選擇歌曲類型。';
    end if;

    new.is_featured_official := false;
    new.review_status := coalesce(nullif(new.review_status, ''), 'approved');
    new.sort_order := coalesce(new.sort_order, 1000);
    new.bar_phase := 'challenger';
    new.promoted_at := null;

    if not coalesce(is_admin_user, false) then
      select count(*)
      into active_challengers
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and t.bar_phase = 'challenger'
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = new_genre
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      select count(*)
      into active_public_tracks
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and t.bar_phase = 'public'
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = new_genre
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      challenger_slot_limit := public.listen_bar_challenger_slot_limit_for_public_count(active_public_tracks);

      if active_challengers >= challenger_slot_limit then
        raise exception '你在「%」已有 % 首公播，這個類型 Challenger 上限是 % 首。要再上傳同類型，請先撤下一首同類型 Challenger，或等同類型公播歌曲被撤下/淘汰後釋出節奏。',
          new_genre,
          active_public_tracks,
          challenger_slot_limit;
      end if;
    end if;
  else
    if coalesce(is_admin_user, false) then
      new.is_featured_official := true;
      new.review_status := 'approved';
      new.bar_phase := 'public';
      if nullif(trim(coalesce(new.genre, '')), '') is null then
        raise exception '請從固定類型選單選擇歌曲類型。';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_tracks_public_submission on public.listen_bar_tracks;
create trigger trg_listen_bar_tracks_public_submission
before insert on public.listen_bar_tracks
for each row
execute function public.listen_bar_tracks_guard_public_submission();

create or replace function public.process_listen_bar_rotation_limits()
returns table(
  promoted_to_public integer,
  completed_monthly_survival integer,
  removed_from_public integer,
  removed_over_total_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted_count integer := 0;
  v_removed_public_count integer := 0;
  v_now timestamptz := now();
  v_eviction_paused_until timestamptz := timestamptz '2026-07-06 00:00:00+08';
begin
  with promoted as (
    select id
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and bar_phase = 'challenger'
      and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and hidden_at is null
      and removed_at is null
      and created_at < v_now - interval '24 hours'
    order by created_at asc
  )
  update public.listen_bar_tracks t
  set bar_phase = 'public',
      review_status = 'approved',
      promoted_at = coalesce(t.promoted_at, v_now),
      updated_at = v_now
  from promoted p
  where t.id = p.id;

  get diagnostics v_promoted_count = row_count;

  if v_now >= v_eviction_paused_until then
    with visible_public as (
      select
        id,
        coalesce(nullif(trim(genre), ''), 'Original 自我風格') as genre_key,
        coalesce(promoted_at, created_at) as public_started_at,
        coalesce(positive_reaction_count, 0) as positive_reaction_count,
        created_at,
        count(*) over (
          partition by coalesce(nullif(trim(genre), ''), 'Original 自我風格')
        ) as genre_count
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'public'
        and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and hidden_at is null
        and removed_at is null
    ),
    genre_activation as (
      select genre_key, public_started_at as survival_started_at
      from (
        select
          genre_key,
          public_started_at,
          row_number() over (partition by genre_key order by public_started_at asc, created_at asc) as public_rank
        from visible_public
      ) ranked_activation
      where public_rank = 36
    ),
    ranked_public as (
      select
        visible_public.id,
        visible_public.genre_count,
        visible_public.positive_reaction_count,
        visible_public.created_at,
        visible_public.public_started_at,
        genre_activation.survival_started_at,
        row_number() over (
          partition by visible_public.genre_key
          order by visible_public.positive_reaction_count asc, visible_public.created_at asc
        ) as genre_rank
      from visible_public
      join genre_activation on genre_activation.genre_key = visible_public.genre_key
    ),
    public_losers as (
      select id
      from ranked_public
      where genre_count > 36
        and genre_rank <= genre_count - 36
        and not (
          positive_reaction_count >= 30
          or greatest(public_started_at, survival_started_at) <= v_now - interval '7 days'
        )
      order by genre_rank asc
      limit 3
    )
    update public.listen_bar_tracks t
    set is_active = false,
        review_status = 'removed',
        removed_at = v_now,
        moderation_note = '36-song genre public pool capacity rotation eviction.',
        updated_at = v_now
    from public_losers l
    where t.id = l.id;

    get diagnostics v_removed_public_count = row_count;
  end if;

  return query select
    v_promoted_count,
    0,
    v_removed_public_count,
    0;
end;
$$;

revoke all on function public.process_listen_bar_rotation_limits() from public;
revoke execute on function public.process_listen_bar_rotation_limits() from anon;
revoke execute on function public.process_listen_bar_rotation_limits() from authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

comment on function public.process_listen_bar_rotation_limits() is
'AIPOGER Bar Heartbreak rotation. Current rule: 11 fixed genres, each with a 36-track public pool; Challengers promote after 24H; capacity eviction is paused until 2026-07-06 00:00 +08 and then removes at most 3 low-reaction oldest non-honor overflow tracks inside overfull genre pools.';
