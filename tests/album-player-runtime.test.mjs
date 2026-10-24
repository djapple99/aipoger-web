import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv } from './helpers/mv-runtime.mjs';
import { albumCopy } from '../src/lib/album-copy.ts';
import { albumPath } from '../src/lib/album.ts';
import { parseExternalMusic } from '../src/lib/external-music.ts';
const tracks=[{id:'first',title:'First song',artist:'Creator',audioUrl:'/a.mp3',coverUrl:'/a.jpg'},{id:'second',title:'Second song',artist:'Creator',videoId:'8sNY25QdMFA',coverUrl:'/b.jpg'}];
const album={id:'album',title:'Original album',artist:'Creator',genre:'Jazz',description:'Album intro',workKind:'album',trackIds:tracks.map(t=>t.id),tracks,coverUrl:'/album.jpg',publishedAt:new Date().toISOString()};
for(const lang of ['zh','en','ja','ko'])test(`album share opens without autoplay, keeps sequence and original feedback ID (${lang})`,async t=>{
 const player={playing:false};let toggles=0;const calls=[];
 const ui=await mountMv(t,'src/components/album-view.tsx',{initialId:'album'}, {'next/link':{__esModule:true,default:'link'},'lucide-react':{Play:'play',Share2:'share',MessageCircleMore:'comment'},'@/lib/album-copy':{albumCopy},'@/lib/album':{albumPath},'@/lib/i18n':{useI18n:()=>({lang})},'@/lib/external-music':{parseExternalMusic},'@/lib/music-player-store':{getMusicPlayerState:()=>player,useMusicPlayer:()=>player,musicPlayer:{toggle(){toggles++;player.playing=false;}}},'./work-image':{__esModule:true,default:'image'},'./album-view.module.css':{__esModule:true,default:{}},'./mv-player':{__esModule:true,default:'mv'},'./external-music-player':{__esModule:true,default:'external'},'./home-work-feedback':{__esModule:true,default:'feedback'}}, {fetch:async url=>{calls.push(url);return {ok:true,json:async()=>({albums:[album]})};},window:{location:{search:''}}});
 assert.equal(ui.nodes().some(n=>n.type==='audio'||n.type==='mv'||n.type==='external'),false);assert.ok(ui.text().includes(albumCopy(lang).note));
 player.playing=true;ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']===`${albumCopy(lang).play} · Original album`).props.onClick();await ui.flush();
 assert.equal(toggles,1);const audio=ui.nodes().find(n=>n.type==='audio');assert.equal(audio.props.src,'/a.mp3');audio.props.onEnded();await ui.flush();assert.equal(ui.nodes().find(n=>n.type==='mv').props.work.id,'second');
 ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']===`${albumCopy(lang).comments} · Original album`).props.onClick();await ui.flush();assert.equal(ui.nodes().find(n=>n.type==='feedback').props.work.id,'album');
 assert.deepEqual(calls,['/api/albums']);
});
