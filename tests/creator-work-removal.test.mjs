import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, mocksFor, request, USER, uuid } from './helpers/choice-runtime.mjs';
import { nodes, text } from './helpers/mv-runtime.mjs';
import { creatorText } from '../src/lib/creator-center-copy.ts';
import { albumCopy } from '../src/lib/album-copy.ts';
import { parseExternalMusic } from '../src/lib/external-music.ts';
import { lazyRuntime } from './helpers/lazy-runtime.mjs';

process.env.NEXT_PUBLIC_SUPABASE_URL='https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-key';
const deleteRequest=(body,token)=>request({permanent:true,...body},token);
const route=admin=>loadTs('src/app/api/listen-bar/remove-track/route.ts',{
 ...mocksFor(admin),'@/lib/server-creator-work-cleanup':{flushDeletedWorkFiles:async()=>{throw new Error('Storage unavailable')}},
}).POST;
const removalAdmin=(result={data:{ok:true},error:null})=>{
 const a=mockAdmin();a.calls=[];a.rpc=async(name,args)=>{a.calls.push({name,args});return result};return a;
};
test('permanent removal rejects guests, expired/anonymous login and malformed IDs before RPC',async()=>{
 const a=removalAdmin(),post=route(a);
 assert.equal((await post(deleteRequest({trackId:uuid(2)},null))).status,401);
 assert.equal((await post(deleteRequest({trackId:uuid(2)},'expired'))).status,401);
 assert.equal((await post(deleteRequest({trackId:'bad'}))).status,400);
 a.auth.getUser=async()=>({data:{user:{id:USER,is_anonymous:true}},error:null});
 assert.equal((await post(deleteRequest({trackId:uuid(2)}))).status,401);assert.equal(a.calls.length,0);
});
test('permanent removal passes only the verified actor and work ID to the transactional RPC',async()=>{
 const a=removalAdmin(),r=await route(a)(deleteRequest({trackId:uuid(2),userId:uuid(3),isOwner:true}));
 assert.equal(r.status,200);assert.deepEqual(a.calls,[{name:'delete_creator_work',args:{p_track:uuid(2),p_actor:USER}}]);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('forbidden and failed deletes remain failures without exposing internal database details',async()=>{
 for(const [code,status] of [['42501',403],['XX000',500]]){
  const a=removalAdmin({data:null,error:{code,message:'private internal trigger'}}),r=await route(a)(deleteRequest({trackId:uuid(2)}));
  assert.equal(r.status,status);assert.doesNotMatch(await r.text(),/private internal trigger/);
 }
});
test('already deleted requests are idempotent; failed file cleanup never reports the deleted work as retained',async()=>{
 const a=removalAdmin({data:{ok:true,alreadyDeleted:true},error:null});
 assert.equal((await (await route(a)(deleteRequest({trackId:uuid(2)}))).json()).alreadyDeleted,true);
 const b=removalAdmin({data:{ok:true,cleanupJob:uuid(7)},error:null});
 const r=await route(b)(deleteRequest({trackId:uuid(2)}));assert.equal(r.status,200);assert.equal((await r.json()).cleanupPending,true);
});

async function mount(t,{lang='zh',confirmed=true,sessionUser=USER,failed=false,status,delay=false,playingId=uuid(2),active=true}={}){
 let cursor=0,dirty=true,tree;const states=[],refs=[],effects=[],requests=[],confirms=[];let refreshed=0,closed=0,resolveRequest;
 let props={userId:USER,name:'Test creator',avatar:null,favorites:[],savedChoiceCount:0,editingWorkId:null,privateLoading:false,privateError:'',legacy:null,onManage(){},onLegacy(){},onSubmitted(){},loading:false,error:'',onRefresh(){refreshed++},data:{isOwner:false,works:[{id:uuid(2),title:'Published MV',artist:'Test creator',genre:'Original 自我風格',aiTool:'Suno',createdAt:'2026-10-25T00:00:00Z',coverUrl:'/cover.jpg',audioUrl:'',external:{provider:'youtube',mediaId:'MdxaU0l3FzI',url:'https://youtu.be/MdxaU0l3FzI'},isMusicVideo:true,active,status:active?'public':'hidden',supporters:3,comments:2,lyrics:''}],comments:[],commenters:2,commentCount:2,credits:{enabled:true,balance:15},linkSubmissionReady:true}};
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
 assert.equal(u.requests.length,1);assert.equal(u.requests[0].url,'/api/listen-bar/remove-track');assert.deepEqual(JSON.parse(u.requests[0].body),{trackId:uuid(2),permanent:true});
 assert.equal(u.refreshed(),1);assert.equal(u.closed(),1);assert.equal(u.button(),undefined);assert.match(u.text(),/作品已永久刪除/);assert.doesNotMatch(u.text(),/Published MV|已下架/);
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
 const u=await mount(t,{delay:true});u.button().onClick();await u.flush();await u.switchUser();u.resolve();await u.flush();assert.equal(u.refreshed(),0);assert.equal(u.closed(),0);assert.doesNotMatch(u.text(),/作品已永久刪除/);
});

for(const lang of ['en','ja','ko'])test(`deletion labels and confirmation are localized (${lang})`,async t=>{
 const u=await mount(t,{lang,confirmed:false});u.button().onClick();await u.flush();assert.equal(u.confirms.length,1);assert.match(u.confirms[0],/Published MV/);assert.doesNotMatch(u.confirms[0],/確定刪除/);
});

test('previously unpublished works can also be permanently deleted',async t=>{
 const u=await mount(t,{active:false});assert.equal(u.button().disabled,false);u.button().onClick();await u.flush();assert.equal(u.button(),undefined);assert.equal(u.refreshed(),1);
});

test('old clients without the permanent confirmation cannot delete data',async()=>{
 const a=removalAdmin();const r=await route(a)(request({trackId:uuid(2)}));assert.equal(r.status,409);assert.equal(a.calls.length,0);
});
