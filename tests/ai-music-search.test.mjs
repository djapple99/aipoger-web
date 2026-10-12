import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAiMusicTracks } from '../src/lib/ai-music-filter.ts';

const tracks = Array.from({length:18}, (_,i) => ({
  id:`work-${i}`, title:i===17 ? 'Midnight Radio' : `Song ${i}`,
  creator:i===17 ? 'Alice Huang' : 'Bob', aiTool:i===17 ? 'Suno' : 'Udio',
  genre:i%2 ? 'Jazz' : 'Rap', heartCount:18-i,
}));

test('search includes the complete catalog beyond the six visible genre cards', () => {
  assert.deepEqual(filterAiMusicTracks(tracks,'midnight','').map(x=>x.id),['work-17']);
  assert.deepEqual(filterAiMusicTracks(tracks,'Alice SUNO','').map(x=>x.id),['work-17']);
  assert.deepEqual(filterAiMusicTracks(tracks,'ＭＩＤＮＩＧＨＴ','').map(x=>x.id),['work-17']);
});
test('search and genre intersect; clearing them restores original ordering, counts and identities', () => {
  assert.equal(filterAiMusicTracks(tracks,'alice','Rap').length,0);
  assert.deepEqual(filterAiMusicTracks(tracks,'alice','Jazz'),[tracks[17]]);
  const result=filterAiMusicTracks(tracks,'  ','');
  assert.deepEqual(result,tracks);
  assert.equal(result[17],tracks[17]);
  assert.equal(result[17].heartCount,1);
});
test('genre-only filtering preserves ordering without modifying the catalog', () => {
  const snapshot=structuredClone(tracks);
  assert.deepEqual(filterAiMusicTracks(tracks,'','Jazz').map(x=>x.id),tracks.filter(x=>x.genre==='Jazz').map(x=>x.id));
  assert.deepEqual(tracks,snapshot);
  assert.equal(filterAiMusicTracks(tracks,'no such song','').length,0);
});
