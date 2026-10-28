import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTs,mockAdmin,mocksFor,request,USER,uuid} from './helpers/choice-runtime.mjs';
import {mountMv,text} from './helpers/mv-runtime.mjs';
import * as copy from '../src/lib/bible-prompt-copy.ts';
import * as taxonomy from '../src/lib/suno-practice-taxonomy.ts';
import * as audio from '../src/lib/suno-studio-mastering-audio-previews.ts';
import {bibleCatalogDefaults,mergeBibleCatalog} from '../src/lib/ai-music-bible-content.ts';
import {SUNO_ARTIST_DNA_ENTRIES,SUNO_PROMPT_RECIPES} from '../src/lib/suno-inspiration-index.ts';

const {BIBLE_FORMAL_PROMPT_KEYS,resolveBibleFormalPrompt,bibleFormalPromptText}=loadTs('src/lib/bible-formal-prompts.ts');
const {previewBibleCatalog,previewArtistDna,previewPromptRecipes}=loadTs('src/lib/bible-expression-preview.ts');
const next={'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}}};
const strings=value=>typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
const preview=previewBibleCatalog(bibleCatalogDefaults());

test('all 1763 formal prompts have unique server whitelist keys and canonical bodies; teaching keys cannot be charged',()=>{
 assert.equal(BIBLE_FORMAL_PROMPT_KEYS.length,1763);assert.equal(new Set(BIBLE_FORMAL_PROMPT_KEYS).size,1763);
 for(const key of BIBLE_FORMAL_PROMPT_KEYS){const item=resolveBibleFormalPrompt(key);assert.ok(item,key);for(const locale of ['zh','en']){const value=bibleFormalPromptText(item,locale);assert.ok(value&&value.length<=8000,key);}}
 for(const key of ['vocal-starter-intimate-verse','tutorial:starter','prompt_move:missing','artist_dna:missing','prompt_recipe:missing','prompt-focus',null])assert.equal(resolveBibleFormalPrompt(key),null);
 const old='expression-sotto-voce';assert.deepEqual(resolveBibleFormalPrompt(copy.bibleExpressionCardKey(old)),resolveBibleFormalPrompt(old));
});

test('catalog projection removes all formal bodies, source prompt aliases and reconstructable DNA tags',()=>{
 const artists=previewArtistDna(SUNO_ARTIST_DNA_ENTRIES),recipes=previewPromptRecipes(SUNO_PROMPT_RECIPES);
 const client={...preview,artistDnaEntries:artists,promptRecipes:recipes};
 const haystack=strings(client);
 for(const key of BIBLE_FORMAL_PROMPT_KEYS){const entry=resolveBibleFormalPrompt(key);for(const locale of ['zh','en']){const body=bibleFormalPromptText(entry,locale);assert.ok(!haystack.some(value=>value.includes(body)),key);}}
 for(const item of [...client.promptMoves,...client.lyricMoves])assert.deepEqual(item.copy,{zh:'',en:''});
 for(const item of artists){assert.equal(item.prompt,'');assert.equal(item.sourcePrompt,undefined);assert.ok(item.summaryZh.length);assert.ok(item.searchText.includes(item.artist.toLowerCase()));}
 assert.ok(artists.every((item,index)=>JSON.stringify(item.tags)!==JSON.stringify(SUNO_ARTIST_DNA_ENTRIES[index].tags)));
 assert.ok(recipes.every(item=>item.prompt===''&&item.genre&&item.moodZh&&item.searchText));
 assert.deepEqual(preview.taiwaneseEntries,bibleCatalogDefaults().taiwaneseEntries);
 const edited=mergeBibleCatalog([{content_kind:'prompt_move',content_key:'prompt-focus',payload:{copy:{zh:'PRIVATE BODY'},title:{zh:'PRIVATE BODY'},summary:{en:'PRIVATE BODY'},use:{zh:'PRIVATE BODY'},keywords:['PRIVATE BODY']},updated_by:USER,updated_at:'2026-10-29'}]);
 assert.ok(!JSON.stringify(previewBibleCatalog(edited)).includes('PRIVATE BODY'));
});

test('actual content API returns all descriptive catalogs only to non-anonymous members',async t=>{
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';
 t.after(()=>{for(const [k,v]of [['NEXT_PUBLIC_SUPABASE_URL',oldUrl],['SUPABASE_SERVICE_ROLE_KEY',oldKey]])if(v===undefined)delete process.env[k];else process.env[k]=v;});
 const admin=mockAdmin();const route=loadTs('src/app/api/ai-music-bible/content/route.ts',mocksFor(admin));
 assert.equal((await route.GET(request(null,null))).status,401);
 const r=await route.GET(request(null));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');const body=await r.json();
 assert.equal(body.promptMoves.length,223);assert.equal(body.lyricMoves.length,21);assert.equal(body.artistDnaEntries.length,772);assert.equal(body.promptRecipes.length,747);
 assert.ok(body.promptMoves.every(item=>!item.copy.zh&&!item.copy.en));assert.ok(body.lyricMoves.every(item=>!item.copy.zh));assert.ok(body.artistDnaEntries.every(item=>!item.prompt&&!item.sourcePrompt));assert.ok(body.promptRecipes.every(item=>!item.prompt));
 assert.ok(!JSON.stringify(body).includes(SUNO_ARTIST_DNA_ENTRIES.at(-1).sourcePrompt));
 admin.auth.getUser=async()=>({data:{user:{id:USER,is_anonymous:true}},error:null});assert.equal((await route.GET(request(null))).status,401);
});

test('copy API charges only canonical server-selected text and account for every formal family',async()=>{
 const admin=mockAdmin();const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return {data:{charged:8,text:args.p_text,balance:7,exempt:false},error:null};};
 const route=loadTs('src/app/api/ai-music-bible/copy/route.ts',{...next,'@/lib/server-creator-auth':{creatorAuth:async()=>({admin,user:{id:USER}})}});
 const studioKey=copy.biblePromptCopyKey('prompt_move',preview.promptMoves.find(item=>item.studioFamily).key);
 for(const key of ['expression-sotto-voce',studioKey,'prompt_move:prompt-focus','lyric_move:core-song-map','artist_dna:artist-dna-001','prompt_recipe:prompt-recipe-001']){
  const r=await route.POST(request({key,locale:'en',requestId:uuid(100+calls.length),expectedCost:8,userId:uuid(4),isOwner:true,amount:0,text:'forged'}));assert.equal(r.status,200);
  const result=await r.json();assert.equal(result.text,bibleFormalPromptText(resolveBibleFormalPrompt(key),'en'));
  assert.equal(calls.at(-1).name,'bible_prompt_copy');assert.equal(calls.at(-1).args.p_user,USER);assert.equal(calls.at(-1).args.p_key,key);assert.equal(calls.at(-1).args.p_expected_cost,8);assert.notEqual(calls.at(-1).args.p_text,'forged');assert.equal('p_owner' in calls.at(-1).args,false);
 }
 assert.equal((await route.POST(request({key:'vocal-starter-intimate-verse',locale:'en',requestId:uuid(301),expectedCost:8}))).status,400);
 assert.equal((await route.POST(request({key:'prompt_move:missing',locale:'en',requestId:uuid(302),expectedCost:8}))).status,400);
});

