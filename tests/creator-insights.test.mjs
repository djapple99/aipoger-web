import assert from "node:assert/strict";
import test from "node:test";
import { loadTs, uuid, USER, request } from "./helpers/choice-runtime.mjs";
const { summarizeCreatorTrack } = loadTs("src/lib/creator-insights.ts");
const { createListeningMeasurement, listeningTrackId } = loadTs("src/lib/music-listening-measurement.ts");
const owner = USER, listener = uuid(2), song = uuid(10);
const track = { id: song, title: "Song", artist: "Creator", created_by: owner };
const from = "2026-09-01T00:00:00Z", to = "2026-09-29T00:00:00Z";
test("Choice and Explore resolve the same song without mixing archived Battle IDs", () => {
  assert.equal(listeningTrackId({ id: `listen_bar_track:${song}` }), song);
  assert.equal(listeningTrackId({ id: `bar:${song}`, heartTrackId: song }), song);
  assert.equal(listeningTrackId({ id: `battle_archive:${song}` }), null);
});
function event(id, seconds = 90, extra = {}, user = listener) {
  return { id: uuid(30), song_id: song, user_id: user, created_at: "2026-09-02T00:02:00Z", metadata: {
    listeningVersion: 1, playbackId: id, startedAt: "2026-09-02T00:00:00Z", durationSeconds: 100,
    listenedSeconds: seconds, coveredSeconds: seconds, intentional: true, ...extra } };
}
test("measurement ignores seeking, merges repeated ranges, and survives pause", () => {
  const m = createListeningMeasurement("p", true, from);
  for (let i = 0; i <= 40; i++) m.sample(i, i * 1000);
  m.reset(); m.sample(90, 41000); m.sample(91, 42000);
  m.reset(); for (let i = 0; i <= 40; i++) m.sample(i, (i + 43) * 1000);
  const result = m.snapshot(100);
  assert.equal(result.coveredSeconds, 41); assert.equal(result.listenedSeconds, 81);
  assert.equal(result.playbackId, "p");
  m.reset(); m.sample(0, 100000); m.sample(99, 100100);
  assert.equal(m.snapshot(100).coveredSeconds, 41);
});
test("snapshots and pause/resume do not duplicate plays; owner, guests and legacy are excluded", () => {
  const result = summarizeCreatorTrack(track, [event("p", 30), event("p"), event("self", 90, {}, owner), event("guest", 90, {}, null), event("old", 90, { listeningVersion: null })], [], [], from, to);
  assert.equal(result.listeners, 1); assert.equal(result.measuredPlays, 1);
  assert.deepEqual(result.completion, { numerator: 1, denominator: 1, percent: 100 });
  assert.equal(result.replay.percent, 0);
});
test("autoplay is not replay and jumping to the end is not completion", () => {
  const second = { ...event("b", 30, { coveredSeconds: 2, intentional: false, startedAt: "2026-09-02T01:00:00Z" }), created_at: "2026-09-02T01:02:00Z" };
  let result = summarizeCreatorTrack(track, [event("a", 30), second], [], [], from, to);
  assert.equal(result.replay.numerator, 0); assert.equal(result.completion.numerator, 0);
  second.metadata.intentional = true;
  result = summarizeCreatorTrack(track, [event("a", 30), second], [], [], from, to);
  assert.equal(result.replay.numerator, 1); assert.equal(result.replay.denominator, 1);
});
test("conversion uses the same listener cohort, requires subsequent support and never invents legacy save dates", () => {
  const hearts = [ { track_id: song, user_id: listener, created_at: "2026-09-02T00:03:00Z" }, { track_id: song, user_id: uuid(3), created_at: "2026-09-02T00:03:00Z" }, { track_id: song, user_id: owner, created_at: from } ];
  const saves = [{ targetKind: "bar", targetId: song, favoriteUserIds: [listener, owner], favoriteSavedAt: {} }];
  let result = summarizeCreatorTrack(track, [event("p")], hearts, saves, from, to);
  assert.equal(result.supporters, 2); assert.equal(result.favorites, 1);
  assert.equal(result.heartConversion.numerator, 1); assert.equal(result.heartConversion.denominator, 1);
  assert.equal(result.favoriteConversion.numerator, 0);
  hearts[0].created_at = from;
  saves[0].favoriteSavedAt[listener] = "2026-09-02T00:03:00Z";
  result = summarizeCreatorTrack(track, [event("p")], hearts, saves, from, to);
  assert.equal(result.heartConversion.numerator, 0); assert.equal(result.favoriteConversion.numerator, 1);
});
test("missing measurements remain unknown rather than zero-percent failures", () => {
  const result = summarizeCreatorTrack(track, [], [], [], from, to);
  assert.equal(result.completion.percent, null); assert.equal(result.replay.percent, null);
  assert.equal(result.heartConversion.percent, null); assert.equal(result.favoriteConversion.percent, null);
});

