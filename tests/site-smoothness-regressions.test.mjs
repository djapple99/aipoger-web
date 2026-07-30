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
const brandSource = fs.readFileSync("src/lib/brand.ts", "utf8");
const socialIconSource = fs.readFileSync("src/components/social-icons.tsx", "utf8");
const bibleSource = fs.readFileSync("src/components/ai-music-bible-page.tsx", "utf8");

test("public social cluster exposes the LINE community with a desktop QR handoff", () => {
  assert.ok(brandSource.includes("AIPOGER_LINE_COMMUNITY_URL"));
  assert.ok(brandSource.includes("https://line.me/ti/g2/XIyoidP5f8UVtFEhAhEABAx0JUNXYgCu-Af6dA"));
  assert.ok(socialIconSource.includes('normalized.includes("line")'));
  assert.ok(socialIconSource.includes("api.qrserver.com/v1/create-qr-code"));
  assert.ok(socialIconSource.includes("複製邀請連結"));
  assert.ok(socialIconSource.includes("在 LINE 開啟"));
});

test("the signed-in practice Bible offers a LINE field room", () => {
  assert.ok(bibleSource.includes('id="line-community"'));
  assert.ok(bibleSource.includes("LineCommunityDialog"));
  assert.ok(bibleSource.includes("AIPOGER_LINE_COMMUNITY_URL"));
  assert.ok(bibleSource.includes("加入 LINE 社群"));
});

test("logged-out account dock does not present a fake notification bell", () => {
  assert.ok(overlaySource.includes("accountSessionResolved"));
  assert.ok(overlaySource.includes('pathname === "/" || pathname === "/auth"'));
  assert.ok(overlaySource.includes('const signInLabel = lang === "ja" ? "ログイン" : lang === "ko" ? "로그인" : lang === "en" ? "Sign in" : "登入";'));
  assert.ok(overlaySource.includes('aria-label={`${signInLabel} AIPOGER`}'));
  assert.ok(overlaySource.includes('"fixed right-24 top-4'));
  assert.ok(profileSource.includes("rememberAuthNextPath(nextPath)"));
  assert.ok(profileSource.includes("router.replace(`/auth?next=${encodeURIComponent(nextPath)}`)"));
});

test("signed-in account dock can be dragged without losing its saved position", () => {
  assert.ok(overlaySource.includes('aipoger:account-dock-position-v2'));
  assert.ok(overlaySource.includes("beginAccountDockDrag"));
  assert.ok(overlaySource.includes("moveAccountDock"));
  assert.ok(overlaySource.includes("suppressAccountDockClickRef"));
  assert.ok(overlaySource.includes("clampAccountDockPosition"));
  assert.ok(overlaySource.includes("encodeAccountDockPosition"));
  assert.ok(overlaySource.includes("decodeAccountDockPosition"));
  assert.ok(overlaySource.includes("persistAccountDockPosition"));
  assert.ok(overlaySource.includes('window.addEventListener("pointermove", moveAccountDock'));
  assert.ok(overlaySource.includes('window.addEventListener("pointerup", finishAccountDockDrag'));
});

test("floating account avatar always opens Profile while the bell remains a separate notice action", () => {
  assert.ok(overlaySource.includes('href={`/profile?lang=${lang}`}'));
  assert.ok(overlaySource.includes('aria-label={isZh ? "帳號消息" : "Account notices"}'));
  assert.ok(overlaySource.includes('onPointerDown={(event) => event.stopPropagation()}'));
  assert.ok(overlaySource.includes("supabase.auth.onAuthStateChange"));
  assert.ok(overlaySource.includes("drag.target.setPointerCapture?.(event.pointerId)"));
  assert.ok(overlaySource.includes("Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8"));
});

test("battle stage keeps a dramatic desktop VS while hiding it on mobile", () => {
  assert.match(globalsSource, /\.battle-stage-vs \{[\s\S]*?display: none;/);
  assert.match(globalsSource, /@media \(min-width: 768px\)[\s\S]*?\.battle-stage-vs \{[\s\S]*?display: block;[\s\S]*?font-size: 6\.75rem;/);
});

test("mobile creator entry headers clear the fixed home logo", () => {
  assert.ok(profileSource.includes("pb-40 pt-24"));
  assert.ok(profileSource.includes("sm:pb-28 sm:pt-10"));
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
