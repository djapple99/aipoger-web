"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Heart, Info, Pause, Play, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ShareButton from "@/components/share-button";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/locale";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { monthlyChartSharePath } from "@/lib/chart-management";
import type { MonthlyChartResponse as ChartResponse, MonthlyChartTrack as ChartTrack } from "@/lib/monthly-charts";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import { supabase } from "@/lib/supabase";

const COPY = {
  zh: { month: "月份", style: "類型", all: "總榜 · 所有類型", search: "搜尋歌名或創作者", live: "本月進行中", final: "已結算", supporters: "支持人數", accumulating: "人氣累積中", empty: "本月人氣正在累積", noMatch: "沒有符合的歌曲", explore: "去探索音樂", loading: "正在讀取月榜", failed: "月榜暫時無法讀取，請稍後重試。", retry: "重新整理", playAll: "播放榜單", play: "播放", pause: "暫停", heart: "愛心支持並收藏", remove: "取消今日愛心與收藏", login: "請先登入，才能支持與收藏歌曲。", signIn: "登入", heartFailed: "愛心暫時無法更新，請重試。", rules: "月榜規則", close: "關閉", share: "分享歌曲", copied: "已複製", ruleText: "依台灣時間每月計算有效愛心支持。同一帳號每首歌每月最多計一次，排除作者自投；至少 3 位支持者才列名次。月底結算保留歷史榜；已下架歌曲不再提供播放。Choice 收藏、播放次數與 Battle 戰績不計入月榜。", count: "位支持者" },
  en: { month: "Month", style: "Genre", all: "Overall · All genres", search: "Search song or creator", live: "This month · Live", final: "Final chart", supporters: "Supporters", accumulating: "Gaining support", empty: "This month's support is building", noMatch: "No matching songs", explore: "Explore Music", loading: "Loading monthly chart", failed: "The chart is unavailable. Please try again.", retry: "Refresh", playAll: "Play chart", play: "Play", pause: "Pause", heart: "Support and save song", remove: "Remove today's heart and save", login: "Sign in to support and save songs.", signIn: "Sign in", heartFailed: "Could not update your heart. Try again.", rules: "Chart rules", close: "Close", share: "Share song", copied: "Copied", ruleText: "Each Taiwan calendar month counts distinct accounts with an active song Heart, once per song. Creator self-support is excluded. Songs need at least 3 supporters to rank. Monthly results are finalized and retained. Removed songs are not playable. Choice saves, plays and Battle results do not affect this chart.", count: "supporters" },
  ja: { month: "月", style: "ジャンル", all: "総合 · 全ジャンル", search: "曲名・クリエイターで検索", live: "今月 · 集計中", final: "確定ランキング", supporters: "支持者数", accumulating: "支持が集まっています", empty: "今月の支持を集計中", noMatch: "該当する曲はありません", explore: "音楽を探す", loading: "月間ランキングを読込中", failed: "ランキングを読み込めません。再試行してください。", retry: "更新", playAll: "ランキングを再生", play: "再生", pause: "一時停止", heart: "曲を支持・保存", remove: "今日のハートと保存を解除", login: "曲の支持・保存にはログインしてください。", signIn: "ログイン", heartFailed: "ハートを更新できません。再試行してください。", rules: "ランキングのルール", close: "閉じる", share: "曲を共有", copied: "コピー済み", ruleText: "台湾時間の暦月ごとに、有効なハートを送った異なるアカウントを1曲につき1回集計します。作者本人の支持は除外し、3人以上で順位を表示。月末に確定し履歴を保存します。非公開曲は再生できません。Choiceの保存、再生回数、対戦成績は集計対象外です。", count: "人の支持" },
  ko: { month: "월", style: "장르", all: "종합 · 모든 장르", search: "곡명 또는 크리에이터 검색", live: "이번 달 · 집계 중", final: "확정 차트", supporters: "지지자 수", accumulating: "지지가 모이고 있어요", empty: "이번 달 지지를 집계 중입니다", noMatch: "일치하는 곡이 없습니다", explore: "음악 탐색", loading: "월간 차트 불러오는 중", failed: "차트를 불러올 수 없습니다. 다시 시도하세요.", retry: "새로고침", playAll: "차트 재생", play: "재생", pause: "일시정지", heart: "곡 지지 및 저장", remove: "오늘의 하트 및 저장 취소", login: "곡을 지지하고 저장하려면 로그인하세요.", signIn: "로그인", heartFailed: "하트를 업데이트하지 못했습니다. 다시 시도하세요.", rules: "차트 규칙", close: "닫기", share: "곡 공유", copied: "복사됨", ruleText: "대만 시간 기준 매월 유효한 곡 하트를 보낸 서로 다른 계정을 곡당 한 번 집계합니다. 창작자의 자기 지지는 제외하며, 3명 이상부터 순위를 표시합니다. 월말에 결과를 확정하고 보관합니다. 비공개 곡은 재생할 수 없습니다. Choice 저장, 재생 횟수, 대전 성적은 집계하지 않습니다.", count: "명의 지지" },
};

