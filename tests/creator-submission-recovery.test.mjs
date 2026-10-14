import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCreatorSubmission } from '../src/lib/creator-submission.ts';
const payload={id:'stable-work',created_by:'signed-in-member',credit_submission_confirmed:true};
function mock(reads,write) {
  let writes=0;
  return {get writes(){return writes;},from(table){assert.equal(table,'listen_bar_tracks');return {
    select(){return {eq(field,id){assert.equal(field,'id');assert.equal(id,payload.id);return {eq(field,owner){assert.equal(field,'created_by');assert.equal(owner,payload.created_by);return {async maybeSingle(){return reads.shift();}};}};}};},
    insert(p){assert.deepEqual(p,payload);writes++;return {select(){return {async maybeSingle(){return write;}};}};}
  };}};
}
test('submission retry returns the previously committed work without inserting again',async()=>{
 const db=mock([{data:payload,error:null}]);const result=await saveCreatorSubmission(db,payload);
 assert.deepEqual(result.data,payload);assert.equal(result.uncertain,false);assert.equal(db.writes,0);
});
test('lost insertion response recovers the original work with the same owner and ID',async()=>{
 const db=mock([{data:null,error:null},{data:payload,error:null}],{data:null,error:{message:'Fetch failed',code:''}});
 const result=await saveCreatorSubmission(db,payload);assert.deepEqual(result.data,payload);assert.equal(result.uncertain,false);assert.equal(db.writes,1);
});
test('unknown insertion result stays uncertain so uploaded assets cannot be cleaned up',async()=>{
 const db=mock([{data:null,error:null},{data:null,error:{message:'Read failed'}}],{data:null,error:{message:'Timeout'}});
 const result=await saveCreatorSubmission(db,payload);assert.equal(result.uncertain,true);assert.equal(result.data,null);
});
test('an explicit rejected transaction is distinguished from a lost result',async()=>{
 const db=mock([{data:null,error:null},{data:null,error:null}],{data:null,error:{message:'CREDIT_INSUFFICIENT',code:'P0001'}});
 const result=await saveCreatorSubmission(db,payload);assert.equal(result.uncertain,false);assert.equal(result.error.code,'P0001');
});
test('an unreadable prior receipt does not start a second insertion',async()=>{
 const db=mock([{data:null,error:{message:'Read failed'}}]);const result=await saveCreatorSubmission(db,payload);
 assert.equal(result.uncertain,true);assert.equal(db.writes,0);
});
