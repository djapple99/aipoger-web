import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMv,text} from './helpers/mv-runtime.mjs';
import {creditCopy,creditReason} from '../src/lib/credit-copy.ts';
const history=Array.from({length:12},(_,i)=>({id:`entry-${i}`,delta:i%2?-5:15,reason:i%2?'bible_prompt_copy':'daily_visit',created_at:`2026-10-${String(i+1).padStart(2,'0')}T20:00:00Z`}));
const entryIds=ui=>ui.nodes().filter(n=>n.type==='li'&&n.props.children?.[1]?.type==='strong').map(n=>n.props.children[0].props.children[1].props.dateTime);
const mocks={'next/link':{__esModule:true,default:'a'},'@/lib/credit-copy':{creditCopy,creditReason}};
const mount=(t,props={})=>mountMv(t,'src/components/credit-wallet.tsx',{lang:'zh',balance:42,entries:history,...props},mocks);
const button=(ui,label)=>ui.nodes().find(n=>n.type==='button'&&text(n).replace('⌄','')===label);
async function click(ui,label){const node=button(ui,label);assert.ok(node,label);node.props.onClick();await ui.flush();}
test('wallet starts compact and task/history disclosures are mutually exclusive and reversible',async t=>{
 const ui=await mount(t);
 assert.match(ui.text(),/42/);assert.equal(ui.nodes().filter(n=>n.type==='button').length,2);
 assert.equal(ui.nodes().filter(n=>n.type==='li').length,0);assert.equal(ui.nodes().filter(n=>n.type==='a').length,0);
 await click(ui,'如何賺點數');assert.equal(ui.nodes().find(n=>n.type==='a').props.href,'/ai-music?lang=zh#works');assert.equal(button(ui,'如何賺點數').props['aria-expanded'],true);
 assert.ok(ui.nodes().some(n=>n.type==='a'&&n.props.href==='/battle/listen?lang=zh'));
 assert.ok(ui.nodes().some(n=>n.type==='a'&&n.props.href==='/ai-music?lang=zh#works'));
 assert.equal(entryIds(ui).length,0);
 await click(ui,'查看收支明細');assert.equal(button(ui,'如何賺點數').props['aria-expanded'],false);
 assert.equal(ui.nodes().filter(n=>n.type==='a').length,0);assert.equal(entryIds(ui).length,5);
 await click(ui,'查看收支明細');assert.equal(entryIds(ui).length,0);assert.equal(button(ui,'查看收支明細').props['aria-expanded'],false);
});
test('history shows latest five, paginates without dropping/mutating entries and reopens at newest',async t=>{
 const original=structuredClone(history);const ui=await mount(t);
 await click(ui,'查看收支明細');assert.deepEqual(entryIds(ui),history.slice(-5).reverse().map(n=>n.created_at));assert.match(ui.text(),/1–5 \/ 12/);
 assert.equal(button(ui,'較新').props.disabled,true);
 await click(ui,'更早');assert.deepEqual(entryIds(ui),history.slice(2,7).reverse().map(n=>n.created_at));
 await click(ui,'更早');assert.deepEqual(entryIds(ui),history.slice(0,2).reverse().map(n=>n.created_at));assert.equal(button(ui,'更早').props.disabled,true);
 await click(ui,'較新');assert.equal(entryIds(ui).length,5);
 await click(ui,'查看收支明細');await click(ui,'查看收支明細');assert.match(ui.text(),/1–5 \/ 12/);
 assert.deepEqual(history,original);
 await ui.update({balance:37,entries:history.slice(-1)});assert.match(ui.text(),/37/);assert.equal(entryIds(ui).length,1);assert.match(ui.text(),/1–1 \/ 1/);
});
test('four-language controls, empty history, debt and zero balance remain understandable',async t=>{
 for(const [lang,earn,transactions] of [['zh','如何賺點數','查看收支明細'],['en','Earn Credit','View transactions'],['ja','Creditを増やす','収支明細'],['ko','Credit 모으기','내역 보기']]){
 const ui=await mount(t,{lang,balance:0,debt:3,entries:[]});assert.match(ui.text(),/0/);assert.ok(ui.nodes().some(n=>n.props.role==='status'));
 await click(ui,transactions);assert.equal(entryIds(ui).length,0);assert.equal(ui.nodes().filter(n=>n.type==='button').length,2);
 await click(ui,earn);assert.equal(ui.nodes().find(n=>n.type==='a').props.href,`/ai-music?lang=${lang}#works`);assert.equal(ui.nodes().filter(n=>n.type==='a').length,4);assert.ok(ui.nodes().every(n=>n.type!=='a'||n.props.href.includes(`lang=${lang}`)));
 }
});
