import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiRoute = readFileSync(new URL("../src/app/api/ai-music-bible/comments/route.ts", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../src/components/bible-entry-comments-dialog.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260716180323_ai_music_bible_entry_comments.sql", import.meta.url), "utf8");

test("Bible entry comments use validated catalog keys and narrow server-side access", () => {
  assert.match(apiRoute, /isSunoInspirationEntry/);
  assert.match(apiRoute, /admin\.auth\.getUser/);
  assert.match(apiRoute, /sameOrigin\(request\)/);
  assert.match(apiRoute, /MAX_COMMENTS_PER_HOUR/);
  assert.match(apiRoute, /ai_music_bible_entry_comments/);
  assert.match(apiRoute, /\.eq\("user_id", user\.id\)/);
});

test("Bible comment UI supports member reads, authenticated writes, deletion, and reporting", () => {
  assert.match(dialog, /\/api\/ai-music-bible\/comments/);
  assert.match(dialog, /登入後留下評論/);
  assert.match(dialog, /刪除自己的評論/);
  assert.match(dialog, /targetType="comment"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /maxLength=\{MAX_COMMENT_LENGTH\}/);
});

test("Bible comment migration is additive, RLS-enabled, and service-role mediated", () => {
  assert.match(migration, /create table if not exists public\.ai_music_bible_entry_comments/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/);
  assert.match(migration, /grant all .* to service_role/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
});
