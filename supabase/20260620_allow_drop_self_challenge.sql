-- Allow intentional self-challenge in Drop Battle while still preventing a row
-- from using the same queue entry on both sides.

alter table public.battles
  drop constraint if exists battles_distinct_fighters;

alter table public.battles
  drop constraint if exists battles_distinct_queues;

alter table public.battles
  add constraint battles_distinct_queues
  check (
    queue_a_id is null
    or queue_b_id is null
    or queue_a_id <> queue_b_id
  );

comment on constraint battles_distinct_queues on public.battles is
  'A battle must use two different queue entries. Same-user self challenge is allowed when the creator intentionally compares two own Drop songs.';
