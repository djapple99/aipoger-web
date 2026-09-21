import assert from "node:assert/strict";
import test from "node:test";
import { favorite, loadTs, mockAdmin, mocksFor, request, track, USER, uuid } from "./helpers/choice-runtime.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.example.test";
process.env.SUPABASE_SERVICE_KEY = "mock-only-not-a-secret";
const collectionId = uuid(900);
function setup(count = 0, published = false) {
  const admin = mockAdmin({
    listen_bar_tracks: Array.from({ length: 12 }, (_, index) => track(index + 10)),
    aipoger_creator_choice_collections: [{ id: collectionId, creator_id: USER, week_start: "2026-09-14", title: "Original", intro: "Intro", is_published: published }],
    aipoger_creator_choice_items: Array.from({ length: count }, (_, index) => ({ id: uuid(100 + index), collection_id: collectionId, source_kind: "listen_bar_track", source_id: uuid(10 + index), position: index + 1 })),
  });
  const mocks = mocksFor(admin);
  const route = loadTs("src/app/api/creator-choice/route.ts", mocks);
  const patch = (action, fields = {}, token = "valid") => route.PATCH(request({ action, collectionId, ...fields }, token));
  return { admin, route, patch, mocks };
}

test("creator catalog selects only own public playable favorites, without age or certification", async () => {
  const admin = mockAdmin({ listen_bar_tracks: [track(10), track(11, { ai_music_showtime_certified: true }), track(12),
    ...["hidden", "removed", "completed", "rejected", "moderation_hold", "moderation hold", "pending", " HIDDEN "].map((status, index) => track(20 + index, { review_status: status })),
    track(30, { hidden_at: "now" }), track(31, { removed_at: "now" }), track(32, { ai_music_showtime_public_removed_at: "now" }), track(33, { audio_path: " " }), track(34, { is_active: false })] });
  [10, 11, ...Array.from({ length: 15 }, (_, i) => i + 20)].forEach((id) => favorite(admin, id));
  favorite(admin, 12, uuid(2));
  const catalog = loadTs("src/lib/server-creator-choice-catalog.ts", mocksFor(admin));
  const result = await catalog.loadCreatorChoiceSelectionCatalog(admin, USER);
  assert.deepEqual(result.items.filter((item) => item.selectable).map((item) => item.id), [uuid(10), uuid(11)]);
  assert.ok(result.items.find((item) => item.id === uuid(12))?.isPublic);
  assert.equal(admin.operations.some((entry) => entry.action !== "read"), false);
  assert.equal(admin.operations.some((entry) => entry.table === "ai_music_challenge_invites"), false);
});

test("catalog paginates past 500 tracks and official Choice can select unfavorited old uploads", async () => {
  const admin = mockAdmin({ listen_bar_tracks: Array.from({ length: 1001 }, (_, i) => track(i + 10)) });
  favorite(admin, 1010);
  const mocks = mocksFor(admin);
  const creator = loadTs("src/lib/server-creator-choice-catalog.ts", mocks);
  assert.deepEqual((await creator.loadCreatorChoiceSelectionCatalog(admin, USER)).items.filter((item) => item.selectable).map((item) => item.id), [uuid(1010)]);
  const official = loadTs("src/lib/server-choice-catalog.ts", mocks);
  const result = await official.loadChoiceSelectionCatalog(admin);
  assert.equal(result.items.length, 1001);
  assert.ok(result.items.every((item) => item.selectable && item.audioUrl));
});

test("legacy Battle favorite codes resolve to Battle IDs, never a bar song with the same ID", async () => {
  const admin = mockAdmin({ listen_bar_tracks: [track(10)],
    battle_result_archives: [{ battle_id: uuid(10), battle_code: "LEGACY-001", winner: "fighter_b", total_votes: 3 },
      { battle_id: uuid(11), battle_code: "HIDDEN", winner: "fighter_a", total_votes: 99, showtime_public_removed_at: "now" }],
    battles: [{ id: uuid(10), audio_a_path: "wrong.mp3", audio_b_path: "winner.mp3" }] });
  admin.favorites.records.push({ recordKey: "battle:LEGACY-001", targetKind: "battle", targetId: "LEGACY-001", favoriteUserIds: [USER] });
  const { loadCreatorChoiceSelectionCatalog } = loadTs("src/lib/server-creator-choice-catalog.ts", mocksFor(admin));
  const result = await loadCreatorChoiceSelectionCatalog(admin, USER);
  assert.equal(result.items.find((item) => item.sourceKind === "listen_bar_track").selectable, false);
  const battle = result.items.find((item) => item.sourceKind === "battle_archive");
  assert.equal(battle.id, uuid(10));
  assert.equal(battle.selectable, true);
  assert.match(battle.audioUrl, /winner\.mp3/);
  assert.equal(result.items.length, 2);
});

