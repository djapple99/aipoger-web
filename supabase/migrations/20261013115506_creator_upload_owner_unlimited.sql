-- Confirmed 2026-10-13: members share 3 link/file submissions per personal
-- 168-hour window. Owner submissions are unlimited. No per-genre inventory cap.
-- No existing tracks or quota history are modified; no Credit economy is enabled.

create or replace function public.listen_bar_count_creator_upload()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_id uuid;
begin
  if new.source is distinct from 'community' then return new; end if;
  if auth.uid() is null or new.created_by is distinct from auth.uid() then
    raise exception '只能用自己的帳號投稿。';
  end if;
  -- Only the owner's confirmed Auth primary email grants this exception.
  -- Profile flags, user metadata and client-supplied claims cannot grant it.
  if exists (select 1 from auth.users u where u.id = auth.uid()
    and u.email_confirmed_at is not null and u.is_anonymous is not true
    and lower(trim(coalesce(u.email, ''))) in ('djapple99@gmail.com', 'aipoger99@gmail.com')) then
    return new;
  end if;
  -- The unique row serializes concurrent uploads. Failed inserts roll back
  -- this update too; deleting or hiding a song never touches the allowance.
  insert into public.listen_bar_creator_upload_windows as w
    (creator_id, started_at, upload_count)
  values (new.created_by, v_now, 1)
  on conflict (creator_id) do update
  set started_at = case when w.started_at + interval '168 hours' <= v_now then v_now else w.started_at end,
      upload_count = case when w.started_at + interval '168 hours' <= v_now then 1 else w.upload_count + 1 end
  where w.started_at + interval '168 hours' <= v_now or w.upload_count < 3
  returning creator_id into v_id;
  if v_id is null then
    raise exception using errcode = 'P0001', message = 'CREATOR_WEEKLY_UPLOAD_LIMIT: 本期 7 天內已成功上傳 3 首；刪除歌曲不會退還額度。';
  end if;
  return new;
end;
$$;
revoke all on function public.listen_bar_count_creator_upload() from public, anon, authenticated;
create or replace function public.listen_bar_my_upload_quota()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_window public.listen_bar_creator_upload_windows%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception '請先登入。'; end if;
  -- Only the owner's confirmed Auth primary email grants this exception.
  -- Profile flags, user metadata and client-supplied claims cannot grant it.
  if exists (select 1 from auth.users u where u.id = auth.uid()
    and u.email_confirmed_at is not null and u.is_anonymous is not true
    and lower(trim(coalesce(u.email, ''))) in ('djapple99@gmail.com', 'aipoger99@gmail.com')) then
    return jsonb_build_object('used', 0, 'limit', null, 'unlimited', true, 'resetsAt', null, 'serverNow', v_now);
  end if;
  select * into v_window from public.listen_bar_creator_upload_windows where creator_id = auth.uid();
  if not found or v_window.started_at + interval '168 hours' <= v_now then
    return jsonb_build_object('used', 0, 'limit', 3, 'unlimited', false, 'resetsAt', null, 'serverNow', v_now);
  end if;
  return jsonb_build_object('used', v_window.upload_count, 'limit', 3, 'unlimited', false,
    'resetsAt', v_window.started_at + interval '168 hours', 'serverNow', v_now);
end;
$$;
revoke all on function public.listen_bar_my_upload_quota() from public, anon;
grant execute on function public.listen_bar_my_upload_quota() to authenticated;

-- Keep identity, required genre, moderation and public-admission behavior.
-- Remove the per-creator/per-genre five-active-song limit.
create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger language plpgsql set search_path = public
as $$
declare
  is_admin_user boolean := false;
  v_genre text := nullif(trim(coalesce(new.genre, '')), '');
  v_now timestamptz := now();
begin
  select coalesce(p.is_admin, false) into is_admin_user
  from public.user_profiles p where p.id = auth.uid();

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
    new.bar_phase := 'public';
    new.promoted_at := coalesce(new.promoted_at, v_now);
  elsif coalesce(is_admin_user, false) then
    if v_genre is null then
      raise exception '請從固定類型選單選擇歌曲類型。';
    end if;
    new.genre := v_genre;
    new.is_featured_official := true;
    new.review_status := 'approved';
    new.bar_phase := 'public';
    new.promoted_at := coalesce(new.promoted_at, v_now);
  end if;
  return new;
end;
$$;
revoke all on function public.listen_bar_tracks_guard_public_submission() from public, anon, authenticated;

