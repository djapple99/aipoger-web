import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHomeDiscovery, homeSupportCounts, homeYouTubeId, readAllHomePages, taipeiHomeWeek } from '../src/lib/home-discovery.ts';

const now = new Date('2026-10-13T06:00:00Z');
const row = (id, extra = {}) => ({id, title:`Song ${id}`, artist:'Creator', genre:'EDM 百大電音', audio_path:`${id}.mp3`, cover_path:`${id}.jpg`, source:'community', review_status:'approved', is_active:true, created_by:`author-${id}`, created_at:'2026-10-12T00:00:00Z', youtube_url:'https://youtu.be/MdxaU0l3FzI', ...extra});
const heart = (track_id, user_id, extra = {}) => ({track_id, user_id, vote_date:'2026-10-13', reaction:'heart', ...extra});
const media = (bucket, path) => path ? `https://media.example/${bucket}/${path}` : '';

test('homepage week rolls at Taipei Monday midnight, including a year boundary', () => {
 assert.deepEqual(taipeiHomeWeek(new Date('2026-10-11T15:59:59Z')), {startDate:'2026-10-05', endDate:'2026-10-12'});
 assert.deepEqual(taipeiHomeWeek(new Date('2026-10-11T16:00:00Z')), {startDate:'2026-10-12', endDate:'2026-10-19'});
 assert.deepEqual(taipeiHomeWeek(new Date('2027-01-01T00:00:00Z')), {startDate:'2026-12-28', endDate:'2027-01-04'});
});

test('homepage support counts distinct non-author members within the displayed week', () => {
 const counts=homeSupportCounts([row('a'),row('b')], [heart('a','one'),heart('a','one',{vote_date:'2026-10-14'}),heart('a','two'),heart('a','author-a'),heart('a',''),heart('missing','three'),heart('a','old',{vote_date:'2026-10-11'}),heart('a','future',{vote_date:'2026-10-19'}),heart('a','other',{reaction:'skip'})],taipeiHomeWeek(now));
 assert.deepEqual([...counts], [['a',2],['b',0]]);
});

test('only eligible MV works compete; all top ties are shown without formal ranks or voter identities', () => {
 const rows=[row('a'),row('b'),row('audio',{youtube_url:null}),row('hidden',{hidden_at:'2026-10-12'}),row('official',{is_featured_official:true}),row('pending',{review_status:'pending'}),row('retired',{ai_music_showtime_public_removed_at:'2026-10-12'})];
 const hearts=[heart('a','one'),heart('b','two'),heart('audio','three'),heart('audio','four'),heart('hidden','five')];
 const result=buildHomeDiscovery(rows,hearts,media,now);
 assert.equal(result.featureKind,'community');
 assert.deepEqual(result.featured.map(w=>[w.id,w.supporterCount]),[['a',1],['b',1]]);
 assert.deepEqual(result.singles.map(w=>w.id),['a','audio','b']);
 for(const work of [...result.featured,...result.singles]) {
  assert.equal('created_by' in work,false); assert.equal('user_id' in work,false); assert.equal('rank' in work,false);
 }
});

test('zero current support shows the latest real MV as a new release, never a fabricated winner', () => {
 const result=buildHomeDiscovery([row('old'),row('new',{created_at:'2026-10-13T00:00:00Z'})],[],media,now);
 assert.equal(result.featureKind,'new'); assert.deepEqual(result.featured.map(w=>w.id),['new']); assert.equal(result.featured[0].supporterCount,0);
});

test('no valid MV preserves music discovery; no playable works produces an honest empty state', () => {
 const result=buildHomeDiscovery([row('audio',{youtube_url:'https://example.com/watch?v=MdxaU0l3FzI'})],[],media,now);
 assert.equal(result.featureKind,'empty'); assert.equal(result.featured.length,0); assert.equal(result.singles.length,1);
 assert.equal(buildHomeDiscovery([row('empty',{audio_path:null})],[],media,now).singles.length,0);
});

test('MV IDs accept supported YouTube URLs and reject unrelated or unsafe sources', () => {
 for(const url of ['https://youtu.be/MdxaU0l3FzI?t=3','https://www.youtube.com/watch?v=MdxaU0l3FzI','https://m.youtube.com/shorts/MdxaU0l3FzI','https://music.youtube.com/watch?v=MdxaU0l3FzI','https://youtube.com/embed/MdxaU0l3FzI','https://youtube.com/live/MdxaU0l3FzI']) assert.equal(homeYouTubeId(url),'MdxaU0l3FzI');
 for(const url of ['https://youtube.com.evil.test/watch?v=MdxaU0l3FzI','https://evil.test/MdxaU0l3FzI','javascript:alert(1)','https://user:pass@youtube.com/watch?v=MdxaU0l3FzI','https://youtube.com/watch?v=bad',null]) assert.equal(homeYouTubeId(url),null);
});

test('homepage reads every page rather than silently truncating support', async () => {
 const requested=[];
 const values=Array.from({length:5},(_,i)=>i);
 const rows=await readAllHomePages(async(from,to)=>{requested.push([from,to]);return {data:values.slice(from,to+1),error:null};},2);
 assert.deepEqual(rows,values); assert.deepEqual(requested,[[0,1],[2,3],[4,5]]);
 await assert.rejects(readAllHomePages(async()=>({data:null,error:{message:'Unavailable'}})),/Unavailable/);
 await assert.rejects(readAllHomePages(async()=>({data:null,error:null})),/Missing discovery/);
});