test('shared copy control hides text on auth/funds/network failure, reveals after success and retries without charging again',async t=>{
 let response='INSUFFICIENT_CREDIT',blocked=true,requests=0,created=0,completed=0;const writes=[],timers=[];
 const ui=await mountMv(t,'src/components/bible-prompt-copy.tsx',{copyKey:'prompt_move:prompt-focus',locale:'zh',navigationLang:'ja'}, {
  'lucide-react':new Proxy({}, {get:(_,key)=>String(key)}),'next/link':{__esModule:true,default:'a'},
  '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:response==='AUTH_REQUIRED'?null:{user:{id:USER},access_token:'fixture'}}})}}},
  '@/lib/bible-prompt-copy':{...copy,createBibleCopyOperation:(key,locale)=>({key,locale,requestId:uuid(++created)}),completeBibleCopyOperation:()=>completed++,resolveBiblePaidCopy:(op,token)=>copy.resolveBiblePaidCopy(op,token,async()=>{requests++;if(response==='network')throw Error('lost');if(response!=='success'&&response!=='owner')return new Response(JSON.stringify({error:response}),{status:402});return new Response(JSON.stringify({text:'PAID CANONICAL TEXT',exempt:response==='owner'}));})},
 },{navigator:{clipboard:{writeText:async value=>{if(blocked)throw Error('blocked');writes.push(value);}}},window:{dispatchEvent(){},setTimeout:fn=>timers.push(fn)}});
 const click=async()=>{ui.find('button').onClick();await ui.flush();};
 assert.match(ui.text(),/8 點/);assert.equal(ui.nodes().some(n=>n.type==='pre'),false);
 for(response of ['INSUFFICIENT_CREDIT','AUTH_REQUIRED','network']){await click();assert.equal(ui.nodes().some(n=>n.type==='pre'),false);}
 response='INSUFFICIENT_CREDIT';await click();assert.equal(ui.find('a').href,'/profile?lang=ja#my-credit');
 response='success';ui.find('button').onClick();ui.find('button').onClick();await ui.flush();assert.equal(text(ui.nodes().find(n=>n.type==='pre')),'PAID CANONICAL TEXT');assert.match(ui.text(),/重試複製・不再扣點/);
 const count=requests;blocked=false;await click();assert.equal(requests,count);assert.equal(completed,1);assert.deepEqual(writes,['PAID CANONICAL TEXT']);
 response='owner';await click();assert.equal(requests,count+1);timers.forEach(fn=>fn());await ui.flush();assert.match(ui.text(),/Owner 免扣點/);
});

