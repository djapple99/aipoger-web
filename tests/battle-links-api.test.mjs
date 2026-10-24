import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, mockAdmin, uuid, USER } from './helpers/choice-runtime.mjs';
const targetId=uuid(50);
const preview={title:'Track',creator:'Stage',cover:'https://i.ytimg.com/x.jpg',duration:210,sourceType:'youtube',sourceUrl:'https://www.youtube.com/watch?v=5n-CNfo63Ng',workId:null,playback:{type:'youtube',url:'https://www.youtube.com/watch?v=5n-CNfo63Ng',start:0,seconds:210},token:'signed'};
function api({anonymous=false,down=false,targetMode='60'}={}) {
  const admin=mockAdmin({battle_queue:[{id:targetId,user_id:uuid(2),title:'Host',genre:'EDM 百大電音',submission_mode:'drop',drop_playback_mode:targetMode,status:'waiting_challenge',expires_at:'2099-01-01',scheduled_start_at:'2099-01-01',match_group_id:null}]});
  const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return{data:args.p_id,error:null};};
  const route=loadTs('src/app/api/battle-links/route.ts',{
    '@/lib/server-creator-auth':{creatorAdmin:()=>admin,creatorAuth:async r=>r.headers.get('authorization')==='Bearer valid'&&!anonymous?{admin,user:{id:USER}}:null},
    '@/lib/server-battle-links':{verifyBattlePreview:(token,user)=>token==='signed'&&user===USER?preview:null,resolveBattleLink:async()=>{if(down)throw new Error('SOURCE_UNAVAILABLE');return preview;}},
    'next/server':{NextResponse:{json:(value,init)=>Response.json(value,init)}},
  });
  const body={action:'submit',requestId:uuid(99),previewToken:'signed',battleMode:'drop',playbackMode:'90',clipStart:20,title:'Track',creator:'Stage',genre:'EDM 百大電音',confirmedRights:true,targetId};
  const req=(value=body,token='valid')=>new Request('https://aipoger.com/api/battle-links',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(value)});
  return{route,calls,req,body,admin};
}
test('link entry inherits host format, binds verified actor and trusted source, and ignores forged media',async()=>{
  const x=api();const result=await x.route.POST(x.req({...x.body,userId:uuid(3),duration:9999,playback:{url:'https://evil.test',seconds:9999}}));
  assert.equal(result.status,201);assert.equal(x.calls.length,1);
  const args=x.calls[0].args;assert.equal(args.p_actor,USER);assert.equal(args.p_entry.dropMode,'60');
  assert.deepEqual(args.p_entry.playback,{type:'youtube',url:preview.sourceUrl,start:20,seconds:60});assert.equal(args.p_entry.duration,210);
});
test('auth, rights, expired preview, invalid segment and foreign covers fail without a queue write',async()=>{
  for(const [changes,token,status] of [[{},'bad',401],[{confirmedRights:false},'valid',400],[{previewToken:'forged'},'valid',400],[{clipStart:200},'valid',400],[{coverPath:`${uuid(2)}/q-crash-covers/x.png`},'valid',400]]){
    const x=api();assert.equal((await x.route.POST(x.req({...x.body,...changes},token))).status,status);assert.equal(x.calls.length,0);
  }
  const anonymous=api({anonymous:true});assert.equal((await anonymous.route.POST(anonymous.req())).status,401);
  const down=api({down:true});assert.equal((await down.route.POST(down.req())).status,400);assert.equal(down.calls.length,0);
});
test('new full mode uses actual full length; old audio entries are never overwritten or uploaded',async()=>{
  const x=api();const r=await x.route.POST(x.req({...x.body,targetId:null,playbackMode:'full',clipStart:100}));
  assert.equal(r.status,201);assert.equal(x.calls[0].args.p_entry.playback.start,0);assert.equal(x.calls[0].args.p_entry.playback.seconds,210);
  assert.equal(x.admin.operations.some(o=>o.action==='upload'||o.action==='remove'||o.action==='update'),false);
});
test('public target read exposes the fixed format without member identities',async()=>{
  const x=api();const r=await x.route.GET(new Request(`https://aipoger.com/api/battle-links?target=${targetId}`));
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.target.mode,'60');assert.equal(JSON.stringify(data).includes('user_id'),false);
});
test('archived link playback is public only after an official finished result and signs existing private audio',async()=>{
  const x=api();
  x.admin.tables.battles=[{id:uuid(70),status:'live',playback_a:{type:'upload',url:'existing/file.mp3',start:10,seconds:60},playback_b:preview.playback}];
  x.admin.tables.battle_result_archives=[{battle_id:uuid(70),winner:'fighter_a',total_votes:3,result_payload:{audienceCount:3}}];
  const req=()=>new Request(`https://aipoger.com/api/battle-links?battle=${uuid(70)}`);
  assert.equal((await x.route.GET(req())).status,404);
  x.admin.tables.battles[0].status='finished';
  const r=await x.route.GET(req());assert.equal(r.status,200);const p=await r.json();
  assert.match(p.A.url,/signed=1/);assert.equal(p.A.seconds,60);assert.equal(p.A.start,10);assert.equal(p.B.type,'youtube');
  x.admin.tables.battle_result_archives[0].result_payload.audienceCount=2;
  assert.equal((await x.route.GET(req())).status,404);
});
test('publishing a founder card waits for acceptance instead of silently matching another founder',async()=>{
  const saved=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
  try {
    const admin=mockAdmin({battle_queue:[{id:uuid(80),user_id:USER,status:'waiting_challenge',match_group_id:null,submission_mode:'drop'}]});
    let matched=false;admin.rpc=async()=>{matched=true;return{data:null,error:null};};
    const route=loadTs('src/app/api/battle-pool/attempt-matchmaking/route.ts',{'@supabase/supabase-js':{createClient:()=>admin},'next/server':{NextResponse:{json:(value,init)=>Response.json(value,init)}}});
    const r=await route.POST(new Request('https://aipoger.com/api/battle-pool/attempt-matchmaking',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({queueId:uuid(80)})}));
    assert.equal(r.status,200);assert.equal((await r.json()).row.id,uuid(80));assert.equal(matched,false);
  }finally{
    for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',saved[0]],['SUPABASE_SERVICE_ROLE_KEY',saved[1]]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
