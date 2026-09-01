import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const {
  isAuthReturnDestination,
  safeNextPath,
} = await import("../src/lib/auth-urls.ts");
const {
  parseQCrashVoteDraft,
  qCrashVoteDraftKey,
} = await import("../src/lib/q-crash-vote-draft.ts");
const {
  detectEmbeddedBrowser,
} = await import("../src/lib/embedded-browser.ts");

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const authPage = source("../src/app/auth/page.tsx");
const callbackPage = source("../src/app/auth/callback/page.tsx");
const qCrashCard = source("../src/components/q-crash-card-client.tsx");

test("auth return keeps an exact trusted Q Crash destination", () => {
  const target = "/battle/q-crash/123e4567-e89b-42d3-a456-426614174000?lang=zh";
  assert.equal(safeNextPath(target), target);
  assert.equal(isAuthReturnDestination(target, target), true);
  assert.equal(isAuthReturnDestination(`${target}&from=share`, target), false);
  assert.equal(isAuthReturnDestination("/battle?lang=zh", target), false);
  assert.equal(safeNextPath("https://attacker.example/battle/q-crash/id"), "/");
});

test("successful auth uses a hard return and only clears after destination load", () => {
  assert.ok(callbackPage.includes("markAuthReturnPending(nextPath)"));
  assert.ok(callbackPage.includes("window.location.replace(nextPath)"));
  assert.equal(callbackPage.includes("clearRememberedAuthNextPath();"), false);
  assert.ok(authPage.includes("markAuthReturnPending(nextPath)"));
  assert.ok(authPage.includes("window.location.replace(nextPath)"));
});

test("Q Crash draft survives auth but remains unsubmitted", () => {
  const now = Date.now();
  const draft = parseQCrashVoteDraft(JSON.stringify({
    vote: "fighter_b",
    listened: { A: true, B: false },
    expiresAt: now + 60_000,
  }), now);
  assert.equal(draft?.vote, "fighter_b");
  assert.equal("listened" in (draft ?? {}), false);
  assert.equal(parseQCrashVoteDraft(JSON.stringify({ vote: "fighter_a", expiresAt: now - 1 }), now), null);
  assert.match(qCrashVoteDraftKey("battle-id"), /battle-id$/);
  assert.ok(qCrashCard.includes("rememberQCrashVoteDraft"));
  assert.ok(qCrashCard.includes("readQCrashVoteDraft"));
  assert.ok(qCrashCard.includes("登入並投作品"));
  assert.equal(qCrashCard.includes("autoSubmit"), false);
});

test("embedded browser detection identifies LINE and keeps normal mobile browsers clear", () => {
  assert.deepEqual(
    detectEmbeddedBrowser("Mozilla/5.0 (iPhone) Line/15.0"),
    { isEmbedded: true, kind: "line" },
  );
  assert.equal(
    detectEmbeddedBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1").isEmbedded,
    false,
  );
  assert.equal(
    detectEmbeddedBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36").isEmbedded,
    false,
  );
});

test("Q Crash exposes the browser escape hatch before the protected vote", () => {
  assert.ok(qCrashCard.includes("external_browser_cta"));
  assert.ok(qCrashCard.includes("用瀏覽器開啟"));
  assert.ok(qCrashCard.includes("複製連結"));
  assert.ok(qCrashCard.includes("投票前先用手機瀏覽器開啟"));
});
