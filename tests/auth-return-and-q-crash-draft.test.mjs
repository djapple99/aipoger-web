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
  assert.deepEqual(draft?.listened, { A: true, B: false });
  assert.equal(parseQCrashVoteDraft(JSON.stringify({ vote: "fighter_a", expiresAt: now - 1 }), now), null);
  assert.match(qCrashVoteDraftKey("battle-id"), /battle-id$/);
  assert.ok(qCrashCard.includes("rememberQCrashVoteDraft"));
  assert.ok(qCrashCard.includes("readQCrashVoteDraft"));
  assert.ok(qCrashCard.includes("登入並投作品"));
  assert.equal(qCrashCard.includes("autoSubmit"), false);
});
