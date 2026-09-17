"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ListMusic, Pause, Play, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import type { ChartManagementResponse, ChartTieGroup, DuplicateGroup } from "@/lib/chart-management";

const iconButton = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-white/15 text-zinc-200 hover:bg-white/10 disabled:opacity-25";

export default function ChartManagementPage() {
  const [data, setData] = useState<ChartManagementResponse | null>(null);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [authState, setAuthState] = useState<"ready" | "login" | "denied">("ready");
  const [orders, setOrders] = useState<Record<number, string[]>>({});
  const revision = useRef(0);
  const mutationLock = useRef(false);
  const player = useMusicPlayer();

  const load = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true);
    setNotice("");
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (request !== revision.current) return;
      if (!auth.session) { setData(null); setAuthState("login"); return; }
      const response = await fetch(`/api/admin/charts?${new URLSearchParams(month ? { month } : {})}`, {
        headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
      });
      const payload = await response.json();
      if (request !== revision.current) return;
      if (response.status === 401 || response.status === 403) {
        setAuthState(response.status === 401 ? "login" : "denied"); setData(null); return;
      }
      if (!response.ok) throw new Error(payload.error || "讀取失敗，請重試。");
      setAuthState("ready"); setData(payload);
      setOrders(Object.fromEntries((payload as ChartManagementResponse).groups.map((g) => [g.supporterCount, g.orderedIds ?? g.memberIds])));
    } catch (error) {
      if (request === revision.current) { setData(null); setNotice(error instanceof Error ? error.message : "讀取失敗，請重試。"); }
    } finally { if (request === revision.current) setLoading(false); }
  }, [month]);

  useEffect(() => {
    void load();
    const { data: auth } = supabase.auth.onAuthStateChange(() => {
      revision.current += 1; setData(null); setOrders({});
      // Do not await another auth call inside the Supabase auth callback.
      queueMicrotask(() => { void load(); });
    });
    return () => { revision.current += 1; auth.subscription.unsubscribe(); };
  }, [load]);

  async function mutate(url: string, body: unknown) {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setNotice("");
    const version = revision.current;
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (version !== revision.current) return;
      if (!auth.session) { setAuthState("login"); setData(null); return; }
      const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      const payload = await response.json();
      if (version !== revision.current) return;
      if (!response.ok) throw new Error(payload.error || "未儲存，請重試。");
      await load();
      setNotice("已儲存。");
    } catch (error) { if (version === revision.current) setNotice(error instanceof Error ? error.message : "操作失敗。"); }
    finally { mutationLock.current = false; setBusy(false); }
  }

  function move(score: number, index: number, delta: number) {
    setOrders((current) => {
      const next = [...current[score]];
      if (index + delta < 0 || index + delta >= next.length) return current;
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return { ...current, [score]: next };
    });
  }

  function play(track: { id: string; title: string; artist: string; audioUrl: string; coverUrl: string }) {
    if (player.session?.queue[player.session.index]?.id === `bar:${track.id}`) { musicPlayer?.toggle(); return; }
    void musicPlayer?.start([{ ...track, id: `bar:${track.id}`, heartTrackId: track.id }], 0, "排行榜管理", { repeat: false });
  }

  function trackRow(track: { id: string; title: string; artist: string; audioUrl?: string; coverUrl?: string; detail?: string }, controls?: React.ReactNode) {
    const playing = player.playing && player.session?.queue[player.session.index]?.id === `bar:${track.id}`;
    return <div key={track.id} className="flex flex-wrap items-center gap-3 border-t border-white/10 py-3">
      <button type="button" className="relative h-12 w-12 shrink-0 disabled:opacity-30" disabled={!track.audioUrl} onClick={() => play({ ...track, audioUrl: track.audioUrl!, coverUrl: track.coverUrl || AIPOGER_BRAND_LOGO })} title={`${playing ? "暫停" : "播放"} ${track.title}`} aria-label={`${playing ? "暫停" : "播放"} ${track.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={track.coverUrl || AIPOGER_BRAND_LOGO} className="h-full w-full object-cover" />
        <span className="absolute bottom-0 left-0 rounded-full bg-orange-500 p-1 text-black">{playing ? <Pause size={14} /> : <Play size={14} />}</span>
      </button>
      <div className="min-w-0 flex-1 basis-36"><p className="break-words text-sm font-bold">{track.title}</p><p className="mt-1 text-xs text-cyan-200">{track.artist}</p>{track.detail && <p className="mt-1 text-xs text-zinc-400">{track.detail}</p>}{!track.audioUrl && <p className="text-xs text-zinc-400">已撤下，歷史席次保留</p>}</div>
      <div className="ml-auto flex items-center gap-2">{controls}</div>
    </div>;
  }

  function groupView(group: ChartTieGroup) {
    const ids = orders[group.supporterCount] ?? group.memberIds;
    const tracks = ids.map((id) => ({ ...group.tracks.find((t) => t.id === id)!, ...data?.chart.tracks.find((t) => t.id === id) }));
    const start = Math.min(...group.tracks.map((t) => t.rank ?? 1));
    return <section key={group.supporterCount} className="border-b border-white/20 py-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{group.supporterCount} 位支持者 <span className={`ml-2 text-xs ${group.orderedIds ? "text-emerald-300" : "text-orange-300"}`}>{group.locked ? "已結算" : group.orderedIds ? "已裁定" : "待裁定"}</span></h3>
        <button className="inline-flex min-h-10 items-center gap-2 rounded border border-orange-400/50 px-3 text-sm text-orange-200 disabled:opacity-30" disabled={busy || loading || group.locked} onClick={() => void mutate("/api/admin/charts", { month: data!.chart.month, supporterCount: group.supporterCount, orderedIds: ids })}><Save size={16} />儲存排序</button></header>
      {tracks.map((track, index) => trackRow(track, <><span className="mr-1 text-xs tabular-nums text-zinc-400">第 {start + index} 名</span><button className={iconButton} aria-label={`上移 ${track.title}`} title="上移" disabled={busy || loading || group.locked || index === 0} onClick={() => move(group.supporterCount, index, -1)}><ArrowUp size={16} /></button><button className={iconButton} aria-label={`下移 ${track.title}`} title="下移" disabled={busy || loading || group.locked || index === tracks.length - 1} onClick={() => move(group.supporterCount, index, 1)}><ArrowDown size={16} /></button></>))}
    </section>;
  }

  function duplicateView(group: DuplicateGroup) {
    return <section key={group.key} className="border-b border-white/20 py-5"><h3 className="mb-3 text-sm font-bold text-orange-200">{group.reason === "same_file" ? "相同檔案雜湊" : "同作者相近歌名 · 待試聽確認"}</h3>
      {group.tracks.map((track) => trackRow({ ...track, detail: `${new Date(track.created_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })} · ${track.duration_seconds ?? "?"} 秒 · ${track.id.slice(-8)}` }, <button title="撤下這筆投稿" aria-label={`撤下 ${track.title}`} className={`${iconButton} text-rose-300`} disabled={busy || loading} onClick={() => {
        if (window.confirm(`撤下「${track.title}」？此版本將從公開曲庫移除，保留音檔與歷史紀錄，不合併票數。`)) void mutate("/api/admin/listen-bar-tracks", { action: "remove", trackId: track.id, note: "Moderation: owner confirmed duplicate music in chart management. Preserve audio and historical interactions; no vote transfer." });
      }}><Trash2 size={16} /></button>))}
    </section>;
  }

  return <main className="min-h-screen bg-[#070809] px-4 pb-40 pt-24 text-white sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-5"><h1 className="text-2xl font-bold">排行榜管理</h1><nav className="flex flex-wrap gap-4 text-sm text-zinc-300"><Link href="/admin">後台總覽</Link><Link href="/admin/choice" className="inline-flex items-center gap-2 text-orange-200"><ListMusic size={16} />Choice 管理</Link><Link href="/rank?lang=zh#monthly-charts">查看前台</Link></nav></header>
    {authState !== "ready" ? <div className="py-12"><ShieldCheck className="mb-3 text-orange-300" /><p>{authState === "login" ? "請先登入 owner 帳號。" : "沒有後台權限。"}</p><Link href="/auth?next=%2Fadmin%2Fcharts&owner=1" className="mt-4 inline-block text-orange-300 underline">登入</Link></div> : <>
      <div className="flex flex-wrap items-center gap-4 border-b border-white/15 py-4"><label className="flex items-center gap-2 text-sm">月份<select aria-label="月份" value={month || data?.chart.month || ""} disabled={busy || loading} onChange={(e) => setMonth(e.target.value)} className="h-10 rounded border border-white/20 bg-[#101214] px-3">{!data && <option value="">讀取中</option>}{data?.chart.availableMonths.map((m) => <option key={m}>{m}</option>)}</select></label><button title="重新整理" aria-label="重新整理" className={iconButton} disabled={busy || loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>{data && <span className="text-sm text-orange-200">同票待裁定 {data.groups.filter((g) => !g.orderedIds).length} 組 · 疑似重複 {data.duplicates.length} 組</span>}</div>
      {notice && <p role="status" className="my-4 border-l-2 border-orange-400 pl-3 text-sm text-orange-200">{notice}</p>}
      {!!data?.pendingMonths.length && <nav aria-label="待裁定月份" className="flex flex-wrap gap-3 py-3">{data.pendingMonths.map((entry) => <button key={entry.month} disabled={busy || loading} onClick={() => setMonth(entry.month)} className="min-h-10 border-b border-orange-400/50 text-sm text-orange-200">{entry.month} · {entry.count} 組待裁定</button>)}</nav>}
      {loading ? <p className="py-6 text-zinc-400">讀取中…</p> : data && <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="min-w-0 py-6"><h2 className="text-lg font-bold">同票裁定</h2>{data.groups.length ? data.groups.map(groupView) : <p className="py-6 text-sm text-zinc-400">目前沒有同票組。</p>}
          <details className="mt-6 border-t border-white/20 pt-4"><summary className="cursor-pointer text-sm font-bold">{data.chart.month} 榜單 · {data.chart.tracks.length} 首</summary>{data.chart.tracks.map((track) => trackRow(track, <span className="text-right text-xs leading-6 text-zinc-300">{track.rankPending ? "名次待定" : track.rank !== null ? `第 ${track.rank} 名` : "人氣累積中"}<br />{track.supporterCount} 位支持者</span>))}</details>
          <details className="mt-8 border-t border-white/20 pt-4"><summary className="cursor-pointer text-sm font-bold">裁定紀錄（最近 100 筆）</summary><ol className="mt-3 space-y-3">{data.history.map((entry) => <li key={entry.id} className="break-words text-xs leading-6 text-zinc-400"><time>{new Date(entry.decided_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} 台灣時間</time> · {entry.supporter_count} 位支持者<br />{entry.ordered_ids.map((id) => data.chart.tracks.find((t) => t.id === id)?.title || id).join(" → ")}</li>)}{!data.history.length && <li className="text-sm text-zinc-400">尚無裁定紀錄。</li>}</ol></details>
        </section>
        <section className="min-w-0 py-6"><h2 className="text-lg font-bold">疑似重複歌曲</h2>{data.duplicates.length ? data.duplicates.map(duplicateView) : <p className="py-6 text-sm text-zinc-400">目前沒有符合檢查條件的歌曲。</p>}</section>
      </div>}
    </>}
  </div></main>;
}
