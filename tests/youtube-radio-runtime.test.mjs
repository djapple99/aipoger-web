import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMv} from './helpers/mv-runtime.mjs';
async function setup(t){
 let options,resolveAPI,video='',state=2,ended=0,hidden=false,modal=false,paused=0,instances=0,volume;
 const loads=[],cues=[],errors=[],progress=[],states=[],listeners={};let observer;
 const playerRef={current:null};
 const player={loadVideoById(id){video=id;loads.push(id)},cueVideoById(id){video=id;cues.push(id)},setVolume(v){volume=v},getVideoData(){return {video_id:video}},getPlayerState(){return state},getCurrentTime(){return 12},getDuration(){return 180},pauseVideo(){paused++;state=2},destroy(){playerRef.current=null}};
 const apiPromise=new Promise(r=>resolveAPI=r);
 const ui=await mountMv(t,'src/components/youtube-radio-player.tsx',{videoId:'abcdefghijk',requestId:1,autoplay:true,volume:.85,title:'Test song',playerRef,onPlaying:v=>states.push(v),onProgress:(...p)=>progress.push(p),onEnded:()=>ended++,onError:b=>errors.push(b)}, {'@/lib/youtube-player-api':{loadYouTubeAPI:()=>apiPromise}}, {
 document:{body:{},get hidden(){return hidden},querySelector:()=>modal?{}:null,querySelectorAll:()=>[],createElement:()=>({}),addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){}},
 window:{setTimeout:fn=>{listeners.timeout=fn;return 2},clearTimeout(){},location:{origin:'https://aipoger.com'},setInterval:fn=>{listeners.tick=fn;return 1},clearInterval(){}},
 MutationObserver:class{constructor(f){observer=f}observe(){}disconnect(){}},HTMLMediaElement:class{}
 });
 ui.refs[0].current={appendChild(){},querySelector:()=>({})};
 resolveAPI({Player:class{constructor(_,opts){instances++;options=opts;return player}}});await ui.flush();options.events.onReady();
 return {ui,loads,cues,errors,progress,states,playerRef,events:options.events,ended:()=>ended,paused:()=>paused,instances:()=>instances,volume:()=>volume,hide(){hidden=true;listeners.visibilitychange()},show(){hidden=false;listeners.visibilitychange()},modal(){modal=true;observer()},tick:()=>listeners.tick(),stale(){video='stalevideo1'}};
}
test('radio reuses one visible YouTube player and advances once after a real end',async t=>{
 const x=await setup(t);assert.equal(x.loads[0],'abcdefghijk');assert.equal(x.volume(),85);assert.equal(x.ui.find('div').style.height,200);
 x.events.onStateChange({data:1});assert.equal(x.states.at(-1),true);x.tick();assert.deepEqual(x.progress.at(-1),[12,180]);
 x.events.onStateChange({data:0});x.events.onStateChange({data:0});assert.equal(x.ended(),1);
 await x.ui.update({videoId:'lmnopqrstuv',requestId:2});assert.equal(x.instances(),1);assert.equal(x.loads.at(-1),'lmnopqrstuv');
 x.stale();x.events.onStateChange({data:0});assert.equal(x.ended(),1);
});
test('hidden tab and modal pause YouTube and do not auto-resume or advance',async t=>{
 const x=await setup(t);x.hide();assert.equal(x.paused(),1);x.events.onStateChange({data:0});assert.equal(x.ended(),0);
 x.show();assert.equal(x.loads.length,1);x.modal();assert.equal(x.paused(),2);
 await x.ui.update({videoId:'lmnopqrstuv',requestId:2});assert.equal(x.cues.at(-1),'lmnopqrstuv');assert.equal(x.loads.length,1);
});
test('blocked autoplay and unavailable source remain recoverable without skipping forever',async t=>{
 const x=await setup(t);x.events.onAutoplayBlocked();x.events.onError();assert.deepEqual(x.errors,[true,false]);assert.equal(x.ended(),0);
 await x.ui.update({volume:.3});assert.equal(x.volume(),30);
});
