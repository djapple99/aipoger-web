import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migrationSource = source("../supabase/20260731_q_crash_async_drop_battle.sql");
const coverMigrationSource = source("../supabase/20260801055052_q_crash_work_covers.sql");
const feedbackMigrationSource = source("../supabase/20260731193000_q_crash_feedback.sql");
const commentMigrationSource = source("../supabase/20260731233000_q_crash_voter_comments.sql");
const battleStatsRepairMigrationSource = source("../supabase/20260731122043_battle_song_stats_runtime_dependencies.sql");
const battleStatsIndexMigrationSource = source("../supabase/20260731123402_battle_song_stats_fk_indexes.sql");
const poolRouteSource = source("../src/app/api/q-crash/route.ts");
const cardRouteSource = source("../src/app/api/q-crash/[id]/route.ts");
const voteRouteSource = source("../src/app/api/q-crash/[id]/vote/route.ts");
const feedbackRouteSource = source("../src/app/api/q-crash/[id]/feedback/route.ts");
const commentRouteSource = source("../src/app/api/q-crash/[id]/comments/route.ts");
const guestVoteRouteSource = source("../src/app/api/battle-pool/guest-vote/route.ts");
const cancelCurrentRouteSource = source("../src/app/api/battle-pool/cancel-current/route.ts");
const settlementSource = source("../src/lib/server-q-crash.ts");
const fallbackSource = source("../src/app/api/battle-pool/process-fallbacks/route.ts");
const hookCutSource = source("../src/app/battle/hook-cut/page.tsx");
const qCrashNewSource = source("../src/app/battle/q-crash/new/page.tsx");
const qCrashPageSource = source("../src/app/battle/q-crash/[id]/page.tsx");
const cardClientSource = source("../src/components/q-crash-card-client.tsx");
const battlePoolSource = source("../src/app/battle/page.tsx");
const battlePageSource = source("../src/app/battle/[id]/page.tsx");
const qCrashRulesSource = source("../src/lib/q-crash-rules.ts");
const globalStylesSource = source("../src/app/globals.css");
const productRulesSource = source("../docs/aipoger-product-rules.md");
const analyticsRouteSource = source("../src/app/api/admin/analytics/route.ts");
const analyticsPageSource = source("../src/app/admin/analytics/page.tsx");

test("Q Crash migration seals votes and enforces 60-second Drops", () => {
  assert.ok(migrationSource.includes("drop_duration_seconds > 0 and drop_duration_seconds <= 60"));
  assert.ok(migrationSource.includes("q_crash_votes_one_account_per_battle unique (battle_id, user_id)"));
  assert.ok(migrationSource.includes("revoke all on table public.q_crash_votes from anon, authenticated"));
  assert.ok(migrationSource.includes("block_unsealed_q_crash_battle_votes"));
  assert.ok(migrationSource.includes("Q Crash votes must use the sealed server vote route"));
});

test("Q Crash stores work-specific covers and keeps a profile fallback", () => {
  assert.ok(coverMigrationSource.includes("add column if not exists cover_url text"));
  assert.ok(qCrashNewSource.includes("作品封面（選填）"));
  assert.ok(qCrashNewSource.includes("MAX_Q_CRASH_COVER_BYTES"));
  assert.ok(hookCutSource.includes("cover_url: coverUrl.trim()"));
  assert.ok(poolRouteSource.includes("queueA.cover_url"));
  assert.ok(cardRouteSource.includes("queueA.cover_url"));
  assert.ok(cardClientSource.includes("這兩首歌到底哪首比較好聽啊？我有點選不出來！"));
  assert.ok(battlePoolSource.includes("幫我選一下："));
});

