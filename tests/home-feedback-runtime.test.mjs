import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { mvCopy } from '../src/lib/mv-copy.ts';
import { homeCopy } from '../src/lib/home-copy.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../src/components/home-work-feedback.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):typeof x==='string'?x:'';
async function mount(t,{signedIn=true,failWrite=false,showVideo=false,commentsBelow=false,hasVideo=showVideo}={}) {
 const session=signedIn?{access_token:'test-token',user:{id:'reader',user_metadata:{display_name:'Listener'}}}:null;
 let cursor=0,tree,dirty=true,changed=0,toggles=0;const states=[],refs=[],effects=[],requests=[];let publicComments=[{id:"public",name:"Creator fan",text:"Real public comment"}];const player={playing:true};let scrolls=0,commentTop=commentsBelow?800:0;const scrollListeners=[];
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},useRef(){return refs[cursor++]??={current:{showModal(){},close(){},getBoundingClientRect(){return {top:commentTop,bottom:500}},addEventListener(type,fn){scrollListeners.push(fn)},removeEventListener(){},scrollIntoView(){scrolls++;commentTop=40;scrollListeners.forEach(fn=>fn())}}};},useEffect(fn,deps=[]){const i=cursor++;if(!effects[i]||deps.some((value,j)=>!Object.is(value,effects[i].deps[j]))){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};}}};
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'next/link':{__esModule:true,default:'link'},'lucide-react':{ArrowDown:'ArrowDown',Heart:'Heart',Play:'Play',X:'X'},'@/components/mv-player':{__esModule:true,default:'mv-player'},'@/components/mv-rating-form':{__esModule:true,default:'rating-form'},'@/components/work-image':{__esModule:true,default:'work-image'},'@/lib/music-player-store':{useMusicPlayer:()=>player,musicPlayer:{toggle(){toggles++;player.playing=false;}}},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:null,error:null})};return q;}}}};
 const fetch=async(url,init={})=>{requests.push({url,...init});const post=init.method==='POST';return {ok:!(post&&failWrite),status:post&&failWrite?500:200,json:async()=>post?url.endsWith('reaction')?{heartedToday:true}:{comment:{id:'saved',name:'Listener',text:JSON.parse(init.body).text}}:{comments:publicComments.map(comment=>({...comment}))}};};
 const loaded={exports:{}};const window=new EventTarget();window.matchMedia=()=>({matches:false});const document={activeElement:null};
 class HTMLElement{};class CustomEvent extends Event{constructor(type,init){super(type);this.detail=init.detail;}}
 new Function('require','module','exports','fetch','window','document','HTMLElement','CustomEvent',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,fetch,window,document,HTMLElement,CustomEvent);
 function render(){cursor=0;dirty=false;tree=loaded.exports.default({work:{id:'target-work',title:'The MV',artist:'Creator',videoId:hasVideo?'MdxaU0l3FzI':null,youtubeUrl:'https://www.youtube.com/watch?v=MdxaU0l3FzI'},showVideo,onClose(){},onChange(){changed++;}});}
 async function flush(){for(let i=0;i<6;i++){await new Promise(setImmediate);if(dirty)render();}}
 render();await flush();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {setPublicComments(value){publicComments=value;},persistComment(item){publicComments=[...publicComments,item];nodes(tree).find(x=>x.type==='rating-form').props.onSaved(item);},scrolls:()=>scrolls,requests,flush,toggles:()=>toggles,changed:()=>changed,text:()=>text(tree),find:type=>nodes(tree).find(x=>x.type===type)?.props,button:label=>nodes(tree).find(x=>x.type==='button'&&(text(x)===label||x.props['aria-label']===label))?.props};
}
test('homepage feedback reads public comments but guests cannot send a write',async t=>{
 const ui=await mount(t,{signedIn:false});assert.ok(ui.text().includes('Real public comment'));assert.equal(ui.find('textarea'),undefined);assert.equal(ui.requests.some(r=>r.method==='POST'),false);assert.ok(ui.find('link').href.startsWith('/auth?'));
});
test('song feedback uses the shared decimal rating form and saved comments retain the original work',async t=>{
 const ui=await mount(t);const rating=ui.find('rating-form');assert.equal(rating.trackId,'target-work');assert.equal(rating.surface,'music');assert.equal(rating.signedIn,true);assert.equal(ui.find('textarea'),undefined);
 ui.persistComment({id:'saved',name:'Listener',text:'The chorus and rain scene work together.'});await ui.flush();assert.ok(ui.text().includes('The chorus and rain scene work together.'));assert.equal(ui.changed(),1);
});
test('homepage hearts reuse the existing reaction endpoint and refresh discovery after confirmation',async t=>{
 const ui=await mount(t);ui.button('送出愛心與收藏').onClick();await ui.flush();const request=ui.requests.find(r=>r.method==='POST');assert.equal(request.url,'/api/listen-bar/reaction');assert.deepEqual(JSON.parse(request.body),{trackId:'target-work',reaction:'heart'});assert.equal(ui.button('取消今日愛心與收藏')['aria-pressed'],true);assert.equal(ui.changed(),1);
});

test('MV feedback shares one persistent player and puts rating input before public comments',async t=>{
 const ui=await mount(t,{showVideo:true});assert.equal(ui.find('iframe'),undefined);
 assert.equal(ui.find('mv-player').autoPlay,false);assert.equal(ui.find('rating-form').trackId,'target-work');
 ui.persistComment({id:'new',name:'Listener',text:'Saved impression'});await ui.flush();assert.ok(ui.text().includes('Saved impression'));assert.equal(ui.changed(),1);
});

test('MV comment cue jumps within the dialog and hides once comments are visible without losing a draft',async t=>{
 const ui=await mount(t,{showVideo:true,commentsBelow:true});assert.ok(ui.button(mvCopy('zh').scrollComments));
 ui.button(mvCopy('zh').scrollComments).onClick();await ui.flush();assert.equal(ui.scrolls(),1);assert.equal(ui.button(mvCopy('zh').scrollComments),undefined);assert.equal(ui.find('rating-form').trackId,'target-work');assert.equal(ui.requests.some(r=>r.method==='POST'),false);
});

test('homepage MV feedback retains MV eligibility even when the video player is not displayed',async t=>{
 const ui=await mount(t,{hasVideo:true,showVideo:false});assert.equal(ui.find('rating-form').surface,'mv');assert.equal(ui.find('mv-player'),undefined);
});

test('editing and withdrawing a saved review refreshes the visible comment list without closing the dialog',async t=>{
 const ui=await mount(t);const rating=ui.find('rating-form');
 ui.setPublicComments([{id:'public',name:'Creator fan',text:'Updated feeling after a second listen'}]);
 rating.onSaved(null);await ui.flush();assert.ok(ui.text().includes('Updated feeling after a second listen'));assert.equal(ui.text().includes('Real public comment'),false);
 ui.setPublicComments([]);ui.find('rating-form').onSaved(null);await ui.flush();assert.equal(ui.text().includes('Updated feeling'),false);assert.equal(ui.changed(),2);
 assert.equal(ui.requests.filter(r=>r.url.startsWith('/api/listen-bar/track-comments')).length,3);
});
