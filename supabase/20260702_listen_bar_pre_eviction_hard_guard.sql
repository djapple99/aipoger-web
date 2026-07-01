-- AIPOGER Bar Heartbreak: pre-eviction hard guard.
-- 2026-07-01..2026-07-05 is the 11-genre migration grace period.
-- Capacity eviction starts only on 2026-07-06 00:00 +08.
-- This trigger blocks stale service-role or old rotation paths from removing
-- active community public songs before the grace period ends.

create or replace function public.listen_bar_block_pre_eviction_capacity_removal()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_eviction_paused_until timestamptz := timestamptz '2026-07-06 00:00:00+08';
  v_note text := lower(coalesce(new.moderation_note, ''));
begin
  if now() < v_eviction_paused_until
     and old.source = 'community'
     and coalesce(old.bar_phase, new.bar_phase) = 'public'
     and old.is_active = true
     and coalesce(old.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
     and old.hidden_at is null
     and old.removed_at is null
     and (
       new.is_active = false
       or lower(coalesce(new.review_status, '')) = 'removed'
       or new.removed_at is not null
     )
     and new.hidden_at is null
     and v_note not like 'creator removed own bar heartbreak track.%'
  then
    raise exception 'Bar Heartbreak pre-eviction grace is active; system capacity eviction is paused until 2026-07-06 00:00 +08.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_block_pre_eviction_capacity_removal on public.listen_bar_tracks;
create trigger trg_listen_bar_block_pre_eviction_capacity_removal
before update of is_active, review_status, hidden_at, removed_at, moderation_note on public.listen_bar_tracks
for each row
execute function public.listen_bar_block_pre_eviction_capacity_removal();

comment on function public.listen_bar_block_pre_eviction_capacity_removal() is
'AIPOGER Bar Heartbreak hard guard: before 2026-07-06 00:00 +08, blocks system/service capacity removals of active community public songs while allowing owner/admin hidden_at removals and creator self-removal.';

revoke all on function public.listen_bar_block_pre_eviction_capacity_removal() from public;
