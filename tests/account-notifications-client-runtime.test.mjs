import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/choice-runtime.mjs';
test('inbox acknowledgement sends an authenticated PATCH and broadcasts only a confirmed persisted count',async t=>{
 const win=new EventTarget(),events=[],requests=[];win.addEventListener('aipoger:account-notices-read',e=>events.push(e.detail));
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');Object.defineProperty(globalThis,'window',{value:win,configurable:true});t.after(()=>original?Object.defineProperty(globalThis,'window',original):delete globalThis.window);
 let status=200,session={access_token:'test-token',user:{id:'alice'}};
 t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,...options});return new Response(JSON.stringify({readAt:'2026-10-25T06:00:01Z',readThrough:'2026-10-25T06:00:00Z',unreadCount:1}),{status})});
 const client=loadTs('src/lib/account-notifications-client.ts',{'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session}})}}}});
 await client.readAccountNoticeInbox('alice','2026-10-25T06:00:00Z');
 assert.equal(requests[0].method,'PATCH');assert.equal(requests[0].headers.Authorization,'Bearer test-token');assert.equal(requests[0].cache,'no-store');assert.deepEqual(JSON.parse(requests[0].body),{action:'read_inbox',readThrough:'2026-10-25T06:00:00Z'});assert.deepEqual(events,[{userId:'alice',unreadCount:1}]);
 status=500;await assert.rejects(client.readAccountNoticeInbox('alice','2026-10-25T06:00:00Z'));assert.equal(events.length,1);
 session={...session,user:{id:'bob'}};await assert.rejects(client.readAccountNoticeInbox('alice','2026-10-25T06:00:00Z'));assert.equal(requests.length,2);
 session=null;await assert.rejects(client.readAccountNoticeInbox('alice','2026-10-25T06:00:00Z'));assert.equal(requests.length,2);
});
