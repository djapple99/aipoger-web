import test from "node:test";
import assert from "node:assert/strict";
import { loadTs, mockAdmin, USER, uuid } from "./helpers/choice-runtime.mjs";
process.env.NEXT_PUBLIC_SUPABASE_URL="https://unit-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY="blind-signing-unit-only";
const server=loadTs("src/lib/server-blind-listening.ts");
test("anonymous audio tickets reject tampering, invalid sides and expiration",()=>{
 const q={id:uuid(9),expires_at:new Date(Date.now()+60000).toISOString()};
 const token=server.makeBlindAudioToken(q,"A");
 assert.equal(server.readBlindAudioToken(token).side,"A");
 assert.equal(server.readBlindAudioToken(token+"x"),null);
 assert.equal(server.readBlindAudioToken("x"+token),null);
 assert.equal(server.readBlindAudioToken(server.makeBlindAudioToken({...q,expires_at:new Date(Date.now()-1000).toISOString()},"A")),null);
 assert.equal(server.readBlindAudioToken(server.makeBlindAudioToken(q,"fake")),null);
});
test("blind proxy only resolves audio inside the configured public Storage bucket",()=>{
 const admin={storage:{from:bucket=>({getPublicUrl:path=>({data:{publicUrl:"https://unit-test.invalid/storage/v1/object/public/"+bucket+"/"+path}})})}};
 assert.match(server.blindStorageUrl(admin,"user/audio.mp3"),/listen-bar-audio/);
 for(const path of ["https://attacker.test/song.mp3","http://127.0.0.1/a","https://unit-test.invalid/other","../private/audio.mp3"])
   assert.equal(server.blindStorageUrl(admin,path),"");
});
function mount({expired=false,authenticated=true,nextFails=false}={}) {
 const calls=[],reads=[],id=uuid(12),q={id,state:"pending",track_a_id:"a",track_b_id:"b",expires_at:new Date(Date.now()+(expired?-1000:60000)).toISOString()};
 const admin={rpc:async(name,args)=>{calls.push({name,args});return {data:name==="complete_blind_question"?{choice:"tie",awarded:3,balance:3}:{heardA:30,heardB:30},error:null};}};
 const api=loadTs("src/app/api/blind-listen/route.ts",{
   "@/lib/server-creator-auth":{creatorAuth:async()=>authenticated?{admin,user:{id:USER}}:null},
   "@/lib/server-blind-listening":{nextBlindQuestion:async()=>({id:uuid(13)}),
     prepareBlindQuestion:async()=>{calls.push({name:"prepare"});if(nextFails)throw Error("Next unavailable");return {pairs:[["c","b"]]};},
     issuePreparedBlindQuestion:async()=>{calls.push({name:"issue"});return {id:uuid(13)};},
     questionForUser:async(_admin,user,asked)=>{reads.push(asked);assert.equal(user,USER);if(asked!==id)throw Error("Unavailable");return q;},
     blindCatalog:async(_admin,_user,ids)=>{assert.deepEqual(ids,["a","b"]);return [{id:"a"},{id:"b"}];},revealBlindQuestion:async()=>({choice:"tie",works:[]})},
 });
 const request=body=>new Request("https://site.test/api/blind-listen",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({questionId:id,...body})});
 return {api,calls,request,reads};
}
test("blind API keeps auth mandatory and never trusts body user/credit/listening totals",async()=>{
 const guest=mount({authenticated:false});
 assert.equal((await guest.api.GET(new Request("https://site.test"))).status,401);
 assert.equal((await guest.api.POST(guest.request({action:"vote",choice:"tie"}))).status,401);
 const ui=mount();const result=await ui.api.POST(ui.request({action:"vote",choice:"tie",userId:uuid(99),credit:999,heardA:999,heardB:999}));
 assert.equal(result.status,200);const payload=await result.json();assert.equal(payload.awarded,3);assert.equal(payload.nextQuestion.id,uuid(13));
 assert.deepEqual(ui.calls.find(x=>x.name==="complete_blind_question").args,{p_user:USER,p_question:uuid(12),p_choice:"tie"});
 assert.equal((await ui.api.GET(new Request("https://site.test"))).headers.get("cache-control"),"private, no-store");
});
test("next-pair failure after completion preserves success and never asks for another vote",async()=>{
 const ui=mount({nextFails:true});const response=await ui.api.POST(ui.request({action:"vote",choice:"tie"}));
 const payload=await response.json();assert.equal(response.status,200);assert.equal(payload.awarded,3);assert.equal(payload.nextError,true);assert.equal(payload.nextQuestion,null);
});
test("blind API rejects invalid IDs, choices, positions and expired pairs before minting",async()=>{
 const ui=mount();
 for(const body of [{action:"vote",choice:"winner"},{action:"vote",choice:"A",questionId:"invalid"},
  {action:"tick",side:"A",event:"progress",position:90},{action:"tick",side:"A",event:"play",position:"15"}]){
  assert.equal((await ui.api.POST(ui.request(body))).status,400);
 }
 assert.equal(ui.calls.length,0);
 const expired=mount({expired:true});
 assert.equal((await expired.api.POST(expired.request({action:"vote",choice:"A"}))).status,409);
 assert.equal(expired.calls.filter(x=>x.name!=="prepare").length,0);
});
test("audio endpoint forwards safe ranges without creator filenames or upstream URLs",async t=>{
 const q={id:uuid(17),track_a_id:uuid(18),track_b_id:uuid(19),user_id:USER,state:"pending",expires_at:new Date(Date.now()+60000).toISOString()};
 const admin=mockAdmin({blind_listen_questions:[q],listen_bar_tracks:[{id:uuid(18),audio_path:"https://unit-test.invalid/storage/v1/object/public/listen-bar-audio/creator-name.mp3"}]});
 const lookups=[];admin.rpc=async(name,args)=>{lookups.push({name,args});return {data:"https://unit-test.invalid/storage/v1/object/public/listen-bar-audio/creator-name.mp3",error:null};};
 const api=loadTs("src/app/api/blind-listen/audio/route.ts",{"@/lib/server-creator-auth":{creatorAdmin:()=>admin}});
 let upstream;t.mock.method(globalThis,"fetch",async(url,init)=>{upstream={url,init};return new Response(new Uint8Array([1,2,3]),{status:206,headers:{"Content-Type":"audio/mpeg","Content-Range":"bytes 0-2/100","Accept-Ranges":"bytes","Content-Disposition":"filename=creator-name.mp3"}});});
 const token=server.makeBlindAudioToken(q,"A");
 const response=await api.GET(new Request("https://site.test/api/blind-listen/audio?token="+token,{headers:{Range:"bytes=0-2"}}));
 assert.equal(response.status,206);assert.equal(response.headers.get("content-disposition"),null);
 assert.deepEqual(lookups[0],{name:"blind_audio_source",args:{p_question:q.id,p_side:"A"}});
 assert.equal(response.headers.get("content-range"),"bytes 0-2/100");assert.equal(upstream.init.redirect,"error");
 assert.equal(upstream.init.headers.Range,"bytes=0-2");
 assert.equal((await api.GET(new Request("https://site.test/api/blind-listen/audio?token="+token,{headers:{Range:"bytes=0-2,3-5"}}))).status,416);
 assert.equal((await api.GET(new Request("https://site.test/api/blind-listen/audio?token=invalid"))).status,404);
});

