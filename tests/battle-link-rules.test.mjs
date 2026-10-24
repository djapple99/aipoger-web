import test from 'node:test';
import assert from 'node:assert/strict';
import { battleClip, dropPlaybackMode, publicWorkIdFromLink, battlePlaybackSeconds } from '../src/lib/battle-link-rules.ts';
import { isDropBattleEndedOrPastExpectedEnd } from '../src/lib/battle-pool-client.ts';
import { resolveDropBattleLinkResolution } from '../src/lib/drop-battle-link-resolution.ts';
test('60/90 segments are per track; full tracks retain different actual lengths', () => {
  assert.equal(dropPlaybackMode('30'),null); assert.equal(dropPlaybackMode(90),null);
  assert.deepEqual(battleClip('60',240,12.5),{start:12.5,seconds:60});
  assert.deepEqual(battleClip('90',240,150),{start:150,seconds:90});
  assert.equal(battleClip('90',80,0),null); assert.equal(battleClip('60',100,50),null);
  assert.equal(battleClip('60',200,-1),null); assert.equal(battleClip('full',NaN,0),null);
  assert.deepEqual(battleClip('full',242,18),{start:0,seconds:242});
  assert.equal(battlePlaybackSeconds({playback_a:{seconds:242},playback_b:{seconds:320}}),565);
});
test('work links canonicalize original IDs, without accepting arbitrary hosts or albums', () => {
  const id='7c9ed1cb-073f-4d03-8366-7e73454ad708';
  for (const url of [`https://aipoger.com/works/${id}?lang=ja`,`https://aipoger.com/mv?track=${id}#comments`,`https://www.aipoger.com/ai-music?track=${id}`]) assert.equal(publicWorkIdFromLink(url),id);
  assert.equal(publicWorkIdFromLink(`https://evil.example/works/${id}`),null);
  assert.equal(publicWorkIdFromLink(`https://aipoger.com/ai-music?album=${id}`),null);
});
test('a full battle is not expired or redirected on the old 45 second clock', () => {
  const battle={status:'live',started_at:new Date(0).toISOString(),playback_a:{seconds:300},playback_b:{seconds:280}};
  assert.equal(isDropBattleEndedOrPastExpectedEnd(battle,200000),false);
  assert.equal(isDropBattleEndedOrPastExpectedEnd(battle,630000),true);
  assert.equal(resolveDropBattleLinkResolution({battle,battleId:'x',nowMs:200000}).action,'stay');
});
