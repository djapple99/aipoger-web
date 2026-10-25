import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadTs,mockAdmin,USER,uuid} from './helpers/choice-runtime.mjs';
import {mp3Frames} from './helpers/mp3-fixture.mjs';
function setup(bytes=mp3Frames()) {
 const admin=mockAdmin({verified_audio_assets:[]});const files=new Map();const events=[];
 admin.storage.from=bucket=>({
  createSignedUploadUrl:async path=>({data:{path,token:'local-test-token'},error:null}),
  createSignedUrl:async path=>files.has(bucket+'/'+path)?{data:{signedUrl:'https://storage.example.test/'+bucket+'/'+path},error:null}:{data:null,error:{message:'not found'}},
  download:async path=>({data:files.has(bucket+'/'+path)?new Blob([files.get(bucket+'/'+path)]):null,error:null}),
  upload:async(path,data)=>{events.push(['upload',bucket,path]);files.set(bucket+'/'+path,data);return {error:null}},
  remove:async paths=>{events.push(['remove',bucket,...paths]);for(const p of paths)files.delete(bucket+'/'+p);return {error:null}},
 });
 const api=loadTs('src/lib/server-audio-uploads.ts');
 const hash=createHash('sha256').update(bytes).digest('hex');
 return {admin,files,events,api,bytes,body:{name:'song.mp3',size:bytes.length,sha256:hash}};
}
test('MP3 upload is private until server checks bytes/hash, deduplicates, and is isolated to its owner',async()=>{
 const x=setup();const prepared=await x.api.prepareMp3(x.admin,USER,x.body);assert.equal(x.events.length,0);assert.ok(prepared.token);
 x.files.set('pending-audio/'+prepared.path,x.bytes);
 const done=await x.api.finishMp3(x.admin,USER,prepared.assetId);assert.match(done.asset.path,/^https:\/\/aipoger.com\/api\/audio-assets\//);assert.equal(done.asset.maxKbps,320);assert.ok(done.asset.duration>0);
 assert.equal(x.files.has('pending-audio/'+prepared.path),false);assert.equal(x.events.filter(e=>e[0]==='upload').length,1);
 assert.equal((await x.api.prepareMp3(x.admin,USER,x.body)).asset.assetId,done.asset.assetId);assert.equal((await x.api.finishMp3(x.admin,USER,prepared.assetId)).asset.assetId,done.asset.assetId);assert.equal(x.events.filter(e=>e[0]==='upload').length,1);
 await assert.rejects(x.api.finishMp3(x.admin,uuid(2),prepared.assetId),/AUDIO_UNAVAILABLE/);
});
test('renamed and corrupt files never reach verified storage, and size/hash tampering is rejected',async()=>{
 const x=setup(new Uint8Array(Buffer.from('RIFFxxxxWAVE')));const p=await x.api.prepareMp3(x.admin,USER,x.body);x.files.set('pending-audio/'+p.path,x.bytes);
 await assert.rejects(x.api.finishMp3(x.admin,USER,p.assetId),/INVALID_MP3/);assert.equal(x.events.filter(e=>e[0]==='upload').length,0);assert.equal(x.files.has('pending-audio/'+p.path),false);
 const y=setup();const q=await y.api.prepareMp3(y.admin,USER,y.body);y.files.set('pending-audio/'+q.path,mp3Frames([7,7,7,7]));await assert.rejects(y.api.finishMp3(y.admin,USER,q.assetId),/MP3_SIZE_LIMIT/);
 await assert.rejects(y.api.prepareMp3(y.admin,USER,{...y.body,name:'song.wav'}),/MP3_ONLY/);
 await assert.rejects(y.api.prepareMp3(y.admin,USER,{...y.body,size:31457281}),/MP3_SIZE_LIMIT/);
});
test('public asset redirect requires a published authorized reference; private drafts are never exposed',async()=>{
 const id=uuid(11),x=setup();x.admin.tables.verified_audio_assets=[{id,user_id:USER,status:'verified',storage_path:'owned.mp3'}];x.files.set('verified-audio/owned.mp3',x.bytes);
 // The API uses .not for rights-confirmed battle references.
 const from=x.admin.from.bind(x.admin);x.admin.from=table=>{const q=from(table);q.not=(key,_op,value)=>q.neq(key,value);return q};
 const route=loadTs('src/app/api/audio-assets/[id]/route.ts',{'@/lib/server-creator-auth':{creatorAdmin:()=>x.admin},'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init),redirect:(url,status)=>new Response(null,{status,headers:{location:url}})}}});
 const get=()=>route.GET(new Request('https://aipoger.test/api/audio-assets/'+id),{params:Promise.resolve({id})});
 assert.equal((await get()).status,404);
 x.admin.tables.listen_bar_tracks.push({id:uuid(20),verified_audio_id:id,is_active:true,review_status:'approved',hidden_at:null,removed_at:null});assert.equal((await get()).status,307);
 x.admin.tables.listen_bar_tracks[0].hidden_at='2026-10-25';assert.equal((await get()).status,404);
 x.admin.tables.battle_queue=[{id:uuid(21),verified_audio_id:id,rights_confirmed_at:'2026-10-25',status:'matched'}];assert.equal((await get()).status,307);
});

test('a lost upload response recovers the same staged MP3 instead of allocating another file',async()=>{
 const x=setup();const prepared=await x.api.prepareMp3(x.admin,USER,x.body);x.files.set('pending-audio/'+prepared.path,x.bytes);
 const recovered=await x.api.prepareMp3(x.admin,USER,x.body);assert.equal(recovered.asset.assetId,prepared.assetId);assert.equal(x.admin.tables.verified_audio_assets.length,1);assert.equal(x.events.filter(e=>e[0]==='upload').length,1);
});
test('audio upload endpoint authenticates every action and never trusts an actor from the request body',async()=>{
 const x=setup();const route=loadTs('src/app/api/audio-uploads/route.ts',{'@/lib/server-creator-auth':{creatorAuth:async r=>r.headers.get('authorization')==='Bearer valid'?{admin:x.admin,user:{id:USER}}:null}});
 const req=(body,token='valid')=>new Request('https://aipoger.test/api/audio-uploads',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 for(const action of ['prepare','finish','discard'])assert.equal((await route.POST(req({action},'invalid'))).status,401);
 const response=await route.POST(req({action:'prepare',...x.body,userId:uuid(2)}));assert.equal(response.status,200);assert.equal(x.admin.tables.verified_audio_assets[0].user_id,USER);
 assert.equal((await route.POST(req({action:'finish',assetId:'invalid'}))).status,400);
});
