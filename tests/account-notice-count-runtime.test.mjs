import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/choice-runtime.mjs';
function mount(t) {
  let cursor=0,dirty=true,value,uid='alice',queue=[],callback,reply={unreadCount:1},fail=false,delay;
  const states=[],effects=[],restore=[];const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';win.setInterval=()=>1;win.clearInterval=()=>{};
  for(const[k,v]of [['window',win],['document',doc]]){const descriptor=Object.getOwnPropertyDescriptor(globalThis,k);Object.defineProperty(globalThis,k,{value:v,configurable:true});restore.push(()=>descriptor?Object.defineProperty(globalThis,k,descriptor):delete globalThis[k]);}
  const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=v;dirty=true}]},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,j)=>v!==effects[i].deps[j]))queue.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}})}};
  const hook=loadTs('src/lib/use-account-notices.ts',{react,'@/lib/account-notifications-client':{accountNoticeRequest:async()=>{if(delay)return delay;if(fail)throw Error('offline');return reply}},'@/lib/supabase':{supabase:{channel:()=>{const ch={on(_event,filter,fn){assert.equal(filter.event,'*');callback=fn;return ch},subscribe(){return ch}};return ch},removeChannel:()=>{}}}});
  const render=()=>{cursor=0;dirty=false;queue=[];value=hook.useAccountNotices(uid);queue.forEach(fn=>fn())};render();t.after(()=>{effects.forEach(e=>e?.cleanup?.());restore.forEach(fn=>fn())});
  return {win,doc,get value(){return value},set count(n){reply={unreadCount:n}},set fail(v){fail=v},set delay(v){delay=v},switchUser(id){uid=id;render()},change(){callback()},async flush(){for(let i=0;i<8;i++){await new Promise(setImmediate);if(dirty)render()}}};
}
test('badge uses confirmed persisted count, survives failures, refreshes across reads and realtime updates',async t=>{
  const ui=mount(t);await ui.flush();assert.equal(ui.value,1);
  ui.fail=true;ui.win.dispatchEvent(new Event('aipoger:account-notices-read'));await ui.flush();assert.equal(ui.value,1);
  ui.fail=false;ui.count=0;ui.win.dispatchEvent(new Event('aipoger:account-notices-read'));await ui.flush();assert.equal(ui.value,0);
  ui.count=2;ui.change();await ui.flush();assert.equal(ui.value,2);
  ui.count=0;ui.win.dispatchEvent(new Event('focus'));await ui.flush();assert.equal(ui.value,0);
});
test('late responses cannot restore another account badge after sign out or account switch',async t=>{
  const ui=mount(t);await ui.flush();let resolve;ui.delay=new Promise(r=>resolve=r);ui.win.dispatchEvent(new Event('focus'));
  ui.switchUser(null);assert.equal(ui.value,0);resolve({unreadCount:99});await ui.flush();assert.equal(ui.value,0);
  ui.delay=null;ui.count=3;ui.switchUser('bob');assert.equal(ui.value,0);await ui.flush();assert.equal(ui.value,3);
});

test('confirmed inbox acknowledgement clears the badge immediately and stale count requests cannot revive it',async t=>{
 const ui=mount(t);await ui.flush();assert.equal(ui.value,1);
 let resolveOld,resolveNew;ui.delay=new Promise(r=>resolveOld=r);ui.win.dispatchEvent(new Event('focus'));
 ui.delay=new Promise(r=>resolveNew=r);
 ui.win.dispatchEvent(new CustomEvent('aipoger:account-notices-read',{detail:{userId:'alice',unreadCount:0}}));await ui.flush();assert.equal(ui.value,0);
 resolveOld({unreadCount:1});await ui.flush();assert.equal(ui.value,0);
 resolveNew({unreadCount:2});await ui.flush();assert.equal(ui.value,2,'a new notice still updates the badge');
 ui.fail=true;ui.delay=null;ui.win.dispatchEvent(new CustomEvent('aipoger:account-notices-read',{detail:{userId:'bob',unreadCount:0}}));await ui.flush();assert.equal(ui.value,2,'another account cannot clear this badge');
});

test('acknowledging in a hidden tab also invalidates its older pending badge read',async t=>{
 const ui=mount(t);await ui.flush();let resolve;ui.delay=new Promise(r=>resolve=r);ui.win.dispatchEvent(new Event('focus'));
 ui.doc.visibilityState='hidden';ui.win.dispatchEvent(new CustomEvent('aipoger:account-notices-read',{detail:{userId:'alice',unreadCount:0}}));await ui.flush();assert.equal(ui.value,0);
 resolve({unreadCount:5});await ui.flush();assert.equal(ui.value,0);
});
