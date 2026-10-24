import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, mockAdmin, USER, uuid } from './helpers/choice-runtime.mjs';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://unit-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='blind-signing-unit-only';
const server=loadTs('src/lib/server-blind-listening.ts',{
 './ai-music-surface-lifecycle':{buildAiMusicSurfaceLifecycleMap:async()=>new Map([[uuid(20),{retiredFromExplore:true}]])},
});
function fixture(choice='A',overrides={}) {
 const q={id:uuid(10),user_id:USER,track_a_id:uuid(20),track_b_id:uuid(21),choice,state:'voted',expires_at:new Date(Date.now()+60000).toISOString(),...overrides};
 const tracks=[20,21].map(n=>({id:uuid(n),title:'Secret title '+n,artist:'Public stage name '+n,created_by:uuid(2),source:'community',is_active:true,is_featured_official:false,work_kind:'single',review_status:'approved',created_at:new Date().toISOString(),genre:'Original 自我風格',duration_seconds:120,audio_path:'https://unit-test.invalid/storage/v1/object/public/listen-bar-audio/private-name-'+n+'.mp3',cover_path:'https://unit-test.invalid/storage/v1/object/public/listen-bar-covers/'+n+'.jpg'}));
 const admin=mockAdmin({blind_listen_questions:[q],listen_bar_tracks:tracks});
 const selectedReads=[],from=admin.from;admin.from=table=>{const query=from(table);query.gte=()=>query;const within=query.in;query.in=(key,ids)=>{if(table==='listen_bar_tracks')selectedReads.push(ids);return within(key,ids);};return query;};
 return {q,admin,selectedReads};
}
// Use a non-retired lifecycle unless the particular test is exercising retirement.
const normal=loadTs('src/lib/server-blind-listening.ts',{'./ai-music-surface-lifecycle':{buildAiMusicSurfaceLifecycleMap:async()=>new Map()}});
for(const choice of ['A','B','tie'])test('only persisted '+choice+' controls which identities and full media are revealed',async()=>{
 const {q,admin,selectedReads}=fixture(choice);const result=await normal.revealBlindQuestion(admin,USER,q.id);
 const sides=choice==='tie'?['A','B']:[choice];assert.deepEqual(result.works.map(w=>w.side),sides);
 assert.deepEqual(selectedReads,[sides.map(side=>q[side==='A'?'track_a_id':'track_b_id'])]);
 for(const work of result.works){assert.ok(work.title);assert.ok(work.artist);assert.match(work.audioUrl,/listen-bar-audio/);assert.match(work.href,/^\/ai-music\?track=/);assert.equal('created_by' in work,false);}
 if(choice!=='tie'){const unselected=choice==='A'?21:20;assert.equal(JSON.stringify(result).includes(uuid(unselected)),false);assert.equal(JSON.stringify(result).includes('Secret title '+unselected),false);assert.equal(JSON.stringify(result).includes('stage name '+unselected),false);}
});
for(const state of ['pending','skipped'])test('cannot reveal '+state+' rounds',async()=>{
 const {q,admin,selectedReads}=fixture('A',{state});await assert.rejects(()=>normal.revealBlindQuestion(admin,USER,q.id),/QUESTION_UNAVAILABLE/);assert.deepEqual(selectedReads,[]);
});
test('other accounts and corrupt choices cannot reveal any song',async()=>{
 const a=fixture();await assert.rejects(()=>normal.revealBlindQuestion(a.admin,uuid(99),a.q.id),/QUESTION_UNAVAILABLE/);
 const b=fixture('forged');await assert.rejects(()=>normal.revealBlindQuestion(b.admin,USER,b.q.id),/QUESTION_UNAVAILABLE/);assert.deepEqual(b.selectedReads,[]);
});
for(const patch of [{hidden_at:'now'},{removed_at:'now'},{is_active:false},{review_status:'rejected'},{work_kind:'album'},{created_at:'2020-01-01T00:00:00Z'}])test('unavailable selected work stays anonymous without falling back to the other song: '+JSON.stringify(patch),async()=>{
 const {q,admin}=fixture('A');Object.assign(admin.tables.listen_bar_tracks[0],patch);
 const r=await normal.revealBlindQuestion(admin,USER,q.id);assert.deepEqual(r,{choice:'A',works:[{side:'A',unavailable:true}]});
});
test('surface-retired selected work cannot be revealed or played',async()=>{
 const {q,admin}=fixture('A');assert.deepEqual(await server.revealBlindQuestion(admin,USER,q.id),{choice:'A',works:[{side:'A',unavailable:true}]});
});
test('new anonymous question contains no work IDs, titles, authors, covers or original media paths',()=>{
 const {q}=fixture();const result=normal.anonymousQuestion({...q,heard_a:0,heard_b:0});
 assert.deepEqual(Object.keys(result).sort(),['id','expiresAt','heardA','heardB','audioA','audioB'].sort());
 const serialized=JSON.stringify(result);for(const secret of [q.track_a_id,q.track_b_id,'Secret title','Public stage name','private-name'])assert.equal(serialized.includes(secret),false);
});
test('only a selected valid MV is revealed; the other side never supplies a fallback video',async()=>{
 const {q,admin}=fixture('A');admin.tables.listen_bar_tracks[1].youtube_url='https://youtu.be/lmnopqrstuv';
 assert.equal((await normal.revealBlindQuestion(admin,USER,q.id)).works[0].videoId,null);
 admin.tables.listen_bar_tracks[0].youtube_url='https://www.youtube.com/watch?v=abcdefghijk';
 const r=await normal.revealBlindQuestion(admin,USER,q.id);assert.equal(r.works[0].videoId,'abcdefghijk');assert.equal(JSON.stringify(r).includes('lmnopqrstuv'),false);
 admin.tables.listen_bar_tracks[0].youtube_url='https://attacker.example/watch?v=abcdefghijk';assert.equal((await normal.revealBlindQuestion(admin,USER,q.id)).works[0].videoId,null);
});
