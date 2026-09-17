import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260713090833_creator_choice_collections.sql", import.meta.url), "utf8");
const creatorChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const creatorChoiceHelper = readFileSync(new URL("../src/lib/creator-choice.ts", import.meta.url), "utf8");
const adminChoiceRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const publicChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/[id]/route.ts", import.meta.url), "utf8");
const profileChoicePage = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
const adminChoicePage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const selectedWorks = readFileSync(new URL("../src/components/choice-selected-works.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const showtimeRoute = readFileSync(new URL("../src/app/api/showtime/my-tracks/route.ts", import.meta.url), "utf8");
const showtimeHelper = readFileSync(new URL("../src/lib/ai-music-showtime.ts", import.meta.url), "utf8");

test("creator Choice has a separate creator-owned schema and does not replace the official weekly Choice", () => {
  assert.match(migration, /create table if not exists public\.aipoger_creator_choice_collections/i);
  assert.match(migration, /creator_id uuid not null references auth\.users/i);
  assert.match(migration, /unique \(creator_id, week_start\)/i);
  assert.match(migration, /create table if not exists public\.aipoger_creator_choice_items/i);
  assert.match(migration, /revoke all on table public\.aipoger_creator_choice_collections from anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.aipoger_creator_choice_items from anon, authenticated/i);
});

test("any signed-in creator can manage a Choice from their public playable favorites", () => {
  assert.doesNotMatch(creatorChoiceRoute, /\.eq\("ai_music_showtime_certified", true\)/);
  assert.match(creatorChoiceRoute, /eligible: true/);
  assert.match(creatorChoiceHelper, /登入後即可建立自己的 Choice/);
  assert.doesNotMatch(creatorChoiceRoute, /需要至少一首已認證 Showtime 的作品/);
  assert.match(creatorChoiceRoute, /loadCreatorChoiceSelectionCatalog\(guard.admin, guard.user.id\)/);
  assert.match(creatorChoiceRoute, /自己已收藏且目前公開可播放的歌曲/);
  assert.match(creatorChoiceRoute, /item\.isPublic && item\.selectable/);
  assert.doesNotMatch(creatorChoiceRoute, /\.eq\("created_by", guard\.user\.id\).*sourceKind/s);
});

test("creator Choice can be shared only after publication and keeps 5-10 curated works", () => {
  assert.match(creatorChoiceRoute, /AIPOGER_CHOICE_MIN_ITEMS/);
  assert.match(creatorChoiceRoute, /AIPOGER_CHOICE_MAX_ITEMS/);
  assert.match(creatorChoiceRoute, /published_at: publish \? now : null/);
  assert.match(publicChoiceRoute, /\.eq\("is_published", true\)/);
  assert.match(publicChoiceRoute, /source\?\.isPublic/);
  assert.match(profileChoicePage, /creatorChoicePublicPath/);
  assert.match(profileChoicePage, /!selected.isPublished && !canPublish/);
  assert.match(profileChoicePage, /selected.isPublished \? <>/);
});

test("owner can remove a creator Choice without touching its songs", () => {
  assert.match(adminChoiceRoute, /delete_creator_collection/);
  assert.match(adminChoiceRoute, /removeChoiceEngagement\(guard\.admin, collectionId, "creator"\)/);
  assert.match(adminChoicePage, /刪除創作者 Choice/);
});

test("creator sorting exposes mobile up/down controls and owner direct position input remains", () => {
  assert.match(profileChoicePage, /pb-28 pt-24[^\"]*sm:pt-8/);
  assert.match(profileChoicePage, /<ArrowUp/);
  assert.match(profileChoicePage, /<ArrowDown/);
  assert.match(profileChoicePage, /disabled=\{busy \|\| index === 0\}/);
  assert.match(profileChoicePage, /disabled=\{busy \|\| index === count - 1\}/);
  assert.match(adminChoicePage, /<ChoiceSelectedWorks/);
  assert.match(selectedWorks, /type="number"/);
  assert.match(selectedWorks, /md:grid-cols-2/);
  assert.match(selectedWorks, /grid-cols-\[2\.5rem_2\.5rem_minmax\(0,1fr\)_auto\]/);
  assert.match(selectedWorks, /<Play/);
  assert.match(selectedWorks, /<Trash2/);
  assert.match(creatorChoiceRoute, /requestedPosition/);
  assert.match(adminChoiceRoute, /requestedPosition/);
  assert.match(creatorChoiceRoute, /items\.splice\(targetIndex, 0, moved\)/);
  assert.match(adminChoiceRoute, /items\.splice\(targetIndex, 0, moved\)/);
});

test("creator Choice can create a draft from the first selected song", () => {
  assert.match(profileChoicePage, /async function ensureChoiceCollection/);
  assert.match(profileChoicePage, /async function toggleChoiceItem/);
  assert.match(profileChoicePage, /requestAction\("ensure_collection", draft\)/);
  assert.match(profileChoicePage, /type="checkbox" checked=\{added\}/);
  assert.match(profileChoicePage, /void toggleChoiceItem\(item\)/);
  assert.doesNotMatch(profileChoicePage, /disabled=\{!selected \|\| added \|\| busy !== ""\}/);
  assert.match(profileChoicePage, /mutationLock.current = true/);
  assert.match(profileChoicePage, /localStorage.setItem\(draftKey/);
  assert.match(profileChoicePage, /musicPlayer\?\.start/);
  assert.match(profileChoicePage, /aria-label=\{copy.search\}/);
  assert.match(profileChoicePage, /aria-label=\{copy.genre\}/);
  assert.doesNotMatch(profileChoicePage, /honor-board\/interactions|action: "favorite"|action: "removeFavorite"/);
});

test("creator Showtime management supports an explanatory external-link label without payment handling", () => {
  assert.match(migration, /add column if not exists support_url_label text/i);
  assert.match(showtimeHelper, /cleanShowtimeSupportLabel/);
  assert.match(showtimeRoute, /supportLabel/);
  assert.match(showtimeRoute, /請先填寫 HTTPS 外部連結，再設定連結用途/);
  assert.match(profilePage, /連結用途/);
  assert.doesNotMatch(profileChoicePage, /openSupportEditor|saveSupportLink|ownShowtimeWorks|api\/showtime\/my-tracks/);
  assert.match(profileChoicePage, /href=\{`\/profile\?lang=\$\{lang\}`\}/);
  assert.match(profilePage, /AIPOGER 不處理付款或金額/);
});
