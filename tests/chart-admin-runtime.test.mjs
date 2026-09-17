import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code=ts.transpileModule(readFileSync(new URL("../src/app/admin/charts/page.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const text=n=>Array.isArray(n)?n.map(text).join(""):n&&typeof n==="object"?text(n.props?.children):n==null||typeof n==="boolean"?"":String(n);
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==="object"?[n,...nodes(n.props?.children)]:[];
const tick=()=>new Promise(r=>setImmediate(r));
function mount(t,{locked=false,fail=false}={}){
  const tracks=["a","b"].map(id=>({id,title:`Song ${id}`,artist:"Artist",genre:"EDM",rank:null,supporterCount:3,rankPending:true,audioUrl:`/${id}.mp3`,coverUrl:"/cover.png"}));
  let payload={chart:{month:"2026-09",availableMonths:["2026-09"],tracks},groups:[{supporterCount:3,memberIds:["a","b"],orderedIds:locked?["a","b"]:null,locked,tracks:tracks.map(x=>({...x,rank:1}))}],duplicates:[],history:[],pendingMonths:[{month:"2026-09",count:1}]};
  let cursor=0,dirty=true,tree,effectQueue=[],alive=true,callback;
  const states=[],effects=[],refs=[],memos=[],writes=[],starts=[];
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
  const react={
    useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],value=>{if(!alive)return;states[i]=typeof value==="function"?value(states[i]):value;dirty=true;}];},
    useRef(initial){return refs[cursor++]??={current:initial};},
    useEffect(fn,deps){const i=cursor++;if(!effects[i]||!same(deps,effects[i].deps))effectQueue.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
    useCallback(fn,deps){const i=cursor++;if(!memos[i]||!same(deps,memos[i].deps))memos[i]={deps,fn};return memos[i].fn;},
  };
  const session={user:{id:"owner"},access_token:"test-only"};
  const modules={react,"react/jsx-runtime":{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:"fragment"},
    "next/link":{default:"Link"},"lucide-react":Object.fromEntries(["ArrowDown","ArrowUp","ListMusic","Pause","Play","RefreshCw","Save","ShieldCheck","Trash2"].map(x=>[x,x])),
    "@/lib/brand":{AIPOGER_BRAND_LOGO:"/brand.png"},
    "@/lib/supabase":{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
    "@/lib/music-player-store":{musicPlayer:{start:async(...args)=>starts.push(args),toggle(){}},useMusicPlayer:()=>({playing:false,session:null})},
  };
  const fetch=async(url,init)=>{
    if(init.method==="PATCH"){
      const body=JSON.parse(init.body);writes.push({url,body});
      if(fail)return {ok:false,status:409,json:async()=>({error:"支持數已變動"})};
      payload={...payload,groups:[{...payload.groups[0],orderedIds:body.orderedIds}],pendingMonths:[]};
    }
    return {ok:true,status:200,json:async()=>structuredClone(payload)};
  };
  const loaded={exports:{}};
  new Function("require","module","exports","fetch","window",code)(name=>{assert.ok(name in modules,name);return modules[name]},loaded,loaded.exports,fetch,{confirm:()=>false});
  const render=()=>{cursor=0;dirty=false;effectQueue=[];tree=loaded.exports.default();effectQueue.forEach(fn=>fn());};
  render();t.after(()=>{alive=false;effects.forEach(e=>e?.cleanup?.());});
  return {writes,starts,callback,async flush(){for(let i=0;i<15;i++){await tick();if(dirty)render();}},text:()=>text(tree),button:label=>{const n=nodes(tree).find(n=>n.type==="button"&&(n.props["aria-label"]===label||text(n.props.children)===label));assert.ok(n,label);return n.props;}};
}

test("owner UI previews reorder, saves selected IDs and plays actual song through shared player",async(t)=>{
  const ui=mount(t);await ui.flush();
  assert.match(ui.text(),/待裁定/);
  ui.button("下移 Song a").onClick();await ui.flush();
  ui.button("播放 Song b").onClick();assert.equal(ui.starts[0][0][0].audioUrl,"/b.mp3");
  await ui.button("儲存排序").onClick();await ui.flush();
  assert.deepEqual(ui.writes[0].body.orderedIds,["b","a"]);assert.match(ui.text(),/已儲存/);
});
test("settled owner controls are disabled and a conflict unlocks retry without claiming saved",async(t)=>{
  const frozen=mount(t,{locked:true});await frozen.flush();assert.equal(frozen.button("儲存排序").disabled,true);assert.equal(frozen.button("下移 Song a").disabled,true);
  const ui=mount(t,{fail:true});await ui.flush();await ui.button("儲存排序").onClick();await ui.flush();
  assert.match(ui.text(),/支持數已變動/);assert.doesNotMatch(ui.text(),/已儲存/);assert.equal(ui.button("儲存排序").disabled,false);
});
