import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {filterAiMusicTracks} from '../src/lib/ai-music-filter.ts';
import {buildAiMusicHeatList} from '../src/lib/ai-music-heat.ts';
import {isNewlyPublishedMusic} from '../src/lib/music-newness.ts';

const source=readFileSync(new URL('../src/app/ai-music/ai-music-client.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(`${source}\nexport {TrackCard,HeatList};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const jsx=(type,props)=>({type,props});
const styles=new Proxy({}, {get:(_,name)=>String(name)});
const icons=new Proxy({}, {get:(_,name)=>String(name)});
const testModule={exports:{}};
new Function('require','module','exports',compiled)(name=>{
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='next/link')return {__esModule:true,default:'a'};
  if(name==='lucide-react')return icons;
  if(name==='./ai-music.module.css')return {__esModule:true,default:styles};
  if(name==='@/lib/ai-music-filter')return {filterAiMusicTracks};
  if(name==='@/lib/ai-music-heat')return {buildAiMusicHeatList};
  if(name==='@/lib/music-newness')return {isNewlyPublishedMusic};
  if(name==='@/lib/fonts')return {fontRighteous:{className:'font'}};
  return {};
},testModule,testModule.exports);
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):x==null||typeof x==='boolean'?'':String(x);
const track={id:'bar-original',sourceId:'original',recordKey:'bar:original',source:'bar',title:'Real Song',creator:'Real Creator',aiTool:'Suno',genre:'Jazz',audioUrl:'/original.mp3',coverUrl:'/original.jpg',href:'/ai-music?track=original&lang=zh#works',heartCount:28,createdAt:'2026-06-01T00:00:00Z',openForChallenge:false,earwormAffinityPercent:null,earwormAffinitySampleCount:0,recentHeartSupporters:1,recentOfficialAudienceVotes:0,recentQualifiedInteractionAt:null};
const props={track,lang:'zh',isPlaying:false,isExpanded:false,heartBusy:false,heartedToday:false,onPrepare(){},onPlay(){},onToggleExpand(){},onHeart(){},onShare(){}};

test('card keeps the heart next to the title and invokes actions for the original work',()=>{
  const actions=[];
  const tree=testModule.exports.TrackCard({...props,onHeart:x=>actions.push(['heart',x]),onPlay:x=>actions.push(['play',x]),onShare:x=>actions.push(['share',x])});
  const row=nodes(tree).find(x=>x.props?.className==='titleRow');
  assert.equal(row.props.children[0].type,'h3');
  const heart=row.props.children[1];assert.equal(heart.type,'button');
  assert.equal(text(heart),'28');assert.equal(heart.props['aria-pressed'],false);
  assert.equal(nodes(row).find(x=>x.type==='a').props.href,track.href);
  heart.props.onClick();nodes(tree).find(x=>x.props?.className==='play').props.onClick();
  nodes(tree).find(x=>x.props?.['aria-label']==='分享').props.onClick();
  assert.deepEqual(actions,[['heart',track],['play',track],['share',track]]);
  assert.equal(tree.props.id,'ai-music-work-original');
});
test('busy and selected hearts remain accessible; disabled audio cannot play',()=>{
  const tree=testModule.exports.TrackCard({...props,heartedToday:true,heartBusy:true,track:{...track,audioUrl:null}});
  const heart=nodes(tree).find(x=>x.props?.className==='heart');
  assert.equal(heart.props.disabled,true);assert.equal(heart.props['aria-pressed'],true);
  assert.equal(heart.props['aria-label'],'取消愛心與收藏');
  assert.equal(nodes(tree).find(x=>x.props?.className==='play').props.disabled,true);
});
test('filtering the heat list preserves the global rank and source count',()=>{
  const other={...track,id:'bar-top',sourceId:'top',title:'Top Song',genre:'Rap',recentHeartSupporters:20};
  const tree=testModule.exports.HeatList({tracks:[track,other],query:'Real',genre:'Jazz',lang:'zh',currentTrackId:null,isPlaying:false,expandedHud:{},heartBusy:{},heartStates:{},onPrepare(){},onPlay(){},onToggleExpand(){},onHeart(){},onShare(){}});
  const cards=nodes(tree).filter(x=>x.type===testModule.exports.TrackCard);
  assert.equal(cards.length,1);assert.equal(cards[0].props.track,track);
  assert.equal(cards[0].props.catalogLabel,'#02');assert.equal(cards[0].props.track.heartCount,28);
});
