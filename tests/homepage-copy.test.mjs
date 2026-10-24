import { lazyRuntime } from "./helpers/lazy-runtime.mjs";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { homeCopy } from '../src/lib/home-copy.ts';
const source=readFileSync(new URL('../src/components/home-editorial.tsx',import.meta.url),'utf8');
const headerSource=readFileSync(new URL('../src/components/editorial-header.tsx',import.meta.url),'utf8');
const headerCompiled=ts.transpileModule(headerSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):x==null||typeof x==='boolean'?'':String(x);
const work={id:'actual-work',title:'Real Song',artist:'Real Creator',genre:'EDM 百大電音',description:'A real description',coverUrl:'/cover.jpg',audioUrl:'/song.mp3',lyrics:'Lyrics',videoId:'MdxaU0l3FzI',youtubeUrl:'https://www.youtube.com/watch?v=MdxaU0l3FzI',supporterCount:2,publishedAt:'2026-10-13'};
async function mount(t,lang='zh',payload={featureKind:'community',featured:[work],singles:[work]},unavailable=false) {
 let cursor=0,tree,dirty=true; const states=[],effects=[],memos=[],starts=[]; let toggles=0,fail=unavailable;
 const react={
  useState(initial){const i=cursor++; if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},
  useEffect(fn,deps){const i=cursor++;if(!effects[i])effects[i]={deps,cleanup:fn()};},
  useCallback(fn,deps){const i=cursor++;return (memos[i]??={fn,deps}).fn;},
 };
 const player={playing:true,session:null}; const window=new EventTarget();const document=new EventTarget();document.hidden=false;
 window.setInterval=()=>1;window.clearInterval=()=>{};
 const modules={
  react,'react/jsx-runtime':{jsx:(type,props)=>typeof type==='function'?type(props):({type,props}),jsxs:(type,props)=>typeof type==='function'?type(props):({type,props})},
  'next/link':{__esModule:true,default:'link'},'next/image':{__esModule:true,default:'image'},
  'lucide-react':Object.fromEntries(['ArrowRight','ChevronLeft','ChevronRight','Heart','Pause','Play','Radio','X'].map(x=>[x,x])),
  '@/lib/brand':{AIPOGER_BRAND_LOGO:'/brand.png'},'@/lib/i18n':{useI18n:()=>({lang,t:key=>key})},'@/lib/home-copy':{homeCopy},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS:[{value:'EDM 百大電音',labelKey:'genre_edm'}]},
  '@/lib/music-player-store':{useMusicPlayer:()=>player,musicPlayer:{toggle:()=>toggles++,start:async(...args)=>{starts.push(args);return true;}}},
  '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},
  '@/components/home-work-feedback':{__esModule:true,default:'feedback'},'@/components/lang-toggle':{__esModule:true,default:'lang-toggle'},'./home-editorial.module.css':{__esModule:true,default:{}},
 };
 const header={exports:{}};
 new Function('require','module','exports',headerCompiled)(name=>{assert.ok(name in modules,name);return modules[name];},header,header.exports);
 modules['@/components/editorial-header']=header.exports;
 modules['@/components/work-image']={__esModule:true,default:'work-image'};
 modules['next/dynamic']=lazyRuntime(modules);
 const loaded={exports:{}};
 new Function('require','module','exports','fetch','window','document',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,async()=>({ok:!fail,json:async()=>structuredClone(payload)}),window,document);
 function render(){cursor=0;dirty=false;tree=loaded.exports.default();}
 async function flush(){for(let i=0;i<5;i++){await new Promise(setImmediate);if(dirty)render();}}
 render(); await flush(); t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {nodes:()=>nodes(tree),text:()=>text(tree),starts,toggles:()=>toggles,flush,setAvailable(){fail=false;},button(label){const match=nodes(tree).find(x=>x.type==='button'&&(x.props['aria-label']===label||text(x)===label));assert.ok(match,label);return match.props;}};
}
for(const lang of ['zh','en','ja','ko']) test(`homepage preserves real routes and localized discovery (${lang})`,async t=>{
 const ui=await mount(t,lang);const copy=homeCopy(lang);const hrefs=ui.nodes().filter(x=>x.type==='link').map(x=>x.props.href);
 for(const route of ['/mv','/ai-music','/rank','/battle','/ai-music-bible','/listen-bar','/auth'])assert.ok(hrefs.includes(`${route}?lang=${lang}`),route);
 assert.ok(hrefs.includes(`/ai-music?track=actual-work&lang=${lang}`));assert.ok(ui.text().includes(copy.title));assert.ok(ui.text().includes(copy.exploreTitle));assert.ok(ui.text().includes('Real Creator'));
});
test('MV playback is user initiated and pauses shared audio; singles use the existing shared queue',async t=>{
 const ui=await mount(t);assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
 ui.button('觀看 MV').onClick();await ui.flush();assert.equal(ui.toggles(),1);
 assert.equal(ui.nodes().find(x=>x.type==='iframe').props.src,'https://www.youtube-nocookie.com/embed/MdxaU0l3FzI?autoplay=1&rel=0');
 await ui.button('播放 · Real Song').onClick();await ui.flush();assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
 assert.equal(ui.starts[0][0][0].heartTrackId,'actual-work');assert.equal(ui.starts[0][0][0].audioUrl,'/song.mp3');
});
test('unavailable discovery offers retry without fictional music or support; retry loads actual data',async t=>{
 const ui=await mount(t,'zh',undefined,true);assert.ok(ui.text().includes(homeCopy('zh').error));assert.equal(ui.text().includes('Real Song'),false);
 ui.setAvailable();ui.button('重新載入').onClick();await ui.flush();assert.ok(ui.text().includes('Real Song'));
});
test('empty discovery keeps the listening entrances and does not label a community winner',async t=>{
 const ui=await mount(t,'zh',{featureKind:'empty',featured:[],singles:[]});assert.ok(ui.text().includes(homeCopy('zh').empty));assert.equal(ui.text().includes(homeCopy('zh').community),false);
 assert.ok(ui.nodes().some(x=>x.type==='link'&&x.props.href==='/listen-bar?lang=zh'));
});
