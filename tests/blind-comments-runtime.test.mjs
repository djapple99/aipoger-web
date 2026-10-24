import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv, text } from './helpers/mv-runtime.mjs';
import { battleRetroCopy } from '../src/lib/battle-retro-copy.ts';
const comments=[1,2,3].map(n=>({id:'comment-'+n,name:'Listener '+n,text:'Thoughts '+n,createdAt:'2026-10-24T00:00:0'+n+'Z'}));
async function mount(t,{lang='zh',rows=comments,fail=false,delay=false}={}) {
 const calls=[];let reviewed=0,release;
 const ui=await mountMv(t,'src/components/blind-work-comments.tsx',{trackId:'selected-A',version:0,onReview(){reviewed++;}},{
  '@/lib/i18n':{useI18n:()=>({lang})},'@/lib/battle-retro-copy':{battleRetroCopy},'lucide-react':{MessageSquare:()=>null},'./battle-retro.module.css':{__esModule:true,default:{}},
 },{fetch:async(url,init)=>{calls.push({url,init});if(delay&&url.includes('selected-A'))await new Promise(resolve=>{release=resolve;});return {ok:!fail,json:async()=>({comments:url.includes('selected-B')?[{...comments[0],name:'Next listener'}]:rows})};}});
 return {...ui,calls,reviewed:()=>reviewed,release:()=>release?.(),button:label=>ui.nodes().find(n=>n.type==='button'&&text(n)===label)?.props};
}
for(const lang of ['zh','en','ja','ko'])test('selected comments '+lang+' use original public names and invite the same review flow',async t=>{
 const ui=await mount(t,{lang}),c=battleRetroCopy(lang);assert.equal(ui.calls.length,1);assert.equal(ui.calls[0].url,'/api/listen-bar/track-comments?trackId=selected-A');assert.equal(ui.calls[0].init.cache,'no-store');
 assert.ok(ui.text().includes('Listener 3'));assert.ok(ui.text().includes('Thoughts 2'));assert.equal(ui.text().includes('Listener 1'),false,'only the two most recent comments are previewed');
 ui.button(c.reviewSong).onClick();assert.equal(ui.reviewed(),1);assert.equal(ui.calls.length,1,'opening a review does not auto-submit');
});
test('empty comments invite a first review while failed reads offer retry without pretending there are no comments',async t=>{
 const c=battleRetroCopy('zh'),empty=await mount(t,{rows:[]});assert.ok(empty.text().includes(c.firstReview));
 const failed=await mount(t,{fail:true});assert.ok(failed.text().includes(c.commentsFailed));assert.equal(failed.text().includes(c.firstReview),false);
 failed.button(c.retry).onClick();await failed.flush();assert.equal(failed.calls.length,2);
});
test('late previous-work comments cannot leak into a newly revealed work',async t=>{
 const ui=await mount(t,{delay:true});assert.equal(ui.calls.length,1);
 await ui.update({trackId:'selected-B'});assert.equal(ui.calls[0].init.signal.aborted,true);assert.ok(ui.text().includes('Next listener'));
 ui.release();await ui.flush();assert.equal(ui.text().includes('Listener 3'),false);assert.ok(ui.text().includes('Next listener'));
 await ui.update({version:1});assert.equal(ui.calls.length,3,'saving a review refreshes the original selected work');
});
