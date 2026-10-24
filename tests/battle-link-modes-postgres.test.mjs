import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const modulePath = process.env.AIPOGER_CREDIT_PGLITE_MODULE;
const migration = fs.readFileSync(new URL('../supabase/migrations/20261024202323_battle_link_modes.sql', import.meta.url),'utf8');
const schema = fs.readFileSync(new URL('./fixtures/battle-link-schema.sql', import.meta.url),'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('battle link SQL: immutable modes, matching, retries, old media, roles and independent full lengths', { skip: !modulePath }, async () => {
  const { PGlite } = require(modulePath); const db = new PGlite();
  try {
    await db.exec(`create schema auth;
      create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table auth.users(id uuid primary key);
      create role service_role; create role authenticated; create role anon;
      create table public.listen_bar_tracks(id uuid primary key);
      create table public.user_profiles(id uuid primary key,level integer default 1);
      create table public.q_crash_cards(id uuid primary key,founder_user_id uuid,founder_queue_id uuid,status text,invited_user_id uuid,invite_expires_at timestamptz);
      ${schema}
      create table public.test_notices(id uuid default gen_random_uuid(),recipient uuid);
      create function public.create_battle_notification(uuid,uuid,uuid,text,text,text,jsonb) returns void language sql as $$insert into test_notices(recipient) values ($1)$$;
      alter table battle_queue add constraint battle_queue_source_type_check check(source_type in ('suno','upload'));
      alter table battle_queue add constraint battle_queue_drop_duration_seconds_check check(drop_duration_seconds is null or drop_duration_seconds<=60);
      insert into battle_queue(id,user_id,fighter_name,genre,original_file_name,audio_path,drop_duration_seconds)
        values('${uid(90)}','${uid(90)}','old','rock','old.wav','keep/old.wav',30);
      grant usage on schema public,auth to service_role,authenticated,anon;
      grant execute on all functions in schema auth to service_role,authenticated,anon;
      grant all on all tables in schema public to service_role;
      grant usage,select on all sequences in schema public to service_role;`);
    await db.exec(migration);
    await db.exec(`grant all on all tables in schema public to service_role; set role service_role; select set_config('request.jwt.claim.role','service_role',false);`);
    const create = async (actor,id,mode='60',targetId=null,duration=180,start=10,battleMode='drop',joinCardId=null) => {
      const entry = { mode:battleMode,dropMode:battleMode==='drop'?mode:null,targetId,joinCardId,title:`work ${id}`,creator:`artist ${actor}`,genre:'rock',sourceType:'youtube',sourceUrl:'https://www.youtube.com/watch?v=5n-CNfo63Ng',duration,playback:{type:'youtube',url:'https://www.youtube.com/watch?v=5n-CNfo63Ng',start:mode==='full'||battleMode==='q_crash'?0:start,seconds:mode==='full'||battleMode==='q_crash'?duration:mode==='legacy45'?45:Number(mode)}};
      return db.query('select create_battle_link_entry($1,$2,$3) as id',[uid(actor),uid(id),JSON.stringify(entry)]);
    };
    await create(1,1); await create(1,1); // same ID never inserts twice
    assert.equal((await db.query(`select count(*)::int n from battle_queue where user_id='${uid(1)}'`)).rows[0].n,1);
    await assert.rejects(create(1,2),/ACTIVE_BATTLE_ROLE/);
    await create(2,2,'60',uid(1));
    await create(3,3,'90'); await create(4,4,'full',null,260);
    await assert.rejects(create(5,5,'90',uid(1)),/TARGET_MODE_MISMATCH/);
    await assert.rejects(db.query(`update battle_queue set drop_playback_mode='90' where id='${uid(1)}'`),/locked/);
    await assert.rejects(db.query(`update battle_queue set source_url='https://changed.example/' where id='${uid(1)}'`),/locked/);
    await db.exec(`reset role; insert into user_profiles(id) values('${uid(1)}'),('${uid(2)}'); set role authenticated; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${uid(2)}',false);`);
    await db.query('select attempt_matchmaking($1,$2)',[uid(2),uid(1)]);
    await db.exec(`reset role;`);
    const first = (await db.query(`select * from battles where queue_a_id='${uid(2)}'`)).rows[0];
    assert.equal(first.drop_playback_mode,'60'); assert.equal(first.playback_a.seconds,60); assert.equal(first.playback_b.seconds,60);
    assert.equal(first.playback_a.start,10);
    assert.equal((await db.query(`select count(*)::int n from test_notices`)).rows[0].n,2);
    await assert.rejects(db.query(`update battles set playback_a='{}' where id=$1`,[first.id]),/locked/);
    await db.exec(`set role service_role; select set_config('request.jwt.claim.role','service_role',false);`);
    await create(6,6,'full',uid(4),370);
    await db.exec(`reset role; insert into user_profiles(id) values('${uid(4)}'),('${uid(6)}'); set role authenticated; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${uid(6)}',false);`);
    await db.query('select attempt_matchmaking($1,$2)',[uid(6),uid(4)]);
    await db.exec('reset role');
    const full = (await db.query(`select * from battles where queue_a_id='${uid(6)}'`)).rows[0];
    assert.equal(full.playback_a.seconds,370); assert.equal(full.playback_b.seconds,260);
    assert.deepEqual((await db.query(`select audio_path,drop_duration_seconds from battle_queue where id='${uid(90)}'`)).rows[0],{audio_path:'keep/old.wav',drop_duration_seconds:'30'});
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.role','authenticated',false);`);
    await assert.rejects(create(7,7),/permission denied/);
    await assert.rejects(db.exec(`insert into battle_queue(user_id,fighter_name,genre,original_file_name,audio_path) values('${uid(7)}','x','rock','x','new.wav')`),/permission denied|link submission/);
    await db.exec(`reset role; set role service_role; select set_config('request.jwt.claim.role','service_role',false);`);
    await assert.rejects(db.query('select * from auth.users'),/permission denied/);
    await create(8,8,'full',null,200,0,'q_crash');
    await db.exec(`reset role; insert into q_crash_cards values('${uid(88)}','${uid(8)}','${uid(8)}','q_crash_pending_invite',null,now()+interval '1 hour'); set role service_role; select set_config('request.jwt.claim.role','service_role',false);`);
    await create(8,9,'full',null,220,0,'q_crash',uid(88)); // own second version
    assert.equal((await db.query(`select count(*)::int n from battle_queue where user_id='${uid(8)}'`)).rows[0].n,2);
  } finally { await db.close(); }
});