test('formal technique, lyric and homepage entrances use the same paid key while teaching shortcuts stay free',async t=>{
 const icons=new Proxy({}, {get:()=>props=>React.createElement('svg',props)});
 const mocks={'lucide-react':icons,'next/link':{__esModule:true,default:'a'},'next/dynamic':{default:()=>()=>null},'@/lib/fonts':{fontRighteous:{className:''}},'@/lib/suno-practice-taxonomy':taxonomy,'@/lib/suno-studio-mastering-audio-previews':audio,'@/components/studio-audio-preview-button':{default:()=>null},'@/components/showtime-queue-player':{default:()=>null},'@/lib/supabase':{supabase:{auth:{}}}};
 const {TechniqueCard}=loadTs('src/components/suno-practice-library-section.tsx',mocks);
 for(const [item,kind]of [[preview.promptMoves[0],'prompt_move'],[preview.lyricMoves[0],'lyric_move']]){
  const html=renderToStaticMarkup(React.createElement(TechniqueCard,{item,locale:'zh',copyKind:kind}));assert.ok(html.includes(`data-prompt-copy="${copy.biblePromptCopyKey(kind,item.key)}"`));assert.match(html,/8 點/);assert.ok(!html.includes('<pre'));
 }
 const writes=[];const ui=await mountMv(t,'src/components/suno-practice-library-section.tsx',{locale:'zh',promptMoves:preview.promptMoves,lyricMoves:preview.lyricMoves,genreGroups:[],productionFlow:[],promptCategories:[],lyricCategories:[],artistDnaEntries:[],promptRecipes:[],recipeGenres:[]},{...mocks,'@/lib/bible-prompt-copy':copy,'@/components/bible-prompt-copy':{__esModule:true,default:'PaidPrompt'}},{window:{location:{hash:''},addEventListener(){},removeEventListener(){},setTimeout(){}},document:{getElementById:()=>null},navigator:{clipboard:{writeText:async value=>writes.push(value)}}});
 const starter=ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']==='複製主歌：靠近一點唱');assert.ok(starter);await starter.props.onClick();await ui.flush();assert.deepEqual(writes,['[Verse | breathy | vulnerable | close mic]']);
});

