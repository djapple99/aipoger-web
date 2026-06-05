"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import ShareButton from "@/components/share-button";
import SafetyNotice from "@/components/safety-notice";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { rankLabelForLevel } from "@/lib/battle-pool-rules";
import {
  DROP_BATTLE_EXPECTED_END_BUFFER_MS,
  cancelCurrentBattleIntent,
  isClosedDropBattleStatus,
  isDropBattleEndedOrPastExpectedEnd,
  resolveDropBattleRuntimeStart,
  resolveDropBattleScheduledStart,
  shouldExpireOpenDropQueue,
} from "@/lib/battle-pool-client";

const seedComments = [
  "A Side 節奏很穩，這段 drop 很強。",
  "B Side 聲線層次比較有記憶點！",
  "副歌一出直接燃起來了。",
];

type DeckKey = "A" | "B";

type DeckInfo = {
  fighterName: string;
  songName: string;
  audioPath: string | null;
};

type BattleViewData = {
  id: string;
  deckA: DeckInfo;
  deckB: DeckInfo;
};

const mockBattleData: BattleViewData = {
  id: "mock-battle",
  deckA: {
    fighterName: "夜色迴響",
    songName: "Neon Dust",
    audioPath: null,
  },
  deckB: {
    fighterName: "蒼藍頻段",
    songName: "Cold Pulse",
    audioPath: null,
  },
};

const DAILY_BATTLE_QUEUE_MS = 24 * 60 * 60 * 1000;
const SHOW_DAILY_BATTLE_SECTION = false;

function Turntable({
  label,
  deckKey,
  fighterName,
  songName,
  isActive,
  isForfeited,
  canPlay,
  onPlay,
}: {
  label: string;
  deckKey: DeckKey;
  fighterName: string;
  songName: string;
  isActive: boolean;
  isForfeited: boolean;
  canPlay: boolean;
  onPlay: (key: DeckKey) => void;
}) {
  return (
    <article className="flex flex-col items-center gap-4">
      <div
        className={`relative aspect-square w-full max-w-[280px] rounded-full border border-[#6a6d70] bg-gradient-to-br from-[#3a3e42] via-[#2a2d31] to-[#1e2024] p-4 shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),inset_0_-8px_18px_rgba(0,0,0,0.45),0_16px_35px_rgba(0,0,0,0.45)] md:max-w-[360px] ${
          isActive ? "animate-[spin_4.5s_linear_infinite]" : ""
        }`}
      >
        <div
          className={`absolute inset-6 rounded-full border border-[#71757a] bg-gradient-to-br from-[#4f555b] via-[#32363b] to-[#26292e] shadow-[inset_0_4px_10px_rgba(255,255,255,0.08),inset_0_-10px_20px_rgba(0,0,0,0.35)] ${
            !isActive ? "opacity-80" : ""
          }`}
        />
        <div className="absolute inset-[31%] rounded-full border border-[#7f8489] bg-[#565a60] shadow-[inset_0_3px_8px_rgba(0,0,0,0.35)]" />
        <div className="absolute inset-[44%] rounded-full border border-[#9aa0a6] bg-[#d6c8be]/30" />

        <button
          type="button"
          onClick={() => onPlay(deckKey)}
          disabled={!canPlay}
          className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold tracking-[0.08em] transition ${
            isForfeited
              ? "cursor-not-allowed border-[#5e6368] bg-[#3f4449] text-[#b7b0ab]"
              : "border-[#ff9e67] bg-[#4a4f55] text-[#ffe4d1] hover:shadow-[0_0_16px_rgba(255,121,40,0.45)]"
          }`}
        >
          {isForfeited ? "棄權" : "PLAY"}
        </button>
      </div>
      <div className="text-center">
        <p className="text-sm tracking-[0.32em] text-[#b1a59f]">{label}</p>
        <p className="mt-2 text-base font-semibold tracking-[0.06em] text-[#f0ebe7]">{fighterName}</p>
        <p className="mt-1 text-sm text-[#c6bbb5]">{songName}</p>
        <p className={`mt-1 text-xs tracking-[0.12em] ${isActive ? "text-[#ffb889]" : "text-[#9b938e]"}`}>
          {isActive ? "播放中" : "待機中"}
        </p>
      </div>
    </article>
  );
}

function VoteButton({ team }: { team: "A" | "B" }) {
  return (
    <button
      type="button"
      className="group w-full rounded-2xl border border-[#73777d] bg-gradient-to-b from-[#686d73] via-[#50545a] to-[#3f4349] px-5 py-4 text-base font-semibold tracking-[0.18em] text-[#f0ebe8] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-6px_12px_rgba(0,0,0,0.35),0_8px_16px_rgba(0,0,0,0.3)] transition duration-300 hover:border-[#ff8d40] hover:text-[#ffd8bf] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-6px_12px_rgba(0,0,0,0.35),0_0_18px_rgba(255,121,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a28]"
    >
      投票給 {team} 隊
    </button>
  );
}

type LiveBattleRow = {
  id: string;
  status?: string | null;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  fighter_a_rank?: string | null;
  fighter_b_rank?: string | null;
  song_a_name: string;
  song_b_name: string;
  genre: string;
  created_at: string;
  scheduled_start_at?: string | null;
  battle_started_at?: string | null;
  battle_ended_at?: string | null;
  started_at?: string | null;
  waiting_room_started_at?: string | null;
};

type PoolEntryRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  fighter_rank?: string | null;
  original_file_name: string;
  genre: string;
  ai_tool: string | null;
  status: "waiting_challenge" | "public_voting" | "ghost_battle";
  match_group_id: string | null;
  expires_at: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  public_vote_score: number | null;
  created_at: string;
};

type FocusedPoolCardState = {
  id: string;
  status: string | null;
  fighterName: string;
  songName: string;
  battleId: string | null;
};

type DailyBattleListRow = {
  id: string;
  status: string | null;
  ends_at: string | null;
  entry_a?:
    | { id?: string | null; user_id?: string | null; title?: string | null; genre?: string | null; ai_tool?: string | null }
    | Array<{ id?: string | null; user_id?: string | null; title?: string | null; genre?: string | null; ai_tool?: string | null }>
    | null;
  entry_b?:
    | { id?: string | null; user_id?: string | null; title?: string | null; genre?: string | null; ai_tool?: string | null }
    | Array<{ id?: string | null; user_id?: string | null; title?: string | null; genre?: string | null; ai_tool?: string | null }>
    | null;
};

type DailyEntryQueueRow = {
  id: string;
  user_id: string;
  title: string | null;
  genre: string | null;
  ai_tool: string | null;
  pairing_mode: string | null;
  status: string | null;
  created_at: string | null;
  fighter_name?: string | null;
  fighter_rank?: string | null;
};

type QueueProfileRow = {
  id: string;
  level?: number | null;
  fighter_name?: string | null;
};

type FighterProfileRow = {
  id: string;
  display_name?: string | null;
};

type SongBattleStats = {
  battles: number;
  wins: number;
  losses: number;
  ties: number;
};

type HookArchiveStatsRow = {
  id?: string | null;
  winner_song_name?: string | null;
  opponent_song_name?: string | null;
  winner?: "fighter_a" | "fighter_b" | null;
};

type DailyStatsRow = {
  id: string;
  status?: string | null;
  winner_entry_id?: string | null;
  entry_a_id?: string | null;
  entry_b_id?: string | null;
};

function firstDailyEntry<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function emptySongBattleStats(): SongBattleStats {
  return { battles: 0, wins: 0, losses: 0, ties: 0 };
}

function normalizeSongStatsKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.(mp3|wav|aiff|aif|m4a)$/i, "")
    .replace(/\s+/g, " ");
}

function addBattleOutcome(stats: SongBattleStats, outcome: "win" | "loss" | "tie") {
  stats.battles += 1;
  if (outcome === "win") stats.wins += 1;
  if (outcome === "loss") stats.losses += 1;
  if (outcome === "tie") stats.ties += 1;
}

function formatSongBattleStats(stats: SongBattleStats | undefined, isZh: boolean) {
  if (!stats || stats.battles <= 0) return isZh ? "首戰作品" : "Debut track";
  const winRate = Math.round((stats.wins / stats.battles) * 100);
  if (stats.ties > 0) {
    return isZh
      ? `參戰 ${stats.battles} 次 · ${stats.wins} 勝 ${stats.losses} 敗 ${stats.ties} 和 · 勝率 ${winRate}%`
      : `${stats.battles} battles · ${stats.wins}W ${stats.losses}L ${stats.ties}T · ${winRate}%`;
  }
  return isZh
    ? `參戰 ${stats.battles} 次 · ${stats.wins} 勝 ${stats.losses} 敗 · 勝率 ${winRate}%`
    : `${stats.battles} battles · ${stats.wins}W ${stats.losses}L · ${winRate}%`;
}

function SongBattleStatsPill({
  stats,
  isZh,
  tone = "orange",
}: {
  stats?: SongBattleStats;
  isZh: boolean;
  tone?: "orange" | "cyan";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100"
      : "border-orange-200/30 bg-orange-400/[0.09] text-orange-100";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${toneClass}`}>
      {formatSongBattleStats(stats, isZh)}
    </span>
  );
}

