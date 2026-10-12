import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compiled=ts.transpileModule(readFileSync(new URL('../src/lib/use-mv-hearts.ts',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText;
const sessionFor=id=>id?{access_token:`token-${id}`,user:{id}}:null;
async function mount(t,{user='listener',rows=[{track_id:'target'}],readFailed=false,writeFailed=false}={}) {
 let session=sessionFor(user),cursor=0,dirty=true,value,authListener;
 let pauseRead=null,pauseWrite=null;
 const states=[],refs=[],memos=[],effects=[],reads=[],writes=[],events=[];
 const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},
  useRef(initial){return refs[cursor++]??={current:initial};},
  useCallback(fn,deps){const i=cursor++;if(!memos[i]||deps.some((d,n)=>d!==memos[i].deps[n]))memos[i]={fn,deps};return memos[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((d,n)=>d!==effects[i].deps[n])){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};}},
 };
 const supabase={auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){authListener=fn;return{data:{subscription:{unsubscribe(){}}}};}},from(table){
  const read={table,filters:{}};const q={select(columns){read.columns=columns;return q;},eq(key,v){read.filters[key]=v;return q;},async in(key,ids){read.filters[key]=ids;reads.push(read);if(pauseRead){const pending=pauseRead;pauseRead=null;return pending;}return{data:structuredClone(rows),error:readFailed?new Error('Read failed'):null};}};return q;
 }};
 const window=new EventTarget(),document=new EventTarget();document.hidden=false;window.setInterval=()=>1;window.clearInterval=()=>{};
 class CustomEvent extends Event{constructor(type,init){super(type);this.detail=init.detail;}}
 window.addEventListener('aipoger:music-heart',e=>events.push(e.detail));
 const fetch=async(url,init)=>{writes.push({url,...init});if(pauseWrite){const pending=pauseWrite;pauseWrite=null;return pending;}return{ok:!writeFailed,status:writeFailed?500:200,json:async()=>({ok:true,heartedToday:false,favoriteSynced:true,counts:{heart:99}})};};
 const modules={react,'./supabase':{supabase}};const loaded={exports:{}};
 new Function('require','module','exports','fetch','window','document','CustomEvent',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,fetch,window,document,CustomEvent);
 function render(){cursor=0;dirty=false;value=loaded.exports.useMvHearts(['target','other','target']);}
 async function flush(){for(let i=0;i<8;i++){await new Promise(setImmediate);if(dirty)render();}}
 render();await flush();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {get value(){return value;},reads,writes,events,flush,
  async auth(user){session=sessionFor(user);authListener(user?'SIGNED_IN':'SIGNED_OUT',session);await flush();},
  setReadFailed(v){readFailed=v;},setWriteFailed(v){writeFailed=v;},
  pauseRead(){let resolve;pauseRead=new Promise(r=>resolve=r);return resolve;},
  pauseWrite(){let resolve;pauseWrite=new Promise(r=>resolve=r);return resolve;},
  sync(id,hearted){window.dispatchEvent(new CustomEvent('aipoger:music-heart',{detail:{trackId:id,heartedToday:hearted}}));},
 };
}

test('MV hearts read the current member daily state in a batch rather than one query per card',async t=>{
 const ui=await mount(t);assert.equal(ui.value.ready,true);assert.equal(ui.value.hearts.target,true);assert.equal(ui.reads.length,1);
 const read=ui.reads[0];assert.equal(read.table,'listen_bar_track_reactions');assert.equal(read.filters.user_id,'listener');assert.equal(read.filters.reaction,'heart');
 assert.match(read.filters.vote_date,/^\d{4}-\d{2}-\d{2}$/);assert.deepEqual(read.filters.track_id,['other','target']);
});
test('MV guests go to login without writing a reaction',async t=>{
 const ui=await mount(t,{user:null});assert.equal(await ui.value.toggle('target'),'login');await ui.flush();assert.equal(ui.writes.length,0);assert.equal(ui.events.length,0);
});
test('direct MV hearts reuse authenticated reaction and favorite synchronization; cancellation uses the confirmed daily state',async t=>{
 const ui=await mount(t);assert.equal(await ui.value.toggle('target'),'done');await ui.flush();
 assert.equal(ui.writes.length,1);assert.equal(ui.writes[0].url,'/api/listen-bar/reaction');
 assert.equal(ui.writes[0].headers.Authorization,'Bearer token-listener');assert.deepEqual(JSON.parse(ui.writes[0].body),{trackId:'target',reaction:'heart'});
 assert.equal(ui.value.hearts.target,false);assert.equal(ui.events[0].favoriteSynced,true);
 assert.equal('supporterCount' in ui.value,false,'daily total must not replace the public weekly supporter count');
});
test('double clicks cannot submit two toggles while the first reaction is pending',async t=>{
 const ui=await mount(t);const resolve=ui.pauseWrite();const first=ui.value.toggle('target');await ui.flush();
 assert.equal(ui.value.busyId,'target');assert.equal(await ui.value.toggle('target'),'ignored');assert.equal(await ui.value.toggle('other'),'ignored');assert.equal(ui.writes.length,1);
 resolve({ok:true,status:200,json:async()=>({ok:true,heartedToday:false})});await first;await ui.flush();assert.equal(ui.value.busyId,null);
});
test('failed reads block ambiguous toggles and can retry; failed writes preserve the last confirmed heart',async t=>{
 const ui=await mount(t,{readFailed:true});assert.equal(ui.value.error,'read');assert.equal(await ui.value.toggle('target'),'ignored');assert.equal(ui.writes.length,0);
 ui.setReadFailed(false);await ui.value.reload();await ui.flush();assert.equal(ui.value.hearts.target,true);
 ui.setWriteFailed(true);await ui.value.toggle('target');await ui.flush();assert.equal(ui.value.error,'write');assert.equal(ui.value.hearts.target,true);assert.equal(ui.events.length,0);
});
test('account changes clear private hearts and discard older query and write responses',async t=>{
 const ui=await mount(t);const resolveRead=ui.pauseRead();const read=ui.value.reload();await ui.flush();await ui.auth(null);
 resolveRead({data:[{track_id:'target'}],error:null});await read;await ui.flush();assert.deepEqual(ui.value.hearts,{});
 await ui.auth('listener');const resolveWrite=ui.pauseWrite();const write=ui.value.toggle('target');await ui.flush();await ui.auth(null);
 resolveWrite({ok:true,status:200,json:async()=>({ok:true,heartedToday:true})});await write;await ui.flush();assert.deepEqual(ui.value.hearts,{});assert.equal(ui.events.length,0);
});
test('confirmed hearts from the shared player or comment dialog also update MV cards',async t=>{
 const ui=await mount(t);ui.sync('other',true);await ui.flush();assert.equal(ui.value.hearts.other,true);ui.sync('target',false);await ui.flush();assert.equal(ui.value.hearts.target,false);
});
