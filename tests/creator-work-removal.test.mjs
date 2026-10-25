import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, mocksFor, request, track, USER, uuid } from './helpers/choice-runtime.mjs';
import { nodes, text } from './helpers/mv-runtime.mjs';
import { creatorText } from '../src/lib/creator-center-copy.ts';
import { albumCopy } from '../src/lib/album-copy.ts';
import { parseExternalMusic } from '../src/lib/external-music.ts';
import { lazyRuntime } from './helpers/lazy-runtime.mjs';

process.env.NEXT_PUBLIC_SUPABASE_URL='https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-key';
const owned=extra=>track(2,{created_by:USER,source:'community',...extra});
const route=admin=>loadTs('src/app/api/listen-bar/remove-track/route.ts',mocksFor(admin)).POST;

test('removal rejects guests, expired tokens, anonymous accounts and malformed work IDs before writes',async()=>{
 const a=mockAdmin({listen_bar_tracks:[owned()]});const post=route(a);
 assert.equal((await post(request({trackId:uuid(2)},null))).status,401);
 assert.equal((await post(request({trackId:uuid(2)},'expired'))).status,401);
 assert.equal((await post(request({trackId:'not-a-uuid'}))).status,400);
 a.auth.getUser=async()=>({data:{user:{id:USER,is_anonymous:true}},error:null});
 assert.equal((await post(request({trackId:uuid(2)}))).status,401);
 assert.equal(a.operations.filter(o=>o.action!=='read').length,0);
});

test('members cannot remove another creator or official work, regardless of request body identity',async()=>{
 const a=mockAdmin({listen_bar_tracks:[owned({created_by:uuid(3)})]});
 assert.equal((await route(a)(request({trackId:uuid(2),userId:uuid(3),isOwner:true}))).status,403);
 a.tables.listen_bar_tracks=[owned({source:'official'})];
 assert.equal((await route(a)(request({trackId:uuid(2)}))).status,404);
 assert.equal(a.operations.filter(o=>o.action==='update').length,0);
});

test('a regular creator can soft-delete a published link/MV/album without deleting history, media or rewards',async()=>{
 for(const kind of ['link','mv','album']){
  const original=owned({audio_path:null,external_url:'https://youtu.be/MdxaU0l3FzI',is_music_video:kind==='mv',work_kind:kind==='album'?'album':'single',ai_music_showtime_certified:true});
  const history={listen_bar_track_comments:[{id:'comment',track_id:uuid(2)}],listen_bar_track_ratings:[{track_id:uuid(2),score:8.7}],battle_result_archives:[{id:'battle'}],creator_credit_entries:[{id:'credit',delta:10}]};
  const a=mockAdmin({listen_bar_tracks:[original],...history});const response=await route(a)(request({trackId:uuid(2)}));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal((await response.json()).ok,true);
  const saved=a.tables.listen_bar_tracks[0];assert.equal(saved.is_active,false);assert.equal(saved.review_status,'removed');assert.ok(saved.removed_at);
  for(const key of ['created_by','audio_path','external_url','work_kind','is_music_video'])assert.equal(saved[key],original[key]);
  for(const [key,value] of Object.entries(history))assert.deepEqual(a.tables[key],value);
  assert.equal(a.operations.filter(o=>o.action!=='read').length,1);assert.ok(a.operations.every(o=>!o.storage&&o.action!=='delete'));
 }
});

test('retrying a completed removal is idempotent and never rewrites the removal timestamp',async()=>{
 const a=mockAdmin({listen_bar_tracks:[owned()]});const post=route(a);
 await post(request({trackId:uuid(2)}));const stamp=a.tables.listen_bar_tracks[0].removed_at;
 const response=await post(request({trackId:uuid(2)}));assert.equal(response.status,200);assert.equal((await response.json()).alreadyRemoved,true);
 assert.equal(a.tables.listen_bar_tracks[0].removed_at,stamp);assert.equal(a.operations.filter(o=>o.action==='update').length,1);
});

test('the final write rechecks ownership and reports a concurrent change instead of false success',async()=>{
 const a=mockAdmin({listen_bar_tracks:[owned()]});const from=a.from;
 a.from=table=>{const q=from(table),update=q.update;q.update=payload=>{a.tables[table][0].created_by=uuid(99);return update(payload)};return q;};
 const response=await route(a)(request({trackId:uuid(2)}));assert.equal(response.status,409);
 assert.equal(a.tables.listen_bar_tracks[0].is_active,true);
});

