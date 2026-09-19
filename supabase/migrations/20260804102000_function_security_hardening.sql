-- AIPOGER function security hardening.
--
-- 1) Pin search_path on simple public helper functions so callers cannot
--    influence object resolution through a mutable session search_path.
-- 2) Keep internal mutation/maintenance RPCs callable only by service_role.
--    Battle-facing RPCs remain unchanged until their caller checks are audited.

alter function public.battle_stake_for_level(integer)
  set search_path = public;

alter function public.calculate_user_level(integer)
  set search_path = public;

alter function public.drop_battle_official_audience_min()
  set search_path = public;

alter function public.format_battle_code(bigint)
  set search_path = public;

alter function public.get_level_info(integer)
  set search_path = public;

alter function public.prediction_reward_for_stake(integer)
  set search_path = public;

alter function public.prediction_xp_for_stake(integer, boolean)
  set search_path = public;

alter function public.set_updated_at()
  set search_path = public;

alter function public.viewer_badge_for_xp(integer)
  set search_path = public;

revoke all on function public.aipoger_migrate_music_genre_labels()
  from public, anon, authenticated;
grant execute on function public.aipoger_migrate_music_genre_labels()
  to service_role;

revoke all on function public.award_battle_points(
  uuid, integer, text, uuid, uuid, text
)
  from public, anon, authenticated;
grant execute on function public.award_battle_points(
  uuid, integer, text, uuid, uuid, text
)
  to service_role;

revoke all on function public.award_public_voting_points(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.award_public_voting_points(uuid, integer)
  to service_role;

revoke all on function public.create_battle_notification(
  uuid, uuid, uuid, text, text, text, jsonb
)
  from public, anon, authenticated;
grant execute on function public.create_battle_notification(
  uuid, uuid, uuid, text, text, text, jsonb
)
  to service_role;

revoke all on function public.process_battle_pool_fallbacks()
  from public, anon, authenticated;
grant execute on function public.process_battle_pool_fallbacks()
  to service_role;
