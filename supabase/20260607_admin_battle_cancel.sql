-- AIPOGER owner admin: allow battle cancellation metadata.
-- Run before deploying /admin/battles if production should record cancellation_reason = 'admin_cancelled'.

alter table public.battles
  add column if not exists cancellation_reason text;

alter table public.battles drop constraint if exists battles_cancellation_reason_check;
alter table public.battles
  add constraint battles_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in ('no_challenger', 'founder_manual', 'admin_cancelled')
  );

comment on column public.battles.cancellation_reason is
  'Nullable cancellation reason: no_challenger, founder_manual, or admin_cancelled.';