async function mount(t,{lang='zh',confirmed=true,sessionUser=USER,failed=false,status,delay=false,playingId=uuid(2)}={}){
 let cursor=0,dirty=true,tree;const states=[],refs=[],effects=[],requests=[],confirms=[];let refreshed=0,closed=0,resolveRequest;
 let props={userId:USER,name:'Test creator',avatar:null,favorites:[],savedChoiceCount:0,editingWorkId:null,privateLoading:false,privateError:'',legacy:null,onManage(){},onLegacy(){},onSubmitted(){},loading:false,error:'',onRefresh(){refreshed++},data:{isOwner:false,works:[{id:uuid(2),title:'Published MV',artist:'Test creator',genre:'Original 自我風格',aiTool:'Suno',createdAt:'2026-10-25T00:00:00Z',coverUrl:'/cover.jpg',audioUrl:'',external:{provider:'youtube',mediaId:'MdxaU0l3FzI',url:'https://youtu.be/MdxaU0l3FzI'},isMusicVideo:true,active:true,status:'public',supporters:3,comments:2,lyrics:''}],comments:[],commenters:2,commentCount:2,credits:{enabled:true,balance:15},linkSubmissionReady:true}};
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true}]},useRef(initial){return refs[cursor++]??={current:initial}},useMemo(fn){cursor++;return fn()},useEffect(fn,deps=[]){const i=cursor++;if(!effects[i]||deps.some((v,n)=>!Object.is(v,effects[i].deps[n]))){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}}}};
 const window=new EventTarget();window.location={search:'',hash:'',assign(){}};window.confirm=message=>{confirms.push(message);return confirmed};
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'next/link':{default:'link'},'lucide-react':Object.fromEntries(['Coins','Heart','MessageCircleMore','Music2','Play','Pencil','Trash2','X'].map(x=>[x,x])),
  '@/components/editorial-header':{default:'header'},'@/lib/credit-copy':{creditCopy:()=>({}),creditReason:()=>''},'@/lib/creator-center-copy':{creatorText},'@/lib/i18n':{useI18n:()=>({lang})},'@/lib/brand':{AIPOGER_BRAND_LOGO:'/logo.png'},'@/lib/music-player-store':{musicPlayer:{close(){closed++}},getMusicPlayerState:()=>({session:{queue:[{id:playingId,heartTrackId:playingId}],index:0}})},'@/lib/external-music':{parseExternalMusic},'@/lib/album-copy':{albumCopy},'@/lib/album':{albumPath:()=>'/album'},'@/components/deferred-section':{default:'deferred'},'@/components/creator-center.module.css':{default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:sessionUser?{user:{id:sessionUser},access_token:'valid'}:null}})}}}};
 modules['next/dynamic']=lazyRuntime(modules);
 const component=loadTs('src/components/creator-center.tsx',modules).CreatorCenterLayout;
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 globalThis.window=window;globalThis.fetch=async(url,init)=>{requests.push({url,...init});if(delay)return new Promise(resolve=>{resolveRequest=resolve});return {ok:!failed,status:status??(failed?500:200),json:async()=>({ok:!failed})}};
 const render=()=>{cursor=0;dirty=false;tree=component(props)};
 async function flush(){for(let i=0;i<8;i++){await new Promise(setImmediate);if(dirty)render()}}
 render();await flush();t.after(()=>{effects.forEach(e=>e?.cleanup?.());globalThis.window=originalWindow;globalThis.fetch=originalFetch});
 return {requests,confirms,closed:()=>closed,refreshed:()=>refreshed,text:()=>text(tree),nodes:()=>nodes(tree),flush,button:()=>nodes(tree).find(n=>n.type==='button'&&String(n.props['aria-label']).startsWith(lang==='zh'?'刪除 ':lang==='en'?'Delete ':'Published MV'))?.props,resolve(){resolveRequest({ok:true,json:async()=>({ok:true})})},async switchUser(){props={...props,userId:uuid(9)};render();await flush()}};
}

test('the normal-member row exposes deletion directly and cancelling never sends a request',async t=>{
 const u=await mount(t,{confirmed:false});assert.ok(u.button());assert.equal(u.button().disabled,false);
 u.button().onClick();await u.flush();assert.equal(u.confirms.length,1);assert.match(u.confirms[0],/Published MV/);assert.equal(u.requests.length,0);assert.equal(u.refreshed(),0);
});

test('confirmed removal uses the owned ID, updates the row only after success and stops only that work',async t=>{
 const u=await mount(t);u.button().onClick();await u.flush();
 assert.equal(u.requests.length,1);assert.equal(u.requests[0].url,'/api/listen-bar/remove-track');assert.deepEqual(JSON.parse(u.requests[0].body),{trackId:uuid(2)});
 assert.equal(u.refreshed(),1);assert.equal(u.closed(),1);assert.equal(u.button().disabled,true);assert.match(u.text(),/作品已刪除/);
});

test('failed removal keeps the work available and retryable without stopping playback',async t=>{
 const u=await mount(t,{failed:true});u.button().onClick();await u.flush();
 assert.equal(u.refreshed(),0);assert.equal(u.closed(),0);assert.equal(u.button().disabled,false);assert.match(u.text(),/未能刪除作品/);
 assert.doesNotMatch(u.text(),/確認登入|重新登入/);
});

test('an absent or switched login cannot submit a deletion',async t=>{
 const u=await mount(t,{sessionUser:uuid(8)});u.button().onClick();await u.flush();assert.equal(u.requests.length,0);assert.match(u.text(),/登入已失效/);
});

for(const [status,message] of [[401,/登入已失效/],[403,/只能刪除自己的作品/],[409,/作品狀態已變更/]])test(`removal failure ${status} provides the right recovery without changing the work`,async t=>{
 const u=await mount(t,{failed:true,status});u.button().onClick();await u.flush();assert.match(u.text(),message);assert.equal(u.refreshed(),0);assert.equal(u.closed(),0);assert.equal(u.button().disabled,false);
});

test('double clicks cannot submit twice and deleting another work does not stop playback',async t=>{
 const u=await mount(t,{delay:true,playingId:uuid(7)});const click=u.button().onClick;click();click();await u.flush();assert.equal(u.requests.length,1);assert.equal(u.confirms.length,1);
 u.resolve();await u.flush();assert.equal(u.closed(),0);assert.equal(u.refreshed(),1);
});

test('a late response cannot alter a newly signed-in account',async t=>{
 const u=await mount(t,{delay:true});u.button().onClick();await u.flush();await u.switchUser();u.resolve();await u.flush();assert.equal(u.refreshed(),0);assert.equal(u.closed(),0);assert.doesNotMatch(u.text(),/作品已刪除/);
});

for(const lang of ['en','ja','ko'])test(`deletion labels and confirmation are localized (${lang})`,async t=>{
 const u=await mount(t,{lang,confirmed:false});u.button().onClick();await u.flush();assert.equal(u.confirms.length,1);assert.match(u.confirms[0],/Published MV/);assert.doesNotMatch(u.confirms[0],/確定刪除/);
});
