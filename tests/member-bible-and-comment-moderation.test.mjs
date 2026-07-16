import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const biblePage = source("../src/components/ai-music-bible-page.tsx");
const authDialog = source("../src/components/auth-required-dialog.tsx");
const explorePage = source("../src/app/ai-music/ai-music-client.tsx");
const listenBarPage = source("../src/app/listen-bar/page.tsx");
const bibleCommentsRoute = source("../src/app/api/ai-music-bible/comments/route.ts");
const choiceCommentsRoute = source("../src/app/api/choice/comments/route.ts");
const trackCommentsRoute = source("../src/app/api/listen-bar/track-comments/route.ts");
const adminPage = source("../src/app/admin/comments/page.tsx");
const adminRoute = source("../src/app/api/admin/comments/route.ts");
const migration = source("../supabase/migrations/20260716185707_centralized_comment_moderation.sql");

test("the Practice Bible uses a normal value hero and a focused member prompt", () => {
  assert.match(biblePage, /type AccessState = "checking" \| "signedOut" \| "signedIn"/);
  assert.match(biblePage, /supabase\.auth\.getSession\(\)/);
  assert.match(biblePage, /supabase\.auth\.onAuthStateChange/);
  assert.match(biblePage, /AI 音樂練功聖經/);
  assert.match(biblePage, /AIPOGER PRACTICE BIBLE/);
  assert.match(biblePage, /AuthRequiredDialog/);
  assert.match(biblePage, /kind="bible"/);
  assert.match(biblePage, /setAuthPromptOpen\(true\)/);
  assert.match(biblePage, /appendLang\("\/ai-music", lang\)/);
  assert.match(biblePage, /appendLang\("\/listen-bar", lang\)/);
  assert.doesNotMatch(biblePage, /登入解鎖 AI 音樂練功聖經/);
  assert.doesNotMatch(biblePage, /AIPOGER MEMBER CODEX/);
  assert.doesNotMatch(biblePage, /愛心、收藏、評論與練功聖經需要登入/);
  assert.match(authDialog, /登入後開始練功/);
  assert.match(authDialog, /ログインして練習を始める/);
  assert.match(authDialog, /로그인하고 연습 시작/);
});

test("signed-out Hearts open the shared system prompt and preserve the track return path", () => {
  assert.match(explorePage, /setAuthPromptTrack\(track\)/);
  assert.match(explorePage, /kind="heart"/);
  assert.match(explorePage, /aiMusicTrackHref\(authPromptTrack\.sourceId, lang\)/);
  assert.match(listenBarPage, /setAuthPromptOpen\(true\)/);
  assert.match(listenBarPage, /kind="heart"/);
  assert.match(authDialog, /愛心會同步收藏這首歌/);
  assert.match(authDialog, /role="dialog"/);
  assert.match(authDialog, /aria-modal="true"/);
});

test("Bible comments cannot be read without a verified member token", () => {
  assert.match(bibleCommentsRoute, /const user = await requiredUser\(request, admin\)/);
  assert.match(bibleCommentsRoute, /請先登入，才能查看練功聖經評論/);
  assert.match(bibleCommentsRoute, /admin\.auth\.getUser\(token\)/);
  assert.doesNotMatch(bibleCommentsRoute, /async function optionalUser/);
});

test("public comment APIs hide moderated rows and remain migration-compatible", () => {
  for (const route of [bibleCommentsRoute, choiceCommentsRoute, trackCommentsRoute]) {
    assert.match(route, /moderation_status/);
    assert.match(route, /"visible"/);
    assert.match(route, /PGRST204|schema cache/);
  }
});

test("owner comment API centralizes all persistent comment sources", () => {
  assert.match(adminRoute, /listen_bar_track_comments/);
  assert.match(adminRoute, /aipoger_choice_collection_comments/);
  assert.match(adminRoute, /ai_music_bible_entry_comments/);
  assert.match(adminRoute, /content_reports/);
  assert.match(adminRoute, /moderation\/content-reports\.json/);
  assert.match(adminRoute, /writeStoredReports/);
  assert.match(adminRoute, /isAdminEmail\(data\.user\.email\)/);
  assert.match(adminRoute, /admin\.auth\.getUser\(token\)/);
  assert.match(adminRoute, /"hide" \| "restore" \| "delete" \| "resolve_reports"/);
  assert.match(adminRoute, /moderated_by: userId/);
  assert.match(adminRoute, /resolved_by: userId/);
});

test("comment desk exposes searchable, report-first, reversible moderation", () => {
  assert.match(adminPage, /評論管理中控台/);
  assert.match(adminPage, /搜尋留言、作者、歌曲或歌單/);
  assert.match(adminPage, /歌曲評論/);
  assert.match(adminPage, /Choice 評論/);
  assert.match(adminPage, /聖經評論/);
  assert.match(adminPage, /待看檢舉/);
  assert.match(adminPage, /確認隱藏/);
  assert.match(adminPage, /確認永久刪除/);
  assert.match(adminPage, /只結案/);
  assert.match(adminPage, /migration 套用後開放/);
});

test("moderation migration is additive, auditable, and server mediated", () => {
  assert.match(migration, /create table if not exists public\.ai_music_bible_entry_comments/);
  assert.equal((migration.match(/add column if not exists moderation_status/g) || []).length, 3);
  assert.equal((migration.match(/add column if not exists moderated_by/g) || []).length, 3);
  assert.equal((migration.match(/add column if not exists moderated_at/g) || []).length, 3);
  assert.match(migration, /moderation_status in/);
  assert.match(migration, /visible.*hidden/);
  assert.match(migration, /revoke all on table public\.listen_bar_track_comments from public, anon, authenticated/);
  assert.match(migration, /grant all on table public\.ai_music_bible_entry_comments to service_role/);
});
