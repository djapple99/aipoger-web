import assert from 'node:assert/strict';
import test from 'node:test';
import {workFavoriteCounts,readWorkFavoriteCounts} from '../src/lib/server-work-favorites.ts';
const member=(targetId,users,patch={})=>({targetKind:'bar',targetId,favoriteUserIds:users,...patch});
const reader=({store={records:[]},error=null,throws=false}={})=>({storage:{from(bucket){assert.equal(bucket,'listen-bar-data');return {async download(path){assert.equal(path,'honor-board/interactions.json');if(throws)throw new Error('network');return {data:error?null:{text:async()=>typeof store==='string'?store:JSON.stringify(store)},error}}}}}});
test('counts retained unique members by original work ID across entry points, never reaction totals',()=>{
 const store={records:[member('song',['one','one','two',' ',null]),member('song',['two','three'],{recordKey:'mv:song'}),member('song',['other'],{targetKind:'battle'}),member('private',['private-member'])]};
 assert.deepEqual([...workFavoriteCounts(store,['song','none'])],[['song',3],['none',0]]);
 assert.equal(JSON.stringify([...workFavoriteCounts(store,['song'])]).includes('three'),false);
});
test('invalid relevant membership cannot silently become a false zero',()=>{
 assert.throws(()=>workFavoriteCounts({},['song']));
 assert.throws(()=>workFavoriteCounts({records:[member('song',null)]},['song']));
});
test('read-only store download returns aggregate counts; a missing object means no saved members',async()=>{
 assert.deepEqual([...await readWorkFavoriteCounts(reader({store:{records:[member('song',['one'])]}}),['song'])],[['song',1]]);
 assert.equal((await readWorkFavoriteCounts(reader({error:{message:'Object not found'}}),['song'])).size,0);
 assert.equal((await readWorkFavoriteCounts({},[])).size,0);
});
test('network, access and malformed-store failures return unavailable, not zero',async(t)=>{
 const logs=[];t.mock.method(console,'warn',x=>logs.push(x));
 for(const setup of [{throws:true},{error:{message:'permission denied'}},{error:{message:'Bucket not found'}},{store:'broken json'},{store:{records:[member('song',null)]}}])assert.equal(await readWorkFavoriteCounts(reader(setup),['song']),null);
 assert.equal(logs.length,5);assert.ok(logs.every(x=>x==='Work favorite counts unavailable'));
});
