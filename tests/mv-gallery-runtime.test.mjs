import { lazyRuntime } from "./helpers/lazy-runtime.mjs";
import { albumCopy } from "../src/lib/album-copy.ts";
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
async function mount(t,lang='zh',payload={featureKind:'community',featured:[work],works:[work,{...work,id:'other-work',title:'Other Song'}],channels:[]},unavailable=false,sharedId='') {
 let cursor=0,tree,dirty=true; const states=[],effects=[],memos=[],refs=[],starts=[],navigations=[]; let toggles=0,fail=unavailable;
 const support={hearts:{},ready:true,busyId:null,error:null,result:'done',called:[],reload(){},async toggle(id){support.called.push(id);return support.result;}};
 const react={
  useRef:(value)=>refs[cursor++]??={current:value},
  useState(initial){const i=cursor++; if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},
  useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,j)=>!Object.is(v,effects[i].deps[j]))){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};}},
  useCallback(fn,deps){const i=cursor++;return (memos[i]??={fn,deps}).fn;},
 };
 const player={playing:true,session:null}; const window=new EventTarget();const document=new EventTarget();document.hidden=false;
 window.location={search:sharedId?'?lang='+lang+'&track='+encodeURIComponent(sharedId):''};
 window.setInterval=()=>1;window.clearInterval=()=>{};
 const modules={
  react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  'next/link':{__esModule:true,default:'link'},'next/image':{__esModule:true,default:'image'},'next/navigation':{useRouter:()=>({push:url=>navigations.push(url)})},
  'lucide-react':Object.fromEntries(['ArrowRight','ChevronLeft','ChevronRight','Heart','MessageCircleMore','Pause','Play','Radio','Search','X'].map(x=>[x,x])),
  '@/lib/use-mv-hearts':{useMvHearts:()=>support},
  '@/lib/brand':{AIPOGER_BRAND_LOGO:'/brand.png'},'@/lib/i18n':{useI18n:()=>({lang,t:key=>key})},'@/lib/home-copy':{homeCopy},'@/lib/mv-copy':{mvCopy},'@/lib/mv-discovery':{filterMvWorks},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS:[{value:'EDM 百大電音',labelKey:'genre_edm'}]},
  '@/lib/music-player-store':{useMusicPlayer:()=>player,musicPlayer:{toggle:()=>toggles++,start:async(...args)=>{starts.push(args);return true;}}},
  '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},
  '@/components/share-button':{__esModule:true,default:'share-button'},'@/components/home-work-feedback':{__esModule:true,default:'feedback'},'@/components/lang-toggle':{__esModule:true,default:'lang-toggle'},'./home-editorial.module.css':{__esModule:true,default:{}},'./mv-gallery.module.css':{__esModule:true,default:{}},
 };
 const header={exports:{}};
 new Function('require','module','exports',headerCompiled)(name=>{assert.ok(name in modules,name);return modules[name];},header,header.exports);
 modules['@/components/editorial-header']=header.exports;
 modules['@/components/work-image']={__esModule:true,default:'work-image'};
 modules['./participation-guide']={__esModule:true,default:'participation-guide'};
 modules['next/dynamic']=lazyRuntime(modules); modules['@/lib/album-copy']={albumCopy};
 const loaded={exports:{}};
 new Function('require','module','exports','fetch','window','document',compiled)(name=>{assert.ok(name in modules,name);return modules[name];},loaded,loaded.exports,async()=>({ok:!fail,json:async()=>structuredClone(payload)}),window,document);
 function render(){cursor=0;dirty=false;tree=loaded.exports.default();}
 async function flush(){for(let i=0;i<5;i++){await new Promise(setImmediate);if(dirty)render();}}
 render(); await flush(); t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {player,support,navigations,nodes:()=>nodes(tree),text:()=>text(tree),starts,toggles:()=>toggles,flush,rerender:render,async refresh(event){window.dispatchEvent(new Event(event));await flush();},setAvailable(){fail=false;},button(label){const match=nodes(tree).find(x=>x.type==='button'&&(x.props['aria-label']===label||text(x)===label));assert.ok(match,label);return match.props;}};
}

