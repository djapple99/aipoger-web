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

test('paid submissions keep the actual period count after the third free allowance',()=>{
 const enabled={...member,creditEnabled:true,balance:67,debt:0,extraCost:60,canSubmit:true};
 for(const used of [3,4,5,20]){const quota=parseCreatorUploadQuota({...enabled,used});assert.ok(quota);assert.equal(quota.used,used);assert.equal(creatorUploadLimitReached(quota),false);}
 for(const change of [{balance:59,canSubmit:false},{balance:0,debt:3,canSubmit:false}]){const quota=parseCreatorUploadQuota({...enabled,used:5,...change});assert.ok(quota);assert.equal(creatorUploadLimitReached(quota),true);}
 for(const change of [{creditEnabled:false},{extraCost:0},{balance:'67'},{canSubmit:null}])assert.equal(parseCreatorUploadQuota({...enabled,used:4,...change}),null);
});
