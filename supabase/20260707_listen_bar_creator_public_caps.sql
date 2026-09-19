-- AIPOGER Bar Heartbreak: creator public caps from 2026-07-07 onward.
-- This migration does not remove or rewrite existing songs. It only guards new submissions.
--
-- Current creator limits:
-- - per creator + genre: max 5 active public songs; a creator at 5+ must reduce that genre to 4 public songs before uploading that genre again
-- - per creator total public count: when active public songs across all genres are >= 30, successful uploads are limited to 1 per Taiwan day

create or replace function public.listen_bar_challenger_slot_limit_for_public_count(p_public_count integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when greatest(coalesce(p_public_count, 0), 0) >= 6 then 1
    when greatest(coalesce(p_public_count, 0), 0) >= 3 then 2
    else 3
  end;
$$;

create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_challengers integer := 0;
  active_public_tracks integer := 0;
  creator_genre_public_tracks integer := 0;
  creator_today_uploads integer := 0;
  creator_total_public_tracks integer := 0;
  genre_public_tracks integer := 0;
  challenger_slot_limit integer := 3;
  creator_genre_public_limit constant integer := 5;
  creator_total_public_daily_limit_threshold constant integer := 30;
  creator_daily_upload_limit_after_total_public constant integer := 1;
  creator_public_upload_limit_started_at constant timestamptz := timestamptz '2026-07-07 14:00:00+08';
  is_admin_user boolean := false;
  v_genre text := nullif(trim(coalesce(new.genre, '')), '');
  v_now timestamptz := now();
  v_taipei_today_start timestamptz := (date_trunc('day', v_now at time zone 'Asia/Taipei') at time zone 'Asia/Taipei');
  v_daily_window_start timestamptz := greatest(v_taipei_today_start, creator_public_upload_limit_started_at);
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

    if v_genre is null then
      raise exception '請從固定類型選單選擇歌曲類型。';
    end if;

    new.genre := v_genre;
    new.is_featured_official := false;
    new.review_status := coalesce(nullif(new.review_status, ''), 'approved');
    new.sort_order := coalesce(new.sort_order, 1000);

    select count(*)
    into creator_total_public_tracks
    from public.listen_bar_tracks t
    where t.created_by = auth.uid()
      and t.source = 'community'
      and t.is_active = true
      and t.bar_phase = 'public'
      and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and t.hidden_at is null
      and t.removed_at is null;

    if creator_total_public_tracks >= creator_total_public_daily_limit_threshold then
      select count(*)
      into creator_today_uploads
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null
        and t.created_at >= v_daily_window_start;

      if creator_today_uploads >= creator_daily_upload_limit_after_total_public then
        raise exception '你目前公播歌曲已有 % 首；從新規生效後，公播達 30 首的創作者每天最多成功上傳 1 首。今天額度已用完。',
          creator_total_public_tracks;
      end if;
    end if;

    select count(*)
    into creator_genre_public_tracks
    from public.listen_bar_tracks t
    where t.created_by = auth.uid()
      and t.source = 'community'
      and t.is_active = true
      and t.bar_phase = 'public'
      and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
      and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and t.hidden_at is null
      and t.removed_at is null;

    if creator_genre_public_tracks >= creator_genre_public_limit then
      raise exception '你在 % 公播池已有 %/% 首，已超過同類公播上限。這個種類必須先降到 4 首公播以下，才可以再傳第 5 首。',
        v_genre,
        creator_genre_public_tracks,
        creator_genre_public_limit;
    end if;

    select count(*)
    into genre_public_tracks
    from public.listen_bar_tracks t
    where t.source = 'community'
      and t.is_active = true
      and t.bar_phase = 'public'
      and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
      and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and t.hidden_at is null
      and t.removed_at is null;

    if genre_public_tracks < 36 then
      new.bar_phase := 'public';
      new.promoted_at := coalesce(new.promoted_at, v_now);
      return new;
    end if;

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
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
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
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      challenger_slot_limit := public.listen_bar_challenger_slot_limit_for_public_count(active_public_tracks);

      if active_challengers >= challenger_slot_limit then
        raise exception '你的 % 公播池已有 % 首，現在 Challenger 上限是 % 首。要再上傳，請先撤下一首同類 Challenger，或等同類公播池釋出空間。',
          v_genre,
          active_public_tracks,
          challenger_slot_limit;
      end if;
    end if;
  else
    if coalesce(is_admin_user, false) then
      if v_genre is null then
        raise exception '請從固定類型選單選擇歌曲類型。';
      end if;
      new.genre := v_genre;
      new.is_featured_official := true;
      new.review_status := 'approved';
      new.bar_phase := 'public';
      new.promoted_at := coalesce(new.promoted_at, v_now);
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