for(const lang of ['zh','en','ja','ko']) test(`MV catalog localizes actions and preserves original work links (${lang})`,async t=>{
 const ui=await mount(t,lang);assert.ok(ui.text().includes(mvCopy(lang).title));assert.ok(ui.text().includes('Real Creator'));
 assert.ok(ui.nodes().some(x=>x.props?.href===`/works/other-work?lang=${lang}`));
 ui.button(`${homeCopy(lang).watch} · Other Song`).onClick();await ui.flush();assert.equal(ui.nodes().find(x=>x.type==='feedback').props.work.id,'other-work');
 assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
});
test('MV cover play opens the unified original-work review with explicit autoplay',async t=>{
 const ui=await mount(t);ui.button('觀看 MV').onClick();await ui.flush();assert.equal(ui.toggles(),1);
 const dialog=ui.nodes().find(x=>x.type==='feedback');assert.equal(dialog.props.autoPlay,true);assert.equal(dialog.props.showVideo,true);
 dialog.props.onClose();await ui.flush();assert.equal(ui.nodes().some(x=>x.type==='feedback'),false);
});
test('gallery covers and comments use one review view, preserving the original ID and auth return',async t=>{
 const second={...work,id:'older',title:'Older Work',publishedAt:'2026-05-01'};
 const ui=await mount(t,'zh',{featureKind:'community',featured:[work],works:[work,second],channels:[]});
 ui.button('觀看 MV · Older Work').onClick();await ui.flush();const dialog=ui.nodes().find(x=>x.type==='feedback');
 assert.equal(dialog.props.work.id,'older');assert.equal(dialog.props.returnPath,'/mv');assert.equal(dialog.props.showVideo,true);assert.equal(dialog.props.autoPlay,true);
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

test('MV cards keep every featured work in search, sorting and pagination independently of the hero',async t=>{
 const tie={...work,id:'tied-work',title:'Tied Work'};
 const others=Array.from({length:14},(_,i)=>({...work,id:`other-${i}`,title:`Other ${i}`}));
 const payload={featureKind:'community',featured:[work,tie],works:[work,tie,...others],channels:[]};
 const ui=await mount(t,'zh',payload);
 const cardIds=()=>ui.nodes().filter(x=>x.type==='article').map(x=>x.props.children.find(c=>c?.type==='button').props['aria-label']);
 assert.equal(cardIds().length,12);
 ui.button('本週支持').onClick();await ui.flush();
 ui.button('載入更多12 / 16').onClick();await ui.flush();assert.equal(cardIds().length,16);
 assert.ok(cardIds().includes('觀看 MV · Real Song'));assert.ok(cardIds().includes('觀看 MV · Tied Work'));
 assert.equal(payload.works.length,16);
 const before=cardIds();ui.button('下一支 MV').onClick();await ui.flush();assert.ok(ui.nodes().some(x=>x.type==='h2'&&text(x)==='Tied Work'));assert.deepEqual(cardIds(),before);
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:'Real Song'}});await ui.flush();
 assert.deepEqual(cardIds(),['觀看 MV · Real Song']);assert.equal(ui.text().includes(mvCopy('zh').shownAbove),false);assert.equal(ui.text().includes(mvCopy('zh').noResults),false);
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:''}});await ui.flush();assert.equal(cardIds().length,12);
});

test('review and heart refresh preserve a new MV card and its latest-order position when it becomes featured',async t=>{
 const newWork={...work,id:'new-work',title:'New Song',publishedAt:'2026-10-22',supporterCount:0,ratingCount:0};
 const payload={featureKind:'community',featured:[work],works:[work,newWork],channels:[]};
 const ui=await mount(t,'zh',payload);
 ui.button('最新投稿').onClick();await ui.flush();
 const cards=()=>ui.nodes().filter(x=>x.type==='article');
 const order=()=>cards().map(x=>x.props.children[0].props['aria-label']);
 assert.deepEqual(order(),['觀看 MV · New Song','觀看 MV · Real Song']);
 Object.assign(newWork,{supporterCount:2,ratingAverage:9.2,ratingCount:1,ratingTotal:9.2});payload.featured.push(newWork);
 for(const event of ['aipoger:mv-rating','aipoger:music-heart']){
  await ui.refresh(event);assert.deepEqual(order(),['觀看 MV · New Song','觀看 MV · Real Song']);
  assert.ok(text(cards()[0]).includes('9.2 分｜1 人評分'));
 }
});

