-- LEGACY AIPOGER Bar Heartbreak migration.
-- This 2026-06-29 file is kept for historical repair context only and is
-- superseded by the 2026-07-01/2026-07-02 genre-pool migrations.
-- Current rule: 11 fixed genres, 36 public tracks per genre, 396 total public
-- target, and no system capacity eviction before 2026-07-06 00:00 +08.

alter table public.listen_bar_tracks
  add column if not exists moderation_note text;

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
  v_promotion_protection_until timestamptz := timestamptz '2026-07-06 00:00:00+08';
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
      and (
        v_now < v_promotion_protection_until
        or created_at < v_now - interval '24 hours'
      )
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

  if v_now >= v_promotion_protection_until and v_public_overflow > 0 then
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
        moderation_note = '88-song public pool capacity rotation eviction.',
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
'LEGACY AIPOGER Bar Heartbreak rotation function superseded by the 2026-07-01/2026-07-02 genre-pool rules. Current rule: 11 fixed genres, 36 public tracks per genre, 396 total public target, and no system capacity eviction before 2026-07-06 00:00 +08.';

update public.listen_bar_tracks
set is_active = true,
    review_status = 'approved',
    removed_at = null,
    bar_phase = 'public',
    promoted_at = coalesce(promoted_at, created_at, now()),
    moderation_note = 'Restored during Bar Heartbreak promotion protection after 88-song eviction pause.',
    updated_at = now()
where source = 'community'
  and bar_phase = 'public'
  and coalesce(review_status, 'approved') = 'removed'
  and removed_at is not null
  and hidden_at is null
  and (
    moderation_note = 'Legacy 88-song public pool capacity rotation eviction.'
    or moderation_note = '88-song public pool capacity rotation eviction.'
  );

update public.listen_bar_tracks
set bar_phase = 'public',
    review_status = 'approved',
    promoted_at = coalesce(promoted_at, now()),
    updated_at = now()
where source = 'community'
  and is_active = true
  and bar_phase = 'challenger'
  and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
  and hidden_at is null
  and removed_at is null
  and now() < timestamptz '2026-07-06 00:00:00+08';

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
  v_now timestamptz := now();
  v_promotion_protection_until timestamptz := timestamptz '2026-07-06 00:00:00+08';
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

    if v_now < v_promotion_protection_until then
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

      if active_challengers >= challenger_slot_limit then
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
