import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs,USER,uuid,request} from './helpers/choice-runtime.mjs';
function fixture(authorized=true,fail=false) {
 const calls=[];
 const admin={rpc:async(name,args)=>{calls.push({name,args});return {data:{awarded:15,balance:15,debt:0,day:'server-day'},error:fail?{message:'Unreachable'}:null};}};
 const clients=[];
 const route=loadTs('src/app/api/credit/route.ts',{
  '@/lib/server-creator-auth':{creatorAuth:async()=>authorized?{admin,user:{id:USER},token:'verified-token'}:null},
  '@/lib/server-blind-listening':{readCredit:async(db,id)=>{assert.equal(db,admin);assert.equal(id,USER);return {enabled:true,balance:15,debt:0,entries:[]};}},
  '@supabase/supabase-js':{createClient:(url,key,options)=>{clients.push(options);return {rpc:async name=>{calls.push({name});return {data:{used:0,limit:3},error:null};}};}},
  'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}}
 });return {route,calls,clients};
}
test('Credit endpoints require a verified member before reading or awarding',async()=>{
 const x=fixture(false);assert.equal((await x.route.GET(request(null))).status,401);assert.equal((await x.route.POST(request({}))).status,401);assert.equal(x.calls.length,0);
});
test('visit ignores forged account, amount and date and delegates the server day to the database',async()=>{
 const x=fixture();const r=await x.route.POST(request({userId:uuid(99),amount:9999,date:'2099-01-01'}));
 assert.equal(r.status,200);assert.deepEqual(x.calls,[{name:'creator_credit_visit',args:{p_user:USER}}]);assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('quota uses the verified caller JWT while history remains scoped to the same member',async()=>{
 const x=fixture();const r=await x.route.GET(request(null));assert.equal(r.status,200);assert.equal(x.clients[0].global.headers.Authorization,'Bearer verified-token');assert.equal(x.calls[0].name,'listen_bar_my_upload_quota');
});
test('unconfirmed award failures never return a fabricated balance or success',async()=>{
 const x=fixture(true,true);const r=await x.route.POST(request({}));assert.equal(r.status,503);assert.equal((await r.json()).balance,undefined);
});