test('MV cards have separate heart and comment actions in the title row; direct support never opens comments',async t=>{
 const ui=await mount(t);
 const card=ui.nodes().find(x=>x.type==='article');
 const row=card.props.children[1];assert.equal(row.type,'div');
 const actions=nodes(row).filter(x=>x.type==='button'&&!x.props['aria-label']?.startsWith(mvCopy('zh').openWork));assert.equal(actions.length,2);
 assert.ok(nodes(row).some(x=>x.type==='h3'));assert.equal(card.props.children[2].type,'p');
 await ui.button('送出愛心與收藏 · Other Song').onClick();await ui.flush();
 assert.deepEqual(ui.support.called,['other-work']);assert.equal(ui.nodes().some(x=>x.type==='feedback'),false);
 ui.button('觀看 MV 與評論 · Other Song').onClick();await ui.flush();
 const feedback=ui.nodes().find(x=>x.type==='feedback');assert.equal(feedback.props.work.id,'other-work');assert.equal(feedback.props.showVideo,true);
 feedback.props.onClose();await ui.flush();assert.equal(ui.nodes().some(x=>x.type==='feedback'),false);
});
test('MV guest support preserves the MV login return path and never claims success',async t=>{
 const ui=await mount(t);ui.support.result='login';
 await ui.button('送出愛心與收藏 · Other Song').onClick();await ui.flush();
 assert.deepEqual(ui.navigations,['/auth?lang=zh&next=%2Fmv%3Flang%3Dzh']);
 assert.equal(ui.button('送出愛心與收藏 · Other Song')['aria-pressed'],false);
});

test('MV shares target the exact original work with language, including the featured work',async t=>{
 const ui=await mount(t,'ko');
 const shares=ui.nodes().filter(x=>x.type?.name==='MvShare');assert.equal(shares.length,3);
 for(const node of shares){const button=node.type(node.props);assert.equal(button.type,'share-button');assert.equal(button.props.url,`/works/${node.props.work.id}?lang=ko`);assert.equal(button.props.iconOnly,true);assert.equal(button.props.sharedLabel,mvCopy('ko').shared);}
 assert.equal(ui.support.called.length,0);
});
test('shared links find an older public MV beyond the first twelve without autoplay',async t=>{
 const works=Array.from({length:25},(_,i)=>({...work,id:`work-${i}`,title:`Song ${i}`}));
 const ui=await mount(t,'zh',{featureKind:'community',featured:[work],works,channels:[]},false,'work-24');
 const feedback=ui.nodes().find(x=>x.type==='feedback');assert.ok(feedback);assert.equal(feedback.props.work.id,'work-24');assert.equal(feedback.props.showVideo,true);assert.equal(ui.nodes().some(x=>x.type==='iframe'),false);
 feedback.props.onClose();await ui.flush();assert.equal(ui.nodes().some(x=>x.type==='feedback'),false);
});
test('unavailable shared MV does not leak a title or invent playback',async t=>{
 const ui=await mount(t,'en',undefined,false,'hidden-id');assert.ok(ui.text().includes(mvCopy('en').sharedUnavailable));assert.equal(ui.nodes().some(x=>x.type==='feedback'),false);
});

