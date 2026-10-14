import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTs} from './helpers/choice-runtime.mjs';
test('private read-only preparation is coalesced per account and consumed once',async()=>{
 const calls=[];const cache=loadTs('src/lib/server-blind-preparation.ts',{'./server-blind-listening':{prepareBlindQuestion:async(_db,user,q)=>{calls.push([user,q]);return {pending:null,pairs:[[user,q]]};}}});
 await Promise.all([cache.warmBlindPreparation({},'reader','question'),cache.warmBlindPreparation({},'reader','question')]);assert.equal(calls.length,1);
 const consumed=await cache.takeBlindPreparation({},'reader','question');assert.equal(consumed.revalidate,true);assert.equal(calls.length,1);
 await cache.takeBlindPreparation({},'other','question');assert.equal(calls.length,2);await cache.takeBlindPreparation({},'reader','question');assert.equal(calls.length,3);
});
test('failed optional preparation is evicted so an actual answer can retry normally',async()=>{
 let fail=true,count=0;const cache=loadTs('src/lib/server-blind-preparation.ts',{'./server-blind-listening':{prepareBlindQuestion:async()=>{count++;if(fail)throw Error('temporarily unavailable');return {pending:null,pairs:[]};}}});
 await assert.rejects(cache.warmBlindPreparation({},'reader','question'));fail=false;
 const next=await cache.takeBlindPreparation({},'reader','question');assert.equal(next.revalidate,false);assert.equal(count,2);
});
