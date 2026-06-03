import test from "node:test";
import assert from "node:assert/strict";

const {
  BATTLE_POINT_REWARDS,
  canBattleEntriesMatch,
  battleStakeForLevel,
  publicVotingReward,
  rankForWins,
  shouldMoveToWaitingChallenge,
  shouldRunFallback,
} = await import("../src/lib/battle-pool-rules.ts");

const {
  WAITING_ROOM_SECONDS,
  TEASER_SECONDS,
  APC_SUPPORT_MAX,
  APC_CORRECT_FINAL_VOTE_REWARD,
  predictionPercentages,
  predictionRewardForStake,
  secondsUntilBattleStart,
  viewerLevelForXp,
  eloDeltaForBattle,
  firstDeckForBattleId,
  pick90sBattleWinner,
} = await import("../src/lib/battle-90s-system.ts");

const {
  DAILY_BATTLE_ACTIVE_LIMIT,
  DAILY_BATTLE_DURATION_HOURS,
  canSubmitDailyBattle,
  dailyBattleActiveCountForUser,
} = await import("../src/lib/daily-battle-rules.ts");

test("battle economy uses stake based rewards", () => {
  assert.equal(BATTLE_POINT_REWARDS.stageOneStake, 200);
  assert.equal(BATTLE_POINT_REWARDS.stageTwoStake, 300);
  assert.equal(BATTLE_POINT_REWARDS.stageThreeStake, 500);
  assert.equal(BATTLE_POINT_REWARDS.audienceVoteStake, 50);
  assert.equal(BATTLE_POINT_REWARDS.audienceVoteWinPayout, 100);
  assert.equal(BATTLE_POINT_REWARDS.abandonPenalty, -50);
});

test("public voting reward is clamped to the 5 to 30 point range", () => {
  assert.equal(publicVotingReward(-20), BATTLE_POINT_REWARDS.publicVotingMin);
  assert.equal(publicVotingReward(18.4), 18);
  assert.equal(publicVotingReward(99), BATTLE_POINT_REWARDS.publicVotingMax);
});