test('continuous MV queue includes the complete filtered result beyond 12 cards, advances on END, and stops at the end',async t=>{
 const works=Array.from({length:15},(_,i)=>({...work,id:`queue-${i}`,title:`Queue ${i}`,publishedAt:new Date(Date.UTC(2026,9,20-i)).toISOString()}));
 const ui=await mount(t,'zh',{featureKind:'community',featured:[works[0]],works,channels:[]});
 ui.button(mvCopy('zh').continuous).onClick();await ui.flush();
 let dialog=()=>ui.nodes().find(x=>x.type==='feedback').props;
 assert.equal(dialog().work.id,'queue-0');assert.equal(dialog().autoPlay,true);
 for(let i=1;i<15;i++){dialog().onVideoEnded();await ui.flush();assert.equal(dialog().work.id,`queue-${i}`);}
 dialog().onVideoEnded();await ui.flush();assert.ok(text(dialog().videoControls).includes(mvCopy('zh').queueEnded));assert.equal(dialog().work.id,'queue-14');
});
test('continuous queue uses search, skips unplayable clips and supports previous without duplicate END advance',async t=>{
 const works=[{...work,id:'a',title:'Match A',publishedAt:'3'},{...work,id:'b',title:'Match B',publishedAt:'2'},{...work,id:'c',title:'Other',publishedAt:'1'}];
 const ui=await mount(t,'zh',{featured:[],works,channels:[],featureKind:'empty'});
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:'Match'}});await ui.flush();ui.button(mvCopy('zh').continuous).onClick();await ui.flush();
 const old=ui.nodes().find(x=>x.type==='feedback').props;old.onVideoUnavailable();old.onVideoEnded();await ui.flush();assert.equal(ui.nodes().find(x=>x.type==='feedback').props.work.id,'b');
 nodes(ui.nodes().find(x=>x.type==='feedback').props.videoControls).find(x=>x.type==='button'&&x.props['aria-label']===mvCopy('zh').previousMv).props.onClick();await ui.flush();assert.equal(ui.nodes().find(x=>x.type==='feedback').props.work.id,'a');
});

test('closing a pending review clears the deferred END before a new continuous session',async t=>{
 const works=[{...work,id:'a',publishedAt:'3'},{...work,id:'b',publishedAt:'2'}];
 const ui=await mount(t,'zh',{featured:[],works,channels:[],featureKind:'empty'});
 const dialog=()=>ui.nodes().find(x=>x.type==='feedback').props;
 ui.button(mvCopy('zh').continuous).onClick();await ui.flush();dialog().onReviewBusy(true);await ui.flush();dialog().onVideoEnded();await ui.flush();assert.equal(dialog().work.id,'a');
 dialog().onClose();await ui.flush();ui.button(mvCopy('zh').continuous).onClick();await ui.flush();assert.equal(dialog().work.id,'a');
});

test('default rated order promotes a reviewed MV without hiding it; reset and continuous play use the same order',async t=>{
 const reviewed={...work,id:'reviewed',title:'Reviewed',publishedAt:'2026-10-20',ratingCount:1,ratingAverage:8};
 const fresh={...work,id:'fresh',title:'Fresh',publishedAt:'2026-10-22',ratingCount:0};
 const pending={...work,id:'pending',title:'Pending',publishedAt:'2026-10-21',ratingCount:0};
 const payload={featureKind:'community',featured:[reviewed],works:[fresh,reviewed,pending],channels:[]};
 const ui=await mount(t,'zh',payload);
 const order=()=>ui.nodes().filter(x=>x.type==='article').map(x=>x.props.children[0].props['aria-label']);
 assert.equal(ui.button('評分優先')['aria-pressed'],true);
 assert.deepEqual(order(),['觀看 MV · Reviewed','觀看 MV · Fresh','觀看 MV · Pending']);
 Object.assign(pending,{ratingCount:1,ratingAverage:9.2});payload.featured.push(pending);
 await ui.refresh('aipoger:mv-rating');
 assert.deepEqual(order(),['觀看 MV · Pending','觀看 MV · Reviewed','觀看 MV · Fresh']);
 ui.button('最新投稿').onClick();await ui.flush();assert.deepEqual(order(),['觀看 MV · Fresh','觀看 MV · Pending','觀看 MV · Reviewed']);
 ui.nodes().find(x=>x.type==='input').props.onChange({target:{value:'no result'}});await ui.flush();
 ui.button('重設篩選').onClick();await ui.flush();assert.equal(ui.button('評分優先')['aria-pressed'],true);
 ui.button(mvCopy('zh').continuous).onClick();await ui.flush();
 const dialog=()=>ui.nodes().find(x=>x.type==='feedback').props;
 assert.equal(dialog().work.id,'pending');dialog().onVideoEnded();await ui.flush();assert.equal(dialog().work.id,'reviewed');dialog().onVideoEnded();await ui.flush();assert.equal(dialog().work.id,'fresh');
});
