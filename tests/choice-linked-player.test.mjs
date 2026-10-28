import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/choice-runtime.mjs';
function harness(){
 let state=null,handle;const calls=[];
 const Component=loadTs('src/components/showtime-queue-player.tsx',{
  react:{forwardRef:f=>f,useRef:()=>({current:null}),useEffect:()=>{},useState:()=>[state,v=>{state=typeof v==='function'?v(state):v;}],useImperativeHandle:(_ref,fn)=>{handle=fn();}},
  'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  'next/dynamic':{__esModule:true,default:()=> 'ExternalPlayer'},'lucide-react':{},
  '@/lib/i18n':{useI18n:()=>({lang:'en'})},
  '@/lib/music-player-store':{musicPlayer:{start:async(...args)=>{calls.push(args);return true;},toggle:()=>calls.push('pause'),close:()=>calls.push('close')},getMusicPlayerState:()=>({playing:true})},
 }).default;
 const render=()=>Component({},{});render();return{render,calls,get handle(){return handle;},get state(){return state;}};
}
const song=(id,extra={})=>({id,title:id,artist:'Artist',coverUrl:'/cover',audioUrl:'/audio.mp3',...extra});
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
test('audio/YouTube queue retains every item, order and selected index in the existing global player',async()=>{
 const h=harness(),queue=[song('audio'),song('youtube',{audioUrl:'',externalUrl:'https://youtu.be/dQw4w9WgXcQ'})];
 assert.equal(await h.handle.start(queue,1,'Choice'),true);
 assert.deepEqual(h.calls[0][0].map(t=>t.id),['audio','youtube']);assert.equal(h.calls[0][0][1].youtubeId,'dQw4w9WgXcQ');assert.equal(h.calls[0][1],1);assert.equal(h.state,null);
});
test('mixed provider queue pauses background audio and retains manual navigation without dropping Suno/Spotify',async()=>{
 const h=harness(),queue=[song('suno',{audioUrl:'',externalUrl:'https://suno.com/song/00000000-0000-4000-8000-000000000001'}),song('audio'),song('spotify',{audioUrl:'',externalUrl:'https://open.spotify.com/track/1234567890123456789012'})];
 assert.equal(await h.handle.start(queue,0),true);assert.deepEqual(h.calls,['pause']);
 let tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='ExternalPlayer').props.media.provider,'suno');
 nodes(tree).find(n=>n.props['aria-label']==='Next track').props.onClick();tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='audio').props.src,'/audio.mp3');
 nodes(tree).find(n=>n.type==='audio').props.onEnded();tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='ExternalPlayer').props.media.provider,'spotify');assert.equal(h.state.queue.length,3);
 nodes(tree).find(n=>n.props['aria-label']==='Close player').props.onClick();assert.equal(h.state,null);
});
