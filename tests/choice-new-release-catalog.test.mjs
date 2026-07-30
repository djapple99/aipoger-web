import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AIPOGER_CHOICE_NEW_RELEASE_WINDOW_DAYS,
  isAipogerChoiceNewRelease,
} from "../src/lib/aipoger-choice.ts";

const catalog = readFileSync(new URL("../src/lib/server-choice-catalog.ts", import.meta.url), "utf8");
const adminRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const creatorRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const publicRoute = readFileSync(new URL("../src/app/api/choice/[id]/route.ts", import.meta.url), "utf8");
const currentRoute = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
const adminChoicePage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const selectedWorks = readFileSync(new URL("../src/components/choice-selected-works.tsx", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Choice selection combines certified Showtime works with eligible 30-day releases", () => {
  assert.match(catalog, /loadShowtimeAdminCatalog/);
  assert.match(catalog, /isAipogerChoiceNewRelease/);
  assert.match(catalog, /choiceSource: "new_release"/);
  assert.match(catalog, /recognition: "Choice 新選"/);
  assert.match(catalog, /!row\.ai_music_showtime_certified/);
  assert.match(catalog, /retiredFromExplore/);
  assert.match(adminRoute, /loadChoiceSelectionCatalog/);
  assert.match(creatorRoute, /loadChoiceSelectionCatalog/);
  assert.match(adminRoute, /Showtime 認證作品或 30 天內新歌/);
  assert.match(adminChoicePage, /公開 Showtime 認證作品與上架 30 天內的新歌/);
  assert.match(adminChoicePage, /grid-cols-\[minmax\(0,1fr\)\]/);
  assert.match(adminChoicePage, /px-4 pb-28 pt-24/);
  assert.match(adminChoicePage, /layout="sidebar"/);
  assert.match(selectedWorks, /md:grid-cols-2 xl:grid-cols-1/);
  assert.match(selectedWorks, /h-10 w-10[^\"]+sm:h-8 sm:w-8/);
});

test("Choice new-release eligibility lasts 30 rolling days without changing the seven-day NEW badge", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");
  assert.equal(AIPOGER_CHOICE_NEW_RELEASE_WINDOW_DAYS, 30);
  assert.equal(isAipogerChoiceNewRelease("2026-07-01T12:00:00.001Z", now), true);
  assert.equal(isAipogerChoiceNewRelease("2026-06-30T12:00:00.000Z", now), false);
  assert.equal(isAipogerChoiceNewRelease("2026-07-31T12:00:00.000Z", now), false);
  assert.match(catalog, /isAipogerChoiceNewRelease/);
  assert.doesNotMatch(catalog, /isNewlyPublishedMusic/);
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
