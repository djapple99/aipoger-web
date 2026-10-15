-- Auth rows are not directly readable by service_role in production.
-- Expose only the existing Owner membership predicate, never auth data.
alter function public.work_review_owner(uuid) security definer;
alter function public.work_review_owner(uuid) set search_path='';
revoke all on function public.work_review_owner(uuid) from public,anon,authenticated;
grant execute on function public.work_review_owner(uuid) to service_role;
notify pgrst,'reload schema';
