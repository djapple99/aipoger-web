-- AIPOGER Bar Heartbreak V2 survival radio.
--
-- Rule changes:
-- - Bar Heartbreak is a survival radio, not a ranking chart.
-- - New community submissions enter Challenger with 24H protection.
-- - Challenger tracks have 24H protection, then move into the public pool automatically.
-- - The old "1 positive reaction to promote" gate is retired.
-- - Public-pool eviction only trims active public community tracks above 88, capped at 3 per pass.
-- - Honor Board eligibility is product-side: 30 positive reactions or 7 public survival days.

comment on table public.listen_bar_tracks is
'AIPOGER Bar Heartbreak V2 survival radio. Public community pool target is 88. New Challenger tracks receive 24H protection, then enter the public pool automatically. No 30-day expiry and no 1-reaction promotion gate. Public removal only trims active public community tracks above 88, capped at 3 per pass. Honor eligibility is 30 positive reactions or 7 public survival days.';

create index if not exists listen_bar_tracks_public_survival_idx
  on public.listen_bar_tracks (source, is_active, bar_phase, promoted_at, created_at)
  where source = 'community';

create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_challengers integer := 0;
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

      if new.bar_phase = 'challenger' and active_challengers >= 3 then
        raise exception '你的 Challenger 已達 3 首。要再上傳，請先撤下一首 Challenger，或等歌曲進入公播池後空出位置。';
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
  v_public_count integer := 0;
  v_public_overflow integer := 0;
  v_now timestamptz := now();
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

  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public'
    and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
    and hidden_at is null
    and removed_at is null;

  v_public_overflow := greatest(v_public_count - 88, 0);

  if v_public_overflow > 0 then
    with public_losers as (
      select id
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'public'
        and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and hidden_at is null
        and removed_at is null
      order by positive_reaction_count asc, created_at asc
      limit least(v_public_overflow, 3)
    )
    update public.listen_bar_tracks t
    set is_active = false,
        review_status = 'removed',
        removed_at = v_now,
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
grant execute on function public.process_listen_bar_rotation_limits() to authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

-- Keep the 2026-06-25 protection against legacy completed/monthly-survival jobs.
create or replace function public.listen_bar_block_legacy_completed_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.source = 'community'
     and coalesce(old.bar_phase, new.bar_phase) = 'public'
     and new.review_status = 'completed'
     and (new.is_active = false or new.removed_at is not null) then
    new.is_active := true;
    new.review_status := 'approved';
    new.bar_phase := 'public';
    new.removed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_block_legacy_completed_removal on public.listen_bar_tracks;
create trigger trg_listen_bar_block_legacy_completed_removal
before update of is_active, review_status, bar_phase, removed_at on public.listen_bar_tracks
for each row
execute function public.listen_bar_block_legacy_completed_removal();

update public.listen_bar_tracks
set promoted_at = coalesce(promoted_at, created_at)
where source = 'community'
  and is_active = true
  and bar_phase = 'public'
  and promoted_at is null;