async function fetchHookSongBattleStats(songNames: string[]) {
  const keys = Array.from(new Set(songNames.map(normalizeSongStatsKey).filter(Boolean)));
  const stats = Object.fromEntries(keys.map((key) => [key, emptySongBattleStats()])) as Record<string, SongBattleStats>;
  if (keys.length === 0) return stats;

  const { data, error } = await supabase
    .from("battle_result_archives")
    .select("id,winner,winner_song_name,opponent_song_name")
    .order("archived_at", { ascending: false })
    .limit(500);

  if (error) {
    const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
    if (!/battle_result_archives|schema cache|does not exist|PGRST/i.test(msg)) console.warn("[hook song stats]", error);
    return stats;
  }

  ((data as HookArchiveStatsRow[] | null) ?? []).forEach((row) => {
    const winnerKey = normalizeSongStatsKey(row.winner_song_name);
    const opponentKey = normalizeSongStatsKey(row.opponent_song_name);
    if (winnerKey && stats[winnerKey]) addBattleOutcome(stats[winnerKey], "win");
    if (opponentKey && stats[opponentKey]) addBattleOutcome(stats[opponentKey], "loss");
  });

  return stats;
}

async function fetchDailySongBattleStats(entryIds: string[]) {
  const ids = Array.from(new Set(entryIds.filter(Boolean)));
  const stats = Object.fromEntries(ids.map((id) => [id, emptySongBattleStats()])) as Record<string, SongBattleStats>;
  if (ids.length === 0) return stats;

  const [asA, asB] = await Promise.all([
    supabase.from("daily_battles").select("id,status,winner_entry_id,entry_a_id,entry_b_id").eq("status", "finished").in("entry_a_id", ids),
    supabase.from("daily_battles").select("id,status,winner_entry_id,entry_a_id,entry_b_id").eq("status", "finished").in("entry_b_id", ids),
  ]);

  const firstError = asA.error || asB.error;
  if (firstError) {
    const msg = `${firstError.message ?? ""} ${firstError.details ?? ""} ${firstError.hint ?? ""}`;
    if (!/daily_battles|schema cache|does not exist|PGRST/i.test(msg)) console.warn("[daily song stats]", firstError);
    return stats;
  }

  const rows = new Map<string, DailyStatsRow>();
  [...(((asA.data as DailyStatsRow[] | null) ?? [])), ...(((asB.data as DailyStatsRow[] | null) ?? []))].forEach((row) => rows.set(row.id, row));
  rows.forEach((row) => {
    ([row.entry_a_id, row.entry_b_id] as const).forEach((entryId) => {
      if (!entryId || !stats[entryId]) return;
      if (!row.winner_entry_id) {
        addBattleOutcome(stats[entryId], "tie");
      } else {
        addBattleOutcome(stats[entryId], row.winner_entry_id === entryId ? "win" : "loss");
      }
    });
  });

  return stats;
}

