-- Preserve new MP3 sources reused by retained legacy Gatekeeper/full-song paths too.
create or replace function public.claim_unused_audio_assets() returns setof public.verified_audio_assets language plpgsql security invoker set search_path='' as $$
declare asset public.verified_audio_assets%rowtype;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Not authorized'; end if;
 for asset in select * from public.verified_audio_assets x where updated_at<now()-interval '24 hours'
   and not exists(select 1 from public.listen_bar_tracks t where t.verified_audio_id=x.id)
   and not exists(select 1 from public.battle_queue q where (q.verified_audio_id=x.id or q.audio_path='https://aipoger.com/api/audio-assets/'||x.id::text or to_jsonb(q)->>'full_audio_path'='https://aipoger.com/api/audio-assets/'||x.id::text))
   and not exists(select 1 from public.official_gatekeeper_drops g where g.verified_audio_id=x.id)
   order by updated_at limit 100 for update skip locked loop
  if not exists(select 1 from public.listen_bar_tracks t where t.verified_audio_id=asset.id)
    and not exists(select 1 from public.battle_queue q where (q.verified_audio_id=asset.id or q.audio_path='https://aipoger.com/api/audio-assets/'||asset.id::text or to_jsonb(q)->>'full_audio_path'='https://aipoger.com/api/audio-assets/'||asset.id::text))
    and not exists(select 1 from public.official_gatekeeper_drops g where g.verified_audio_id=asset.id) then
    update public.verified_audio_assets set status='cleanup' where id=asset.id returning * into asset;
    return next asset;
  end if;
 end loop;
end; $$;
revoke all on function public.claim_unused_audio_assets() from public,anon,authenticated;
grant execute on function public.claim_unused_audio_assets() to service_role;

create or replace function public.claim_audio_asset_cleanup(p_id uuid,p_actor uuid) returns setof public.verified_audio_assets language plpgsql security invoker set search_path='' as $$
declare asset public.verified_audio_assets%rowtype;
begin
 if coalesce(auth.role(),'')<>'service_role' or p_actor is null then raise exception 'Not authorized'; end if;
 select * into asset from public.verified_audio_assets where id=p_id and user_id=p_actor for update;
 if not found then return; end if;
 if exists(select 1 from public.listen_bar_tracks where verified_audio_id=p_id)
   or exists(select 1 from public.battle_queue q where q.verified_audio_id=p_id or q.audio_path='https://aipoger.com/api/audio-assets/'||p_id::text or to_jsonb(q)->>'full_audio_path'='https://aipoger.com/api/audio-assets/'||p_id::text)
   or exists(select 1 from public.official_gatekeeper_drops where verified_audio_id=p_id) then return; end if;
 return query update public.verified_audio_assets set status='cleanup' where id=p_id returning *;
end; $$;
revoke all on function public.claim_audio_asset_cleanup(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_audio_asset_cleanup(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
