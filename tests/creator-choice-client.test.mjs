import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCreatorChoiceRequestScope, ChoiceRequestError } from "../src/lib/creator-choice-client.ts";
import { creatorChoiceCopy, creatorChoiceError } from "../src/lib/creator-choice-copy.ts";

const source = readFileSync(new URL("../src/components/creator-choice-workbench.tsx", import.meta.url), "utf8");

test("a switched account invalidates delayed GET and mutation responses and prevents subsequent old writes", async () => {
  const originalFetch = global.fetch;
  try {
    for (const method of ["GET", "PATCH"]) {
      let finish;
      const requests = [];
      global.fetch = (_url, init) => {
        requests.push(init);
        return new Promise((resolve) => { finish = resolve; });
      };
      const oldScope = createCreatorChoiceRequestScope("old-user", "old-token");
      const pending = oldScope.request("/api/creator-choice", { method });
      oldScope.controller.abort();
      finish(new Response(JSON.stringify({ collections: [{ title: "Private old draft" }] })));
      await assert.rejects(pending, { name: "AbortError" });
      await assert.rejects(oldScope.request("/api/creator-choice", { method: "PATCH" }), { name: "AbortError" });
      assert.equal(requests.length, 1);
      assert.equal(requests[0].headers.get("Authorization"), "Bearer old-token");
      const newScope = createCreatorChoiceRequestScope("new-user", "new-token");
      const fresh = newScope.request("/api/creator-choice");
      finish(new Response(JSON.stringify({ collections: [] })));
      assert.deepEqual(await fresh, { collections: [] });
      assert.equal(requests[1].headers.get("Authorization"), "Bearer new-token");
    }
  } finally { global.fetch = originalFetch; }
});

test("request failures retain status for login recovery and never masquerade as a saved draft", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => new Response(JSON.stringify({ error: "expired" }), { status: 401 });
    await assert.rejects(createCreatorChoiceRequestScope("u", "t").request("/api/creator-choice"),
      (error) => error instanceof ChoiceRequestError && error.status === 401);
  } finally { global.fetch = originalFetch; }
});

test("same-account token refresh preserves the in-flight save and scope, updating only subsequent request headers", async () => {
  const originalFetch = global.fetch;
  try {
    let finish;
    const headers = [];
    global.fetch = (_url, init) => {
      headers.push(init.headers.get("Authorization"));
      return new Promise((resolve) => { finish = resolve; });
    };
    const scope = createCreatorChoiceRequestScope("same-user", "before-refresh");
    const pendingSave = scope.request("/api/creator-choice", { method: "POST", body: new FormData() });
    scope.updateAccessToken("after-refresh");
    assert.equal(scope.controller.signal.aborted, false);
    finish(new Response(JSON.stringify({ coverUrl: "saved-cover" })));
    assert.equal((await pendingSave).coverUrl, "saved-cover");
    const next = scope.request("/api/creator-choice");
    finish(new Response(JSON.stringify({ collections: [] })));
    await next;
    assert.deepEqual(headers, ["Bearer before-refresh", "Bearer after-refresh"]);
    assert.match(source, /if \(id === currentUserId\) \{\s*if \(token\) scopeRef.current\?\.updateAccessToken\(token\);\s*return;/);
  } finally { global.fetch = originalFetch; }
});

test("all four languages have complete workspace, state, action, confirmation and error copy", () => {
  const keys = Object.keys(creatorChoiceCopy.zh).sort();
  for (const lang of ["zh", "en", "ja", "ko"]) {
    assert.deepEqual(Object.keys(creatorChoiceCopy[lang]).sort(), keys);
    assert.ok(Object.values(creatorChoiceCopy[lang]).every((value) => typeof value === "string" && value.trim()));
    assert.equal(creatorChoiceError("只能加入自己已收藏且目前公開可播放的歌曲。", lang), creatorChoiceCopy[lang].notFavorite);
    assert.equal(creatorChoiceError("週期必須選擇星期一。", lang), creatorChoiceCopy[lang].invalidWeek);
  }
  assert.match(source, /useI18n\(\)/);
  assert.doesNotMatch(source, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Hangul}]/u);
  assert.match(source, /\/profile\?lang=\$\{lang\}/);
  assert.match(source, /encodeURIComponent\(nextPath\)/);
  assert.match(source, /creatorChoicePublicPath\(selected.id\)\}&lang=\$\{lang\}/);
});

test("auth cleanup clears private edits and saves are explicit rather than debounced", () => {
  assert.match(source, /onAuthStateChange/);
  assert.match(source, /subscription.unsubscribe\(\)/);
  assert.match(source, /scopeRef.current\?\.controller.abort\(\)/);
  assert.match(source, /setSelectedItems\(\[\]\); setPendingItems\(\[\]\)/);
  assert.match(source, /requestAction\("save_editor"/);
  assert.doesNotMatch(source, /localStorage.setItem|\}, 900\)|setSyncing/);
  assert.match(source, /beforeunload/);
  assert.match(source, /expected: editorSnapshot.current/);
});