export default function MonthlyChart({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const decisionCopy = {
    zh: { pending: "名次待定", settling: "待裁定", share: "分享排行榜", rule: "同票由平台主理人裁定先後，未裁定前名次待定。月底先固定支持數，裁定完成後確定名次；不改票數。" },
    en: { pending: "Rank pending", settling: "Awaiting decision", share: "Share chart", rule: "The platform owner orders tied songs. Ranks remain pending until reviewed. Month-end support counts are frozen; decisions only settle tied positions, never change scores." },
    ja: { pending: "順位未確定", settling: "判定待ち", share: "ランキングを共有", rule: "同票の順位は運営者が決定します。判定前は順位未確定です。月末に支持数を固定し、同票の順序のみを決定します。票数は変更しません。" },
    ko: { pending: "순위 미정", settling: "결정 대기", share: "차트 공유", rule: "동점 곡의 순서는 운영자가 결정합니다. 결정 전에는 순위 미정으로 표시합니다. 월말 지지 수는 고정되며 동점 순서만 결정하고 점수는 바꾸지 않습니다." },
  }[lang];
  const layoutCopy = {
    zh: { title: "月排行榜", filters: "篩選榜單", more: "查看完整榜單", less: "收起榜單" },
    en: { title: "Monthly Charts", filters: "Filter chart", more: "View full chart", less: "Show less" },
    ja: { title: "月間ランキング", filters: "絞り込み", more: "ランキングをすべて見る", less: "折りたたむ" },
    ko: { title: "월간 차트", filters: "차트 필터", more: "전체 차트 보기", less: "접기" },
  }[lang];
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { t } = useI18n();
  const [month, setMonth] = useState("");
  const [genre, setGenre] = useState("all");
  const [queryReady, setQueryReady] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [heartRefresh, setHeartRefresh] = useState(0);
  const [hearts, setHearts] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<"login" | "failed" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heartLocks = useRef(new Set<string>());
  const identity = useRef<{ userId: string | null; version: number }>({ userId: null, version: 0 });
  const player = useMusicPlayer();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialMonth = params.get("chartMonth") || "";
    const initialGenre = params.get("chartGenre") || "all";
    if (/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(initialMonth)) setMonth(initialMonth);
    if (MUSIC_GENRE_OPTIONS.some((g) => g.value === initialGenre)) setGenre(initialGenre);
    setQueryReady(true);
  }, []);

  useEffect(() => {
    let live = true;
    let revision = 0;
    const updateIdentity = (next: string | null) => {
      if (!live) return;
      if (identity.current.userId !== next) {
        identity.current = { userId: next, version: identity.current.version + 1 };
        heartLocks.current.clear();
        setHearts({});
        setBusy({});
        setNotice(null);
        setUserId(next);
      }
      setHeartRefresh((n) => n + 1);
    };
    void supabase.auth.getSession().then(({ data: result }) => { if (live && revision === 0) updateIdentity(result.session?.user.id ?? null); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => { revision += 1; updateIdentity(session?.user.id ?? null); });
    return () => { live = false; identity.current.version += 1; subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!queryReady) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const query = new URLSearchParams();
    if (month) query.set("month", month);
    if (genre !== "all") query.set("genre", genre);
    void fetch(`/api/charts/monthly?${query}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) })
      .then(async (response) => { if (!response.ok) throw new Error("Chart unavailable"); return response.json() as Promise<ChartResponse>; })
      .then((next) => { if (!controller.signal.aborted) setData(next); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, genre, refresh, queryReady]);

  useEffect(() => {
    if (data?.status === "final") return;
    const id = window.setInterval(() => { if (document.visibilityState === "visible") setRefresh((n) => n + 1); }, 60_000);
    return () => window.clearInterval(id);
  }, [data?.status]);

  useEffect(() => {
    const refreshHearts = () => { if (document.visibilityState === "visible") setHeartRefresh((n) => n + 1); };
    const id = window.setInterval(refreshHearts, 60_000);
    document.addEventListener("visibilitychange", refreshHearts);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", refreshHearts); };
  }, []);

  const loadHearts = useCallback(async () => {
    if (!userId || !data) return {};
    const result: Record<string, boolean> = {};
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    for (let offset = 0; offset < data.tracks.length; offset += 100) {
      const ids = data.tracks.slice(offset, offset + 100).map((track) => track.id);
      const response = await supabase.from("listen_bar_track_reactions").select("track_id").eq("user_id", userId).eq("reaction", "heart").eq("vote_date", date).in("track_id", ids);
      if (response.error) throw response.error;
      for (const row of response.data ?? []) result[row.track_id] = true;
    }
    return result;
  }, [userId, data]);

  useEffect(() => {
    let live = true;
    const version = identity.current.version;
    void loadHearts().then((next) => { if (live && identity.current.version === version) setHearts(next); }).catch(() => {});
    return () => { live = false; };
  }, [loadHearts, heartRefresh]);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId: string; heartedToday: boolean }>).detail;
      if (!detail?.trackId) return;
      setHearts((current) => ({ ...current, [detail.trackId]: detail.heartedToday === true }));
      if (data?.status !== "final") setRefresh((n) => n + 1);
    };
    window.addEventListener("aipoger:music-heart", update);
    return () => window.removeEventListener("aipoger:music-heart", update);
  }, [data?.status]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (data?.tracks ?? []).filter((track) => !needle || `${track.title} ${track.artist}`.toLocaleLowerCase().includes(needle));
  }, [data, search]);
  const ranked = visible.filter((track) => track.rank !== null || track.rankPending);
  const accumulating = visible.filter((track) => track.rank === null && !track.rankPending);

  async function toggleHeart(track: ChartTrack) {
    if (heartLocks.current.has(track.id)) return;
    const version = identity.current.version;
    heartLocks.current.add(track.id);
    setBusy((current) => ({ ...current, [track.id]: true }));
    setNotice(null);
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (identity.current.version !== version) return;
      if (!auth.session) { setNotice("login"); return; }
      if (auth.session.user.id !== identity.current.userId) return;
      const response = await fetch("/api/listen-bar/reaction", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` }, body: JSON.stringify({ trackId: track.id, reaction: "heart" }) });
      if (!response.ok) throw new Error("Heart failed");
      const payload = await response.json();
      if (identity.current.version !== version || identity.current.userId !== auth.session.user.id) return;
      window.dispatchEvent(new CustomEvent("aipoger:music-heart", { detail: { trackId: track.id, ...payload } }));
    } catch { if (identity.current.version === version) setNotice("failed"); }
    finally { if (identity.current.version === version) { heartLocks.current.delete(track.id); setBusy((current) => ({ ...current, [track.id]: false })); } }
  }

  function play(track: ChartTrack, list = visible, replaceQueue = false) {
    if (!replaceQueue && player.session?.queue[player.session.index]?.id === `bar:${track.id}`) { musicPlayer?.toggle(); return; }
    const queue = list.filter((item) => item.audioUrl).map((item) => ({ id: `bar:${item.id}`, title: item.title, artist: item.artist, coverUrl: item.coverUrl || AIPOGER_BRAND_LOGO, audioUrl: item.audioUrl, genre: item.genre, lyrics: item.lyrics, heartTrackId: item.id }));
    const index = queue.findIndex((item) => item.id === `bar:${track.id}`);
    if (index >= 0) void musicPlayer?.start(queue, index, `Showtime ${data?.month ?? ""}`, { repeat: false });
  }

  function rows(list: ChartTrack[]) {
    return <ol className="divide-y divide-white/10">{list.map((track) => {
      const playing = player.playing && player.session?.queue[player.session.index]?.id === `bar:${track.id}`;
      const genreLabel = t(MUSIC_GENRE_OPTIONS.find((item) => item.value === track.genre)?.labelKey ?? "") || track.genre;
      return <li key={track.id} className="grid grid-cols-[1.25rem_3rem_minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-1 py-3">
        <span title={track.rankPending ? decisionCopy.pending : undefined} className={`text-center text-lg font-black tabular-nums ${track.rank !== null && track.rank <= 3 ? "text-orange-400" : "text-zinc-500"}`}>{track.rank ?? "·"}</span>
        <button type="button" disabled={!track.audioUrl} onClick={() => play(track)} title={`${playing ? copy.pause : copy.play} ${track.title}`} aria-label={`${playing ? copy.pause : copy.play} ${track.title}`} className="group relative h-12 w-12 overflow-hidden disabled:opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.coverUrl || AIPOGER_BRAND_LOGO} alt="" className="h-full w-full object-cover" />
          <span className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-black">{playing ? <Pause className="h-3 w-3" fill="currentColor" /> : <Play className="h-3 w-3" fill="currentColor" />}</span>
        </button>
        <div className="min-w-0"><p className="line-clamp-2 break-words text-sm font-bold text-white">{track.title}</p><p className="mt-1 truncate text-xs text-cyan-200">{track.artist}</p><p className="mt-1 truncate text-[11px] text-zinc-500" title={`${genreLabel} · ${track.aiTool}`}>{genreLabel}</p></div>
        <span className="col-start-3 row-start-2 text-[11px] tabular-nums text-zinc-400">{track.supporterCount} {copy.count}{track.rankPending && <span className="ml-2 text-orange-200">{decisionCopy.pending}</span>}</span>
        <div className="col-start-4 row-span-2 row-start-1 flex flex-col gap-1">
          <button type="button" disabled={busy[track.id]} onClick={() => void toggleHeart(track)} title={hearts[track.id] ? copy.remove : copy.heart} aria-label={`${hearts[track.id] ? copy.remove : copy.heart}: ${track.title}`} aria-pressed={Boolean(hearts[track.id])} className={`flex h-9 w-8 items-center justify-center rounded disabled:opacity-40 ${hearts[track.id] ? "text-rose-400" : "text-zinc-400 hover:text-rose-300"}`}><Heart className="h-4 w-4" fill={hearts[track.id] ? "currentColor" : "none"} /></button>
          <ShareButton title={track.title} text={`${track.artist} · ${track.title}`} url={`/ai-music?lang=${lang}&track=${track.id}`} label={copy.share} copiedLabel={copy.copied} iconOnly className="h-9 w-8 !rounded !border-0 !p-0 text-zinc-400" />
        </div>
      </li>;
    })}</ol>;
  }

  return <section id="monthly-charts" aria-labelledby="monthly-chart-heading" className="scroll-mt-24">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id="monthly-chart-heading" className="text-xl font-bold">{layoutCopy.title}</h2>
      <div className="flex shrink-0">{data && !loading && !error && <ShareButton title={`AIPOGER Showtime · ${data.month} · ${layoutCopy.title}`} text={`${data.month} · ${genre === "all" ? copy.all : genre}`} url={monthlyChartSharePath(data.month, genre, lang)} label={decisionCopy.share} copiedLabel={copy.copied} iconOnly className="h-9 w-9 !rounded !border-0 !p-0" />}<button type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="chart-filters" title={layoutCopy.filters} aria-label={layoutCopy.filters} className={`flex h-9 w-9 items-center justify-center ${filtersOpen ? "text-orange-300" : "text-zinc-400 hover:text-white"}`}><SlidersHorizontal className="h-4 w-4" /></button><button type="button" onClick={() => dialog.current?.showModal()} title={copy.rules} aria-label={copy.rules} className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:text-white"><Info className="h-4 w-4" /></button></div>
    </header>
    {!filtersOpen && (genre !== "all" || search.trim()) && <p className="mb-3 break-words text-xs text-orange-200">{genre === "all" ? copy.all : t(MUSIC_GENRE_OPTIONS.find((item) => item.value === genre)?.labelKey ?? "") || genre}{search.trim() ? ` · ${search.trim()}` : ""}</p>}
    <div id="chart-filters" hidden={!filtersOpen}>
    <div className="grid grid-cols-2 gap-3 border-b border-white/15 pb-4">
      <label className="grid gap-1 text-xs text-zinc-400">{copy.month}<select aria-label={copy.month} value={month || data?.month || ""} disabled={!data} onChange={(event) => setMonth(event.target.value)} className="h-10 min-w-0 rounded border border-white/20 bg-[#111314] px-2 text-sm text-white">{!data && <option value="">—</option>}{data?.availableMonths.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-zinc-400">{copy.style}<select aria-label={copy.style} value={genre} onChange={(event) => setGenre(event.target.value)} className="h-10 min-w-0 rounded border border-white/20 bg-[#111314] px-2 text-sm text-white"><option value="all">{copy.all}</option>{MUSIC_GENRE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}</select></label>
      <label className="relative col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search} className="h-10 w-full rounded border border-white/20 bg-[#111314] pl-9 pr-3 text-sm text-white outline-none focus:border-orange-400" /></label>
      <button type="button" onClick={() => setRefresh((n) => n + 1)} title={copy.retry} aria-label={copy.retry} className="col-span-2 flex h-9 items-center justify-end gap-2 text-xs text-zinc-400 hover:text-white"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{copy.retry}</button>
    </div>
    </div>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3"><span className="inline-flex flex-wrap items-center gap-2 text-xs text-zinc-400"><span className={`h-1.5 w-1.5 rounded-full ${data?.status === "final" ? "bg-zinc-500" : "bg-emerald-400"}`} />{data?.month} · {data?.status === "final" ? copy.final : data?.status === "awaiting_decision" ? decisionCopy.settling : copy.live}</span><button type="button" disabled={!ranked.length || loading || error} onClick={() => { if (ranked[0]) play(ranked[0], ranked, true); }} className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-orange-300 disabled:opacity-30"><Play className="h-3.5 w-3.5" />{copy.playAll}</button></div>
    {notice && <div role="status" className="mb-4 flex flex-wrap gap-3 border-l-2 border-orange-400 pl-3 text-sm text-orange-200">{notice === "login" ? copy.login : copy.heartFailed}{notice === "login" && <Link className="underline" href={`/auth?next=${encodeURIComponent(`/rank?lang=${lang}`)}`}>{copy.signIn}</Link>}</div>}
    {error ? <div role="alert" className="py-12 text-center text-sm text-zinc-400"><p>{copy.failed}</p><button type="button" onClick={() => setRefresh((n) => n + 1)} className="mt-3 text-orange-300">{copy.retry}</button></div> : loading ? <div role="status" aria-label={copy.loading} className="animate-pulse divide-y divide-white/10">{[0, 1, 2].map((index) => <div key={index} className="flex items-center gap-4 py-4"><div className="h-14 w-14 rounded bg-white/5" /><div className="h-3 w-1/3 rounded bg-white/5" /></div>)}</div> : <>
      {ranked.length > 0 && rows(expanded ? ranked : ranked.slice(0, 5))}
      {ranked.length === 0 && <div className="py-10 text-center"><p className="text-sm text-zinc-400">{search ? copy.noMatch : copy.empty}</p><Link className="mt-3 inline-block text-sm font-bold text-orange-300" href={`/ai-music?lang=${lang}`}>{copy.explore}</Link></div>}
      {accumulating.length > 0 && (expanded || ranked.length < 5) && <section className="mt-4 border-t border-white/15 pt-4"><h3 className="text-xs font-bold text-zinc-500">{copy.accumulating}</h3>{rows(expanded ? accumulating : accumulating.slice(0, Math.max(0, 5 - ranked.length)))}</section>}
      {visible.length > 5 && <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 border-y border-white/15 text-xs font-bold text-zinc-300 hover:text-white">{expanded ? layoutCopy.less : layoutCopy.more}{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>}
    </>}
    <dialog ref={dialog} aria-labelledby="chart-rules-title" className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-white/20 bg-[#111314] p-5 text-white backdrop:bg-black/80" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div onClick={(event) => event.stopPropagation()}><header className="flex items-center justify-between gap-3"><h2 id="chart-rules-title" className="text-lg font-bold">{copy.rules}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label={copy.close} className="flex h-10 w-10 items-center justify-center"><X className="h-5 w-5" /></button></header><p className="mt-3 text-sm leading-7 text-zinc-300">{copy.ruleText} {decisionCopy.rule}</p></div></dialog>
  </section>;
}
