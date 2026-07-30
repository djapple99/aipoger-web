import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalog = readFileSync(new URL("../src/lib/server-choice-catalog.ts", import.meta.url), "utf8");
const adminRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const creatorRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const publicRoute = readFileSync(new URL("../src/app/api/choice/[id]/route.ts", import.meta.url), "utf8");
const currentRoute = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
const adminChoicePage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Choice selection combines certified Showtime works with eligible seven-day releases", () => {
  assert.match(catalog, /loadShowtimeAdminCatalog/);
  assert.match(catalog, /isNewlyPublishedMusic/);
  assert.match(catalog, /choiceSource: "new_release"/);
  assert.match(catalog, /recognition: "Choice 新選"/);
  assert.match(catalog, /!row\.ai_music_showtime_certified/);
  assert.match(catalog, /retiredFromExplore/);
  assert.match(adminRoute, /loadChoiceSelectionCatalog/);
  assert.match(creatorRoute, /loadChoiceSelectionCatalog/);
  assert.match(adminRoute, /Showtime 認證作品或 7 天內新歌/);
  assert.match(adminChoicePage, /公開 Showtime 認證作品與上架 7 天內的新歌/);
  assert.match(adminChoicePage, /grid-cols-\[minmax\(0,1fr\)\]/);
  assert.match(adminChoicePage, /px-4 pb-28 pt-24/);
  assert.match(adminChoicePage, /mt-4 grid grid-cols-\[minmax\(0,1fr\)\] gap-2/);
  assert.match(adminChoicePage, /h-7 w-7[^"]+sm:h-8 sm:w-8/);
});

test("new-release selection does not weaken creator eligibility or expire existing Choice playback", () => {
  assert.match(creatorRoute, /\.eq\("ai_music_showtime_certified", true\)/);
  assert.match(creatorRoute, /需要至少一首已認證 Showtime 的作品/);
  assert.match(publicRoute, /source\?\.isPublic/);
  assert.doesNotMatch(publicRoute, /source\?\.isPublic && source\.selectable/);
  assert.match(currentRoute, /source\?\.isPublic/);
  assert.doesNotMatch(currentRoute, /source\?\.selectable/);
  assert.match(productRules, /A new release selected for Choice does not become Showtime-certified/);
  assert.match(productRules, /remains playable in that Choice after the freshness window expires/);
});
