import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/choice-runtime.mjs";

const summary = () => ({
  reviewers: [{ name: "Listener", count: 2, user_id: "private-id" }], creators: [], listeners: [],
  reviews: [{ id: "comment", trackId: "work", name: "Listener", body: "Real review", title: "Track", coverPath: "cover.jpg", isMv: false, user_id: "private-id" }],
  choiceCommentCounts: { "creator:choice": 3 }, generatedAt: "2026-10-14", email: "private@example.test",
});
function route(data = summary(), error = null) {
  const calls = [];
  const admin = { rpc: async name => { calls.push(name); return { data, error }; },
    storage: { from: bucket => ({ getPublicUrl: path => ({ data: { publicUrl: `https://media.example.test/${bucket}/${path}` } }) }) } };
  return { calls, api: loadTs("src/app/api/showtime/community/route.ts", {
    "@/lib/server-mv-reviews": { mvReviewAdmin: () => admin },
    "@/lib/brand": { AIPOGER_BRAND_LOGO: "/brand.png" },
    "@/lib/listen-bar": { LISTEN_BAR_COVER_BUCKET: "covers" },
  }) };
}
test("public Showtime API returns only aggregates and visible excerpts, never voter IDs or private fields", async () => {
  const { api, calls } = route();
  const response = await api.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(body.reviewers, [{ name: "Listener", count: 2 }]);
  assert.equal(body.reviews[0].coverUrl, "https://media.example.test/covers/cover.jpg");
  assert.equal(JSON.stringify(body).includes("private"), false);
  assert.deepEqual(calls, ["showtime_community_summary"]);
});
test("missing summaries fail visibly without fabricated zero counts", async () => {
  for (const [data, error] of [[null, null], [null, new Error("secret database configuration")]]) {
    const { api } = route(data, error);
    const response = await api.GET();
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal("reviewers" in body, false);
    assert.equal(JSON.stringify(body).includes("secret"), false);
  }
});