test("Q Crash uses Traditional Chinese only for zh and English for every other language", () => {
  assert.ok(qCrashRulesSource.includes('return value === null || value === undefined || value === "zh" ? "zh" : "en";'));
  assert.ok(qCrashNewSource.includes("qCrashDisplayLang(searchParams.get(\"lang\"))"));
  assert.ok(cardClientSource.includes("qCrashDisplayLang(searchParams.get(\"lang\"))"));
  assert.ok(battlePoolSource.includes("const displayLang = qCrashDisplayLang(lang);"));
  assert.ok(qCrashPageSource.includes("Q Crash | AIPOGER Async Drop Battle"));
  assert.ok(qCrashPageSource.includes("Which song sounds better? I can't decide!"));
  assert.ok(battlePageSource.includes("const isZh = qCrashDisplayLang(rawLang) === \"zh\";"));
});

test("Q Crash API returns tallies only after the card reaches a final state", () => {
  assert.ok(
    cardRouteSource.includes(
      'const isFinal = card.status === "q_crash_finished" || card.status === "q_crash_insufficient";',
    ),
  );
  assert.match(cardRouteSource, /if \(isFinal && card\.battle_id\)[\s\S]*?from\("q_crash_votes"\)/);
  assert.match(cardRouteSource, /result: isFinal[\s\S]*?counts,[\s\S]*?audienceCount/);
  assert.equal(voteRouteSource.includes("counts:"), false);
  assert.ok(voteRouteSource.includes("結果將在截止後公開"));
  assert.ok(cardRouteSource.includes("battle?.audio_a_path || queueA.audio_path"));
  assert.ok(cardRouteSource.includes("battle?.audio_b_path || queueB.audio_path"));
});

test("Q Crash feedback is immutable, server-only, and aggregate-sealed", () => {
  assert.ok(feedbackMigrationSource.includes("q_crash_feedback_one_per_work_key unique (battle_id, user_id, queue_id, feedback_key)"));
  assert.ok(feedbackMigrationSource.includes("revoke all on table public.q_crash_feedback from anon, authenticated"));
  assert.ok(feedbackMigrationSource.includes("security invoker"));
  assert.ok(feedbackMigrationSource.includes("set search_path = ''"));
  assert.ok(feedbackMigrationSource.includes("trg_reject_q_crash_feedback_changes"));
  assert.ok(feedbackMigrationSource.includes("Q Crash feedback is immutable"));
  assert.ok(feedbackRouteSource.includes('if (!token) return jsonError("請先登入再送出評分。", 401)'));
  assert.ok(feedbackRouteSource.includes("作品持有人不能替自己的 Q Crash 送出評分"));
  assert.ok(feedbackRouteSource.includes("每首作品的每一項只能點一次"));
  assert.equal(feedbackRouteSource.includes("counts:"), false);
  assert.match(cardRouteSource, /if \(viewer && card\.battle_id\)[\s\S]*?eq\("user_id", viewer\.id\)/);
  assert.match(cardRouteSource, /if \(isFinal && card\.battle_id\)[\s\S]*?if \(card\.status === "q_crash_finished"\)[\s\S]*?from\("q_crash_feedback"\)/);
});

test("Battle Pool renders one grouped Q Crash card and removes its two queue rows", () => {
  assert.ok(poolRouteSource.includes('from("q_crash_cards")'));
  assert.ok(poolRouteSource.includes("await settleQCrashBattle(admin, card.battle_id, nowMs)"));
  assert.ok(poolRouteSource.includes("visibleCards.push(card)"));
  assert.ok(poolRouteSource.includes("queueIds: [queueA.id, queueB?.id ?? null]"));
  assert.ok(battlePoolSource.includes("function QCrashPoolMatchCard"));
  assert.ok(battlePoolSource.includes("qCrashQueueIds.has(row.id)"));
  assert.ok(battlePoolSource.includes("Q CRASH · ONE BATTLE"));
  assert.ok(battlePoolSource.includes("Q CRASH MATCHUPS"));
  assert.ok(battlePoolSource.includes("Q Crash 對戰卡"));
  assert.match(battlePoolSource, /q-crash-matchups[\s\S]*?qCrashCards\.map[\s\S]*?drop-battle-pool/);
});

