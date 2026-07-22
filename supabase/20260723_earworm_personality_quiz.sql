-- Earworm V2: ten-track music personality quiz.
-- This table is server-only and intentionally separate from formal Battle votes/results.

create table if not exists public.earworm_personality_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_key text not null,
  track_ids uuid[] not null,
  answers jsonb not null,
  scores jsonb not null,
  primary_genre text not null,
  secondary_genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint earworm_personality_track_count check (cardinality(track_ids) = 10),
  constraint earworm_personality_answers_shape check (
    jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 10
  ),
  constraint earworm_personality_scores_shape check (jsonb_typeof(scores) = 'object'),
  constraint earworm_personality_one_result_per_quiz unique (user_id, quiz_key)
);

create index if not exists earworm_personality_user_created_idx
  on public.earworm_personality_results (user_id, created_at desc);

create index if not exists earworm_personality_primary_genre_idx
  on public.earworm_personality_results (primary_genre, created_at desc);

alter table public.earworm_personality_results enable row level security;
revoke all on table public.earworm_personality_results from anon, authenticated;
grant all on table public.earworm_personality_results to service_role;

comment on table public.earworm_personality_results is
  'Server-written Earworm ten-track personality results; not a formal Battle record.';
