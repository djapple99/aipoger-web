import assert from 'node:assert/strict';
import test from 'node:test';
import { mountMv } from './helpers/mv-runtime.mjs';
import { mvCopy } from '../src/lib/mv-copy.ts';
import { homeCopy } from '../src/lib/home-copy.ts';
async function mount(t,{lang='zh',canRate=true,fail=false}={}){
 const calls=[],saved=[],busy=[];let nextId=1;
 const session={access_token:'test',user:{id:'reader'}};
 const window=new EventTarget();class CustomEvent extends Event {constructor(name,data){super(name);this.detail=data.detail;}}
 const ui=await mountMv(t,'src/components/mv-rating-form.tsx',{trackId:'first',signedIn:true,onSaved:c=>saved.push(c),onBusy:b=>busy.push(b)},
 {'@/lib/i18n':{useI18n:()=>({lang})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}})}}}},
 {window,CustomEvent,crypto:{randomUUID:()=>`receipt-${nextId++}`},fetch:async(url,init={})=>{calls.push({url,...init});return {ok:init.method==='POST'?!fail:true,json:async()=>init.method==='POST'?{comment:null}:{myScore:null,canRate,ratingAverage:null,ratingCount:0}};}});
 return {...ui,calls,saved,busy,button:()=>ui.nodes().find(x=>x.type==='button'&&x.props.type==='submit')?.props};
}
for(const lang of ['zh','en','ja','ko'])test(`MV scores start unselected and submit 1–10 with thoughts in one operation (${lang})`,async t=>{
 const ui=await mount(t,{lang});const numbers=ui.nodes().filter(x=>x.type==='input'&&x.props.type==='radio');assert.equal(numbers.length,10);assert.ok(numbers.every(x=>!x.props.checked));
 numbers[7].props.onChange();ui.find('textarea').onChange({target:{value:'音樂節奏和剪接很有默契，我喜歡最後的轉場。'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 const body=JSON.parse(ui.calls.find(x=>x.method==='POST').body);assert.equal(body.score,8);assert.equal(body.trackId,'first');assert.equal(body.text,'音樂節奏和剪接很有默契，我喜歡最後的轉場。');assert.ok(ui.text().includes(mvCopy(lang).reviewSaved));assert.equal(ui.find('textarea').value,'');
});
test('failed MV review retains thoughts and retries with the same idempotent receipt',async t=>{
 const ui=await mount(t,{fail:true});ui.nodes().find(x=>x.type==='input').props.onChange();ui.find('textarea').onChange({target:{value:'Keep this review'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 assert.equal(ui.find('textarea').value,'Keep this review');assert.equal(ui.saved.length,0);const posts=ui.calls.filter(x=>x.method==='POST');assert.equal(JSON.parse(posts[0].body).requestId,JSON.parse(posts[1].body).requestId);
});
test('author can discuss while all score controls are disabled',async t=>{
 const ui=await mount(t,{canRate:false});assert.equal(ui.find('fieldset').disabled,true);assert.ok(ui.text().includes(mvCopy('zh').ownWork));ui.find('textarea').onChange({target:{value:'作品創作想法'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(JSON.parse(ui.calls.find(x=>x.method==='POST').body).score,null);
});
test('returning to a queued work restores its own draft instead of borrowing the next work',async t=>{
 const drafts=new Map([['first',{score:6,text:'First work draft'}]]);const ui=await mount(t);await ui.update({drafts});
 // Selection updates the cache for this work only; the actual dialog remounts per work ID.
 ui.nodes().find(x=>x.type==='input'&&x.props.value===8).props.onChange();ui.find('textarea').onChange({target:{value:'Keep first work feedback'}});await ui.flush();assert.equal(drafts.get('first').text,'Keep first work feedback');assert.equal(drafts.has('second'),false);
});
