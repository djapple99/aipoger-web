import assert from 'node:assert/strict';
import test from 'node:test';
import { mountMv } from './helpers/mv-runtime.mjs';
import { mvCopy } from '../src/lib/mv-copy.ts';
import { homeCopy } from '../src/lib/home-copy.ts';
import {creditCopy} from '../src/lib/credit-copy.ts';
import {parseWorkRating} from '../src/lib/work-rating.ts';
async function mount(t,{lang='zh',canRate=true,fail=false,surface='mv'}={}){
 const calls=[],saved=[],busy=[];let nextId=1;
 const session={access_token:'test',user:{id:'reader'}};
 const window=new EventTarget();class CustomEvent extends Event {constructor(name,data={}){super(name);this.detail=data.detail;}}
 const ui=await mountMv(t,'src/components/mv-rating-form.tsx',{trackId:'first',signedIn:true,surface,onSaved:c=>saved.push(c),onBusy:b=>busy.push(b)},
 {'@/lib/credit-copy':{creditCopy},'@/lib/i18n':{useI18n:()=>({lang})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'@/lib/work-rating':{parseWorkRating},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}})}}}},
 {window,CustomEvent,crypto:{randomUUID:()=>`receipt-${nextId++}`},fetch:async(url,init={})=>{calls.push({url,...init});return {ok:init.method==='POST'?!fail:true,json:async()=>init.method==='POST'?{comment:null}:{myScore:null,canRate,ratingAverage:null,ratingCount:0}};}});
 return {...ui,calls,saved,busy,button:()=>ui.nodes().find(x=>x.type==='button'&&x.props.type==='submit')?.props};
}
for(const lang of ['zh','en','ja','ko'])test(`Decimal scores start empty and submit 1–10 with thoughts in one operation (${lang})`,async t=>{
 const ui=await mount(t,{lang});assert.equal(ui.nodes().filter(x=>x.type==='input'&&x.props.type==='radio').length,0);assert.equal(ui.find('input').value,'');assert.equal(ui.find('input').inputMode,'decimal');
 ui.find('input').onChange({target:{value:'8.7'}});ui.find('textarea').onChange({target:{value:'音樂節奏和剪接很有默契，我喜歡最後的轉場。'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 const body=JSON.parse(ui.calls.find(x=>x.method==='POST').body);assert.equal(body.score,8.7);assert.equal(body.trackId,'first');assert.equal(body.text,'音樂節奏和剪接很有默契，我喜歡最後的轉場。');assert.ok(ui.text().includes(mvCopy(lang).reviewSaved));assert.equal(ui.find('textarea').value,'');
});
test('failed MV review retains thoughts and retries with the same idempotent receipt',async t=>{
 const ui=await mount(t,{fail:true});ui.find('input').onChange({target:{value:'6.8'}});ui.find('textarea').onChange({target:{value:'Keep this review'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 assert.equal(ui.find('textarea').value,'Keep this review');assert.equal(ui.saved.length,0);const posts=ui.calls.filter(x=>x.method==='POST');assert.equal(JSON.parse(posts[0].body).requestId,JSON.parse(posts[1].body).requestId);
});
test('author can discuss while all score controls are disabled',async t=>{
 const ui=await mount(t,{canRate:false});assert.equal(ui.find('input').disabled,true);assert.ok(ui.text().includes(mvCopy('zh').ownWork));ui.find('textarea').onChange({target:{value:'作品創作想法'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();assert.equal(JSON.parse(ui.calls.find(x=>x.method==='POST').body).score,null);
});
test('returning to a queued work restores its own draft instead of borrowing the next work',async t=>{
 const drafts=new Map([['first',{score:6,text:'First work draft'}]]);const ui=await mount(t);await ui.update({drafts});
 // Selection updates the cache for this work only; the actual dialog remounts per work ID.
 ui.find('input').onChange({target:{value:'8.7'}});ui.find('textarea').onChange({target:{value:'Keep first work feedback'}});await ui.flush();assert.equal(drafts.get('first').text,'Keep first work feedback');assert.equal(drafts.has('second'),false);
});

test('music reviews use the shared work ID, decimal score and song endpoint',async t=>{
 const ui=await mount(t,{surface:'music'});assert.ok(ui.calls[0].url.startsWith('/api/listen-bar/review?trackId=first'));assert.ok(ui.text().includes(mvCopy('zh').rateSongQuestion));
 ui.find('input').onChange({target:{value:'4,8'}});ui.find('textarea').onChange({target:{value:'樂器的編排很有意思，最後一段很有張力。'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 const post=ui.calls.find(x=>x.method==='POST');assert.equal(post.url,'/api/listen-bar/review');assert.equal(JSON.parse(post.body).score,4.8);
});
test('out-of-range and two-decimal entries retain the draft and cannot be submitted',async t=>{
 const ui=await mount(t);ui.find('textarea').onChange({target:{value:'A real comment'}});
 for(const value of ['','0','10.1','8.75','word']) {ui.find('input').onChange({target:{value}});await ui.flush();assert.equal(ui.button().disabled,true);await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();}
 assert.equal(ui.calls.some(x=>x.method==='POST'),false);assert.equal(ui.find('textarea').value,'A real comment');
 ui.find('input').onChange({target:{value:'10'}});await ui.flush();assert.equal(ui.button().disabled,false);
});

test('owner deletion refreshes the same work without showing an award-reclaim action',async t=>{
 const events=[];const win=new EventTarget();class CustomEvent extends Event{constructor(name,data={}){super(name);this.detail=data.detail;}};
 for(const name of ['aipoger:mv-rating','aipoger:credit'])win.addEventListener(name,e=>events.push({name:e.type,...e.detail}));
 let active=true;const saved=[];const session={access_token:'test',user:{id:'reader'}};
 const ui=await mountMv(t,'src/components/mv-rating-form.tsx',{trackId:'first',signedIn:true,onSaved:c=>saved.push(c),onBusy(){}},
  {'@/lib/credit-copy':{creditCopy},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'@/lib/work-rating':{parseWorkRating},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}})}}}},
  {window:win,CustomEvent,crypto:{randomUUID:()=> 'request-id'},fetch:async(_url,init={})=>{if(init.method==='PATCH')active=false;return {ok:true,json:async()=>init.method==='PATCH'?{ok:true}:{myScore:8.7,canRate:true,canEditScore:true,canEditComment:true,canDeleteComment:true,myComment:active?{id:'comment',text:'My original review'}:null,ratingAverage:active?8.7:null,ratingCount:active?1:0}}}});
 const button=ui.nodes().find(n=>n.type==='button'&&n.props.children===creditCopy('zh').withdraw);await button.props.onClick();await ui.flush();
 assert.deepEqual(saved,[null]);assert.equal(events.filter(e=>e.name==='aipoger:mv-rating')[0].trackId,'first');assert.equal(events.filter(e=>e.name==='aipoger:credit').length,1);
 assert.equal(ui.nodes().some(n=>n.type==='button'&&n.props.children===creditCopy('zh').withdraw),false);
});

for(const owner of [false,true]) test(`existing review locks member scores and grants appropriate edit/delete controls (owner=${owner})`,async t=>{
 let count=0,body='原本的評論文字，音樂編排與低音聲部相互呼應十分好聽。';const calls=[];
 const ui=await mountMv(t,'src/components/mv-rating-form.tsx',{trackId:'first',signedIn:true,onSaved(){},onBusy(){}},
 {'@/lib/credit-copy':{creditCopy},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'@/lib/work-rating':{parseWorkRating},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}},
 {window:new EventTarget(),CustomEvent:class extends Event{constructor(name){super(name)}},crypto:{randomUUID:()=> 'request'},fetch:async(url,init={})=>{calls.push({url,...init});if(init.method==='PATCH'){count++;body=JSON.parse(init.body).text;}return {ok:true,json:async()=>init.method?{ok:true}:{myScore:8.7,canRate:true,canEditScore:owner,canDeleteComment:owner,canEditComment:owner||count===0,myComment:{id:'comment',text:body}}};}});
 assert.equal(ui.find('input').disabled,true);assert.equal(ui.find('textarea').readOnly,true);
 const deletion=()=>ui.nodes().find(n=>n.type==='button'&&n.props.children===creditCopy('zh').withdraw);
 assert.equal(Boolean(deletion()),owner);
 const edit=()=>ui.nodes().find(n=>n.type==='button'&&n.props.children===(owner?creditCopy('zh').edit:creditCopy('zh').editOnce));
 edit().props.onClick();await ui.flush();assert.equal(ui.find('input').disabled,!owner);
 if(owner){
  ui.find('input').onChange({target:{value:'7.1'}});await ui.flush();
  ui.nodes().find(n=>n.type==='button'&&n.props.children===creditCopy('zh').cancelEdit).props.onClick();await ui.flush();
  assert.equal(ui.find('input').value,'8.7');assert.equal(ui.find('input').disabled,true);
  edit().props.onClick();await ui.flush();ui.find('input').onChange({target:{value:'9.2'}});
 }
 ui.find('textarea').onChange({target:{value:'補充第二次聽到的細節，弦樂鋪陳與主旋律之間很有層次。'}});await ui.flush();await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 const patch=JSON.parse(calls.find(c=>c.method==='PATCH').body);assert.equal(patch.score,owner?9.2:null);assert.equal(patch.active,true);
 assert.equal(Boolean(edit()),owner);assert.equal(ui.find('textarea').readOnly,true);
 if(!owner)assert.ok(ui.text().includes(creditCopy('zh').edited));
});


test('a legacy comment without a score can still use its one text correction',async t=>{
 const calls=[];
 const ui=await mountMv(t,'src/components/mv-rating-form.tsx',{trackId:'first',signedIn:true,onSaved(){},onBusy(){}},
 {'@/lib/credit-copy':{creditCopy},'@/lib/i18n':{useI18n:()=>({lang:'zh'})},'@/lib/mv-copy':{mvCopy},'@/lib/home-copy':{homeCopy},'@/lib/work-rating':{parseWorkRating},'./home-editorial.module.css':{__esModule:true,default:{}},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}},
 {window:new EventTarget(),CustomEvent:class extends Event{constructor(name){super(name)}},crypto:{randomUUID:()=> 'request'},fetch:async(url,init={})=>{calls.push({url,...init});return {ok:true,json:async()=>init.method?{ok:true}:{myScore:null,canRate:true,canEditScore:false,canDeleteComment:false,canEditComment:true,myComment:{id:'legacy',text:'原本還沒有分數的文字評論'}}};}});
 ui.nodes().find(n=>n.type==='button'&&n.props.children===creditCopy('zh').editOnce).props.onClick();await ui.flush();
 assert.equal(ui.find('input').required,false);assert.equal(ui.find('input').disabled,true);
 ui.find('textarea').onChange({target:{value:'補充原本評論的一些創作細節與音樂感受'}});await ui.flush();
 assert.equal(ui.nodes().find(n=>n.type==='button'&&n.props.type==='submit').props.disabled,false);
 await ui.find('form').onSubmit({preventDefault(){}});await ui.flush();
 assert.equal(JSON.parse(calls.find(c=>c.method==='PATCH').body).score,null);
});
