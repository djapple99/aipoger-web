import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const todayRouteSource = readFileSync(new URL("../src/app/today/route.ts", import.meta.url), "utf8");
const listenBarPageSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const adminListenBarSource = readFileSync(new URL("../src/app/admin/listen-bar/page.tsx", import.meta.url), "utf8");
const socialAdminSource = readFileSync(new URL("../src/app/admin/social/page.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("today remains a 307 compatibility entry for AIPOGER Choice", () => {
  assert.ok(todayRouteSource.includes("NextResponse.redirect"));
  assert.ok(todayRouteSource.includes("/rank?lang=${encodeURIComponent(lang)}#choice-weekly"));
  assert.equal(todayRouteSource.includes("daily-spotlight"), false);
  assert.equal(todayRouteSource.includes("listen-bar?spotlight"), false);
});

test("Daily Spotlight app routes and helpers are fully retired", () => {
  assert.equal(existsSync(new URL("../src/app/api/listen-bar/daily-spotlight/route.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/lib/daily-spotlight.ts", import.meta.url)), false);
  assert.equal(listenBarPageSource.includes("daily-spotlight"), false);
  assert.equal(listenBarPageSource.includes("dailySpotlight"), false);
  assert.equal(listenBarPageSource.includes("spotlightDate"), false);
  assert.equal(adminListenBarSource.includes("daily-spotlight"), false);
  assert.equal(adminListenBarSource.includes("DailySpotlight"), false);
  assert.equal(adminListenBarSource.includes("每日推薦"), false);
});

test("admin social remains the manual draft, approval, and publishing console", () => {
  assert.ok(socialAdminSource.includes('"create_manual_draft"'));
  assert.ok(socialAdminSource.includes('"approve_post"'));
  assert.ok(socialAdminSource.includes('"publish_target"'));
  assert.ok(socialAdminSource.includes('"mark_manual_published"'));
});

test("product rules focus curation on Choice without a replacement Spotlight", () => {
  assert.ok(productRulesSource.includes("Daily Spotlight 已退役"));
  assert.ok(productRulesSource.includes("AIPOGER Choice"));
  assert.equal(productRulesSource.includes("Daily Spotlight is the bridge"), false);
});
