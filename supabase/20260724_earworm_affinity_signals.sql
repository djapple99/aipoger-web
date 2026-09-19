-- Earworm blind-listening affinity signals.
-- This is a recommendation signal only; it never changes Heart, Battle, Showtime, or rewards.

create table if not exists public.earworm_track_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  quiz_result_id uuid not null references public.earworm_personality_results(id) on delete cascade,
  reaction text not null,
  reaction_score smallint not null,
  listened_seconds numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint earworm_track_reactions_allowed_reaction check (reaction in ('love', 'replay', 'okay', 'pass')),
  constraint earworm_track_reactions_score_matches check (
    (reaction = 'love' and reaction_score = 4) or
    (reaction = 'replay' and reaction_score = 3) or
    (reaction = 'okay' and reaction_score = 1) or
    (reaction = 'pass' and reaction_score = 0)
  ),
  constraint earworm_track_reactions_listened check (listened_seconds >= 8),
  constraint earworm_track_reactions_one_per_account unique (user_id, track_id)
);

create index if not exists earworm_track_reactions_track_idx
  on public.earworm_track_reactions (track_id, updated_at desc);

create index if not exists earworm_track_reactions_user_idx
  on public.earworm_track_reactions (user_id, updated_at desc);

alter table public.earworm_track_reactions enable row level security;
revoke all on table public.earworm_track_reactions from anon, authenticated;
grant all on table public.earworm_track_reactions to service_role;

create or replace view public.earworm_track_affinity_stats
with (security_invoker = true)
as
select
  track_id,
  count(distinct user_id)::bigint as sample_count,
  round((avg(reaction_score::numeric) / 4) * 100)::smallint as affinity_percent
from public.earworm_track_reactions
group by track_id;

revoke all on table public.earworm_track_affinity_stats from anon, authenticated;
grant select on table public.earworm_track_affinity_stats to service_role;

comment on table public.earworm_track_reactions is
  'Latest signed-in Earworm reaction per track and account; recommendation-only, with no rewards or formal Battle effect.';

comment on view public.earworm_track_affinity_stats is
  'Server-only aggregate for blind-listening affinity. The API hides percentages below the public sample threshold.';
