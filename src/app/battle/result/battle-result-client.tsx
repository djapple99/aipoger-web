"use client";

import Link from "next/link";
import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ShareButton from "@/components/share-button";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import {
  parseBattleFeedbackParam,
  sanitizeBattleFeedbackCounts,
  looksLikeOpaqueArchiveValue,
  stripCannedBattleReview,
  upsertArchivedBattleResult,
  type ArchivedBattleResult,
  type BattleFeedbackCounts,
  type BattleFeedbackKey,
} from "@/lib/battle-result-archive";
import { completeBattleCardIntent } from "@/lib/battle-pool-client";
import { DROP_BATTLE_OFFICIAL_AUDIENCE_MIN, isOfficialDropBattleResult } from "@/lib/drop-battle-rematch";
import { supabase } from "@/lib/supabase";

type SkillKey = BattleFeedbackKey;
type BattleWinnerSide = "fighter_a" | "fighter_b";

type HookSkill = {
  key: SkillKey;
  label: string;
  state: string;
  value: number;
};

const aipogerLogo = AIPOGER_BRAND_LOGO;
const fallbackCover = AIPOGER_BRAND_LOGO;
const fallbackAvatar = AIPOGER_BRAND_LOGO;
const fallbackWinnerAvatar = AIPOGER_BRAND_LOGO;

const feedbackSkillLabels: Record<"zh" | "en", Record<SkillKey, string>> = {
  zh: {
    rhyme: "押韻",
    impact: "爆點",
    melody: "旋律",
    emotion: "情緒",
    structure: "結構",
  },
  en: {
    rhyme: "Rhyme",
    impact: "Impact",
    melody: "Melody",
    emotion: "Emotion",
    structure: "Structure",
  },
};

const feedbackSkillOrder: SkillKey[] = ["rhyme", "impact", "melody", "emotion", "structure"];

function pointsForSkills(skills: HookSkill[], cx: number, cy: number, maxRadius: number) {
  return skills
    .map((skill, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / skills.length;
      const radius = maxRadius * (skill.value / 100);
      return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
    })
    .join(" ");
}

function gridPoints(count: number, cx: number, cy: number, radius: number) {
  return Array.from({ length: count })
    .map((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
    })
    .join(" ");
}

