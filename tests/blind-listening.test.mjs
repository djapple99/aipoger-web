import test from "node:test";
import assert from "node:assert/strict";
import { blindPairKey, isBlindChoice, popularityScore } from "../src/lib/blind-listening.ts";
import { rankMusicPool } from "../src/lib/music-pool.ts";
test("A/B swaps represent the same pair, and only explicit A/B/tie choices are valid",()=>{
 assert.equal(blindPairKey("first","second"),blindPairKey("second","first"));
 for(const value of ["A","B","tie"])assert.ok(isBlindChoice(value));
 for(const value of ["",null,undefined,0,"winner","a"])assert.equal(isBlindChoice(value),false);
});
test("50/50 popularity uses comparable terms and neutral shrinkage for small blind samples",()=>{
 assert.equal(popularityScore(10,10,{people:0,preferencePoints:0}),75);
 assert.equal(popularityScore(0,10,{people:0,preferencePoints:0}),25);
 assert.ok(popularityScore(0,10,{people:1,preferencePoints:1})<28);
 assert.equal(popularityScore(5,10,{people:10,preferencePoints:5}),50);
 assert.equal(popularityScore(5,10,{people:10,preferencePoints:10}),62.5);
 assert.ok(popularityScore(1,10,{people:1,preferencePoints:1})<popularityScore(1,10,{people:50,preferencePoints:50}));
});
test("Top50 keeps mixed ordering, sequential positions, expiry and no-support exclusions",()=>{
 const now=Date.parse("2026-10-13T00:00:00Z");
 const base={createdAt:"2026-09-01T00:00:00Z",poolSupporterCount:2,blindSampleCount:10,blindPreferencePoints:5};
 const rows=rankMusicPool([
 {...base,id:"mixed",blindPreferencePoints:10},
 {...base,id:"a"},{...base,id:"b"},
 {...base,id:"expired",createdAt:"2026-05-01T00:00:00Z",poolSupporterCount:999},
 {...base,id:"none",poolSupporterCount:0,blindSampleCount:0,blindPreferencePoints:0},
 {...base,id:"only-losses",poolSupporterCount:0,blindPreferencePoints:0},
 {...base,id:"blind-only",poolSupporterCount:0,blindSampleCount:40,blindPreferencePoints:40}
 ],now);
 assert.deepEqual(rows.map(r=>r.track.id),["mixed","a","b","blind-only"]);
 assert.deepEqual(rows.map(r=>r.rank),[1,2,3,4]);
 assert.deepEqual(rows.slice(0,10),rows.slice(0,50));
 assert.equal(rankMusicPool([{...base,id:"future",createdAt:"2027-01-01T00:00:00Z"}],now).length,0);
});
