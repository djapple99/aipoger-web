import test from "node:test";
import assert from "node:assert/strict";
import { favorite, loadTs, mockAdmin, mocksFor, request, track, USER, uuid } from "./helpers/choice-runtime.mjs";

function api(admin, owner = true) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.example";
  process.env.SUPABASE_SERVICE_KEY = "test-only";
  return loadTs("src/app/api/admin/choice/route.ts", { ...mocksFor(admin),
    "@/lib/admin-emails": { isAdminEmail: () => owner },
    "@/lib/server-choice-catalog": { loadChoiceSelectionCatalog: async () => ({ schemaReady: true, items: [] }) },
  });
}

test("management returns all published issues beyond 500, no drafts or selection catalog", async () => {
  const published = Array.from({length: 502}, (_,i) => ({ id: uuid(i+10), is_published: true, week_start: "2026-09-14", curator_name: "Creator" }));
  const admin = mockAdmin({ aipoger_creator_choice_collections: [...published, {id:uuid(999),is_published:false,week_start:"2030-01-01"}],
    aipoger_choice_collections: [{id:uuid(3),is_published:true,week_start:"2026-09-07"}, {id:uuid(4),is_published:false,week_start:"2030-01-01"}] });
  const response = await api(admin).GET(request(null)), body = await response.json();
  assert.equal(response.status,200); assert.equal(body.library.length,503);
  assert.ok(body.library.every(row=>row.isPublished));
  assert.equal(body.catalog,undefined); assert.equal(body.collections,undefined);
  assert.ok(admin.operations.every(op=>op.action==="read"));
  assert.equal(admin.operations.filter(op=>op.table==="aipoger_creator_choice_collections").length,2);
});

test("retired authoring and cover APIs reject even owner without a write", async () => {
  const admin=mockAdmin(), route=api(admin);
  for(const action of ["save_collection","add_item","remove_item","move_item","set_published","clear_cover"]) {
    assert.equal((await route.PATCH(request({action,collectionId:uuid(9)}))).status,410);
  }
  assert.equal((await route.POST(request(null))).status,410);
  assert.equal(admin.operations.length,0);
});

test("all management operations guard login and owner status", async () => {
  for(const [token,owner,status] of [[null,true,401],["invalid",true,401],["valid",false,403]]) {
    const admin=mockAdmin(), route=api(admin,owner);
    for(const method of ["GET","POST","PATCH"]) assert.equal((await route[method](request({action:"delete_collection",collectionId:uuid(2),confirmed:true},token))).status,status);
    assert.equal(admin.operations.length,0);
  }
});

test("confirmed deletion only removes a published collection and its interactions, never songs or private drafts", async () => {
  for(const kind of ["official","creator"]) {
    const table=kind==="official"?"aipoger_choice_collections":"aipoger_creator_choice_collections";
    const action=kind==="official"?"delete_collection":"delete_creator_collection";
    const admin=mockAdmin({[table]:[{id:uuid(2),is_published:true},{id:uuid(3),is_published:false}],
      listen_bar_tracks:[track(10)],aipoger_choice_collection_hearts:[{collection_id:uuid(2),collection_kind:kind},{collection_id:uuid(3),collection_kind:kind}]});
    const route=api(admin);
    assert.equal((await route.PATCH(request({action,collectionId:uuid(2)}))).status,400);
    assert.equal((await route.PATCH(request({action,collectionId:uuid(3),confirmed:true}))).status,404);
    assert.equal((await route.PATCH(request({action,collectionId:uuid(2),confirmed:true}))).status,200);
    assert.deepEqual(admin.tables[table].map(row=>row.id),[uuid(3)]);
    assert.equal(admin.tables.listen_bar_tracks.length,1);
    assert.equal(admin.tables.aipoger_choice_collection_hearts.length,1);
    assert.ok(admin.operations.filter(op=>op.action!=="read").every(op=>[table,"aipoger_choice_collection_hearts","aipoger_choice_collection_comments"].includes(op.table)));
  }
});

test("personal selection sorts by own save time, with stable legacy fallback and no timestamp leak", async () => {
  const admin=mockAdmin({listen_bar_tracks:[10,11,12,13,14].map(n=>track(n))});
  for(const n of [10,11,12,13]) favorite(admin,n);
  admin.favorites.records[0].updatedAt="2099-01-01";
  admin.favorites.records[1].favoriteSavedAt={[USER]:"2026-09-17T01:00:00Z",[uuid(2)]:"2099-01-01"};
  admin.favorites.records[2].favoriteSavedAt={[USER]:"2026-09-18T01:00:00Z"};
  admin.favorites.records[3].favoriteSavedAt={[USER]:"invalid"};
  favorite(admin,14,uuid(2));
  const catalog=loadTs("src/lib/server-creator-choice-catalog.ts",mocksFor(admin));
  const result=await catalog.loadCreatorChoiceSelectionCatalog(admin,USER);
  assert.deepEqual(result.items.filter(i=>i.selectable).map(i=>i.id),[12,11,10,13].map(uuid));
  assert.ok(!JSON.stringify(result).includes("favoriteSavedAt"));
  assert.deepEqual((await catalog.loadCreatorChoicePlaybackCatalog(admin)).items.map(i=>i.id),[10,11,12,13,14].map(uuid));
  assert.ok(admin.operations.every(op=>op.action==="read"));
});

