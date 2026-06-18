-- AIPOGER Official Gatekeeper Drops
-- Safe to run more than once.
--
-- Product model:
-- - The four official cards are templates, not consumable public queue rows.
-- - Owner uploads/updates the official Drop audio.
-- - A challenger creates their own battle instance against a copied official defender queue.

create table if not exists public.official_gatekeeper_drops (
  id text primary key,
  gate_number text not null,
  title text not null default '官方守門 Drop',
  genre text not null,
  ai_tool text not null default 'AI Music',
  description text,
  audio_path text,
  active boolean not null default false,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.official_gatekeeper_drops
  add column if not exists gate_number text,
  add column if not exists title text not null default '官方守門 Drop',
  add column if not exists genre text,
  add column if not exists ai_tool text not null default 'AI Music',
  add column if not exists description text,
  add column if not exists audio_path text,
  add column if not exists active boolean not null default false,
  add column if not exists sort_order integer not null default 100,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.battle_queue
  add column if not exists official_gatekeeper_id text references public.official_gatekeeper_drops(id) on delete set null,
  add column if not exists official_gatekeeper_role text;

alter table public.battle_queue drop constraint if exists battle_queue_official_gatekeeper_role_check;
alter table public.battle_queue
  add constraint battle_queue_official_gatekeeper_role_check
  check (official_gatekeeper_role is null or official_gatekeeper_role in ('defender', 'challenger'));

alter table public.battles
  add column if not exists official_gatekeeper_id text references public.official_gatekeeper_drops(id) on delete set null;

create index if not exists official_gatekeeper_drops_active_idx
on public.official_gatekeeper_drops (active, sort_order);

create index if not exists battle_queue_official_gatekeeper_idx
on public.battle_queue (official_gatekeeper_id, official_gatekeeper_role, status);

create index if not exists battles_official_gatekeeper_idx
on public.battles (official_gatekeeper_id, status, created_at desc);

insert into public.official_gatekeeper_drops (id, gate_number, title, genre, ai_tool, description, active, sort_order)
values
  ('gate-01-heartbreak', 'GATE 01', '官方守門 Drop', '感人抒情', 'Suno', '挑戰這首官方 Drop，設定開戰時間並分享拉人投票。', false, 1),
  ('gate-02-city-pop', 'GATE 02', '官方守門 Drop', '復古City-Pop', 'Suno', '挑戰這首官方 Drop，設定開戰時間並分享拉人投票。', false, 2),
  ('gate-03-club-edm', 'GATE 03', '官方守門 Drop', '動感電音', 'Suno', '挑戰這首官方 Drop，設定開戰時間並分享拉人投票。', false, 3),
  ('gate-04-rap-rnb', 'GATE 04', '官方守門 Drop', '說唱街頭風', 'Suno', '挑戰這首官方 Drop，設定開戰時間並分享拉人投票。', false, 4)
on conflict (id) do update
set gate_number = excluded.gate_number,
    title = excluded.title,
    genre = excluded.genre,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.official_gatekeeper_drops enable row level security;

grant select on table public.official_gatekeeper_drops to anon, authenticated;
grant all on table public.official_gatekeeper_drops to service_role;

drop policy if exists "public can read active official gatekeeper drops" on public.official_gatekeeper_drops;
create policy "public can read active official gatekeeper drops"
on public.official_gatekeeper_drops
for select
to anon, authenticated
using (active = true and audio_path is not null);

drop policy if exists "service can manage official gatekeeper drops" on public.official_gatekeeper_drops;
create policy "service can manage official gatekeeper drops"
on public.official_gatekeeper_drops
for all
to service_role
using (true)
with check (true);
