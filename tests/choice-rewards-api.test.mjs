import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs,mockAdmin,mocksFor,request,USER,uuid} from './helpers/choice-runtime.mjs';
const collection=uuid(20),req=uuid(30);
function setup(){
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.SUPABASE_SERVICE_KEY='fixture';
 const admin=mockAdmin({aipoger_creator_choice_collections:[{id:collection,is_published:true}],aipoger_choice_collection_hearts:[{collection_kind:'creator',collection_id:collection,user_id:USER}]});
 const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return{error:null,data:name==='post_choice_comment'?{comment:{id:req,user_id:USER,display_name:'Public name',body:args.p_body,created_at:'2026-10-29'},awarded:10,replayed:false}:{[`creator:${collection}`]:0}};};
 const mocks={...mocksFor(admin),'@/lib/server-public-identity':{loadPublicIdentity:async()=>({displayName:'Public name',avatarUrl:null})}};
 return {admin,calls,comments:loadTs('src/app/api/choice/comments/route.ts',mocks),hearts:loadTs('src/app/api/choice/interactions/route.ts',mocks)};
}
test('Choice comment API uses authenticated identity and one atomic RPC; exposes award without private fields',async()=>{
 const {calls,comments}=setup();const body={collectionKind:'creator',collectionId:collection,requestId:req,body:'這份歌單選曲用心而且很有完整的情緒脈絡期待下次作品',userId:uuid(99),awarded:999};
 const r=await comments.POST(request(body));assert.equal(r.status,200);const data=await r.json();assert.equal(data.awarded,10);assert.equal(data.comment.isMine,true);assert.ok(!('user_id' in data.comment));
 assert.equal(calls.length,1);assert.equal(calls[0].name,'post_choice_comment');assert.equal(calls[0].args.p_user,USER);assert.equal(calls[0].args.p_request,req);assert.equal(calls[0].args.p_name,'Public name');
});
test('Choice comment API rejects anonymous sessions, invalid requests and unpublished collections before awarding',async()=>{
 const {admin,calls,comments}=setup();const body={collectionKind:'creator',collectionId:collection,body:'評論測試'};
 assert.equal((await comments.POST(request(body,null))).status,401);
 assert.equal((await comments.POST(request({...body,requestId:'bad'}))).status,400);
 admin.tables.aipoger_creator_choice_collections[0].is_published=false;
 assert.equal((await comments.POST(request(body))).status,404);
 admin.auth.getUser=async()=>({data:{user:{id:USER,is_anonymous:true}},error:null});
 assert.equal((await comments.POST(request(body))).status,401);assert.equal(calls.length,0);
});
test('Choice interactions keep lifetime saves separate from 30-day popularity and do not expose user IDs',async()=>{
 const {hearts,calls}=setup();
 const {NextRequest}=await import('next/server.js');const response=await hearts.GET(new NextRequest('https://example.test/api/choice/interactions?keys=creator:'+collection));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.interactions[0].heartCount,1);assert.equal(data.interactions[0].popularCount,0);assert.equal(data.interactions[0].myHeart,false);
 assert.ok(!JSON.stringify(data).includes(USER));assert.deepEqual(calls[0].args.p_keys,[`creator:${collection}`]);
});
