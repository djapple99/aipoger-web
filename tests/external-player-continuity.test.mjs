import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {externalEmbedUrl} from '../src/lib/external-music.ts';
const source=readFileSync(new URL('../src/components/external-music-player.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function mount(){
 let cursor=0;const refs=[],effects=[],players=[];const host={children:[],appendChild(node){this.children.push(node)},querySelector(){return this.children[0]?.frame??null}};
 const react={useRef(initial){const i=cursor++;return refs[i]??={current:initial===null?host:initial}},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,j)=>v!==effects[i].deps[j])){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}}}};
 class Player{constructor(element,options){this.options=options;this.currentTime=78;this.playing=true;this.destroyed=false;element.frame={style:{}};players.push(this);queueMicrotask(()=>options.events.onReady());}destroy(){this.destroyed=true}}
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'@/lib/external-music':{externalEmbedUrl},'@/lib/music-player-store':{getMusicPlayerState:()=>({playing:false}),musicPlayer:{toggle(){throw new Error('Review must not pause playback')}}},'@/lib/i18n':{useI18n:()=>({lang:'en'})},'@/lib/youtube-player-api':{loadYouTubeAPI:async()=>({Player})}};
 const loaded={exports:{}};new Function('require','module','exports','document','window',code)(name=>{assert.ok(name in modules,name);return modules[name]},loaded,loaded.exports,{createElement:()=>({})},{location:{origin:'http://localhost'}});
 return {players,async render(props){cursor=0;loaded.exports.default(props);await new Promise(setImmediate)},close(){effects.forEach(e=>e?.cleanup?.())}};
}
test('typing, review saves, language/viewport-style parent renders retain the same running YouTube instance',async()=>{
 const ui=mount(),media={provider:'youtube',mediaId:'MdxaU0l3FzI',url:'https://www.youtube.com/watch?v=MdxaU0l3FzI'};let oldCalls=0,newCalls=0;
 await ui.render({media,title:'Original work',onPlaying:()=>oldCalls++});const player=ui.players[0];
 for(let i=0;i<5;i++)await ui.render({media:{...media},title:'Original work',onPlaying:()=>newCalls++});
 assert.equal(ui.players.length,1);assert.equal(player.currentTime,78);assert.equal(player.playing,true);assert.equal(player.destroyed,false);
 player.options.events.onStateChange({data:1});assert.equal(oldCalls,0);assert.equal(newCalls,1);
 ui.close();assert.equal(player.destroyed,true);
});
test('switching to a different work destroys the previous instance, while dismissing cleans up the new one',async()=>{
 const ui=mount();const media={provider:'youtube',mediaId:'MdxaU0l3FzI',url:'https://www.youtube.com/watch?v=MdxaU0l3FzI'};
 await ui.render({media,title:'First'});await ui.render({media:{...media,mediaId:'zBaBcDeFghi'},title:'Second'});
 assert.equal(ui.players.length,2);assert.equal(ui.players[0].destroyed,true);assert.equal(ui.players[1].destroyed,false);
 ui.close();assert.equal(ui.players[1].destroyed,true);
});
