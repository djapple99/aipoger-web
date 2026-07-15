import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260713090833_creator_choice_collections.sql", import.meta.url), "utf8");
const creatorChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const publicChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/[id]/route.ts", import.meta.url), "utf8");
const profileChoicePage = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
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

test("only creators with a Showtime work can manage their own Choice while catalog selection remains cross-creator", () => {
  assert.match(creatorChoiceRoute, /\.eq\("created_by", userId\)/);
  assert.match(creatorChoiceRoute, /\.eq\("ai_music_showtime_certified", true\)/);
  assert.match(creatorChoiceRoute, /需要至少一首已認證 Showtime 的作品/);
  assert.match(creatorChoiceRoute, /loadShowtimeAdminCatalog\(admin\)/);
  assert.match(creatorChoiceRoute, /只能加入目前公開展示中的 Showtime 認證作品/);
  assert.match(creatorChoiceRoute, /item\.isPublic && item\.selectable/);
  assert.doesNotMatch(creatorChoiceRoute, /\.eq\("created_by", guard\.user\.id\).*sourceKind/s);
});

test("creator Choice can be shared only after publication and keeps 5-10 current Showtime works", () => {
  assert.match(creatorChoiceRoute, /AIPOGER_CHOICE_MIN_ITEMS/);
  assert.match(creatorChoiceRoute, /AIPOGER_CHOICE_MAX_ITEMS/);
  assert.match(creatorChoiceRoute, /published_at: publish \? now : null/);
  assert.match(publicChoiceRoute, /\.eq\("is_published", true\)/);
  assert.match(publicChoiceRoute, /source\?\.isPublic && source\.selectable/);
  assert.match(profileChoicePage, /creatorChoicePublicPath/);
  assert.match(profileChoicePage, /只顯示目前公開展示中的 Showtime 作品；左下播放鈕可直接試聽，可選其他創作者，不限自己的歌。/);
});

test("creator Choice selected tracks do not overflow the mobile workbench", () => {
  assert.match(profileChoicePage, /pb-28 pt-24[^\"]*sm:pt-8/);
  assert.match(profileChoicePage, /grid-cols-\[1\.5rem_2\.75rem_minmax\(0,1fr\)\]/);
  assert.match(profileChoicePage, /col-span-3 flex justify-end/);
  assert.match(profileChoicePage, /h-11 w-11/);
});

test("creator Choice can create a draft from the first selected song", () => {
  assert.match(profileChoicePage, /const ensureChoiceCollection = useCallback/);
  assert.match(profileChoicePage, /const addChoiceItem = useCallback/);
  assert.match(profileChoicePage, /void addChoiceItem\(item\)/);
  assert.doesNotMatch(profileChoicePage, /disabled=\{!selected \|\| added \|\| busy !== ""\}/);
  assert.match(profileChoicePage, /按＋會自動建立本週草稿/);
  assert.match(profileChoicePage, /ChoicePreviewPlayer/);
  assert.match(profileChoicePage, /setPreviewTrack\(item\)/);
  assert.match(profileChoicePage, /左下播放鈕可直接試聽/);
});

test("creator Showtime management supports an explanatory external-link label without payment handling", () => {
  assert.match(migration, /add column if not exists support_url_label text/i);
  assert.match(showtimeHelper, /cleanShowtimeSupportLabel/);
  assert.match(showtimeRoute, /supportLabel/);
  assert.match(showtimeRoute, /請先填寫 HTTPS 外部連結，再設定連結用途/);
  assert.match(profilePage, /連結用途/);
  assert.match(profileChoicePage, /YouTube 頻道、MV 或外部支持／打賞頁/);
  assert.match(profilePage, /AIPOGER 不處理付款或金額/);
});
