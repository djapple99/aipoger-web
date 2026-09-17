import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/choice-runtime.mjs";
import * as taskLib from "../src/lib/admin-tasks.ts";

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function mount(t) {
  let cursor=0,dirty=true,current,callback,session=null,path="/rank",queue=[];
  const states=[],refs=[],effects=[],calls=[];
  const win=new EventTarget(),doc=new EventTarget();doc.visibilityState="visible";
  const restore=[];
  for(const [key,value] of [["window",win],["document",doc]]){const before=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});restore.push(()=>{if(before)Object.defineProperty(globalThis,key,before);else delete globalThis[key];});}
  let count=2,fail=false,delay;
  t.mock.method(globalThis,"fetch",async(url,init)=>{
    calls.push({url,token:init.headers.Authorization});
    if(delay)return delay;
    if(fail)throw Error("offline");
    return {ok:true,status:200,json:async()=>({counts:Object.fromEntries(taskLib.ADMIN_TASKS.map(t=>[t.id,t.id==="charts"?count:0])),checkedAt:"now"})};
  });
  const react={useState(init){const i=cursor++;if(!(i in states))states[i]=init;return [states[i],n=>{states[i]=typeof n==="function"?n(states[i]):n;dirty=true;}];},useRef(init){return refs[cursor++]??={current:init};},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,j)=>v!==effects[i].deps[j]))queue.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}};
  const hook=loadTs("src/lib/use-admin-tasks.ts",{react,"next/navigation":{usePathname:()=>path},"@/lib/admin-tasks":taskLib,"@/lib/admin-emails":{isAdminEmail:email=>email==="owner@test"},"@/lib/supabase":{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}}}}});
  const render=()=>{cursor=0;dirty=false;queue=[];current=hook.useAdminTasks();queue.forEach(fn=>fn());};
  render();t.after(()=>{effects.forEach(e=>e?.cleanup?.());restore.forEach(fn=>fn());});
  return {calls,win,doc,get state(){return current;},set count(n){count=n;},set fail(n){fail=n;},set delay(n){delay=n;},login(id,email="owner@test"){session=id?{user:{id,email},access_token:id}:null;callback("SIGNED_IN",session);},navigate(p){path=p;render();},async flush(){for(let i=0;i<8;i++){await tick();if(dirty)render();}}};
}
test("owner badge refreshes on focus/routes, survives transient failure and clears only confirmed completion",async(t)=>{
  const ui=mount(t);await ui.flush();assert.equal(ui.calls.length,0);
  ui.login("owner");await ui.flush();assert.equal(taskLib.adminTaskTotal(ui.state.data),2);
  ui.fail=true;ui.win.dispatchEvent(new Event("focus"));await ui.flush();assert.equal(taskLib.adminTaskTotal(ui.state.data),2);assert.equal(ui.state.unavailable,true);
  ui.fail=false;ui.count=0;ui.navigate("/admin/charts");await ui.flush();assert.equal(taskLib.adminTaskTotal(ui.state.data),0);
  const n=ui.calls.length;ui.doc.visibilityState="hidden";ui.win.dispatchEvent(new Event("focus"));await ui.flush();assert.equal(ui.calls.length,n);
  ui.login("other","person@test");await ui.flush();assert.equal(ui.state.data,null);
});
test("late owner response cannot put private task badge on a signed-out or switched account",async(t)=>{
  const ui=mount(t);await ui.flush();let resolve;ui.delay=new Promise(r=>{resolve=r});ui.login("owner");await ui.flush();
  ui.login(null);resolve({ok:true,status:200,json:async()=>({counts:{charts:99},checkedAt:"late"})});await ui.flush();assert.equal(ui.state.data,null);
});
