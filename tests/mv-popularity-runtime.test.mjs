import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, mockAdmin } from './helpers/choice-runtime.mjs';
const now=new Date('2026-10-25T03:00:00Z');
function setup({blindError=false,favoriteError=false}={}) {
  const made='2026-10-22T00:00:00Z';
  const works=[{id:'fresh',publishedAt:made,ratingCount:0},{id:'high',publishedAt:made,ratingCount:1,ratingTotal:10},{id:'popular',publishedAt:made,ratingCount:1,ratingTotal:8},{id:'album',workKind:'album',publishedAt:made,ratingCount:0},{id:'old',publishedAt:'2026-05-01',ratingCount:1,ratingTotal:100}];
  const rows=works.map(w=>({id:w.id,created_at:w.publishedAt,created_by:'owner'}));
  const heart=(track,user,date='2026-10-23T00:00:00Z')=>({track_id:track,user_id:user,reaction:'heart',created_at:date});
  const admin=mockAdmin({listen_bar_track_reactions:[...Array.from({length:4},(_,i)=>heart('popular','listener-'+i)),heart('popular','listener-0'),heart('high','owner'),heart('high','before','2026-01-01'),heart('high','future','2026-11-01'),heart('old','old-listener'),heart('album','album-listener')]});
  admin.rpc=async()=>({data:[],error:blindError?{message:'unavailable'}:null});
  admin.favorites.records=[{targetKind:'bar',targetId:'popular',favoriteUserIds:['a','a','b']},{targetKind:'bar',targetId:'fresh',favoriteUserIds:['c']}];
  if(favoriteError)admin.downloadError={message:'network unavailable'};
  return{works,rows,admin,read:loadTs('src/lib/server-mv-popularity.ts').readMvPopularity};
}
test('MV popularity uses Explore engagement and eligibility rather than pure ratings, while saves remain distinct',async()=>{
  const x=setup();const ids=await x.read(x.admin,x.works,x.rows,now);
  assert.deepEqual(ids,['popular','high']);assert.equal(x.works.find(w=>w.id==='popular').favoriteCount,2);
  assert.equal(x.works.find(w=>w.id==='fresh').favoriteCount,1);assert.equal(x.works.length,5);
  assert.equal(x.admin.operations.some(o=>['insert','update','delete','upload','remove'].includes(o.action)),false);
  assert.equal(JSON.stringify(x.works).includes('listener-'),false);assert.equal(JSON.stringify(x.works).includes('favoriteUserIds'),false);
});
test('ranking failure preserves new and historical MV works and independently available save counts',async()=>{
  const x=setup({blindError:true});assert.equal(await x.read(x.admin,x.works,x.rows,now),null);
  assert.equal(x.works.length,5);assert.equal(x.works[0].favoriteCount,1);
});
test('save-count read failure is unavailable, never a fabricated zero, while ranking still works',async()=>{
  const x=setup({favoriteError:true});assert.deepEqual(await x.read(x.admin,x.works,x.rows,now),['popular','high']);
  assert.ok(x.works.every(w=>w.favoriteCount===null));
});
