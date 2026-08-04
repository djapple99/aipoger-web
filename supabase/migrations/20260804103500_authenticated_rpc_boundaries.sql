-- AIPOGER authenticated RPC boundaries.
--
-- These functions are used by signed-in flows or database triggers. Remove
-- anonymous EXECUTE while retaining authenticated and service-role access.
-- Battle start/settlement RPCs remain unchanged until their public-page
-- callers are moved behind a server-side boundary.

revoke all on function public.attempt_matchmaking(uuid, uuid)
  from public, anon;
grant execute on function public.attempt_matchmaking(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.attempt_matchmaking(uuid)
  from public, anon;
grant execute on function public.attempt_matchmaking(uuid)
  to authenticated, service_role;

revoke all on function public.award_daily_login_points()
  from public, anon;
grant execute on function public.award_daily_login_points()
  to authenticated, service_role;

revoke all on function public.award_signup_bonus(uuid)
  from public, anon;
grant execute on function public.award_signup_bonus(uuid)
  to authenticated, service_role;

revoke all on function public.cancel_battle_entry(uuid)
  from public, anon;
grant execute on function public.cancel_battle_entry(uuid)
  to authenticated, service_role;

revoke all on function public.cast_vote(uuid, text)
  from public, anon;
grant execute on function public.cast_vote(uuid, text)
  to authenticated, service_role;

revoke all on function public.create_test_arena_battle(
  text, text, text, text, text, text, text
)
  from public, anon;
grant execute on function public.create_test_arena_battle(
  text, text, text, text, text, text, text
)
  to authenticated, service_role;

revoke all on function public.deduct_challenge_fee(uuid, integer)
  from public, anon;
grant execute on function public.deduct_challenge_fee(uuid, integer)
  to authenticated, service_role;

revoke all on function public.handle_new_user_fighter_profile()
  from public, anon;
grant execute on function public.handle_new_user_fighter_profile()
  to authenticated, service_role;

revoke all on function public.is_aipoger_owner(uuid)
  from public, anon;
grant execute on function public.is_aipoger_owner(uuid)
  to authenticated, service_role;

revoke all on function public.listen_bar_block_legacy_completed_removal()
  from public, anon;
grant execute on function public.listen_bar_block_legacy_completed_removal()
  to authenticated, service_role;

revoke all on function public.move_entry_to_waiting_challenge(uuid)
  from public, anon;
grant execute on function public.move_entry_to_waiting_challenge(uuid)
  to authenticated, service_role;

revoke all on function public.on_user_profile_apc_default()
  from public, anon;
grant execute on function public.on_user_profile_apc_default()
  to authenticated, service_role;

revoke all on function public.place_public_voting_bet(uuid, text)
  from public, anon;
grant execute on function public.place_public_voting_bet(uuid, text)
  to authenticated, service_role;

revoke all on function public.support_battle_prediction(uuid, text, integer)
  from public, anon;
grant execute on function public.support_battle_prediction(uuid, text, integer)
  to authenticated, service_role;
