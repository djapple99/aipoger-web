import assert from "node:assert/strict";
import test from "node:test";
import { duplicateTitleKey,suspectedDuplicates,monthlyChartSharePath } from "../src/lib/chart-management.ts";
import { loadTs,mockAdmin,mocksFor,request,uuid } from "./helpers/choice-runtime.mjs";
import * as monthlyCharts from "../src/lib/monthly-charts.ts";

test("chart share keeps month, genre, language and chart anchor without search leakage",()=>{
  const url=new URL(monthlyChartSharePath("2026-09","R&B 深情瞬間","zh"),"https://aipoger.com");
  assert.equal(url.searchParams.get("chartMonth"),"2026-09");assert.equal(url.searchParams.get("chartGenre"),"R&B 深情瞬間");assert.equal(url.hash,"#monthly-charts");
  assert.equal(monthlyChartSharePath("bad","all","en"),"/rank?lang=en#monthly-charts");
});
test("duplicate hints normalize version suffix only for same creator and never mutate songs",()=>{
  const rows=[{id:uuid(1),title:"夢を描き始める場所",created_by:uuid(10),audio_path:"1.mp3"},{id:uuid(2),title:"夢を描き始める場所 (グランドフィナーレ)",created_by:uuid(10),audio_path:"2.mp3"},{id:uuid(3),title:"夢を描き始める場所",created_by:uuid(11),audio_path:"3.mp3"}];
  const snapshot=JSON.stringify(rows);const groups=suspectedDuplicates(rows,(b,p)=>`/${b}/${p}`);
  assert.equal(groups.length,1);assert.deepEqual(groups[0].tracks.map(x=>x.id),[uuid(1),uuid(2)]);
  assert.equal(groups[0].reason,"similar_title");assert.equal(JSON.stringify(rows),snapshot);
  assert.equal(duplicateTitleKey("NIGHT DRIVE（Remix）"),"nightdrive");
});
function route(admin,owner=true){return loadTs("src/app/api/admin/charts/route.ts",{...mocksFor(admin),"@/lib/monthly-charts":monthlyCharts,"@/lib/server-monthly-charts":{monthlyChartAdmin:()=>admin},"@/lib/admin-emails":{isAdminEmail:()=>owner}});}
test("actual chart mutation route denies guests/non-owner and uses authenticated actor",async()=>{
  const body={month:"2026-09",supporterCount:3,orderedIds:[uuid(1),uuid(2)],actor:uuid(555)};
  for(const [token,owner,status] of [[null,true,401],["invalid",true,401],["valid",false,403]]){
    const admin=mockAdmin();let calls=0;admin.rpc=async()=>{calls++;return {error:null}};
    assert.equal((await route(admin,owner).PATCH(request(body,token))).status,status);assert.equal(calls,0);
  }
  const admin=mockAdmin();let args;admin.rpc=async(n,p)=>{args=p;return {error:null}};
  assert.equal((await route(admin).PATCH(request(body))).status,200);assert.notEqual(args.p_actor,body.actor);assert.ok(args.p_actor);
  assert.deepEqual(args.p_ordered_ids,body.orderedIds);
});
test("actual route rejects duplicate IDs and returns conflict for stale/settled decisions",async()=>{
  const admin=mockAdmin();let calls=0;admin.rpc=async()=>{calls++;return {error:{code:"40001"}}};
  const body={month:"2026-09",supporterCount:3,orderedIds:[uuid(1),uuid(1)]};
  assert.equal((await route(admin).PATCH(request(body))).status,400);assert.equal(calls,0);
  body.orderedIds=[uuid(1),uuid(2)];assert.equal((await route(admin).PATCH(request(body))).status,409);
  admin.rpc=async()=>({error:{code:"55000"}});assert.equal((await route(admin).PATCH(request(body))).status,409);
});

test("owner inbox paginates duplicate review and never exposes it without authorization",async()=>{
  const tracks=Array.from({length:1002},(_,i)=>({id:uuid(i+1),title:i>=1000?"Duplicate Song":"Song "+i,artist:"Creator",created_by:uuid(5000),source:"community",is_active:true,review_status:"approved",audio_path:"song.mp3"}));
  tracks.push({...tracks[1001],id:uuid(6000),is_active:false});
  const admin=mockAdmin({listen_bar_tracks:tracks});admin.rpc=async()=>({data:{chart:{month:"2026-09",currentMonth:"2026-09",availableMonths:["2026-09"],status:"live",minSupporters:3,finalizedAt:null,tracks:[]},groups:[],history:[],pendingMonths:[]},error:null});
  const req={...request(null),nextUrl:new URL("https://aipoger.com/api/admin/charts")};
  const result=await route(admin).GET(req);assert.equal(result.status,200);
  const body=await result.json();assert.equal(body.duplicates.length,1);assert.equal(body.duplicates[0].tracks.length,2);
  assert.equal(admin.operations.filter(x=>x.table==="listen_bar_tracks").length,2);
  assert.equal((await route(admin,false).GET(req)).status,403);
  assert.equal((await route(admin).GET({...req,headers:new Headers()})).status,401);
});
