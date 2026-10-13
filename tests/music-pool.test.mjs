import assert from 'node:assert/strict';
import test from 'node:test';
import {isInMusicPool,musicPoolExpiresAt,musicPoolSupportCounts,rankMusicPool} from '../src/lib/music-pool.ts';

test('pool expires after three calendar months at the same Taipei time, including month-end clamping',()=>{
 assert.equal(new Date(musicPoolExpiresAt('2026-11-30T04:05:00Z')).toISOString(),'2027-02-28T04:05:00.000Z');
 assert.equal(new Date(musicPoolExpiresAt('2027-11-30T04:05:00Z')).toISOString(),'2028-02-29T04:05:00.000Z');
 assert.equal(new Date(musicPoolExpiresAt('2026-07-31T15:59:59Z')).toISOString(),'2026-10-31T15:59:59.000Z');
});
test('pool includes publication, excludes exact expiration, missing/bad dates and future uploads',()=>{
 const birth='2026-07-13T18:00:00Z'; const expiry=musicPoolExpiresAt(birth);
 assert.equal(isInMusicPool(birth,Date.parse(birth)),true);assert.equal(isInMusicPool(birth,expiry-1),true);assert.equal(isInMusicPool(birth,expiry),false);
 for(const date of [undefined,null,'','bad','2027-01-01T00:00:00Z'])assert.equal(isInMusicPool(date,Date.parse('2026-10-13T00:00:00Z')),false);
});
test('support counts deduplicate retained daily hearts, exclude authors, other reactions, malformed and pre-publication rows',()=>{
 const tracks=[{id:'a',created_by:'author',created_at:'2026-09-01T00:00:00Z'},{id:'b',created_by:'other',created_at:'2026-09-01T00:00:00Z'}];
 const base={track_id:'a',reaction:'heart',created_at:'2026-09-02T00:00:00Z'};
 const rows=[{...base,user_id:'u'},{...base,user_id:'u',created_at:'2026-09-03T00:00:00Z'},{...base,user_id:'author'},{...base,user_id:'v',reaction:'star'},{...base,user_id:null},{...base,user_id:'before',created_at:'2026-08-01T00:00:00Z'},{...base,user_id:'invalid',created_at:'bad'},{...base,user_id:'foreign',track_id:'hidden'}];
 assert.deepEqual([...musicPoolSupportCounts(tracks,rows)],[['a',1],['b',0]]);
 // Cancelling today's Heart still leaves an earlier retained daily Heart.
 assert.equal(musicPoolSupportCounts(tracks,rows.filter(r=>r.created_at!=='2026-09-03T00:00:00Z')).get('a'),1);
 assert.equal(musicPoolSupportCounts(tracks,rows.filter(r=>r.user_id!=='u')).get('a'),0);
});
test('pool chart is independent of play counts, old totals, comments and monthly boundaries; ties share rank',()=>{
 const now=Date.parse('2026-10-13T00:00:00Z'); const base={createdAt:'2026-09-01T00:00:00Z',poolSupporterCount:2};
 const rows=rankMusicPool([{...base,id:'b'},{...base,id:'a',createdAt:'2026-10-01T00:00:00Z'},{...base,id:'top',poolSupporterCount:3},{...base,id:'zero',poolSupporterCount:0,heartCount:99999},{...base,id:'expired',createdAt:'2026-04-01T00:00:00Z',poolSupporterCount:500}],now);
 assert.deepEqual(rows.map(r=>[r.track.id,r.rank]),[['top',1],['a',2],['b',2]]);
 assert.equal(rankMusicPool([{...base,id:'a'}],Date.parse('2026-10-31T23:59:59Z'))[0].rank,1);
});
