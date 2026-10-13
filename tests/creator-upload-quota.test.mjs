import assert from 'node:assert/strict';
import test from 'node:test';
import {parseCreatorUploadQuota,creatorUploadLimitReached} from '../src/lib/creator-upload-quota.ts';
const now='2026-10-13T12:00:00Z';
const member={used:0,limit:3,unlimited:false,resetsAt:null,serverNow:now};
test('member allowance permits the third submission and blocks the fourth',()=>{
 for(const used of [0,1,2,3]){
  const quota=parseCreatorUploadQuota({...member,used});assert.ok(quota);
  assert.equal(creatorUploadLimitReached(quota),used===3);
 }
 assert.equal(creatorUploadLimitReached(null),false);
});
test('unlimited Owner quota does not use a fake numeric limit',()=>{
 const quota=parseCreatorUploadQuota({...member,limit:null,unlimited:true});
 assert.ok(quota);assert.equal(quota.limit,null);assert.equal(creatorUploadLimitReached(quota),false);
});
test('malformed quotas fail closed and previous member responses remain compatible',()=>{
 const previous={used:0,limit:3,resetsAt:null,serverNow:now};assert.ok(parseCreatorUploadQuota(previous));
 for(const change of [{limit:null},{unlimited:true},{limit:100},{used:4},{used:-1},{used:1.5},{serverNow:'bad'},{resetsAt:'bad'},{unlimited:'true'},{limit:null,unlimited:true,used:1}])
  assert.equal(parseCreatorUploadQuota({...member,...change}),null);
});
