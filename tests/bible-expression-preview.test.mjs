import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTs, mockAdmin, mocksFor, request, USER, uuid} from './helpers/choice-runtime.mjs';
import {SUNO_EXPRESSION_MOVES, SUNO_EXPRESSION_TERMS} from '../src/lib/suno-expression-prompts.ts';
import * as copy from '../src/lib/bible-prompt-copy.ts';
import * as taxonomy from '../src/lib/suno-practice-taxonomy.ts';
import * as audio from '../src/lib/suno-studio-mastering-audio-previews.ts';

const {previewBibleCatalog, canonicalExpressionKey}=loadTs('src/lib/bible-expression-preview.ts');
const {bibleCatalogDefaults, mergeBibleCatalog}=loadTs('src/lib/ai-music-bible-content.ts');
const preview=previewBibleCatalog(bibleCatalogDefaults());
const paid=preview.promptMoves.filter(item=>item.expressionFamily);
const key=copy.bibleExpressionCardKey('expression-sotto-voce');
const next={'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}}};
const uiMocks={
 'lucide-react':new Proxy({}, {get:()=>props=>React.createElement('svg',props)}),
 'next/link':{default:'a'},
 '@/components/studio-audio-preview-button':{default:()=>null},
 '@/components/showtime-queue-player':{default:()=>null},
 '@/lib/fonts':{fontRighteous:{className:''}},
 '@/lib/suno-practice-taxonomy':taxonomy,
 '@/lib/suno-studio-mastering-audio-previews':audio,
 '@/lib/bible-prompt-copy':copy,
};
const props={locale:'zh',promptMoves:paid,lyricMoves:[],genreGroups:[],productionFlow:[],promptCategories:[{key:'all',label:{zh:'全部',en:'All'}}],lyricCategories:[],artistDnaEntries:[],promptRecipes:[],recipeGenres:[]};

test('all 49 member previews omit paid text, term aliases and original IDs, while all formal text stays gated',()=>{
 assert.equal(paid.length,49);
 assert.equal(new Set(paid.map(item=>item.key)).size,49);
 const encoded=JSON.stringify(paid);
 for(const original of SUNO_EXPRESSION_MOVES){
   assert.ok(!encoded.includes(original.copy.zh),original.key);
   assert.ok(!encoded.includes(original.key),original.key);
 }
 for(const spec of SUNO_EXPRESSION_TERMS) for(const term of [spec.term,spec.preferred,...spec.aliases??[]].filter(Boolean)){
   assert.ok(!new RegExp(`\\b${term}\\b`,'i').test(encoded),term);
 }
 for(const item of paid){assert.match(item.key,/^expression-card-[0-9a-f]{8}$/);assert.deepEqual(item.copy,{zh:'',en:''});assert.ok(item.title.zh&&item.summary.en&&item.use.zh);}
 assert.ok(preview.promptMoves.every(item=>!item.copy.zh&&!item.copy.en));
 assert.ok(preview.lyricMoves.every(item=>!item.copy.zh&&!item.copy.en));
 assert.deepEqual(preview.taiwaneseEntries,bibleCatalogDefaults().taiwaneseEntries);
});

test('protected preview allowlist prevents editorial fields and metadata from re-exposing paid bodies',()=>{
 const payload={title:{zh:'PRIVATE BODY',en:'PRIVATE BODY'},summary:{zh:'PRIVATE BODY'},use:{en:'PRIVATE BODY'},copy:{zh:'PRIVATE BODY'},keywords:['PRIVATE BODY'],category:'foundation'};
 const result=previewBibleCatalog(mergeBibleCatalog([{content_kind:'prompt_move',content_key:'expression-sotto-voce',payload,updated_by:USER,updated_at:'2026-10-28T00:00:00Z'}]));
 assert.ok(!JSON.stringify(result).includes('PRIVATE BODY'));
 const item=result.promptMoves.find(item=>item.key===key);
 assert.equal(item.category,'expression');assert.equal(item.title.zh,'低聲克制');
});

test('actual content API denies guests and anonymous users; member response contains only descriptive expression previews',async t=>{
 const old={...process.env};t.after(()=>{process.env=old;});
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
 const admin=mockAdmin();const route=loadTs('src/app/api/ai-music-bible/content/route.ts',mocksFor(admin));
 assert.equal((await route.GET(request(null,null))).status,401);
 assert.equal((await route.GET(request(null,'expired'))).status,401);
 const result=await route.GET(request(null));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
 const body=await result.json();assert.deepEqual(body.promptMoves.filter(item=>item.expressionFamily),paid);
 admin.auth.getUser=async()=>({data:{user:{id:USER,is_anonymous:true}},error:null});
 assert.equal((await route.GET(request(null))).status,401);
});

test('opaque and legacy IDs resolve to same whitelist and receipt key; only successful copy API supplies the prompt',async()=>{
 const calls=[];const admin=mockAdmin();admin.rpc=async(name,args)=>{calls.push(args);return {data:{text:args.p_text,charged:8,balance:7},error:null};};
 const route=loadTs('src/app/api/ai-music-bible/copy/route.ts',{...next,'@/lib/server-creator-auth':{creatorAuth:async()=>({admin,user:{id:USER}})}});
 for(const original of SUNO_EXPRESSION_MOVES){assert.equal(canonicalExpressionKey(copy.bibleExpressionCardKey(original.key)),original.key);assert.equal(canonicalExpressionKey(original.key),original.key);}
 assert.equal(canonicalExpressionKey('expression-card-deadbeef'),null);assert.equal(canonicalExpressionKey('prompt-focus'),null);
 for(const id of [key,'expression-sotto-voce']){
 const result=await route.POST(request({key:id,locale:'zh',requestId:uuid(88),expectedCost:8}));
 assert.equal(result.status,200);assert.equal((await result.json()).text,SUNO_EXPRESSION_MOVES[0].copy.zh);
 }
 assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].p_key,'expression-sotto-voce');
 assert.equal((await route.POST(request({key:'expression-card-deadbeef',locale:'zh',requestId:uuid(89),expectedCost:8}))).status,400);
});

