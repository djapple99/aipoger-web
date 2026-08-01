import test from "node:test";
import assert from "node:assert/strict";

const {
  BATTLE_POINT_REWARDS,
  dropBattleRoleForChallengeTarget,
  dropBattleRoleLockMessage,
  canBattleEntriesMatch,
  isActiveDropQueueStatus,
  isSameDropBattleRole,
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

const {
  dailyChallengeSetupPath,
  dailyChallengeSharePath,
  dailyChallengeWaitingRoomPath,
  shortBattleCodeToUuid,
  uuidToShortBattleCode,
} = await import("../src/lib/short-battle-links.ts");

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

test("instant matching falls back to waiting challenge after 60 seconds", () => {
  const created = Date.UTC(2026, 4, 18, 12, 0, 0);
  assert.equal(shouldMoveToWaitingChallenge(created, created + 59_000), false);
  assert.equal(shouldMoveToWaitingChallenge(created, created + 60_000), true);
});

test("battle pool fallback runs after 24 hours", () => {
  const created = Date.UTC(2026, 4, 18, 12, 0, 0);
  assert.equal(shouldRunFallback(created, created + 23 * 60 * 60 * 1000), false);
  assert.equal(shouldRunFallback(created, created + 24 * 60 * 60 * 1000), true);
});

test("drop battle role locks allow one founder state plus one challenger state", () => {
  assert.equal(dropBattleRoleForChallengeTarget(null), "founder");
  assert.equal(dropBattleRoleForChallengeTarget("queue-founder"), "challenger");
  assert.equal(isSameDropBattleRole(null, "queue-founder"), false);
  assert.equal(isSameDropBattleRole("queue-a", null), false);
  assert.equal(isSameDropBattleRole(null, null), true);
  assert.equal(isSameDropBattleRole("queue-a", "queue-b"), true);
});

test("drop battle role locks only count active queue states", () => {
  for (const status of ["pending", "searching", "waiting", "waiting_challenge", "matched", "active"]) {
    assert.equal(isActiveDropQueueStatus(status), true);
  }
  for (const status of ["completed", "expired", "cancelled", "cancelled_founder", "finished", null]) {
    assert.equal(isActiveDropQueueStatus(status), false);
  }
});

test("drop battle role lock messages are role specific", () => {
  assert.match(dropBattleRoleLockMessage("founder", "zh"), /戰帖卡/);
  assert.match(dropBattleRoleLockMessage("challenger", "zh"), /接了一張/);
  assert.match(dropBattleRoleLockMessage("founder", "en"), /challenge card/);
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
      genre: "Band Rock 熱血搖滾",
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
    genre: "EDM 百大電音",
    status: "searching",
    level: 2,
  };

  assert.equal(
    canBattleEntriesMatch(
      challenger,
      {
        userId: "user-b",
        queueId: "queue-b",
        genre: "R&B 深情瞬間",
        status: "waiting_challenge",
        level: 2,
      },
      "queue-b",
    ),
    false,
  );
});

test("targeted challenge allows two different Drops from the same creator", () => {
  const challenger = {
    userId: "user-a",
    queueId: "queue-challenger",
    genre: "EDM 百大電音",
    status: "searching",
    level: 2,
  };
  const ownOpenCard = {
    userId: "user-a",
    queueId: "queue-founder",
    genre: "EDM 百大電音",
    status: "waiting_challenge",
    level: 2,
  };

  assert.equal(canBattleEntriesMatch(challenger, ownOpenCard, "queue-founder"), true);
  assert.equal(canBattleEntriesMatch(challenger, ownOpenCard), false);
  assert.equal(canBattleEntriesMatch(challenger, challenger, "queue-challenger"), false);
});

test("mobile auth can build Chrome open URLs for embedded browsers", () => {
  assert.equal(
    buildChromeOpenUrl("https://aipoger.com/auth?next=%2Fbattle", "Mozilla/5.0 (iPhone) Line/15.0"),
    "googlechromes://aipoger.com/auth?next=%2Fbattle",
  );
  assert.equal(
    buildChromeOpenUrl("https://aipoger.com/auth?next=%2Fbattle", "Mozilla/5.0 (Linux; Android 14) Line/15.0"),
    "intent://aipoger.com/auth?next=%2Fbattle#Intent;scheme=https;package=com.android.chrome;end",
  );
});

test("admin battle cancel ids accept UUID variants and unique short prefixes", () => {
  const queueRows = [
    { id: "c2264bf9-1111-7111-8111-111111111111" },
    { id: "d814690b-2222-4222-9222-222222222222" },
  ];

  assert.equal(isStandardUuid("c2264bf9-1111-7111-8111-111111111111"), true);
  assert.equal(isStandardUuid("d814690b-2222-4222-9222-222222222222"), true);
  assert.equal(cleanAdminTargetId("#c2264bf9"), "c2264bf9");
  assert.equal(resolveAdminTargetIdFromRows("#c2264bf9", queueRows), "c2264bf9-1111-7111-8111-111111111111");
  assert.equal(resolveAdminTargetIdFromRows("d814690b-2222-4222-9222-222222222222", []), "d814690b-2222-4222-9222-222222222222");
  assert.equal(resolveAdminTargetIdFromRows("missing", queueRows), null);
  assert.equal(resolveAdminTargetIdFromRows("c", [{ id: "c1111111-1111-4111-8111-111111111111" }, { id: "c2222222-2222-4222-9222-222222222222" }]), null);
});

