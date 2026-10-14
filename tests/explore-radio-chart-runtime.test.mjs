import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
function component(path,extra={}){
 const src=readFileSync(new URL(path,import.meta.url),'utf8');const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const loaded={exports:{}};new Function('require','module','exports',code)(name=>{
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='lucide-react')return new Proxy({}, {get:(_,key)=>String(key)});
  if(name.endsWith('ai-music.module.css'))return {__esModule:true,default:new Proxy({}, {get:(_,key)=>String(key)})};
  if(name==='@/lib/i18n')return {useI18n:()=>({lang:'zh',t:key=>key})};
  if(name==='react')return {useEffect(){},useRef:()=>({current:null}),useState:x=>[x,()=>{}],useId:()=>':chart-list:'};
  return extra[name]??{};
 },loaded,loaded.exports);return loaded.exports.default;
}
test('inline Top50 keeps original IDs and separate play, locate and Heart actions; has no comment icon',()=>{
 const Chart=component('../src/components/music-pool-chart.tsx');const actions=[];
 const rows=Array.from({length:55},(_,i)=>({rank:i+1,track:{id:'bar-'+i,sourceId:String(i),recordKey:'bar:'+i,title:'Song '+i,creator:'Creator',coverUrl:'/cover.jpg',poolSupporterCount:60-i}}));
 const tree=Chart({rows,ready:true,error:false,heartStates:{},heartBusy:{},onPlay:t=>actions.push(['play',t.sourceId]),onLocate:t=>actions.push(['locate',t.sourceId]),onHeart:t=>actions.push(['heart',t.sourceId])});
 assert.equal(nodes(tree).filter(n=>n.type==='li').length,50);
 assert.equal(nodes(tree).some(n=>n.type==='MessageCircleMore'),false);
 const first=nodes(tree).find(n=>n.type==='li');assert.equal(first.props['data-chart-work'],'0');
 nodes(first).filter(n=>n.type==='button').forEach(n=>n.props.onClick());assert.deepEqual(actions,[['play','0'],['locate','0'],['heart','0']]);
});
test('Top50 keeps real rank values and empty/error states do not fabricate ten works',()=>{
 const Chart=component('../src/components/music-pool-chart.tsx');const props={rows:[],ready:true,error:false,heartStates:{},heartBusy:{},onPlay(){},onLocate(){},onHeart(){}};
 assert.equal(nodes(Chart(props)).filter(n=>n.type==='li').length,0);
 assert.equal(nodes(Chart({...props,ready:false,error:true})).some(n=>n.props?.role==='alert'),true);
 const rows=Array.from({length:66},(_,i)=>({rank:i+1,track:{id:String(i),sourceId:String(i),recordKey:String(i),title:'Work',creator:'C',coverUrl:'/cover',poolSupporterCount:1}}));
 assert.equal(nodes(Chart({...props,rows,limit:50})).filter(n=>n.type==='li').length,50);
});
test('radio changes genre through one repeating shared queue and preserves feedback identity',()=>{
 const actions=[];const tracks=[{id:'uuid-a',heartTrackId:'uuid-a',genre:'Jazz / Bossa 微醺時刻',title:'Jazz',artist:'Creator',audioUrl:'/a.mp3',coverUrl:'/a.jpg'},{id:'uuid-b',heartTrackId:'uuid-b',genre:'R&B 深情瞬間',title:'RNB',artist:'Other',audioUrl:'/b.mp3',coverUrl:'/b.jpg'}];
 const player={session:null,playing:false,currentTime:0,duration:0,volume:.85};
 const Radio=component('../src/components/explore-radio.tsx',{'@/lib/music-player-store':{useMusicPlayer:()=>player,musicPlayer:{start:(...args)=>actions.push(['start',...args]),setVolume:v=>actions.push(['volume',v]),seek:v=>actions.push(['seek',v]),toggle:()=>actions.push(['pause']),move:d=>actions.push(['move',d])}},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS:tracks.map(t=>({value:t.genre,labelKey:t.genre}))}});
 const tree=Radio({tracks,ready:true,hearted:false,heartBusy:false,onHeart:id=>actions.push(['heart',id]),onComment:id=>actions.push(['comment',id])});
 const button=nodes(tree).find(n=>n.type==='button'&&n.props.children==='Jazz / Bossa');button.props.onClick();
 assert.equal(actions[0][0],'start');assert.deepEqual(actions[0][1],tracks.slice(0,1));assert.equal(actions[0][4].repeat,true);assert.equal(actions[0][4].sourceKey,'bar:Jazz / Bossa 微醺時刻');
 nodes(tree).find(n=>n.props?.['aria-label']==='電台歌曲評論').props.onClick();assert.deepEqual(actions.at(-1),['comment','uuid-a']);
 assert.equal(nodes(tree).some(n=>n.type==='audio'),false);
 player.session={queue:tracks,index:1};player.playing=true;player.duration=180;
 const active=Radio({tracks,ready:true,hearted:false,heartBusy:false,onHeart(){},onComment(){}});
 nodes(active).find(n=>n.props?.['aria-label']==='暫停電台').props.onClick();assert.deepEqual(actions.at(-1),['pause']);
 nodes(active).find(n=>n.props?.['aria-label']==='電台音量').props.onChange({target:{value:'.2'}});assert.deepEqual(actions.at(-1),['volume',.2]);
 nodes(active).find(n=>n.props?.['aria-label']==='電台播放進度').props.onChange({target:{value:'40'}});assert.deepEqual(actions.at(-1),['seek',40]);
});
