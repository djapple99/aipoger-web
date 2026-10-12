import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { homeCopy } from '../src/lib/home-copy.ts';
import {mvCopy} from '../src/lib/mv-copy.ts';
import {filterMvWorks} from '../src/lib/mv-discovery.ts';
const source=readFileSync(new URL('../src/components/mv-gallery.tsx',import.meta.url),'utf8');
const headerSource=readFileSync(new URL('../src/components/editorial-header.tsx',import.meta.url),'utf8');
const headerCompiled=ts.transpileModule(headerSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):x==null||typeof x==='boolean'?'':String(x);
const work={id:'actual-work',title:'Real Song',artist:'Real Creator',genre:'EDM 百大電音',description:'A real description',coverUrl:'/cover.jpg',audioUrl:'/song.mp3',lyrics:'Lyrics',videoId:'MdxaU0l3FzI',youtubeUrl:'https://www.youtube.com/watch?v=MdxaU0l3FzI',supporterCount:2,publishedAt:'2026-10-13'};
async function mount(t,lang='zh',payload={featureKind:'community',featured:[work],works:[work],channels:[]},unavailable=false) {
 let cursor=0,tree,dirty=true; const states=[],effects=[],memos=[],starts=[]; let toggles=0,fail=unavailable;
 const react={
  useRef:()=>({current:null}),
  useState(initial){const i=cursor++; if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},
  useEffect(fn,deps){const i=cursor++;if(!effects[i])effects[i]={deps,cleanup:fn()};},
  useCallback(fn,deps){const i=cursor++;return (memos[i]??={fn,deps}).fn;},
 };
 const player={playing:true,session:null}; const window=new EventTarget();const document=new EventTarget();document.hidden=false;
 window.setInterval=()=>1;window.clearInterval=()=>{};
 const modules={
  react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  'next/link':{__esModule:true,default:'link'},'next/image':{__esModule:true,default:'image'},
  'lucide-react':Object.fromEntries(['ArrowRight','ChevronLeft','ChevronRight','Heart','Pause','Play','Radio','Search','X'].map(x=>[x,x])),
  '@/lib/brand':{AIPOGER_BRAND_LOGO:'/brand.png'},'@/lib/i18n':{useI18n:()=>({lang,t:key=>key})},'@/lib/home-copy':{homeCopy},'@/lib/mv-copy':{mvCopy},'@/lib/mv-discovery':{filterMvWorks},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS:[{value:'EDM 百大電音',labelKey:'genre_edm'}]},
  '@/lib/music-player-store':{useMusicPlayer:()=>player,musicPlayer:{toggle:()=>toggles++,start:async(...args)=>{starts.push(args);return true;}}},
  '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},
  '@/components/home-work-feedback':{__esModule:true,default:'feedback'},'@/components/lang-toggle':{__esModule:true,default:'lang-toggle'},'./home-editorial.module.css':{__esModule:true,default:{}},'./mv-gallery.module.css':{__esModule:true,default:{}},
 };
 const header={exports:{}};
 new Function('require','module','exports',headerCompiled)(name=>{assert.ok(name in modules,name);return modules[name];},header,header.exports);
 modules['@/components/editorial-header']=header.exports;
 modules['@/components/work-image']={__esModule:true,default:'work-image'};
 const loaded={exports:{}};
 new Function('require','module','exports','fetch','window','document',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,async()=>({ok:!fail,json:async()=>structuredClone(payload)}),window,document);
 function render(){cursor=0;dirty=false;tree=loaded.exports.default();}
 async function flush(){for(let i=0;i<5;i++){await new Promise(setImmediate);if(dirty)render();}}
 render(); await flush(); t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {player,nodes:()=>nodes(tree),text:()=>text(tree),starts,toggles:()=>toggles,flush,setAvailable(){fail=false;},button(label){const match=nodes(tree).find(x=>x.type==='button'&&(x.props['aria-label']===label||text(x)===label));assert.ok(match,label);return match.props;}};
}

for(const lang of ['zh','en','ja','ko']) test(`MV catalog localizes actions and preserves original work links (${lang})`,async t=>{
 const ui=await mount(t,lang);assert.ok(ui.text().includes(mvCopy(lang).title));assert.ok(ui.text().includes('Real Creator'));
 assert.ok(ui.nodes().some(x=>x.type==='link'&&x.props.href===`/ai-music?track=actual-work&lang=${lang}`));
 assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
});
test('MV hero playback is initiated by a click and pauses the shared music player',async t=>{
 const ui=await mount(t);ui.button('觀看 MV').onClick();await ui.flush();assert.equal(ui.toggles(),1);
 assert.equal(ui.nodes().find(x=>x.type==='iframe').props.src,'https://www.youtube-nocookie.com/embed/MdxaU0l3FzI?autoplay=1&rel=0');
 ui.button('收起影片').onClick();await ui.flush();assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
});
test('gallery playback and feedback keep the chosen original work and return to the MV page after login',async t=>{
 const second={...work,id:'older',title:'Older Work',publishedAt:'2026-05-01'};
 const ui=await mount(t,'zh',{featureKind:'community',featured:[work],works:[work,second],channels:[]});
 ui.button('觀看 MV · Older Work').onClick();await ui.flush();const dialog=ui.nodes().find(x=>x.type?.name==='VideoDialog');assert.equal(dialog.props.work.id,'older');assert.equal(ui.toggles(),1);
 dialog.props.onFeedback();await ui.flush();const feedback=ui.nodes().find(x=>x.type==='feedback');assert.equal(feedback.props.work.id,'older');assert.equal(feedback.props.returnPath,'/mv');assert.equal(ui.nodes().some(x=>x.type?.name==='VideoDialog'),false);
});
test('search finds older works beyond the initial 12 cards; reset and load-more expose all items',async t=>{
 const works=Array.from({length:25},(_,i)=>({...work,id:`work-${i}`,title:`Song ${i}`,artist:'Actual Artist',publishedAt:String(100-i)}));
 const ui=await mount(t,'zh',{featureKind:'community',featured:[work],works,channels:[]});
 const cards=()=>ui.nodes().filter(x=>x.type==='article').length;assert.equal(cards(),12);
 ui.button('載入更多12 / 25').onClick();await ui.flush();assert.equal(cards(),24);
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:'Song 24'}});await ui.flush();assert.equal(cards(),1);assert.ok(ui.text().includes('Song 24'));
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:'no such work'}});await ui.flush();assert.ok(ui.text().includes(mvCopy('zh').noResults));
 ui.button('重設篩選').onClick();await ui.flush();assert.equal(cards(),12);
});
test('failed MV loading shows retry and never claims an empty catalog or invented works',async t=>{
 const ui=await mount(t,'zh',undefined,true);assert.ok(ui.text().includes(homeCopy('zh').error));assert.equal(ui.text().includes('Real Song'),false);assert.equal(ui.text().includes(mvCopy('zh').noResults),false);
 ui.setAvailable();ui.button('重新載入').onClick();await ui.flush();assert.ok(ui.text().includes('Real Song'));
});