function formatBattleCardTime(value: string | null | undefined, isZh: boolean) {
  if (!value) return isZh ? "時間未定" : "Time TBD";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return isZh ? "時間未定" : "Time TBD";
  return new Intl.DateTimeFormat(isZh ? "zh-TW" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatBattleTimeLeft(value: string | null | undefined, isZh: boolean) {
  if (!value) return isZh ? "時間未定" : "Time TBD";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return isZh ? "時間未定" : "Time TBD";
  const ms = time - Date.now();
  if (ms <= 0) return isZh ? "已結束" : "Ended";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  if (hours <= 0) return isZh ? `${minutes} 分鐘` : `${minutes}m`;
  return isZh ? `${hours} 小時 ${minutes} 分` : `${hours}h ${minutes}m`;
}

function formatBattleAge(value: string | null | undefined, isZh: boolean) {
  if (!value) return isZh ? "剛剛上架" : "Just listed";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return isZh ? "剛剛上架" : "Just listed";
  const ms = Date.now() - time;
  if (ms < 60_000) return isZh ? "剛剛上架" : "Just listed";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return isZh ? `等待 ${minutes} 分鐘` : `Waiting ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return isZh ? `等待 ${hours} 小時 ${rest} 分` : `Waiting ${hours}h ${rest}m`;
}

function isExpiredDailyQueueEntry(row: Pick<DailyEntryQueueRow, "created_at" | "status">) {
  if (row.status !== "queued" || !row.created_at) return false;
  const createdAt = new Date(row.created_at).getTime();
  return Number.isFinite(createdAt) && createdAt + DAILY_BATTLE_QUEUE_MS <= Date.now();
}

function isExpiredOpenPoolEntry(row: Pick<PoolEntryRow, "status" | "expires_at" | "scheduled_start_at" | "cancellation_evaluation_at">) {
  return shouldExpireOpenDropQueue(row);
}

function isClosedBattleStatus(status: string | null | undefined) {
  return isClosedDropBattleStatus(status);
}

function focusedQueueHref(queueId: string, lang: string) {
  const params = new URLSearchParams({ lang, focusQueue: queueId });
  return `/battle?${params.toString()}`;
}

function focusedBattleHref(battleId: string, lang: string) {
  const params = new URLSearchParams({ lang, focusBattle: battleId });
  return `/battle?${params.toString()}`;
}

function focusedPoolCardTitle(status: string | null | undefined, isZh: boolean) {
  if (status === "accepted_unknown") return isZh ? "此戰鬥已經被挑戰" : "This battle has been accepted";
  if (["cancelled", "cancelled_no_challenger", "cancelled_founder", "expired"].includes(status ?? "")) {
    return isZh ? "這張戰帖已結束" : "This card has ended";
  }
  if (isClosedBattleStatus(status)) return isZh ? "此戰鬥已經結束" : "This battle has ended";
  return isZh ? "此戰帖已有人接戰" : "This card has been accepted";
}

function DailyBattleList() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [rows, setRows] = useState<DailyBattleListRow[]>([]);
  const [queueRows, setQueueRows] = useState<DailyEntryQueueRow[]>([]);
  const [dailyVoteCounts, setDailyVoteCounts] = useState<Record<string, number>>({});
  const [dailySongStats, setDailySongStats] = useState<Record<string, SongBattleStats>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dailyCancelId, setDailyCancelId] = useState<string | null>(null);
  const [dailyCancelError, setDailyCancelError] = useState("");

  useEffect(() => {
    if (isAuthBypassEnabled) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setCurrentUserId(data.session?.user.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const cancelDailyEntry = async (entryId: string, dailyBattleId?: string) => {
    setDailyCancelError("");
    setDailyCancelId(entryId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error(isZh ? "請先登入後再取消 Daily Battle。" : "Sign in to cancel this Daily Battle.");
      const response = await fetch("/api/daily-battle/cancel-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryId }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Cancel failed.");
      setQueueRows((items) => items.filter((item) => item.id !== entryId));
      if (dailyBattleId) setRows((items) => items.filter((item) => item.id !== dailyBattleId));
    } catch (error) {
      setDailyCancelError(String((error as { message?: string })?.message ?? error));
    } finally {
      setDailyCancelId(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (isAuthBypassEnabled) {
        setRows([]);
        setLoading(false);
        return;
      }
      const nowIso = new Date().toISOString();
      const dailyQueueCutoffIso = new Date(Date.now() - DAILY_BATTLE_QUEUE_MS).toISOString();
      await fetch("/api/daily-battle/expire-open-entries", { method: "POST" }).catch(() => null);

      const [{ data, error }, { data: queueData, error: queueError }] = await Promise.all([
        supabase
        .from("daily_battles")
        .select(`
          id,
          status,
          ends_at,
          entry_a:daily_battle_entries!daily_battles_entry_a_id_fkey(id,user_id,title,genre,ai_tool),
          entry_b:daily_battle_entries!daily_battles_entry_b_id_fkey(id,user_id,title,genre,ai_tool)
        `)
        .eq("status", "live")
        .gt("ends_at", nowIso)
        .order("ends_at", { ascending: true })
        .limit(12),
        supabase
          .from("daily_battle_entries")
          .select("id,user_id,title,genre,ai_tool,pairing_mode,status,created_at")
          .eq("status", "queued")
          .gt("created_at", dailyQueueCutoffIso)
          .order("created_at", { ascending: false })
          .limit(18),
      ]);

      if (!mounted) return;
      const dailyRows = error ? [] : ((data as DailyBattleListRow[] | null) ?? []);
      const baseQueueRows = queueError ? [] : ((queueData as DailyEntryQueueRow[] | null) ?? []).filter((row) => !isExpiredDailyQueueEntry(row));
      const visibleDailyEntryIds = [
        ...baseQueueRows.map((row) => row.id),
        ...dailyRows.flatMap((row) => [firstDailyEntry(row.entry_a)?.id, firstDailyEntry(row.entry_b)?.id]),
      ].filter((id): id is string => Boolean(id));
      setDailySongStats(await fetchDailySongBattleStats(visibleDailyEntryIds));

      if (error) {
        const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
        if (!/daily_battles|daily_battle_entries|schema cache|does not exist|PGRST/i.test(msg)) {
          console.warn("[daily battle list]", error);
        }
        setRows([]);
      } else {
        setRows(dailyRows);
        const battleIds = dailyRows.map((row) => row.id).filter(Boolean);
        if (battleIds.length > 0) {
          const { data: voteRows, error: voteError } = await supabase
            .from("daily_battle_votes")
            .select("battle_id")
            .in("battle_id", battleIds);
          if (!voteError) {
            const counts = ((voteRows as Array<{ battle_id?: string | null }> | null) ?? []).reduce<Record<string, number>>((acc, vote) => {
              if (vote.battle_id) acc[vote.battle_id] = (acc[vote.battle_id] ?? 0) + 1;
              return acc;
            }, {});
            setDailyVoteCounts(counts);
          } else {
            setDailyVoteCounts({});
          }
        } else {
          setDailyVoteCounts({});
        }
      }
      if (queueError) {
        const msg = `${queueError.message ?? ""} ${queueError.details ?? ""} ${queueError.hint ?? ""}`;
        if (!/daily_battle_entries|schema cache|does not exist|PGRST/i.test(msg)) {
          console.warn("[daily battle queue list]", queueError);
        }
        setQueueRows([]);
      } else {
        const userIds = Array.from(new Set(baseQueueRows.map((row) => row.user_id).filter(Boolean)));
        let profileRows: QueueProfileRow[] = [];
        let fighterRows: FighterProfileRow[] = [];

        if (userIds.length > 0) {
          const firstTry = await supabase.from("user_profiles").select("id,level,fighter_name").in("id", userIds);
          if (firstTry.error) {
            const fallbackTry = await supabase.from("user_profiles").select("id,level").in("id", userIds);
            if (!fallbackTry.error) {
              profileRows = (fallbackTry.data as Array<{ id: string; level?: number | null }>)
                .map((row) => ({ ...row, fighter_name: null }));
            }
          } else {
            profileRows = (firstTry.data as QueueProfileRow[]) ?? [];
          }

          const fighterTry = await supabase.from("fighter_profiles").select("id,display_name").in("id", userIds);
          if (!fighterTry.error) {
            fighterRows = (fighterTry.data as FighterProfileRow[]) ?? [];
          }
        }

        const profileMap = new Map(profileRows.map((row) => [row.id, row]));
        const fighterMap = new Map(fighterRows.map((row) => [row.id, row]));
        setQueueRows(
          baseQueueRows.map((row) => {
            const profile = profileMap.get(row.user_id);
            const fighterProfile = fighterMap.get(row.user_id);
            const fighterName =
              profile?.fighter_name?.trim() ||
              fighterProfile?.display_name?.trim() ||
              (isZh ? "未命名鬥士" : "Unnamed Fighter");
            return {
              ...row,
              fighter_name: fighterName,
              fighter_rank: rankLabelForLevel(profile?.level ?? 1, fighterName),
            };
          }),
        );
      }
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [isZh]);

  return (
    <section className="mt-8 rounded-[2rem] border border-cyan-200/16 bg-black/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.38em] text-cyan-100/80">24H Daily Battle</p>
          <h2 className="mt-2 text-2xl font-black text-white">{isZh ? "24H 整首作品對決" : "24H Full Track Battles"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            {isZh ? "觀眾可自由播放 A Side / B Side 兩首，慢慢聽、留下評論後投票。24 小時後結算。" : "Listeners control A Side / B Side, leave a comment, then vote. Results settle after 24h."}
          </p>
        </div>
        <Link
          href="/battle/setup?battleMode=daily"
          className="w-fit rounded-full border border-cyan-200/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-black text-cyan-100 transition hover:border-cyan-100 hover:text-white"
        >
          {isZh ? "上傳 24H 整首挑戰" : "Upload 24H Full Track"}
        </Link>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-6 text-center text-sm font-bold text-zinc-500">
          {isZh ? "讀取 24H Battle 中…" : "Loading 24H Battles..."}
        </p>
      ) : rows.length === 0 && queueRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-6 text-center">
          <p className="text-sm font-bold text-zinc-300">{isZh ? "目前還沒有 24H Daily Battle。" : "No 24H Daily Battles yet."}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-zinc-500">
            {isZh ? "先上傳一首完整作品，等待系統配對或朋友約戰。" : "Upload a full track and wait for auto match or open challenge."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueRows.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-orange-300/85">
                {isZh ? "公開挑戰池（24H 接受挑戰中）" : "24H Challenge Pool (Open)"}
              </p>
              {dailyCancelError && (
                <p className="mb-3 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  {dailyCancelError}
                </p>
              )}
              <ul className="grid gap-3 md:grid-cols-2">
                {queueRows.map((row) => {
                  const isMine = Boolean(currentUserId && row.user_id === currentUserId);
                  const dailyWaitingRoomPath = `/battle/daily/waiting-room/${row.id}?lang=${lang}`;
                  return (
                    <li key={row.id}>
                      <div
                        className={`rounded-[1.4rem] border p-4 ${
                          isMine
                            ? "border-cyan-200/35 bg-cyan-300/[0.07]"
                            : "border-orange-300/25 bg-orange-500/[0.07]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-xs uppercase tracking-[0.22em] ${isMine ? "text-cyan-100/80" : "text-orange-100/80"}`}>
                            {row.status === "live" ? "Live" : row.status === "matched" ? (isZh ? "配對中" : "Matching") : (isZh ? "接受挑戰中" : "Open For Challenge")}
                          </p>
                          {isMine ? (
                            <span className="shrink-0 rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                              {isZh ? "我的等待卡" : "My Waiting Card"}
                            </span>
                          ) : null}
                        </div>
                      <p className="mt-2 text-lg font-black text-white">{row.title || (isZh ? "未命名作品" : "Untitled Track")}</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {row.fighter_name}
                        {row.fighter_rank ? <span className="ml-2 rounded-full border border-orange-300/25 px-2 py-0.5 text-[11px] font-bold text-orange-100">{row.fighter_rank}</span> : null}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {row.genre || "Genre"} · {row.ai_tool || "AI Tool"}
                      </p>
                      <div className="mt-2">
                        <SongBattleStatsPill stats={dailySongStats[row.id]} isZh={isZh} tone="cyan" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-orange-100/75">
                        {isZh ? "上架" : "Listed"} {formatBattleCardTime(row.created_at, isZh)} · {formatBattleAge(row.created_at, isZh)}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {row.status === "queued"
                          ? (isZh ? "24H 整首挑戰開放中，任何人都可上傳整首作品接受。" : "24H full-track challenge is open. Anyone can answer with a full track.")
                          : row.pairing_mode === "invite"
                            ? (isZh ? "已在公開挑戰池，等待對手接受。" : "Listed in public challenge pool, waiting for opponents.")
                            : (isZh ? "系統自動配對中，稍後會開戰。" : "Auto matchmaking in progress. Battle will open soon.")}
                      </p>
                      {row.status === "queued" && row.user_id !== currentUserId ? (
                        <Link
                          href={`/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${row.id}&genre=${encodeURIComponent(row.genre || "")}&lang=${lang}`}
                          className="mt-3 inline-flex rounded-full border border-cyan-200/40 bg-cyan-300/12 px-4 py-1.5 text-xs font-black text-cyan-100 transition hover:border-cyan-100 hover:bg-cyan-300 hover:text-black"
                        >
                          {isZh ? "接受 24H 整首挑戰" : "Accept 24H Challenge"}
                        </Link>
                      ) : null}
                      {row.status === "queued" && row.user_id === currentUserId ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={dailyWaitingRoomPath}
                            className="inline-flex rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-black text-black transition hover:bg-cyan-100"
                          >
                            {isZh ? "進入等待房" : "Enter Waiting Room"}
                          </Link>
                          <button
                            type="button"
                            disabled={dailyCancelId === row.id}
                            onClick={() => void cancelDailyEntry(row.id)}
                            className="inline-flex rounded-full border border-red-200/35 bg-red-500/10 px-4 py-1.5 text-xs font-black text-red-100 transition hover:border-red-100 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {dailyCancelId === row.id
                              ? (isZh ? "取消中…" : "Cancelling...")
                              : (isZh ? "取消我的 Daily Battle" : "Cancel My Daily Battle")}
                          </button>
                        </div>
                      ) : null}
                      <div className="mt-3">
                        <ShareButton
                          title={isZh ? "AIPOGER 24H Full Song 戰帖" : "AIPOGER 24H Full Song Challenge"}
                          text={
                            isZh
                              ? `${row.fighter_name} 的《${row.title || "未命名作品"}》正在等人接戰，進來用整首歌挑戰。`
                              : `${row.fighter_name}'s "${row.title || "Untitled Track"}" is waiting for a full-track challenger.`
                          }
                          url={
                            row.status === "queued"
                              ? `/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${row.id}&genre=${encodeURIComponent(row.genre || "")}&lang=${lang}`
                              : `/battle?lang=${lang}`
                          }
                          label={isZh ? "約人鬥歌" : "Find challenger"}
                          copiedLabel={isZh ? "戰帖已複製" : "Challenge copied"}
                          className="px-3 py-1.5 text-xs"
                        />
                      </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-cyan-100/80">
                {isZh ? "戰鬥中，等你來投票決定" : "Live Battles - Vote To Decide"}
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {rows.map((row) => {
                  const a = firstDailyEntry(row.entry_a);
                  const b = firstDailyEntry(row.entry_b);
                  const voteCount = dailyVoteCounts[row.id] ?? 0;
                  const mineEntryId =
                    currentUserId && a?.user_id === currentUserId
                      ? a.id
                      : currentUserId && b?.user_id === currentUserId
                        ? b.id
                        : null;
                  return (
                    <li key={row.id}>
                      <article className="rounded-[1.4rem] border border-cyan-200/20 bg-cyan-300/[0.055] p-4 transition hover:border-cyan-200/65 hover:bg-cyan-300/[0.085]">
                        <Link href={`/battle/daily/${row.id}`} className="group block">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">
                              {isZh ? "戰鬥中" : "Battle Live"}
                            </p>
                            <span className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                              {isZh ? `${voteCount} 人已投票` : `${voteCount} votes`}
                            </span>
                          </div>
                          <p className="mt-2 text-lg font-black text-white">
                            {a?.title || "A SIDE"} <span className="text-orange-300">vs</span> {b?.title || "B SIDE"}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {a?.genre || b?.genre || "Genre"} · {a?.ai_tool || b?.ai_tool || "AI Tool"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <SongBattleStatsPill stats={a?.id ? dailySongStats[a.id] : undefined} isZh={isZh} />
                            <SongBattleStatsPill stats={b?.id ? dailySongStats[b.id] : undefined} isZh={isZh} tone="cyan" />
                          </div>
                          <p className="mt-2 text-xs font-bold text-cyan-100/75">
                            {isZh ? "結束" : "Ends"} {formatBattleCardTime(row.ends_at, isZh)} · {formatBattleTimeLeft(row.ends_at, isZh)}
                          </p>
                          <span className="mt-4 inline-flex rounded-full border border-cyan-200/30 px-3 py-1 text-xs font-bold text-cyan-100 transition group-hover:bg-cyan-300 group-hover:text-black">
                            {isZh ? "進場聽歌投票" : "Enter and vote"} →
                          </span>
                        </Link>
                        {mineEntryId ? (
                          <button
                            type="button"
                            disabled={dailyCancelId === mineEntryId}
                            onClick={() => void cancelDailyEntry(mineEntryId, row.id)}
                            className="mt-3 inline-flex rounded-full border border-red-200/35 bg-red-500/10 px-4 py-1.5 text-xs font-black text-red-100 transition hover:border-red-100 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {dailyCancelId === mineEntryId
                              ? (isZh ? "取消中…" : "Cancelling...")
                              : (isZh ? "取消我的 Daily Battle" : "Cancel My Daily Battle")}
                          </button>
                        ) : null}
                        <div className="mt-3">
                          <ShareButton
                            title={isZh ? "AIPOGER 24H Full Song 對決" : "AIPOGER 24H Full Song Battle"}
                            text={
                              isZh
                                ? `《${a?.title || "A SIDE"}》vs《${b?.title || "B SIDE"}》正在對決，進來聽完整作品再投票。`
                                : `"${a?.title || "A SIDE"}" vs "${b?.title || "B SIDE"}" is live. Listen and vote.`
                            }
                            url={`/battle/daily/${row.id}?lang=${lang}`}
                            label={isZh ? "邀請觀戰投票" : "Invite voters"}
                            copiedLabel={isZh ? "觀戰連結已複製" : "Invite copied"}
                            className="px-3 py-1.5 text-xs"
                          />
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function BattlePoolList() {
  const { t, lang } = useI18n();
  const isZh = lang === "zh";
  const searchParams = useSearchParams();
  const focusQueueId = searchParams.get("focusQueue");
  const [rows, setRows] = useState<PoolEntryRow[]>([]);
  const [hookSongStats, setHookSongStats] = useState<Record<string, SongBattleStats>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cancelQueueId, setCancelQueueId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [focusedClosedCard, setFocusedClosedCard] = useState<FocusedPoolCardState | null>(null);

  useEffect(() => {
    if (focusQueueId) rememberAuthNextPath(focusedQueueHref(focusQueueId, lang));
  }, [focusQueueId, lang]);

  useEffect(() => {
    if (isAuthBypassEnabled) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setCurrentUserId(data.session?.user.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (isAuthBypassEnabled) {
        setRows([]);
        setLoading(false);
        return;
      }

      await fetch("/api/battle-pool/expire-open-cards", { method: "POST" }).catch(() => null);

      let { data, error } = await supabase
        .from("battle_queue")
        .select("id, user_id, fighter_name, original_file_name, genre, ai_tool, status, match_group_id, expires_at, public_vote_score, created_at")
        .in("status", ["waiting_challenge", "public_voting", "ghost_battle"])
        .order("created_at", { ascending: false })
        .limit(24);

      if (error) {
        const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
        const missingScheduleColumn = /scheduled_start_at|cancellation_evaluation_at|schema cache|does not exist|PGRST204/i.test(msg);
        if (missingScheduleColumn) {
          const legacyRead = await supabase
            .from("battle_queue")
            .select("id, user_id, fighter_name, original_file_name, genre, ai_tool, status, match_group_id, expires_at, public_vote_score, created_at")
            .in("status", ["waiting_challenge", "public_voting", "ghost_battle"])
            .order("created_at", { ascending: false })
            .limit(24);
          data = legacyRead.data as typeof data;
          error = legacyRead.error;
        }
      }

      if (!mounted) return;
      if (error) {
        const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
        if (!/status|expires_at|public_vote_score|schema cache|does not exist|PGRST204/i.test(msg)) {
          console.error("[battle pool]", error);
        }
        setRows([]);
      } else {
        const baseRows = ((data as PoolEntryRow[]) ?? []);
        const linkedBattleIds = Array.from(
          new Set(baseRows.map((row) => row.match_group_id).filter((id): id is string => Boolean(id))),
        );
        const closedBattleIds = new Set<string>();
        if (linkedBattleIds.length > 0) {
          const { data: linkedBattles } = await supabase
            .from("battles")
            .select("id,status,battle_ended_at")
            .in("id", linkedBattleIds);
          ((linkedBattles as Array<{ id?: string | null; status?: string | null; battle_ended_at?: string | null }> | null) ?? [])
            .filter((row) => row.id && (row.battle_ended_at || ["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"].includes(row.status ?? "")))
            .forEach((row) => closedBattleIds.add(row.id as string));
        }
        const visibleRows = baseRows.filter((row) => !isExpiredOpenPoolEntry(row) && (!row.match_group_id || !closedBattleIds.has(row.match_group_id)));
        if (focusQueueId && !visibleRows.some((row) => row.id === focusQueueId)) {
          let { data: focusedRow, error: focusedError } = await supabase
            .from("battle_queue")
            .select("id, fighter_name, original_file_name, status, match_group_id, expires_at")
            .eq("id", focusQueueId)
            .maybeSingle<{
              id: string;
              fighter_name?: string | null;
              original_file_name?: string | null;
              status?: string | null;
              match_group_id?: string | null;
              expires_at?: string | null;
              scheduled_start_at?: string | null;
              cancellation_evaluation_at?: string | null;
            }>();
          if (focusedError) {
            const msg = `${focusedError.message ?? ""} ${focusedError.details ?? ""} ${focusedError.hint ?? ""}`;
            const missingScheduleColumn = /scheduled_start_at|cancellation_evaluation_at|schema cache|does not exist|PGRST204/i.test(msg);
            if (missingScheduleColumn) {
              const legacyRead = await supabase
                .from("battle_queue")
                .select("id, fighter_name, original_file_name, status, match_group_id, expires_at")
                .eq("id", focusQueueId)
                .maybeSingle<{
                  id: string;
                  fighter_name?: string | null;
                  original_file_name?: string | null;
                  status?: string | null;
                  match_group_id?: string | null;
                  expires_at?: string | null;
                }>();
              focusedRow = legacyRead.data as typeof focusedRow;
              focusedError = legacyRead.error;
            }
          }
          if (focusedRow?.id) {
            const focusedStatus = shouldExpireOpenDropQueue({
              status: focusedRow.status,
              expires_at: focusedRow.expires_at ?? null,
              scheduled_start_at: focusedRow.scheduled_start_at ?? null,
              cancellation_evaluation_at: focusedRow.cancellation_evaluation_at ?? null,
            })
              ? "expired"
              : focusedRow.status ?? null;
            setFocusedClosedCard({
              id: focusedRow.id,
              status: focusedStatus,
              fighterName: focusedRow.fighter_name || (isZh ? "創作者" : "Creator"),
              songName: focusedRow.original_file_name || (isZh ? "這首 Drop" : "This Drop"),
              battleId: focusedRow.match_group_id ?? null,
            });
          } else {
            setFocusedClosedCard({
              id: focusQueueId,
              status: "accepted_unknown",
              fighterName: isZh ? "這張戰帖" : "This card",
              songName: isZh ? "如果戰鬥仍在，請直接進入戰場觀戰；若已結束，系統會提示你查看戰果。" : "If the battle is still live, enter the arena to watch. If it has ended, the arena will point you to the result.",
              battleId: focusQueueId,
            });
          }
        } else {
          setFocusedClosedCard(null);
        }
        setHookSongStats(await fetchHookSongBattleStats(visibleRows.map((row) => row.original_file_name)));
        const userIds = Array.from(new Set(visibleRows.map((row) => row.user_id).filter(Boolean)));
        const { data: profiles } =
          userIds.length > 0
            ? await supabase.from("user_profiles").select("id, level").in("id", userIds)
            : { data: [] };
        const levelMap = new Map((profiles ?? []).map((row: { id: string; level?: number | null }) => [row.id, row.level ?? 1]));
        setRows(
          visibleRows.map((row) => {
            return { ...row, fighter_rank: rankLabelForLevel(levelMap.get(row.user_id) ?? 1, row.fighter_name) };
          }),
        );
      }
      setLoading(false);
    };

    void load();

    const channel =
      !isAuthBypassEnabled &&
      supabase
        .channel("battle-pool-open")
        .on("postgres_changes", { event: "*", schema: "public", table: "battle_queue" }, () => {
          void load();
        })
        .subscribe();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [focusQueueId, isZh]);

  useEffect(() => {
    if (!focusQueueId || loading || (rows.length === 0 && !focusedClosedCard)) return;
    const id = window.setTimeout(() => {
      document.getElementById(`battle-pool-${focusQueueId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [focusedClosedCard, focusQueueId, loading, rows.length]);

  const cancelOwnHook = async (entryId: string) => {
    setCancelError(null);
    setCancelQueueId(entryId);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error(isZh ? "請先登入後再取消挑戰。" : "Please sign in before cancelling.");
      await cancelCurrentBattleIntent({ accessToken: token });
      setRows((items) => items.filter((item) => item.id !== entryId));
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : isZh ? "取消失敗，請稍後再試。" : "Cancel failed. Please try again.");
    } finally {
      setCancelQueueId(null);
    }
  };

  if (loading) {
    return (
      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm text-zinc-500">
        {t("pool_loading")}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-orange-300/18 bg-black/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.38em] text-orange-300/80">90s Drop Battle Pool</p>
          <h2 className="mt-2 text-2xl font-black text-white">{isZh ? "90s 最強抓波Drop Battle 公開挑戰池" : "90s Drop Battle Challenge Pool"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            {t("pool_body")}
          </p>
        </div>
        <Link
          href="/battle/setup"
          className="w-fit rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-orange-300/60 hover:text-white"
        >
          {isZh ? "挑戰 90s 最強抓波Drop Battle" : "Challenge 90s Drop Battle"}
        </Link>
      </div>

      {cancelError ? (
        <div className="mb-4 rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
          {cancelError}
        </div>
      ) : null}

      {focusedClosedCard ? (
        <article id={`battle-pool-${focusedClosedCard.id}`} className="mb-4 rounded-[1.4rem] border border-yellow-200/30 bg-yellow-300/[0.08] p-5 shadow-[0_0_34px_rgba(250,204,21,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-yellow-100/75">
            {isZh ? "戰帖狀態" : "Card Status"}
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {focusedPoolCardTitle(focusedClosedCard.status, isZh)}
          </h3>
          <p className="mt-2 text-sm font-bold leading-6 text-zinc-300">
            {focusedClosedCard.fighterName} · {focusedClosedCard.songName}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {focusedClosedCard.battleId && !isClosedBattleStatus(focusedClosedCard.status) ? (
              <Link
                href={`/battle/${encodeURIComponent(focusedClosedCard.battleId)}?lang=${lang}`}
                className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-black shadow-[0_0_20px_rgba(255,106,0,0.2)] transition hover:bg-orange-300"
              >
                {isZh ? "我要觀戰" : "Watch Battle"}
              </Link>
            ) : null}
            {focusedClosedCard.battleId && isClosedBattleStatus(focusedClosedCard.status) ? (
              <Link
                href={`/battle/result?battleId=${encodeURIComponent(focusedClosedCard.battleId)}&lang=${lang}`}
                className="rounded-full bg-yellow-300 px-5 py-2.5 text-sm font-black text-black transition hover:bg-yellow-100"
              >
                {isZh ? "查看戰果" : "View Result"}
              </Link>
            ) : null}
            <Link
              href={`/battle?lang=${lang}`}
              className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-black text-zinc-200 transition hover:border-orange-200/60 hover:text-white"
            >
              {isZh ? "回戰鬥池" : "Back to Pool"}
            </Link>
          </div>
        </article>
      ) : null}

      {rows.length === 0 && !focusedClosedCard ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-6 text-center">
          <p className="text-sm font-bold text-zinc-300">{t("pool_empty_title")}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-zinc-500">
            {t("pool_empty_body")}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((entry) => {
            const ghostBattleId = entry.status === "ghost_battle" ? entry.match_group_id : null;
            const isGhost = Boolean(ghostBattleId);
            const isPublicVoting = entry.status === "public_voting";
            const isMine = Boolean(currentUserId && entry.user_id === currentUserId);
            const isFocused = focusQueueId === entry.id;
            const arenaPath = `/battle/${entry.id}?lang=${lang}`;
            const acceptPath = `/battle/accept/${encodeURIComponent(entry.id)}?lang=${lang}`;
            const href = isGhost
              ? `/battle/${ghostBattleId}?lang=${lang}`
              : arenaPath;
            const shareUrl = isGhost
              ? focusedBattleHref(ghostBattleId || entry.id, lang)
              : (() => {
                  return focusedQueueHref(entry.id, lang);
                })();
            const shareLabel = isGhost || isPublicVoting
              ? isZh
                ? "邀請觀戰投票"
                : "Invite voters"
              : isZh
                ? "分享戰帖 / 約戰"
                : "Share / Challenge";
            const hookStartAt = resolveDropBattleScheduledStart(entry);
            const hookStartText = hookStartAt
              ? isZh
                ? `開戰時間：${formatBattleCardTime(hookStartAt, true)}（台灣時間）。請大家提前 1 分鐘進場。`
                : `Starts: ${formatBattleCardTime(hookStartAt, false)} Taiwan time. Please enter 1 minute early.`
              : "";
            const label = isMine
              ? isZh
                ? "我的戰場"
                : "My Arena"
              : isGhost
                ? t("pool_enter_ghost")
                : isPublicVoting
                  ? t("pool_public_vote")
                : isZh
                  ? "開放接戰"
                  : "Open Challenge";
            const cardClassName = `group block rounded-[1.4rem] border p-4 transition ${
              isFocused
                ? "border-orange-200/80 bg-orange-400/[0.13] shadow-[0_0_38px_rgba(255,106,0,0.22)]"
                : isMine
                  ? "border-cyan-200/35 bg-cyan-300/[0.07]"
                  : "border-white/10 bg-white/[0.04] hover:border-orange-300/50 hover:bg-white/[0.065]"
            }`;
            const content = (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    {isMine
                      ? isZh
                        ? "MY WAITING DROP"
                        : "MY WAITING DROP"
                      : entry.status === "waiting_challenge"
                        ? isZh
                          ? "等待挑戰"
                          : "Waiting Challenge"
                        : entry.status === "ghost_battle"
                          ? "Ghost Battle"
                          : "Public Voting"}
                  </p>
                  <p className="mt-2 truncate text-lg font-black text-white">{entry.original_file_name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {entry.fighter_name}
                    {entry.fighter_rank && <span className="ml-2 rounded-full border border-orange-300/25 px-2 py-0.5 text-[11px] font-bold text-orange-100">{entry.fighter_rank}</span>}
                    <span className="ml-2">· {entry.genre}</span>
                  </p>
                  <div className="mt-2">
                    <SongBattleStatsPill stats={hookSongStats[normalizeSongStatsKey(entry.original_file_name)]} isZh={isZh} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-black text-orange-100/85">
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                      {isPublicVoting ? (isZh ? "投票開放" : "Voting") : isZh ? "上架" : "Listed"} {formatBattleCardTime(entry.created_at, isZh)}
                    </span>
                    {!isPublicVoting ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-300">
                        {formatBattleAge(entry.created_at, isZh)}
                      </span>
                    ) : null}
                    {hookStartAt ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-orange-200/45 bg-orange-400/15 px-4 py-1 text-base text-orange-50 shadow-[0_0_18px_rgba(255,116,28,0.16)]">
                        {isZh ? "開戰" : "Starts"} {formatBattleCardTime(hookStartAt, isZh)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {isMine
                      ? isZh
                        ? "你的 90s 最強抓波Drop Battle 戰場已開。時間內可離開再進來，對手加入後直接開打。"
                        : "Your 90s Drop Battle arena is open. Re-enter anytime before start; it goes live when a rival joins."
                      : entry.status === "waiting_challenge"
                        ? isZh
                          ? `${entry.ai_tool || "AI Tool"} · 接受挑戰先上傳 Drop；觀戰才進戰場`
                          : `${entry.ai_tool || "AI Tool"} · Accept by uploading a Drop; watch enters the arena`
                        : `${entry.ai_tool || "AI Tool"} ${isPublicVoting && entry.public_vote_score ? `· +${entry.public_vote_score} APC` : ""}`}
                  </p>
                  {isMine ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={arenaPath}
                        className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-black transition hover:bg-cyan-100"
                      >
                        {isZh ? "進入戰場" : "Enter Arena"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void cancelOwnHook(entry.id)}
                        disabled={cancelQueueId === entry.id}
                        className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-60"
                      >
                        {cancelQueueId === entry.id ? (isZh ? "取消中..." : "Cancelling...") : isZh ? "取消 / 離開" : "Cancel / Leave"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition ${
                    isMine
                      ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100"
                      : "border-orange-300/30 text-orange-100 group-hover:bg-orange-500 group-hover:text-black"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
            return (
              <li key={entry.id} id={`battle-pool-${entry.id}`}>
                <article className={cardClassName}>
                  {isMine || entry.status === "waiting_challenge" ? content : (
                    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                      {content}
                    </Link>
                  )}
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                    {!isMine && entry.status === "waiting_challenge" ? (
                      <>
                        <Link
                          href={acceptPath}
                          className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_20px_rgba(255,106,0,0.2)] transition hover:bg-orange-300"
                        >
                          {isZh ? "我要接受挑戰" : "Accept Challenge"}
                        </Link>
                        <Link
                          href={arenaPath}
                          className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-50 transition hover:border-cyan-100"
                        >
                          {isZh ? "我要觀戰" : "Watch"}
                        </Link>
                      </>
                    ) : null}
                    <ShareButton
                      title={isZh ? "AIPOGER 90s 最強抓波Drop Battle 戰帖" : "AIPOGER 90s Drop Battle Card"}
                      text={
                        isGhost || isPublicVoting
                          ? isZh
                            ? `《${entry.original_file_name}》正在 AIPOGER AI 音樂鬥歌場，進來觀戰投票。`
                            : `"${entry.original_file_name}" is in the AIPOGER AI Music Battle Hall. Come vote.`
                          : isZh
                            ? `${entry.fighter_name} 的《${entry.original_file_name}》正在等人接戰。${hookStartText}進來聊天預測支持誰的歌最熱血最動人，或是你來挑戰？Show me what you got!!!`
                            : `${entry.fighter_name}'s "${entry.original_file_name}" is waiting for a challenger. ${hookStartText}Back the hottest, most moving Drop in chat, or step in and challenge. Show me what you got!!!`
                      }
                      url={shareUrl}
                      label={shareLabel}
                      copiedLabel={isZh ? "戰帖已複製" : "Battle card copied"}
                      className="px-3 py-1.5 text-xs"
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LiveBattleList() {
  const { t, lang } = useI18n();
  const isZh = lang === "zh";
  const searchParams = useSearchParams();
  const focusQueueId = searchParams.get("focusQueue");
  const focusBattleId = searchParams.get("focusBattle");
  const [rows, setRows] = useState<LiveBattleRow[]>([]);
  const [liveSongStats, setLiveSongStats] = useState<Record<string, SongBattleStats>>({});
  const [archivedBattleIds, setArchivedBattleIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focusBattleId) rememberAuthNextPath(focusedBattleHref(focusBattleId, lang));
  }, [focusBattleId, lang]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (isAuthBypassEnabled) {
        setRows([]);
        setLoading(false);
        return;
      }

      let { data, error: qErr } = await supabase
        .from("battles")
        .select("id, status, fighter_a_user_id, fighter_b_user_id, fighter_a_name, fighter_b_name, song_a_name, song_b_name, genre, created_at, battle_started_at, started_at, battle_ended_at")
        .in("status", ["active", "live"])
        .is("battle_ended_at", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (qErr) {
        const msg = `${qErr.message ?? ""} ${qErr.details ?? ""} ${qErr.hint ?? ""}`;
        const missingRuntimeColumn = /scheduled_start_at|battle_started_at|started_at|schema cache|column.*does not exist|PGRST204/i.test(msg);
        if (missingRuntimeColumn) {
          const legacyRead = await supabase
            .from("battles")
            .select("id, status, fighter_a_user_id, fighter_b_user_id, fighter_a_name, fighter_b_name, song_a_name, song_b_name, genre, created_at, battle_started_at, started_at, battle_ended_at")
            .in("status", ["active", "live"])
            .is("battle_ended_at", null)
            .order("created_at", { ascending: false })
            .limit(30);
          data = legacyRead.data as typeof data;
          qErr = legacyRead.error;
        }
      }

      if (!mounted) return;
      if (qErr) {
        console.error(qErr);
        setError(t("watch_list_error"));
        setRows([]);
      } else {
        setError(null);
        let baseRows = ((data as LiveBattleRow[]) ?? []).filter((row) => {
          if (row.battle_ended_at) return false;
          if (row.status === "active") return true;
          if (row.status !== "live") return false;
          const scheduledMs = Date.parse(row.scheduled_start_at ?? row.started_at ?? "");
          return !Number.isFinite(scheduledMs) || scheduledMs <= Date.now() || Boolean(row.battle_started_at);
        });
        if (focusBattleId && !baseRows.some((row) => row.id === focusBattleId)) {
          let { data: focusedBattle, error: focusedError } = await supabase
            .from("battles")
            .select("id, status, fighter_a_user_id, fighter_b_user_id, fighter_a_name, fighter_b_name, song_a_name, song_b_name, genre, created_at, battle_started_at, started_at, battle_ended_at")
            .eq("id", focusBattleId)
            .maybeSingle<LiveBattleRow>();
          if (focusedError) {
            const msg = `${focusedError.message ?? ""} ${focusedError.details ?? ""} ${focusedError.hint ?? ""}`;
            const missingRuntimeColumn = /scheduled_start_at|battle_started_at|started_at|schema cache|column.*does not exist|PGRST204/i.test(msg);
            if (missingRuntimeColumn) {
              const legacyRead = await supabase
                .from("battles")
                .select("id, status, fighter_a_user_id, fighter_b_user_id, fighter_a_name, fighter_b_name, song_a_name, song_b_name, genre, created_at, battle_started_at, started_at, battle_ended_at")
                .eq("id", focusBattleId)
                .maybeSingle<LiveBattleRow>();
              focusedBattle = legacyRead.data;
              focusedError = legacyRead.error;
            }
          }
          if (
            focusedBattle?.id &&
            (["active", "live"].includes(focusedBattle.status ?? "") ||
              Boolean(focusedBattle.battle_ended_at) ||
              isClosedBattleStatus(focusedBattle.status) ||
              isDropBattleEndedOrPastExpectedEnd(focusedBattle))
          ) {
            baseRows = [focusedBattle, ...baseRows];
          }
        }
        const battleIds = baseRows.map((row) => row.id).filter(Boolean);
        if (battleIds.length > 0) {
          const { data: archives } = await supabase
            .from("battle_result_archives")
            .select("battle_id")
            .in("battle_id", battleIds);
          setArchivedBattleIds(new Set(((archives as Array<{ battle_id?: string | null }> | null) ?? []).map((row) => row.battle_id).filter((id): id is string => Boolean(id))));
        } else {
          setArchivedBattleIds(new Set());
        }
        setLiveSongStats(await fetchHookSongBattleStats(baseRows.flatMap((row) => [row.song_a_name, row.song_b_name])));
        const userIds = Array.from(new Set(baseRows.flatMap((row) => [row.fighter_a_user_id, row.fighter_b_user_id]).filter(Boolean)));
        const { data: profiles } =
          userIds.length > 0
            ? await supabase.from("user_profiles").select("id, level").in("id", userIds)
            : { data: [] };
        const levelMap = new Map((profiles ?? []).map((row: { id: string; level?: number | null }) => [row.id, row.level ?? 1]));
        setRows(
          baseRows.map((row) => {
            return {
              ...row,
              fighter_a_rank: rankLabelForLevel(levelMap.get(row.fighter_a_user_id) ?? 1, row.fighter_a_name),
              fighter_b_rank: rankLabelForLevel(levelMap.get(row.fighter_b_user_id) ?? 1, row.fighter_b_name),
            };
          }),
        );
      }
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [focusBattleId, t]);

  useEffect(() => {
    if (!focusBattleId || loading || rows.length === 0) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`battle-live-${focusBattleId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusBattleId, loading, rows.length]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-[#ece9e6]">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_20%,rgba(255,106,0,0.2),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(0,203,255,0.14),transparent_28%),linear-gradient(180deg,#050505,#0b0908)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-10 pt-24 sm:px-6 md:px-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-orange-300/80">AIPOGER LIVE LOBBY</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
              {t("watch_page_title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
              {t("watch_live_hint")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pr-20">
            <ShareButton
              title={t("watch_share_title")}
              text={t("watch_share_text")}
              label={t("watch_share_label")}
              copiedLabel={t("common_copied")}
            />
            <Link
              href="/listen-bar"
              className="w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {t("btn_listen_bar")}
            </Link>
            <Link
              href="/battle/result"
              className="w-fit rounded-full border border-orange-300/30 bg-orange-500/10 px-5 py-2.5 text-sm font-semibold tracking-[0.12em] text-orange-100 transition hover:border-orange-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {t("watch_result_card")}
            </Link>
            <Link
              href="/rank"
              className="w-fit rounded-full border border-yellow-300/30 bg-yellow-400/10 px-5 py-2.5 text-sm font-semibold tracking-[0.12em] text-yellow-100 transition hover:border-yellow-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
            >
              {t("watch_rank")}
            </Link>
            <Link
              href={`/hook-guide${lang === "en" ? "?lang=en" : "?lang=zh"}`}
              className="w-fit rounded-full border border-white/15 bg-white/[0.045] px-5 py-2.5 text-sm font-semibold tracking-[0.12em] text-zinc-200 transition hover:border-orange-200/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {isZh ? "Drop Battle 規則" : "Drop Battle Rules"}
            </Link>
          </div>
        </header>

        {isAuthBypassEnabled && (
          <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            {t("watch_bypass_list")}
          </p>
        )}

        <BattlePoolList />

        {loading ? (
          <p className="mt-8 rounded-3xl border border-orange-400/20 bg-orange-500/10 px-5 py-8 text-center text-sm tracking-[0.2em] text-[#ff8d40]">
            {t("common_loading")}
          </p>
        ) : error ? (
          <p className="mt-8 rounded-3xl border border-red-400/20 bg-red-500/10 px-5 py-8 text-center text-sm text-red-300">{error}</p>
        ) : rows.length === 0 && !focusQueueId && !focusBattleId ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
            <p className="text-2xl font-black text-white">{t("watch_no_live_title")}</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              {t("watch_no_live_body")}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/battle/setup"
                className="inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-black tracking-[0.12em] text-black transition hover:bg-orange-300"
              >
                {t("watch_upload_pool")}
              </Link>
              <Link
                href="/listen-bar"
                className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-6 py-3 text-sm font-black tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200 hover:text-white"
              >
                {t("watch_listen_public")}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {rows.map((b) => {
              const scheduledAt = resolveDropBattleRuntimeStart(b);
              const scheduledMs = new Date(scheduledAt ?? "").getTime();
              const battleStartShareText = scheduledAt
                ? lang === "zh"
                  ? `開戰時間：${formatBattleCardTime(scheduledAt, true)}（台灣時間）。請大家提前 1 分鐘進場。`
                  : `Starts: ${formatBattleCardTime(scheduledAt, false)} Taiwan time. Please enter 1 minute early.`
                : "";
              const likelyEndedByClock =
                Number.isFinite(scheduledMs) &&
                scheduledMs + DROP_BATTLE_EXPECTED_END_BUFFER_MS <= Date.now();
              const isBattleEnded = Boolean(b.battle_ended_at) || isClosedBattleStatus(b.status) || archivedBattleIds.has(b.id);
              const isEndedByClock = !isBattleEnded && likelyEndedByClock;
              const showEndedState = isBattleEnded || isEndedByClock;
              const isFutureBattle =
                !showEndedState &&
                (b.status === "active" || (Number.isFinite(scheduledMs) && scheduledMs > Date.now() && !b.battle_started_at));
              const primaryHref = isBattleEnded ? `/battle/result?battleId=${encodeURIComponent(b.id)}&lang=${lang}` : `/battle/${b.id}?lang=${lang}`;
              const shareHref = isBattleEnded ? primaryHref : focusedBattleHref(b.id, lang);
              const isFocusedBattle = focusBattleId === b.id;
              return (
                <li key={b.id} id={`battle-live-${b.id}`}>
                  <article
                    className={`group relative overflow-hidden rounded-[1.6rem] border px-5 py-5 transition hover:border-orange-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_34px_rgba(255,106,0,0.16)] ${
                      isFocusedBattle
                        ? "border-orange-200/80 bg-orange-400/[0.11] shadow-[0_0_44px_rgba(255,106,0,0.22)]"
                        : "border-white/10 bg-white/[0.045]"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-400 via-orange-600 to-cyan-400" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                          {t("mq_genre")} · {b.genre}
                        </p>
                        <p className="mt-2 text-xl font-black text-white md:text-2xl">
                          <span>{b.fighter_a_name}</span>
                          {b.fighter_a_rank && <span className="ml-2 align-middle text-xs font-bold text-orange-200">{b.fighter_a_rank}</span>}
                          <span className="mx-2 text-orange-400">vs</span>
                          <span>{b.fighter_b_name}</span>
                          {b.fighter_b_rank && <span className="ml-2 align-middle text-xs font-bold text-cyan-200">{b.fighter_b_rank}</span>}
                        </p>
                        <p className="mt-2 text-sm text-zinc-400">
                          {b.song_a_name} / {b.song_b_name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <SongBattleStatsPill stats={liveSongStats[normalizeSongStatsKey(b.song_a_name)]} isZh={lang === "zh"} />
                          <SongBattleStatsPill stats={liveSongStats[normalizeSongStatsKey(b.song_b_name)]} isZh={lang === "zh"} tone="cyan" />
                        </div>
                        <p className="mt-2 text-xs font-bold text-orange-100/75">
                          {isBattleEnded
                            ? (lang === "zh" ? "已完成戰鬥" : "Battle completed")
                            : isEndedByClock
                              ? (lang === "zh" ? "已完成戰鬥" : "Battle completed")
                            : isFutureBattle
                              ? (lang === "zh" ? "已進場，等待開打" : "In arena, waiting to start")
                              : (lang === "zh" ? "開戰" : "Started")}{" "}
                          {formatBattleCardTime(scheduledAt, lang === "zh")}
                        </p>
                      </div>
                      <span className="mt-2 shrink-0 rounded-full border border-orange-400/35 px-4 py-2 text-sm font-bold text-[#ffbf99] transition group-hover:bg-orange-500 group-hover:text-black sm:mt-0">
                        {isBattleEnded
                          ? (lang === "zh" ? "查看戰果" : "View Result")
                          : isEndedByClock
                            ? (lang === "zh" ? "已完成戰鬥" : "Completed")
                            : isFutureBattle
                              ? (lang === "zh" ? "等待開打" : "Warmup")
                              : (lang === "zh" ? "可觀戰投票" : "Watch & Vote")}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                      <Link
                        href={primaryHref}
                        className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_20px_rgba(255,106,0,0.2)] transition hover:bg-orange-300"
                      >
                        {isBattleEnded
                          ? (lang === "zh" ? "查看戰果" : "View Result")
                          : isEndedByClock
                            ? (lang === "zh" ? "查看戰鬥卡" : "View Battle")
                            : (lang === "zh" ? "我要觀戰" : "Watch Battle")}
                      </Link>
                      <ShareButton
                        title={lang === "zh" ? "AIPOGER 90s Drop Battle 觀戰邀請" : "AIPOGER 90s Drop Battle"}
                        text={
                          isBattleEnded
                            ? lang === "zh"
                              ? `《${b.song_a_name}》vs《${b.song_b_name}》此戰鬥已經結束，進來查看戰果。`
                              : `"${b.song_a_name}" vs "${b.song_b_name}" has ended. View the result.`
                          : isEndedByClock
                            ? lang === "zh"
                              ? `《${b.song_a_name}》vs《${b.song_b_name}》此戰鬥已經結束，進來查看。`
                              : `"${b.song_a_name}" vs "${b.song_b_name}" has ended. Open it to view.`
                          : isFutureBattle
                              ? lang === "zh"
                                ? `《${b.song_a_name}》vs《${b.song_b_name}》已進場等待開打。${battleStartShareText}先進來聽 5 秒預播。`
                                : `"${b.song_a_name}" vs "${b.song_b_name}" is waiting to start. ${battleStartShareText} Hear the 5s previews.`
                              : lang === "zh"
                                ? `《${b.song_a_name}》vs《${b.song_b_name}》正在開打，進來觀戰投票。`
                                : `"${b.song_a_name}" vs "${b.song_b_name}" is live. Come vote.`
                        }
                        url={shareHref}
                        label={isBattleEnded
                          ? (lang === "zh" ? "分享戰果" : "Share Result")
                          : isEndedByClock
                            ? (lang === "zh" ? "分享戰鬥" : "Share Battle")
                            : isFutureBattle
                              ? (lang === "zh" ? "分享到戰鬥池" : "Share Pool Card")
                              : (lang === "zh" ? "邀請觀戰投票" : "Invite voters")}
                        copiedLabel={lang === "zh" ? "觀戰連結已複製" : "Invite copied"}
                        className="px-3 py-1.5 text-xs"
                      />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {SHOW_DAILY_BATTLE_SECTION ? <DailyBattleList /> : null}
      </div>
    </main>
  );
}

function BattleArena({ matchId }: { matchId: string }) {
  const { t } = useI18n();
  const [comments, setComments] = useState(seedComments);
  const [message, setMessage] = useState("");
  const [battleData, setBattleData] = useState<BattleViewData>(mockBattleData);
  const [activeDeck, setActiveDeck] = useState<DeckKey | null>(null);
  const [forfeitedDecks, setForfeitedDecks] = useState<Record<DeckKey, boolean>>({ A: false, B: false });
  const [firstAttack, setFirstAttack] = useState<DeckKey>("A");
  const [audioUrls, setAudioUrls] = useState<Record<DeckKey, string | null>>({ A: null, B: null });
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const canPlayMap = useMemo(
    () => ({
      A: !forfeitedDecks.A,
      B: !forfeitedDecks.B,
    }),
    [forfeitedDecks],
  );

  useEffect(() => {
    setFirstAttack(Math.random() >= 0.5 ? "A" : "B");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBattleData = async () => {
      if (matchId.startsWith("mock-") || isAuthBypassEnabled) {
        return;
      }

      const { data, error } = await supabase
        .from("battles")
        .select(
          "id, fighter_a_name, song_a_name, audio_a_path, fighter_b_name, song_b_name, audio_b_path",
        )
        .eq("id", matchId)
        .single<{
          id: string;
          fighter_a_name: string | null;
          song_a_name: string | null;
          audio_a_path: string | null;
          fighter_b_name: string | null;
          song_b_name: string | null;
          audio_b_path: string | null;
        }>();

      if (!isMounted || error || !data) return;

      setBattleData({
        id: data.id,
        deckA: {
          fighterName: data.fighter_a_name ?? "A Side 鬥士",
          songName: data.song_a_name ?? "Deck A Track",
          audioPath: data.audio_a_path,
        },
        deckB: {
          fighterName: data.fighter_b_name ?? "B Side 鬥士",
          songName: data.song_b_name ?? "Deck B Track",
          audioPath: data.audio_b_path,
        },
      });
    };

    fetchBattleData();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    let mounted = true;

    const resolveAudioUrls = async () => {
      const nextUrls: Record<DeckKey, string | null> = { A: null, B: null };

      const entries: Array<[DeckKey, string | null]> = [
        ["A", battleData.deckA.audioPath],
        ["B", battleData.deckB.audioPath],
      ];

      for (const [key, path] of entries) {
        if (!path || path.startsWith("mock-")) continue;
        const { data } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60);
        nextUrls[key] = data?.signedUrl ?? null;
      }

      if (!mounted) return;
      setAudioUrls(nextUrls);
    };

    resolveAudioUrls();

    return () => {
      mounted = false;
    };
  }, [battleData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForfeitedDecks((prev) => ({
        A: prev.A || activeDeck !== "A",
        B: prev.B || activeDeck !== "B",
      }));
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [activeDeck]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setComments((prev) => [trimmed, ...prev].slice(0, 20));
    setMessage("");
  };

  const pauseAll = () => {
    audioARef.current?.pause();
    audioBRef.current?.pause();
  };

  const handlePlay = (deck: DeckKey) => {
    if (!canPlayMap[deck]) return;

    const targetAudio = deck === "A" ? audioARef.current : audioBRef.current;
    pauseAll();
    setActiveDeck(deck);

    if (targetAudio?.src) {
      targetAudio.currentTime = 0;
      targetAudio.play().catch(() => {
        setComments((prev) => [`${deck} 隊音訊播放失敗，請稍後再試。`, ...prev].slice(0, 20));
      });
    } else {
      setComments((prev) => [`${deck} 隊已觸發 PLAY（目前使用模擬音訊）。`, ...prev].slice(0, 20));
    }
  };

  return (
    <main className="min-h-screen bg-[#1b1d20] text-[#ece9e6]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-5 pt-6 sm:px-6 md:px-10 md:pb-8">
        <header className="mb-5 flex items-center justify-between border-b border-[#4f5358] pb-4">
          <div>
            <p className="text-xs tracking-[0.4em] text-[#8e847f]">AIPOGER</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.2em] text-[#f2efec] md:text-3xl">
              {t("battle_list_title")}
            </h1>
          </div>
        </header>

        <div className="mb-4 rounded-xl border border-[#4f5358] bg-[#25292d] px-4 py-3 text-sm tracking-[0.12em] text-[#f0e6df]">
          先攻判定：<span className="font-semibold text-[#ffbf99]">{firstAttack} 隊先攻</span>
        </div>

        <section className="grid flex-1 grid-rows-[auto_auto_1fr] gap-6 md:grid-cols-2 md:grid-rows-[auto_auto]">
          <div className="rounded-3xl border border-[#4d5257] bg-[#24272b]/80 px-4 py-6 md:px-7">
            <Turntable
              label="SONG DECK A"
              deckKey="A"
              fighterName={battleData.deckA.fighterName}
              songName={battleData.deckA.songName}
              isActive={activeDeck === "A"}
              isForfeited={forfeitedDecks.A}
              canPlay={canPlayMap.A}
              onPlay={handlePlay}
            />
          </div>
          <div className="rounded-3xl border border-[#4d5257] bg-[#24272b]/80 px-4 py-6 md:px-7">
            <Turntable
              label="SONG DECK B"
              deckKey="B"
              fighterName={battleData.deckB.fighterName}
              songName={battleData.deckB.songName}
              isActive={activeDeck === "B"}
              isForfeited={forfeitedDecks.B}
              canPlay={canPlayMap.B}
              onPlay={handlePlay}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 md:gap-4">
            <VoteButton team="A" />
            <VoteButton team="B" />
          </div>

          <section className="flex min-h-[230px] flex-col rounded-2xl border border-[#4d5257] bg-[#23262a] p-4 md:col-span-2 md:min-h-[260px] md:p-5">
            <h2 className="text-sm font-medium tracking-[0.2em] text-[#baa9a0]">彈幕牆</h2>
            <SafetyNotice kind="chat" compact className="mt-3" />
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto rounded-xl border border-[#3f4348] bg-[#1c1f22] p-3">
              {comments.map((comment, index) => (
                <p
                  key={`${comment}-${index}`}
                  className="rounded-lg border border-[#3e4247] bg-[#2a2e33] px-3 py-2 text-sm text-[#ddd7d2]"
                >
                  {comment}
                </p>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={handleSend}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="輸入你的彈幕留言..."
                className="h-11 flex-1 rounded-xl border border-[#5f646a] bg-[#2a2e33] px-4 text-sm text-[#f2efec] placeholder:text-[#9b938e] focus:outline-none focus:ring-2 focus:ring-[#ff7a28]"
              />
              <button
                type="submit"
                className="rounded-xl border border-[#767c82] bg-gradient-to-b from-[#646a70] to-[#4a4f55] px-4 text-sm font-medium tracking-[0.1em] text-[#f4efeb] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a28]"
              >
                發送
              </button>
            </form>
          </section>
        </section>

        <audio
          ref={audioARef}
          src={audioUrls.A ?? undefined}
          onEnded={() => setActiveDeck((prev) => (prev === "A" ? null : prev))}
        />
        <audio
          ref={audioBRef}
          src={audioUrls.B ?? undefined}
          onEnded={() => setActiveDeck((prev) => (prev === "B" ? null : prev))}
        />
      </div>
    </main>
  );
}

function BattleContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return <LiveBattleList />;
  }

  return <BattleArena matchId={matchId} />;
}

function BattleSuspenseFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b1d20] text-sm tracking-[0.2em] text-[#ff8d40]">
      {t("common_loading")}
    </div>
  );
}

// ─── Page export（只負責 Suspense 包裝）─────────────────────────────────────

export default function BattlePage() {
  return (
    <Suspense fallback={<BattleSuspenseFallback />}>
      <BattleContent />
    </Suspense>
  );
}
