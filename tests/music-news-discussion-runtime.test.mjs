import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadTs } from './helpers/choice-runtime.mjs';
const copyModule = loadTs('src/lib/music-news-discussion.ts');
const code = ts.transpileModule(readFileSync(new URL('../src/components/music-news-discussion.tsx',import.meta.url),'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX } }).outputText;
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n==='object' ? [n,...nodes(n.props?.children)] : [];
const text = n => Array.isArray(n) ? n.map(text).join('') : n && typeof n==='object' ? text(n.props?.children) : n == null || typeof n==='boolean' ? '' : String(n);
function mount(t,{guest=false,lang='zh'}={}) {
  let cursor=0,dirty=true,tree,queue=[],authChange,failPost=false,failGet=false,failAfterSave=false;
  let session=guest?null:{user:{id:'member'},access_token:'test-token'};
  const state=[],refs=[],effects=[],memo=[],requests=[],saved=new Map(); let liked=false;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;dirty=true;}];},
    useRef(initial){return refs[cursor++]??={current:initial};},
    useMemo(fn,deps){const i=cursor++;if(!memo[i]||!same(memo[i].deps,deps))memo[i]={deps,value:fn()};return memo[i].value;},
    useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=cursor++;if(!effects[i]||!same(effects[i].deps,deps))queue.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
  };
  const comment={id:'c1',displayName:'Public stage',body:'A different view',createdAt:'2026-10-26T10:00:00Z'};
  const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'lucide-react':{},
    '@/components/report-button':{default:'Report'},'@/lib/music-news-discussion':copyModule,'@/lib/auth-urls':{rememberAuthNextPath(){}},
    '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{authChange=fn;return{data:{subscription:{unsubscribe(){}}}};}}}},
  };
  const window={location:{pathname:'/news/youtube-music-ai-labels',search:`?lang=${lang}`,hash:'',assign:url=>requests.push({redirect:url})}};
  const fetch=async(url,init={})=>{
    requests.push({url,...init});
    if(init.method==='PUT'){liked=JSON.parse(init.body).liked;return{ok:true,status:200,json:async()=>({liked,likeCount:liked?3:2})};}
    if(init.method==='POST'){
      if(failPost)throw new Error('offline'); const payload=JSON.parse(init.body);
      if(!saved.has(payload.requestId))saved.set(payload.requestId,{...comment,id:payload.requestId,body:payload.body});
      if(failAfterSave){failAfterSave=false;throw new Error('response lost after commit');}
      return{ok:true,status:201,json:async()=>({comment:saved.get(payload.requestId),commentCount:saved.size+1})};
    }
    if(failGet)throw new Error('offline');
    return{ok:true,status:200,json:async()=>({comments:[...saved.values(),comment],commentCount:1+saved.size,likeCount:liked?3:2,liked,signedIn:!!session,viewerName:session?'Saved stage name':null,nextCursor:null})};
  };
  const loaded={exports:{}};
  new Function('require','module','exports','fetch','window',code)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,fetch,window);
  const render=()=>{cursor=0;dirty=false;queue=[];tree=loaded.exports.default({slug:'youtube-music-ai-labels',title:'News title',lang});queue.forEach(fn=>fn());};
  render();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
  return{requests,saved,setFailPost:v=>failPost=v,setFailGet:v=>failGet=v,loseResponse:()=>failAfterSave=true,
    auth(event,next){session=next;authChange(event,next);},
    async flush(){for(let i=0;i<10;i++){await new Promise(r=>setImmediate(r));if(dirty)render();}},
    all:()=>nodes(tree),text:()=>text(tree),
    find(type,label){const n=nodes(tree).find(n=>n.type===type&&(!label||n.props['aria-label']===label||text(n.props.children).startsWith(label)));assert.ok(n,`${type} ${label}`);return n.props;},
  };
}
test('news public discussion has no modal; all guest participation routes through sign-in with exact article and language',async t=>{
  const ui=mount(t,{guest:true});await ui.flush();assert.match(ui.text(),/A different view/);assert.equal(ui.all().some(n=>n.type==='textarea'),false);
  ui.find('button','按讚').onClick();assert.match(ui.requests.at(-1).redirect,/\/auth\?lang=zh&next=%2Fnews%2Fyoutube-music-ai-labels%3Flang%3Dzh%23news-discussion/);
  assert.equal(ui.requests.some(r=>r.method),false);assert.equal(ui.all().some(n=>n.props.role==='dialog'),false);
});
test('news like uses authoritative state and rejects double clicks without inflating a count',async t=>{
  const ui=mount(t);await ui.flush();const like=ui.find('button','按讚');await Promise.all([like.onClick(),like.onClick()]);await ui.flush();
  assert.equal(ui.requests.filter(r=>r.method==='PUT').length,1);assert.equal(ui.find('button','已按讚')['aria-pressed'],true);
  await ui.find('button','已按讚').onClick();await ui.flush();assert.equal(ui.find('button','按讚')['aria-pressed'],false);
});
test('news retains drafts on same-account focus/refresh and failure; lost-response retry stores only one comment',async t=>{
  const ui=mount(t);await ui.flush();ui.find('textarea').onChange({target:{value:'我想提出另一個觀點'}});await ui.flush();
  ui.auth('SIGNED_IN',{user:{id:'member'},access_token:'refreshed'});await ui.flush();assert.equal(ui.find('textarea').value,'我想提出另一個觀點');
  ui.setFailPost(true);await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(ui.find('textarea').value,'我想提出另一個觀點');assert.match(ui.text(),/暫時無法完成/);
  const firstId=JSON.parse(ui.requests.filter(r=>r.method==='POST')[0].body).requestId;
  ui.setFailPost(false);ui.loseResponse();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(ui.saved.size,1);assert.equal(ui.find('textarea').value,'我想提出另一個觀點');
  await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(ui.saved.size,1);assert.equal(ui.find('textarea').value,'');assert.match(ui.text(),/留言已送出/);
  assert.ok(ui.requests.filter(r=>r.method==='POST').every(r=>JSON.parse(r.body).requestId===firstId));
});
test('news clears private drafts on sign-out or account switch, and failed reads never claim zero likes',async t=>{
  const ui=mount(t);await ui.flush();ui.find('textarea').onChange({target:{value:'private draft'}});await ui.flush();
  ui.auth('SIGNED_OUT',null);await ui.flush();assert.equal(ui.all().some(n=>n.type==='textarea'),false);assert.ok(!ui.text().includes('private draft'));
  ui.auth('SIGNED_IN',{user:{id:'different'},access_token:'new'});await ui.flush();assert.equal(ui.find('textarea').value,'');
  const failed=mount(t,{guest:true});failed.setFailGet(true);await failed.flush();assert.equal(failed.find('button','按讚').disabled,true);assert.match(failed.text(),/—/);assert.ok(!failed.text().includes('按讚0'));
});
test('news discussion transcreates actions and sign-in guidance in all supported UI languages',async t=>{
  for(const lang of ['en','ja','ko']){const ui=mount(t,{guest:true,lang});await ui.flush();assert.ok(ui.text().includes(copyModule.newsDiscussionCopy[lang].hint));assert.ok(ui.find('button',copyModule.newsDiscussionCopy[lang].signIn));}
});
