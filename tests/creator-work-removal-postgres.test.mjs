import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {loadTs,mocksFor,request,USER,uuid} from './helpers/choice-runtime.mjs';
const modulePath=process.env.AIPOGER_REMOVE_PGLITE_MODULE;
test('PostgreSQL: permanent deletion is owned, atomic, cascading, retryable and preserves independent ledgers',{
 skip:!modulePath&&'Set AIPOGER_REMOVE_PGLITE_MODULE to an existing PGlite module',
},async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default false);
 create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
 create table listen_bar_tracks(id uuid primary key,title text,created_by uuid,source text,is_active boolean,review_status text,audio_path text,cover_path text,ai_music_defender_drop_audio_path text);
 create table listen_bar_track_comments(id uuid primary key,track_id uuid references listen_bar_tracks on delete cascade,body text);
 create table work_comment_replies(id uuid primary key,track_id uuid references listen_bar_tracks on delete cascade,comment_id uuid references listen_bar_track_comments on delete cascade);
 create table mv_work_ratings(track_id uuid references listen_bar_tracks on delete cascade,score numeric);
 create table listen_bar_track_reactions(track_id uuid references listen_bar_tracks on delete cascade);
 create table mv_review_receipts(track_id uuid references listen_bar_tracks on delete cascade);
 create table blind_listen_questions(track_a_id uuid references listen_bar_tracks on delete cascade);
 create table aipoger_creator_choice_items(source_kind text,source_id uuid);
 create table aipoger_choice_items(source_kind text,source_id uuid);
 create table aipoger_creator_choice_collections(cover_path text);create table aipoger_choice_collections(cover_path text);
 create table battle_queue(audio_path text,full_audio_path text,cover_url text);
 create table official_gatekeeper_drops(audio_path text,cover_path text);
 create table battle_result_archives(result_payload jsonb);
 create table credit_and_quota_ledger(source_id uuid,delta integer);
 grant usage on schema auth to service_role;grant select on auth.users to service_role;
 grant all on all tables in schema public to service_role;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261025162815_creator_work_permanent_delete.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users(id) values ($1),($2)',[USER,uuid(8)]);
 for(const [n,active] of [[2,true],[3,false],[4,true]]){
  const id=uuid(n),owner=n===4?uuid(8):USER;
  await db.query("insert into listen_bar_tracks values($1,'Test',$2,'community',$3,$4,null,$5,null)",[id,owner,active,active?'approved':'removed',`${owner}/community/cover.jpg`]);
  await db.query("insert into listen_bar_track_comments values($1,$2,'comment')",[uuid(n+10),id]);
  await db.query('insert into work_comment_replies values($1,$2,$3)',[uuid(n+20),id,uuid(n+10)]);
  for(const table of ['listen_bar_track_reactions','mv_review_receipts'])await db.query(`insert into ${table} values($1)`,[id]);
  await db.query('insert into mv_work_ratings values($1,8.7)',[id]);
  for(const table of ['aipoger_creator_choice_items','aipoger_choice_items'])await db.query(`insert into ${table} values('listen_bar_track',$1)`,[id]);
  await db.query('insert into credit_and_quota_ledger values($1,10)',[id]);
 }
 const ledger=(await db.query('select * from credit_and_quota_ledger order by source_id')).rows;
 await db.exec(`set role anon;set request.jwt.claim.role='anon';`);
 await assert.rejects(db.query('select delete_creator_work($1,$2)',[uuid(2),USER]),/permission denied/);
 await db.exec(`reset role;set role service_role;set request.jwt.claim.role='service_role';`);
 await assert.rejects(db.query('select delete_creator_work($1,$2)',[uuid(4),USER]),/Only your own work/);
 const admin={auth:{getUser:async()=>({data:{user:{id:USER,is_anonymous:false}},error:null})},rpc:async(name,args)=>{
  assert.equal(name,'delete_creator_work');try{return {data:(await db.query('select delete_creator_work($1,$2) as result',[args.p_track,args.p_actor])).rows[0].result,error:null}}
  catch(e){return {data:null,error:{code:e.code,message:e.message}}}
 }};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://unit-test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-key';
 const post=loadTs('src/app/api/listen-bar/remove-track/route.ts',{
 ...mocksFor(admin),'@/lib/server-creator-work-cleanup':{flushDeletedWorkFiles:async()=>({pending:0})},
 }).POST;
 for(const n of [2,3]){
  const r=await post(request({permanent:true,trackId:uuid(n),userId:uuid(8)}));assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
  assert.equal((await db.query('select * from listen_bar_tracks where id=$1',[uuid(n)])).rows.length,0);
  for(const table of ['listen_bar_track_comments','work_comment_replies','listen_bar_track_reactions','mv_review_receipts','mv_work_ratings'])assert.equal((await db.query(`select * from ${table} where track_id=$1`,[uuid(n)])).rows.length,0);
  for(const table of ['aipoger_creator_choice_items','aipoger_choice_items'])assert.equal((await db.query(`select * from ${table} where source_id=$1`,[uuid(n)])).rows.length,0);
  assert.equal((await (await post(request({permanent:true,trackId:uuid(n)}))).json()).alreadyDeleted,true);
 }
 assert.deepEqual((await db.query('select * from credit_and_quota_ledger order by source_id')).rows,ledger);
 assert.equal((await db.query('select * from listen_bar_tracks where id=$1',[uuid(4)])).rows.length,1);
 assert.equal((await db.query('select * from creator_work_file_cleanup')).rows.length,2);
 // A database error rolls back the deletion and its queued file cleanup together.
 await db.exec(`reset role;create function fail_test_delete() returns trigger language plpgsql as $$begin raise exception 'test failure';end$$;
 create trigger fail_test_delete before delete on listen_bar_tracks for each row execute function fail_test_delete();
 set role service_role;`);
 await assert.rejects(db.query('select delete_creator_work($1,$2)',[uuid(4),uuid(8)]),/test failure/);
 assert.equal((await db.query('select * from listen_bar_tracks where id=$1',[uuid(4)])).rows.length,1);
 assert.equal((await db.query('select * from creator_work_file_cleanup')).rows.length,2);
 assert.equal((await db.query('select * from aipoger_choice_items where source_id=$1',[uuid(4)])).rows.length,1);
});
