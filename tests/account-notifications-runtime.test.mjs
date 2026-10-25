import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, uuid, USER } from './helpers/choice-runtime.mjs';
const other = uuid(2);
function setup(seed) {
  let rows = structuredClone(seed), fail = false;
  const admin = { from(table) {
    assert.equal(table, 'battle_notifications');
    let filters=[], payload, removing=false, head=false, start=0, end=Infinity, sort=[];
    const q={
      select(_cols,opts={}){head=opts.head;return q},
      eq(k,v){filters.push(r=>r[k]===v);return q},
      is(k,v){filters.push(r=>(r[k]??null)===v);return q},
      not(k,op,v){assert.equal(op,'is');filters.push(r=>(r[k]??null)!==v);return q},
      in(k,vs){filters.push(r=>vs.includes(r[k]));return q},
      lte(k,v){filters.push(r=>r[k]<=v);return q},
      update(v){payload=v;return q},delete(){removing=true;return q},
      order(k,o){sort.push([k,o.ascending]);return q},range(a,b){start=a;end=b;return q},
      or(s){assert.ok(s.startsWith('kept_at.not.is.null,expires_at.gt.'));const now=s.split('expires_at.gt.')[1];filters.push(r=>r.kept_at!=null||r.expires_at>now);return q},
      then(resolve){if(fail)return Promise.resolve({error:{message:'offline'}}).then(resolve);let matched=rows.filter(r=>filters.every(f=>f(r)));if(payload)matched.forEach(r=>Object.assign(r,payload));if(removing)rows=rows.filter(r=>!matched.includes(r));matched.sort((a,b)=>{for(const[k,asc]of sort){const x=String(a[k]).localeCompare(String(b[k]));if(x)return asc?x:-x}return 0});return Promise.resolve({data:head?null:structuredClone(matched.slice(start,end+1)),count:matched.length,error:null}).then(resolve)}
    };return q;
  }};
  const common={'@/lib/server-creator-auth':{creatorAdmin:()=>admin,creatorAuth:async r=>r.headers.get('authorization')==='Bearer valid'?{admin,user:{id:USER}}:null},'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}},'@/lib/account-notifications':loadTs('src/lib/account-notifications.ts')};
  const route=loadTs('src/app/api/account-notifications/route.ts',common);
  const cron=loadTs('src/app/api/cron/account-notifications/route.ts',{...common,'@/lib/cron-auth':{authorizeCronRequest:r=>r.headers.get('authorization')==='Bearer cron'?{ok:true}:{ok:false,status:401,error:'Unauthorized'}}});
  const req=(query='',body,token='valid',method=body?'PATCH':'GET')=>new Request('https://aipoger.test/api/account-notifications'+query,{method,headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {route,cron,req,get rows(){return rows},set fail(v){fail=v}};
}
const notice=(n,owner=USER)=>({id:uuid(n),user_id:owner,type:'listen_bar_track_comment',title:'New comment',body:'A reviewer commented on your work',created_at:'2026-10-15T10:00:00.000Z',read_at:null,kept_at:null,expires_at:'2099-01-15T10:00:00.000Z'});
test('all notice operations authenticate and scope to recipient; acknowledgements are idempotent',async()=>{
  const db=setup([notice(10),notice(11,other)]);
  for(const method of ['GET','PATCH','DELETE'])assert.equal((await db.route[method](db.req('',method==='GET'?undefined:{ids:[uuid(10)]},'invalid',method))).status,401);
  const response=await db.route.GET(db.req());assert.equal(response.headers.get('cache-control'),'private, no-store');
  const list=await response.json();assert.equal(list.unreadCount,1);assert.deepEqual(list.notices.map(r=>r.id),[uuid(10)]);
  for(const action of ['read','keep','unkeep']){
    const ack=await (await db.route.PATCH(db.req('',{ids:[uuid(10),uuid(11)],action,userId:other,title:'tampered'}))).json();assert.deepEqual(ack.ids,[uuid(10)]);
    assert.equal(db.rows[1].read_at,null);assert.equal(db.rows[1].kept_at,null);assert.equal(db.rows[0].title,'New comment');
  }
  assert.equal((await (await db.route.GET(db.req('?count=1'))).json()).unreadCount,0);
  assert.deepEqual((await (await db.route.PATCH(db.req('',{ids:[uuid(10)]}))).json()).readIds,[]);
  assert.ok((await (await db.route.GET(db.req())).json()).notices[0].read_at);
  const del=await (await db.route.DELETE(db.req('',{ids:[uuid(10),uuid(11)]},'valid','DELETE'))).json();assert.deepEqual(del.ids,[uuid(10)]);assert.deepEqual(db.rows.map(r=>r.id),[uuid(11)]);
});
test('exactly three notices per page, stable equal-date ordering, separate kept/unread filters',async()=>{
  const db=setup(Array.from({length:7},(_,i)=>notice(i+10)));
  const first=await (await db.route.GET(db.req())).json();assert.equal(first.notices.length,3);assert.equal(first.total,7);
  const second=await (await db.route.GET(db.req('?page=1'))).json();assert.equal(new Set([...first.notices,...second.notices].map(r=>r.id)).size,6);
  assert.equal((await (await db.route.GET(db.req('?page=2'))).json()).notices.length,1);
  await db.route.PATCH(db.req('',{ids:[uuid(10)],action:'keep'}));
  assert.equal(db.rows.find(r=>r.id===uuid(10)).read_at,null,'keeping is independent of reading');
  assert.equal((await (await db.route.GET(db.req('?filter=kept'))).json()).total,1);
  assert.equal((await (await db.route.GET(db.req('?filter=unread'))).json()).total,7);
});
test('expired unkept notices vanish from list and badge; kept ones survive, unkeep never resets expiry',async()=>{
  const old={...notice(10),expires_at:'2020-01-01T00:00:00.000Z'};
  const saved={...notice(11),expires_at:'2020-01-01T00:00:00.000Z',kept_at:'2020-01-01T00:00:00.000Z'};
  const db=setup([old,saved,notice(12)]);
  assert.equal((await (await db.route.GET(db.req())).json()).total,2);
  assert.equal((await (await db.route.GET(db.req('?count=1'))).json()).unreadCount,2);
  assert.deepEqual((await (await db.route.PATCH(db.req('',{ids:[old.id],action:'keep'}))).json()).ids,[]);
  await db.route.PATCH(db.req('',{ids:[saved.id],action:'unkeep'}));
  assert.equal((await (await db.route.GET(db.req())).json()).total,1);
  assert.equal(db.rows.find(r=>r.id===saved.id).expires_at,saved.expires_at);
});
test('hourly cleanup is authenticated and physically deletes only expired unkept notices',async()=>{
  const db=setup([{...notice(10),expires_at:'2020-01-01T00:00:00.000Z'}, {...notice(11),expires_at:'2020-01-01T00:00:00.000Z',kept_at:'2020-01-01T00:00:00.000Z'}, notice(12)]);
  assert.equal((await db.cron.GET(db.req())).status,401);assert.equal(db.rows.length,3);
  assert.deepEqual(await (await db.cron.GET(db.req('',undefined,'cron'))).json(),{removed:1});
  assert.deepEqual(db.rows.map(r=>r.id),[uuid(11),uuid(12)]);
  assert.equal((await (await db.cron.GET(db.req('',undefined,'cron'))).json()).removed,0);
});
test('bad inputs and failures do not mutate notices or report successful reads/deletes',async()=>{
  const db=setup([notice(10)]);
  for(const query of ['?page=-1','?page=1.1','?page=NaN','?filter=edited'])assert.equal((await db.route.GET(db.req(query))).status,400);
  for(const ids of [[],['x'],Array(51).fill(uuid(10))])assert.equal((await db.route.PATCH(db.req('',{ids}))).status,400);
  assert.equal((await db.route.PATCH(db.req('',{ids:[uuid(10)],action:'edit'}))).status,400);
  db.fail=true;
  for(const action of ['read','keep','unkeep'])assert.equal((await db.route.PATCH(db.req('',{ids:[uuid(10)],action}))).status,500);
  assert.equal((await db.route.DELETE(db.req('',{ids:[uuid(10)]},'valid','DELETE'))).status,500);
  assert.equal(db.rows[0].read_at,null);assert.equal(db.rows[0].kept_at,null);assert.equal((await db.route.GET(db.req('?count=1'))).status,500);
  assert.equal((await db.cron.GET(db.req('',undefined,'cron'))).status,500);
});
test('notification links retain the work and language without accepting external targets',()=>{
  const {accountNotificationHref}=loadTs('src/lib/account-notifications.ts');
  assert.equal(accountNotificationHref({metadata:{href:'/mv?track=123'}},'zh'),'/mv?track=123&lang=zh');
  for(const href of ['https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)'])assert.equal(accountNotificationHref({metadata:{href}},'ja'),'/profile?lang=ja');
});

test('opening the inbox acknowledges all existing own notices across pages, preserving later arrivals and other recipients',async()=>{
 const through='2026-10-25T05:00:00.000Z';
 const later={...notice(99),created_at:'2090-01-01T00:00:00.000Z'};
 const expired={...notice(98),expires_at:'2020-01-01T00:00:00.000Z'};
 const kept={...notice(97),expires_at:'2020-01-01T00:00:00.000Z',kept_at:through};
 const original=Array.from({length:65},(_,i)=>notice(i+10));
 const db=setup([...original,later,notice(96,other),expired,kept]);
 assert.ok((await (await db.route.GET(db.req())).json()).readThrough);
 assert.equal((await db.route.PATCH(db.req('',{action:'read_inbox',readThrough:through},'invalid'))).status,401);
 const saved=await(await db.route.PATCH(db.req('',{action:'read_inbox',readThrough:through,userId:other}))).json();
 assert.equal(saved.unreadCount,1);assert.equal(saved.readThrough,through);assert.equal(db.rows.length,69);
 assert.ok(db.rows.filter(r=>original.some(o=>o.id===r.id)||r.id===kept.id).every(r=>r.read_at));
 assert.equal(db.rows.find(r=>r.id===later.id).read_at,null);assert.equal(db.rows.find(r=>r.id===expired.id).read_at,null);assert.equal(db.rows.find(r=>r.user_id===other).read_at,null);
 const firstRead=db.rows[0].read_at;await db.route.PATCH(db.req('',{action:'read_inbox',readThrough:through}));assert.equal(db.rows[0].read_at,firstRead);
 assert.equal((await(await db.route.GET(db.req('?filter=unread'))).json()).total,1);
 assert.equal(db.rows.find(r=>r.id===kept.id).kept_at,through);
});
test('inbox acknowledgements reject invalid cutoffs, cap future cutoffs, and preserve failure state',async()=>{
 const db=setup([notice(10),{...notice(11),created_at:'2090-01-01T00:00:00.000Z'}]);
 for(const readThrough of [undefined,null,0,'','invalid'])assert.equal((await db.route.PATCH(db.req('',{action:'read_inbox',readThrough}))).status,400);
 db.fail=true;assert.equal((await db.route.PATCH(db.req('',{action:'read_inbox',readThrough:'2026-10-25T06:00:00Z'}))).status,500);assert.equal(db.rows[0].read_at,null);
 db.fail=false;const saved=await(await db.route.PATCH(db.req('',{action:'read_inbox',readThrough:'2099-01-01T00:00:00Z'}))).json();assert.ok(Date.parse(saved.readThrough)<=Date.now());assert.equal(saved.unreadCount,1);assert.equal(db.rows[1].read_at,null);
});
