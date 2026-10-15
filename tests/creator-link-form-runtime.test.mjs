import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMv} from './helpers/mv-runtime.mjs';
import {MUSIC_GENRE_OPTIONS} from '../src/lib/music-genres.ts';
import {creatorText} from '../src/lib/creator-center-copy.ts';
import {creditCopy} from '../src/lib/credit-copy.ts';
import {creatorUploadLimitReached} from '../src/lib/creator-upload-quota.ts';
async function setup(t){
 const requests=[],timers=new Map();let serial=0;const deferred=[];
 const quota={unlimited:false,used:0,limit:3,creditEnabled:true,balance:15,debt:0,extraCost:60,canSubmit:true};
 const ui=await mountMv(t,'src/components/creator-link-upload.tsx',{userId:'author',name:'Author',onSubmitted(){}},{
 '@/lib/credit-copy':{creditCopy},'@/lib/creator-center-copy':{creatorText},'@/lib/use-creator-upload-quota':{useCreatorUploadQuota:()=>({quota,refresh:async()=>quota})},'@/lib/creator-upload-quota':{creatorUploadLimitReached},'@/lib/i18n':{useI18n:()=>({lang:'zh',t:x=>x})},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'author'},access_token:'test'}}})}}},'@/lib/music-genres':{MUSIC_GENRE_OPTIONS},'@/components/external-music-player':{__esModule:true,default:'external-player'},'@/components/creator-center.module.css':{__esModule:true,default:{}},
 },{window:{setTimeout(fn){timers.set(++serial,fn);return serial},clearTimeout(id){timers.delete(id)},dispatchEvent(){}},fetch:async(_,init)=>{const b=JSON.parse(init.body);requests.push(b);if(b.action==='preview')return new Promise(resolve=>deferred.push({url:b.url,resolve}));return {ok:true,json:async()=>({trackId:'work'})}}});
 const find=(type,pred=()=>true)=>ui.nodes().find(n=>n.type===type&&pred(n.props))?.props;
 async function link(url){find('input',p=>p.type==='url').onChange({target:{value:url}});await ui.flush();for(const [id,fn] of [...timers]){timers.delete(id);fn()}await ui.flush()}
 async function answer(index,title){deferred[index].resolve({ok:true,json:async()=>({preview:{title,artist:'Artist',token:'verified-'+title,media:{provider:'youtube',mediaId:'abcdefghijk',url:deferred[index].url}}})});await ui.flush()}
 return {...ui,find,link,answer,requests,quota};
}
test('automatic metadata permits submission with rights and genre without mounting a preview or playing',async t=>{
 const u=await setup(t);assert.equal(u.find('button',p=>p.children==='確認投稿').disabled,true);
 await u.link('https://youtu.be/abcdefghijk');await u.answer(0,'Song');assert.equal(u.find('external-player'),undefined);
 u.find('select').onChange({target:{value:'Original 自我風格'}});u.find('input',p=>p.type==='checkbox'&&p.checked===false&&p.onChange.toString().includes('setRights')).onChange({target:{checked:true}});await u.flush();
 const submit=u.find('button',p=>p.children==='確認投稿');assert.equal(submit.disabled,false);await submit.onClick();await u.flush();
 const sent=u.requests.find(r=>r.action==='submit');assert.equal(sent.confirmedRights,true);assert.equal(sent.confirmedPlayback,undefined);assert.equal(sent.previewToken,'verified-Song');assert.match(u.text(),/投稿成功/);
});
test('changing the link ignores late metadata and clears its rights confirmation',async t=>{
 const u=await setup(t);await u.link('https://youtu.be/abcdefghijk');await u.link('https://youtu.be/lmnopqrstuv');await u.answer(1,'New song');await u.answer(0,'Old song');assert.match(u.text(),/New song/);assert.doesNotMatch(u.text(),/Old song/);assert.equal(u.find('button',p=>p.children==='確認投稿').disabled,true);
});