test("favorite timestamps change only on real save/remove transitions", () => {
  const {setFavoriteMembership,favoriteSavedTime}=loadTs("src/lib/favorite-recency.ts");
  const row={favoriteUserIds:[uuid(2)],favoriteSavedAt:{[uuid(2)]:"2026-09-01T00:00:00Z"}};
  setFavoriteMembership(row,USER,true,"2026-09-17T00:00:00Z");
  setFavoriteMembership(row,USER,true,"2026-09-18T00:00:00Z");
  assert.equal(row.favoriteSavedAt[USER],"2026-09-17T00:00:00Z");
  setFavoriteMembership(row,USER,false,"2026-09-18T00:00:00Z");
  assert.equal(favoriteSavedTime(row,USER),0);
  assert.equal(row.favoriteSavedAt[uuid(2)],"2026-09-01T00:00:00Z");
  setFavoriteMembership(row,USER,true,"2026-09-18T00:00:00Z");
  assert.equal(row.favoriteSavedAt[USER],"2026-09-18T00:00:00Z");
  const legacy={favoriteUserIds:[USER]};
  setFavoriteMembership(legacy,USER,true,"2026-09-18T00:00:00Z");
  assert.equal(favoriteSavedTime(legacy,USER),0);
});

test("real favorite endpoint persists timestamps but never publishes the private user map", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://test.example";
  process.env.SUPABASE_SERVICE_KEY="test-only";
  const admin=mockAdmin();
  admin.storage.getBucket=async()=>({data:{id:"listen-bar-data"}});
  const storageFrom=admin.storage.from;
  admin.storage.from=bucket=>({...storageFrom(bucket),upload:async(path,blob)=>{
    admin.favorites.records=JSON.parse(await blob.text()).records; return {error:null};
  }, download:async()=>({data:new Blob([JSON.stringify(admin.favorites)]),error:null})});
  const route=loadTs("src/app/api/honor-board/interactions/route.ts",mocksFor(admin));
  const body={action:"favorite",recordKey:`bar:${uuid(10)}`,targetKind:"bar",targetId:uuid(10)};
  const first=await route.POST(request(body));
  assert.equal(first.status,200);
  assert.ok(admin.favorites.records[0].favoriteSavedAt[USER]);
  assert.ok(!JSON.stringify(await first.json()).includes("favoriteSavedAt"));
  const savedAt=admin.favorites.records[0].favoriteSavedAt[USER];
  assert.equal((await route.POST(request({...body,action:"comment",text:"Nice"}))).status,200);
  assert.equal(admin.favorites.records[0].favoriteSavedAt[USER],savedAt);
  assert.equal((await route.POST(request({...body,action:"removeFavorite"}))).status,200);
  assert.equal(admin.favorites.records[0].favoriteSavedAt[USER],undefined);
});

test("Bar Heart path records first save, preserves it on another day and clears it on cancellation", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://test.example";
  process.env.SUPABASE_SERVICE_KEY="test-only";
  const admin=mockAdmin({listen_bar_tracks:[track(10)]});
  admin.storage.getBucket=async()=>({data:{id:"listen-bar-data"}});
  const storageFrom=admin.storage.from;
  admin.storage.from=bucket=>({...storageFrom(bucket),
    upload:async(path,blob)=>{admin.favorites.records=JSON.parse(await blob.text()).records;return {error:null}},
    download:async()=>({data:new Blob([JSON.stringify(admin.favorites)]),error:null})});
  const from=admin.from;
  admin.from=table=>{
    const query=from(table);
    if(table==="listen_bar_track_reactions")query.upsert=async row=>{admin.tables[table]=[row];return {error:null}};
    return query;
  };
  const route=loadTs("src/app/api/listen-bar/reaction/route.ts",mocksFor(admin));
  const body={trackId:uuid(10),reaction:"heart"};
  let response=await route.POST(request(body));
  assert.equal(response.status,200);assert.equal((await response.json()).favoriteSynced,true);
  assert.ok(admin.favorites.records[0].favoriteSavedAt[USER]);
  admin.favorites.records[0].favoriteSavedAt[USER]="2026-09-01T00:00:00Z";
  admin.tables.listen_bar_track_reactions=[];
  response=await route.POST(request(body));
  assert.equal((await response.json()).favoriteSynced,true);
  assert.equal(admin.favorites.records[0].favoriteSavedAt[USER],"2026-09-01T00:00:00Z");
  response=await route.POST(request(body));
  assert.equal((await response.json()).heartCancelled,true);
  assert.equal(admin.favorites.records[0].favoriteSavedAt[USER],undefined);
});
