-- Earworm is a structured, same-genre listening judgment layer.
-- It is intentionally separate from Drop Battle votes and official Battle records.

create table if not exists public.earworm_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_key text not null,
  genre text not null,
  track_a_id uuid not null references public.listen_bar_tracks(id) on delete restrict,
  track_b_id uuid not null references public.listen_bar_tracks(id) on delete restrict,
  selection text not null check (selection in ('a', 'b', 'neither')),
  listened_a_seconds numeric(8, 2) not null default 0 check (listened_a_seconds >= 0),
  listened_b_seconds numeric(8, 2) not null default 0 check (listened_b_seconds >= 0),
  explanation text,
  created_at timestamptz not null default now(),
  constraint earworm_votes_distinct_tracks check (track_a_id <> track_b_id),
  constraint earworm_votes_explanation_length check (explanation is null or length(explanation) <= 280),
  constraint earworm_votes_one_submission_per_task unique (user_id, task_key)
);

create index if not exists earworm_votes_genre_created_idx
  on public.earworm_votes (genre, created_at desc);

alter table public.earworm_votes enable row level security;
revoke all on table public.earworm_votes from anon, authenticated;
grant all on table public.earworm_votes to service_role;

-- Earworm rewards use the existing APC point economy via award_battle_points().
-- The API awards points only after the vote row is inserted successfully.
