import assert from 'node:assert/strict';
import test from 'node:test';
import {BOOM_BAP_STUDIO_MOVES} from '../src/lib/suno-boom-bap-studio-prompts.ts';
import {SUNO_STUDIO_MASTERING_MOVES} from '../src/lib/suno-studio-mastering-prompts.ts';
import {SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS,getSunoStudioMasteringAudioPreview} from '../src/lib/suno-studio-mastering-audio-previews.ts';
import {bibleCatalogDefaults,mergeBibleCatalog} from '../src/lib/ai-music-bible-content.ts';

test('all eleven screenshot prompts reach the member catalog as Hip-Hop studio moves without preview audio',()=>{
 assert.equal(BOOM_BAP_STUDIO_MOVES.length,11);
 for(const catalog of [bibleCatalogDefaults(),mergeBibleCatalog([])]){
  for(const move of BOOM_BAP_STUDIO_MOVES){const found=catalog.promptMoves.find(x=>x.key===move.key);assert.ok(found);assert.equal(found.category,'mastering');assert.equal(found.studioFamily,'hip-hop');assert.equal(found.copy.zh,move.copy.en);assert.equal(found.metadata.status,'Experimental');assert.equal(found.metadata.lastVerifiedAt,null);assert.equal(getSunoStudioMasteringAudioPreview(move.key),null);}
 }
 assert.equal(SUNO_STUDIO_MASTERING_MOVES.length,111);assert.equal(SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.length,100);
});
test('nearby styles retain distinct variants, original tempos and searchable regional classification',()=>{
 const bySuffix=key=>BOOM_BAP_STUDIO_MOVES.find(x=>x.key.endsWith(key));
 assert.equal(new Set(BOOM_BAP_STUDIO_MOVES.map(x=>x.copy.en)).size,11);
 assert.deepEqual(BOOM_BAP_STUDIO_MOVES.map(x=>Number(x.copy.en.match(/(\d+) bpm/)[1])),[90,90,92,92,88,88,92,94,86,84,87]);
 assert.ok(bySuffix('east-golden-vinyl').copy.en.includes('MPC swing'));assert.ok(bySuffix('east-golden-mpc3000').copy.en.includes('MPC3000 swing'));
 assert.ok(bySuffix('east-jazz-warm-horns').copy.en.includes('dusty acoustic drums'));assert.ok(bySuffix('east-jazz-tape-rhodes').copy.en.includes('nostalgic tape saturation'));
 assert.ok(bySuffix('east-dark-drum-break').copy.en.includes('distorted vinyl noise'));assert.ok(bySuffix('east-dark-sub-bass').copy.en.includes('heavy sub bass'));
 for(const [region,count] of [['東岸',6],['西岸',2],['南方',2],['融合特色',1]])assert.equal(BOOM_BAP_STUDIO_MOVES.filter(x=>x.keywords.includes(region)).length,count);
 assert.ok(BOOM_BAP_STUDIO_MOVES.every(x=>x.keywords.includes('boom bap')&&!/Nas|Premi[eè]r|Wu-Tang|Mobb Deep|Outkast|Scarface|Tribe Called Quest/i.test(x.copy.en)));
});
