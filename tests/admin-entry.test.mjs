import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const rootAdmin = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
const bibleAdmin = readFileSync(new URL("../src/app/admin/ai-music-bible/page.tsx", import.meta.url), "utf8");
const authPage = readFileSync(new URL("../src/app/auth/page.tsx", import.meta.url), "utf8");
const moderationAdmin = readFileSync(new URL("../src/app/admin/moderation/page.tsx", import.meta.url), "utf8");

test("owner backend has a real /admin entry with all core modules", () => {
  assert.match(rootAdmin, /後台總覽/);
  assert.match(rootAdmin, /getActiveAuthSession/);
  assert.match(rootAdmin, /href: "\/admin\/ai-music-bible"/);
  assert.match(rootAdmin, /href: "\/admin\/comments"/);
  assert.match(rootAdmin, /href: "\/admin\/analytics"/);
  assert.match(rootAdmin, /href: "\/admin\/q-crash"/);
});

test("admin auth can recover a missing bearer session and switch accounts", () => {
  assert.match(bibleAdmin, /getActiveAuthSession/);
  assert.match(bibleAdmin, /switch=1/);
  assert.match(authPage, /supabase\.auth\.signOut\(\)/);
  assert.match(authPage, /ownerLogin/);
});

test("moderation no longer points owner users to the missing /login route", () => {
  assert.doesNotMatch(moderationAdmin, /href="\/login"/);
  assert.match(moderationAdmin, /\/auth\?next=%2Fadmin%2Fmoderation/);
});
