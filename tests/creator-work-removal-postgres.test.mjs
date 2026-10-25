import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadTs, mocksFor, request, USER, uuid } from './helpers/choice-runtime.mjs';

const modulePath=process.env.AIPOGER_REMOVE_PGLITE_MODULE;

test('PostgreSQL: the actual removal API satisfies the production guard and preserves history',{
 skip:!modulePath&&'Set AIPOGER_REMOVE_PGLITE_MODULE to an existing PGlite module',
},async t=>{
 const { PGlite }=await import(pathToFileURL(modulePath).href);
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create table public.listen_bar_tracks (
  id uuid primary key, title text, created_by uuid, source text,
  bar_phase text default 'public', is_active boolean default true,
  review_status text default 'approved', removed_at timestamptz,
  moderation_note text, updated_at timestamptz, work_kind text,
  external_url text, audio_path text, is_music_video boolean,
  created_at timestamptz default '2026-10-25T00:00:00Z'
 );
 create table public.kept_history (kind text, track_id uuid, details jsonb);`);
 // Use the shipped trigger source, rather than a mock's interpretation of it.
 // Its definition is also checked read-only against production during QA.
 const migration=await readFile(new URL('../supabase/migrations/20260907182740_retire_bar_survival.sql',import.meta.url),'utf8');
 const guard=migration.match(/CREATE OR REPLACE FUNCTION public\.listen_bar_block_legacy_public_capacity_removal\(\)[\s\S]*?AS \$function\$[\s\S]*?\$function\$\s*;/)?.[0];
 assert.ok(guard,'existing production guard must be loaded');
 await db.exec(guard);
 await db.exec(`create trigger trg_listen_bar_block_legacy_public_capacity_removal
  before update of is_active, review_status, removed_at, moderation_note
  on public.listen_bar_tracks for each row
  execute function public.listen_bar_block_legacy_public_capacity_removal();`);
 for(const [index,kind] of ['link','mv','album'].entries()){
  await db.query(`insert into public.listen_bar_tracks
   (id,title,created_by,source,work_kind,external_url,is_music_video)
   values ($1,$2,$3,'community',$4,'https://youtu.be/MdxaU0l3FzI',$5)`,
   [uuid(index+2),`Test ${kind}`,USER,kind==='album'?'album':'single',kind==='mv']);
  for(const historyKind of ['comment','rating','heart','battle','credit','quota']){
   await db.query('insert into public.kept_history values ($1,$2,$3)',[historyKind,uuid(index+2),JSON.stringify({original:true})]);
  }
 }
 const original=(await db.query('select * from public.listen_bar_tracks order by id')).rows;
 const history=(await db.query('select * from public.kept_history order by track_id,kind')).rows;
 // Reproduce the deployed bug: the shortened note is rejected by PostgreSQL.
 await assert.rejects(db.query(`update public.listen_bar_tracks set
  is_active=false,review_status='removed',removed_at=now(),
  moderation_note='Creator removed own work.' where id=$1`,[uuid(2)]),/Automatic Bar Heartbreak capacity removal is retired/);
 assert.deepEqual((await db.query('select * from public.listen_bar_tracks order by id')).rows,original);

 const admin={auth:{getUser:async token=>({data:{user:token==='valid'?{id:USER,is_anonymous:false}:null},error:null})},from(table){
  assert.equal(table,'listen_bar_tracks');
  const filters=[];let payload=null;
  const query={select(){return query},eq(key,value){filters.push([key,value]);return query},update(data){payload=data;return query},async maybeSingle(){
   const values=[];const bind=value=>{values.push(value);return `$${values.length}`};
   const identifier=key=>{assert.match(key,/^[a-z_]+$/);return `"${key}"`};
   const set=payload?Object.entries(payload).map(([key,value])=>`${identifier(key)}=${bind(value)}`).join(','):'';
   const where=filters.map(([key,value])=>`${identifier(key)}=${bind(value)}`).join(' and ');
   const sql=payload?`update public.listen_bar_tracks set ${set} where ${where} returning *`:`select * from public.listen_bar_tracks where ${where}`;
   try{return {data:(await db.query(sql,values)).rows[0]??null,error:null}}
   catch(error){return {data:null,error:{message:error.message,code:error.code}}}
  }};return query;
 }};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://unit-test.invalid';
 process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-key';
 const post=loadTs('src/app/api/listen-bar/remove-track/route.ts',mocksFor(admin)).POST;
 assert.equal((await post(request({trackId:uuid(2)},null))).status,401);
 for(const row of original){
  const result=await post(request({trackId:row.id}));
  assert.equal(result.status,200);assert.equal((await result.json()).ok,true);
  const saved=(await db.query('select * from public.listen_bar_tracks where id=$1',[row.id])).rows[0];
  assert.equal(saved.is_active,false);assert.equal(saved.review_status,'removed');assert.ok(saved.removed_at);
  for(const key of ['id','created_by','source','work_kind','external_url','audio_path','is_music_video','created_at'])assert.deepEqual(saved[key],row[key]);
  const stamp=saved.removed_at;
  const retry=await post(request({trackId:row.id}));assert.equal(retry.status,200);assert.equal((await retry.json()).alreadyRemoved,true);
  assert.deepEqual((await db.query('select removed_at from public.listen_bar_tracks where id=$1',[row.id])).rows[0].removed_at,stamp);
 }
 assert.deepEqual((await db.query('select * from public.kept_history order by track_id,kind')).rows,history);
});
