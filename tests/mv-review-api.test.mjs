import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, USER, uuid } from './helpers/choice-runtime.mjs';
import {isWorkRating} from '../src/lib/work-rating.ts';
import { NextRequest } from 'next/server.js';
const trackId=uuid(22),requestId=uuid(33);
function api({visible=true,author=uuid(44),musicVisible=visible,stageName="舞台名",identityError=false,owner=false,comment=null,rpcError=null,workKind="single"}={}){
 const admin=mockAdmin({listen_bar_tracks:[{id:trackId,created_by:author}],mv_work_ratings:[{track_id:trackId,user_id:USER,score:7,comment_id:comment?.id??null}],listen_bar_track_comments:comment?[{...comment,track_id:trackId,user_id:USER}]:[], user_profiles:[{id:USER,fighter_name:stageName,display_name:"Private profile name"}],fighter_profiles:[{id:USER,display_name:"Older stage name"}]});
 const auth=admin.auth.getUser;admin.auth.getUser=async token=>{const result=await auth(token);if(result.data.user&&owner){result.data.user.email='djapple99@gmail.com';result.data.user.email_confirmed_at='2026-10-15T00:00:00Z';}if(result.data.user) result.data.user.user_metadata={full_name:'Private legal name',name:'Private legal name',display_name:'Account name'};return result;};
 if(identityError){const from=admin.from;admin.from=table=>table==='user_profiles'?{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:{message:'offline'}})})})}:from(table);}
 const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return {data:{myScore:args?.p_score,comment:null},error:rpcError};};
 const route=loadTs('src/app/api/mv/review/route.ts',{'@/lib/server-home-discovery':{readMvDiscovery:async()=>({works:visible?[{id:trackId,workKind,ratingAverage:7,ratingCount:1,ratingTotal:7}]:[]}),readMusicReviewWork:async()=>musicVisible?{id:trackId,workKind,ratingAverage:7,ratingCount:1,ratingTotal:7}:null},'@/lib/work-rating':{isWorkRating},'@/lib/server-mv-reviews':{mvReviewAdmin:()=>admin}});
 const req=(body,token='valid',surface='mv')=>new NextRequest('https://aipoger.com'+(surface==='music'?'/api/listen-bar/review':'/api/mv/review')+'?trackId='+trackId,{method:body?'POST':'GET',headers:token?{Authorization:'Bearer '+token,'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 return {route,calls,req};
}
test('MV review GET exposes only current rating and aggregate, excluding author scoring',async()=>{
 const x=api({author:USER});const result=await x.route.GET(x.req());assert.equal(result.status,200);assert.deepEqual(await result.json(),{workKind:"single",myScore:7,myComment:null,canRate:false,canEditScore:false,canEditComment:false,canDeleteComment:false,reviewBlocked:false,ratingAverage:7,ratingCount:1,ratingTotal:7});
});
test('MV review POST binds bearer identity, ignores forged user/name, and saves rating with comment atomically',async()=>{
 const x=api();const result=await x.route.POST(x.req({trackId,requestId,score:9,text:'  Good music and visual timing  ',userId:uuid(99),displayName:'Forged'}));assert.equal(result.status,200);assert.equal(x.calls.length,1);assert.equal(x.calls[0].args.p_user_id,USER);assert.equal(x.calls[0].args.p_name,'舞台名');assert.equal(x.calls[0].args.p_body,'Good music and visual timing');assert.equal(x.calls[0].args.p_score,9);assert.equal(x.calls[0].name,'save_work_review');
});
test('MV reviews reject hidden work, expired auth, invalid score, oversized or empty evaluation before writing',async()=>{
 for(const score of [0,11,2.55,9.00000000001,'8']){const x=api();assert.equal((await x.route.POST(x.req({trackId,requestId,score,text:''}))).status,400);assert.equal(x.calls.length,0);}
 const x=api({visible:false});assert.equal((await x.route.POST(x.req({trackId,requestId,score:7,text:''}))).status,404);assert.equal(x.calls.length,0);
 const y=api();assert.equal((await y.route.POST(y.req({trackId,requestId,score:7,text:''},'bad'))).status,401);assert.equal((await y.route.POST(y.req({trackId,requestId,score:null,text:''}))).status,400);assert.equal((await y.route.POST(y.req({trackId,requestId,score:7,text:'x'.repeat(281)}))).status,400);assert.equal(y.calls.length,0);
});
test('MV comment-only discussions remain available without forcing a numeric score',async()=>{
 const x=api({author:USER});assert.equal((await x.route.POST(x.req({trackId,requestId,score:null,text:'作者補充創作想法'}))).status,200);assert.equal(x.calls[0].args.p_score,null);
});

test('music accepts one decimal, binds verified user and routes notifications to Explore',async()=>{
 const x=api({visible:false,musicVisible:true});const result=await x.route.POST(x.req({trackId,requestId,score:4.8,text:'Music-specific review'},'valid','music'));assert.equal(result.status,200);assert.equal(x.calls[0].args.p_score,4.8);assert.equal(x.calls[0].args.p_surface,'music');assert.equal(x.calls[0].args.p_user_id,USER);
 assert.equal((await x.route.GET(x.req(null,'valid','music'))).status,200);
 const y=api({visible:true,musicVisible:false});assert.equal((await y.route.POST(y.req({trackId,requestId,score:6.8,text:''},'valid','music'))).status,404);assert.equal(y.calls.length,0);
});

test('music and MV use saved stage name, and never publish account names on lookup failure',async()=>{
 for(const surface of ['music','mv']){
  const x=api({stageName:' 新舞台名🍎 '});assert.equal((await x.route.POST(x.req({trackId,requestId,score:8.2,text:'Review'},'valid',surface))).status,200);assert.equal(x.calls[0].args.p_name,'新舞台名🍎');
  const y=api({identityError:true});assert.equal((await y.route.POST(y.req({trackId,requestId,score:8.2,text:'Review'},'valid',surface))).status,503);assert.equal(y.calls.length,0);
 }
});

for (const owner of [false,true]) test(`review capabilities derive from verified account and edit count (owner=${owner})`,async()=>{
 const comment={id:uuid(70),body:'Existing review',moderation_status:'visible',review_edit_count:1};
 const x=api({owner,comment});const body=await (await x.route.GET(x.req())).json();
 assert.equal(body.canEditScore,owner);assert.equal(body.canEditComment,owner);assert.equal(body.canDeleteComment,owner);assert.equal(body.myScore,7);
 const y=api({owner,comment:{...comment,review_edit_count:0}});assert.equal((await (await y.route.GET(y.req())).json()).canEditComment,true);
 const z=api({owner,comment:{...comment,moderation_status:'hidden'}});const hidden=await (await z.route.GET(z.req())).json();assert.equal(hidden.reviewBlocked,true);assert.equal(hidden.myComment,null);
});
test('PATCH binds actor and score, rejects invalid decimals and reports authoritative policy errors',async()=>{
 const x=api();const r=await x.route.PATCH(x.req({commentId:uuid(70),text:'Edited words',active:true,score:8.2,userId:uuid(99),isOwner:true}));assert.equal(r.status,200);
 assert.deepEqual(x.calls[0],{name:'edit_work_review',args:{p_user:USER,p_comment:uuid(70),p_body:'Edited words',p_active:true,p_score:8.2}});
 assert.equal((await x.route.PATCH(x.req({commentId:uuid(70),text:'Edited words',active:true,score:8.25}))).status,400);
 for(const code of ['REVIEW_EDIT_LIMIT','REVIEW_SCORE_LOCKED','REVIEW_OWNER_ONLY']) {const y=api({rpcError:{code:'42501',message:code}});const response=await y.route.PATCH(y.req({commentId:uuid(70),text:'Edited words',active:true}));assert.equal(response.status,403);assert.equal((await response.json()).code,code);}
});

test('albums preserve comment access and reject numeric rating on both surfaces',async()=>{
 for(const surface of ['music','mv']) {
  const x=api({workKind:'album'}); const p=await (await x.route.GET(x.req(null,'valid',surface))).json();
  assert.equal(p.workKind,'album'); assert.equal(p.canRate,false); assert.equal(p.canEditScore,false); assert.equal(p.myScore,null);
  const denied=await x.route.POST(x.req({trackId,requestId,score:10,text:''},'valid',surface));
  assert.equal(denied.status,403); assert.equal((await denied.json()).code,'ALBUM_RATING_DISABLED'); assert.equal(x.calls.length,0);
  assert.equal((await x.route.POST(x.req({trackId,requestId,score:null,text:'Album discussion'},'valid',surface))).status,200); assert.equal(x.calls[0].args.p_score,null);
 }
});
