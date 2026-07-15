import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sharedPage = readFileSync(new URL("../src/app/choice/[id]/page.tsx", import.meta.url), "utf8");
const sharedRoute = readFileSync(new URL("../src/app/api/choice/[id]/route.ts", import.meta.url), "utf8");
const savedRoute = readFileSync(new URL("../src/app/api/choice/saved/route.ts", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const rankPage = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");

test("shared Choice links resolve official and creator collections to the playable public page", () => {
  assert.match(sharedRoute, /searchParams\.get\("kind"\) === "official"/);
  assert.match(sharedRoute, /aipoger_choice_collections/);
  assert.match(sharedRoute, /aipoger_creator_choice_collections/);
  assert.match(sharedPage, /ShowtimeQueuePlayer/);
  assert.match(sharedPage, /全部播放/);
  assert.match(sharedPage, /api\/choice\/\$\{encodeURIComponent\(choiceId\)\}\?kind=\$\{kind\}/);
});

test("shared Choice page supports collection Heart save and remove", () => {
  assert.match(sharedPage, /收藏 Choice/);
  assert.match(sharedPage, /action: heart\.myHeart \? "remove_heart" : "heart"/);
  assert.match(sharedPage, /collectionKind: kind/);
  assert.match(sharedPage, /rememberAuthNextPath/);
});

test("signed-in Profile exposes saved Choice playlists and removal", () => {
  assert.match(profilePage, /fetch\("\/api\/choice\/saved"/);
  assert.match(profilePage, /收藏的 Choice/);
  assert.match(profilePage, /choicePublicPath\(choice\.id, choice\.kind\)/);
  assert.match(profilePage, /removeSavedChoice/);
  assert.match(savedRoute, /\.eq\("user_id", userData\.user\.id\)/);
  assert.match(savedRoute, /collection_kind/);
});

test("official Choice shelf shares a unique public page instead of the rank anchor", () => {
  assert.match(rankPage, /choicePublicPath\(choiceCollection\.id, "official"\)/);
});
