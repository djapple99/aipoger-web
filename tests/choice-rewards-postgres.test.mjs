import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.AIPOGER_CREDIT_PGLITE_MODULE;
const u=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('Choice PostgreSQL rewards, weekly limits, retries, popularity and reviewer board', {skip:!modulePath&&'Set PGlite module'}, async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(await readFile('tests/sql/credit-participation-fixture.sql','utf8'));
 await db.exec(`alter table listen_bar_tracks add column title text,add column audio_path text,add column external_url text,add column created_at timestamptz default now(),add column cover_path text,add column youtube_url text;
 alter table listen_bar_track_comments add column display_name text;
 create table fighter_profiles(id uuid primary key,display_name text);create table user_profiles(id uuid primary key,fighter_name text,display_name text);
 insert into fighter_profiles values('${u(1)}','Curator'),('${u(2)}','Reviewer'),('${u(3)}','Reader');
 create table blind_listen_questions(id uuid,user_id uuid,state text,choice text,heard_a int,heard_b int,completed_at timestamptz);
 create table creator_credit_reply_awards(id uuid,user_id uuid,delta int,reason text,source_id uuid,created_at timestamptz);
 create table bible_expression_copy_receipts(id uuid,user_id uuid,delta int,reason text,source_id uuid,created_at timestamptz);`);
 for (const path of ['supabase/credit_participation.sql','supabase/migrations/20260712072918_choice_weekly_curation.sql','supabase/migrations/20260713090833_creator_choice_collections.sql','supabase/migrations/20260716094500_choice_collection_comments.sql','supabase/migrations/20260715083000_choice_collection_hearts.sql'])await db.exec(await readFile(path,'utf8'));
 await db.exec(`alter table aipoger_creator_choice_collections add column cover_path text;
 alter table aipoger_choice_collection_comments add column moderation_status text default 'visible';
 insert into aipoger_creator_choice_collections(id,creator_id,curator_name,week_start,title,intro,is_published) values('${u(100)}','${u(4)}','Legacy',date_trunc('week',now() at time zone 'Asia/Taipei')::date,'Legacy','Existing',true);
 insert into aipoger_choice_collection_hearts(collection_kind,collection_id,user_id,created_at) values('creator','${u(100)}','${u(2)}',now()-interval '31 days');`);
 await db.exec(await readFile('supabase/migrations/20260921150000_creator_choice_batch_editor.sql','utf8'));
 const before=(await db.query('select * from creator_credit_history order by id')).rows;
 await db.exec(await readFile('supabase/migrations/20261028230113_choice_rewards_popularity.sql','utf8'));
 assert.deepEqual((await db.query('select * from creator_credit_history order by id')).rows,before);
 const week=(await db.query("select date_trunc('week',now() at time zone 'Asia/Taipei')::date::text w")).rows[0].w;
 const refs=Array.from({length:5},(_,i)=>({sourceKind:'listen_bar_track',sourceId:u(200+i)}));
 const save=async({id=null,owner=u(1),publish=true,title='週末選曲',intro='全部自己的作品也可以',items=refs,expected=null,w=week}={})=>(await db.query('select save_creator_choice_editor($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,false) id',[owner,id,w,'Curator',title,intro,JSON.stringify(items),JSON.stringify(expected),publish])).rows[0].id;
 const post=async(id,{who=u(2),request=u(300),body='這份歌單的開場節奏很舒服中段轉場自然最後一首收得很有餘韻',kind='creator'}={})=>(await db.query('select post_choice_comment($1,$2,$3,$4,$5,null,$6) result',[who,request,kind,id,'Reviewer',body])).rows[0].result;
 const awards=async()=> (await db.query('select reason,delta from choice_credit_awards order by created_at')).rows;
 const transaction=async(fn)=>{await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}};
 await t.test('first publication +50 atomically; edit, withdraw and republish do not repeat; legacy has no backfill',()=>transaction(async()=>{
  const id=await save();assert.deepEqual(await awards(),[{reason:'choice_publish',delta:50}]);
  await db.query('update aipoger_creator_choice_collections set is_published=false where id=$1',[id]);
  await db.query('update aipoger_creator_choice_collections set is_published=true,title=\'Updated\' where id=$1',[id]);
  await db.query('update aipoger_creator_choice_collections set is_published=false where id=$1',[u(100)]);await db.query('update aipoger_creator_choice_collections set is_published=true where id=$1',[u(100)]);
  assert.equal((await awards()).length,1);
  assert.equal((await db.query('select creator_credit_summary($1) s',[u(1)])).rows[0].s.balance,53);
 }));
 await t.test('invalid title/count/week rolls back; deletion cannot reset weekly publication allowance',()=>transaction(async()=>{
  // Savepoints isolate expected PostgreSQL errors inside this test transaction.
  const rejected=async(fn,pattern)=>{await db.exec('savepoint expected');await assert.rejects(fn(),pattern);await db.exec('rollback to expected');};
  await rejected(()=>save({title:''}),/標題/);await rejected(()=>save({intro:''}),/推薦/);
  await rejected(()=>save({items:refs.slice(0,4)}),/至少保留/);
  await rejected(()=>save({w:'2026-01-05'}),/本週/);
  assert.equal((await awards()).length,0);
  const id=await save();await db.query('delete from aipoger_creator_choice_collections where id=$1',[id]);
  await rejected(()=>save(),/這週已發布/);assert.equal((await awards()).length,1);
 }));
 await t.test('comments +10 once, retries create one row, self/short/spam/copy cannot earn; deleting does not repay',()=>transaction(async()=>{
  const id=await save();const r=await post(id);assert.equal(r.awarded,10);assert.equal(r.replayed,false);
  const again=await post(id);assert.equal(again.replayed,true);assert.equal(again.awarded,0);
  assert.equal((await db.query('select count(*) n from aipoger_choice_collection_comments')).rows[0].n,1);
  assert.equal((await post(id,{request:u(301),who:u(1)})).awarded,0);
  assert.equal((await post(id,{request:u(302),who:u(3),body:'好聽'})).awarded,0);
  assert.equal((await post(id,{request:u(303),who:u(3),body:'棒'.repeat(25)})).awarded,0);
  assert.equal((await post(id,{request:u(304),who:u(3)})).awarded,0);
  await db.query('delete from aipoger_choice_collection_comments where id=$1',[u(300)]);
  assert.equal((await post(id,{request:u(305),body:'這次的選曲有很明確的主題氣氛一路漸進我很喜歡後半段的安排'})).awarded,0);
  assert.equal((await awards()).filter(a=>a.reason==='choice_review').length,1);
 }));
 await t.test('new qualified playlist review enters Top5, hides when moderated; counts contain no private IDs',()=>transaction(async()=>{
  const id=await save();await post(id);
  const summary=(await db.query('select showtime_community_summary() s')).rows[0].s;
  assert.deepEqual(summary.reviewers,[{name:'Reviewer',count:1}]);
  assert.ok(!JSON.stringify(summary.reviewers).includes(u(2)));
  await db.query("update aipoger_choice_collection_comments set moderation_status='hidden' where id=$1",[u(300)]);
  assert.deepEqual((await db.query('select showtime_community_summary() s')).rows[0].s.reviewers,[]);
  assert.equal((await awards()).length,2);
 }));
 await t.test('30-day popularity excludes self; remove/re-save keeps original time and cannot revive stale saves',()=>transaction(async()=>{
  const id=await save();
  for(const who of [u(1),u(2),u(3)])await db.query("insert into aipoger_choice_collection_hearts(collection_kind,collection_id,user_id) values('creator',$1,$2)",[id,who]);
  const count=async()=> (await db.query('select choice_popularity_counts($1::text[]) c',[[`creator:${id}`,`creator:${u(100)}`]])).rows[0].c;
  assert.equal((await count())[`creator:${id}`],2);assert.equal((await count())[`creator:${u(100)}`],0);
  await db.query('delete from aipoger_choice_collection_hearts where collection_id=$1 and user_id=$2',[u(100),u(2)]);
  await db.query("insert into aipoger_choice_collection_hearts(collection_kind,collection_id,user_id) values('creator',$1,$2)",[u(100),u(2)]);
  assert.equal((await count())[`creator:${u(100)}`],0);
  await db.query('delete from aipoger_choice_collection_hearts where collection_id=$1 and user_id=$2',[id,u(2)]);
  assert.equal((await count())[`creator:${id}`],1);
 }));
 await t.test('anonymous/client grants cannot issue rewards or call service RPC; server reads unified history',async()=>{
  for(const role of ['anon','authenticated']){
   assert.equal((await db.query("select has_table_privilege($1,'public.choice_credit_awards','insert') ok",[role])).rows[0].ok,false);
   assert.equal((await db.query("select has_function_privilege($1,'public.post_choice_comment(uuid,uuid,text,uuid,text,text,text)','execute') ok",[role])).rows[0].ok,false);
  }
  await db.exec('grant select on all tables in schema public to service_role; set role service_role');
  await db.query('select creator_credit_summary($1)',[u(1)]);await db.exec('reset role');
 });
});
