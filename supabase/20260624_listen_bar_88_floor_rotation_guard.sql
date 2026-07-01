-- LEGACY AIPOGER Bar Heartbreak global-floor guard.
-- Superseded by the 2026-07-01/2026-07-02 genre-pool rules.
-- Current rule: 11 fixed genres, 36 public tracks per genre, 396 total public
-- target, and no system capacity eviction before 2026-07-06 00:00 +08.
--
-- Final V1 rule:
-- - no legacy 30-day completion removal
-- - no legacy 66-song / 24H-4-reaction removal
-- - rotation may remove songs only when active public community tracks exceed 88
-- - historical one-pass overflow trimming was capped at 3
-- - ties by positive reaction count remove older songs first
-- - rotation does not refill the public pool when it is below 88

comment on table public.listen_bar_tracks is
'LEGACY AIPOGER Bar Heartbreak V1 global-floor rotation. Superseded by the 2026-07-01/2026-07-02 genre-pool rules: 11 fixed genres, 36 public tracks per genre, 396 total public target, no system capacity eviction before 2026-07-06 00:00 +08.';

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
  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public'
    and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
    and removed_at is null;

  if v_public_count >= 88 then
    with promoted as (
      select id
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'challenger'
        and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and removed_at is null
        and created_at < v_now - interval '24 hours'
        and positive_reaction_count >= 1
      order by positive_reaction_count desc, created_at asc
      limit 8
    )
    update public.listen_bar_tracks t
    set bar_phase = 'public',
        review_status = 'approved',
        promoted_at = coalesce(t.promoted_at, v_now),
        updated_at = v_now
    from promoted p
    where t.id = p.id;

    get diagnostics v_promoted_count = row_count;
  end if;

  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public'
    and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
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

-- Repair rows incorrectly removed by the old 30-day/completed survival rule.
-- This intentionally does not restore manually hidden/removed rows.
update public.listen_bar_tracks
set is_active = true,
    review_status = 'approved',
    bar_phase = 'public',
    removed_at = null,
    updated_at = now()
where source = 'community'
  and bar_phase = 'public'
  and is_active = false
  and review_status = 'completed'
  and removed_at is not null;
