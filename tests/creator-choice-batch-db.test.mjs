import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.MONTHLY_CHART_PGLITE_MODULE;
const dbTest = (name, fn) => test(name, {skip: !modulePath && 'Set MONTHLY_CHART_PGLITE_MODULE'}, fn);
const uid = '00000000-0000-4000-8000-000000000001';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const items = Array.from({length:10},(_,i)=>({sourceKind:'listen_bar_track',sourceId:uuid(10+i)}));
async function fixture(t) {
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${uid}');create table public.listen_bar_tracks(id uuid primary key);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260713090833_creator_choice_collections.sql',import.meta.url),'utf8'));
 await db.exec('alter table public.aipoger_creator_choice_collections add column cover_path text;');
 await db.exec(await readFile(new URL('../supabase/migrations/20260921150000_creator_choice_batch_editor.sql',import.meta.url),'utf8'));
 const save=async({id=null,refs=items,expected=null,title='Original',intro='中文 English',publish=null,user=uid}={})=>(await db.query('select public.save_creator_choice_editor($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,false) as id',[user,id,'2026-09-21','Curator',title,intro,JSON.stringify(refs),JSON.stringify(expected),publish])).rows[0].id;
 const snapshot=(refs=items,title='Original',intro='中文 English',isPublished=false)=>({weekStart:'2026-09-21',title,intro,isPublished,items:refs});
 return {db,save,snapshot};
}
dbTest('batch save commits ten tracks once, reorders all positions and preserves retained IDs',async t=>{
 const {db,save,snapshot}=await fixture(t);const id=await save();
 const before=(await db.query('select * from aipoger_creator_choice_items order by position')).rows;
 const refs=[items[9],...items.slice(0,9)];await save({id,refs,expected:snapshot(),title:'新標題',publish:true});
 const after=(await db.query('select * from aipoger_creator_choice_items order by position')).rows;
 assert.deepEqual(after.map(x=>x.source_id),refs.map(x=>x.sourceId));assert.deepEqual(after.map(x=>x.position),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(after[0].id,before[9].id);assert.equal((await db.query('select title,is_published from aipoger_creator_choice_collections')).rows[0].title,'新標題');
});
dbTest('stale editor, wrong owner and failed validation leave the complete saved playlist unchanged',async t=>{
 const {db,save,snapshot}=await fixture(t);const id=await save();await save({id,expected:snapshot(),title:'First save'});
 await assert.rejects(save({id,expected:snapshot(),title:'Stale',refs:items.slice(0,2)}),/其他視窗/);
 await assert.rejects(save({id,user:uuid(2),expected:snapshot()}),/找不到/);
 await assert.rejects(save({id,expected:snapshot(items,'First save'),refs:items.slice(0,4),publish:true}),/至少保留/);
 await assert.rejects(save({id,expected:snapshot(items,'First save'),refs:[items[0],items[0]]}),/duplicate/);
 await assert.rejects(save({id,expected:snapshot(items,'First save'),title:'x'.repeat(121),refs:items.slice(0,2)}));
 assert.equal((await db.query('select count(*) as n from aipoger_creator_choice_items')).rows[0].n,10);
 assert.equal((await db.query('select title from aipoger_creator_choice_collections')).rows[0].title,'First save');
});
dbTest('published replacement and unpublish save validate the final batch, not intermediate removals',async t=>{
 const {db,save,snapshot}=await fixture(t);const id=await save({refs:items.slice(0,5),publish:true});
 const next=items.slice(5);await save({id,refs:next,expected:snapshot(items.slice(0,5),'Original','中文 English',true)});
 assert.equal((await db.query('select count(*) as n from aipoger_creator_choice_items')).rows[0].n,5);
 await save({id,refs:[],expected:snapshot(next,'Original','中文 English',true),publish:false});
 assert.equal((await db.query('select count(*) as n from aipoger_creator_choice_items')).rows[0].n,0);
});
dbTest('new invalid batches roll back collection creation and only service_role can execute',async t=>{
 const {db,save}=await fixture(t);await assert.rejects(save({refs:items.slice(0,2),publish:true}));
 await assert.rejects(save({refs:[...items,{sourceKind:'listen_bar_track',sourceId:uuid(55)}]}));
 assert.equal((await db.query('select count(*) as n from aipoger_creator_choice_collections')).rows[0].n,0);
 const signature='public.save_creator_choice_editor(uuid,uuid,date,text,text,text,jsonb,jsonb,boolean,boolean)';
 for(const role of ['anon','authenticated','service_role']) assert.equal((await db.query('select has_function_privilege($1,$2,\'execute\') as ok',[role,signature])).rows[0].ok,role==='service_role');
});

dbTest('introduction accepts the full editor limit without silently truncating Chinese or English',async t=>{
 const {save,snapshot}=await fixture(t);const intro='中English'.repeat(375);assert.equal(intro.length,3000);
 const id=await save({intro});await assert.rejects(save({id,intro:intro+'x',expected:snapshot(items,'Original',intro)}));
});