function labelPoint(index: number, count: number, cx: number, cy: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function percentParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function winnerSideParam(value: string | null): BattleWinnerSide | null {
  const clean = value?.trim();
  return clean === "fighter_a" || clean === "fighter_b" ? clean : null;
}

function cleanParam(value: string | null) {
  return value?.trim() ?? "";
}

function cleanSongParam(value: string | null) {
  const text = cleanParam(value);
  return looksLikeOpaqueArchiveValue(text) ? "" : text;
}

function archivePayload(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function textFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function archivedResultFromRow(row: Record<string, unknown>): ArchivedBattleResult {
  const payload = archivePayload(row.result_payload);
  return {
    id: textFrom(row.battle_id) || textFrom(row.battle_code),
    battleId: textFrom(row.battle_id) || null,
    battleCode: textFrom(row.battle_code),
    winnerSide: winnerSideParam(textFrom(row.winner)),
    winnerName: textFrom(row.winner_name),
    winnerSong: textFrom(row.winner_song_name),
    opponentName: textFrom(row.opponent_name),
    opponentSong: textFrom(row.opponent_song_name),
    rank: textFrom(payload.rank),
    tool: textFrom(row.winner_ai_tool) || textFrom(payload.tool),
    genre: textFrom(payload.genre) || "AI Music",
    coverUrl: textFrom(payload.coverUrl),
    avatarUrl: textFrom(payload.avatarUrl),
    opponentCoverUrl: textFrom(payload.opponentCoverUrl) || null,
    opponentAvatarUrl: textFrom(payload.opponentAvatarUrl) || null,
    finalVoteLeft: numberParam(String(row.final_vote_left ?? ""), 0),
    finalVoteRight: numberParam(String(row.final_vote_right ?? ""), 0),
    votesTotal: numberParam(String(payload.votesTotal ?? row.total_votes ?? ""), 0),
    audienceCount: numberParam(String(payload.audienceCount ?? row.total_votes ?? ""), 0),
    officialAudienceMin: numberParam(String(payload.officialAudienceMin ?? DROP_BATTLE_OFFICIAL_AUDIENCE_MIN), DROP_BATTLE_OFFICIAL_AUDIENCE_MIN),
    audienceReview: textFrom(row.audience_review) || textFrom(payload.audienceReview),
    aiReview: textFrom(payload.aiReview),
    feedbackA: sanitizeBattleFeedbackCounts(payload.feedbackA),
    feedbackB: sanitizeBattleFeedbackCounts(payload.feedbackB),
    resultHref: textFrom(payload.resultHref),
    createdAt: textFrom(row.archived_at) || new Date().toISOString(),
  };
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function skillsFromFeedback(counts: BattleFeedbackCounts, lang: string): HookSkill[] {
  const labelLang = lang === "zh" ? "zh" : "en";
  const total = feedbackSkillOrder.reduce((sum, key) => sum + counts[key], 0);
  if (total === 0) return feedbackSkillOrder.map((key) => ({ key, label: feedbackSkillLabels[labelLang][key], state: "", value: 0 }));

  const max = Math.max(...feedbackSkillOrder.map((key) => counts[key]), 1);
  return feedbackSkillOrder.map((key, index) => {
    const value = counts[key];
    const score = value === 0 ? 42 + index * 3 : Math.min(98, 54 + Math.round((value / max) * 42));
    return {
      key,
      label: feedbackSkillLabels[labelLang][key],
      state: "",
      value: score,
    };
  });
}

function SkillRadar({
  skills,
  className = "max-w-[152px]",
  compactLabels = false,
}: {
  skills: HookSkill[];
  className?: string;
  compactLabels?: boolean;
}) {
  const radarId = useId().replace(/:/g, "");
  const glowId = `radarGlow-${radarId}`;
  const lineId = `radarLine-${radarId}`;
  const cx = 150;
  const cy = 150;
  const maxRadius = 92;
  const labelRadius = maxRadius + (compactLabels ? 2 : 32);
  const shapePoints = pointsForSkills(skills, cx, cy, maxRadius);
  const rings = [0.38, 0.68, 1];

  return (
    <div className={`relative mx-auto aspect-square w-full ${className}`}>
      <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" role="img" aria-label="Drop 五角技能圖">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="56%">
            <stop offset="0%" stopColor="#ff8a24" stopOpacity="0.72" />
            <stop offset="58%" stopColor="#ff5a16" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#00c8ff" stopOpacity="0.1" />
          </radialGradient>
          <linearGradient id={lineId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffb15c" />
            <stop offset="55%" stopColor="#ff5a16" />
            <stop offset="100%" stopColor="#35dcff" />
          </linearGradient>
        </defs>

        {rings.map((ring) => (
          <polygon
            key={ring}
            points={gridPoints(skills.length, cx, cy, maxRadius * ring)}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
        ))}
        {skills.map((_, index) => {
          const end = labelPoint(index, skills.length, cx, cy, maxRadius);
          return <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.11)" strokeWidth="1" />;
        })}
        <polygon points={shapePoints} fill={`url(#${glowId})`} stroke={`url(#${lineId})`} strokeWidth="4" strokeLinejoin="round" />
        {skills.map((skill, index) => {
          const label = labelPoint(index, skills.length, cx, cy, labelRadius);
          return (
            <g key={skill.key}>
              <text
                x={label.x}
                y={label.y + 4}
                textAnchor="middle"
                className={compactLabels ? "fill-white text-[13px] font-black drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]" : "fill-white text-[15px] font-black"}
              >
                {skill.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BattleSideCard({
  role,
  name,
  song,
  avatarUrl,
  coverUrl,
  tone,
}: {
  role: string;
  name: string;
  song: string;
  avatarUrl: string;
  coverUrl: string;
  tone: "orange" | "cyan";
}) {
  const toneClasses =
    tone === "orange"
      ? "border-orange-300/25 bg-orange-500/[0.08] text-orange-100"
      : "border-cyan-200/25 bg-cyan-400/[0.08] text-cyan-100";
  const ringClass = tone === "orange" ? "ring-orange-300/55" : "ring-cyan-200/55";

  return (
    <div className={`min-w-0 rounded-[1rem] border p-2 min-[420px]:p-2.5 ${toneClasses}`}>
      <div className="flex min-w-0 items-center gap-1.5 min-[420px]:gap-2">
        <div className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black ring-2 min-[420px]:h-10 min-[420px]:w-10 ${ringClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={`${name} avatar`}
            className="h-full w-full object-cover"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackAvatar)) return;
              event.currentTarget.src = fallbackAvatar;
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.5rem] font-black text-zinc-500 min-[420px]:text-[0.54rem]">{role}</p>
          <p className="truncate text-[0.72rem] font-black leading-tight text-white min-[420px]:text-[0.78rem]">{name}</p>
          <p className="truncate text-[0.58rem] font-bold leading-tight text-zinc-500 min-[420px]:text-[0.62rem]">{song}</p>
        </div>
        <div className="hidden h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black min-[420px]:block min-[420px]:h-10 min-[420px]:w-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={`${song} cover`}
            className="h-full w-full object-cover"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackCover)) return;
              event.currentTarget.src = fallbackCover;
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LaurelBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 54 46"
      className={`h-10 w-12 text-[#f7d486] drop-shadow-[0_0_12px_rgba(255,180,70,0.44)] ${flip ? "scale-x-[-1]" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M45 39C25 37.5 12.2 26.4 8.5 7.5"
        stroke="url(#laurelGold)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {[
        "M36.5 35.2c-3.5-4.4-8.6-6.3-14.8-5.7 3.6 4.8 8.6 6.7 14.8 5.7Z",
        "M29.5 31.2c-2.7-5.1-7.1-8-13.1-8.5 2.6 5.5 7.1 8.4 13.1 8.5Z",
        "M23.8 25.8c-1.4-5.4-4.8-9.1-10.1-11.1 1.2 5.9 4.6 9.6 10.1 11.1Z",
        "M19.6 19.1c-.1-5.2-2.2-9.3-6.5-12.5-.3 5.7 1.9 9.9 6.5 12.5Z",
        "M16.4 34.8c-4.8 1.6-9.2 1-13.2-1.7 5.2-2.2 9.6-1.7 13.2 1.7Z",
      ].map((path) => (
        <path key={path} d={path} fill="url(#laurelGold)" />
      ))}
      <defs>
        <linearGradient id="laurelGold" x1="8" x2="45" y1="6" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff2b7" />
          <stop offset="0.38" stopColor="#f7c45b" />
          <stop offset="0.72" stopColor="#b56b16" />
          <stop offset="1" stopColor="#ffe59a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WinnerLaurelBadge() {
  return (
    <div className="mx-auto mt-1.5 flex w-fit items-center justify-center gap-1.5 rounded-full border border-[#e8ad45]/55 bg-[linear-gradient(180deg,rgba(58,31,4,0.82),rgba(0,0,0,0.78))] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,239,190,0.24),0_0_32px_rgba(255,142,24,0.38)]">
      <LaurelBranch />
      <div className="relative min-w-[6.8rem] text-center">
        <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px bg-gradient-to-r from-transparent via-[#ffd887]/55 to-transparent" />
        <p className="text-[0.56rem] font-black tracking-[0.26em] text-[#d38a25]">BATTLE</p>
        <p
          className="bg-[linear-gradient(180deg,#fff0a9_0%,#f2b233_24%,#8f4608_50%,#f5c35b_76%,#5c2b05_100%)] bg-clip-text text-[1.5rem] font-black italic leading-[0.92] tracking-[0.09em] text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.92)]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            WebkitTextStroke: "0.72px rgba(255,219,112,0.86)",
            textShadow: "0 0 10px rgba(255,166,42,0.6), 0 2px 0 rgba(0,0,0,0.92)",
          }}
        >
          WINNER
        </p>
      </div>
      <LaurelBranch flip />
    </div>
  );
}

function BattleResultContent() {
  const { lang, t } = useI18n();
  const searchParams = useSearchParams();
  const [remoteArchive, setRemoteArchive] = useState<ArchivedBattleResult | null>(null);
  const [databaseWinnerSide, setDatabaseWinnerSide] = useState<BattleWinnerSide | null>(null);
  const [databaseWinnerChecked, setDatabaseWinnerChecked] = useState(false);
  const battleIdParam = cleanParam(searchParams.get("battleId")) || null;
  const missingText = lang === "zh" ? "未封存" : "Not Archived";
  const missingSongText = lang === "zh" ? "尚未封存歌名" : "Song Not Archived";
  const winnerNameRaw = cleanParam(searchParams.get("winner")) || remoteArchive?.winnerName || "";
  const winnerSongRaw = cleanSongParam(searchParams.get("song")) || remoteArchive?.winnerSong || "";
  const opponentNameRaw = cleanParam(searchParams.get("opponent")) || remoteArchive?.opponentName || "";
  const opponentSongRaw = cleanSongParam(searchParams.get("opponentSong")) || remoteArchive?.opponentSong || "";
  const winnerName = winnerNameRaw || missingText;
  const winnerSong = winnerSongRaw || missingSongText;
  const opponentName = opponentNameRaw || missingText;
  const opponentSong = opponentSongRaw || missingSongText;
  const rank = cleanParam(searchParams.get("rank")) || remoteArchive?.rank || "";
  const displayRank = winnerName === "愛波哥" ? "LV.0 掃地僧" : rank;
  const displayRankText = displayRank || (lang === "zh" ? "尚無段位" : "Rank Pending");
  const tool = cleanParam(searchParams.get("tool")) || remoteArchive?.tool || "";
  const displayTool = tool || (lang === "zh" ? "工具未填" : "Tool Missing");
  const coverUrlRaw = cleanParam(searchParams.get("coverUrl")) || remoteArchive?.coverUrl || "";
  const avatarUrlRaw = cleanParam(searchParams.get("avatarUrl")) || remoteArchive?.avatarUrl || "";
  const opponentCoverUrlRaw = cleanParam(searchParams.get("opponentCoverUrl")) || remoteArchive?.opponentCoverUrl || "";
  const opponentAvatarUrlRaw = cleanParam(searchParams.get("opponentAvatarUrl")) || remoteArchive?.opponentAvatarUrl || "";
  const coverUrl = coverUrlRaw || fallbackCover;
  const avatarUrl = avatarUrlRaw || fallbackWinnerAvatar;
  const opponentCoverUrl = opponentCoverUrlRaw || fallbackCover;
  const opponentAvatarUrl = opponentAvatarUrlRaw || fallbackAvatar;
  const battleCode = cleanParam(searchParams.get("battle")) || remoteArchive?.battleCode || "";
  const battleId = battleIdParam || remoteArchive?.battleId || null;
  const displayBattleCode = battleCode || (lang === "zh" ? "未封存編號" : "No Archived ID");
  const explicitWinnerSide = winnerSideParam(searchParams.get("winnerSide"));
  const remoteWinnerSide = remoteArchive?.winnerSide ?? null;
  const winnerSide = databaseWinnerSide ?? explicitWinnerSide ?? remoteWinnerSide;
  const winnerSideConflict = Boolean(
    databaseWinnerSide &&
      ((explicitWinnerSide && explicitWinnerSide !== databaseWinnerSide) ||
        (remoteWinnerSide && remoteWinnerSide !== databaseWinnerSide)),
  );
  const supportLeft = percentParam(searchParams.get("supportLeft"), 0);
  const supportRight = percentParam(searchParams.get("supportRight"), 100 - supportLeft);
  const finalVoteLeft = percentParam(searchParams.get("finalVoteLeft"), remoteArchive?.finalVoteLeft ?? 0);
  const finalVoteRight = percentParam(searchParams.get("finalVoteRight"), remoteArchive?.finalVoteRight ?? 100 - finalVoteLeft);
  const predictionAccuracy = percentParam(searchParams.get("accuracy"), 0);
  const rawVoteTotal = numberParam(searchParams.get("votesTotal") ?? searchParams.get("votes") ?? searchParams.get("voteCount"), remoteArchive?.votesTotal ?? 0);
  const voteTotal = !isUuid(battleId) && rawVoteTotal === 128 ? 0 : rawVoteTotal;
  const displayVoteTotal = voteTotal;
  const officialAudienceMin = remoteArchive?.officialAudienceMin || DROP_BATTLE_OFFICIAL_AUDIENCE_MIN;
  const audienceCount = numberParam(searchParams.get("audienceCount"), remoteArchive?.audienceCount ?? displayVoteTotal);
  const isOfficialBattleResult = Boolean(remoteArchive) || isOfficialDropBattleResult({ audienceCount, totalVotes: displayVoteTotal });
  const resultHeadline = isOfficialBattleResult
    ? t("result_headline", { winner: winnerName })
    : lang === "zh"
      ? `${winnerName} 拿下這場非正式 Drop Battle`
      : `${winnerName} won this unofficial Drop Battle`;
  const resultBody = isOfficialBattleResult
    ? t("result_body", { song: winnerSong })
    : lang === "zh"
      ? `這首「${winnerSong}」已分出勝負，但本場只有 ${audienceCount}/${officialAudienceMin} 名觀眾投票，先不進榮譽榜，也不累計歌曲正式戰績。`
      : `"${winnerSong}" won the room, but only ${audienceCount}/${officialAudienceMin} audience voters joined. This stays unofficial and does not enter the Honor Board or official song stats.`;
  const feedbackA = useMemo(
    () => searchParams.get("feedbackA") ? parseBattleFeedbackParam(searchParams.get("feedbackA")) : remoteArchive?.feedbackA ?? parseBattleFeedbackParam(null),
    [remoteArchive?.feedbackA, searchParams],
  );
  const feedbackB = useMemo(
    () => searchParams.get("feedbackB") ? parseBattleFeedbackParam(searchParams.get("feedbackB")) : remoteArchive?.feedbackB ?? parseBattleFeedbackParam(null),
    [remoteArchive?.feedbackB, searchParams],
  );
  const winnerFeedback = finalVoteRight > finalVoteLeft ? feedbackB : feedbackA;
  const audienceReview = stripCannedBattleReview(searchParams.get("audienceReview") || remoteArchive?.audienceReview);
  const aiReview = stripCannedBattleReview(searchParams.get("aiReview") || remoteArchive?.aiReview);
  const displayAudienceReview = audienceReview || (lang === "zh" ? "尚無觀眾評價" : "No Listener Signal Yet");
  const displayAiReview = aiReview || (lang === "zh" ? "尚無 AI 評價" : "No AI Review Yet");
  const hasCompleteResultData = Boolean(winnerNameRaw && winnerSongRaw && opponentNameRaw && opponentSongRaw && battleCode);

  const localizedSkills = useMemo<HookSkill[]>(() => skillsFromFeedback(winnerFeedback, lang), [lang, winnerFeedback]);
  const shareText =
    lang === "zh"
      ? [
          "AIPOGER 最強抓波 Drop Battle 戰果出爐",
          `${winnerName}《${winnerSong}》擊敗 ${opponentName}《${opponentSong}》`,
          "",
          "太屌了太精采了！這麼好聽的歌還不聽起來",
        ].join("\n")
      : [
          "AIPOGER DROP BATTLE RESULT",
          `${winnerName} "${winnerSong}" defeated ${opponentName} "${opponentSong}"`,
          "",
          "This one hits hard. Listen before the arena cools down.",
        ].join("\n");
  const resultShareUrl = (() => {
    if (!isOfficialBattleResult) return undefined;
    if (!battleId || !isUuid(battleId)) return undefined;
    return `/battle/result?battleId=${encodeURIComponent(battleId)}&lang=${lang}`;
  })();

  useEffect(() => {
    if (!battleIdParam || !isUuid(battleIdParam) || winnerNameRaw) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("battle_result_archives")
        .select("battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at")
        .eq("battle_id", battleIdParam)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        if (!/schema cache|does not exist|permission denied|PGRST/i.test(error.message || "")) {
          console.warn("[battle result load archive]", error.message);
        }
        return;
      }
      if (data) setRemoteArchive(archivedResultFromRow(data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [battleIdParam, winnerNameRaw]);

  useEffect(() => {
    if (!battleIdParam || !isUuid(battleIdParam)) {
      setDatabaseWinnerSide(null);
      setDatabaseWinnerChecked(true);
      return;
    }
    let cancelled = false;
    setDatabaseWinnerChecked(false);
    void (async () => {
      const { data, error } = await supabase
        .from("battles")
        .select("winner")
        .eq("id", battleIdParam)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[battle result load battle winner]", error.message);
        setDatabaseWinnerSide(null);
        setDatabaseWinnerChecked(true);
        return;
      }
      setDatabaseWinnerSide(winnerSideParam(typeof data?.winner === "string" ? data.winner : null));
      setDatabaseWinnerChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [battleIdParam]);

  useEffect(() => {
    if (!hasCompleteResultData) return;
    if (!winnerSide) return;
    if (isUuid(battleId) && !databaseWinnerChecked) return;
    if (winnerSideConflict) {
      console.warn("[battle result archive skipped] winner side conflicts with database winner");
      return;
    }
    const resultHref = `${window.location.pathname}${window.location.search}`;
    if (isOfficialBattleResult) {
      upsertArchivedBattleResult({
        id: battleId || battleCode,
        battleId,
        battleCode,
        winnerSide,
        winnerName,
        winnerSong,
        opponentName,
        opponentSong,
        rank: displayRank,
        tool,
        genre: cleanParam(searchParams.get("genre")),
        coverUrl: coverUrlRaw,
        avatarUrl: avatarUrlRaw,
        opponentCoverUrl: opponentCoverUrlRaw,
        opponentAvatarUrl: opponentAvatarUrlRaw,
        finalVoteLeft,
        finalVoteRight,
        votesTotal: displayVoteTotal,
        audienceCount,
        officialAudienceMin,
        audienceReview,
        aiReview,
        feedbackA: sanitizeBattleFeedbackCounts(feedbackA),
        feedbackB: sanitizeBattleFeedbackCounts(feedbackB),
        resultHref,
        createdAt: new Date().toISOString(),
      });
    }

    if (!isUuid(battleId)) return;
    const settledBattleId = battleId;
    void (async () => {
      const settle90s = await supabase.rpc("settle_90s_battle", {
        p_battle_id: settledBattleId,
        p_winner: winnerSide,
      });
      if (settle90s.error) {
        const fallback = await supabase.rpc("settle_battle", {
          p_battle_id: settledBattleId,
          p_winner: winnerSide,
        });
        if (fallback.error && !/already settled|already closed|finished/i.test(fallback.error.message)) {
          console.warn("[battle result settle]", fallback.error.message);
        }
      }

      if (isOfficialBattleResult) {
        const archive = await supabase.rpc("archive_battle_result", {
          p_battle_id: settledBattleId,
          p_winner: winnerSide,
          p_final_vote_left: finalVoteLeft,
          p_final_vote_right: finalVoteRight,
          p_audience_review: audienceReview,
          p_result_payload: {
            coverUrl: coverUrlRaw,
            avatarUrl: avatarUrlRaw,
            opponentCoverUrl: opponentCoverUrlRaw,
            opponentAvatarUrl: opponentAvatarUrlRaw,
            aiReview,
            rank: displayRank,
            genre: cleanParam(searchParams.get("genre")),
            votesTotal: displayVoteTotal,
            audienceCount,
            officialAudienceMin,
            feedbackA,
            feedbackB,
            resultHref,
          },
        });
        if (archive.error) console.warn("[battle result archive]", archive.error.message);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (accessToken) {
        await completeBattleCardIntent({ accessToken, battleId: settledBattleId, outcome: "completed" }).catch((err) => {
          console.warn("[battle result complete card]", err);
        });
      }
    })();
  }, [
    aiReview,
    audienceReview,
    avatarUrl,
    avatarUrlRaw,
    battleCode,
    battleId,
    coverUrl,
    coverUrlRaw,
    displayRank,
    displayVoteTotal,
    audienceCount,
    officialAudienceMin,
    databaseWinnerChecked,
    feedbackA,
    feedbackB,
    finalVoteLeft,
    finalVoteRight,
    hasCompleteResultData,
    isOfficialBattleResult,
    winnerSideConflict,
    opponentAvatarUrl,
    opponentAvatarUrlRaw,
    opponentCoverUrl,
    opponentCoverUrlRaw,
    opponentName,
    opponentNameRaw,
    opponentSong,
    opponentSongRaw,
    searchParams,
    tool,
    winnerName,
    winnerNameRaw,
    winnerSide,
    winnerSong,
    winnerSongRaw,
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030303] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_16%,rgba(255,106,0,0.24),transparent_31%),radial-gradient(circle_at_82%_18%,rgba(0,202,255,0.2),transparent_30%),linear-gradient(180deg,#030303_0%,#0b0704_48%,#030303_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative z-20 mx-auto mb-4 flex w-full max-w-[1260px] items-center justify-between gap-3">
        <Link
          href={`/listen-bar?lang=${lang}`}
          className="inline-flex items-center justify-center rounded-full border border-orange-200/35 bg-black/62 px-4 py-2 text-sm font-black text-orange-100 shadow-[0_0_24px_rgba(255,106,0,0.18)] backdrop-blur-xl transition hover:border-orange-200 hover:bg-orange-500/14"
        >
          {lang === "zh" ? "去傷心酒吧喝一杯" : "Bar Heartbreak"}
        </Link>
        <Link
          href={`/battle?lang=${lang}`}
          className="inline-flex items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.14)] backdrop-blur-xl transition hover:border-cyan-100 hover:bg-cyan-300/16"
        >
          {lang === "zh" ? "去觀看下場比賽" : "Watch Next Battle"}
        </Link>
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-6.5rem)] w-full max-w-[1260px] gap-6 lg:grid-cols-[minmax(340px,520px)_1fr] lg:items-center">
        <section className="mx-auto w-full max-w-[430px]">
          <div className="mb-3 rounded-[1.4rem] border border-orange-300/35 bg-black/72 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.38),0_0_32px_rgba(255,106,0,0.16)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-orange-200/80">
                {isOfficialBattleResult ? (lang === "zh" ? "成果卡分享連結" : "Share This Result Card") : lang === "zh" ? "非正式戰果分享" : "Share Unofficial Result"}
              </p>
              <span className="shrink-0 rounded-full border border-yellow-200/35 bg-yellow-300/15 px-2.5 py-1 text-[0.68rem] font-black text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.2)]">
                {isOfficialBattleResult ? (lang === "zh" ? "分享 +188 APC" : "Share +188 APC") : lang === "zh" ? `${audienceCount}/${officialAudienceMin} 觀眾` : `${audienceCount}/${officialAudienceMin} voters`}
              </span>
            </div>
            <ShareButton
              title={isOfficialBattleResult ? t("result_share_title") : lang === "zh" ? "AIPOGER 非正式 Drop Battle 戰果" : "AIPOGER Unofficial Drop Battle Result"}
              text={shareText}
              url={resultShareUrl}
              label={isOfficialBattleResult ? (lang === "zh" ? "分享成果卡 · +188 APC" : "Share Result Card · +188 APC") : lang === "zh" ? "分享非正式戰果" : "Share Unofficial Result"}
              copiedLabel={t("common_copied")}
              className="w-full border-orange-200/55 bg-orange-500 px-5 py-3 text-base font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.24)] hover:bg-orange-300"
            />
          </div>
          <div
            className="relative mx-auto aspect-[9/16] overflow-hidden rounded-[2rem] border border-orange-300/35 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_120px_rgba(0,0,0,0.72)]"
            style={{ width: "min(100%, calc(88vh * 9 / 16))", maxWidth: "430px" }}
          >
            <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_24%,rgba(255,106,0,0.4),transparent_28%),radial-gradient(circle_at_16%_62%,rgba(255,106,0,0.24),transparent_32%),radial-gradient(circle_at_84%_54%,rgba(0,202,255,0.24),transparent_34%),linear-gradient(180deg,#070707_0%,#110905_52%,#030303_100%)]" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:30px_30px]" />
            <div className="absolute left-1/2 top-[5.5%] h-px w-[74%] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-200 to-transparent shadow-[0_0_28px_rgba(255,106,0,0.8)]" />

            <div className="relative flex h-full flex-col px-5 pb-5 pt-5">
              <header className="relative z-30 flex items-start justify-between gap-4">
                <div>
                  <p className={`${fontRighteous.className} text-[2rem] leading-none text-orange-100 drop-shadow-[0_0_22px_rgba(255,106,0,0.62)]`}>
                    最強抓波
                  </p>
                  <p className={`${fontRighteous.className} -mt-1 text-[2rem] leading-none text-white`}>
                    DROP BATTLE
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right text-[0.58rem] font-black text-zinc-400">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-orange-300/40 bg-black shadow-[0_0_28px_rgba(255,106,0,0.28)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aipogerLogo} alt="AIPOGER" className="h-full w-full object-cover" />
                  </div>
                  <p className="text-orange-200/70">{lang === "zh" ? "決鬥編號" : "BATTLE ID"} {displayBattleCode}</p>
                </div>
              </header>

              <div className="relative z-10 mx-auto mt-0 flex h-[30%] w-full items-center justify-center">
                <div className="absolute aspect-square w-[81%] rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),inset_0_0_88px_rgba(255,255,255,0.075),0_0_82px_rgba(255,106,0,0.38)]">
                  <div className="absolute inset-[5%] rounded-full border border-zinc-700/70" />
                  <div className="absolute inset-[12%] rounded-full border border-zinc-800/80" />
                  <div className="absolute inset-[18%] overflow-hidden rounded-full border-2 border-orange-300/60 bg-neutral-900 shadow-[0_0_50px_rgba(255,106,0,0.38)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt={winnerSong}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        if (event.currentTarget.src.endsWith(fallbackCover)) return;
                        event.currentTarget.src = fallbackCover;
                      }}
                    />
                  </div>
                  <div className="absolute inset-[47.5%] rounded-full bg-black ring-1 ring-white/40" />
                  <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.1),transparent_32%,rgba(255,255,255,0.04)_58%,transparent_72%)]" />
                </div>
              </div>
              <div className="relative z-20 -mt-12">
                <WinnerLaurelBadge />
              </div>

              <section className="relative z-20 mt-0.5 text-center">
                <p className="text-[1.42rem] font-black leading-none text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.82)]">
                  {winnerName}
                </p>
                <div className="mx-auto my-1 h-px w-[42%] bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
                <p className="text-[0.9rem] font-black leading-tight text-zinc-100">{winnerSong}</p>
                <p className="mt-0.5 text-[0.58rem] font-bold text-orange-200">{displayRankText} / {displayTool}</p>
              </section>

              <section className="relative mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 rounded-[1.05rem] border border-white/10 bg-black/45 px-1.5 py-2 shadow-[inset_0_0_32px_rgba(255,255,255,0.035)] min-[420px]:gap-1.5 min-[420px]:px-2">
                <BattleSideCard role={lang === "zh" ? "鬥士" : "Fighter"} name={winnerName} song={winnerSong} avatarUrl={avatarUrl} coverUrl={coverUrl} tone="orange" />
                <div className="z-10 flex flex-col items-center justify-center">
                  <div className="bg-gradient-to-b from-orange-100 via-orange-500 to-red-700 bg-clip-text text-[1.4rem] font-black leading-none text-transparent drop-shadow-[0_0_26px_rgba(255,106,0,0.8)]">
                    VS
                  </div>
                  <p className="mt-0.5 whitespace-nowrap rounded-full border border-yellow-200/25 bg-yellow-300/10 px-1.5 py-0.5 text-[0.5rem] font-black leading-none text-yellow-100">
                    {displayVoteTotal}{lang === "zh" ? "票" : " votes"}
                  </p>
                </div>
                <BattleSideCard role={lang === "zh" ? "挑戰者" : "Challenger"} name={opponentName} song={opponentSong} avatarUrl={opponentAvatarUrl} coverUrl={opponentCoverUrl} tone="cyan" />
                <div className="col-span-3 grid gap-1.5">
                  <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2 rounded-xl border border-orange-200/18 bg-orange-400/[0.08] px-2.5 py-1.5">
                    <p className="rounded-full border border-orange-200/22 bg-orange-300/10 px-1.5 py-1 text-center text-[0.48rem] font-black uppercase tracking-[0.12em] text-orange-100/85">
                      {lang === "zh" ? "AI 評價" : "AI"}
                    </p>
                    <p className="line-clamp-1 min-w-0 text-[0.64rem] font-black leading-4 text-white">“{displayAiReview}”</p>
                  </div>
                  <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2 rounded-xl border border-cyan-200/18 bg-cyan-300/[0.08] px-2.5 py-1.5">
                    <p className="rounded-full border border-cyan-200/22 bg-cyan-300/10 px-1.5 py-1 text-center text-[0.48rem] font-black uppercase tracking-[0.12em] text-cyan-100/85">
                      {lang === "zh" ? "觀眾" : "Crowd"}
                    </p>
                    <p className="line-clamp-1 min-w-0 text-[0.64rem] font-black leading-4 text-white">“{displayAudienceReview}”</p>
                  </div>
                </div>
              </section>

              <section className="mt-2 flex min-h-0 flex-1 items-center justify-center rounded-[1.25rem] border border-white/10 bg-black/52 px-2 py-1.5 shadow-[inset_0_0_42px_rgba(255,255,255,0.035)]">
                <SkillRadar skills={localizedSkills} className="max-w-[260px]" compactLabels />
              </section>

              <footer className="mt-auto flex items-end justify-between pt-2 text-[0.62rem] font-black text-zinc-500">
                <span>aipoger.com</span>
                <span>WHERE AI MUSIC EARNS THE CROWD</span>
              </footer>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl lg:mx-0">
          <Link
            href={`/battle?lang=${lang}`}
            className="inline-flex rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-orange-300/55 hover:text-white"
          >
            {t("result_back_battle")}
          </Link>
          <Link
            href={`/rank?lang=${lang}`}
            className="ml-2 inline-flex rounded-full border border-yellow-300/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-100 transition hover:border-yellow-200 hover:text-white"
          >
            {t("result_rank")}
          </Link>
          <h1 className="mt-7 text-white">
            <span
              className={`${fontRighteous.className} block bg-gradient-to-br from-[#fff3bd] via-[#ff7a18] to-[#42e8ff] bg-clip-text text-[clamp(3.2rem,7.2vw,5.8rem)] leading-[0.86] text-transparent drop-shadow-[0_0_34px_rgba(255,106,0,0.52)]`}
              style={{
                WebkitTextStroke: "1px rgba(255,238,190,0.38)",
                textShadow: "0 0 18px rgba(255,122,24,0.28), 0 0 34px rgba(66,232,255,0.16)",
              }}
            >
              AI DROP REVIEW
            </span>
            <span className="mt-4 block text-[clamp(1.85rem,3.8vw,3rem)] font-black leading-tight text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.14)]">
              {resultHeadline}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
            {resultBody}
          </p>
          {!isOfficialBattleResult ? (
            <p className="mt-4 inline-flex rounded-full border border-yellow-200/30 bg-yellow-300/10 px-3 py-1.5 text-xs font-black text-yellow-100">
              {lang === "zh" ? `正式榮譽榜門檻：${officialAudienceMin} 名不同觀眾` : `Official threshold: ${officialAudienceMin} distinct audience voters`}
            </p>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-orange-300/22 bg-[radial-gradient(circle_at_50%_38%,rgba(255,106,0,0.28),rgba(0,202,255,0.1)_48%,rgba(255,255,255,0.04)_74%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_80px_rgba(0,0,0,0.38)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`${fontRighteous.className} text-[1.55rem] leading-none text-orange-100 drop-shadow-[0_0_20px_rgba(255,106,0,0.38)]`}>
                  DROP POWER RADAR
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
                  {isOfficialBattleResult
                    ? lang === "zh"
                      ? "榮譽卡同款五角評分圖，直接看這首 Drop 的爆點分布。"
                      : "Honor Card radar showing this Drop's strongest points."
                    : lang === "zh"
                      ? "非正式戰果仍保留爆點分析，但不進榮譽榜。"
                      : "Unofficial results keep the signal radar, but do not enter the Honor Board."}
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-orange-200/25 bg-black/42 px-2.5 py-1.5 shadow-[0_0_18px_rgba(255,106,0,0.16)] sm:inline-flex">
                <span className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aipogerLogo} alt="AIPOGER" className="h-full w-full object-cover" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">{displayBattleCode}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-white/10 bg-black/46 p-3 shadow-[inset_0_0_42px_rgba(255,255,255,0.035)] sm:grid-cols-[1fr_auto]">
              <div className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-orange-300/70 bg-black shadow-[0_0_28px_rgba(255,106,0,0.34)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt={`${winnerName} avatar`}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(fallbackAvatar)) return;
                      event.currentTarget.src = fallbackAvatar;
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/70">
                    {isOfficialBattleResult ? (lang === "zh" ? "榮譽上榜鬥士" : "HONOR BOARD FIGHTER") : lang === "zh" ? "非正式勝方" : "UNOFFICIAL WINNER"}
                  </p>
                  <p className="truncate text-xl font-black leading-tight text-white">{winnerName}</p>
                  <p className="truncate text-sm font-bold leading-tight text-orange-100">{winnerSong}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-100">{displayRankText}</span>
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{displayTool}</span>
                    <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-100">{displayBattleCode}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:grid-cols-[auto] sm:justify-items-end">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-cyan-200/30 bg-black shadow-[0_0_26px_rgba(0,202,255,0.22)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={winnerSong}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(fallbackCover)) return;
                      event.currentTarget.src = fallbackCover;
                    }}
                  />
                </div>
                <div className="rounded-2xl border border-yellow-200/25 bg-yellow-300/10 px-3 py-2 text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/70">
                    {lang === "zh" ? "最終投票" : "FINAL VOTES"}
                  </p>
                  <p className="text-2xl font-black leading-none text-yellow-100">{displayVoteTotal.toLocaleString()}</p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400">
                    {lang === "zh" ? "聽眾已投票" : "LISTENERS VOTED"}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-200/18 bg-orange-400/[0.08] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100/75">
                    {lang === "zh" ? "AI 評價" : "AI REVIEW"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-black leading-6 text-white">“{displayAiReview}”</p>
                </div>
                <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                    {lang === "zh" ? "觀眾評價" : "LISTENER SIGNAL"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-black leading-6 text-white">“{displayAudienceReview}”</p>
                </div>
              </div>
            </div>
            <SkillRadar skills={localizedSkills} className="mt-1 max-w-[580px] md:max-w-[620px]" />
          </section>

          <section className="mt-8 rounded-[1.35rem] border border-white/10 bg-black/45 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/80">
              {lang === "zh" ? "賽後揭曉" : "POST-BATTLE REVEAL"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {lang === "zh" ? "應援熱度 vs 最終音樂判斷" : "Support Hype vs Final Music Vote"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {lang === "zh"
                ? "戰前支持只用來製造張力；真正決定勝負的是開戰後聽完音樂的最終投票。"
                : "Pre-battle support builds tension. The final vote after listening decides the battle."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: lang === "zh" ? "PRE-BATTLE SUPPORT" : "PRE-BATTLE SUPPORT", left: supportLeft, right: supportRight, color: "orange" },
                { label: lang === "zh" ? "FINAL RESULT" : "FINAL RESULT", left: finalVoteLeft, right: finalVoteRight, color: "cyan" },
                { label: lang === "zh" ? "PREDICTION ACCURACY" : "PREDICTION ACCURACY", left: predictionAccuracy, right: 100 - predictionAccuracy, color: "gold" },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{row.label}</p>
                  <div className="mt-3 flex items-center justify-between text-sm font-black">
                    <span className="text-orange-200">A SIDE {row.left}%</span>
                    <span className="text-cyan-100">B SIDE {row.right}%</span>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black ring-1 ring-white/10">
                    <div
                      className={row.color === "cyan" ? "bg-cyan-300" : row.color === "gold" ? "bg-yellow-300" : "bg-orange-400"}
                      style={{ width: `${row.left}%` }}
                    />
                    <div className="bg-blue-500" style={{ width: `${row.right}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </section>
      </div>
    </main>
  );
}

export default function BattleResultPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black text-white" />}>
      <BattleResultContent />
    </Suspense>
  );
}
