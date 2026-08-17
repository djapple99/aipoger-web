"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/share-button";
import BattleWinnerReleaseLink from "@/components/battle-winner-release-link";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { DROP_BATTLE_OFFICIAL_AUDIENCE_MIN } from "@/lib/drop-battle-rematch";
import { battleResultShortPath, battleShortPath } from "@/lib/share-short-links";
import { supabase } from "@/lib/supabase";

type WinnerSide = "fighter_a" | "fighter_b";
type BattleRecordMode = "q_crash" | "drop_battle";

type ArchiveRow = {
  battle_id?: string | null;
  battle_code?: string | null;
  winner?: string | null;
  winner_name?: string | null;
  winner_song_name?: string | null;
  winner_ai_tool?: string | null;
  opponent_name?: string | null;
  opponent_song_name?: string | null;
  final_vote_left?: number | null;
  final_vote_right?: number | null;
  total_votes?: number | null;
  audience_review?: string | null;
  result_payload?: Record<string, unknown> | null;
  archived_at?: string | null;
};

type BattleAudioRow = {
  id?: string | null;
  winner?: string | null;
  audio_a_path?: string | null;
  audio_b_path?: string | null;
  lyrics_a?: string | null;
  lyrics_b?: string | null;
  song_a_cover?: string | null;
  song_b_cover?: string | null;
  queue_a_id?: string | null;
  queue_b_id?: string | null;
  fighter_a_user_id?: string | null;
  fighter_b_user_id?: string | null;
};

type FighterProfileMediaRow = {
  id?: string | null;
  song_cover_url?: string | null;
  avatar_url?: string | null;
};

type QCrashPublicMediaWork = {
  queueId: string | null;
  coverUrl: string | null;
  fullSongUrl: string | null;
};

type QCrashPublicMediaItem = {
  battleId: string;
  works: { A: QCrashPublicMediaWork; B: QCrashPublicMediaWork };
};

type ResultRecord = {
  id: string;
  battleId: string | null;
  battleCode: string;
  winnerSide: WinnerSide | null;
  winnerName: string;
  winnerSong: string;
  opponentName: string;
  opponentSong: string;
  tool: string;
  genre: string;
  coverUrl: string;
  finalVoteLeft: number;
  finalVoteRight: number;
  votesTotal: number;
  audienceCount: number;
  audienceReview: string;
  archivedAt: string;
  audioUrl: string | null;
  fullSongUrl: string | null;
  youtubeUrl: string | null;
  mode: BattleRecordMode;
  publicVisible: boolean;
};

const ARCHIVE_SELECT =
  "battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at";

