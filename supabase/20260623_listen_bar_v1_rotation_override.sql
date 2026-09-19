-- AIPOGER Bar Heartbreak V1 rotation override.
-- This intentionally replaces older public-beta rules:
-- - no 66-song public pool limit
-- - no 24H / 4 reaction survival removal
-- - no 30-day monthly completion removal
--
-- Current V1 rule:
-- - public community pool target is 88 songs
-- - challengers need 1 positive reaction after 24H when the public pool is full
-- - removal only happens when active public community songs exceed 88
-- - each pass removes at most 3 low-performing public songs

comment on table public.listen_bar_tracks is
'AIPOGER Bar Heartbreak V1 rotation. Public community pool target is 88. No 30-day expiry; no legacy 66-song / 24H-4-reaction survival removal. Public removal only runs when active public community tracks exceed 88.';

drop function if exists public.process_listen_bar_rotation_limits();

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
  v_opening_public_seats integer := 0;
  v_public_overflow integer := 0;
  v_now timestamptz := now();
begin
  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public'
    and review_status not in ('hidden', 'removed', 'completed')
    and removed_at is null;

  v_opening_public_seats := greatest(88 - v_public_count, 0);

  if v_opening_public_seats > 0 then
    with promoted as (
      select id
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'challenger'
        and review_status not in ('hidden', 'removed', 'completed')
        and removed_at is null
      order by created_at asc
      limit v_opening_public_seats
    )
    update public.listen_bar_tracks t
    set bar_phase = 'public',
        review_status = 'approved',
        promoted_at = coalesce(t.promoted_at, v_now),
        updated_at = v_now
    from promoted p
    where t.id = p.id;
  else
    with promoted as (
      select id
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'challenger'
        and review_status not in ('hidden', 'removed', 'completed')
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
  end if;

  get diagnostics v_promoted_count = row_count;

  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public'
    and review_status not in ('hidden', 'removed', 'completed')
    and removed_at is null;

  v_public_overflow := greatest(v_public_count - 88, 0);

  v_removed_public_count := 0;

  if v_public_overflow > 0 then
    with public_losers as (
      select id
      from public.listen_bar_tracks
      where source = 'community'
        and is_active = true
        and bar_phase = 'public'
        and review_status not in ('hidden', 'removed', 'completed')
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
