-- These SECURITY DEFINER functions are invoked by database triggers, not by
-- client/API RPC calls. Keep the trigger execution path intact while removing
-- unnecessary direct access for signed-in users.

revoke all on function public.handle_new_user_fighter_profile()
  from public, anon, authenticated;
grant execute on function public.handle_new_user_fighter_profile()
  to service_role;

revoke all on function public.on_user_profile_apc_default()
  from public, anon, authenticated;
grant execute on function public.on_user_profile_apc_default()
  to service_role;

revoke all on function public.listen_bar_block_legacy_completed_removal()
  from public, anon, authenticated;
grant execute on function public.listen_bar_block_legacy_completed_removal()
  to service_role;
