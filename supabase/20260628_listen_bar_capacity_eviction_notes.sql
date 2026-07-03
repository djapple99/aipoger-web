-- LEGACY AIPOGER Bar Heartbreak migration: make old global-pool capacity
-- evictions visible in admin.
-- Superseded by the 2026-07-01/2026-07-02 genre-pool rules.
-- Current rule: 11 fixed genres, 36 public tracks per genre, 396 total public
-- target, and no system capacity eviction before 2026-07-06 00:00 +08.
-- Idempotent. Uses moderation_note so admin can distinguish rotation evictions
-- from owner moderation and creator self-removal.

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
grant execute on function public.process_listen_bar_rotation_limits() to authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

update public.listen_bar_tracks
set moderation_note = 'Legacy 88-song public pool capacity rotation eviction.'
where source = 'community'
  and bar_phase = 'public'
  and coalesce(review_status, 'approved') = 'removed'
  and removed_at is not null
  and hidden_at is null
  and (moderation_note is null or btrim(moderation_note) = '');
