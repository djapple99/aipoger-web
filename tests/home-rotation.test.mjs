import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHomeDiscovery } from '../src/lib/home-discovery.ts';

const now=new Date('2026-10-25T13:00:00Z');
const media=(_bucket,path)=>path||'';
const row=(id,extra={})=>({id,title:id,artist:id,created_by:`member-${id}`,genre:'EDM 百大電音',source:'community',is_active:true,review_status:'approved',created_at:'2026-10-24T00:00:00Z',audio_path:`${id}.mp3`,...extra});
const mv=(id,extra={})=>row(id,{youtube_url:'https://youtu.be/MdxaU0l3FzI',...extra});
const build=(rows,hearts=[],at=now)=>buildHomeDiscovery(rows,hearts,media,at);

test('a fresh MV gets immediate exposure even when an older MV has more support',()=>{
 const rows=[mv('old',{created_at:'2026-07-01T00:00:00Z'}),mv('fresh',{created_at:'2026-10-25T12:30:00Z'}),mv('recent-a'),mv('recent-b')];
 const hearts=Array.from({length:9},(_,i)=>({track_id:'old',user_id:`listener-${i}`,reaction:'heart',vote_date:'2026-10-25'}));
 const d=build(rows,hearts);
 assert.equal(d.featured[0].id,'fresh');assert.equal(d.featured[0].discoveryReason,'new');
 assert.equal(d.featured.filter(w=>w.discoveryReason==='community').length,1);
 assert.equal(d.featured.find(w=>w.id==='old').supporterCount,9);
 assert.equal(d.featured.length,4);
});

test('four-hour Taipei rotation changes exposure, remains stable within a slot, and keeps the newest MV',()=>{
 const rows=Array.from({length:8},(_,i)=>mv(`mv-${i}`,{created_at:`2026-10-${String(24-i).padStart(2,'0')}T00:00:00Z`}));
 const a=build(rows,[],new Date('2026-10-25T15:59:00Z'));
 const b=build(rows,[],new Date('2026-10-25T16:00:00Z'));
 assert.notEqual(a.rotationKey,b.rotationKey);assert.notEqual(a.featured[0].id,b.featured[0].id);
 assert.deepEqual(build(rows,[],new Date('2026-10-25T15:59:30Z')).featured,a.featured);
 for(const d of [a,b])assert.ok(d.featured.some(w=>w.id==='mv-0'));
});

test('new YouTube, Suno and Spotify links are eligible without uploaded MP3 files',()=>{
 const rows=[row('stale-mp3',{created_at:'2026-10-10T00:00:00Z'}),
  row('youtube',{created_at:'2026-10-25T12:30:00Z',audio_path:null,external_url:'https://youtu.be/MdxaU0l3FzI'}),
  row('suno',{audio_path:null,external_url:'https://suno.com/song/f8c26428-aa5e-43eb-a223-8315e07e8f69'}),
  row('spotify',{audio_path:null,external_url:'https://open.spotify.com/track/1234567890123456789012'})];
 const d=build(rows);
 assert.equal(d.singles[0].id,'youtube');assert.equal(d.singles[0].externalMedia.provider,'youtube');
 assert.ok(d.singles.some(w=>w.externalMedia?.provider==='suno'||w.externalMedia?.provider==='spotify'));
 assert.ok(d.singles.every(w=>w.audioUrl||w.externalMedia));
});

test('discovery shares exposure between creators and rotates beyond a fixed first three',()=>{
 const rows=[row('new',{created_at:'2026-10-25T12:30:00Z',created_by:'one'}),...Array.from({length:9},(_,i)=>row(`song-${i}`,{created_by:i<5?'one':`other-${i}`}))];
 const d=build(rows);
 assert.equal(d.singles[0].id,'new');
 const authors=new Map(rows.map(r=>[r.id,r.created_by]));
 assert.equal(new Set(d.singles.map(w=>authors.get(w.id))).size,3);
 const later=build(rows,[],new Date(now.getTime()+4*3600_000));
 assert.notDeepEqual(d.singles.map(w=>w.id),later.singles.map(w=>w.id));
});

test('public, album, expiry and same-work exclusion boundaries survive rotation',()=>{
 const rows=[mv('latest'),row('audio'),row('hidden',{hidden_at:'2026-10-24'}),row('pending',{review_status:'pending'}),row('expired',{created_at:'2026-01-01T00:00:00Z'}),row('album',{work_kind:'album'}),row('invalid',{audio_path:null,external_url:'https://evil.test/song'})];
 const d=build(rows);
 assert.deepEqual(d.featured.map(w=>w.id),['latest']);assert.deepEqual(d.singles.map(w=>w.id),['audio']);
 for(const w of [...d.featured,...d.singles])assert.equal('created_by' in w,false);
});

test('old MV fallback is labelled discovery rather than pretending it is new',()=>{
 const d=build([mv('old',{created_at:'2026-05-01T00:00:00Z'})]);
 assert.equal(d.featured[0].discoveryReason,'discovery');
 assert.equal(d.singles.length,0);
});
