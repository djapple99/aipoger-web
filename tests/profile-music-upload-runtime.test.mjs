import {mp3Frames} from './helpers/mp3-fixture.mjs';
import {inspectMp3File,mp3UploadError} from '../src/lib/mp3-upload-policy.ts';
import {audioAssetId} from '../src/lib/audio-asset-ref.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {MUSIC_GENRE_OPTIONS} from '../src/lib/music-genres.ts';
import {creditCopy} from '../src/lib/credit-copy.ts';
import {saveCreatorSubmission} from '../src/lib/creator-submission.ts';
import {creatorUploadLimitReached} from '../src/lib/creator-upload-quota.ts';
import {limitListenBarDisplayText} from '../src/lib/listen-bar-field-limits.ts';
const code=ts.transpileModule(readFileSync(new URL('../src/components/profile-music-upload.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
async function mount(t,{failInsert=false,quotaUsed=0,privateFailure=false,sessionId='creator',unlimited=false,creditBalance=null,existingTracks=[]}={}){
 let cursor=0,tree,dirty=true,submitted=0;const state=[],refs=[],effects=[],uploads=[],inserts=[],requests=[];
 const quota={limit:unlimited?null:3,used:unlimited?0:quotaUsed,unlimited,...(creditBalance===null?{}:{creditEnabled:true,balance:creditBalance,debt:0,extraCost:60,canSubmit:creditBalance>=60})};
 const session={access_token:'unit-test-only',user:{id:sessionId}};
 const react={useState(v){const i=cursor++;if(!(i in state))state[i]=v;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;dirty=true}]},useRef(v){return refs[cursor++]??={current:v}},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps?.some((v,j)=>!Object.is(v,effects[i].deps?.[j]))){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}}}};
 const supabase={auth:{getSession:async()=>({data:{session}})},storage:{from:bucket=>({upload:async(path)=>{uploads.push({bucket,path});return {error:null}},remove:async()=>({error:null})})},from(){let insert=false,payload;const q={select(){return q},eq(){return q},limit(){return q},insert(v){insert=true;payload=v;inserts.push(v);return q},maybeSingle:async()=>insert?{data:failInsert?null:{...payload,id:'11111111-1111-4111-8111-111111111111',created_at:new Date().toISOString()},error:failInsert?{message:'insert rejected',code:'23514'}:null}:{data:null,error:null}};return q}};
 const modules={'@/lib/mp3-upload-policy':{inspectMp3File,mp3UploadError},'@/lib/audio-asset-ref':{audioAssetId},'@/lib/credit-copy':{creditCopy},'@/lib/creator-submission':{saveCreatorSubmission},'@/lib/music-player-store':{getMusicPlayerState:()=>({playing:false}),musicPlayer:{toggle(){}}},react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'@/lib/i18n':{useI18n:()=>({lang:'zh',t:x=>x})},'@/lib/supabase':{supabase},'@/lib/audio-metadata':{parseAudioMetadata:async()=>({title:'Parsed title',fallbackTitle:'File title',artist:'Embedded Artist',genre:'UNSUPPORTED'})},'@/lib/file-hash':{sha256File:async()=> 'test-hash'},'@/lib/analytics-client':{logAnalyticsEvent:async()=>{}},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS},'@/lib/youtube-url':{normalizeYouTubeUrl:v=>v||null},'@/lib/creator-upload-quota':{creatorUploadLimitReached},'@/lib/use-creator-upload-quota':{useCreatorUploadQuota:()=>({quota,refresh:async()=>quota})},'@/components/genre-suggestion':{__esModule:true,default:'genre-suggestion',genreCopy:()=>({privacy:'temporary excerpts'})},'@/components/safety-notice':{__esModule:true,default:'safety-notice'},'@/lib/image-upload-policy':{IMAGE_UPLOAD_ACCEPT:'image/png',imageContentType:()=> 'image/png',isAllowedImageUploadFile:()=>true},'@/lib/listen-bar-field-limits':{LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS:32,LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS:24,limitListenBarDisplayText},'@/lib/listen-bar-upload-policy':{LISTEN_BAR_AUDIO_UPLOAD_ACCEPT:'.mp3,.m4a,.aac,.ogg',LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES:30*1024*1024,LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL:'30MB',isAllowedListenBarAudioFile:f=>f.name.endsWith('.mp3'),isListenBarStorageSizeLimitError:()=>false,listenBarAudioContentType:()=> 'audio/mpeg',listenBarAudioSizeLabel:()=> '32MB',uploadListenBarAudioFile:async(bucket)=>{const verified='https://aipoger.com/api/audio-assets/11111111-1111-4111-8111-111111111111';uploads.push({bucket,path:verified});return verified;}},'@/lib/listen-bar':{LISTEN_BAR_AUDIO_BUCKET:'audio',LISTEN_BAR_COVER_BUCKET:'covers'}};
 const fetch=async(url,init={})=>{requests.push({url,...init});return {ok:!(privateFailure&&url.includes('my-tracks')),json:async()=>url.includes('my-tracks')?{tracks:existingTracks}:{} ,text:async()=>''}};
 const document={createElement:()=>{const audio={duration:120};Object.defineProperty(audio,'src',{set(){queueMicrotask(()=>audio.onloadedmetadata())}});return audio}};
 const url={createObjectURL:()=>'/unit-file',revokeObjectURL(){}};
 const loaded={exports:{}};new Function('require','module','exports','fetch','document','URL','window',code)(name=>{assert.ok(name in modules,name);return modules[name]},loaded,loaded.exports,fetch,document,url,{requestAnimationFrame:fn=>fn(),dispatchEvent(){}});
 function render(){cursor=0;dirty=false;tree=loaded.exports.default({userId:'creator',creatorDefaultName:'Profile name',onSubmitted(){submitted++}})}
 async function flush(){for(let i=0;i<6;i++){await new Promise(setImmediate);if(dirty)render()}}
 render();await flush();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 const find=(type,filter=()=>true)=>nodes(tree).find(n=>n.type===type&&filter(n.props))?.props;
 async function prepare({confirm=true}={}){await find('input',p=>p.accept==='.mp3,.m4a,.aac,.ogg').onChange({target:{files:[new File([mp3Frames()],'song.mp3',{type:'audio/mpeg'})]}});await flush();find('select').onChange({target:{value:'Jazz / Bossa 微醺時刻'}});await flush();if(confirm){await find('form').onSubmit({preventDefault(){}});await flush();assert.equal(uploads.length,0);find('audio').onPlaying();await flush();find('input',p=>p.type==='checkbox').onChange({target:{checked:true}});await flush()}}
 return {prepare,flush,find,checkboxes:()=>nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox').map(n=>n.props),uploads,inserts,requests,submitted:()=>submitted,submit:()=>find('form').onSubmit({preventDefault(){}})};
}
test('moved submission preserves manual genre, original ownership, audio hash and public insertion',async t=>{
 const ui=await mount(t);await ui.prepare();assert.equal(ui.find('select').value,'Jazz / Bossa 微醺時刻');await ui.submit();await ui.flush();assert.equal(ui.inserts.length,1);assert.equal(ui.inserts[0].genre,'Jazz / Bossa 微醺時刻');assert.equal(ui.inserts[0].created_by,'creator');assert.equal(ui.inserts[0].bar_phase,'public');assert.equal(ui.inserts[0].audio_sha256,'test-hash');assert.equal(ui.uploads.length,1);assert.equal(ui.submitted(),1);assert.equal(ui.find('select').value,'');
});
test('failed insert keeps draft and cleans only assets from that attempted upload',async t=>{
 const ui=await mount(t,{failInsert:true});await ui.prepare();await ui.submit();await ui.flush();assert.equal(ui.submitted(),0);assert.equal(ui.find('select').value,'Jazz / Bossa 微醺時刻');const cleanup=ui.requests.find(r=>r.url.includes('cleanup-upload'));assert.ok(cleanup);assert.equal(JSON.parse(cleanup.body).audioPath,ui.uploads[0].path);
});
test('weekly quota and private read failure prevent storage and database writes',async t=>{
 for(const options of [{quotaUsed:3},{privateFailure:true}]){const ui=await mount(t,options);await ui.prepare();await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);assert.equal(ui.inserts.length,0);assert.equal(ui.submitted(),0)}
});
test('unsupported and oversized audio is rejected before an upload',async t=>{
 const ui=await mount(t);const input=ui.find('input',p=>p.accept==='.mp3,.m4a,.aac,.ogg');await input.onChange({target:{files:[new File(['wav'],'music.wav')]}});await ui.flush();assert.equal(ui.uploads.length,0);assert.equal(ui.inserts.length,0);
 const file=new File(['mp3'],'big.mp3');Object.defineProperty(file,'size',{value:32*1024*1024});await input.onChange({target:{files:[file]}});await ui.flush();assert.equal(ui.find('button',p=>p.type==='submit').disabled,true);
});
test('another signed-in identity cannot submit through a stale creator form',async t=>{
 const ui=await mount(t,{sessionId:'another'});await ui.prepare();await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);assert.equal(ui.inserts.length,0);assert.equal(ui.submitted(),0);
});
test('two concurrent submit clicks produce one upload and one work',async t=>{
 const ui=await mount(t);await ui.prepare();await Promise.all([ui.submit(),ui.submit()]);await ui.flush();assert.equal(ui.uploads.length,1);assert.equal(ui.inserts.length,1);assert.equal(ui.submitted(),1);
});

