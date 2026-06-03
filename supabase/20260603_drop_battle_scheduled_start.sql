-- AIPOGER Drop Battle v3: scheduled start and cancellation metadata.
-- battle_queue.scheduled_start_at: founder-selected arena start time while the challenge waits in the pool.
-- battle_queue.cancellation_evaluation_at: time when the challenge becomes eligible for no-challenger cancellation.
-- battles.scheduled_start_at: scheduled arena start time copied from the queue row when a battle is created.
-- battles.cancellation_evaluation_at: time when a pending battle can be evaluated for automatic cancellation.
-- battles.cancellation_reason: nullable cancellation marker; currently 'no_challenger' or 'founder_manual'.

alter table public.battle_queue
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz;

alter table public.battles
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists cancellation_evaluation_at timestamptz,
  add column if not exists cancellation_reason text;

alter table public.battles drop constraint if exists battles_cancellation_reason_check;
alter table public.battles
  add constraint battles_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in ('no_challenger', 'founder_manual')
  );

comment on column public.battle_queue.scheduled_start_at is
  'Founder-selected arena start time while a Drop Battle challenge waits in the pool.';
comment on column public.battle_queue.cancellation_evaluation_at is
  'Time when a queued challenge becomes eligible for no-challenger cancellation.';
comment on column public.battles.scheduled_start_at is
  'Scheduled arena start time copied from the matched queue row.';
comment on column public.battles.cancellation_evaluation_at is
  'Time when a pending battle can be evaluated for automatic cancellation.';
comment on column public.battles.cancellation_reason is
  'Nullable cancellation reason: no_challenger or founder_manual.';

create index if not exists idx_battles_pending_scheduled
on public.battles (scheduled_start_at)
where status = 'pending';
