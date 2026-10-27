import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMv} from './helpers/mv-runtime.mjs';
import {nextMusicIndex,playableMusicQueue} from '../src/lib/music-queue.ts';
import {createListeningMeasurement,listeningTrackId} from '../src/lib/music-listening-measurement.ts';
test('one radio session crosses audio and YouTube boundaries, preserves IDs and advances exactly once',async t=>{
 let handle,snapshot,plays=0,pauses=0; const listeningIntents=[];
 const ui=await mountMv(t,'src/components/global-music-player.tsx',{}, {
 'lucide-react':new Proxy({}, {get:(_,k)=>String(k)}),'@/components/youtube-radio-player':{__esModule:true,default:'yt-player'},'@/components/home-work-feedback':{__esModule:true,default:'feedback'},'@/components/auth-required-dialog':{__esModule:true,default:'auth'},
 '@/lib/media-volume-control':{clampMediaVolume:v=>Math.max(0,Math.min(1,v)),setNativeMediaVolume:()=>true},'@/lib/supabase':{supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},'@/lib/music-queue':{nextMusicIndex,playableMusicQueue},'@/lib/analytics-client':{logAnalyticsEvent:async()=>{}},'@/lib/music-listening-measurement':{createListeningMeasurement:(id,intentional,startedAt)=>{listeningIntents.push(intentional);return createListeningMeasurement(id,intentional,startedAt)},listeningTrackId},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/music-player-store':{registerMusicPlayer:v=>handle=v,publishMusicPlayer:v=>snapshot=v}
 },{document:{body:{style:{}},querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},window:{location:{pathname:'/ai-music',search:'',hash:''},addEventListener(){},removeEventListener(){},setInterval:()=>1,clearInterval(){}}});
 const audio={paused:true,duration:100,currentTime:0,play:async()=>{plays++;audio.paused=false},pause:()=>{pauses++;audio.paused=true},load(){},removeAttribute(){}};
 ui.find('audio').ref.current=audio;
 const queue=[{id:'one',heartTrackId:'one',audioUrl:'/one.mp3',title:'One',artist:'A'}, {id:'two',heartTrackId:'two',audioUrl:'',youtubeId:'abcdefghijk',title:'Two',artist:'B'}, {id:'three',heartTrackId:'three',audioUrl:'/three.mp3',title:'Three',artist:'C'}];
 await handle.start(queue,0,'Radio',{sourceKey:'bar:test',repeat:true});await ui.flush();assert.equal(plays,1);assert.equal(snapshot.session.queue.length,3);
 ui.find('audio').onEnded();await ui.flush();assert.equal(snapshot.session.index,1);assert.ok(ui.find('yt-player'));assert.equal(snapshot.session.queue[1].heartTrackId,'two');assert.ok(pauses>0);
 ui.find('audio').onError();await ui.flush();assert.equal(snapshot.playbackError,'');
 ui.find('yt-player').onPlaying(true);await ui.flush();assert.equal(snapshot.playing,true);
 ui.find('yt-player').onEnded();await ui.flush();assert.equal(snapshot.session.index,2);assert.equal(plays,2);assert.equal(ui.find('yt-player'),undefined);
 handle.move(-1);await ui.flush();assert.equal(snapshot.session.index,1);assert.ok(ui.find('yt-player'));
 handle.close();await ui.flush();assert.equal(snapshot.session,null);assert.equal(snapshot.playing,false);
 await handle.start(queue,0,'Radio',{sourceKey:'bar:all',repeat:true,intentional:false});await ui.flush();
 assert.equal(listeningIntents[0],true);assert.equal(listeningIntents.at(-1),false);
 assert.equal('intentional' in snapshot.session,false);
});
