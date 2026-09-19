import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(new URL("../supabase/20260802120000_q_crash_editorial_workbench.sql", import.meta.url), "utf8");
const rules = readFileSync(new URL("../src/lib/q-crash-editorial.ts", import.meta.url), "utf8");
const serverHelper = readFileSync(new URL("../src/lib/server-q-crash-editorial.ts", import.meta.url), "utf8");
const adminApi = readFileSync(new URL("../src/app/api/admin/q-crash/route.ts", import.meta.url), "utf8");
const adminPage = readFileSync(new URL("../src/app/admin/q-crash/page.tsx", import.meta.url), "utf8");
const publicMediaApi = readFileSync(new URL("../src/app/api/q-crash/public-media/route.ts", import.meta.url), "utf8");
const qCrashApi = readFileSync(new URL("../src/app/api/q-crash/[id]/route.ts", import.meta.url), "utf8");
const qCrashCard = readFileSync(new URL("../src/components/q-crash-card-client.tsx", import.meta.url), "utf8");
const battleRecords = readFileSync(new URL("../src/app/battle/results/results-client.tsx", import.meta.url), "utf8");

test("Q Crash editorial storage is isolated, audited, and owner-service only", () => {
  assert.match(migration, /create table if not exists public\.q_crash_work_editorial/);
  assert.match(migration, /create table if not exists public\.q_crash_work_editorial_audit/);
  assert.match(migration, /unique references public\.battle_queue\(id\)/);
  assert.match(migration, /full_song_url.*~\* '\^https:\/\//);
  assert.match(migration, /alter table public\.q_crash_work_editorial enable row level security/);
  assert.match(migration, /revoke all on table public\.q_crash_work_editorial from public, anon, authenticated/);
  assert.match(migration, /grant all on table public\.q_crash_work_editorial to service_role/);
  assert.match(migration, /q_crash_work_editorial_set_updated_at/);
});

test("Q Crash editorial rules lock voting and delay full-version links until an official result", () => {
  assert.match(rules, /q_crash_finished/);
  assert.match(rules, /qCrashEditorialCanEdit/);
  assert.match(rules, /qCrashEditorialShowsFullSong/);
  assert.match(rules, /url\.protocol === "https:"/);
  assert.match(serverHelper, /Q_CRASH_EDITORIAL_COVER_BUCKET/);
  assert.match(serverHelper, /isQCrashEditorialCoverPath/);
});

test("Q Crash editorial API is owner-only and prevents edits during voting", () => {
  assert.match(adminApi, /requireOwnerAdmin/);
  assert.match(adminApi, /isAdminEmail/);
  assert.match(adminApi, /qCrashEditorialCanEdit/);
  assert.match(adminApi, /投票進行中，展示資料已鎖定/);
  assert.match(adminApi, /q_crash_work_editorial_audit/);
  assert.match(adminApi, /Q_CRASH_EDITORIAL_COVER_PREFIX/);
  assert.match(adminApi, /crypto\.randomUUID/);
  assert.match(adminApi, /fullSongUrl/);
});

test("Q Crash editorial UI exposes cover and complete-version editing without editing Battle evidence", () => {
  assert.match(adminPage, /\/api\/admin\/q-crash/);
  assert.match(adminPage, /上傳新封面/);
  assert.match(adminPage, /移除自訂封面/);
  assert.match(adminPage, /完整版本連結/);
  assert.match(adminPage, /投票中的場次會鎖住/);
  assert.match(adminPage, /Drop、投票、勝負與戰績永遠鎖定/);
});

test("Q Crash public pages use editorial covers and expose complete versions only after final", () => {
  assert.match(qCrashApi, /loadQCrashEditorial/);
  assert.match(qCrashApi, /editorialCoverA/);
  assert.match(qCrashApi, /qCrashEditorialShowsFullSong\(card\.status\)/);
  assert.match(qCrashCard, /聽完整版本/);
  assert.match(qCrashCard, /work\.fullSongUrl/);
  assert.match(publicMediaApi, /eq\("status", "q_crash_finished"\)/);
  assert.match(publicMediaApi, /fullSongUrl: qCrashEditorialShowsFullSong/);
  assert.match(battleRecords, /\/api\/q-crash\/public-media/);
  assert.match(battleRecords, /record\.fullSongUrl/);
  assert.match(battleRecords, /text-black transition .*bg-cyan-400/);
});
