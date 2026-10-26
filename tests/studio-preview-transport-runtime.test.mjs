import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMv} from './helpers/mv-runtime.mjs';
import {loadTs} from './helpers/choice-runtime.mjs';
import {nextMusicIndex,playableMusicQueue} from '../src/lib/music-queue.ts';
import {createListeningMeasurement,listeningTrackId} from '../src/lib/music-listening-measurement.ts';
async function mountTransport(t,lang='zh'){
 let handle,snapshot,plays=0,loads=0;
 const ui=await mountMv(t,'src/components/global-music-player.tsx',{}, {
  'lucide-react':new Proxy({}, {get:(_,k)=>String(k)}),'@/components/youtube-radio-player':{default:'yt-player'},'@/components/home-work-feedback':{default:'feedback'},'@/components/auth-required-dialog':{default:'auth'},
  '@/lib/media-volume-control':{clampMediaVolume:v=>v,setNativeMediaVolume:()=>true},'@/lib/supabase':{supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},'@/lib/music-queue':{nextMusicIndex,playableMusicQueue},'@/lib/analytics-client':{logAnalyticsEvent:async()=>{}},'@/lib/music-listening-measurement':{createListeningMeasurement,listeningTrackId},'@/lib/i18n':{useI18n:()=>({lang})},'@/lib/music-player-store':{registerMusicPlayer:v=>handle=v,publishMusicPlayer:v=>snapshot=v}
 },{document:{body:{style:{}},querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},window:{location:{pathname:'/ai-music-bible',search:'',hash:''},addEventListener(){},removeEventListener(){},setInterval:()=>1,clearInterval(){}}});
 const audio={paused:true,ended:false,duration:15,currentTime:0,src:'',fail:false,play:async()=>{plays++;if(audio.fail)throw Error('blocked');audio.paused=false;ui.find('audio').onPlay();},pause:()=>{audio.paused=true;ui.find('audio').onPause({currentTarget:audio});},load(){loads++;},removeAttribute(){audio.src='';}};
 ui.find('audio').ref.current=audio;
 return {ui,audio,get handle(){return handle},get snapshot(){return snapshot},get plays(){return plays},get loads(){return loads},button(name){return ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']===name)?.props}};
}
const track={id:'studio-mastering-classic-disco',title:'70s Classic Disco 錄音室母帶',artist:'AIPOGER × Suno',coverUrl:'/aipoger-logo.png',audioUrl:'/audio/ai-music-bible/studio-mastering/classic-disco.mp3'};
for(const [lang,play,pause] of [['zh','播放','暫停'],['en','Play','Pause'],['ja','再生','一時停止'],['ko','재생','일시정지']])test(`separate play/pause controls preserve the loaded preview and position (${lang})`,async t=>{
 const x=await mountTransport(t,lang);await x.handle.start([track]);await x.ui.flush();
 assert.ok(x.button(play));assert.ok(x.button(pause));assert.equal(x.snapshot.playing,true);
 x.audio.currentTime=6.2;const loads=x.loads;x.button(pause).onClick();await x.ui.flush();assert.equal(x.audio.paused,true);assert.equal(x.snapshot.playing,false);assert.equal(x.audio.currentTime,6.2);
 x.button(pause).onClick();await x.ui.flush();assert.equal(x.audio.currentTime,6.2);
 x.button(play).onClick();await x.ui.flush();assert.equal(x.audio.paused,false);assert.equal(x.snapshot.playing,true);assert.equal(x.audio.currentTime,6.2);assert.equal(x.loads,loads);assert.equal(x.audio.src,track.audioUrl);
 const plays=x.plays;x.button(play).onClick();await x.ui.flush();assert.equal(x.plays,plays);
});
test('pause or close cancels a resume before its async preparation can restart the audio',async t=>{
 const x=await mountTransport(t);await x.handle.start([track]);await x.ui.flush();x.button('暫停').onClick();await x.ui.flush();const plays=x.plays;
 x.button('播放').onClick();x.button('暫停').onClick();await x.ui.flush();assert.equal(x.plays,plays);assert.equal(x.audio.paused,true);assert.equal(x.snapshot.playing,false);
 x.button('播放').onClick();x.handle.close();await x.ui.flush();assert.equal(x.plays,plays);assert.equal(x.snapshot.session,null);assert.equal(x.snapshot.playing,false);assert.equal(x.snapshot.playbackError,'');
});
test('failed resume retains the track and can be retried without reloading it',async t=>{
 const x=await mountTransport(t);await x.handle.start([track]);await x.ui.flush();x.button('暫停').onClick();await x.ui.flush();x.audio.currentTime=5.4;x.audio.fail=true;
 x.button('播放').onClick();await x.ui.flush();assert.equal(x.snapshot.playing,false);assert.ok(x.snapshot.playbackError);assert.equal(x.audio.currentTime,5.4);x.audio.fail=false;
 x.button('播放').onClick();await x.ui.flush();assert.equal(x.snapshot.playing,true);assert.equal(x.snapshot.playbackError,'');assert.equal(x.audio.currentTime,5.4);
});
test('studio preview card toggles the current clip instead of starting its queue again',async t=>{
 let status='idle',starts=0,toggles=0;
 const ui=await mountMv(t,'src/components/studio-audio-preview-button.tsx',{id:track.id,title:track.title,isZh:true,onStart:()=>starts++},{'lucide-react':{Play:'play',Pause:'pause'},'@/lib/music-player-store':{useMusicTrackPlayback:()=>status,musicPlayer:{toggle:()=>toggles++}}});
 assert.match(ui.text(),/15 秒試聽/);ui.find('button').onClick();assert.equal(starts,1);
 status='playing';await ui.update({});assert.match(ui.text(),/暫停試聽/);ui.find('button').onClick();assert.equal(toggles,1);
 status='paused';await ui.update({});assert.match(ui.text(),/繼續試聽/);ui.find('button').onClick();assert.equal(toggles,2);assert.equal(starts,1);
 status='idle';await ui.update({isZh:false});assert.match(ui.text(),/15s preview/);
});
test('per-track status ignores progress updates and resets when another clip or no session is active',()=>{
 const x=loadTs('src/lib/music-player-store.ts');const session={queue:[track,{...track,id:'another'}],index:0,sourceLabel:'Studio'};
 x.publishMusicPlayer({session,playing:true,currentTime:1,duration:15});assert.equal(x.getMusicTrackPlayback(track.id),'playing');assert.equal(x.getMusicTrackPlayback('another'),'idle');
 x.publishMusicPlayer({session,playing:true,currentTime:6,duration:15});assert.equal(x.getMusicTrackPlayback(track.id),'playing');
 x.publishMusicPlayer({session,playing:false,currentTime:6,duration:15});assert.equal(x.getMusicTrackPlayback(track.id),'paused');
 x.publishMusicPlayer({session:{...session,index:1},playing:true,currentTime:0,duration:15});assert.equal(x.getMusicTrackPlayback(track.id),'idle');
 x.publishMusicPlayer({session:null,playing:false,currentTime:0,duration:0});assert.equal(x.getMusicTrackPlayback('another'),'idle');
});
