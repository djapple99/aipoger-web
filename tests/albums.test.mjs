import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, USER, uuid, request } from './helpers/choice-runtime.mjs';
import { albumTrackIds } from '../src/lib/album.ts';
import { albumCopy } from '../src/lib/album-copy.ts';
import { isPublicDiscoveryTrack,isPublicBarAirplayTrack,isPublicMusicWork } from '../src/lib/listen-bar-airplay.ts';
import { buildHomeDiscovery } from '../src/lib/home-discovery.ts';
const a=uuid(20),b=uuid(21),album=uuid(30),foreign=uuid(99);
const row=(id,extra={})=>({id,title:id,artist:'Creator',genre:'Original 自我風格',created_at:new Date().toISOString(),created_by:USER,source:'community',work_kind:'single',is_featured_official:false,is_active:true,review_status:'approved',audio_path:id+'.mp3',cover_path:USER+'/cover.jpg',...extra});
const body={requestId:album,title:'My album',artist:'Creator',genre:'Original 自我風格',description:'A complete album',trackIds:[b,a],confirmedRights:true};
function api(seed=[row(a),row(b)],signedIn=true){
 const admin=mockAdmin({listen_bar_tracks:seed});const clientCalls=[];
 const route=loadTs('src/app/api/albums/route.ts',{'@/lib/server-albums':{readPublicAlbums:async()=>[]},'@/lib/server-creator-auth':{creatorAuth:async()=>signedIn?{admin,token:'verified-token',user:{id:USER}}:null},'@supabase/supabase-js':{createClient:(...args)=>{clientCalls.push(args);return admin;}}});
 return {route,admin,clientCalls};
}
test('album selections reject malformed IDs, duplicate identities, and invalid sizes',()=>{
 for(const value of [null,[],[a],[a,a],[a,a.toUpperCase()],Array(51).fill(a),[a,'x']])assert.equal(albumTrackIds(value),null);
 assert.deepEqual(albumTrackIds([b,a]),[b,a]);
});
test('albums are playable but never enter single discovery, Bar radio, or home single features',()=>{
 const work=row(album,{work_kind:'album'}); assert.equal(isPublicMusicWork(work),true); assert.equal(isPublicDiscoveryTrack(work),false);assert.equal(isPublicBarAirplayTrack(work),false);
 const home=buildHomeDiscovery([work,row(a)],[],(_bucket,path)=>path??'');assert.equal([...home.featured,...home.singles].some(w=>w.id===album),false);
});
test('build API binds verified owner, keeps ordered existing IDs and uses authenticated quota path',async()=>{
 const x=api();const r=await x.route.POST(request({...body,created_by:foreign}));assert.equal(r.status,201);const saved=x.admin.tables.listen_bar_tracks.find(r=>r.id===album);
 assert.equal(saved.created_by,USER);assert.equal(saved.work_kind,'album');assert.deepEqual(saved.album_track_ids,[b,a]);assert.equal(saved.audio_path,null);assert.equal(saved.cover_path,USER+'/cover.jpg');
 assert.equal(x.clientCalls[0][2].global.headers.Authorization,'Bearer verified-token');
 const replay=await x.route.POST(request(body));assert.equal(replay.status,200);assert.equal(x.admin.tables.listen_bar_tracks.filter(r=>r.id===album).length,1);
});
test('build API rejects foreign, hidden, album, missing members and forged cover before writing',async()=>{
 for(const seed of [[row(a),row(b,{created_by:foreign})],[row(a),row(b,{hidden_at:'now'})],[row(a),row(b,{work_kind:'album'})],[row(a)]]){
  const x=api(seed);assert.equal((await x.route.POST(request(body))).status,403);assert.equal(x.admin.operations.some(o=>o.action==='insert'),false);
 }
 const x=api();assert.equal((await x.route.POST(request({...body,coverPath:foreign+'/private.jpg'}))).status,400);
 assert.equal((await api([],false).route.POST(request(body))).status,401);
 assert.equal((await x.route.POST(request({...body,trackIds:[a,a]}))).status,400);
});
test('public catalog keeps source order, omits hidden/foreign members and serves continuous video first',async()=>{
 const original=row(album,{work_kind:'album',album_track_ids:[b,a,foreign],audio_path:null,description:'Description'});
 const continuous=row(uuid(31),{work_kind:'album',album_track_ids:[],youtube_url:'https://www.youtube.com/watch?v=8sNY25QdMFA',album_duration_seconds:1464});
 const admin=mockAdmin({listen_bar_tracks:[original,continuous,row(a,{hidden_at:'now'}),row(b),row(foreign,{created_by:foreign})]});
 const {readPublicAlbums}=loadTs('src/lib/server-albums.ts',{'server-only':{},'./server-mv-reviews':{mvReviewAdmin:()=>admin}});
 const albums=await readPublicAlbums();assert.equal(albums.length,2);const collection=albums.find(a=>a.id===album);assert.deepEqual(collection.trackIds,[b]);assert.equal(collection.tracks[0].id,b);
 const video=albums.find(a=>a.id===continuous.id);assert.equal(video.videoId,'8sNY25QdMFA');assert.equal(video.audioUrl,'');assert.equal(video.durationSeconds,1464);assert.equal('ratingAverage' in video,false);
});
test('all four languages explain content-based single/album classification and preserve records',()=>{
 for(const lang of ['zh','en','ja','ko']){const c=albumCopy(lang);assert.ok(c.rules.length>70);assert.ok(c.note.length>15);assert.notEqual(c.label,c.single);}
});
