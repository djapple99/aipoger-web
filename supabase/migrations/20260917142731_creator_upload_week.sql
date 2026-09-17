-- Each creator starts a 168-hour window with their first successful submission.
-- No backfill: existing songs do not consume the new allowance.
create table if not exists public.listen_bar_creator_upload_windows (
  creator_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  upload_count smallint not null check (upload_count between 1 and 3)
);
alter table public.listen_bar_creator_upload_windows enable row level security;
revoke all on public.listen_bar_creator_upload_windows from public, anon, authenticated;
grant all on public.listen_bar_creator_upload_windows to service_role;

create or replace function public.listen_bar_count_creator_upload()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_id uuid;
begin
  if new.source is distinct from 'community' then return new; end if;
  if auth.uid() is null or new.created_by is distinct from auth.uid() then
    raise exception '只能用自己的帳號投稿。';
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
drop trigger if exists trg_listen_bar_count_creator_upload on public.listen_bar_tracks;
create trigger trg_listen_bar_count_creator_upload
after insert on public.listen_bar_tracks
for each row execute function public.listen_bar_count_creator_upload();

create or replace function public.listen_bar_my_upload_quota()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_window public.listen_bar_creator_upload_windows%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception '請先登入。'; end if;
  select * into v_window from public.listen_bar_creator_upload_windows where creator_id = auth.uid();
  if not found or v_window.started_at + interval '168 hours' <= v_now then
    return jsonb_build_object('used', 0, 'limit', 3, 'resetsAt', null, 'serverNow', v_now);
  end if;
  return jsonb_build_object('used', v_window.upload_count, 'limit', 3,
    'resetsAt', v_window.started_at + interval '168 hours', 'serverNow', v_now);
end;
$$;
revoke all on function public.listen_bar_my_upload_quota() from public, anon;
grant execute on function public.listen_bar_my_upload_quota() to authenticated;

-- Preserve the existing identity, genre and public-admission checks. Retire
-- only the 30-public-tracks / one-upload-per-Taiwan-day branch.
create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger language plpgsql set search_path = public
as $$
declare
  creator_genre_public_tracks integer := 0;
  creator_genre_public_limit constant integer := 5;
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
    select count(*) into creator_genre_public_tracks
    from public.listen_bar_tracks t
    where t.created_by = auth.uid() and t.source = 'community'
      and t.is_active = true and t.bar_phase = 'public'
      and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
      and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and t.hidden_at is null and t.removed_at is null;
    if creator_genre_public_tracks >= creator_genre_public_limit then
      raise exception '你在 % 公播池已有 %/% 首，已超過同類公播上限。這個種類必須先降到 4 首公播以下，才可以再傳第 5 首。',
        v_genre, creator_genre_public_tracks, creator_genre_public_limit;
    end if;
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

comment on table public.listen_bar_creator_upload_windows is
  'First successful community song starts a 168-hour / 3-upload window. No song FK: deletion never refunds quota. Existing songs are not backfilled.';