test('legacy deep links and pending receipts survive opaque card migration without a second debit',t=>{
 const values=new Map();const storage={get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const old=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:storage});t.after(()=>old?Object.defineProperty(globalThis,'sessionStorage',old):delete globalThis.sessionStorage);
 assert.equal(copy.bibleMoveKeyFromHash('#bible-move-expression-sotto-voce'),key);assert.equal(copy.bibleMoveKeyFromHash(`#bible-move-${key}`),key);
 assert.equal(copy.bibleMoveKeyFromHash('#bible-move-prompt-focus'),'prompt-focus');
 const receipt=uuid(99),prefix=`aipoger:bible-copy:${USER}:zh:`;
 values.set(prefix+'expression-sotto-voce',receipt);values.set(`aipoger:bible-copy:${uuid(2)}:zh:expression-sotto-voce`,uuid(100));
 const operation=copy.createBibleCopyOperation(key,'zh',USER);assert.equal(operation.requestId,receipt);
 copy.completeBibleCopyOperation(operation,USER);assert.equal(values.has(prefix+'expression-sotto-voce'),false);assert.equal(values.has(prefix+key),false);assert.equal(values.size,1);
 assert.notEqual(copy.createBibleCopyOperation(key,'zh',USER).requestId,receipt);
});

test('real card rendering shows descriptions and price, without a prompt block, before payment in both locales',()=>{
 const {default:Library}=loadTs('src/components/suno-practice-library-section.tsx',{
   ...uiMocks,'next/dynamic':{default:()=>()=>null},'@/lib/supabase':{supabase:{auth:{}}},
 });
 for(const locale of ['zh','en'])for(const item of paid){
   const html=renderToStaticMarkup(React.createElement(Library,{...props,locale,promptMoves:[item]}));
   const card=html.slice(html.indexOf(`<article id="bible-move-${item.key}"`),html.indexOf('</article>'));
   assert.ok(card.includes(item.title[locale]));assert.ok(!card.includes('<pre'));
   assert.match(card,locale==='zh'?/複製並顯示・8 點/:/Copy &amp; reveal · 8 Credit/);
   for(const original of SUNO_EXPRESSION_MOVES)assert.ok(!card.includes(original.copy.zh));
 }
});

test('paid expression cards have no inline catalog copy path',()=>{
 const {TechniqueCard:Card}=loadTs('src/components/suno-practice-library-section.tsx',{...uiMocks,'next/dynamic':{default:()=>()=>null},'@/lib/supabase':{supabase:{auth:{}}}});
 const item={...paid[0],copy:{zh:'UNTRUSTED CATALOG BODY',en:'UNTRUSTED CATALOG BODY'}};
 const html=renderToStaticMarkup(React.createElement(Card,{item,locale:'zh'}));
 assert.ok(!html.includes('UNTRUSTED CATALOG BODY'));assert.ok(!html.includes('<pre'));assert.match(html,/8 點/);
});