test("rank thresholds follow AIPOGER stage ladder", () => {
  assert.deepEqual(
    [0, 10, 20, 40, 60, 80, 100, 150, 200, 250].map((wins) => rankForWins(wins).level),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(rankForWins(39).level, 3);
  assert.equal(rankForWins(149).level, 7);
  assert.equal(rankForWins(249).level, 9);
});

test("battle stake follows rank stage", () => {
  assert.equal(battleStakeForLevel(1), 200);
  assert.equal(battleStakeForLevel(3), 200);
  assert.equal(battleStakeForLevel(4), 300);
  assert.equal(battleStakeForLevel(7), 300);
  assert.equal(battleStakeForLevel(8), 500);
  assert.equal(battleStakeForLevel(10), 500);
});

test("instant matching falls back to waiting challenge after 30 seconds", () => {
  const created = Date.UTC(2026, 4, 18, 12, 0, 0);
  assert.equal(shouldMoveToWaitingChallenge(created, created + 29_000), false);
  assert.equal(shouldMoveToWaitingChallenge(created, created + 30_000), true);
});

test("battle pool fallback runs after 24 hours", () => {
  const created = Date.UTC(2026, 4, 18, 12, 0, 0);
  assert.equal(shouldRunFallback(created, created + 23 * 60 * 60 * 1000), false);
  assert.equal(shouldRunFallback(created, created + 24 * 60 * 60 * 1000), true);
});

test("battle entries only match the same genre", () => {
  const challenger = {
    userId: "user-a",
    queueId: "queue-a",
    genre: "流行舞曲",
    status: "searching",
    level: 3,
  };

  assert.equal(
    canBattleEntriesMatch(challenger, {
      userId: "user-b",
      queueId: "queue-b",
      genre: "流行舞曲",
      status: "waiting_challenge",
      level: 4,
    }),
    true,
  );

  assert.equal(
    canBattleEntriesMatch(challenger, {
      userId: "user-c",
      queueId: "queue-c",
      genre: "熱血搖滾",
      status: "waiting_challenge",
      level: 3,
    }),
    false,
  );
});

test("targeted challenge still requires the same genre", () => {
  const challenger = {
    userId: "user-a",
    queueId: "queue-a",
    genre: "動感電音",
    status: "searching",
    level: 2,
  };

  assert.equal(
    canBattleEntriesMatch(
      challenger,
      {
        userId: "user-b",
        queueId: "queue-b",
        genre: "感人抒情",
        status: "waiting_challenge",
        level: 2,
      },
      "queue-b",
    ),
    false,
  );
});

test("legacy waiting room countdown is disabled for direct arena flow", () => {
  const start = Date.UTC(2026, 4, 21, 12, 0, 0);
  assert.equal(WAITING_ROOM_SECONDS, 0);
  assert.equal(TEASER_SECONDS, 5);
  assert.equal(secondsUntilBattleStart(start, start), 0);
  assert.equal(secondsUntilBattleStart(start, start + 45_200), 0);
  assert.equal(secondsUntilBattleStart(start, start + 120_000), 0);
});

test("prediction percentages default evenly and split by support count", () => {
  assert.deepEqual(predictionPercentages({ fighter_a: 0, fighter_b: 0 }), { fighter_a: 50, fighter_b: 50 });
  assert.deepEqual(predictionPercentages({ fighter_a: 7, fighter_b: 3 }), { fighter_a: 70, fighter_b: 30 });
});

test("90s battle creates no contest without votes, but resolves tied audience votes", () => {
  assert.equal(pick90sBattleWinner({ fighter_a: 3, fighter_b: 1 }, "battle-a"), "fighter_a");
  assert.equal(pick90sBattleWinner({ fighter_a: 1, fighter_b: 4 }, "battle-b"), "fighter_b");
  assert.equal(pick90sBattleWinner({ fighter_a: 0, fighter_b: 0 }, "battle-with-no-votes"), null);

  const tieBreaker = firstDeckForBattleId("battle-with-tied-votes") === "B" ? "fighter_b" : "fighter_a";
  assert.equal(pick90sBattleWinner({ fighter_a: 2, fighter_b: 2 }, "battle-with-tied-votes"), tieBreaker);
  assert.equal(pick90sBattleWinner({ fighter_a: 1, fighter_b: 1 }, "battle-with-tied-votes", "B"), "fighter_b");
});

test("prediction rewards stay platform-points only", () => {
  assert.equal(APC_SUPPORT_MAX, 88);
  assert.equal(APC_CORRECT_FINAL_VOTE_REWARD, 100);
  assert.equal(predictionRewardForStake(88, true), 100);
  assert.equal(predictionRewardForStake(250, true), 0);
  assert.equal(predictionRewardForStake(88, false), 0);
});

test("viewer levels and ELO helper are deterministic", () => {
  assert.equal(viewerLevelForXp(0).title, "Rookie Listener");
  assert.equal(viewerLevelForXp(120).title, "Drop Analyst");
  assert.equal(viewerLevelForXp(900).title, "Battle Oracle");
  assert.equal(eloDeltaForBattle(1200, 1200), 16);
});

test("24H Full Song allows only one active entry per user", () => {
  assert.equal(DAILY_BATTLE_DURATION_HOURS, 24);
  assert.equal(DAILY_BATTLE_ACTIVE_LIMIT, 1);

  const entries = [
    { userId: "user-a", status: "queued" },
    { userId: "user-a", status: "finished" },
    { userId: "user-a", status: "cancelled" },
    { userId: "user-b", status: "live" },
  ];

  assert.equal(dailyBattleActiveCountForUser(entries, "user-a"), 1);
  assert.equal(canSubmitDailyBattle(entries, "user-a"), false);
  assert.equal(canSubmitDailyBattle([{ userId: "user-a", status: "finished" }], "user-a"), true);
});
