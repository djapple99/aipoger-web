import test from 'node:test';
import assert from 'node:assert/strict';
import { isWorkRating, parseWorkRating } from '../src/lib/work-rating.ts';
import { rankMusicPool } from '../src/lib/music-pool.ts';
test('decimal rating accepts 1–10 with one fractional place and normalizes mobile commas',()=>{
 for(const score of [1,4.8,6.8,9,10]) assert.equal(isWorkRating(score),true);
 for(const score of [0,10.1,4.85,NaN,Infinity,null,undefined,'9',9.00000000001]) assert.equal(isWorkRating(score),false);
 assert.equal(parseWorkRating(' 4.8 '),4.8);assert.equal(parseWorkRating('6,8'),6.8);assert.equal(parseWorkRating('10.0'),10);
 for(const value of ['','0','11','4.85','1e1','0x9','4.8.','4,8,1']) assert.equal(parseWorkRating(value),null);
});
test('actual rating sum gives more collective support weight and ties go directly to newer original publication',()=>{
 const now=Date.parse('2026-10-14T08:00:00+08:00');const base={createdAt:'2026-09-01T00:00:00Z',poolSupporterCount:0,blindSampleCount:0,blindPreferencePoints:0};
 const rows=rankMusicPool([{...base,id:'few',ratingCount:2,ratingTotal:20},{...base,id:'many',ratingCount:20,ratingTotal:160},{...base,id:'newer',createdAt:'2026-10-01T00:00:00Z',ratingCount:2,ratingTotal:20},{...base,id:'text-only',ratingCount:0,ratingTotal:0,commentCount:5000}],now);
 assert.deepEqual(rows.map(r=>[r.track.id,r.rank,r.track.popularityScore]),[['many',1,160],['newer',2,20],['few',3,20]]);
});
