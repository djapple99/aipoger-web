-- AIPOGER 傷心酒吧 Bar Heartbreak：3/2/1 creator Challenger slots
-- 可重複執行。公播池歌曲不佔 Challenger 名額，但會降低新的 Challenger 併發上限。

create index if not exists listen_bar_tracks_created_by_active_public_idx
on public.listen_bar_tracks (created_by, created_at desc)
where source = 'community' and is_active = true and bar_phase = 'public';

create or replace function public.listen_bar_challenger_slot_limit_for_public_count(p_public_count integer)
returns integer
language sql
immutable
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
  challenger_slot_limit integer := 3;
  is_admin_user boolean := false;
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
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      challenger_slot_limit := public.listen_bar_challenger_slot_limit_for_public_count(active_public_tracks);

      if new.bar_phase = 'challenger' and active_challengers >= challenger_slot_limit then
        raise exception '你的公播池已有 % 首，現在 Challenger 上限是 % 首。要再上傳，請先撤下一首 Challenger，或等公播池歌曲被撤下/淘汰後釋出節奏。',
          active_public_tracks,
          challenger_slot_limit;
      end if;
    end if;
  else
    if coalesce(is_admin_user, false) then
      new.is_featured_official := true;
      new.review_status := 'approved';
      new.bar_phase := 'public';
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