test("storage errors fail closed for selection, but playback does not read favorites", async () => {
  const admin = mockAdmin({ listen_bar_tracks: [track(10)] });
  admin.downloadError = { message: "service unavailable" };
  const catalog = loadTs("src/lib/server-creator-choice-catalog.ts", mocksFor(admin));
  await assert.rejects(catalog.loadCreatorChoiceSelectionCatalog(admin, USER));
  assert.equal((await catalog.loadCreatorChoicePlaybackCatalog(admin)).items.length, 1);
});

test("Battle playback preserves the consenting winner's full song and never leaks private or losing full audio", async () => {
  const admin = mockAdmin({
    battle_result_archives: [{ battle_id: uuid(10), winner: "fighter_b", total_votes: 3 }],
    battles: [{ id: uuid(10), winner: "fighter_b", queue_a_id: uuid(50), queue_b_id: uuid(51), audio_a_path: "loser-drop.mp3", audio_b_path: "winner-drop.mp3" }],
    battle_queue: [{ id: uuid(50), full_audio_public: true, full_audio_path: "loser-full.mp3" },
      { id: uuid(51), full_audio_public: true, full_audio_path: "winner-full.mp3" }],
  });
  const catalog = loadTs("src/lib/server-creator-choice-catalog.ts", mocksFor(admin));
  assert.match((await catalog.loadCreatorChoicePlaybackCatalog(admin)).items[0].audioUrl, /winner-full\.mp3/);
  admin.tables.battle_queue[1].full_audio_public = false;
  assert.match((await catalog.loadCreatorChoicePlaybackCatalog(admin)).items[0].audioUrl, /winner-drop\.mp3/);
  admin.tables.battle_result_archives[0].showtime_public_removed_at = "now";
  assert.equal((await catalog.loadCreatorChoicePlaybackCatalog(admin)).items.length, 0);
});

test("actual creator route requires auth and scopes every collection mutation to its owner", async () => {
  const { admin, route, patch } = setup();
  assert.equal((await route.GET(request(null, ""))).status, 401);
  assert.equal((await patch("add_item", {}, "expired")).status, 401);
  admin.tables.aipoger_creator_choice_collections[0].creator_id = uuid(2);
  assert.equal((await patch("delete_collection", { confirmed: true })).status, 404);
  assert.equal((await patch("save_collection", { weekStart: "2026-09-14", title: "attack" })).status, 404);
  assert.equal(admin.tables.aipoger_creator_choice_collections[0].title, "Original");
});

test("Monday draft creation is idempotent and cannot overwrite an existing weekly collection", async () => {
  const { admin, route } = setup();
  const ensure = (weekStart) => route.PATCH(request({ action: "ensure_collection", weekStart, title: "New" }));
  const existing = await ensure("2026-09-14");
  const existingBody = await existing.json();
  assert.equal(existingBody.collectionId, collectionId);
  assert.equal(existingBody.created, false);
  assert.equal(admin.tables.aipoger_creator_choice_collections[0].title, "Original");
  assert.equal((await ensure("2026-09-15")).status, 400);
  assert.equal((await ensure("2026-02-30")).status, 400);
  const [first, second] = await Promise.all([ensure("2026-09-21"), ensure("2026-09-21")]);
  const firstBody = await first.json(), secondBody = await second.json();
  assert.equal(firstBody.collectionId, secondBody.collectionId);
  assert.equal([firstBody.created, secondBody.created].filter(Boolean).length, 1);
  assert.equal(admin.tables.aipoger_creator_choice_collections.length, 2);
});

