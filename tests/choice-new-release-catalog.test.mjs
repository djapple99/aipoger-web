import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { creatorChoiceWeekStart } from "../src/lib/creator-choice.ts";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const catalog = read("../src/lib/server-choice-catalog.ts");
const playback = read("../src/lib/server-creator-choice-catalog.ts");
const adminRoute = read("../src/app/api/admin/choice/route.ts");
const creatorRoute = read("../src/app/api/creator-choice/route.ts");
const publicRoute = read("../src/app/api/choice/[id]/route.ts");
const currentRoute = read("../src/app/api/choice/current/route.ts");
const adminPage = read("../src/app/admin/choice/page.tsx");

test("Choice catalog no longer uses age, certification or ownership as selection gates", () => {
  assert.match(catalog, /loadCreatorChoicePlaybackCatalog/);
  assert.match(playback, /isPublicBarAirplayTrack/);
  assert.match(playback, /moderation_hold/);
  assert.doesNotMatch(catalog + playback, /isAipogerChoiceNewRelease|loadShowtimeAdminCatalog|retiredFromExplore|\.eq\("created_by"/);
  assert.match(creatorRoute, /loadCreatorChoiceSelectionCatalog\(guard.admin, guard.user.id\)/);
  assert.match(adminRoute, /主推歌單必須已發布，且有公開可播放的歌曲/);
  assert.doesNotMatch(adminPage, /30 天|認證作品|CHOICE 新選|choiceSource ===/);
});

test("creator weeks are Monday-based in Taiwan, independent of runtime timezone", () => {
  assert.equal(creatorChoiceWeekStart(new Date("2026-09-13T15:59:59Z")), "2026-09-07");
  assert.equal(creatorChoiceWeekStart(new Date("2026-09-13T16:00:00Z")), "2026-09-14");
  assert.equal(creatorChoiceWeekStart(new Date("2026-09-20T15:59:59Z")), "2026-09-14");
});

test("existing playlist playback checks public state, never current favorite selection eligibility", () => {
  assert.match(publicRoute, /source\?\.isPublic/);
  assert.doesNotMatch(publicRoute, /source\?\.isPublic && source\.selectable/);
  assert.match(currentRoute, /source\?\.isPublic/);
  assert.doesNotMatch(currentRoute, /source\?\.selectable/);
  assert.match(creatorRoute, /loadCreatorChoicePlaybackCatalog\(guard.admin\)/);
  assert.match(playback, /favoriteAliases: row.battle_code/);
});
