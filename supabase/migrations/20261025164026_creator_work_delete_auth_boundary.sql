-- Registered identity is verified with Auth getUser in the server route.
-- Do not grant this invoker function access to the private auth.users table.
create or replace function public.delete_creator_work(p_track uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.listen_bar_tracks%rowtype; job uuid;
begin
 if coalesce(auth.role(),'')<>'service_role' or p_actor is null then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 select * into t from public.listen_bar_tracks where id=p_track for update;
 if not found then return jsonb_build_object('ok',true,'alreadyDeleted',true); end if;
 if t.source is distinct from 'community' or t.created_by is distinct from p_actor then
  raise exception 'Only your own work can be deleted' using errcode='42501';
 end if;
 if t.audio_path like p_actor::text||'/%' or t.cover_path like p_actor::text||'/%'
   or t.audio_path like 'https://aipoger.com/api/audio-assets/%' then
  insert into public.creator_work_file_cleanup(actor_id,audio_path,cover_path)
  values(p_actor,t.audio_path,t.cover_path) returning id into job;
 end if;
 delete from public.aipoger_creator_choice_items where source_kind='listen_bar_track' and source_id=p_track;
 delete from public.aipoger_choice_items where source_kind='listen_bar_track' and source_id=p_track;
 -- FKs cascade comments, replies, ratings, reactions and receipts.
 -- Independent Credit/quota ledgers and completed battle archives are unchanged.
 delete from public.listen_bar_tracks where id=p_track and created_by=p_actor and source='community';
 return jsonb_build_object('ok',true,'cleanupJob',job);
end; $$;
revoke all on function public.delete_creator_work(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_creator_work(uuid,uuid) to service_role;
notify pgrst,'reload schema';
