import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMvDiscovery,filterMvWorks,mvChannelUrl} from '../src/lib/mv-discovery.ts';
import {buildHomeDiscovery} from '../src/lib/home-discovery.ts';
const now=new Date('2026-10-13T04:00:00Z');
const media=(_bucket,path)=>path?`https://media.test/${path}`:'';
const row=(id,extra={})=>({id,title:`Song ${id}`,artist:'Artist',genre:'Original 自我風格',source:'community',is_active:true,review_status:'approved',audio_path:`${id}.mp3`,youtube_url:'https://youtu.be/MdxaU0l3FzI',created_at:'2026-05-01T00:00:00Z',created_by:`author-${id}`,...extra});
test('MV catalog includes historical uploads and keeps the original identity when works share a video',()=>{
 const rows=[row('old'),row('new',{created_at:'2026-10-13T01:00:00Z'})];
 const mv=buildMvDiscovery(rows,[],media,now);assert.deepEqual(mv.works.map(x=>x.id),['new','old']);
 assert.equal(mv.works[1].publishedAt,'2026-05-01T00:00:00Z');assert.equal(mv.works[1].youtubeUrl,'https://www.youtube.com/watch?v=MdxaU0l3FzI');
 assert.equal('created_by' in mv.works[0],false);assert.equal('user_id' in mv.works[0],false);
});
test('channel links are preserved separately without a fabricated playable video',()=>{
 const mv=buildMvDiscovery([row('channel',{youtube_url:'https://youtube.com/@musician?si=tracking'}),row('video'),row('unsafe',{youtube_url:'https://example.com/watch?v=MdxaU0l3FzI'})],[],media,now);
 assert.deepEqual(mv.works.map(x=>x.id),['video']);assert.deepEqual(mv.channels.map(x=>[x.id,x.channelUrl,x.videoId]),[['channel','https://www.youtube.com/@musician',null]]);
 for(const value of ['https://youtube.com.evil.test/@musician','https://u:p@youtube.com/@musician','javascript:alert(1)','https://youtube.com/watch?v=MdxaU0l3FzI','https://youtu.be/@musician'])assert.equal(mvChannelUrl(value),null);
});
test('hidden, removed, pending, inactive and demo uploads do not reappear as videos or channels',()=>{
 const invalid=[{hidden_at:'today'},{removed_at:'today'},{ai_music_showtime_public_removed_at:'today'},{review_status:'pending'},{is_active:false},{source:'official'},{is_featured_official:true},{audio_path:null}];
 for(const extra of invalid){const mv=buildMvDiscovery([row('bad',extra),row('bad-channel',{...extra,youtube_url:'https://youtube.com/@private'})],[],media,now);assert.equal(mv.works.length,0);assert.equal(mv.channels.length,0);}
});
test('MV and homepage share the same weekly distinct supporters, ties and new-work fallback',()=>{
 const rows=[row('a'),row('b')];const hearts=[{track_id:'a',user_id:'listener',reaction:'heart',vote_date:'2026-10-12'},{track_id:'a',user_id:'listener',reaction:'heart',vote_date:'2026-10-13'},{track_id:'b',user_id:'author-b',reaction:'heart',vote_date:'2026-10-13'}];
 const home=buildHomeDiscovery(rows,hearts,media,now);const mv=buildMvDiscovery(rows,hearts,media,now);
 assert.deepEqual(mv.featured,home.featured);assert.deepEqual(mv.week,home.week);assert.equal(mv.works.find(x=>x.id==='a').supporterCount,1);
});
test('search normalizes text, combines artist and title terms, filters genres and sorts support without changing source',()=>{
 const mv=buildMvDiscovery([row('a',{title:'ＴＡＮＧＯ',artist:'Ren Walker'}),row('b',{title:'Tango',artist:'Other',genre:'EDM 百大電音',created_at:'2026-10-13T01:00:00Z'})],[{track_id:'a',user_id:'listener',reaction:'heart',vote_date:'2026-10-13'}],media,now);
 const before=mv.works.map(x=>x.id);assert.deepEqual(filterMvWorks(mv.works,'tango REN','','latest').map(x=>x.id),['a']);
 assert.deepEqual(filterMvWorks(mv.works,'tango','EDM 百大電音','latest').map(x=>x.id),['b']);
 assert.deepEqual(filterMvWorks(mv.works,'','','support').map(x=>x.id),['a','b']);assert.deepEqual(mv.works.map(x=>x.id),before);
});

test('rated sorting uses the public average first, then newest ties and unrated submissions, without losing works',()=>{
 const base=buildMvDiscovery([row('base')],[],media,now).works[0];
 const works=[
  {...base,id:'unrated-new',publishedAt:'2026-10-22'},
  {...base,id:'rated-low',publishedAt:'2026-08-01',ratingCount:20,ratingAverage:7.5,ratingTotal:150},
  {...base,id:'rated-high-old',publishedAt:'2026-10-20',ratingCount:5,ratingAverage:9.54,ratingTotal:47.7},
  {...base,id:'rated-high-new',publishedAt:'2026-10-21',ratingCount:5,ratingAverage:9.46,ratingTotal:47.3},
  {...base,id:'missing-average',publishedAt:'2026-10-21',ratingCount:1,ratingAverage:null},
  {...base,id:'no-raters',publishedAt:'2026-10-19',ratingCount:0,ratingAverage:10},
 ];
 const before=structuredClone(works);
 assert.deepEqual(filterMvWorks(works,'','','rated').map(x=>x.id),['rated-high-new','rated-high-old','rated-low','unrated-new','missing-average','no-raters']);
 assert.deepEqual(filterMvWorks(works,'','','latest').map(x=>x.id),['unrated-new','missing-average','rated-high-new','rated-high-old','no-raters','rated-low']);
 assert.deepEqual(works,before);
});
