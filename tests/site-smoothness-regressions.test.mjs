import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const overlaySource = fs.readFileSync("src/components/global-battle-call-overlay.tsx", "utf8");
const profileSource = fs.readFileSync("src/app/profile/page.tsx", "utf8");
const battleSetupSource = fs.readFileSync("src/app/battle/setup/page.tsx", "utf8");
const listenBarSource = fs.readFileSync("src/app/listen-bar/page.tsx", "utf8");
const globalsSource = fs.readFileSync("src/app/globals.css", "utf8");
const watchSource = fs.readFileSync("src/app/watch/page.tsx", "utf8");
const analysisHealthSource = fs.readFileSync("src/app/api/music-analysis/health/route.ts", "utf8");

test("logged-out account dock does not present a fake notification bell", () => {
  assert.ok(overlaySource.includes("accountSessionResolved"));
  assert.ok(overlaySource.includes('pathname === "/" || pathname === "/auth"'));
  assert.ok(overlaySource.includes("登入 AIPOGER"));
  assert.ok(overlaySource.includes('"fixed right-24 top-4'));
  assert.ok(profileSource.includes("rememberAuthNextPath(nextPath)"));
  assert.ok(profileSource.includes("router.replace(`/auth?next=${encodeURIComponent(nextPath)}`)"));
});

test("mobile creator entry headers clear the fixed home logo", () => {
  assert.ok(profileSource.includes("pb-10 pt-24"));
  assert.ok(battleSetupSource.includes("px-6 pb-6 pt-24"));
});

test("battle desktop CTA stays inside the pool header", () => {
  assert.match(globalsSource, /\.battle-pool-star-cta[\s\S]*?width: 9rem;[\s\S]*?height: 9rem;/);
  assert.match(globalsSource, /\.battle-pool-head[\s\S]*?overflow: hidden;[\s\S]*?padding-right: 10rem;/);
});

test("listen bar only duplicates ticker content when live battle messages exist", () => {
  assert.ok(listenBarSource.includes('battleTickerMessages.length > 0 ? "aipo-marquee-track text-left" : "w-full text-center"'));
  assert.ok(listenBarSource.includes("battleTickerMessages.length > 0 ? ("));
});

test("legacy watch entry preserves a supported language", () => {
  assert.ok(watchSource.includes('redirect(`/battle?lang=${lang}`)'));
  assert.ok(watchSource.includes('["zh", "en", "ja", "ko"]'));
});

test("analysis cold start is reported as warming instead of server failure", () => {
  assert.ok(analysisHealthSource.includes('error.name === "AbortError"'));
  assert.ok(analysisHealthSource.includes("warming: true"));
  assert.ok(analysisHealthSource.includes("{ status: 202 }"));
});
