import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, mocksFor, request, USER, uuid } from './helpers/choice-runtime.mjs';
const { loadPublicIdentity } = loadTs('src/lib/server-public-identity.ts');
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
function adminFor(seed={}) {
 const admin=mockAdmin({user_profiles:[{id:USER,fighter_name:'舞台名',display_name:'Private name'}],fighter_profiles:[{id:USER,display_name:'Previous name'}],...seed});
 admin.auth.getUser=async()=>({data:{user:{id:USER,email:'private@example.test',user_metadata:{full_name:'Private legal name',name:'Private legal name',avatar_url:'https://example.test/avatar.png'}}},error:null});
 admin.auth.admin={getUserById:async()=>({...await admin.auth.getUser(),error:null})};
 return admin;
}
test('public identity agrees with saved profile, including stage name changed after login', async()=>{
 const admin=adminFor();assert.equal((await loadPublicIdentity(admin,USER)).displayName,'舞台名');
 admin.tables.user_profiles[0].fighter_name=' 新名稱🍎 ';assert.equal((await loadPublicIdentity(admin,USER)).displayName,'新名稱🍎');
});
test('legacy stage profile works, but unrelated display_name and email are never fallbacks', async()=>{
 const admin=adminFor({user_profiles:[{id:USER,display_name:'Private account name'}]});
 assert.equal((await loadPublicIdentity(admin,USER)).displayName,'Previous name');
 admin.tables.fighter_profiles[0].display_name='Private legal name';assert.equal((await loadPublicIdentity(admin,USER)).displayName,'AIPOGER 聽眾');
 admin.tables.fighter_profiles[0].display_name='private';assert.equal((await loadPublicIdentity(admin,USER)).displayName,'AIPOGER 聽眾');
 admin.tables.fighter_profiles=[];assert.equal((await loadPublicIdentity(admin,USER)).displayName,'AIPOGER 聽眾');
});
test('identity lookup failure stops publication instead of falling back to private metadata',async()=>{
 const admin={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:{message:'offline'}})})})})};
 await assert.rejects(loadPublicIdentity(admin,USER),/Public identity unavailable/);
});
test('legacy music comment endpoint ignores supplied names and uses same identity in comment and notification',async()=>{
 const id=uuid(7),admin=adminFor({listen_bar_tracks:[{id,title:'Song',created_by:uuid(8)}]});
 const route=loadTs('src/app/api/listen-bar/track-comments/route.ts',mocksFor(admin));
 const res=await route.POST(request({trackId:id,displayName:'Forged or cached account name',text:'Comment'}));
 assert.equal(res.status,200);assert.equal((await res.json()).comment.name,'舞台名');
 assert.equal(admin.tables.battle_notifications[0].metadata.commenterName,'舞台名');
});
test('Choice and Bible comments use the public stage identity and retain existing avatar behavior',async()=>{
 for(const kind of ['choice','ai-music-bible']) {
  const id=uuid(9),admin=adminFor({aipoger_choice_collections:[{id,is_published:true}]});
  if(kind==='choice') admin.rpc=async(_name,args)=>({error:null,data:{comment:{id:uuid(90),user_id:USER,display_name:args.p_name,avatar_url:args.p_avatar,body:args.p_body,created_at:'2026-10-29'},awarded:0}});
  const from=admin.from;admin.from=table=>{const q=from(table);q.gte=()=>q;return q;};
  const route=loadTs(`src/app/api/${kind}/comments/route.ts`,{...mocksFor(admin),'@/lib/suno-inspiration-index':{isSunoInspirationEntry:()=>true}});
  const body=kind==='choice'?{collectionKind:'official',collectionId:id,body:'Comment'}:{entryKind:'prompt_recipe',entryKey:'recipe',body:'Comment'};
  const res=await route.POST(request(body));assert.ok(res.status===200||res.status===201, await res.clone().text());
  assert.equal((await res.json()).comment.displayName,'舞台名');
 }
});
test('Choice social preview fallback never reads a login name as the public curator',async()=>{
 const id=uuid(10),admin=adminFor({aipoger_creator_choice_collections:[{id,creator_id:USER,is_published:true,title:'Playlist'}]});
 admin.auth.admin={getUserById:async()=>({data:{user:{user_metadata:{full_name:'Private name',name:'Private name',avatar_url:'https://example.test/avatar.png'}}}})};
 const {loadChoiceShareMetadata}=loadTs('src/lib/server-choice-share-metadata.ts',{...mocksFor(admin),'server-only':{}});
 const preview=await loadChoiceShareMetadata(id);assert.equal(preview.curatorName,'舞台名');assert.equal(preview.imageUrl,'https://example.test/avatar.png');
 admin.tables.user_profiles=[];admin.tables.fighter_profiles=[];
 assert.equal((await loadChoiceShareMetadata(id)).curatorName,'AIPOGER 創作者');
});
