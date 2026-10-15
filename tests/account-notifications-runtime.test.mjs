import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, uuid, USER } from './helpers/choice-runtime.mjs';
const other = uuid(2);
function setup(seed) {
  let rows = structuredClone(seed), fail = false;
  const admin = { from(table) {
    assert.equal(table, 'battle_notifications');
    let filters=[], payload, head=false, cap=Infinity, sort=[];
    const q={
      select(_cols,opts={}){head=opts.head;return q},
      eq(k,v){filters.push(r=>r[k]===v);return q},
      is(k,v){filters.push(r=>(r[k]??null)===v);return q},
      in(k,vs){filters.push(r=>vs.includes(r[k]));return q},
      update(v){payload=v;return q},
      order(k,o){sort.push([k,o.ascending]);return q}, limit(v){cap=v;return q},
      or(s){const m=s.match(/^created_at.lt.(.*),and\(created_at.eq.(.*),id.lt.(.*)\)$/);assert.ok(m);filters.push(r=>r.created_at<m[1]||(r.created_at===m[2]&&r.id<m[3]));return q},
      then(resolve){if(fail)return Promise.resolve({error:{message:'offline'}}).then(resolve);let matched=rows.filter(r=>filters.every(f=>f(r)));if(payload)matched.forEach(r=>Object.assign(r,payload));matched.sort((a,b)=>{for(const[k,asc]of sort){const x=String(a[k]).localeCompare(String(b[k]));if(x)return asc?x:-x}return 0});return Promise.resolve({data:head?null:structuredClone(matched.slice(0,cap)),count:matched.length,error:null}).then(resolve)}
    };return q;
  }};
  const route = loadTs('src/app/api/account-notifications/route.ts',{
    '@/lib/server-creator-auth':{creatorAuth:async r=>r.headers.get('authorization')==='Bearer valid'?{admin,user:{id:USER}}:null},
    'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}}
  });
  const req=(query='',body,token='valid')=>new Request('https://aipoger.test/api/account-notifications'+query,{method:body?'PATCH':'GET',headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {route,req,get rows(){return rows},set fail(v){fail=v}};
}
const notice=(n,owner=USER)=>({id:uuid(n),user_id:owner,type:'listen_bar_track_comment',title:'New comment',body:'A reviewer commented on your work',created_at:'2026-10-15T10:00:00.000Z',read_at:null});

test('private notification read/list are authenticated and scoped to recipient',async()=>{
  const db=setup([notice(10),notice(11,other)]);
  assert.equal((await db.route.GET(db.req('',undefined,'invalid'))).status,401);
  assert.equal((await db.route.PATCH(db.req('',{ids:[uuid(10)]},'invalid'))).status,401);
  const response=await db.route.GET(db.req());assert.equal(response.headers.get('cache-control'),'private, no-store');
  const list=await response.json();assert.equal(list.unreadCount,1);assert.deepEqual(list.notices.map(r=>r.id),[uuid(10)]);
  const ack=await (await db.route.PATCH(db.req('',{ids:[uuid(10),uuid(11)],userId:other}))).json();assert.deepEqual(ack.readIds,[uuid(10)]);
  assert.equal(db.rows[1].read_at,null);
  assert.equal((await (await db.route.GET(db.req('?count=1'))).json()).unreadCount,0);
  const repeat=await (await db.route.PATCH(db.req('',{ids:[uuid(10)]}))).json();assert.deepEqual(repeat.readIds,[]);
  const history=await (await db.route.GET(db.req())).json();assert.equal(history.notices.length,1);assert.ok(history.notices[0].read_at);
  assert.equal((await (await db.route.GET(db.req('?unread=1'))).json()).notices.length,0);
});
test('notification pagination is stable for equal timestamps and bad cursor/IDs fail closed',async()=>{
  const db=setup(Array.from({length:22},(_,i)=>notice(i+10)));
  const first=await (await db.route.GET(db.req())).json();assert.equal(first.notices.length,10);assert.equal(first.hasMore,true);
  const last=first.notices.at(-1),query='?before='+encodeURIComponent(last.created_at)+'&beforeId='+last.id;
  const second=await (await db.route.GET(db.req(query))).json();assert.equal(new Set([...first.notices,...second.notices].map(r=>r.id)).size,20);
  assert.equal((await db.route.GET(db.req('?before=bad&beforeId=x'))).status,400);
  for(const ids of [[],['x'],Array(51).fill(uuid(10))])assert.equal((await db.route.PATCH(db.req('',{ids}))).status,400);
  db.fail=true;assert.equal((await db.route.PATCH(db.req('',{ids:[uuid(10)]}))).status,500);
  assert.equal(db.rows[0].read_at,null);assert.equal((await db.route.GET(db.req('?count=1'))).status,500);
});
test('notification links retain the work and language without accepting external targets',()=>{
  const {accountNotificationHref}=loadTs('src/lib/account-notifications.ts');
  assert.equal(accountNotificationHref({metadata:{href:'/mv?track=123'}},'zh'),'/mv?track=123&lang=zh');
  for(const href of ['https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)'])assert.equal(accountNotificationHref({metadata:{href}},'ja'),'/profile?lang=ja');
});
