import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMv} from './helpers/mv-runtime.mjs';
async function setup(t, initiallyReady = true, extra = {}){
 let options,resolveAPI,video='',state=2,ended=0,hidden=false,modal=false,paused=0,instances=0,volume;
 const loads=[],cues=[],errors=[],progress=[],states=[],listeners={};let observer;
 const playerRef={current:null};
 const player={loadVideoById(id){video=id;loads.push(id)},cueVideoById(id){video=id;cues.push(id)},setVolume(v){volume=v},getVideoData(){return {video_id:video}},getPlayerState(){return state},getCurrentTime(){return 12},getDuration(){return 180},pauseVideo(){paused++;state=2},destroy(){playerRef.current=null}};
 const apiPromise=new Promise(r=>resolveAPI=r);
 const ui=await mountMv(t,'src/components/youtube-radio-player.tsx',{videoId:'abcdefghijk',requestId:1,autoplay:true,volume:.85,title:'Test song',playerRef,onPlaying:v=>states.push(v),onProgress:(...p)=>progress.push(p),onEnded:()=>ended++,onError:b=>errors.push(b),...extra}, {'@/lib/youtube-player-api':{loadYouTubeAPI:()=>apiPromise}}, {
 document:{body:{},get hidden(){return hidden},querySelector:()=>modal?{}:null,querySelectorAll:selector=>selector.startsWith('dialog') && modal ? [modal] : [],createElement:()=>({}),addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){}},
 window:{setTimeout:fn=>{listeners.timeout=fn;return 2},clearTimeout(){},location:{origin:'https://aipoger.com'},setInterval:fn=>{listeners.tick=fn;return 1},clearInterval(){}},
 MutationObserver:class{constructor(f){observer=f}observe(){}disconnect(){}},HTMLMediaElement:class{}
 });
 ui.refs[0].current={appendChild(){},querySelector:()=>({})};
 resolveAPI({Player:class{constructor(_,opts){instances++;options=opts;return player}}});await ui.flush();if(initiallyReady)options.events.onReady();
 return {ui,loads,cues,errors,progress,states,playerRef,options,timeout:()=>listeners.timeout(),events:options.events,ended:()=>ended,paused:()=>paused,instances:()=>instances,volume:()=>volume,hide(){hidden=true;listeners.visibilitychange()},show(){hidden=false;listeners.visibilitychange()},modal(node={}){modal=node;observer()},tick:()=>listeners.tick(),stale(){video='stalevideo1'},missingData(){player.getVideoData=()=>undefined;}};
}
test('radio reuses one visible YouTube player and advances once after a real end',async t=>{
 const x=await setup(t);assert.equal(x.options.playerVars.loop,0);assert.equal(x.options.playerVars.autoplay,0);assert.equal(x.loads[0],'abcdefghijk');assert.equal(x.volume(),85);assert.equal(x.ui.find('div').style.height,200);
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

test('stalled iframe initialization reports an actionable failure without advancing',async t=>{
 const x=await setup(t,false);x.timeout();assert.deepEqual(x.errors,[false]);assert.equal(x.ended(),0);
 x.events.onReady();x.timeout();assert.deepEqual(x.errors,[false]);assert.equal(x.loads[0],'abcdefghijk');
});

test('a modal during YouTube initialization defers playback without calling an unready player',async t=>{
 const x=await setup(t,false);x.modal();assert.equal(x.paused(),0);
 x.events.onReady();assert.deepEqual(x.loads,[]);assert.equal(x.cues[0],'abcdefghijk');assert.equal(x.ended(),0);
});

test('transient missing YouTube metadata during navigation does not throw or advance',async t=>{
 const x=await setup(t);x.missingData();assert.doesNotThrow(()=>x.tick());
 assert.doesNotThrow(()=>x.events.onStateChange({data:0}));assert.equal(x.ended(),0);
});

test('mixed Choice reuses its YouTube player across audio and permits only its own playback dialog',async t=>{
 const dialog={};const x=await setup(t,true,{active:false,playbackDialogRef:{current:dialog}});
 x.modal(dialog);assert.equal(x.loads.length,0);assert.equal(x.cues.at(-1),'abcdefghijk');
 await x.ui.update({active:true,requestId:2});assert.equal(x.loads.at(-1),'abcdefghijk');assert.equal(x.instances(),1);
 x.events.onStateChange({data:1});x.events.onStateChange({data:0});assert.equal(x.ended(),1);
 await x.ui.update({videoId:'lmnopqrstuv',requestId:3});assert.equal(x.instances(),1);assert.equal(x.loads.at(-1),'lmnopqrstuv');
 await x.ui.update({active:false,requestId:4});x.events.onStateChange({data:0});assert.equal(x.ended(),1);
 await x.ui.update({active:true,requestId:5});assert.equal(x.instances(),1);assert.equal(x.loads.at(-1),'lmnopqrstuv');
 x.modal({});x.events.onStateChange({data:0});assert.equal(x.ended(),1);
});