test("tick verifies through one ownership-checking RPC without a redundant question read",async()=>{
 const ui=mount();const result=await ui.api.POST(ui.request({action:"tick",side:"B",event:"seek",position:30}));
 assert.equal(result.status,200);assert.equal(ui.reads.length,0);
 assert.deepEqual(ui.calls,[{name:"tick_blind_question",args:{p_user:USER,p_question:uuid(12),p_side:"B",p_event:"seek",p_position:30}}]);
});
test("next candidate is prepared before completion but is issued only after the award",async()=>{
 const ui=mount();await ui.api.POST(ui.request({action:"vote",choice:"tie"}));
 assert.deepEqual(ui.calls.map(x=>x.name),["prepare","complete_blind_question","issue"]);
});

test("parallel preparation excludes the just-completed pair and does not issue a second pending task",async()=>{
 const q={id:uuid(50),user_id:USER,track_a_id:uuid(20),track_b_id:uuid(21),state:"pending",expires_at:new Date(Date.now()+60000).toISOString(),heard_a:0,heard_b:0};
 const tracks=[20,21,22,23].map(n=>({id:uuid(n),source:"community",is_active:true,review_status:"approved",genre:"Original 自我風格",created_by:n===23?USER:uuid(2),created_at:new Date().toISOString(),duration_seconds:120,audio_path:"https://unit-test.invalid/storage/v1/object/public/listen-bar-audio/"+n+".mp3"}));
 const admin=mockAdmin({listen_bar_tracks:tracks,blind_listen_questions:[q]});const from=admin.from;admin.from=table=>{const query=from(table);query.gte=()=>query;return query;};
 let issued=0;admin.rpc=async name=>{if(name==="blind_popularity_summaries")return {data:[],error:null};issued++;return {data:null,error:null};};
 const blindServer=loadTs("src/lib/server-blind-listening.ts",{"./ai-music-surface-lifecycle":{buildAiMusicSurfaceLifecycleMap:async()=>new Map()}});
 const resume=await blindServer.prepareBlindQuestion(admin,USER);assert.equal(resume.pending.id,q.id);assert.equal(issued,0);
 const next=await blindServer.prepareBlindQuestion(admin,USER,q.id);assert.equal(next.pending,null);assert.equal(next.pairs.length,2);assert.equal(issued,0);
 assert.ok(next.pairs.every(pair=>!pair.includes(uuid(23))&&!(pair.includes(uuid(20))&&pair.includes(uuid(21)))));
 // If a candidate becomes unavailable, continue through prepared alternatives.
 await blindServer.issuePreparedBlindQuestion(admin,USER,next);assert.equal(issued,2);
});