test('rights are required but preview and playback are optional; changing a file clears confirmation',async t=>{
 const ui=await mount(t);await ui.prepare({confirm:false});await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);assert.equal(ui.inserts.length,0);assert.ok(ui.find('audio'));await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);ui.find('input',p=>p.type==='checkbox').onChange({target:{checked:true}});await ui.flush();await ui.find('input',p=>p.accept==='.mp3,.m4a,.aac,.ogg').onChange({target:{files:[new File(['different'],'new.mp3',{type:'audio/mpeg'})]}});await ui.flush();await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0);
});

test('owner can submit a file without a numeric allowance',async t=>{
 const ui=await mount(t,{unlimited:true,quotaUsed:3});await ui.prepare();assert.equal(ui.find('button',p=>p.type==='submit').disabled,false);await ui.submit();await ui.flush();assert.equal(ui.inserts.length,1);assert.equal(ui.submitted(),1);
});
test('members with five existing songs in one genre may submit within their weekly allowance',async t=>{
 const existingTracks=Array.from({length:8},(_,i)=>({id:String(i),genre:'Jazz / Bossa 微醺時刻',is_active:true,bar_phase:'public'}));
 const ui=await mount(t,{existingTracks});await ui.prepare();await ui.submit();await ui.flush();assert.equal(ui.inserts.length,1);assert.equal(ui.submitted(),1);
});

test('fifth audio submission requires explicit 60 Credit consent even after four successful works',async t=>{
 const ui=await mount(t,{quotaUsed:4,creditBalance:60});await ui.prepare({confirm:false});await ui.submit();await ui.flush();
 ui.checkboxes()[1].onChange({target:{checked:true}});await ui.flush();
 await ui.submit();await ui.flush();assert.equal(ui.uploads.length,0,'preview and rights alone do not authorize Credit spending');
 ui.checkboxes()[0].onChange({target:{checked:true}});await ui.flush();await ui.submit();await ui.flush();
 assert.equal(ui.uploads.length,1);assert.equal(ui.inserts.length,1);assert.equal(ui.inserts[0].credit_submission_confirmed,true);
});