test("Battle Pool keeps Q Crash cyan, Drop Battle red, and solid actions dark", () => {
  assert.ok(battlePoolSource.includes('<BattlePanelLabel tone="cyan">Q CRASH</BattlePanelLabel>'));
  assert.ok(battlePoolSource.includes('<BattlePanelLabel tone="cyan" wide>Q CRASH MATCHUPS</BattlePanelLabel>'));
  assert.ok(battlePoolSource.includes('<BattlePanelLabel tone="red" wide>60S DROP BATTLE POOL</BattlePanelLabel>'));
  assert.ok(battlePoolSource.includes("q-crash-solid-cta"));
  assert.ok(battlePoolSource.includes("drop-battle-solid-cta"));
  assert.match(globalStylesSource, /\.q-crash-solid-cta \{[\s\S]*?color: #020708 !important;/);
  assert.match(globalStylesSource, /\.drop-battle-solid-cta \{[\s\S]*?color: #160604 !important;/);
});

test("Q Crash voter comments require a vote and stay sealed until settlement", () => {
  assert.ok(commentMigrationSource.includes("q_crash_comments_one_per_voter unique (battle_id, user_id)"));
  assert.ok(commentMigrationSource.includes("references public.q_crash_votes(battle_id, user_id)"));
  assert.ok(commentMigrationSource.includes("char_length(body) between 1 and 120"));
  assert.ok(commentMigrationSource.includes("revoke all on table public.q_crash_comments from anon, authenticated"));
  assert.ok(commentRouteSource.includes('from("q_crash_votes")'));
  assert.ok(commentRouteSource.includes("完成投票後，才可以留下"));
  assert.match(commentRouteSource, /const revealed = isFinalQCrash[\s\S]*?revealed \?[\s\S]*?moderation_status/);
  assert.match(commentRouteSource, /comments: revealed \? mapped : \[\]/);
  assert.ok(cardClientSource.includes("投票期間只看得到自己的留言"));
  assert.ok(cardClientSource.includes("會在截止時與結果一起公開"));
});

test("Q Crash voting requires sign-in, excludes participants, and cannot be changed", () => {
  assert.ok(voteRouteSource.includes('if (!token) return jsonError("請先登入再投票。", 401)'));
  assert.ok(voteRouteSource.includes("作品持有人不能替自己的 Q Crash 投票"));
  assert.ok(voteRouteSource.includes("Q Crash 不提供改票"));
  assert.ok(voteRouteSource.includes('body.confirmed !== true'));
  assert.ok(voteRouteSource.includes('請按「確定送出」完成投票'));
  assert.ok(cardClientSource.includes('body: JSON.stringify({ votedFor, confirmed: true })'));
  assert.ok(cardClientSource.includes('確定送出作品'));
  assert.ok(cardClientSource.includes('送出前可繼續重播、快轉或改選；送出後無法更改。'));
  assert.ok(cardClientSource.includes('登入並投作品'));
  assert.ok(cardClientSource.includes('bottom-[9.5rem] md:bottom-[6.75rem]'));
  assert.ok(guestVoteRouteSource.includes('battle.battle_type === "q_crash"'));
});

test("Q Crash engagement funnel stays owner-only and does not change voting eligibility", () => {
  assert.ok(cardClientSource.includes('trackStage("open")'));
  assert.ok(cardClientSource.includes('trackStage("listen_qualified", side)'));
  assert.ok(cardClientSource.includes('listenSecondsRef.current[side] < 5'));
  assert.ok(cardClientSource.includes('trackStage("submitted"'));
  assert.ok(analyticsRouteSource.includes("function qCrashFunnel"));
  assert.ok(analyticsRouteSource.includes("listenedNoVote"));
  assert.ok(analyticsPageSource.includes("Owner 私有估算"));
  assert.ok(analyticsPageSource.includes("聽完未投"));
});

test("Q Crash settlement archives only official results and stores the winning work", () => {
  const insufficientIndex = settlementSource.indexOf("if (!isQCrashOfficialAudienceCount(audienceCount))");
  const archiveIndex = settlementSource.indexOf('admin.rpc("archive_battle_result"');
  assert.ok(insufficientIndex >= 0);
  assert.ok(archiveIndex > insufficientIndex);
  assert.ok(settlementSource.includes('status: "q_crash_insufficient"'));
  assert.ok(settlementSource.includes('status: "q_crash_finished"'));
  assert.ok(settlementSource.includes("winner_queue_id: winnerQueueId"));
  assert.ok(settlementSource.includes("feedbackA: feedbackCounts.A"));
  assert.ok(settlementSource.includes("feedbackB: feedbackCounts.B"));
  assert.ok(settlementSource.includes("不產生正式勝負、不進 Showtime"));
});

test("Q Crash production archive dependencies exist without backfilling under-threshold history", () => {
  assert.ok(battleStatsRepairMigrationSource.includes("create table if not exists public.battle_song_stats"));
  assert.ok(battleStatsRepairMigrationSource.includes("create table if not exists public.battle_song_stat_events"));
  assert.ok(battleStatsRepairMigrationSource.includes("record_battle_song_stats_for_battle"));
  assert.ok(battleStatsRepairMigrationSource.includes("winner_song_stats_id"));
  assert.ok(battleStatsRepairMigrationSource.includes("winner_song_honor_board_count"));
  assert.ok(battleStatsRepairMigrationSource.includes("intentionally does not backfill historical"));
  assert.equal(battleStatsRepairMigrationSource.includes("update public.battle_queue q"), false);
  assert.equal(battleStatsRepairMigrationSource.includes("from public.battle_result_archives a"), false);
  assert.ok(battleStatsIndexMigrationSource.includes("battle_song_stats_latest_battle_id_idx"));
});

test("legacy live Drop Battle fallback cannot archive Q Crash through the old path", () => {
  assert.match(
    fallbackSource,
    /\.eq\("status", "finished"\)[\s\S]*?\.neq\("battle_type", "q_crash"\)[\s\S]*?\.is\("result_archived_at", null\)/,
  );
  assert.ok(fallbackSource.includes('settleQCrashBattle(admin, row.id'));
});

test("generic queue cancellation synchronizes pending Q Crash and protects started cards", () => {
  assert.ok(cancelCurrentRouteSource.includes('from("q_crash_cards")'));
  assert.ok(cancelCurrentRouteSource.includes("Q Crash 投票開始後不能取消"));
  assert.ok(cancelCurrentRouteSource.includes('status: "q_crash_cancelled"'));
});

test("Q Crash reuses the Drop cutter and keeps the sealed-vote presentation", () => {
  assert.ok(hookCutSource.includes("searchParams.get('qCrashCreate')"));
  assert.ok(hookCutSource.includes("searchParams.get('qCrashCardId')"));
  assert.ok(hookCutSource.includes("/api/q-crash/"));
  assert.ok(cardClientSource.includes("截止前不顯示票數、評分總和或領先作品"));
  assert.ok(cardClientSource.includes('className="fixed inset-x-3 bottom-3'));
  assert.ok(cardClientSource.includes("勝出作品五角評分分布"));
  assert.ok(cardClientSource.includes("歌詞未提供"));
  assert.ok(cardClientSource.includes("battleShortPath(payload.card.battleId, lang)"));
});

test("product rules lock the asynchronous Q Crash contract", () => {
  for (const phrase of [
    "Q Crash",
    "`30 minutes`, `2 hours` (default), `6 hours`, and `24 hours`",
    "At least 3 establishes an official Drop Battle result",
    "Work owners cannot vote",
    "Selecting work A or B is a reversible client-side draft",
    "No visitor, participant, or host may see counts",
    "Each of the five feedback keys",
    "one comment of at most 120 characters",
    "Battle Pool renders one Q Crash matchup card",
    "does not open the live rematch window",
  ]) {
    assert.ok(productRulesSource.includes(phrase), `missing product rule: ${phrase}`);
  }
});