function numberField(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function textField(value: unknown) {
  return String(value ?? "").trim();
}

function winnerSide(value: unknown): WinnerSide | null {
  return value === "fighter_a" || value === "fighter_b" ? value : null;
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function monthKey(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string, isZh: boolean) {
  if (key === "unknown") return isZh ? "未封存月份" : "Unfiled";
  const [year, month] = key.split("-");
  return isZh ? `${year} / ${month}` : `${month}.${year}`;
}

function formatDate(value: string, isZh: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return isZh ? "時間未封存" : "No Date";
  return new Intl.DateTimeFormat(isZh ? "zh-TW" : "en", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function payloadFrom(row: ArchiveRow) {
  return typeof row.result_payload === "object" && row.result_payload !== null ? row.result_payload : {};
}

async function battleAssetPathToUrl(path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  const { data, error } = await supabase.storage.from("battle-audio").createSignedUrl(clean, 60 * 10);
  if (error) {
    console.warn("[battle results audio]", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value)) ?? "";
}

function resultHref(record: ResultRecord, lang: string) {
  if (record.battleId && isUuid(record.battleId)) {
    return record.mode === "q_crash" ? battleShortPath(record.battleId, lang) : battleResultShortPath(record.battleId, lang);
  }
  if (record.battleId) return `/battle/result?battleId=${encodeURIComponent(record.battleId)}&lang=${lang}`;
  return `/battle/result?battle=${encodeURIComponent(record.battleCode)}&lang=${lang}`;
}

function resultFromArchive(row: ArchiveRow): ResultRecord {
  const payload = payloadFrom(row);
  const source = textField(payload.source);
  const mode: BattleRecordMode = payload.battleType === "q_crash" || source === "q_crash" ? "q_crash" : "drop_battle";
  const publicVisible = mode === "q_crash" || source === "drop_battle" || source === "cron" || source === "cron-direct-fallback" || source === "formal" || payload.battleType === "formal";
  const finalVoteLeft = numberField(row.final_vote_left);
  const finalVoteRight = numberField(row.final_vote_right);
  const tableVotes = numberField(row.total_votes);
  const payloadVotes = numberField(payload.votesTotal ?? payload.votes ?? payload.voteCount);
  const tableLooksLikePercent = tableVotes === 100 && finalVoteLeft + finalVoteRight === 100 && payloadVotes <= 0;
  const votesTotal = payloadVotes > 0 ? payloadVotes : tableLooksLikePercent ? 0 : tableVotes;
  const audienceCount = numberField(payload.audienceCount ?? votesTotal);
  const battleId = textField(row.battle_id) || null;
  const battleCode = textField(row.battle_code) || (battleId ? battleId.slice(0, 8).toUpperCase() : "AIPOGER");
  return {
    id: battleId || battleCode,
    battleId,
    battleCode,
    winnerSide: winnerSide(row.winner),
    winnerName: textField(row.winner_name) || "AIPOGER Fighter",
    winnerSong: textField(row.winner_song_name) || "AI Drop",
    opponentName: textField(row.opponent_name) || "Drop Rival",
    opponentSong: textField(row.opponent_song_name) || "Opponent Drop",
    tool: textField(row.winner_ai_tool || payload.tool) || "AI Music",
    genre: textField(payload.genre) || "AI Music",
    coverUrl: textField(payload.coverUrl),
    finalVoteLeft,
    finalVoteRight,
    votesTotal,
    audienceCount,
    audienceReview: textField(row.audience_review) || textField(payload.audienceReview),
    archivedAt: textField(row.archived_at) || new Date().toISOString(),
    audioUrl: null,
    fullSongUrl: null,
    youtubeUrl: null,
    mode,
    publicVisible,
  };
}

function isPublicRecord(record: ResultRecord) {
  return record.publicVisible && record.audienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN;
}

async function attachMedia(records: ResultRecord[]) {
  const ids = Array.from(new Set(records.map((record) => record.battleId).filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return records;

  const selectAttempts = [
    "id,winner,audio_a_path,audio_b_path,lyrics_a,lyrics_b,song_a_cover,song_b_cover,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id",
    "id,winner,audio_a_path,audio_b_path,song_a_cover,song_b_cover,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id",
    "id,winner,audio_a_path,audio_b_path,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id",
    "id,winner,audio_a_path,audio_b_path",
  ];

  let rows: BattleAudioRow[] | null = null;
  let errorMessage = "";
  for (const select of selectAttempts) {
    const read = await supabase.from("battles").select(select).in("id", ids);
    if (!read.error) {
      rows = read.data as BattleAudioRow[] | null;
      errorMessage = "";
      break;
    }
    errorMessage = read.error.message;
    if (!/lyrics_a|lyrics_b|song_a_cover|song_b_cover|queue_a_id|queue_b_id|fighter_a_user_id|fighter_b_user_id|schema cache|does not exist|PGRST204/i.test(errorMessage)) {
      break;
    }
  }
  if (errorMessage) {
    console.warn("[battle results media rows]", errorMessage);
    return records;
  }

  const qCrashIds = records
    .filter((record) => record.mode === "q_crash")
    .map((record) => record.battleId)
    .filter((id): id is string => Boolean(id));
  const qCrashMediaByBattle = new Map<string, QCrashPublicMediaItem>();
  if (qCrashIds.length > 0) {
    try {
      const mediaResponse = await fetch(`/api/q-crash/public-media?battleIds=${encodeURIComponent(qCrashIds.join(","))}`, {
        cache: "no-store",
      });
      if (mediaResponse.ok) {
        const mediaPayload = (await mediaResponse.json().catch(() => null)) as { items?: QCrashPublicMediaItem[] } | null;
        for (const item of mediaPayload?.items ?? []) qCrashMediaByBattle.set(item.battleId, item);
      }
    } catch (error) {
      console.warn("[battle results q crash editorial media]", error);
    }
  }

  const fullSongByBattle = new Map<string, { audioUrl: string | null; youtubeUrl: string | null }>();
  try {
    const fullSongResponse = await fetch("/api/honor-board/drop-full-songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battleIds: ids }),
    });
    if (fullSongResponse.ok) {
      const fullSongPayload = (await fullSongResponse.json().catch(() => null)) as {
        items?: Array<{ battleId?: string; audioUrl?: string | null; youtubeUrl?: string | null }>;
      } | null;
      for (const item of fullSongPayload?.items ?? []) {
        if (item.battleId) {
          fullSongByBattle.set(item.battleId, {
            audioUrl: item.audioUrl?.trim() || null,
            youtubeUrl: item.youtubeUrl?.trim() || null,
          });
        }
      }
    }
  } catch (error) {
    console.warn("[battle results full song media]", error);
  }

  const userIds = Array.from(
    new Set((rows ?? []).flatMap((battle) => [battle.fighter_a_user_id, battle.fighter_b_user_id]).filter((id): id is string => Boolean(id))),
  );

  const profilesById = new Map<string, FighterProfileMediaRow>();
  if (userIds.length > 0) {
    const profileRead = await supabase.from("fighter_profiles").select("id,song_cover_url,avatar_url").in("id", userIds);
    if (profileRead.error) {
      console.warn("[battle results profile media]", profileRead.error.message);
    } else {
      for (const row of (profileRead.data ?? []) as FighterProfileMediaRow[]) {
        if (row.id) profilesById.set(row.id, row);
      }
    }
  }

  const mediaByBattle = new Map<string, { audioUrl: string | null; coverUrl: string | null; fullSongUrl: string | null; youtubeUrl: string | null }>();
  await Promise.all(
    (rows ?? []).map(async (battle) => {
      if (!battle.id) return;
      const side = winnerSide(battle.winner);
      const winnerIsB = side === "fighter_b";
      const path = winnerIsB ? battle.audio_b_path : battle.audio_a_path;
      const profile = profilesById.get(winnerIsB ? battle.fighter_b_user_id ?? "" : battle.fighter_a_user_id ?? "");
      const qCrashMedia = qCrashMediaByBattle.get(battle.id);
      const qCrashWork = winnerIsB ? qCrashMedia?.works.B : qCrashMedia?.works.A;
      const coverCandidate = firstText(
        qCrashWork?.coverUrl,
        winnerIsB ? battle.song_b_cover : battle.song_a_cover,
        profile?.song_cover_url,
        profile?.avatar_url,
      );
      const [audioUrl, coverUrl] = await Promise.all([
        battleAssetPathToUrl(path),
        battleAssetPathToUrl(coverCandidate),
      ]);
      const fullSong = fullSongByBattle.get(battle.id);
      mediaByBattle.set(battle.id, {
        audioUrl,
        coverUrl,
        fullSongUrl: qCrashWork?.fullSongUrl ?? fullSong?.audioUrl ?? null,
        youtubeUrl: fullSong?.youtubeUrl ?? null,
      });
    }),
  );

  return records.map((record) => ({
    ...record,
    audioUrl: record.battleId ? mediaByBattle.get(record.battleId)?.audioUrl ?? null : null,
    coverUrl: record.coverUrl || (record.battleId ? mediaByBattle.get(record.battleId)?.coverUrl ?? "" : ""),
    fullSongUrl: record.fullSongUrl || (record.battleId ? mediaByBattle.get(record.battleId)?.fullSongUrl ?? null : null),
    youtubeUrl: record.youtubeUrl || (record.battleId ? mediaByBattle.get(record.battleId)?.youtubeUrl ?? null : null),
  }));
}

function coverInitials(record: ResultRecord) {
  const clean = (record.winnerSong || record.winnerName || "AI")
    .replace(/[《》「」"'`]/g, "")
    .trim();
  if (!clean) return "AI";
  const chars = Array.from(clean.replace(/\s+/g, ""));
  return chars.slice(0, 2).join("").toUpperCase();
}

function coverPalette(record: ResultRecord) {
  const seedText = `${record.battleCode}-${record.winnerSong}-${record.winnerName}`;
  const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palettes = [
    "radial-gradient(circle at 24% 18%, rgba(255,225,134,0.52), transparent 24%), linear-gradient(135deg,#2b1008 0%,#050505 46%,#083138 100%)",
    "radial-gradient(circle at 72% 24%, rgba(77,220,255,0.38), transparent 26%), linear-gradient(135deg,#090909 0%,#1e152b 45%,#4a2207 100%)",
    "radial-gradient(circle at 35% 18%, rgba(255,102,0,0.48), transparent 25%), linear-gradient(135deg,#060606 0%,#132520 44%,#3b1230 100%)",
    "radial-gradient(circle at 68% 28%, rgba(250,204,21,0.42), transparent 22%), linear-gradient(135deg,#151107 0%,#071c2a 52%,#050505 100%)",
    "radial-gradient(circle at 30% 22%, rgba(45,212,191,0.36), transparent 24%), linear-gradient(135deg,#050505 0%,#281717 50%,#18220a 100%)",
  ];
  return palettes[seed % palettes.length];
}

function ResultAudio({ record, isZh }: { record: ResultRecord; isZh: boolean }) {
  if (!record.audioUrl) {
    return (
      <p className="mt-2 rounded-lg border border-white/10 bg-black/45 px-2 py-1.5 text-[10px] font-black text-zinc-500">
        {isZh ? "音檔未封存" : "Audio Not Archived"}
      </p>
    );
  }
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5">
      <audio controls preload="none" src={record.audioUrl} className="h-8 w-full" />
    </div>
  );
}

function ResultCard({ record, isZh, lang, viewerId }: { record: ResultRecord; isZh: boolean; lang: string; viewerId: string | null }) {
  const href = resultHref(record, lang);
  const coverUrl = record.coverUrl.trim();
  const finalVoteTotal = record.finalVoteLeft + record.finalVoteRight;
  const winnerPct = finalVoteTotal > 0
    ? Math.round((Math.max(record.finalVoteLeft, record.finalVoteRight) / finalVoteTotal) * 100)
    : record.votesTotal > 0
      ? 100
      : 0;
  const isOfficial = record.audienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN;
  const isQCrash = record.mode === "q_crash";
  return (
    <article
      className={`group min-w-0 rounded-xl border bg-black/42 p-2.5 transition hover:-translate-y-0.5 hover:bg-white/[0.055] ${
        isQCrash
          ? "border-cyan-300/35 hover:border-cyan-100/75"
          : isOfficial ? "border-yellow-200/26 hover:border-yellow-100/55" : "border-white/10 hover:border-orange-100/42"
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-black shadow-[0_16px_38px_rgba(0,0,0,0.34)]">
        {coverUrl ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-88 transition duration-300 group-hover:scale-[1.035]" style={{ backgroundImage: `url("${coverUrl.replace(/"/g, '\\"')}")` }} />
        ) : (
          <div className="absolute inset-0 transition duration-300 group-hover:scale-[1.035]" style={{ background: coverPalette(record) }}>
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
              <div>
                <p className={`${fontRighteous.className} text-5xl leading-none text-white drop-shadow-[0_0_24px_rgba(255,191,74,0.45)]`}>
                  {coverInitials(record)}
                </p>
                <p className="mt-3 line-clamp-2 text-xs font-black leading-snug text-white/70">{record.winnerSong}</p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.78))]" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className={`rounded-md border px-1.5 py-1 text-[9px] font-black ${
            isQCrash
              ? "border-cyan-200/55 bg-cyan-300/25 text-cyan-50"
              : isOfficial ? "border-yellow-200/42 bg-yellow-300/20 text-yellow-50" : "border-orange-200/32 bg-orange-300/18 text-orange-50"
          }`}>
            {isQCrash ? "Q CRASH" : isOfficial ? (isZh ? "正式" : "Official") : (isZh ? "非正式" : "Unofficial")}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className={`${fontRighteous.className} text-xl leading-none text-white drop-shadow-[0_0_18px_rgba(255,191,74,0.36)]`}>
            WINNER
          </p>
          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/75">{record.battleCode}</p>
        </div>
      </div>

      <div className="min-w-0 pt-2.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-black leading-tight text-white">{record.winnerSong}</h3>
        <p className="mt-1 truncate text-sm font-bold text-zinc-400">{record.winnerName}</p>
        <p className="mt-1 truncate text-xs font-bold text-zinc-600">
          {formatDate(record.archivedAt, isZh)} · {record.tool}
        </p>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1.5">
            <p className="text-[9px] font-black text-zinc-500">{isZh ? "觀眾" : "Voters"}</p>
            <p className="text-sm font-black text-yellow-100">{record.audienceCount}/{DROP_BATTLE_OFFICIAL_AUDIENCE_MIN}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1.5">
            <p className="text-[9px] font-black text-zinc-500">{isZh ? "票" : "Votes"}</p>
            <p className="text-sm font-black text-white">{record.votesTotal}</p>
          </div>
          <div className="rounded-lg border border-orange-200/18 bg-orange-300/[0.08] px-1.5 py-1.5">
            <p className="text-[9px] font-black text-orange-100/70">{isZh ? "勝率" : "Win"}</p>
            <p className="text-sm font-black text-orange-100">{winnerPct}%</p>
          </div>
        </div>

        <ResultAudio record={record} isZh={isZh} />

        {record.fullSongUrl ? (
          <a
            href={record.fullSongUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-yellow-200/30 bg-yellow-300/[0.08] px-2 py-1.5 text-[11px] font-black text-yellow-100 transition hover:border-yellow-100/65 hover:bg-yellow-300/15"
          >
            {isZh ? "聽勝出作品完整版本 ↗" : "Listen to the winner's full version ↗"}
          </a>
        ) : null}

        {record.youtubeUrl ? (
          <a
            href={record.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-red-200/30 bg-red-400/[0.08] px-2 py-1.5 text-[11px] font-black text-red-100 transition hover:border-red-100/65 hover:bg-red-400/15"
          >
            {isZh ? "觀看勝出作品 MV ↗" : "Watch the winner's MV ↗"}
          </a>
        ) : null}

        {!isQCrash && isOfficial && viewerId && record.battleId ? (
          <BattleWinnerReleaseLink battleId={record.battleId} isZh={isZh} />
        ) : null}

        <div className="mt-2 flex items-center gap-1.5">
          <Link href={href} className={`inline-flex flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-black !text-black transition ${isQCrash ? "bg-cyan-400 hover:bg-cyan-300" : "bg-orange-500 hover:bg-orange-300"}`}>
            {isQCrash ? (isZh ? "重聽 Q Crash" : "Reopen Q Crash") : isZh ? "打開" : "Open"}
          </Link>
          <ShareButton
            title={isQCrash ? `AIPOGER Q Crash｜${record.winnerSong}` : `AIPOGER Drop Battle Winner｜${record.winnerSong}`}
            text={isQCrash
              ? `${record.winnerName}《${record.winnerSong}》${isZh ? "在 Q Crash 勝出；進來重聽並看看你比較喜歡哪首。" : "won this Q Crash. Reopen it and see which work you prefer."}`
              : `${record.winnerName}《${record.winnerSong}》${isZh ? "拿下一場 Drop Battle。" : "won a Drop Battle."}`}
            url={href}
            label={isZh ? "分享" : "Share"}
            copiedLabel={isZh ? "已複製" : "Copied"}
            className="border-white/14 bg-white/[0.045] px-2 py-1.5 text-[11px] font-black text-zinc-200 hover:border-yellow-100/55 hover:text-white"
          />
        </div>
      </div>
    </article>
  );
}

export default function BattleResultsClient() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [records, setRecords] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMonth, setActiveMonth] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      const { data, error: archiveError } = await supabase
        .from("battle_result_archives")
        .select(ARCHIVE_SELECT)
        .order("archived_at", { ascending: false })
        .limit(240);
      if (archiveError) {
        if (!cancelled) {
          setError(archiveError.message);
          setLoading(false);
        }
        return;
      }
      const mapped = (data ?? []).map((row) => resultFromArchive(row as ArchiveRow)).filter(isPublicRecord);
      const withAudio = await attachMedia(mapped);
      if (cancelled) return;
      setRecords(withAudio);
      setActiveMonth((current) => current || monthKey(withAudio[0]?.archivedAt || new Date().toISOString()));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const months = useMemo(() => {
    const keys = Array.from(new Set(records.map((record) => monthKey(record.archivedAt))));
    return keys.length > 0 ? keys : [monthKey(new Date().toISOString())];
  }, [records]);

  const monthRecords = useMemo(
    () => records.filter((record) => monthKey(record.archivedAt) === activeMonth),
    [activeMonth, records],
  );
  const qCrashRecords = useMemo(() => records.filter((record) => record.mode === "q_crash").slice(0, 12), [records]);
  const dropMonthRecords = useMemo(() => monthRecords.filter((record) => record.mode !== "q_crash"), [monthRecords]);
  const totalVotes = monthRecords.reduce((sum, record) => sum + record.votesTotal, 0);
  const totalAudience = monthRecords.reduce((sum, record) => sum + record.audienceCount, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pb-12 pt-20 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_12%_0%,rgba(255,106,0,0.2),transparent_28%),radial-gradient(circle_at_90%_2%,rgba(0,202,255,0.14),transparent_32%),linear-gradient(180deg,#050505_0%,#080706_52%,#030303_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <header className="grid gap-4 border-b border-white/10 pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-200/80">AIPOGER BATTLE RECORDS</p>
            <h1 className={`${fontRighteous.className} mt-2 text-[clamp(2.45rem,5vw,4.6rem)] leading-[0.9] text-white drop-shadow-[0_0_28px_rgba(255,106,0,0.3)]`}>
              {isZh ? "對戰記錄" : "Battle Records"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-zinc-400">
              {isZh
                ? "按月份整理已成立的 Drop Battle 對戰記錄，可回聽、分享並追溯每場正式戰績。這裡不是 Showtime 認證作品庫。"
                : "Browse established Drop Battle records by month. Listen, share, and trace each official battle without mixing this archive with Showtime."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={`/battle?lang=${lang}`} className="rounded-full border border-cyan-200/28 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-100">
              {isZh ? "回鬥歌場" : "Battle Hall"}
            </Link>
            <Link href={`/rank?lang=${lang}`} className="rounded-full border border-yellow-200/32 bg-yellow-300/12 px-4 py-2 text-sm font-black text-yellow-100 transition hover:border-yellow-100">
              {isZh ? "Showtime" : "Showtime"}
            </Link>
          </div>
        </header>

        <section className="mt-4 flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 xl:max-w-[46%]">
            {months.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMonth(key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-black transition ${
                  activeMonth === key
                    ? "border-yellow-100/70 bg-yellow-300/18 text-yellow-50 shadow-[0_0_22px_rgba(250,204,21,0.14)]"
                    : "border-white/10 bg-white/[0.045] text-zinc-400 hover:border-orange-200/45 hover:text-white"
                }`}
              >
                {monthLabel(key, isZh)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: isZh ? "本月戰果" : "Month", value: monthRecords.length },
              { label: isZh ? "Q Crash" : "Q Crash", value: qCrashRecords.length },
              { label: isZh ? "票數" : "Votes", value: totalVotes },
              { label: isZh ? "觀眾" : "Audience", value: totalAudience },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-black/45 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{item.label}</p>
                <p className="mt-1 text-xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-black/58 p-8 text-center text-sm font-black text-orange-100">
            {isZh ? "載入對戰記錄..." : "Loading battle records..."}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-[1.5rem] border border-red-300/30 bg-red-500/10 p-8 text-center text-sm font-black text-red-100">
            {isZh ? `對戰記錄讀取失敗：${error}` : `Could not load battle records: ${error}`}
          </div>
        ) : records.length === 0 ? (
          <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-black/58 p-8 text-center">
            <p className="text-2xl font-black text-white">{isZh ? "還沒有戰果封存" : "No Results Archived Yet"}</p>
            <p className="mt-3 text-sm font-bold text-zinc-400">
              {isZh ? "完成 Drop Battle 後，成果會按月份出現在這裡，並清楚標示是否達到正式門檻。" : "Completed Drop Battles will appear here by month, with official status clearly marked."}
            </p>
          </div>
        ) : (
          <>
            {qCrashRecords.length > 0 ? (
              <section className="mt-5 rounded-[1.6rem] border border-cyan-300/35 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.12),transparent_30%),rgba(0,12,16,0.72)] p-4 shadow-[0_0_50px_rgba(34,211,238,0.08)] sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-200/15 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Q CRASH · AFTER THE RESULT</p>
                    <h2 className="mt-1 text-2xl font-black text-white">{isZh ? "Q Crash 戰報" : "Q Crash Reports"}</h2>
                    <p className="mt-1 max-w-2xl text-xs font-bold leading-5 text-cyan-50/60">
                      {isZh ? "結果已經出來，還是可以回來重聽、留言，留下你最後比較喜歡哪首的想法。" : "The official result is fixed, but the listening, comments, and post-result preference stay open."}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">{qCrashRecords.length} {isZh ? "場" : "battles"}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {qCrashRecords.map((record) => <ResultCard key={`q-crash-${record.id}-${record.battleCode}`} record={record} isZh={isZh} lang={lang} viewerId={viewerId} />)}
                </div>
              </section>
            ) : null}

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">{isZh ? "Drop Battle 正式戰績" : "Drop Battle Results"}</h2>
                <p className="text-xs font-black text-zinc-500">{dropMonthRecords.length} {isZh ? "張成果卡" : "cards"}</p>
              </div>
              {dropMonthRecords.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {dropMonthRecords.map((record) => (
                  <ResultCard key={`${record.id}-${record.battleCode}`} record={record} isZh={isZh} lang={lang} viewerId={viewerId} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-white/10 bg-black/42 p-7 text-center text-sm font-bold text-zinc-500">{isZh ? "這個月份沒有公開的 Drop Battle 戰績；先看看上方 Q Crash 戰報。" : "No public Drop Battle results in this month. Start with the Q Crash reports above."}</div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
