import test from "node:test";
import assert from "node:assert/strict";
import { blindPairKey, isBlindChoice, popularityScore } from "../src/lib/blind-listening.ts";
import { rankMusicPool } from "../src/lib/music-pool.ts";
test("A/B swaps represent the same pair, and only explicit A/B/tie choices are valid",()=>{
 assert.equal(blindPairKey("first","second"),blindPairKey("second","first"));
 for(const value of ["A","B","tie"])assert.ok(isBlindChoice(value));
 for(const value of ["",null,undefined,0,"winner","a"])assert.equal(isBlindChoice(value),false);
});
test("cumulative popularity adds hearts, actual work ratings and blind preferences without neutral or max-heart scaling",()=>{
 assert.equal(popularityScore(10,{people:0,preferencePoints:0}),30);
 assert.equal(popularityScore(0,{people:0,preferencePoints:0}),0);
 assert.equal(popularityScore(0,{people:1,preferencePoints:1}),3);
 assert.equal(popularityScore(0,{people:1,preferencePoints:0.5}),1.5);
 assert.equal(popularityScore(1,{people:2,preferencePoints:1.5},15.6),23.1);
 assert.equal(popularityScore(1,{people:1,preferencePoints:1},9),15);
 assert.equal(popularityScore(1,{people:50,preferencePoints:50},9),162);
 assert.equal(popularityScore(-1,{people:0,preferencePoints:99},NaN),0);
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
 assert.deepEqual(rows.map(r=>r.track.id),["blind-only","mixed","a","b"]);
 assert.deepEqual(rows.map(r=>r.rank),[1,2,3,4]);
 assert.deepEqual(rows.slice(0,10),rows.slice(0,50));
 assert.equal(rankMusicPool([{...base,id:"future",createdAt:"2027-01-01T00:00:00Z"}],now).length,0);
});