test("daily battle share links use compact reversible ids", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  const short = encodeUuidToBase64Url(id);
  assert.equal(short.length, 22);
  assert.equal(short, "Ej5FZ-ibEtOkVkJmFBdAAA");
  assert.equal(decodeBase64UrlToUuid(short), id);
  assert.equal(decodeBase64UrlToUuid(id), id);
  assert.equal(decodeBase64UrlToUuid("not-a-valid-short-id"), null);
  assert.equal(dailyEntryShortPath(id, "zh"), "/d/Ej5FZ-ibEtOkVkJmFBdAAA?lang=zh");
  assert.equal(dailyBattleShortPath(id, "zh"), "/h/Ej5FZ-ibEtOkVkJmFBdAAA?lang=zh");
  assert.equal(battleShortPath(id, "zh"), "/b/Ej5FZ-ibEtOkVkJmFBdAAA?lang=zh");
  assert.equal(battleResultShortPath(id, "zh"), "/r/Ej5FZ-ibEtOkVkJmFBdAAA?lang=zh");
  assert.equal(listenBarShortPath("all", "zh"), "/l/all?lang=zh");
  assert.equal(listenBarShortPath("8", "zh"), "/l/8?lang=zh");
  assert.equal(listenBarShortPath("../listen-bar", "zh"), "/l/all?lang=zh");
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

test("Explore AI Music challenges keep defender tie advantage and a six invite daily cap", () => {
  assert.equal(AI_MUSIC_CHALLENGE_DAILY_INVITE_LIMIT, 6);
  assert.equal(AI_MUSIC_EXPLORE_FORMAL_LOSS_RETIREMENT_LIMIT, 8);
  assert.equal(AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET, 6);
  assert.equal(normalizeAiMusicChallengeStatus("open"), "open");
  assert.equal(normalizeAiMusicChallengeStatus("legacy-open"), "showcase");
  assert.equal(hasPreparedAiMusicDefenderDrop("battle-audio/defender.wav"), true);
  assert.equal(hasPreparedAiMusicDefenderDrop("  "), false);
  assert.equal(isAiMusicChallengeReady("open", "battle-audio/defender.wav"), true);
  assert.equal(isAiMusicChallengeReady("open", null), false);
  assert.equal(isAiMusicChallengeReady("showcase", "battle-audio/defender.wav"), false);
  assert.equal(
    pickDropBattleWinnerForRules({ fighter_a: 2, fighter_b: 2 }, "battle-with-tied-votes", "B", AI_MUSIC_CHALLENGE_BATTLE_TYPE),
    "fighter_a",
  );
  assert.equal(
    pickDropBattleWinnerForRules({ fighter_a: 1, fighter_b: 1 }, "battle-with-tied-votes", "B", "formal"),
    "fighter_b",
  );
  assert.equal(shouldRetireAiMusicTrackFromExplore({ officialLosses: 7, isShowtimeCertified: false }), false);
  assert.equal(shouldRetireAiMusicTrackFromExplore({ officialLosses: 8, isShowtimeCertified: false }), true);
  assert.equal(shouldRetireAiMusicTrackFromExplore({ officialLosses: 12, isShowtimeCertified: true }), false);
  assert.equal(shouldCertifyAiMusicTrackForShowtimeByDefense({ officialDefenseSuccesses: 5, isShowtimeCertified: false }), false);
  assert.equal(shouldCertifyAiMusicTrackForShowtimeByDefense({ officialDefenseSuccesses: 6, isShowtimeCertified: false }), true);
  assert.equal(shouldCertifyAiMusicTrackForShowtimeByDefense({ officialDefenseSuccesses: 9, isShowtimeCertified: true }), false);
  assert.equal(
    isAiMusicTrackChallengeableOnExplore("open", "battle-audio/defender.wav", { officialLosses: 0, isShowtimeCertified: false }),
    true,
  );
  assert.equal(
    isAiMusicTrackChallengeableOnExplore("open", "battle-audio/defender.wav", { officialLosses: 8, isShowtimeCertified: false }),
    false,
  );
  assert.equal(
    isAiMusicTrackChallengeableOnExplore("open", "battle-audio/defender.wav", { officialLosses: 0, isShowtimeCertified: true }),
    false,
  );
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

test("24H challenge share links stay short and route through waiting room", () => {
  const entryId = "123e4567-e89b-42d3-a456-426614174000";
  const code = uuidToShortBattleCode(entryId);

  assert.equal(code?.length, 22);
  assert.equal(shortBattleCodeToUuid(code), entryId);
  assert.equal(dailyChallengeSharePath(entryId, "zh"), `/d/${code}?lang=zh`);
  assert.equal(dailyChallengeWaitingRoomPath(entryId, "zh"), `/battle/daily/waiting-room/${entryId}?lang=zh`);
  assert.equal(
    dailyChallengeSetupPath(entryId, "zh"),
    `/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${entryId}&lang=zh`,
  );
});
