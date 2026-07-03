import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeSpotlightDate,
  taipeiDateKey,
  todaySpotlightPath,
} from "../src/lib/daily-spotlight.ts";

const routeSource = readFileSync(new URL("../src/app/api/listen-bar/daily-spotlight/route.ts", import.meta.url), "utf8");
const todayRouteSource = readFileSync(new URL("../src/app/today/route.ts", import.meta.url), "utf8");
const listenBarPageSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const adminListenBarSource = readFileSync(new URL("../src/app/admin/listen-bar/page.tsx", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/20260702_listen_bar_daily_spotlight.sql", import.meta.url), "utf8");

test("today spotlight date key follows Asia Taipei calendar", () => {
  assert.equal(taipeiDateKey(new Date("2026-07-01T16:30:00.000Z")), "2026-07-02");
  assert.equal(normalizeSpotlightDate("2026-07-02"), "2026-07-02");
});

test("today route redirects to the current dated listen bar spotlight", () => {
  assert.equal(
    todaySpotlightPath("zh", new Date("2026-07-01T16:30:00.000Z")),
    "/listen-bar?spotlight=2026-07-02&lang=zh",
  );
  assert.ok(todayRouteSource.includes("NextResponse.redirect"));
  assert.ok(todayRouteSource.includes("todaySpotlightPath(lang)"));
});

test("daily spotlight persists by date and does not auto publish externally", () => {
  assert.ok(routeSource.includes("listen_bar_daily_spotlights"));
  assert.ok(routeSource.includes(".upsert(payload, { onConflict: \"spotlight_date\" })"));
  assert.ok(routeSource.includes("isTrackPlayable(track.data)"));
  assert.ok(!routeSource.includes("/api/admin/social"));
  assert.ok(!routeSource.includes("publish"));
});

test("listen bar can open a dated spotlight without replacing reaction or comment ids", () => {
  assert.ok(listenBarPageSource.includes("new URLSearchParams(window.location.search)"));
  assert.ok(listenBarPageSource.includes("params.get(\"spotlight\")"));
  assert.ok(listenBarPageSource.includes("/api/listen-bar/daily-spotlight?date="));
  assert.ok(listenBarPageSource.includes("trackId: rowTrack.id"));
  assert.ok(listenBarPageSource.includes("nowTrack.id === dailySpotlight.trackId"));
});

test("admin page exposes daily spotlight settings as a date-based operation", () => {
  assert.ok(adminListenBarSource.includes("TODAY SPOTLIGHT"));
  assert.ok(adminListenBarSource.includes("不是 24H 倒數"));
  assert.ok(adminListenBarSource.includes("儲存每日推薦"));
  assert.ok(adminListenBarSource.includes("目前只儲存，不自動發布"));
});

test("daily spotlight migration documents date-based retention", () => {
  assert.ok(migrationSource.includes("not a rolling 24-hour countdown"));
  assert.ok(migrationSource.includes("spotlight_date date not null unique"));
  assert.ok(migrationSource.includes("Old spotlights remain addressable by date"));
});
