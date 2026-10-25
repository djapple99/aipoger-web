import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs,mockAdmin,USER,uuid} from './helpers/choice-runtime.mjs';
const job=()=>({id:uuid(7),actor_id:USER,audio_path:`${USER}/community/audio.mp3`,cover_path:`${USER}/community/cover.jpg`});
function setup(j=job(),used=false){
 const a=mockAdmin({creator_work_file_cleanup:[j]});const removed=[],assets=[];let fail=false;
 a.rpc=async()=>({data:used,error:null});a.storage.from=bucket=>({getPublicUrl:path=>({data:{publicUrl:`https://media.test/${bucket}/${path}`}}),remove:async paths=>{removed.push({bucket,paths});return {error:fail?new Error('storage failed'):null}}});
 const m=loadTs('src/lib/server-creator-work-cleanup.ts',{'server-only':{},'./server-audio-uploads':{discardOwnedAudio:async(_a,user,id)=>assets.push({user,id})}});
 return {a,removed,assets,run:()=>m.flushDeletedWorkFiles(a),fail(v){fail=v}};
}
test('deleted work cleanup removes only unreferenced owned files and then removes its temporary job',async()=>{
 const x=setup();assert.deepEqual(await x.run(),{completed:1,pending:0});assert.equal(x.removed.length,2);assert.equal(x.a.tables.creator_work_file_cleanup.length,0);
});
test('files still referenced by another work or battle survive cleanup',async()=>{
 const x=setup(job(),true);await x.run();assert.equal(x.removed.length,0);assert.equal(x.a.tables.creator_work_file_cleanup.length,0);
});
test('external URLs, traversal and another creator files are never removed',async()=>{
 for(const p of ['https://i.ytimg.com/cover.jpg',`${uuid(8)}/community/cover.jpg`,`${USER}/../cover.jpg`]){
  const x=setup({...job(),audio_path:null,cover_path:p});await x.run();assert.equal(x.removed.length,0);
 }
});
test('Storage failures leave durable cleanup work for a successful retry',async()=>{
 const x=setup();x.fail(true);assert.deepEqual(await x.run(),{completed:0,pending:1});assert.equal(x.a.tables.creator_work_file_cleanup.length,1);
 x.fail(false);assert.deepEqual(await x.run(),{completed:1,pending:0});assert.equal(x.a.tables.creator_work_file_cleanup.length,0);
});
test('verified MP3 cleanup uses the existing owned reference-protected asset removal',async()=>{
 const x=setup({...job(),audio_path:`https://aipoger.com/api/audio-assets/${uuid(6)}`,cover_path:null});await x.run();assert.deepEqual(x.assets,[{user:USER,id:uuid(6)}]);assert.equal(x.removed.length,0);
});
