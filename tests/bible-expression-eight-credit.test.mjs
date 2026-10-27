import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {USER,uuid} from './helpers/choice-runtime.mjs';

const modulePath=process.env.AIPOGER_CREDIT_PGLITE_MODULE;
test('PostgreSQL: eight-point copies preserve legacy five-point receipts, rewards, balances and retry semantics', {skip:!modulePath&&'Set PGlite module'}, async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const path of ['./sql/credit-participation-fixture.sql','../supabase/credit_participation.sql','../supabase/migrations/20261027073526_bible_expression_copy_credit.sql'])
  await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 const KEY='expression-sotto-voce';
 const legacy=async(user,id,key=KEY)=>(await db.query('select public.bible_expression_copy($1,$2,$3,$4,$5) result',[user,id,key,'zh','legacy text'])).rows[0].result;
 await db.exec('set role service_role');
 await db.query('select public.creator_credit_visit($1)',[USER]);
 const old=await legacy(USER,uuid(201));assert.equal(old.charged,5);assert.equal(old.balance,13);
 // A second member reaches exactly eight with legitimate +15, -5, -5, +3 entries.
 const exact=uuid(2);await db.query('select public.creator_credit_visit($1)',[exact]);
 await legacy(exact,uuid(202));await legacy(exact,uuid(203));
 await db.query("insert into public.creator_credit_entries(user_id,delta,reason,source_id) values($1,3,'blind_compare',$2)",[exact,uuid(204)]);
 await db.exec('reset role');
 const history=(await db.query('select * from public.creator_credit_history order by id')).rows;
 const rewards=(await db.query("select proname,md5(prosrc) hash from pg_proc where pronamespace='public'::regnamespace and proname like 'creator_credit_%' order by proname,oid")).rows;
 const migration=await readFile(new URL('../supabase/migrations/20261027194224_bible_expression_copy_eight_credit.sql',import.meta.url),'utf8');
 await db.exec(migration);
 assert.deepEqual((await db.query('select * from public.creator_credit_history order by id')).rows,history);
 assert.deepEqual((await db.query("select proname,md5(prosrc) hash from pg_proc where pronamespace='public'::regnamespace and proname like 'creator_credit_%' order by proname,oid")).rows,rewards);
 // Applying the migration twice must neither rewrite rows nor double-spend.
 await db.exec(migration);
 assert.deepEqual((await db.query('select * from public.creator_credit_history order by id')).rows,history);
 await db.exec('set role service_role');
 const copy=async(user,id,key=KEY,expected=8)=>(await db.query('select public.bible_expression_copy($1,$2,$3,$4,$5,$6) result',[user,id,key,'zh','new text',expected])).rows[0].result;
 assert.deepEqual(await legacy(USER,uuid(201)),{charged:0,balance:13,debt:0,text:'legacy text'});
 assert.equal((await legacy(USER,uuid(205))).error,'COPY_PRICE_CHANGED');
 assert.equal((await copy(USER,uuid(205),KEY,0)).error,'COPY_PRICE_CHANGED');
 assert.deepEqual(await copy(USER,uuid(205)),{charged:8,balance:5,debt:0,text:'new text'});
 assert.equal((await copy(USER,uuid(206))).error,'INSUFFICIENT_CREDIT');
 assert.deepEqual(await copy(exact,uuid(207),'expression-control-a'),{charged:8,balance:0,debt:0,text:'new text'});
 assert.equal((await copy(exact,uuid(207),'expression-control-a')).charged,0);
 assert.equal((await copy(exact,uuid(207),'expression-control-b')).error,'COPY_CONFLICT');
 assert.equal((await legacy(exact,uuid(207),'expression-control-a')).text,'new text');
 const visitor=uuid(3);await db.query('select public.creator_credit_visit($1)',[visitor]);
 assert.equal((await copy(visitor,uuid(208))).balance,7);
 assert.equal((await copy(visitor,uuid(209))).error,'INSUFFICIENT_CREDIT');
 await db.query("insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key) values($1,-3,'reverse_heart',$2,'eight-copy-debt')",[exact,uuid(210)]);
 assert.equal((await copy(exact,uuid(211))).debt,3);
 assert.equal((await copy(exact,uuid(207),'expression-control-a')).charged,0);
 assert.equal((await copy(uuid(4),uuid(212))).error,'INSUFFICIENT_CREDIT');
 await assert.rejects(copy(USER,uuid(213),'prompt-focus'),/Invalid copy/);
 await assert.rejects(copy(null,uuid(214)),/Sign in first/);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_function_privilege($1,'public.bible_expression_copy(uuid,uuid,text,text,text,integer)','execute') ok",[role])).rows[0].ok,false);
  assert.equal((await db.query("select has_table_privilege($1,'public.bible_expression_copy_receipts','select') ok",[role])).rows[0].ok,false);
 }
 assert.deepEqual((await db.query('select delta,count(*)::int n from public.bible_expression_copy_receipts group by delta order by delta')).rows,[{delta:-8,n:3},{delta:-5,n:3}]);
});
