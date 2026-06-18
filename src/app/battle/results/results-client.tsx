"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/share-button";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { DROP_BATTLE_OFFICIAL_AUDIENCE_MIN } from "@/lib/drop-battle-rematch";
import { battleResultShortPath } from "@/lib/share-short-links";
import { supabase } from "@/lib/supabase";

type WinnerSide = "fighter_a" | "fighter_b";

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

async function battleAudioPathToUrl(path: string | null | undefined) {
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

function resultHref(record: ResultRecord, lang: string) {
  if (record.battleId && isUuid(record.battleId)) return battleResultShortPath(record.battleId, lang);
  if (record.battleId) return `/battle/result?battleId=${encodeURIComponent(record.battleId)}&lang=${lang}`;
  return `/battle/result?battle=${encodeURIComponent(record.battleCode)}&lang=${lang}`;
}

function resultFromArchive(row: ArchiveRow): ResultRecord {
  const payload = payloadFrom(row);
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
    coverUrl: textField(payload.coverUrl) || AIPOGER_BRAND_LOGO,
    finalVoteLeft,
    finalVoteRight,
    votesTotal,
    audienceCount,
    audienceReview: textField(row.audience_review) || textField(payload.audienceReview),
    archivedAt: textField(row.archived_at) || new Date().toISOString(),
    audioUrl: null,
  };
}

