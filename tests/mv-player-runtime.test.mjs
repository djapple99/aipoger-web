import assert from 'node:assert/strict';
import test from 'node:test';
import { mountMv } from './helpers/mv-runtime.mjs';
import { mvCopy } from '../src/lib/mv-copy.ts';
import { homeCopy } from '../src/lib/home-copy.ts';
const work={id:'a',videoId:'abcdefghijk',title:'A'};
async function mount(t,autoPlay){
 let options,instances=0,toggles=0,ended=0,unavailable=0;
 const loads=[],frame={title:''};let videoId=work.videoId,state=2;
 const player={loadVideoById(id){videoId=id;loads.push(id)},cueVideoById(id){videoId=id},destroy(){},playVideo(){state=1},pauseVideo(){state=2},getPlayerState(){return state},getVideoData(){return {video_id:videoId}}};
 const ui=await mountMv(t,'src/components/mv-player.tsx',{work,autoPlay,onEnded:()=>ended++,onUnavailable:()=>unavailable++},{
 'lucide-react':{Pause:'Pause',Play:'Play'},'@/components/work-image':{__esModule:true,default:'work-image'},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'./home-editorial.module.css':{__esModule:true,default:{}},
 '@/lib/music-player-store':{getMusicPlayerState:()=>({playing:true}),musicPlayer:{toggle:()=>toggles++}},'@/lib/youtube-player-api':{loadYouTubeAPI:async()=>({Player:class{constructor(mount,opts){instances++;options=opts;return player}}})}},
 {document:{createElement:()=>({})},window:{location:{origin:'https://aipoger.com'}}});
 ui.refs[0].current={appendChild(){},querySelector(){return frame},replaceChildren(){}};
 return {...ui,loads,frame,player,options:()=>options,instances:()=>instances,toggles:()=>toggles,ended:()=>ended,unavailable:()=>unavailable};
}
test('passive MV view never starts YouTube until explicit Play',async t=>{
 const ui=await mount(t,false);assert.equal(ui.instances(),0);ui.find('button').onClick();await ui.flush();assert.equal(ui.instances(),1);ui.options().events.onReady();await ui.flush();assert.equal(ui.loads[0],work.videoId);assert.ok(ui.toggles()>0);
});
test('continuous MV keeps one player, updates the original work and ignores stale END events',async t=>{
 const ui=await mount(t,false);ui.find('button').onClick();await ui.flush();ui.options().events.onReady();await ui.flush();
 const second={id:'b',videoId:'lmnopqrstuv',title:'B'};await ui.update({work:second,autoPlay:true});assert.equal(ui.instances(),1);assert.equal(ui.loads.at(-1),second.videoId);assert.equal(ui.frame.title,'B');
 ui.options().events.onStateChange({data:0});await ui.flush();assert.equal(ui.ended(),1);
 ui.player.getVideoData=()=>({video_id:work.videoId});ui.options().events.onStateChange({data:0});assert.equal(ui.ended(),1);
});
test('autoplay blocked offers explicit continuation and private/disallowed clips report unavailable',async t=>{
 const ui=await mount(t,false);ui.find('button').onClick();await ui.flush();ui.options().events.onReady();ui.options().events.onAutoplayBlocked();await ui.flush();assert.ok(ui.text().includes(mvCopy('zh').continuePlaying));assert.equal(ui.unavailable(),0);
 ui.options().events.onError({data:150});await ui.flush();assert.equal(ui.unavailable(),1);assert.ok(ui.text().includes(mvCopy('zh').videoError));
});
