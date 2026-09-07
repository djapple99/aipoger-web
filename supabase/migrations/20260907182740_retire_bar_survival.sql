-- Retire daily Bar survival; preserve tracks, recognition and reaction history.
-- Existing per-creator upload limits and ownership validation remain in force.
CREATE OR REPLACE FUNCTION public.listen_bar_tracks_guard_public_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  creator_genre_public_tracks integer := 0;
  creator_today_uploads integer := 0;
  creator_total_public_tracks integer := 0;
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

    new.bar_phase := 'public';
    new.promoted_at := coalesce(new.promoted_at, v_now);
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
$function$
;
CREATE OR REPLACE FUNCTION public.listen_bar_block_legacy_public_capacity_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_note text;
  v_manual_removal boolean := false;
begin
  if old.source is distinct from 'community'
    or old.bar_phase is distinct from 'public'
    or old.is_active is not true
    or old.removed_at is not null
    or coalesce(old.review_status, 'approved') in ('hidden', 'removed', 'completed', 'rejected') then
    return new;
  end if;

  if not (
    new.is_active is false
    or new.removed_at is not null
    or coalesce(new.review_status, 'approved') in ('hidden', 'removed')
  ) then
    return new;
  end if;

  v_note := lower(coalesce(new.moderation_note, ''));
  v_manual_removal :=
    v_note like 'creator removed own bar heartbreak track.%'
    or v_note like 'owner hidden from bar heartbreak console.%'
    or v_note like 'owner bulk hide from bar heartbreak console.%'
    or v_note like 'owner removed from bar heartbreak console.%'
    or v_note like 'owner bulk remove from bar heartbreak console.%'
    or v_note like 'admin hidden from bar heartbreak console.%'
    or v_note like 'admin bulk hide from bar heartbreak console.%'
    or v_note like 'admin removed from bar heartbreak console.%'
    or v_note like 'admin bulk remove from bar heartbreak console.%'
    or v_note like 'moderation:%'
    or v_note like 'content report:%';

  if v_manual_removal then
    return new;
  end if;

  raise exception 'Automatic Bar Heartbreak capacity removal is retired. Use an explicit creator/admin/moderation action.';
end;
$function$
;
create or replace function public.process_listen_bar_rotation_limits()
returns table(promoted_to_public integer, completed_monthly_survival integer, removed_from_public integer, removed_over_total_limit integer)
language sql security invoker set search_path = public
as $$ select 0, 0, 0, 0; $$;
revoke all on function public.process_listen_bar_rotation_limits() from public, anon, authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

drop trigger if exists trg_listen_bar_block_pre_eviction_capacity_removal on public.listen_bar_tracks;
-- Existing active challengers are already publicly listenable; remove their obsolete waiting state.
update public.listen_bar_tracks
set bar_phase = 'public', promoted_at = coalesce(promoted_at, created_at)
where source = 'community' and is_active = true and bar_phase = 'challenger'
  and coalesce(review_status, 'approved') not in ('hidden','removed','completed','rejected')
  and hidden_at is null and removed_at is null
  and ai_music_showtime_public_removed_at is null;
