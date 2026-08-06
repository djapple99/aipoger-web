import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sharedPage = readFileSync(new URL("../src/app/choice/[id]/page.tsx", import.meta.url), "utf8");
const sharedRoute = readFileSync(new URL("../src/app/api/choice/[id]/route.ts", import.meta.url), "utf8");
const savedRoute = readFileSync(new URL("../src/app/api/choice/saved/route.ts", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const rankPage = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const choiceShelf = readFileSync(new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url), "utf8");
const commentsDialog = readFileSync(new URL("../src/components/choice-comments-dialog.tsx", import.meta.url), "utf8");
const commentsRoute = readFileSync(new URL("../src/app/api/choice/comments/route.ts", import.meta.url), "utf8");
const commentsMigration = readFileSync(new URL("../supabase/migrations/20260716094500_choice_collection_comments.sql", import.meta.url), "utf8");
const creatorChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const adminChoiceRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const profileChoicePage = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
const choiceModel = readFileSync(new URL("../src/lib/aipoger-choice.ts", import.meta.url), "utf8");
const choiceCopy = readFileSync(new URL("../src/lib/choice-copy.ts", import.meta.url), "utf8");
const choiceLayout = readFileSync(new URL("../src/app/choice/[id]/layout.tsx", import.meta.url), "utf8");
const choiceShareMetadata = readFileSync(new URL("../src/lib/server-choice-share-metadata.ts", import.meta.url), "utf8");

test("shared Choice links resolve official and creator collections to the playable public page", () => {
  assert.match(sharedPage, /pb-28 pt-24/);
  assert.doesNotMatch(sharedPage, /sm:pt-8/);
  assert.match(sharedRoute, /searchParams\.get\("kind"\) === "official"/);
  assert.match(sharedRoute, /aipoger_choice_collections/);
  assert.match(sharedRoute, /aipoger_creator_choice_collections/);
  assert.match(sharedPage, /ShowtimeQueuePlayer/);
  assert.match(sharedPage, /copy\.playAll/);
  assert.match(sharedPage, /api\/choice\/\$\{encodeURIComponent\(choiceId\)\}\?kind=\$\{kind\}/);
  assert.match(sharedPage, /copy\.backToShowtime/);
  assert.match(sharedPage, /choiceDisplayTitle/);
});

test("shared Choice page supports collection Heart save and remove", () => {
  assert.match(sharedPage, /copy\.favoriteChoice/);
  assert.match(sharedPage, /copy\.removeChoice/);
  assert.match(sharedPage, /aria-pressed=\{heart\.myHeart\}/);
  assert.match(sharedPage, /action: heart\.myHeart \? "remove_heart" : "heart"/);
  assert.match(sharedPage, /collectionKind: kind/);
  assert.match(sharedPage, /rememberAuthNextPath/);
});

test("Choice uses the authored issue title and exposes song-level saves in the interactive HUD", () => {
  assert.match(choiceModel, /return authoredTitle \|\| `\$\{curator\} Choice`/);
  assert.doesNotMatch(choiceModel, /return `\$\{base\}｜\$\{authoredTitle\}`/);
  assert.match(sharedPage, /choiceItemRecordKey/);
  assert.match(sharedPage, /api\/honor-board\/interactions/);
  assert.match(sharedPage, /toggleItemHeart/);
  assert.match(sharedPage, /copy\.removeTrack\(item\.title\)/);
  assert.match(sharedPage, /copy\.playTrack\(item\.title\)/);
});

test("Choice UI copy follows the four-region language policy", () => {
  for (const language of ["zh:", "en:", "ja:", "ko:"]) {
    assert.ok(choiceCopy.includes(language), `missing ${language} Choice copy`);
  }
  assert.match(sharedPage, /getChoiceCopy\(lang\)/);
  assert.match(sharedPage, /isZh=\{lang === "zh"\}/);
  assert.match(choiceLayout, /isSupportedLang/);
  assert.match(choiceLayout, /locale = lang === "zh"/);
});

test("Choice share metadata uses the curator profile avatar instead of the global brand card", () => {
  assert.match(choiceLayout, /generateMetadata/);
  assert.match(choiceLayout, /loadChoiceShareMetadata/);
  assert.match(choiceLayout, /images: \[\{ url: imageUrl/);
  assert.match(choiceLayout, /choiceDisplayTitle\(choice\.curatorName, choice\.title\)/);
  assert.match(choiceShareMetadata, /aipoger_creator_choice_collections/);
  assert.match(choiceShareMetadata, /aipoger_choice_collections/);
  assert.match(choiceShareMetadata, /from\("fighter_profiles"\)/);
  assert.doesNotMatch(choiceShareMetadata, /from\("user_profiles"\)/);
  assert.match(choiceShareMetadata, /auth\.admin\.getUserById/);
  assert.match(choiceShareMetadata, /publicCoverUrl\(admin, row\.cover_path\) \|\| profile\.avatarUrl/);
  assert.match(choiceShareMetadata, /personal \? profile\.avatarUrl : ""/);
});

test("signed-in Profile exposes saved Choice playlists and removal", () => {
  assert.match(profilePage, /fetch\("\/api\/choice\/saved"/);
  assert.match(profilePage, /收藏的 Choice/);
  assert.match(profilePage, /choicePublicPath\(choice\.id, choice\.kind\)/);
  assert.match(profilePage, /removeSavedChoice/);
  assert.match(savedRoute, /\.eq\("user_id", userData\.user\.id\)/);
  assert.match(savedRoute, /collection_kind/);
  assert.match(savedRoute, /aipoger_choice_items/);
  assert.match(savedRoute, /aipoger_creator_choice_items/);
  assert.match(savedRoute, /collection_id/);
  assert.match(savedRoute, /schemaReady: catalog\.schemaReady/);
  assert.match(savedRoute, /from\("user_profiles"\)\.select\("id,display_name"\)/);
  assert.doesNotMatch(savedRoute, /from\("user_profiles"\)\.select\("id,avatar_url"\)/);
});

test("official Choice shelf shares a unique public page instead of the rank anchor", () => {
  assert.match(rankPage, /choicePublicPath\(choiceCollection\.id, "official"\)/);
});

test("Choice comments are collection-level, authenticated for writes, and owner-removable", () => {
  assert.match(choiceShelf, /ChoiceCommentsDialog/);
  assert.match(sharedPage, /ChoiceCommentsDialog/);
  assert.match(commentsDialog, /登入後留下評論/);
  assert.match(commentsDialog, /targetType="comment"/);
  assert.match(commentsRoute, /aipoger_choice_collection_comments/);
  assert.match(commentsRoute, /requiredUser/);
  assert.match(commentsRoute, /\.eq\("user_id", user\.id\)/);
  assert.match(commentsMigration, /create table if not exists public\.aipoger_choice_collection_comments/i);
  assert.match(commentsMigration, /enable row level security/i);
  assert.match(commentsMigration, /revoke all on table public\.aipoger_choice_collection_comments from anon, authenticated/i);
});

test("publishing Choice persists the visible title and recommendation copy in the same action", () => {
  assert.match(creatorChoiceRoute, /hasDraftFields/);
  assert.match(creatorChoiceRoute, /title: cleanText\(body\?\.title, 120\)/);
  assert.match(adminChoiceRoute, /curator_identity: curatorIdentity\(body\?\.curatorIdentity\)/);
  assert.match(profileChoicePage, /isPublished: !selected\.isPublished, weekStart, title, intro/);
});
