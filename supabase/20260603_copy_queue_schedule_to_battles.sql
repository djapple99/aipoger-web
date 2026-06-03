-- AIPOGER Drop Battle v3: copy queue scheduling metadata into battles.
-- Run after supabase/20260603_drop_battle_scheduled_start.sql.
-- This protects all battle creation paths, including API inserts and SQL RPC inserts.

create or replace function public.copy_queue_schedule_to_battle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_row record;
begin
  if new.scheduled_start_at is not null and new.cancellation_evaluation_at is not null then
    return new;
  end if;

  select
    q.scheduled_start_at,
    q.cancellation_evaluation_at,
    q.expires_at
  into source_row
  from public.battle_queue q
  where q.id in (new.queue_a_id, new.queue_b_id)
    and (q.scheduled_start_at is not null or q.expires_at is not null)
  order by
    case when q.status = 'waiting_challenge' then 0 else 1 end,
    case when q.id = new.queue_a_id then 0 else 1 end
  limit 1;

  if not found then
    return new;
  end if;

  new.scheduled_start_at := coalesce(
    new.scheduled_start_at,
    source_row.scheduled_start_at,
    source_row.expires_at
  );

  if new.scheduled_start_at is not null then
    new.cancellation_evaluation_at := coalesce(
      new.cancellation_evaluation_at,
      source_row.cancellation_evaluation_at,
      new.scheduled_start_at + interval '1 minute'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists copy_queue_schedule_to_battle_before_insert on public.battles;
create trigger copy_queue_schedule_to_battle_before_insert
before insert on public.battles
for each row
execute function public.copy_queue_schedule_to_battle();
