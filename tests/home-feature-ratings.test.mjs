import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './helpers/choice-runtime.mjs';
const { addWorkRatingSummaries }=loadTs('src/lib/server-mv-reviews.ts');
test('home recommendations use public rating summaries and keep original works and support',async()=>{
 const works=[{id:'rated',publishedAt:'2026-10-27',supporterCount:3},{id:'unrated'}];const calls=[];
 await addWorkRatingSummaries(works,{rpc:async name=>{calls.push(name);return {data:[{track_id:'rated',average:'9.25',people:2,total:'18.5'}],error:null};}});
 assert.deepEqual(calls,['work_rating_summaries']);
 assert.deepEqual(works,[{id:'rated',publishedAt:'2026-10-27',supporterCount:3,ratingAverage:9.25,ratingCount:2,ratingTotal:18.5},{id:'unrated',ratingAverage:null,ratingCount:0,ratingTotal:0}]);
});
test('rating failures never turn unavailable scores into unrated zeroes',async()=>{
 const works=[{id:'rated'}];await assert.rejects(addWorkRatingSummaries(works,{rpc:async()=>({data:null,error:{message:'unavailable'}})}));
 assert.deepEqual(works,[{id:'rated'}]);
 await addWorkRatingSummaries([],{rpc:()=>assert.fail('empty recommendations need no lookup')});
});
