-- New uploads only. Existing files, works, scores, queues and archives are not rewritten.
create table public.verified_audio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  expected_size bigint not null check(expected_size between 1 and 31457280),
  storage_path text not null unique,
  status text not null default 'pending' check(status in ('pending','validating','verified','cleanup')),
  duration_seconds double precision,
  max_kbps integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  unique(user_id,sha256),
  check(status not in ('validating','verified') or (duration_seconds is not null and max_kbps is not null and duration_seconds>0 and max_kbps between 8 and 320 and verified_at is not null))
);
alter table public.verified_audio_assets enable row level security;
revoke all on public.verified_audio_assets from public,anon,authenticated;
grant all on public.verified_audio_assets to service_role;
create index verified_audio_assets_cleanup_idx on public.verified_audio_assets(updated_at);
alter table public.listen_bar_tracks add column verified_audio_id uuid references public.verified_audio_assets(id) on delete restrict;
alter table public.battle_queue add column verified_audio_id uuid references public.verified_audio_assets(id) on delete restrict;
alter table public.official_gatekeeper_drops add column verified_audio_id uuid references public.verified_audio_assets(id) on delete restrict;
create index official_gatekeeper_verified_audio_idx on public.official_gatekeeper_drops(verified_audio_id) where verified_audio_id is not null;
create index listen_bar_verified_audio_idx on public.listen_bar_tracks(verified_audio_id) where verified_audio_id is not null;
create index battle_queue_verified_audio_idx on public.battle_queue(verified_audio_id) where verified_audio_id is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('pending-audio','pending-audio',false,31457280,array['audio/mpeg','audio/mp3']),
 ('verified-audio','verified-audio',false,31457280,array['audio/mpeg','audio/mp3'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
update storage.buckets set file_size_limit=31457280,allowed_mime_types=array['audio/mpeg','audio/mp3'] where id='listen-bar-audio';
-- Battle covers share this historical bucket; retain images while closing audio writes.
update storage.buckets set file_size_limit=31457280,allowed_mime_types=array['audio/mpeg','audio/mp3','image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'] where id='battle-audio';
create policy verified_audio_insert_guard on storage.objects as restrictive for insert to authenticated
with check(bucket_id not in ('listen-bar-audio','pending-audio','verified-audio') and
 (bucket_id<>'battle-audio' or ((metadata->>'mimetype' is null or metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif')) and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','heic','heif'))));
create policy verified_audio_update_guard on storage.objects as restrictive for update to authenticated
using(bucket_id not in ('listen-bar-audio','pending-audio','verified-audio') and
 (bucket_id<>'battle-audio' or (metadata->>'mimetype' is null or metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'))))
with check(bucket_id not in ('listen-bar-audio','pending-audio','verified-audio') and
 (bucket_id<>'battle-audio' or ((metadata->>'mimetype' is null or metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif')) and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','heic','heif'))));

create function public.guard_verified_track_audio() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid; asset public.verified_audio_assets%rowtype;
begin
  if tg_op='INSERT' and exists(select 1 from public.listen_bar_tracks t where t.id=new.id and t.audio_path is not distinct from new.audio_path and t.created_by is not distinct from new.created_by) then
    select t.verified_audio_id into new.verified_audio_id from public.listen_bar_tracks t where t.id=new.id; return new;
  end if;
  if tg_op='UPDATE' and new.audio_path is not distinct from old.audio_path then
    if new.verified_audio_id is distinct from old.verified_audio_id then raise exception 'Audio source is locked'; end if;
    return new;
  end if;
  new.verified_audio_id:=null;
  if nullif(trim(new.audio_path),'') is null then return new; end if;
  if new.audio_path !~ '^https://aipoger[.]com/api/audio-assets/[0-9a-f-]{36}$' then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
  aid:=substring(new.audio_path from '[0-9a-f-]{36}$')::uuid;
  select * into asset from public.verified_audio_assets where id=aid for share;
  if not found or asset.status<>'verified' or asset.user_id is distinct from new.created_by then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
  new.verified_audio_id:=asset.id;
  new.audio_sha256:=asset.sha256;
  new.duration_seconds:=asset.duration_seconds;
  return new;
end; $$;
revoke all on function public.guard_verified_track_audio() from public,anon,authenticated;
create trigger guard_verified_track_audio before insert or update on public.listen_bar_tracks for each row execute function public.guard_verified_track_audio();

alter table public.battle_queue drop constraint battle_queue_link_contract;
alter table public.battle_queue add constraint battle_queue_link_contract check(submission_mode='legacy' or (
 source_type in ('suno','youtube','work','upload') and source_url is not null and audio_path is null
 and rights_confirmed_at is not null and duration_seconds>0 and link_playback is not null
 and link_playback->>'type' in ('upload','suno','youtube')
 and (link_playback->>'start')::numeric>=0 and (link_playback->>'seconds')::numeric>0
 and (link_playback->>'start')::numeric+(link_playback->>'seconds')::numeric<=duration_seconds+0.1
 and ((submission_mode='q_crash' and drop_playback_mode is null) or (submission_mode='drop' and drop_playback_mode in ('60','90','full','legacy45')))
));
create function public.guard_verified_battle_audio() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid; asset public.verified_audio_assets%rowtype; media text;
begin
  if tg_op='UPDATE' then
    if new.verified_audio_id is distinct from old.verified_audio_id then raise exception 'Audio source is locked'; end if;
    return new;
  end if;
  new.verified_audio_id:=null;
  media:=new.link_playback->>'url';
  if media ~ '^https://aipoger[.]com/api/audio-assets/[0-9a-f-]{36}$' then
    aid:=substring(media from '[0-9a-f-]{36}$')::uuid;
    select * into asset from public.verified_audio_assets where id=aid for share;
    if not found or asset.status<>'verified' or asset.user_id is distinct from new.user_id or abs(asset.duration_seconds-new.duration_seconds)>0.001 or new.link_playback->>'type'<>'upload' or (new.source_type='upload' and new.source_url is distinct from media) then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
    new.verified_audio_id:=aid;
  elsif new.submission_mode<>'legacy' and new.source_type='upload' then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
  return new;
end; $$;
revoke all on function public.guard_verified_battle_audio() from public,anon,authenticated;
create trigger guard_verified_battle_audio before insert or update on public.battle_queue for each row execute function public.guard_verified_battle_audio();

create function public.guard_verified_gatekeeper_audio() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid; asset public.verified_audio_assets%rowtype;
begin
 if tg_op='INSERT' and exists(select 1 from public.official_gatekeeper_drops g where g.id=new.id and g.audio_path is not distinct from new.audio_path) then
  select g.verified_audio_id into new.verified_audio_id from public.official_gatekeeper_drops g where g.id=new.id; return new;
 end if;
 if tg_op='UPDATE' and new.audio_path is not distinct from old.audio_path then
  if new.verified_audio_id is distinct from old.verified_audio_id then raise exception 'Audio source is locked'; end if;
  return new;
 end if;
 new.verified_audio_id:=null;
 if nullif(trim(new.audio_path),'') is null then return new; end if;
 if new.audio_path !~ '^https://aipoger[.]com/api/audio-assets/[0-9a-f-]{36}$' then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
 aid:=substring(new.audio_path from '[0-9a-f-]{36}$')::uuid;
 select * into asset from public.verified_audio_assets where id=aid for share;
 if not found or asset.status<>'verified' or asset.user_id is distinct from new.updated_by or asset.duration_seconds>60.1 then raise exception 'VERIFIED_MP3_REQUIRED'; end if;
 new.verified_audio_id:=aid;return new;
end; $$;
revoke all on function public.guard_verified_gatekeeper_audio() from public,anon,authenticated;
create trigger guard_verified_gatekeeper_audio before insert or update on public.official_gatekeeper_drops for each row execute function public.guard_verified_gatekeeper_audio();

create function public.claim_unused_audio_assets() returns setof public.verified_audio_assets language plpgsql security invoker set search_path='' as $$
declare asset public.verified_audio_assets%rowtype;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Not authorized'; end if;
 for asset in select * from public.verified_audio_assets x where updated_at<now()-interval '24 hours'
   and not exists(select 1 from public.listen_bar_tracks t where t.verified_audio_id=x.id)
   and not exists(select 1 from public.battle_queue q where q.verified_audio_id=x.id)
   and not exists(select 1 from public.official_gatekeeper_drops g where g.verified_audio_id=x.id)
   order by updated_at limit 100 for update skip locked loop
  if not exists(select 1 from public.listen_bar_tracks t where t.verified_audio_id=asset.id)
    and not exists(select 1 from public.battle_queue q where q.verified_audio_id=asset.id)
    and not exists(select 1 from public.official_gatekeeper_drops g where g.verified_audio_id=asset.id) then
    update public.verified_audio_assets set status='cleanup' where id=asset.id returning * into asset;
    return next asset;
  end if;
 end loop;
end; $$;
revoke all on function public.claim_unused_audio_assets() from public,anon,authenticated;
grant execute on function public.claim_unused_audio_assets() to service_role;

create function public.claim_audio_asset_cleanup(p_id uuid,p_actor uuid) returns setof public.verified_audio_assets language plpgsql security invoker set search_path='' as $$
declare asset public.verified_audio_assets%rowtype;
begin
 if coalesce(auth.role(),'')<>'service_role' or p_actor is null then raise exception 'Not authorized'; end if;
 select * into asset from public.verified_audio_assets where id=p_id and user_id=p_actor for update;
 if not found then return; end if;
 if exists(select 1 from public.listen_bar_tracks where verified_audio_id=p_id)
   or exists(select 1 from public.battle_queue where verified_audio_id=p_id)
   or exists(select 1 from public.official_gatekeeper_drops where verified_audio_id=p_id) then return; end if;
 return query update public.verified_audio_assets set status='cleanup' where id=p_id returning *;
end; $$;
revoke all on function public.claim_audio_asset_cleanup(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_audio_asset_cleanup(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
