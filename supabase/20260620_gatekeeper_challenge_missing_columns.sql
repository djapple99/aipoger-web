-- AIPOGER Official Gatekeeper challenge missing-column repair.
-- Safe to run more than once.
--
-- The gatekeeper challenge API writes these fields when creating the
-- challenger queue and battle room.

alter table public.battle_queue
  add column if not exists audio_sha256 text;

alter table public.battle_queue drop constraint if exists battle_queue_audio_sha256_format;
alter table public.battle_queue
  add constraint battle_queue_audio_sha256_format
  check (audio_sha256 is null or audio_sha256 ~ '^[a-f0-9]{64}$');

create unique index if not exists battle_queue_audio_sha256_active_uniq
on public.battle_queue (audio_sha256)
where audio_sha256 is not null
  and status in ('searching', 'waiting', 'waiting_challenge', 'matched', 'active', 'ghost_battle', 'public_voting');

alter table public.battles
  add column if not exists fighter_a_avatar text,
  add column if not exists fighter_b_avatar text;

notify pgrst, 'reload schema';
