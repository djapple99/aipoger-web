-- AIPOGER battle lifecycle RPC boundaries.
--
-- Battle pages are public, but lifecycle mutations must not be callable by
-- anonymous viewers. Settlement and result archival are server-authoritative:
-- Vercel's maintenance/Q Crash workers read the votes, apply the product
-- threshold and tie-break rules, then call the service-role RPCs below.

create or replace function public.require_battle_fighter(p_battle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  request_role text := current_setting('request.jwt.claim.role', true);
begin
  if request_role = 'service_role' then
    return;
  end if;

  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.battles
    where id = p_battle_id
      and (fighter_a_user_id = actor_id or fighter_b_user_id = actor_id)
  ) then
    raise exception 'Battle participant required';
  end if;
end;
$$;

revoke all on function public.require_battle_fighter(uuid)
  from public, anon, authenticated;
grant execute on function public.require_battle_fighter(uuid)
  to service_role;

-- Preserve the existing implementations as private service functions, then
-- keep the public RPC names as guarded compatibility wrappers for callers.
alter function public.start_90s_battle(uuid)
  rename to start_90s_battle_service_20260804;
alter function public.settle_90s_battle(uuid, text)
  rename to settle_90s_battle_service_20260804;
alter function public.settle_battle(uuid, text)
  rename to settle_battle_service_20260804;
alter function public.archive_battle_result(uuid, text, integer, integer, text, jsonb)
  rename to archive_battle_result_service_20260804;

alter function public.start_90s_battle_service_20260804(uuid)
  set search_path = public;
alter function public.settle_90s_battle_service_20260804(uuid, text)
  set search_path = public;
alter function public.settle_battle_service_20260804(uuid, text)
  set search_path = public;
alter function public.archive_battle_result_service_20260804(uuid, text, integer, integer, text, jsonb)
  set search_path = public;

create function public.start_90s_battle(p_battle_id uuid)
returns public.battles
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_battle_fighter(p_battle_id);
  return public.start_90s_battle_service_20260804(p_battle_id);
end;
$$;

create function public.settle_90s_battle(p_battle_id uuid, p_winner text)
returns public.battles
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.settle_90s_battle_service_20260804(p_battle_id, p_winner);
end;
$$;

create function public.settle_battle(p_battle_id uuid, p_winner text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.settle_battle_service_20260804(p_battle_id, p_winner);
end;
$$;

create function public.archive_battle_result(
  p_battle_id uuid,
  p_winner text,
  p_final_vote_left integer,
  p_final_vote_right integer,
  p_audience_review text,
  p_result_payload jsonb
)
returns public.battle_result_archives
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.archive_battle_result_service_20260804(
    p_battle_id,
    p_winner,
    p_final_vote_left,
    p_final_vote_right,
    p_audience_review,
    p_result_payload
  );
end;
$$;

-- Starting a battle is allowed only for one of its signed-in fighters. The
-- settlement/archive wrappers are intentionally service-role only because
-- their winner and archive payload must be derived server-side from votes.
revoke all on function public.start_90s_battle(uuid)
  from public, anon;
grant execute on function public.start_90s_battle(uuid)
  to authenticated, service_role;

revoke all on function public.settle_90s_battle(uuid, text)
  from public, anon, authenticated;
grant execute on function public.settle_90s_battle(uuid, text)
  to service_role;

revoke all on function public.settle_battle(uuid, text)
  from public, anon, authenticated;
grant execute on function public.settle_battle(uuid, text)
  to service_role;

revoke all on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.archive_battle_result(uuid, text, integer, integer, text, jsonb)
  to service_role;

revoke all on function public.start_90s_battle_service_20260804(uuid)
  from public, anon, authenticated;
grant execute on function public.start_90s_battle_service_20260804(uuid)
  to service_role;

revoke all on function public.settle_90s_battle_service_20260804(uuid, text)
  from public, anon, authenticated;
grant execute on function public.settle_90s_battle_service_20260804(uuid, text)
  to service_role;

revoke all on function public.settle_battle_service_20260804(uuid, text)
  from public, anon, authenticated;
grant execute on function public.settle_battle_service_20260804(uuid, text)
  to service_role;

revoke all on function public.archive_battle_result_service_20260804(
  uuid, text, integer, integer, text, jsonb
)
  from public, anon, authenticated;
grant execute on function public.archive_battle_result_service_20260804(
  uuid, text, integer, integer, text, jsonb
)
  to service_role;
