import test from "node:test";
import assert from "node:assert/strict";
import { loadTs, mockAdmin, mocksFor, request, uuid } from "./helpers/choice-runtime.mjs";

const model = loadTs("src/lib/server-choice-featured.ts");
const key = `creator:${uuid(9)}`;

test("feature setting accepts only typed Choice IDs or explicit clearing", async () => {
  const admin = mockAdmin();
  for (const invalid of [undefined, "", uuid(9), "bar:123", "creator:../private", "official:bad"]) {
    assert.equal(model.isFeaturedChoiceKey(invalid), false);
    await assert.rejects(model.writeFeaturedChoice(admin, invalid));
  }
  await model.writeFeaturedChoice(admin, key);
  await model.writeFeaturedChoice(admin, null);
  assert.deepEqual(admin.operations.map((op) => JSON.parse(op.args[1])), [{ key }, { key: null }]);
  assert.ok(admin.operations.every((op) => op.storage === "listen-bar-data" && op.args[0] === "choice/featured.json" && op.args[2].upsert));
});

test("missing setting is normal; storage failures do not masquerade as successful saves", async () => {
  const missing = { storage: { from: () => ({ download: async () => ({ error: { message: "Object not found" } }) }) } };
  assert.equal(await model.readFeaturedChoice(missing), null);
  const broken = { storage: { from: () => ({ download: async () => ({ error: new Error("unavailable") }), upload: async () => ({ error: new Error("unavailable") }) }) } };
  await assert.rejects(model.readFeaturedChoice(broken), /unavailable/);
  await assert.rejects(model.writeFeaturedChoice(broken, key), /unavailable/);
});

test("public feature lookup hides deleted, withdrawn and draft collections", async () => {
  const admin = mockAdmin({ aipoger_creator_choice_collections: [{ id: uuid(9), is_published: true }] });
  admin.favorites.key = key;
  assert.equal(await model.readPublicFeaturedChoice(admin), key);
  admin.tables.aipoger_creator_choice_collections[0].is_published = false;
  assert.equal(await model.readPublicFeaturedChoice(admin), null);
  admin.tables.aipoger_creator_choice_collections = [];
  assert.equal(await model.readPublicFeaturedChoice(admin), null);
});

function route(admin, owner = true, catalog = [{ id: uuid(2), sourceKind: "listen_bar_track", isPublic: true, audioUrl: "/song.mp3" }]) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.example";
  process.env.SUPABASE_SERVICE_KEY = "test-only";
  return loadTs("src/app/api/admin/choice/route.ts", {
    ...mocksFor(admin), "@/lib/admin-emails": { isAdminEmail: () => owner },
    "@/lib/server-choice-catalog": { loadChoiceSelectionCatalog: async () => ({ schemaReady: true, items: catalog }) },
  });
}
function seeded() {
  return mockAdmin({ aipoger_creator_choice_collections: [{ id: uuid(9), is_published: true }],
    aipoger_creator_choice_items: [{ collection_id: uuid(9), source_kind: "listen_bar_track", source_id: uuid(2) }] });
}

test("actual owner API rejects anonymous, invalid session and non-owner feature writes", async () => {
  for (const [token, owner, status] of [[null, true, 401], ["invalid", true, 401], ["valid", false, 403]]) {
    const admin = seeded();
    const result = await route(admin, owner).PATCH(request({ action: "set_featured", featuredKey: key }, token));
    assert.equal(result.status, status);
    assert.equal(admin.operations.length, 0);
  }
});

test("owner may select a published playable collection without changing songs or scores", async () => {
  const admin = seeded();
  const result = await route(admin).PATCH(request({ action: "set_featured", featuredKey: key }));
  assert.equal(result.status, 200);
  assert.deepEqual(admin.operations.filter((op) => op.action !== "read").map((op) => [op.storage, op.action]), [["listen-bar-data", "upload"]]);
  assert.equal(JSON.parse(admin.operations.at(-1).args[1]).key, key);
});

test("owner cannot feature a draft, deleted, hidden-only or audio-less collection", async () => {
  for (const mode of ["draft", "deleted", "hidden", "audio"]) {
    const admin = seeded();
    if (mode === "draft") admin.tables.aipoger_creator_choice_collections[0].is_published = false;
    if (mode === "deleted") admin.tables.aipoger_creator_choice_collections = [];
    const catalog = [{ id: uuid(2), sourceKind: "listen_bar_track", isPublic: mode !== "hidden", audioUrl: mode === "audio" ? null : "/song.mp3" }];
    const result = await route(admin, true, catalog).PATCH(request({ action: "set_featured", featuredKey: key }));
    assert.equal(result.status, 400, mode);
    assert.ok(admin.operations.every((op) => op.action === "read"));
  }
});

test("owner can clear a stale feature without restoring or deleting content", async () => {
  const admin = mockAdmin();
  const result = await route(admin).PATCH(request({ action: "set_featured", featuredKey: null }));
  assert.equal(result.status, 200);
  assert.equal(admin.operations.length, 1);
  assert.deepEqual(JSON.parse(admin.operations[0].args[1]), { key: null });
});

test("older featured collections remain visible beyond the ordinary public page limits", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.example";
  process.env.SUPABASE_SERVICE_KEY = "test-only";
  for (const kind of ["official", "creator"]) {
    const limit = kind === "official" ? 80 : 48;
    const prefix = kind === "official" ? "aipoger_choice" : "aipoger_creator_choice";
    const selectedId = uuid(100);
    const song = { id: uuid(2), sourceKind: "listen_bar_track", title: "Song", isPublic: true, audioUrl: "/song.mp3" };
    const collections = Array.from({ length: limit + 1 }, (_, i) => ({
      id: uuid(100 + i), is_published: true, created_by: uuid(1), creator_id: uuid(1),
      published_at: String(i).padStart(3, "0"), week_start: String(i).padStart(3, "0"),
      [`${prefix}_items`]: [{ id: uuid(200 + i), source_kind: song.sourceKind, source_id: song.id, position: 1 }],
    }));
    const admin = mockAdmin({ [`${prefix}_collections`]: collections,
      [`${prefix}_items`]: collections.map((collection, i) => ({ collection_id: collection.id, id: uuid(200 + i), source_kind: song.sourceKind, source_id: song.id, position: 1 })) });
    admin.favorites.key = `${kind}:${selectedId}`;
    const api = loadTs(kind === "official" ? "src/app/api/choice/current/route.ts" : "src/app/api/creator-choice/public/route.ts", {
      ...mocksFor(admin),
      "@/lib/server-choice-catalog": { loadChoiceSelectionCatalog: async () => ({ schemaReady: true, items: [song] }) },
      "@/lib/server-creator-choice-catalog": { loadCreatorChoicePlaybackCatalog: async () => ({ schemaReady: true, items: [song] }) },
    });
    const result = await api.GET();
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.ok(body.collections.some((collection) => collection.id === selectedId), kind);
    assert.equal(body.collections.length, limit + 1);
    assert.equal(body.featuredKey, `${kind}:${selectedId}`);
  }
});
