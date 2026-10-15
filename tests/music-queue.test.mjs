import assert from "node:assert/strict";
import test from "node:test";
import { nextMusicIndex, playableMusicQueue, shuffleMusicQueue } from "../src/lib/music-queue.ts";
test("queue boundaries distinguish repeating radio from a finite playlist", () => {
  assert.equal(nextMusicIndex(0, 0, true), null);
  assert.equal(nextMusicIndex(0, 1, true), 0);
  assert.equal(nextMusicIndex(0, 1, false), null);
  assert.equal(nextMusicIndex(2, 3, true), 0);
  assert.equal(nextMusicIndex(2, 3, false), null);
  assert.equal(nextMusicIndex(0, 3, true), 1);
});
test("filtering unavailable audio preserves the selected song and queue order", () => {
  const tracks = [{id:"a",audioUrl:""},{id:"b",audioUrl:"b.mp3"},{id:"c",audioUrl:"c.mp3"}];
  assert.deepEqual(playableMusicQueue(tracks, 2), { queue: tracks.slice(1), index: 1 });
  assert.deepEqual(playableMusicQueue(tracks, 0), { queue: tracks.slice(1), index: 0 });
  assert.deepEqual(playableMusicQueue([]), {queue:[],index:0});
});

test("radio accepts verified YouTube IDs alongside audio without treating other links as audio", () => {
 const tracks = [{id:"a",audioUrl:"a.mp3"}, {id:"yt",audioUrl:"",youtubeId:"8sNY25QdMFA"}, {id:"bad",audioUrl:"",youtubeId:"invalid"}, {id:"other",audioUrl:""}];
 assert.deepEqual(playableMusicQueue(tracks,1),{queue:tracks.slice(0,2),index:1});
});
test("shuffle retains every original work once and does not mutate its source",()=>{
 const tracks=[1,2,3,4];const mixed=shuffleMusicQueue(tracks,()=>0);
 assert.deepEqual(tracks,[1,2,3,4]);assert.deepEqual([...mixed].sort(),tracks);assert.notDeepEqual(mixed,tracks);
 assert.deepEqual(shuffleMusicQueue([]),[]);assert.deepEqual(shuffleMusicQueue([1]),[1]);
});
