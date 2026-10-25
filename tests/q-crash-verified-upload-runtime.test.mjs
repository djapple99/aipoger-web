import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs,mockAdmin,mocksFor,request,USER,uuid} from './helpers/choice-runtime.mjs';

test('verified MP3 can create and accept a Q Crash card without a legacy audio_path; foreign assets fail',async()=>{
 const saved=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY];
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
 try {
  const assetId=uuid(11),sourceUrl=`https://aipoger.com/api/audio-assets/${assetId}`;
  const queue=id=>({id:uuid(id),user_id:USER,fighter_name:'Stage',genre:'rock',audio_path:null,source_type:'upload',source_url:sourceUrl,submission_mode:'q_crash',title:'MP3 '+id,original_file_name:'MP3 '+id,duration_seconds:75,rights_confirmed_at:new Date().toISOString(),status:'searching',match_group_id:null,challenge_target_queue_id:null});
  const admin=mockAdmin({battle_queue:[queue(20)],q_crash_cards:[],verified_audio_assets:[{id:assetId,user_id:USER,status:'verified',storage_path:'own/song.mp3',duration_seconds:75,max_kbps:320}]});
  const from=admin.from;admin.from=table=>{const q=from(table);q.returns=()=>q;return q;};
  const mocks={...mocksFor(admin),'@/lib/server-creator-auth':{creatorAdmin:()=>admin},'@/lib/server-external-music':{},'@/lib/server-home-discovery':{}};
  const create=loadTs('src/app/api/q-crash/route.ts',mocks),join=loadTs('src/app/api/q-crash/[id]/join/route.ts',mocks);
  const body={queueId:uuid(20),durationMinutes:30,rightsConfirmed:true};
  admin.tables.verified_audio_assets[0].user_id=uuid(2);
  assert.equal((await create.POST(request(body))).status,422);assert.equal(admin.tables.q_crash_cards.length,0);
  admin.tables.verified_audio_assets[0].user_id=USER;
  const created=await create.POST(request(body));assert.equal(created.status,200);const {cardId}=await created.json();assert.ok(cardId);
  admin.tables.battle_queue.push(queue(21));
  admin.tables.verified_audio_assets[0].status='cleanup';
  assert.equal((await join.POST(request({queueId:uuid(21),rightsConfirmed:true}),{params:Promise.resolve({id:cardId})})).status,422);assert.equal(admin.tables.battles.length,0);
  admin.tables.verified_audio_assets[0].status='verified';
  const accepted=await join.POST(request({queueId:uuid(21),rightsConfirmed:true}),{params:Promise.resolve({id:cardId})});
  assert.equal(accepted.status,200);assert.ok((await accepted.json()).battleId);assert.equal(admin.tables.q_crash_cards[0].status,'q_crash_voting');assert.equal(admin.tables.battles[0].audio_a_path,null);assert.equal(admin.tables.battle_queue.filter(q=>q.status==='matched').length,2);
 }finally{for(const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});
