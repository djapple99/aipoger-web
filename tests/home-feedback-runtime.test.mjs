import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { homeCopy } from '../src/lib/home-copy.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../src/components/home-work-feedback.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):typeof x==='string'?x:'';
async function mount(t,{signedIn=true,failWrite=false}={}) {
 const session=signedIn?{access_token:'test-token',user:{id:'reader',user_metadata:{display_name:'Listener'}}}:null;
 let cursor=0,tree,dirty=true,changed=0;const states=[],refs=[],effects=[],requests=[];
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},useRef(){return refs[cursor++]??={current:{showModal(){},close(){}}};},useEffect(fn){const i=cursor++;if(!effects[i])effects[i]={cleanup:fn()};}};
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'next/link':{__esModule:true,default:'link'},'lucide-react':{Heart:'Heart',X:'X'},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/home-copy':{homeCopy},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:null,error:null})};return q;}}}};
 const fetch=async(url,init={})=>{requests.push({url,...init});const post=init.method==='POST';return {ok:!(post&&failWrite),status:post&&failWrite?500:200,json:async()=>post?url.endsWith('reaction')?{heartedToday:true}:{comment:{id:'saved',name:'Listener',text:JSON.parse(init.body).text}}:{comments:[{id:'public',name:'Creator fan',text:'Real public comment'}]}};};
 const loaded={exports:{}};const window=new EventTarget();const document={activeElement:null};
 class HTMLElement{};class CustomEvent extends Event{constructor(type,init){super(type);this.detail=init.detail;}}
 new Function('require','module','exports','fetch','window','document','HTMLElement','CustomEvent',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,fetch,window,document,HTMLElement,CustomEvent);
 function render(){cursor=0;dirty=false;tree=loaded.exports.default({work:{id:'target-work',title:'The MV',artist:'Creator'},onClose(){},onChange(){changed++;}});}
 async function flush(){for(let i=0;i<6;i++){await new Promise(setImmediate);if(dirty)render();}}
 render();await flush();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {requests,flush,changed:()=>changed,text:()=>text(tree),find:type=>nodes(tree).find(x=>x.type===type)?.props,button:label=>nodes(tree).find(x=>x.type==='button'&&text(x)===label)?.props};
}
test('homepage feedback reads public comments but guests cannot send a write',async t=>{
 const ui=await mount(t,{signedIn:false});assert.ok(ui.text().includes('Real public comment'));assert.equal(ui.find('textarea'),undefined);assert.equal(ui.requests.some(r=>r.method==='POST'),false);assert.ok(ui.find('link').href.startsWith('/auth?'));
});
test('homepage comments retain the work identity and authenticated author; successful comments appear only after save',async t=>{
 const ui=await mount(t);ui.find('textarea').onChange({target:{value:'The chorus and rain scene work together.'}});await ui.flush();ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 const request=ui.requests.find(r=>r.method==='POST');assert.equal(request.url,'/api/listen-bar/track-comments');assert.deepEqual(JSON.parse(request.body),{trackId:'target-work',displayName:'Listener',text:'The chorus and rain scene work together.'});assert.equal(request.headers.Authorization,'Bearer test-token');assert.equal(ui.find('textarea').value,'');assert.ok(ui.text().includes('The chorus and rain scene work together.'));assert.equal(ui.changed(),1);
});
test('failed comment submission preserves the draft and does not invent a saved comment',async t=>{
 const ui=await mount(t,{failWrite:true});ui.find('textarea').onChange({target:{value:'Keep this draft'}});await ui.flush();ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(ui.find('textarea').value,'Keep this draft');assert.equal(ui.changed(),0);assert.ok(ui.text().includes(homeCopy('zh').feedbackError));
});
test('homepage hearts reuse the existing reaction endpoint and refresh discovery after confirmation',async t=>{
 const ui=await mount(t);ui.button('送出愛心與收藏').onClick();await ui.flush();const request=ui.requests.find(r=>r.method==='POST');assert.equal(request.url,'/api/listen-bar/reaction');assert.deepEqual(JSON.parse(request.body),{trackId:'target-work',reaction:'heart'});assert.equal(ui.button('取消今日愛心與收藏')['aria-pressed'],true);assert.equal(ui.changed(),1);
});
