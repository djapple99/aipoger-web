"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";
type RangePreset = "today" | "yesterday" | "last7" | "last30" | "month" | "custom";

type Kpi = {
  key: string;
  label: string;
  unit: "number" | "minutes" | "percent" | "score";
  today: number;
  yesterday: number;
  change: number | null;
  last7Days: number;
  last30Days: number;
};

type LabelValue = { label: string; value: number };
type SongRank = {
  id?: string;
  title: string;
  artist: string;
  genre?: string;
  plays?: number;
  minutes?: number;
  likes?: number;
  skips?: number;
  comments?: number;
};
type GrowthPoint = { date: string; visitors: number; minutes: number; uploads: number; battles: number; likes: number };
type QCrashFunnelCard = {
  battleId: string;
  title: string;
  opened: number;
  playedBoth: number;
  listenedBoth: number;
  selected: number;
  authRequired: number;
  submitted: number;
  lineInApp: number;
  externalBrowserCta: number;
  externalBrowserFailed: number;
  listenedNoVote: number;
  openedNoVote: number;
  conversionRate: number;
};

type AnalyticsPayload = {
  range?: { label: string; start: string; end: string; preset: string };
  warnings?: string[];
  ceoKpis?: Kpi[];
  platform?: Record<string, number>;
  traffic?: {
    visitors: number;
    uniqueVisitors: number;
    pageViews: number;
    sessions: number;
    bounceRate: number;
    averageSessionDuration: number;
    pagesPerSession: number;
    sourceCounts: LabelValue[];
    dailyVisitors: GrowthPoint[];
    returningVsNew: LabelValue[];
  };
  heartbreak?: {
    plays: number;
    minutesPlayed: number;
    averagePlaysPerSong: number;
    playCompletionRate: number;
    averageSongsPerListener: number;
    averageExitSongNumber: number;
    likes: number;
    comments: number;
    skipCount: number;
    skipRate: number;
    reactionRate: number;
    topPlayedSongs: SongRank[];
    topLikedSongs: SongRank[];
    mostSkippedSongs: SongRank[];
    longestListeningSongs: SongRank[];
    mostCommentedSongs: SongRank[];
    hourlyHeatmap: Array<{ hour: number; minutes: number; plays: number }>;
    dailyPlaybackTrend: GrowthPoint[];
  };
  battle?: Record<string, number | LabelValue[] | [string, number] | null>;
  qCrash?: {
    opened: number;
    playedBoth: number;
    listenedBoth: number;
    selected: number;
    authRequired: number;
    submitted: number;
    lineInApp: number;
    externalBrowserCta: number;
    externalBrowserFailed: number;
    listenedNoVote: number;
    cards: QCrashFunnelCard[];
  };
  creator?: Record<string, number | LabelValue[]>;
  honor?: {
    todayNewHonorSongs: number;
    weeklyNewHonorSongs: number;
    monthlyNewHonorSongs: number;
    topHonorSongs: Array<{ title: string; creator: string; votes: number }>;
    topGenres: LabelValue[];
    averageDaysToHonor: number;
    averagePlaysToHonor: number;
    averageReactionsToHonor: number;
    averageCommentsToHonor: number;
  };
  realtime?: {
    onlineUsers: number;
    currentPlays: number;
    currentBattles: number;
    currentComments: number;
    currentUploadQueue: number;
    currentlyPlayingSongs: LabelValue[];
  };
  growth?: GrowthPoint[];
  error?: string;
};

