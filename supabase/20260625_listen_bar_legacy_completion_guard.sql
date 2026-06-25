-- AIPOGER Bar Heartbreak legacy completion guard.
--
-- Production showed old monthly-survival jobs still marking public community
-- songs as completed. The V1 rule has no completed/30-day removal; public
-- removals are only overflow trims above the 88-song public floor.

comment on table public.listen_bar_tracks is
'AIPOGER Bar Heartbreak V1 rotation. Public community pool has an 88-song floor: no 30-day expiry, no legacy 66-song / 24H-4-reaction survival removal, no rotation refill below 88, and public removal only trims active public community tracks above 88. Legacy completed removals are blocked.';

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
    and hidden_at is null
    and removed_at is null;

  if v_public_count >= 88 then
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

-- Repair rows incorrectly removed by the old completed/monthly-survival rule.
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
