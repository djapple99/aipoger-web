import test from 'node:test';import assert from 'node:assert/strict';
import{mountMv}from'./helpers/mv-runtime.mjs';import{loadTs,USER,uuid}from'./helpers/choice-runtime.mjs';
import{mp3Frames}from'./helpers/mp3-fixture.mjs';
async function mount(t,{mode='drop',target=false,error=null}={}){
 const requests=[],uploads=[],params=new URLSearchParams(target?'challengeEntryId='+uuid(2):''),paths=[];
 const preview={title:'MP3 track',creator:'Stage',duration:120,token:'verified',playback:{type:'upload',url:'https://aipoger.com/api/audio-assets/'+uuid(3),start:0,seconds:120}};
 const auth={getSession:async()=>({data:{session:{user:{id:USER},access_token:'local-test'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})};
 const ui=await mountMv(t,'src/components/battle-link-submission.tsx',{mode},{
 'next/link':{default:'a'},'next/image':{default:'img'},'next/navigation':{useRouter:()=>({push:p=>paths.push(p)}),useSearchParams:()=>params},
 'lucide-react':{ArrowLeft:'arrow',Link2:'link-icon',Swords:'swords'},'@/lib/i18n':{useI18n:()=>({t:k=>k})},
 '@/lib/q-crash-rules':loadTs('src/lib/q-crash-rules.ts'),'@/lib/image-upload-policy':{IMAGE_UPLOAD_ACCEPT:'.png'},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS:[{value:'rock',labelKey:'rock'}]},
 '@/lib/auth-urls':{rememberAuthNextPath(){}},'@/lib/battle-link-rules':loadTs('src/lib/battle-link-rules.ts'),'@/components/battle-media-player':{default:'media-player'},
 '@/lib/mp3-upload-policy':loadTs('src/lib/mp3-upload-policy.ts'),'@/lib/audio-upload-client':{uploadVerifiedMp3:async file=>{uploads.push(file.name);if(error)throw Error(error);return{assetId:uuid(3),path:preview.playback.url}},discardAudioDraft:async()=>{}},
 '@/lib/supabase':{supabase:{auth}}},
 {fetch:async(url,init={})=>{const body=init.body?JSON.parse(init.body):null;requests.push({url,body});return{ok:true,json:async()=>url.includes('?target=')?{target:{id:uuid(2),title:'Host',genre:'rock',mode:'90'}}:body?.action==='preview'?{preview}:body?.action==='submit'?{queueId:uuid(4)}:{row:{match_group_id:uuid(5)}}}}});
 return{ui,requests,uploads,paths,async choose(){ui.nodes().find(n=>n.props?.role==='tab'&&n.props.children==='MP3').props.onClick();await ui.flush();const input=ui.nodes().find(n=>n.type==='input'&&n.props.type==='file'&&n.props.accept.includes('.mp3'));input.props.onChange({target:{files:[new File([mp3Frames()],'My song.mp3',{type:'audio/mpeg'})],value:'file'}});await ui.flush();}};
}
test('Drop supports MP3 without reopening large-file uploads and retains the host-selected format',async t=>{
 const x=await mount(t,{target:true});await x.choose();assert.deepEqual(x.uploads,['My song.mp3']);assert.equal(x.ui.nodes().find(n=>n.type==='input'&&n.props.value==='My song').props.value,'My song');
 const chosen=x.ui.nodes().find(n=>n.type==='button'&&n.props.children==='90 秒');assert.equal(chosen.props.disabled,true);assert.equal(chosen.props['aria-pressed'],true);
 assert.equal(x.requests.find(r=>r.body?.action==='preview').body.url,'https://aipoger.com/api/audio-assets/'+uuid(3));
 assert.equal(x.ui.nodes().some(n=>n.type==='input'&&n.props.accept?.includes('.wav')),false);
});
test('Q Crash accepts the same MP3 source while keeping its full-track flow',async t=>{
 const x=await mount(t,{mode:'q_crash'});await x.choose();assert.deepEqual(x.uploads,['My song.mp3']);assert.equal(x.ui.nodes().some(n=>n.type==='select'&&['60','90','full'].includes(n.props.value)),false);assert.match(x.ui.text(),/320 kbps/);
});
test('MP3 validation failures retain the form and create no entry or matchup',async t=>{
 const x=await mount(t,{error:'INVALID_MP3'});await x.choose();assert.match(x.ui.text(),/無法確認為完整的 MP3/);assert.equal(x.requests.length,0);assert.equal(x.paths.length,0);
});