const rangeOptions: Array<{ key: RangePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function formatNumber(value: number | null | undefined, unit: Kpi["unit"] | "plain" = "plain") {
  const safe = Number.isFinite(value ?? 0) ? Number(value ?? 0) : 0;
  if (unit === "percent") return `${safe.toLocaleString("zh-TW", { maximumFractionDigits: 1 })}%`;
  if (unit === "minutes") return `${safe.toLocaleString("zh-TW", { maximumFractionDigits: 1 })}m`;
  if (unit === "score") return `${Math.round(safe)}/100`;
  return safe.toLocaleString("zh-TW", { maximumFractionDigits: 1 });
}

function changeLabel(value: number | null) {
  if (value === null) return "New";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function metricRows(data: Record<string, number> | undefined, labels: Array<[string, string]>) {
  return labels.map(([key, label]) => ({ label, value: data?.[key] ?? 0 }));
}

function BarList({ rows, valueSuffix = "" }: { rows: LabelValue[]; valueSuffix?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="grid gap-2">
      {rows.length === 0 ? (
        <p className="text-sm font-bold text-zinc-500">No data yet.</p>
      ) : rows.map((row) => (
        <div key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-3 text-xs font-black">
            <span className="truncate text-zinc-300">{row.label}</span>
            <span className="tabular-nums text-orange-200">{formatNumber(row.value)}{valueSuffix}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-cyan-300" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatGrid({ rows }: { rows: LabelValue[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{row.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{formatNumber(row.value)}</p>
        </div>
      ))}
    </div>
  );
}

function SongTable({ rows, valueKey, valueLabel }: { rows: SongRank[]; valueKey: keyof SongRank; valueLabel: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.045] text-xs uppercase tracking-[0.14em] text-zinc-500">
          <tr>
            <th className="px-3 py-2">Song</th>
            <th className="px-3 py-2">Genre</th>
            <th className="px-3 py-2 text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="px-3 py-5 text-center font-bold text-zinc-500">No data yet.</td></tr>
          ) : rows.map((row) => (
            <tr key={`${row.id ?? row.title}-${valueLabel}`} className="bg-black/25">
              <td className="px-3 py-3">
                <p className="font-black text-white">{row.title}</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">{row.artist}</p>
              </td>
              <td className="px-3 py-3 text-xs font-bold text-cyan-100">{row.genre ?? "-"}</td>
              <td className="px-3 py-3 text-right font-black tabular-nums text-orange-200">{formatNumber(Number(row[valueKey] ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendBars({ rows, field }: { rows: GrowthPoint[]; field: keyof GrowthPoint }) {
  const values = rows.map((row) => Number(row[field] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-40 items-end gap-1 rounded-xl border border-white/10 bg-black/34 p-3">
      {rows.length === 0 ? (
        <p className="self-center text-sm font-bold text-zinc-500">No trend data.</p>
      ) : rows.map((row) => {
        const value = Number(row[field] ?? 0);
        return (
          <div key={`${row.date}-${String(field)}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              title={`${row.date}: ${value}`}
              className="w-full rounded-t bg-gradient-to-t from-orange-600 to-cyan-300"
              style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
            />
            <span className="hidden max-w-full truncate text-[10px] font-bold text-zinc-600 sm:block">{row.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [range, setRange] = useState<RangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    return params.toString();
  }, [customFrom, customTo, range]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/analytics?${queryString}`, {
      cache: "no-store",
      headers: await authHeader(),
    });
    const data = await response.json().catch(() => null) as AnalyticsPayload | null;
    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "Analytics 資料讀取失敗。");
      return;
    }
    setPayload(data);
  }, [queryString]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setAdminState("login");
        return;
      }
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadData();
    }
    void check();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  if (adminState === "checking") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <p className="text-sm font-black text-zinc-400">檢查 Analytics 後台權限中...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.2rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">Analytics Dashboard 只允許 owner 帳號進入。</p>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
            前往登入
          </Link>
        </section>
      </main>
    );
  }

  const platformRows = metricRows(payload?.platform, [
    ["totalUsers", "Total Users"],
    ["dau", "DAU"],
    ["wau", "WAU"],
    ["mau", "MAU"],
    ["newRegistrations", "New Registrations"],
    ["returningUsers", "Returning Users"],
    ["totalPlays", "Total Plays"],
    ["totalMinutesPlayed", "Total Minutes Played"],
    ["totalSongUploads", "Total Song Uploads"],
    ["totalBattles", "Total Battles"],
    ["totalComments", "Total Comments"],
    ["totalPositiveReactions", "Positive Reactions"],
    ["averageSessionDuration", "Avg Session Minutes"],
    ["averageSongsPlayedPerUser", "Avg Songs/User"],
  ]);
  const battleRows = metricRows(payload?.battle as Record<string, number> | undefined, [
    ["todayBattles", "Today Battles"],
    ["completedBattles", "Completed Battles"],
    ["noContestBattles", "No Contest Battles"],
    ["averageVotes", "Average Votes"],
    ["averageViewers", "Average Viewers"],
    ["averageListeningTime", "Avg Listening Time"],
    ["battleWinRate", "Battle Win Rate"],
    ["battleCompletionRate", "Completion Rate"],
  ]);
  const creatorRows = metricRows(payload?.creator as Record<string, number> | undefined, [
    ["newCreators", "New Creators"],
    ["activeCreators", "Active Creators"],
    ["creatorsUploadedToday", "Uploaded Today"],
    ["averageUploadsPerCreator", "Avg Uploads/Creator"],
    ["creator7DayRetention", "7-day Retention"],
    ["creator30DayRetention", "30-day Retention"],
    ["averageHonorBoardConversionRate", "Honor Conversion"],
  ]);
  const honorRows = metricRows(payload?.honor as unknown as Record<string, number> | undefined, [
    ["todayNewHonorSongs", "Today Honor Songs"],
    ["weeklyNewHonorSongs", "Weekly Honor Songs"],
    ["monthlyNewHonorSongs", "Monthly Honor Songs"],
    ["averageDaysToHonor", "Avg Days To Honor"],
    ["averagePlaysToHonor", "Avg Plays To Honor"],
    ["averageReactionsToHonor", "Avg Reactions To Honor"],
    ["averageCommentsToHonor", "Avg Comments To Honor"],
  ]);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300/80">AIPOGER OWNER ADMIN</p>
              <h1 className="mt-2 text-4xl font-black text-white">Analytics Dashboard V1</h1>
              <p className="mt-2 text-sm font-bold text-zinc-400">先看今天有沒有人真的在聽音樂。最高優先 KPI：Total Minutes Played。</p>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              <Link href="/admin/listen-bar" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">酒吧後台</Link>
              <Link href="/admin/battles" className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">Battle 管理</Link>
              <Link href="/admin/social" className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100">發文後台</Link>
              <LangToggle variant="inline" />
            </nav>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                  range === option.key
                    ? "border-orange-300 bg-orange-500 text-black"
                    : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-300/50"
                }`}
              >
                {option.label}
              </button>
            ))}
            {range === "custom" && (
              <>
                <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 rounded-full border border-white/10 bg-black px-3 text-xs font-bold text-white" />
                <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 rounded-full border border-white/10 bg-black px-3 text-xs font-bold text-white" />
              </>
            )}
            <button type="button" onClick={loadData} className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {payload?.range && <p className="mt-3 text-xs font-bold text-zinc-500">Current Range: {payload.range.label}</p>}
          {error && <p className="mt-3 rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">{error}</p>}
          {payload?.warnings && payload.warnings.length > 0 && (
            <p className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-100">
              部分資料表尚未套用或欄位不同：{payload.warnings.slice(0, 2).join(" / ")}
            </p>
          )}
        </header>

        <section className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(payload?.ceoKpis ?? []).map((kpi, index) => (
              <article
                key={kpi.key}
                className={`rounded-[1.15rem] border p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)] ${
                  index === 0
                    ? "border-orange-300/35 bg-[radial-gradient(circle_at_20%_0%,rgba(255,122,28,0.22),transparent_42%),rgba(255,255,255,0.04)]"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{kpi.label}</p>
                <p className="mt-3 text-4xl font-black text-white">{formatNumber(kpi.today, kpi.unit)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-400">
                  <span>Yesterday</span><span className="text-right tabular-nums">{formatNumber(kpi.yesterday, kpi.unit)}</span>
                  <span>% Change</span><span className={`text-right tabular-nums ${kpi.change !== null && kpi.change > 0 ? "text-cyan-200" : "text-orange-200"}`}>{changeLabel(kpi.change)}</span>
                  <span>Last 7 Days</span><span className="text-right tabular-nums">{formatNumber(kpi.last7Days, kpi.unit)}</span>
                  <span>Last 30 Days</span><span className="text-right tabular-nums">{formatNumber(kpi.last30Days, kpi.unit)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5">
          <div className="rounded-[1.2rem] border border-white/10 bg-black/58 p-5">
            <h2 className="text-2xl font-black text-white">Platform Overview</h2>
            <div className="mt-4"><StatGrid rows={platformRows} /></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.2rem] border border-white/10 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Traffic Analytics</h2>
              <div className="mt-4"><StatGrid rows={metricRows(payload?.traffic as unknown as Record<string, number> | undefined, [
                ["visitors", "Visitors"],
                ["uniqueVisitors", "Unique Visitors"],
                ["pageViews", "Page Views"],
                ["sessions", "Sessions"],
                ["bounceRate", "Bounce Rate"],
                ["averageSessionDuration", "Avg Session"],
                ["pagesPerSession", "Pages/Session"],
              ])} /></div>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-orange-200">Traffic Source</h3>
              <div className="mt-3"><BarList rows={payload?.traffic?.sourceCounts ?? []} /></div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Growth Dashboard</h2>
              <div className="mt-4 grid gap-4">
                <div><p className="mb-2 text-xs font-black text-zinc-500">Visitors</p><TrendBars rows={payload?.growth ?? []} field="visitors" /></div>
                <div><p className="mb-2 text-xs font-black text-zinc-500">Minutes Played</p><TrendBars rows={payload?.growth ?? []} field="minutes" /></div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-orange-300/20 bg-black/62 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300/75">Most Important Page</p>
                <h2 className="mt-1 text-2xl font-black text-white">Heartbreak Bar Analytics</h2>
              </div>
              <div className="text-right text-sm font-black text-orange-100">
                {formatNumber(payload?.heartbreak?.minutesPlayed ?? 0, "minutes")} played
              </div>
            </div>
            <div className="mt-4"><StatGrid rows={metricRows(payload?.heartbreak as unknown as Record<string, number> | undefined, [
              ["plays", "Plays"],
              ["minutesPlayed", "Minutes Played"],
              ["averagePlaysPerSong", "Avg Plays/Song"],
              ["playCompletionRate", "Completion Rate"],
              ["averageSongsPerListener", "Avg Songs/Listener"],
              ["averageExitSongNumber", "Avg Exit Song #"],
              ["likes", "Likes"],
              ["comments", "Comments"],
              ["skipCount", "Skip Count"],
              ["skipRate", "Skip Rate"],
              ["reactionRate", "Reaction Rate"],
            ])} /></div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <SongTable rows={payload?.heartbreak?.topPlayedSongs ?? []} valueKey="plays" valueLabel="Plays" />
              <SongTable rows={payload?.heartbreak?.topLikedSongs ?? []} valueKey="likes" valueLabel="Likes" />
              <SongTable rows={payload?.heartbreak?.mostSkippedSongs ?? []} valueKey="skips" valueLabel="Skips" />
              <SongTable rows={payload?.heartbreak?.longestListeningSongs ?? []} valueKey="minutes" valueLabel="Minutes" />
            </div>
            <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-orange-200">Hourly Listening Heatmap</h3>
            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12 xl:grid-cols-24">
              {(payload?.heartbreak?.hourlyHeatmap ?? []).map((hour) => (
                <div key={hour.hour} className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-center">
                  <p className="text-[10px] font-black text-zinc-500">{String(hour.hour).padStart(2, "0")}</p>
                  <p className="mt-1 text-xs font-black text-orange-100">{formatNumber(hour.minutes, "minutes")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[1.2rem] border border-white/10 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Battle Analytics</h2>
              <div className="mt-4"><StatGrid rows={battleRows} /></div>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-200">Top Battle Genres</h3>
              <div className="mt-3"><BarList rows={(payload?.battle?.topBattleGenres as LabelValue[] | undefined) ?? []} /></div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Creator Analytics</h2>
              <div className="mt-4"><StatGrid rows={creatorRows} /></div>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-200">Top Creators</h3>
              <div className="mt-3"><BarList rows={(payload?.creator?.topCreators as LabelValue[] | undefined) ?? []} /></div>
            </div>
          </div>

          <section className="rounded-[1.2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.1),transparent_32%),rgba(0,0,0,0.58)] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Q Crash Funnel</p>
                <h2 className="mt-1 text-2xl font-black text-white">打開、聽完、選擇到正式投票</h2>
                <p className="mt-2 text-xs font-bold leading-5 text-zinc-500">
                  Owner 私有估算；以 30 分鐘瀏覽 session 去重。每首實際播放累積 5 秒才列入「兩邊都聽」，不會在截止前顯示給參賽者或觀眾。
                </p>
              </div>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/8 px-3 py-2 text-xs font-black text-cyan-100">
                聽完未投 {formatNumber(payload?.qCrash?.listenedNoVote)}
              </span>
            </div>
            <div className="mt-5">
              <StatGrid rows={[
                { label: "Opened", value: payload?.qCrash?.opened ?? 0 },
                { label: "Played Both", value: payload?.qCrash?.playedBoth ?? 0 },
                { label: "Listened Both 5s+", value: payload?.qCrash?.listenedBoth ?? 0 },
                { label: "Selected A / B", value: payload?.qCrash?.selected ?? 0 },
                { label: "Hit Login", value: payload?.qCrash?.authRequired ?? 0 },
                { label: "Vote Submitted", value: payload?.qCrash?.submitted ?? 0 },
                { label: "Opened in LINE", value: payload?.qCrash?.lineInApp ?? 0 },
                { label: "External Browser CTA", value: payload?.qCrash?.externalBrowserCta ?? 0 },
                { label: "Browser Jump Failed", value: payload?.qCrash?.externalBrowserFailed ?? 0 },
                { label: "Listened, No Vote", value: payload?.qCrash?.listenedNoVote ?? 0 },
              ]} />
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-[1120px] w-full text-left text-xs">
                <thead className="bg-white/[0.045] uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Q Crash</th>
                    <th className="px-3 py-3 text-right">打開</th>
                    <th className="px-3 py-3 text-right">兩邊播放</th>
                    <th className="px-3 py-3 text-right">兩邊聽 5s+</th>
                    <th className="px-3 py-3 text-right">已選擇</th>
                    <th className="px-3 py-3 text-right">完成投票</th>
                    <th className="px-3 py-3 text-right">LINE 開啟</th>
                    <th className="px-3 py-3 text-right">外部開啟</th>
                    <th className="px-3 py-3 text-right">跳轉失敗</th>
                    <th className="px-3 py-3 text-right">聽完未投</th>
                    <th className="px-3 py-3 text-right">轉換率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {(payload?.qCrash?.cards ?? []).length === 0 ? (
                    <tr><td colSpan={11} className="px-3 py-6 text-center font-bold text-zinc-600">新漏斗上線後，這裡會開始累積資料。</td></tr>
                  ) : payload?.qCrash?.cards.map((card) => (
                    <tr key={card.battleId} className="bg-black/25">
                      <td className="max-w-sm px-3 py-3">
                        <p className="truncate font-black text-white">{card.title}</p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-600">{card.battleId.slice(0, 8)}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-black text-zinc-300">{card.opened}</td>
                      <td className="px-3 py-3 text-right font-black text-zinc-300">{card.playedBoth}</td>
                      <td className="px-3 py-3 text-right font-black text-cyan-100">{card.listenedBoth}</td>
                      <td className="px-3 py-3 text-right font-black text-zinc-300">{card.selected}</td>
                      <td className="px-3 py-3 text-right font-black text-emerald-200">{card.submitted}</td>
                      <td className="px-3 py-3 text-right font-black text-orange-200">{card.lineInApp}</td>
                      <td className="px-3 py-3 text-right font-black text-cyan-100">{card.externalBrowserCta}</td>
                      <td className="px-3 py-3 text-right font-black text-red-200">{card.externalBrowserFailed}</td>
                      <td className="px-3 py-3 text-right font-black text-orange-200">{card.listenedNoVote}</td>
                      <td className="px-3 py-3 text-right font-black text-white">{card.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.2rem] border border-yellow-200/15 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Showtime Analytics</h2>
              <div className="mt-4"><StatGrid rows={honorRows} /></div>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-yellow-100">Top Honor Songs</h3>
              <div className="mt-3 grid gap-2">
                {(payload?.honor?.topHonorSongs ?? []).length === 0 ? (
                  <p className="text-sm font-bold text-zinc-500">No honor data yet.</p>
                ) : payload?.honor?.topHonorSongs.map((song) => (
                  <div key={`${song.title}-${song.creator}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                    <div>
                      <p className="font-black text-white">{song.title}</p>
                      <p className="text-xs font-bold text-zinc-500">{song.creator}</p>
                    </div>
                    <span className="font-black text-yellow-100">{song.votes} votes</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-cyan-200/15 bg-black/58 p-5">
              <h2 className="text-2xl font-black text-white">Realtime Dashboard</h2>
              <div className="mt-4"><StatGrid rows={metricRows(payload?.realtime as unknown as Record<string, number> | undefined, [
                ["onlineUsers", "Online Users"],
                ["currentPlays", "Current Plays"],
                ["currentBattles", "Current Battles"],
                ["currentComments", "Current Comments"],
                ["currentUploadQueue", "Upload Queue"],
              ])} /></div>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-200">Currently Playing Songs</h3>
              <div className="mt-3"><BarList rows={payload?.realtime?.currentlyPlayingSongs ?? []} /></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
