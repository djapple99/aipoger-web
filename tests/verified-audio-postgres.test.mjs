import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),modulePath=process.env.AIPOGER_CREDIT_PGLITE_MODULE;
const migration=fs.readFileSync(new URL('../supabase/migrations/20261025063109_verified_mp3_submissions.sql',import.meta.url),'utf8');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('verified MP3 schema guards ownership, old media, direct writes, immutable assets and safe draft cleanup',{skip:!modulePath},async()=>{
 const {PGlite}=require(modulePath),db=new PGlite();
 try {
  await db.exec(`create schema auth;create schema storage;
   create role anon;create role authenticated;create role service_role bypassrls;
   create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
   create table auth.users(id uuid primary key);
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
   create function storage.extension(text) returns text language sql as $$select reverse(split_part(reverse($1),'.',1))$$;
   alter table storage.objects enable row level security;
   create policy fixture_read on storage.objects for select using(true);
   create policy fixture_insert on storage.objects for insert with check(true);
   create policy fixture_update on storage.objects for update using(true) with check(true);
   create table listen_bar_tracks(id uuid primary key,created_by uuid,audio_path text,audio_sha256 text,duration_seconds integer,title text);
   create table battle_queue(id uuid primary key,user_id uuid,submission_mode text,source_type text,source_url text,audio_path text,rights_confirmed_at timestamptz,duration_seconds numeric,link_playback jsonb,drop_playback_mode text);
   alter table battle_queue add constraint battle_queue_link_contract check(true);
   create table official_gatekeeper_drops(id text primary key,audio_path text,updated_by uuid,active boolean);
   insert into auth.users values('${uid(1)}'),('${uid(2)}');
   insert into listen_bar_tracks values('${uid(90)}','${uid(1)}','old/100MB.wav','oldhash',240,'Old WAV');
   insert into battle_queue(id,user_id,submission_mode,audio_path) values('${uid(91)}','${uid(1)}','legacy','old/large.aiff');
   insert into official_gatekeeper_drops values('oldgate','official/old.wav','${uid(1)}',true);
   insert into storage.buckets values('listen-bar-audio','listen-bar-audio',true,104857600,array['audio/wav']),('battle-audio','battle-audio',false,209715200,array['audio/wav']);
   insert into storage.objects(bucket_id,name,metadata) values('listen-bar-audio','old/100MB.wav','{"mimetype":"audio/wav","size":104857600}');
   grant usage on schema storage,auth,public to authenticated,service_role,anon;
   grant all on all tables in schema public to service_role;
   grant select,insert,update on storage.objects to authenticated;
  `);
  const old=(await db.query('select audio_path,audio_sha256,duration_seconds from listen_bar_tracks')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('select audio_path,audio_sha256,duration_seconds from listen_bar_tracks')).rows,old);
  await db.exec(`update listen_bar_tracks set title='Edited metadata' where id='${uid(90)}';
   insert into official_gatekeeper_drops(id,audio_path,updated_by,active) values('oldgate','official/old.wav','${uid(1)}',true) on conflict(id) do update set active=excluded.active;
   insert into verified_audio_assets(id,user_id,sha256,expected_size,storage_path,status,duration_seconds,max_kbps,verified_at) values
    ('${uid(10)}','${uid(1)}',repeat('a',64),1000,'one.mp3','verified',90,320,now()),
    ('${uid(11)}','${uid(1)}',repeat('b',64),1000,'two.mp3','pending',null,null,null),
    ('${uid(12)}','${uid(1)}',repeat('c',64),1000,'unused.mp3','verified',45,128,now());`);
  await assert.rejects(db.exec(`insert into listen_bar_tracks(id,created_by,audio_path) values('${uid(20)}','${uid(1)}','new.wav')`),/VERIFIED_MP3_REQUIRED/);
  await assert.rejects(db.exec(`insert into listen_bar_tracks(id,created_by,audio_path) values('${uid(20)}','${uid(2)}','https://aipoger.com/api/audio-assets/${uid(10)}')`),/VERIFIED_MP3_REQUIRED/);
  await assert.rejects(db.exec(`insert into listen_bar_tracks(id,created_by,audio_path) values('${uid(20)}','${uid(1)}','https://aipoger.com/api/audio-assets/${uid(11)}')`),/VERIFIED_MP3_REQUIRED/);
  await db.exec(`insert into listen_bar_tracks(id,created_by,audio_path) values('${uid(20)}','${uid(1)}','https://aipoger.com/api/audio-assets/${uid(10)}');`);
  assert.equal((await db.query(`select verified_audio_id from listen_bar_tracks where id='${uid(20)}'`)).rows[0].verified_audio_id,uid(10));
  await assert.rejects(db.exec(`update listen_bar_tracks set verified_audio_id=null where id='${uid(20)}'`),/locked/);
  await assert.rejects(db.exec(`delete from verified_audio_assets where id='${uid(10)}'`),/foreign key/);
  await assert.rejects(db.exec(`insert into battle_queue(id,user_id,submission_mode,source_type,source_url,link_playback,duration_seconds,rights_confirmed_at,drop_playback_mode) values('${uid(21)}','${uid(2)}','drop','upload','https://aipoger.com/api/audio-assets/${uid(10)}','{"type":"upload","url":"https://aipoger.com/api/audio-assets/${uid(10)}","start":0,"seconds":60}',90,now(),'60')`),/VERIFIED_MP3_REQUIRED/);
  await db.exec(`insert into battle_queue(id,user_id,submission_mode,source_type,source_url,link_playback,duration_seconds,rights_confirmed_at,drop_playback_mode) values('${uid(21)}','${uid(1)}','drop','upload','https://aipoger.com/api/audio-assets/${uid(10)}','{"type":"upload","url":"https://aipoger.com/api/audio-assets/${uid(10)}","start":0,"seconds":60}',90,now(),'60');`);
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.role','authenticated',false);`);
  await assert.rejects(db.query('select * from verified_audio_assets'),/permission denied/);
  for(const bucket of ['listen-bar-audio','battle-audio','pending-audio','verified-audio'])await assert.rejects(db.query(`insert into storage.objects(bucket_id,name,metadata) values($1,'new.mp3','{"mimetype":"audio/mpeg"}')`,[bucket]),/row-level security/);
  await db.exec(`insert into storage.objects(bucket_id,name,metadata) values('battle-audio','own/covers/new.jpg','{"mimetype":"image/jpeg"}');`);
  assert.equal((await db.query(`select count(*)::int n from storage.objects where name='old/100MB.wav'`)).rows[0].n,1);
  await db.exec(`reset role;update verified_audio_assets set updated_at=now()-interval '2 days';set role service_role;select set_config('request.jwt.claim.role','service_role',false);`);
  assert.equal((await db.query(`select * from claim_audio_asset_cleanup('${uid(10)}','${uid(1)}')`)).rows.length,0);
  assert.equal((await db.query(`select * from claim_audio_asset_cleanup('${uid(12)}','${uid(2)}')`)).rows.length,0);
  const cleanup=(await db.query('select * from claim_unused_audio_assets()')).rows.map(r=>r.id);assert.deepEqual(cleanup.sort(),[uid(11),uid(12)].sort());
  await db.exec(`reset role`);
  await assert.rejects(db.exec(`insert into listen_bar_tracks(id,created_by,audio_path) values('${uid(22)}','${uid(1)}','https://aipoger.com/api/audio-assets/${uid(12)}')`),/VERIFIED_MP3_REQUIRED/);
  assert.equal((await db.query(`select audio_path from battle_queue where id='${uid(91)}'`)).rows[0].audio_path,'old/large.aiff');
 } finally {await db.close();}
});