async function attachAudio(records: ResultRecord[]) {
  const ids = Array.from(new Set(records.map((record) => record.battleId).filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return records;

  const withLyrics = await supabase.from("battles").select("id,winner,audio_a_path,audio_b_path,lyrics_a,lyrics_b").in("id", ids);
  let rows = withLyrics.data as BattleAudioRow[] | null;
  let error = withLyrics.error;
  if (error && /lyrics_a|lyrics_b|schema cache|does not exist|PGRST204/i.test(error.message || "")) {
    const fallback = await supabase.from("battles").select("id,winner,audio_a_path,audio_b_path").in("id", ids);
    rows = fallback.data as BattleAudioRow[] | null;
    error = fallback.error;
  }
  if (error) {
    console.warn("[battle results audio rows]", error.message);
    return records;
  }

  const audioByBattle = new Map<string, string | null>();
  await Promise.all(
    (rows ?? []).map(async (battle) => {
      if (!battle.id) return;
      const side = winnerSide(battle.winner);
      const path = side === "fighter_b" ? battle.audio_b_path : battle.audio_a_path;
      audioByBattle.set(battle.id, await battleAudioPathToUrl(path));
    }),
  );

  return records.map((record) => ({
    ...record,
    audioUrl: record.battleId ? audioByBattle.get(record.battleId) ?? null : null,
  }));
}

function ResultAudio({ record, isZh }: { record: ResultRecord; isZh: boolean }) {
  if (!record.audioUrl) {
    return (
      <p className="mt-3 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-black text-zinc-500">
        {isZh ? "音檔未封存" : "Audio Not Archived"}
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-2xl border border-yellow-200/22 bg-black/52 px-3 py-2 shadow-[inset_0_0_26px_rgba(255,255,255,0.035)]">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/70">
        {isZh ? "播放勝出 Drop" : "Play Winning Drop"}
      </p>
      <audio controls preload="none" src={record.audioUrl} className="h-9 w-full" />
    </div>
  );
}

function ResultCard({ record, featured = false, isZh, lang }: { record: ResultRecord; featured?: boolean; isZh: boolean; lang: string }) {
  const href = resultHref(record, lang);
  const finalVoteTotal = record.finalVoteLeft + record.finalVoteRight;
  const winnerPct = finalVoteTotal > 0
    ? Math.round((Math.max(record.finalVoteLeft, record.finalVoteRight) / finalVoteTotal) * 100)
    : record.votesTotal > 0
      ? 100
      : 0;
  const isOfficial = record.audienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN;
  return (
    <article
      className={`group overflow-hidden rounded-[1.35rem] border bg-black/58 shadow-[0_22px_80px_rgba(0,0,0,0.34)] transition hover:border-yellow-100/55 hover:bg-white/[0.055] ${
        featured
          ? `${isOfficial ? "border-yellow-200/42" : "border-orange-200/24"} lg:grid lg:grid-cols-[minmax(0,0.92fr)_1fr]`
          : isOfficial
            ? "border-white/10"
            : "border-orange-200/18"
      }`}
    >
      <div className={`relative overflow-hidden bg-black ${featured ? "min-h-[19rem]" : "aspect-[4/3]"}`}>
        <div className="absolute inset-0 bg-cover bg-center opacity-78 transition duration-300 group-hover:scale-[1.035]" style={{ backgroundImage: `url(${record.coverUrl})` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,214,120,0.08),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.88))]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-yellow-200/36 bg-yellow-300/16 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100">
            {isOfficial ? (isZh ? "正式成果" : "Official") : (isZh ? "非正式戰果" : "Unofficial")}
          </span>
          <span className="rounded-full border border-cyan-100/24 bg-cyan-300/12 px-2.5 py-1 text-[10px] font-black text-cyan-100">
            {record.genre}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className={`${fontRighteous.className} text-[2.6rem] leading-none text-white drop-shadow-[0_0_28px_rgba(255,191,74,0.38)]`}>
            WINNER
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-yellow-100/75">{record.battleCode}</p>
          <p className="mt-1 text-[11px] font-black text-orange-100/70">{formatDate(record.archivedAt, isZh)}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/70">{record.winnerName}</p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-white">{record.winnerSong}</h3>
            <p className="mt-1 truncate text-sm font-bold text-zinc-400">
              VS {record.opponentName} / {record.opponentSong}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-yellow-200/25 bg-yellow-300/10 px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/70">{isZh ? "觀眾" : "Voters"}</p>
            <p className="text-2xl font-black leading-none text-yellow-100">
              {record.audienceCount}/{DROP_BATTLE_OFFICIAL_AUDIENCE_MIN}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <p className="text-[10px] font-black text-zinc-500">{isZh ? "投票" : "Votes"}</p>
            <p className="text-lg font-black text-white">{record.votesTotal}</p>
          </div>
          <div className="rounded-2xl border border-orange-200/18 bg-orange-300/[0.08] px-2 py-2">
            <p className="text-[10px] font-black text-orange-100/70">{isZh ? "勝率" : "Win"}</p>
            <p className="text-lg font-black text-orange-100">{winnerPct}%</p>
          </div>
          <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] px-2 py-2">
            <p className="text-[10px] font-black text-cyan-100/70">{isZh ? "工具" : "Tool"}</p>
            <p className="truncate text-sm font-black text-cyan-50">{record.tool}</p>
          </div>
        </div>

        {record.audienceReview ? (
          <p className="mt-3 line-clamp-2 rounded-2xl border border-cyan-100/16 bg-cyan-300/[0.07] px-3 py-2 text-sm font-black leading-6 text-cyan-50">
            &ldquo;{record.audienceReview}&rdquo;
          </p>
        ) : null}

        <ResultAudio record={record} isZh={isZh} />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={href} className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-300">
            {isZh ? "打開成果卡" : "Open Card"}
          </Link>
          <ShareButton
            title={`AIPOGER Drop Battle Winner｜${record.winnerSong}`}
            text={`${record.winnerName}《${record.winnerSong}》${isZh ? "拿下一場 Drop Battle。" : "won a Drop Battle."}`}
            url={href}
            label={isZh ? "分享" : "Share"}
            copiedLabel={isZh ? "已複製" : "Copied"}
            className="border-white/14 bg-white/[0.045] px-4 py-2 text-xs font-black text-zinc-200 hover:border-yellow-100/55 hover:text-white"
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
      const mapped = (data ?? []).map((row) => resultFromArchive(row as ArchiveRow));
      const withAudio = await attachAudio(mapped);
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
  const featured = monthRecords[0] ?? records[0] ?? null;
  const officialCount = monthRecords.filter((record) => record.audienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN).length;
  const totalVotes = monthRecords.reduce((sum, record) => sum + record.votesTotal, 0);
  const totalAudience = monthRecords.reduce((sum, record) => sum + record.audienceCount, 0);
  const peakRecord = monthRecords.reduce<ResultRecord | null>((best, record) => {
    if (!best) return record;
    return record.audienceCount > best.audienceCount ? record : best;
  }, null);
  const highlightedRecord = peakRecord ?? featured;
  const gridRecords = highlightedRecord
    ? monthRecords.filter((record) => record.id !== highlightedRecord.id || record.battleCode !== highlightedRecord.battleCode)
    : monthRecords;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030303] px-4 pb-12 pt-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_17%_10%,rgba(255,106,0,0.24),transparent_30%),radial-gradient(circle_at_84%_20%,rgba(0,202,255,0.18),transparent_32%),linear-gradient(180deg,#030303_0%,#090706_50%,#020202_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto max-w-[1360px]">
        <header className="grid gap-5 border-b border-white/10 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-200/80">AIPOGER DROP ARCHIVE</p>
            <h1 className={`${fontRighteous.className} mt-3 text-[clamp(3.2rem,8vw,7rem)] leading-[0.85] text-white drop-shadow-[0_0_36px_rgba(255,106,0,0.36)]`}>
              {isZh ? "成果牆" : "Result Wall"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-zinc-400 md:text-base">
              {isZh
                ? "按月份封存每一張 Drop Battle 戰果，正式與非正式分層展示。這裡不是榮譽榜，是可以聽、可以分享、可以追溯的戰績展廳。"
                : "A monthly hall for Drop Battle results, with official and unofficial records separated. Listen, share, and trace each win."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={`/battle?lang=${lang}`} className="rounded-full border border-cyan-200/28 bg-cyan-300/10 px-5 py-2.5 text-sm font-black text-cyan-50 transition hover:border-cyan-100">
              {isZh ? "回鬥歌場" : "Battle Hall"}
            </Link>
            <Link href={`/rank?lang=${lang}`} className="rounded-full border border-yellow-200/32 bg-yellow-300/12 px-5 py-2.5 text-sm font-black text-yellow-100 transition hover:border-yellow-100">
              {isZh ? "榮譽榜" : "Honor Board"}
            </Link>
          </div>
        </header>

        <section className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {months.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveMonth(key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                activeMonth === key
                  ? "border-yellow-100/70 bg-yellow-300/18 text-yellow-50 shadow-[0_0_26px_rgba(250,204,21,0.16)]"
                  : "border-white/10 bg-white/[0.045] text-zinc-400 hover:border-orange-200/45 hover:text-white"
              }`}
            >
              {monthLabel(key, isZh)}
            </button>
          ))}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: isZh ? "本月戰果" : "Monthly Results", value: monthRecords.length },
            { label: isZh ? "正式達標" : "Official Wins", value: officialCount },
            { label: isZh ? "本月總票數" : "Monthly Votes", value: totalVotes },
            { label: isZh ? "觀眾參與" : "Audience Signals", value: totalAudience },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/54 px-4 py-3 shadow-[inset_0_0_34px_rgba(255,255,255,0.025)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
              <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-black/58 p-8 text-center text-sm font-black text-orange-100">
            {isZh ? "載入成果牆..." : "Loading result wall..."}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-[1.5rem] border border-red-300/30 bg-red-500/10 p-8 text-center text-sm font-black text-red-100">
            {isZh ? `成果牆讀取失敗：${error}` : `Could not load result wall: ${error}`}
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
            {highlightedRecord ? (
              <section className="mt-7">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100/75">{isZh ? "本月主打戰果" : "Featured Result"}</p>
                    <h2 className="mt-1 text-2xl font-black text-white">{peakRecord?.winnerSong || featured.winnerSong}</h2>
                  </div>
                  <p className="hidden text-xs font-black text-zinc-500 sm:block">{monthLabel(activeMonth, isZh)}</p>
                </div>
                <ResultCard record={highlightedRecord} featured isZh={isZh} lang={lang} />
              </section>
            ) : null}

            {gridRecords.length > 0 ? (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-white">{isZh ? "月度戰果" : "Monthly Results"}</h2>
                  <p className="text-xs font-black text-zinc-500">{gridRecords.length} {isZh ? "張成果卡" : "cards"}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {gridRecords.map((record) => (
                    <ResultCard key={`${record.id}-${record.battleCode}`} record={record} isZh={isZh} lang={lang} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="mt-8 rounded-[1.25rem] border border-white/10 bg-black/36 p-5 text-sm font-black text-zinc-500">
                {isZh ? "本月目前只有這一張成果卡。" : "This month currently has only this featured card."}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
