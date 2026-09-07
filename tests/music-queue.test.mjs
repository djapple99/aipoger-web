import assert from "node:assert/strict";
import test from "node:test";
import { nextMusicIndex, playableMusicQueue } from "../src/lib/music-queue.ts";
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
