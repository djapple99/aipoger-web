-- AIPOGER Q Crash: optional comments from signed-in audience voters.
-- Comments stay sealed with the vote while the Q Crash is open and are revealed by the server API after settlement.

create extension if not exists pgcrypto;

create table if not exists public.q_crash_comments (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  moderation_status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint q_crash_comments_one_per_voter unique (battle_id, user_id),
  constraint q_crash_comments_require_vote
    foreign key (battle_id, user_id)
    references public.q_crash_votes(battle_id, user_id)
    on delete cascade,
  constraint q_crash_comments_body_length check (char_length(body) between 1 and 120),
  constraint q_crash_comments_moderation_status check (moderation_status in ('visible', 'hidden'))
);

create index if not exists q_crash_comments_battle_created_idx
on public.q_crash_comments (battle_id, created_at asc);

create index if not exists q_crash_comments_user_id_idx
on public.q_crash_comments (user_id);

alter table public.q_crash_comments enable row level security;

revoke all on table public.q_crash_comments from anon, authenticated;
grant all on table public.q_crash_comments to service_role;

drop policy if exists q_crash_comments_service_manage on public.q_crash_comments;
create policy q_crash_comments_service_manage
on public.q_crash_comments
for all
to service_role
using (true)
with check (true);

create or replace function public.validate_q_crash_comment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_battle_type text;
  target_fighter_a_user_id uuid;
  target_fighter_b_user_id uuid;
begin
  select battle_type, fighter_a_user_id, fighter_b_user_id
  into target_battle_type, target_fighter_a_user_id, target_fighter_b_user_id
  from public.battles
  where id = new.battle_id;

  if not found or target_battle_type <> 'q_crash' then
    raise exception 'Q Crash comments require a Q Crash battle';
  end if;

  if new.user_id = target_fighter_a_user_id or new.user_id = target_fighter_b_user_id then
    raise exception 'Q Crash participants cannot leave audience comments';
  end if;

  new.body := btrim(new.body);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_q_crash_comment() from public, anon, authenticated;
grant execute on function public.validate_q_crash_comment() to service_role;

drop trigger if exists trg_validate_q_crash_comment on public.q_crash_comments;
create trigger trg_validate_q_crash_comment
before insert or update on public.q_crash_comments
for each row
execute function public.validate_q_crash_comment();

comment on table public.q_crash_comments is
'One optional 120-character comment per signed-in Q Crash voter. Public reveal waits until settlement.';

comment on column public.q_crash_comments.moderation_status is
'Visible comments are returned after Q Crash settlement; hidden comments remain stored for moderation.';