test("add checks current own favorites server-side and never writes hearts or source tracks", async () => {
  const { admin, patch, route } = setup();
  const source = { sourceKind: "listen_bar_track", sourceId: uuid(10) };
  assert.equal((await patch("add_item", source)).status, 400);
  favorite(admin, 10, uuid(2));
  assert.equal((await patch("add_item", source)).status, 400);
  favorite(admin, 10);
  assert.equal((await patch("add_item", source)).status, 200);
  assert.equal((await patch("add_item", source)).status, 409);
  const payload = await (await route.GET(request())).json();
  assert.equal(payload.catalog.length, 1);
  assert.equal(payload.collections[0].items[0].id, uuid(10));
  assert.equal(admin.operations.some((entry) => entry.action !== "read" && entry.table !== "aipoger_creator_choice_items"), false);
});

test("publishing retains unfavorited selections, rejects unavailable tracks and enforces 5-10", async () => {
  for (const count of [0, 4, 5, 10, 11]) {
    const { patch } = setup(count);
    assert.equal((await patch("set_published", { isPublished: true, weekStart: "2026-09-14", title: "Published", intro: "Saved together" })).status,
      count >= 5 && count <= 10 ? 200 : 400);
  }
  const { admin, patch, route, mocks } = setup(5);
  assert.equal((await patch("set_published", { isPublished: true, weekStart: "2026-09-14", title: "Published", intro: "Saved together" })).status, 200);
  assert.equal(admin.tables.aipoger_creator_choice_collections[0].title, "Published");
  assert.equal((await (await route.GET(request())).json()).collections[0].items.length, 5);
  const publicRoute = loadTs("src/app/api/creator-choice/[id]/route.ts", mocks);
  assert.equal((await (await publicRoute.GET(request(), { params: Promise.resolve({ id: collectionId }) })).json()).collection.items.length, 5);
  admin.tables.listen_bar_tracks[0].hidden_at = "now";
  assert.equal((await patch("set_published", { isPublished: true })).status, 400);
  const privatePayload = await (await route.GET(request())).json();
  assert.equal(privatePayload.collections[0].items.length, 5);
  assert.equal(privatePayload.collections[0].items[0].audioUrl, null);
  assert.equal(privatePayload.collections[0].items[0].itemId, uuid(100));
  assert.equal((await (await publicRoute.GET(request(), { params: Promise.resolve({ id: collectionId }) })).json()).collection.items.length, 4);
});

test("ordered selections persist and published playlists cannot fall below five by removal", async () => {
  const { admin, patch } = setup(5, true);
  assert.equal((await patch("remove_item", { itemId: uuid(100) })).status, 400);
  assert.equal((await patch("move_item", { itemId: uuid(100), direction: "down" })).status, 200);
  assert.equal(admin.tables.aipoger_creator_choice_items.find((item) => item.id === uuid(100)).position, 2);
  assert.equal((await patch("move_item", { itemId: uuid(100), position: 5 })).status, 200);
  assert.equal((await patch("move_item", { itemId: uuid(999), direction: "up" })).status, 404);
  assert.equal((await patch("set_published", { isPublished: false })).status, 200);
  assert.equal((await patch("remove_item", { itemId: uuid(101) })).status, 200);
  assert.deepEqual(admin.tables.aipoger_creator_choice_items.map((item) => item.position).sort(), [1, 2, 3, 4]);
});

test("batch editor validates owner, favorites, duplicates and publication before one atomic RPC", async () => {
  const { admin, patch } = setup(0);
  const calls=[];admin.rpc=async(name,args)=>{calls.push({name,args});return {data:collectionId,error:null};};
  const refs=Array.from({length:10},(_,i)=>({sourceKind:'listen_bar_track',sourceId:uuid(10+i)}));
  const fields={weekStart:'2026-09-14',title:'中文 title',intro:'Introduction',items:refs,expected:{}};
  assert.equal((await patch('save_editor',fields)).status,400);assert.equal(calls.length,0);
  for(let i=10;i<20;i++)favorite(admin,i);
  assert.equal((await patch('save_editor',{...fields,items:[refs[0],refs[0]]})).status,400);
  assert.equal((await patch('save_editor',{...fields,isPublished:true,items:refs.slice(0,4)})).status,400);
  assert.equal((await patch('save_editor',fields,'expired')).status,401);
  assert.equal((await patch('save_editor',fields)).status,200);
  assert.equal(calls.length,1);assert.equal(calls[0].name,'save_creator_choice_editor');
  assert.deepEqual(calls[0].args.p_items,refs);assert.equal(calls[0].args.p_title,'中文 title');
  admin.tables.aipoger_creator_choice_collections[0].creator_id=uuid(2);
  assert.equal((await patch('save_editor',fields)).status,404);assert.equal(calls.length,1);
});