const modulePath=process.env.AIPOGER_CREDIT_PGLITE_MODULE;
test('PostgreSQL: generic 8-point spending, confirmed Owner zero-use records, legacy retries, rewards and private grants',{skip:!modulePath&&'Set PGlite module'},async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const path of ['tests/sql/credit-participation-fixture.sql','supabase/credit_participation.sql','supabase/migrations/20261027073526_bible_expression_copy_credit.sql'])await db.exec(await readFile(path,'utf8'));
 await db.exec("create function public.work_review_owner(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users where id=p_user and is_anonymous is not true and email_confirmed_at is not null and lower(trim(coalesce(email,''))) in ('djapple99@gmail.com','aipoger99@gmail.com'))$$;revoke all on function public.work_review_owner(uuid) from public,anon,authenticated;grant execute on function public.work_review_owner(uuid) to service_role;");
 await db.exec('set role service_role');await db.query('select public.creator_credit_visit($1)',[USER]);await db.query('select public.bible_expression_copy($1,$2,$3,$4,$5)',[USER,uuid(600),'expression-sotto-voce','zh','legacy five text']);await db.exec('reset role');
 await db.exec(await readFile('supabase/migrations/20261027194224_bible_expression_copy_eight_credit.sql','utf8'));
 const before=(await db.query('select * from public.creator_credit_history order by id')).rows;
 const rewards=(await db.query("select oid,md5(prosrc) h from pg_proc where pronamespace='public'::regnamespace and proname like 'creator_credit_%' order by oid")).rows;
 const migration=await readFile('supabase/migrations/20261028175604_bible_formal_prompt_copy_credit.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.deepEqual((await db.query('select * from public.creator_credit_history order by id')).rows,before);assert.deepEqual((await db.query("select oid,md5(prosrc) h from pg_proc where pronamespace='public'::regnamespace and proname like 'creator_credit_%' order by oid")).rows,rewards);
 assert.equal((await db.query('select count(*)::int n from aipoger_private.bible_prompt_keys')).rows[0].n,1763);
 await db.exec('set role service_role');
 const spend=async(user,id,key='prompt_move:prompt-focus',expected=8)=>(await db.query('select public.bible_prompt_copy($1,$2,$3,$4,$5,$6) r',[user,id,key,'zh','canonical snapshot',expected])).rows[0].r;
 assert.equal((await spend(USER,uuid(600),'expression-sotto-voce')).text,'legacy five text');
 assert.equal((await spend(USER,uuid(601),'prompt_move:prompt-focus',5)).error,'COPY_PRICE_CHANGED');
 const spent=await spend(USER,uuid(601));assert.equal(spent.charged,8);assert.equal(spent.balance,5);assert.equal(spent.exempt,false);
 assert.equal((await spend(USER,uuid(601))).charged,0);assert.equal((await spend(USER,uuid(601),'lyric_move:core-song-map')).error,'COPY_CONFLICT');assert.equal((await spend(USER,uuid(602))).error,'INSUFFICIENT_CREDIT');
 for(const key of ['lyric_move:core-song-map','artist_dna:artist-dna-001','prompt_recipe:prompt-recipe-001']){await db.query('select public.creator_credit_visit($1)',[uuid(2)]);await db.query("insert into public.creator_credit_entries(user_id,delta,reason,source_id) values($1,3,'blind_compare',$2)",[uuid(2),crypto.randomUUID()]);const r=await spend(uuid(2),crypto.randomUUID(),key);assert.equal(r.charged,8);}
 const owner=uuid(4);await db.query("insert into public.creator_credit_participation_entries(user_id,delta,reason,source_id,event_key) values($1,-3,'reverse_heart',$2,'owner-debt')",[owner,uuid(603)]);
 const free=await spend(owner,uuid(604));assert.equal(free.charged,0);assert.equal(free.exempt,true);assert.equal(free.debt,3);assert.equal((await spend(owner,uuid(604))).text,'canonical snapshot');
 const legacyOwner=(await db.query('select public.bible_expression_copy($1,$2,$3,$4,$5) r',[owner,uuid(605),'expression-sotto-voce','zh','owner legacy tab'])).rows[0].r;assert.equal(legacyOwner.exempt,true);assert.equal(legacyOwner.charged,0);
 assert.equal((await db.query("select count(*)::int n from public.creator_credit_history where user_id=$1 and reason='owner_prompt_copy' and delta=0",[owner])).rows[0].n,2);
 await assert.rejects(spend(USER,uuid(606),'tutorial:starter'),/Invalid copy/);
 await db.exec('reset role');
 // Display metadata cannot grant Owner status; an unconfirmed matching email cannot either.
 await db.query('update auth.users set email=$1,email_confirmed_at=null where id=$2',['aipoger99@gmail.com',uuid(3)]);await db.exec('set role service_role');assert.equal((await spend(uuid(3),uuid(607))).error,'INSUFFICIENT_CREDIT');await db.exec('reset role');
 for(const role of ['anon','authenticated'])for(const fn of ['bible_prompt_copy','bible_expression_copy'])assert.equal((await db.query(`select has_function_privilege($1,'public.${fn}(uuid,uuid,text,text,text,integer)','execute') ok`,[role])).rows[0].ok,false);
 for(const role of ['anon','authenticated'])for(const table of ['public.bible_expression_copy_receipts','aipoger_private.bible_prompt_keys'])assert.equal((await db.query("select has_table_privilege($1,$2,'select') ok",[role,table])).rows[0].ok,false);
});
