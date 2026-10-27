import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {SUNO_EXPRESSION_MOVES, SUNO_EXPRESSION_TERMS, SUNO_EXPRESSION_BASE_STYLE, SUNO_EXPRESSION_COMPARISON_MOVES} from '../src/lib/suno-expression-prompts.ts';
import {SUNO_PROMPT_MOVES} from '../src/lib/suno-practice-library.ts';
import {SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS} from '../src/lib/suno-studio-mastering-audio-previews.ts';
import {resolveBiblePaidCopy} from '../src/lib/bible-prompt-copy.ts';
import {loadTs, USER, uuid, request} from './helpers/choice-runtime.mjs';
const KEY='expression-sotto-voce';
test('all 46 screenshot terms and three controls have stable unique IDs and working taxonomy, without new audio',()=>{
 assert.equal(SUNO_EXPRESSION_TERMS.length,46);assert.equal(SUNO_EXPRESSION_MOVES.length,49);
 assert.equal(new Set(SUNO_EXPRESSION_MOVES.map(x=>x.key)).size,49);
 assert.equal(SUNO_PROMPT_MOVES.length,223);assert.deepEqual(SUNO_PROMPT_MOVES.slice(-49),SUNO_EXPRESSION_MOVES);
 assert.deepEqual(SUNO_EXPRESSION_MOVES.reduce((a,x)=>(a[x.expressionFamily]=(a[x.expressionFamily]||0)+1,a),{}),{vocal:7,emotion:12,character:17,energy:10,comparison:3});
 assert.equal(SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.length,100);
 for(const item of SUNO_EXPRESSION_MOVES){assert.equal(item.copy.zh,item.copy.en);assert.ok(item.summary.zh&&item.use.en);assert.equal(item.metadata.lastVerifiedAt,null);assert.equal(SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.some(x=>x.key===item.key),false);}
 assert.match(SUNO_EXPRESSION_MOVES.find(x=>x.key==='expression-sonore').copy.zh,/^Sonoro,/);
 assert.match(SUNO_EXPRESSION_MOVES.find(x=>x.key==='expression-slancio').copy.zh,/^Con slancio,/);
 assert.deepEqual(SUNO_EXPRESSION_COMPARISON_MOVES.map(x=>x.copy.en),[SUNO_EXPRESSION_BASE_STYLE,`Vocal delivery: sotto voce. ${SUNO_EXPRESSION_BASE_STYLE}`,`Vocal delivery: sotto voce, soft, understated vocal delivery. ${SUNO_EXPRESSION_BASE_STYLE}`]);
});
function fixture({auth=true,dbResult={charged:5,text:'server prompt',balance:10,debt:0},dbError=null}={}){
 const calls=[];
 const admin={from:()=>({select:()=>({eq:()=>({eq:async()=>({data:[],error:null})})})}),rpc:async(name,args)=>{calls.push({name,args});return{data:dbResult,error:dbError};}};
 const route=loadTs('src/app/api/ai-music-bible/copy/route.ts',{'@/lib/server-creator-auth':{creatorAuth:async()=>auth?{admin,user:{id:USER}}:null},'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}}});return{route,calls};
}
test('copy API verifies member and whitelist; client cannot select an amount, identity or free item',async()=>{
 const no=fixture({auth:false});assert.equal((await no.route.POST(request({}))).status,401);assert.equal(no.calls.length,0);
 const x=fixture();for(const bad of [{key:'prompt-focus',locale:'zh',requestId:uuid(2)},{key:KEY,locale:'ko',requestId:uuid(2)},{key:KEY,locale:'zh',requestId:'bad'}])assert.equal((await x.route.POST(request(bad))).status,400);
 const r=await x.route.POST(request({key:KEY,locale:'zh',requestId:uuid(2),userId:uuid(99),amount:0,text:'forged'}));
 assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(x.calls[0].args.p_user,USER);assert.notEqual(x.calls[0].args.p_text,'forged');assert.equal(x.calls[0].args.p_key,KEY);
});
test('insufficient balance, conflicts and unavailable DB are never reported as success',async()=>{
 for(const [options,status] of [[{dbResult:{error:'INSUFFICIENT_CREDIT',balance:4}},402],[{dbResult:{error:'COPY_CONFLICT'}},409],[{dbError:{message:'offline'}},503]]){
 const x=fixture(options);assert.equal((await x.route.POST(request({key:KEY,locale:'en',requestId:uuid(2)}))).status,status);}
});
test('lost network response retries same receipt; clipboard retry reuses paid snapshot without another request',async()=>{
 const operation={key:KEY,locale:'zh',requestId:uuid(2)};const sent=[];
 const send=async(_url,init)=>{sent.push(JSON.parse(init.body));if(sent.length===1)throw Error('response lost');return new Response(JSON.stringify({text:'paid snapshot'}));};
 await assert.rejects(resolveBiblePaidCopy(operation,'verified',send));
 assert.equal(await resolveBiblePaidCopy(operation,'verified',send),'paid snapshot');assert.deepEqual(sent[0],sent[1]);
 assert.equal(await resolveBiblePaidCopy(operation,'verified',send),'paid snapshot');assert.equal(sent.length,2);
});
const modulePath=process.env.AIPOGER_CREDIT_PGLITE_MODULE;
test('PostgreSQL: fixed five-point spend, insufficient/debt guards, receipts, privacy and old ledger preservation',{skip:!modulePath&&'Set PGlite module'},async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(await readFile(new URL('./sql/credit-participation-fixture.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/credit_participation.sql',import.meta.url),'utf8'));
 // A prior income source must remain in the shared history after migration.
 await db.exec(`create table public.creator_credit_reply_awards(id uuid,user_id uuid,delta int,reason text,source_id uuid,created_at timestamptz);grant select on public.creator_credit_reply_awards to service_role;
 create or replace view public.creator_credit_history with(security_invoker=true) as select id,user_id,delta,reason,source_id,created_at from public.creator_credit_entries union all select id,user_id,delta,reason,source_id,created_at from public.creator_credit_participation_entries union all select * from public.creator_credit_reply_awards;
 insert into public.creator_credit_reply_awards values('${uuid(20)}','${USER}',2,'creator_reply','${uuid(21)}',now());`);
 const before=(await db.query('select * from public.creator_credit_history order by id')).rows;
 await db.exec(await readFile(new URL('../supabase/migrations/20261027073526_bible_expression_copy_credit.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('select * from public.creator_credit_history order by id')).rows,before);
 await db.exec('set role service_role');
 const copy=async(user,id,key=KEY,locale='zh',body='prompt')=>(await db.query('select public.bible_expression_copy($1,$2,$3,$4,$5) as result',[user,id,key,locale,body])).rows[0].result;
 assert.deepEqual(await copy(USER,uuid(22)),{charged:5,balance:0,debt:0,text:'prompt'});
 assert.equal((await copy(USER,uuid(22),KEY,'zh','changed text')).text,'prompt');
 assert.equal((await copy(USER,uuid(22),'expression-marcato')).error,'COPY_CONFLICT');
 assert.equal((await copy(USER,uuid(23))).error,'INSUFFICIENT_CREDIT');
 await db.query('select public.creator_credit_visit($1)',[USER]);
 for(let i=24;i<27;i++)assert.equal((await copy(USER,uuid(i))).charged,5);
 assert.equal((await copy(USER,uuid(27))).error,'INSUFFICIENT_CREDIT');
 await db.query("insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key) values($1,-3,'reverse_heart',$2,'copy-test-debt')",[USER,uuid(28)]);
 assert.equal((await copy(USER,uuid(29))).debt,3);
 // Owner has no prompt-copy exemption. API owns membership verification.
 assert.equal((await copy(uuid(4),uuid(30))).error,'INSUFFICIENT_CREDIT');
 await assert.rejects(copy(null,uuid(31)),/Sign in first/);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){
 assert.equal((await db.query("select has_function_privilege($1,'public.bible_expression_copy(uuid,uuid,text,text,text)','execute') ok",[role])).rows[0].ok,false);
 assert.equal((await db.query("select has_table_privilege($1,'public.bible_expression_copy_receipts','select') ok",[role])).rows[0].ok,false);}
 assert.equal((await db.query('select count(*)::int n from public.bible_expression_copy_receipts')).rows[0].n,4);
});

import {mountMv,text as nodeText} from './helpers/mv-runtime.mjs';
import * as taxonomy from '../src/lib/suno-practice-taxonomy.ts';
import * as audio from '../src/lib/suno-studio-mastering-audio-previews.ts';
import {SUNO_PROMPT_CATEGORIES} from '../src/lib/suno-practice-library.ts';
test('prompt UI filters families and aliases, routes paid copies, retries clipboard and preserves old free copying',async t=>{
 let blocked=true,requests=0;const copied=[];const operations=[];const timers=[];
 const ui=await mountMv(t,'src/components/suno-practice-library-section.tsx',{locale:'zh',promptMoves:SUNO_PROMPT_MOVES,lyricMoves:[],genreGroups:[],productionFlow:[],promptCategories:SUNO_PROMPT_CATEGORIES,lyricCategories:[],artistDnaEntries:[],promptRecipes:[],recipeGenres:[]},{
 'lucide-react':new Proxy({}, {get:(_,key)=>String(key)}),
 'next/link':{__esModule:true,default:'a'},
 '@/components/studio-audio-preview-button':{__esModule:true,default:()=>null},
 '@/components/showtime-queue-player':{__esModule:true,default:()=>null},
 '@/lib/fonts':{fontRighteous:{className:''}},
 '@/lib/suno-practice-taxonomy':taxonomy,
 '@/lib/suno-studio-mastering-audio-previews':audio,
 '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:USER},access_token:'verified'}}})}}},
 '@/lib/bible-prompt-copy':{
 createBibleCopyOperation:(key,locale)=>{const op={key,locale,requestId:uuid(100+operations.length)};operations.push(op);return op;},
 completeBibleCopyOperation:()=>{},
 resolveBiblePaidCopy:(op,token)=>resolveBiblePaidCopy(op,token,async()=>{requests++;return new Response(JSON.stringify({text:'paid server snapshot'}));}),
 },
 },{window:{location:{hash:''},addEventListener(){},removeEventListener(){},setTimeout:fn=>timers.push(fn),dispatchEvent(){}},document:{getElementById:()=>null},navigator:{clipboard:{writeText:async value=>{if(blocked)throw Error('blocked');copied.push(value);}}}});
 const click=async label=>{const button=ui.nodes().find(x=>x.type==='button'&&nodeText(x)===label);assert.ok(button,label);button.props.onClick();await ui.flush();};
 await click('表情與氛圍');assert.match(ui.text(),/找到 49 招/);
 await click('人聲與樂句');assert.match(ui.text(),/找到 7 招/);
 await click('情緒與氛圍');assert.match(ui.text(),/找到 12 招/);
 await click('A／B／C 對照練習');assert.match(ui.text(),/找到 3 招/);
 await click('全部表情詞');
 const search=ui.nodes().find(x=>x.type==='input'&&x.props['aria-label']==='搜尋 Prompt 招式');search.props.onChange({target:{value:'sonoro'}});await ui.flush();assert.match(ui.text(),/找到 1 招/);
 let card=ui.nodes().find(x=>x.props?.item?.key==='expression-sonore');assert.ok(card);card.props.onCopy();card.props.onCopy();await ui.flush();
 card=ui.nodes().find(x=>x.props?.item?.key==='expression-sonore');assert.equal(card.props.copyIssue,'clipboard');assert.equal(requests,1);assert.equal(operations.length,1);
 blocked=false;card.props.onCopy();await ui.flush();assert.equal(requests,1);assert.deepEqual(copied,['paid server snapshot']);
 card=ui.nodes().find(x=>x.props?.item?.key==='expression-sonore');card.props.onCopy();await ui.flush();assert.equal(requests,2);assert.equal(operations.length,2);
 await click('全部');search.props.onChange({target:{value:'prompt-focus'}});await ui.flush();
 // Reset search through the visible control and use the original free move.
 const fresh=ui.nodes().find(x=>x.type==='input'&&x.props['aria-label']==='搜尋 Prompt 招式');fresh.props.onChange({target:{value:''}});await ui.flush();
 const old=ui.nodes().find(x=>x.props?.item&&!x.props.item.expressionFamily);assert.ok(old);old.props.onCopy();await ui.flush();assert.equal(requests,2);assert.equal(copied.length,3);
});

import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {creditCopy,creditReason} from '../src/lib/credit-copy.ts';
test('wallet centralizes balance, earning routes and weekly allowance in four languages',()=>{
 const {default:Wallet}=loadTs('src/components/credit-wallet.tsx',{'next/link':{default:({children,...props})=>React.createElement('a',props,children)}});
 for(const lang of ['zh','en','ja','ko']){
 const html=renderToStaticMarkup(React.createElement(Wallet,{lang,balance:42,debt:0}));
 assert.match(html,/>42<\/strong>/);assert.match(html,/168/);assert.match(html,/60/);assert.match(html,/5/);assert.match(html,new RegExp(`/battle/listen\\?lang=${lang}`));assert.match(html,new RegExp(`/ai-music\\?lang=${lang}#works`));
 assert.notEqual(creditReason(lang,'bible_prompt_copy'),'bible_prompt_copy');
 }
 assert.match(creditCopy('zh').allowance,/168小時（一週）/);
});