function setup() {
  const now = Date.now(), time = new Date(now - 60_000).toISOString();
  const tables = { listen_bar_tracks: [{ ...track, is_active: true }, { ...track, id: uuid(11), created_by: listener, is_active: true }],
    analytics_events: [], listen_bar_track_reactions: [], battles: [
      { id: uuid(20), status: "q_crash_finished", fighter_a_user_id: owner, fighter_b_user_id: listener, song_a_name: "Mine", song_b_name: "Other" },
      { id: uuid(21), status: "q_crash_voting", fighter_a_user_id: owner, fighter_b_user_id: listener },
      { id: uuid(22), status: "finished", fighter_a_user_id: listener, fighter_b_user_id: uuid(3) }],
    battle_result_archives: [20,21,22].map(id => ({ battle_id: uuid(id), final_vote_left: 2, final_vote_right: 1, result_payload: { source: "q_crash", audienceCount: 3 }, archived_at: time })) };
  const operations = [], favorites = { records: [{ targetKind: "bar", targetId: song, favoriteUserIds: [listener], favoriteSavedAt: { [listener]: time } }] };
  let fail = "", storageFail = false;
  const admin = {
    auth: { getUser: async token => ({ data: { user: token === "valid" ? { id: owner } : null }, error: null }) },
    storage: { from: () => ({ download: async () => ({ data: new Blob([JSON.stringify(favorites)]), error: storageFail ? { message: "storage down" } : null }) }) },
    from(table) {
      const filters = [], sorts = [];
      const q = {
        select: () => q, order: key => { sorts.push(key); return q; },
        eq: (key, value) => { filters.push(row => row[key] === value); return q; },
        in: (key, values) => { filters.push(row => values.includes(row[key])); return q; },
        gte: (key, value) => { filters.push(row => row[key] >= value); return q; },
        lt: (key, value) => { filters.push(row => row[key] < value); return q; },
        range: async (a, b) => {
          operations.push({ table, a, b });
          return { data: tables[table].filter(row => filters.every(filter => filter(row))).sort((a,b) => { for (const key of sorts) { if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1; } return 0; }).slice(a,b+1), error: table === fail ? { message: "private internal error" } : null };
        },
      }; return q;
    },
  };
  const route = loadTs("src/app/api/creator-insights/route.ts", {
    "@supabase/supabase-js": { createClient: () => admin },
    "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
  });
  return { route, tables, operations, fail: table => { fail = table; }, failStorage: () => { storageFail = true; } };
}
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.example.test";
process.env.SUPABASE_SERVICE_KEY = "mock-test";
test("actual API rejects anonymous/expired credentials and never reads their data", async () => {
  const { route, operations } = setup();
  assert.equal((await route.GET(request(null, ""))).status, 401);
  assert.equal((await route.GET(request(null, "expired"))).status, 401);
  assert.equal(operations.length, 0);
});
test("actual API scopes to verified author, hides open votes, excludes unrelated battles and leaks no audience identifiers", async () => {
  const { route } = setup();
  const response = await route.GET(new Request(`https://test.example.test/api/creator-insights?userId=${listener}`, { headers: { Authorization: "Bearer valid" } }));
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private, no-store/);
  const result = await response.json();
  assert.deepEqual(result.tracks.map(track => track.id), [song]);
  assert.deepEqual(result.battles.map(battle => battle.id), [uuid(20)]);
  assert.equal(result.battles[0].votes.percent, 66.7);
  assert.equal(JSON.stringify(result).includes(listener), false);
  assert.equal(JSON.stringify(result).includes(owner), false);
});
test("all source pages are read; failures are errors rather than partial or zero stats", async () => {
  const { route, tables, operations, fail } = setup();
  tables.listen_bar_track_reactions = Array.from({ length: 1001 }, (_, i) => ({ track_id: song, user_id: uuid(100+i), reaction: "heart", vote_date: "2026-09-20", created_at: "2026-09-20T00:00:00Z" }));
  const response = await route.GET(request(null));
  assert.equal((await response.json()).tracks[0].supporters, 1001);
  assert.ok(operations.some(op => op.table === "listen_bar_track_reactions" && op.a === 1000));
  fail("analytics_events");
  const failed = await route.GET(request(null));
  assert.equal(failed.status, 503); assert.equal((await failed.text()).includes("private internal"), false);
  const another = setup(); another.failStorage();
  assert.equal((await another.route.GET(request(null))).status, 503);
});
