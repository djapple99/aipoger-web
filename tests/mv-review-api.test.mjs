import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, USER, uuid } from './helpers/choice-runtime.mjs';
import { NextRequest } from 'next/server.js';
const trackId=uuid(22),requestId=uuid(33);
function api({visible=true,author=uuid(44)}={}){
 const admin=mockAdmin({listen_bar_tracks:[{id:trackId,created_by:author}],mv_work_ratings:[{track_id:trackId,user_id:USER,score:7}]});
 const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return {data:{myScore:args?.p_score,comment:null},error:null};};
 const route=loadTs('src/app/api/mv/review/route.ts',{'@/lib/server-home-discovery':{readMvDiscovery:async()=>({works:visible?[{id:trackId,ratingAverage:7,ratingCount:1}]:[]})},'@/lib/server-mv-reviews':{mvReviewAdmin:()=>admin}});
 const req=(body,token='valid')=>new NextRequest('https://aipoger.com/api/mv/review?trackId='+trackId,{method:body?'POST':'GET',headers:token?{Authorization:'Bearer '+token,'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 return {route,calls,req};
}
test('MV review GET exposes only current rating and aggregate, excluding author scoring',async()=>{
 const x=api({author:USER});const result=await x.route.GET(x.req());assert.equal(result.status,200);assert.deepEqual(await result.json(),{myScore:7,canRate:false,ratingAverage:7,ratingCount:1});
});
test('MV review POST binds bearer identity, ignores forged user/name, and saves rating with comment atomically',async()=>{
 const x=api();const result=await x.route.POST(x.req({trackId,requestId,score:9,text:'  Good music and visual timing  ',userId:uuid(99),displayName:'Forged'}));assert.equal(result.status,200);assert.equal(x.calls.length,1);assert.equal(x.calls[0].args.p_user_id,USER);assert.equal(x.calls[0].args.p_body,'Good music and visual timing');assert.equal(x.calls[0].args.p_score,9);assert.equal(x.calls[0].name,'save_mv_review');
});
test('MV reviews reject hidden work, expired auth, invalid score, oversized or empty evaluation before writing',async()=>{
 for(const score of [0,11,2.5,'8']){const x=api();assert.equal((await x.route.POST(x.req({trackId,requestId,score,text:''}))).status,400);assert.equal(x.calls.length,0);}
 const x=api({visible:false});assert.equal((await x.route.POST(x.req({trackId,requestId,score:7,text:''}))).status,404);assert.equal(x.calls.length,0);
 const y=api();assert.equal((await y.route.POST(y.req({trackId,requestId,score:7,text:''},'bad'))).status,401);assert.equal((await y.route.POST(y.req({trackId,requestId,score:null,text:''}))).status,400);assert.equal((await y.route.POST(y.req({trackId,requestId,score:7,text:'x'.repeat(281)}))).status,400);assert.equal(y.calls.length,0);
});
test('MV comment-only discussions remain available without forcing a numeric score',async()=>{
 const x=api({author:USER});assert.equal((await x.route.POST(x.req({trackId,requestId,score:null,text:'作者補充創作想法'}))).status,200);assert.equal(x.calls[0].args.p_score,null);
});
