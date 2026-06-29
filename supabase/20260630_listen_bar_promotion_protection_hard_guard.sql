-- AIPOGER Bar Heartbreak: hard guard promotion protection against stale 88-capacity evictions.
-- This supersedes older rotation paths during the 2026-06-29 to 2026-07-05 Taiwan-time promotion window.

create or replace function public.listen_bar_block_promotion_capacity_eviction()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_promotion_protection_until timestamptz := timestamptz '2026-07-06 00:00:00+08';
  v_note text := lower(coalesce(new.moderation_note, ''));
begin
  if now() < v_promotion_protection_until
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
    raise exception 'Bar Heartbreak promotion protection is active; system capacity eviction is paused until 2026-07-06 00:00 +08.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_block_promotion_capacity_eviction on public.listen_bar_tracks;
create trigger trg_listen_bar_block_promotion_capacity_eviction
before update of is_active, review_status, hidden_at, removed_at, moderation_note on public.listen_bar_tracks
for each row
execute function public.listen_bar_block_promotion_capacity_eviction();

comment on function public.listen_bar_block_promotion_capacity_eviction() is
'Blocks stale/system 88-capacity removals of active community public songs during the Bar Heartbreak promotion protection window. Creator self-removal and owner/admin hidden_at removals remain allowed.';

revoke all on function public.process_listen_bar_rotation_limits() from public;
revoke execute on function public.process_listen_bar_rotation_limits() from anon;
revoke execute on function public.process_listen_bar_rotation_limits() from authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

update public.listen_bar_tracks
set is_active = true,
    review_status = 'approved',
    hidden_at = null,
    removed_at = null,
    bar_phase = 'public',
    promoted_at = coalesce(promoted_at, created_at, now()),
    moderation_note = 'Restored after stale rotation cron during Bar Heartbreak promotion protection.',
    updated_at = now()
where source = 'community'
  and bar_phase = 'public'
  and hidden_at is null
  and review_status = 'removed'
  and removed_at >= timestamptz '2026-06-29 16:00:00+00'
  and removed_at < timestamptz '2026-06-29 16:05:00+00'
  and id in (
    '0506bc30-0047-45f6-a7e3-198e19ce7531',
    'd2cf4502-8a25-400d-a977-c450519c9d98',
    'a8b9b0d9-e5dd-4cec-a6b6-1d42d586700d',
    'f470c182-252f-49c0-891d-62fbe5cbaa13',
    'f3e202c6-0757-47d1-80dd-bf7af9e8968a',
    'e336786d-fdd1-4b07-a97a-4fbb75c3ebec',
    '2089dec5-9319-4c82-80b0-e682120266a1',
    '1e73273c-b368-44d0-8a93-6b1b842529ff'
  );
