"use client";

import Link from "next/link";
import { Heart, ListMusic, Play, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/share-button";
import ShowtimeQueuePlayer, { type ShowtimePlayerTrack } from "@/components/showtime-queue-player";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import type { AipogerChoiceCollection, AipogerChoiceItem } from "@/lib/aipoger-choice";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { supabase } from "@/lib/supabase";

type CollectionKind = "official" | "creator";
type ChoiceResponse = { kind?: CollectionKind; collection?: AipogerChoiceCollection; error?: string };
type HeartState = { heartCount: number; myHeart: boolean };

function displayDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function choiceRecordKey(kind: CollectionKind, id: string) {
  return `${kind}:${id}`;
}

function playableQueue(items: AipogerChoiceItem[]): ShowtimePlayerTrack[] {
  return items
    .filter((item): item is AipogerChoiceItem & { audioUrl: string } => Boolean(item.audioUrl))
    .map((item) => ({
      id: `${item.sourceKind}:${item.id}`,
      title: item.title,
      artist: item.artist,
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl,
    }));
}

export default function PublicChoicePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const choiceId = typeof params.id === "string" ? params.id : "";
  const kind: CollectionKind = searchParams.get("kind") === "official" ? "official" : "creator";
  const [collection, setCollection] = useState<AipogerChoiceCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heart, setHeart] = useState<HeartState>({ heartCount: 0, myHeart: false });
  const [heartBusy, setHeartBusy] = useState(false);
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [player, setPlayer] = useState<{ queue: ShowtimePlayerTrack[]; index: number } | null>(null);

  useEffect(() => {
    if (!choiceId) return;
    let alive = true;
    setLoading(true);
    setError("");
    void fetch(`/api/choice/${encodeURIComponent(choiceId)}?kind=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ChoiceResponse | null;
        if (!response.ok || !payload?.collection) throw new Error(payload?.error || "找不到這份 Choice。");
        if (alive) setCollection(payload.collection);
      })
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Choice 暫時無法讀取。");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [choiceId, kind]);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  useEffect(() => {
    if (!choiceId) return;
    let alive = true;
    void authHeader().then((headers) => fetch(`/api/choice/interactions?keys=${encodeURIComponent(choiceRecordKey(kind, choiceId))}`, { headers, cache: "no-store" }))
      .then(async (response) => (response.ok ? (await response.json()) as { interactions?: Array<HeartState & { recordKey: string }> } : null))
      .then((payload) => {
        const interaction = payload?.interactions?.[0];
        if (alive && interaction) setHeart({ heartCount: interaction.heartCount, myHeart: interaction.myHeart });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authHeader, choiceId, kind]);

  const queue = useMemo(() => playableQueue(collection?.items ?? []), [collection?.items]);

  const play = useCallback((item?: AipogerChoiceItem) => {
    if (queue.length === 0) return;
    const index = item ? Math.max(0, queue.findIndex((track) => track.id === `${item.sourceKind}:${item.id}`)) : 0;
    setPlayer({ queue, index: index < 0 ? 0 : index });
    setTracklistOpen(false);
  }, [queue]);

  const toggleHeart = useCallback(async () => {
    if (heartBusy) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const nextPath = typeof window === "undefined" ? `/choice/${choiceId}?kind=${kind}` : `${window.location.pathname}${window.location.search}`;
      rememberAuthNextPath(nextPath);
      router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setHeartBusy(true);
    setError("");
    try {
      const response = await fetch("/api/choice/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: heart.myHeart ? "remove_heart" : "heart",
          collectionKind: kind,
          collectionId: choiceId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { interaction?: HeartState; error?: string } | null;
      if (!response.ok || !payload?.interaction) throw new Error(payload?.error || "收藏失敗，請稍後再試。");
      setHeart(payload.interaction);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "收藏失敗，請稍後再試。");
    } finally {
      setHeartBusy(false);
    }
  }, [choiceId, heart.myHeart, heartBusy, kind, router]);

  if (loading) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-zinc-400">正在開啟 Choice...</main>;
  if (!collection) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-red-100">{error || "找不到這份 Choice。"}</main>;

  const coverUrl = collection.avatarUrl?.trim() || AIPOGER_BRAND_LOGO;
  const title = collection.title || `${collection.curatorName || "AIPOGER"} Choice`;

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-24 text-zinc-100 sm:px-7 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-yellow-200/20 pb-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" className="h-16 w-16 rounded-full border border-orange-200/35 object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">AIPOGER CHOICE</p>
                <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-5xl">{title}</h1>
                <p className="mt-2 text-sm font-bold text-zinc-400">策展：{collection.curatorName || "AIPOGER"} · {displayDate(collection.weekStart)}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={() => void play()} disabled={queue.length === 0} className="inline-flex items-center gap-2 rounded-full border border-orange-200/45 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-45" aria-label="全部播放">
                <Play className="h-4 w-4" fill="currentColor" /> 全部播放
              </button>
              <button type="button" onClick={() => void toggleHeart()} disabled={heartBusy} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-45 ${heart.myHeart ? "border-pink-200/60 bg-pink-300/15 text-pink-100" : "border-white/20 bg-white/[0.03] text-zinc-200 hover:border-pink-200/45"}`} aria-label={heart.myHeart ? "取消收藏 Choice" : "收藏 Choice"} aria-pressed={heart.myHeart} title={heart.myHeart ? "取消收藏 Choice" : "收藏 Choice"}>
                <Heart className="h-4 w-4" fill={heart.myHeart ? "currentColor" : "none"} /> {heart.heartCount}
              </button>
              <ShareButton title={title} text={collection.intro || `${collection.curatorName || "AIPOGER"} 的 Choice`} url={`/choice/${choiceId}?kind=${kind}`} label="分享 Choice" />
            </div>
          </div>
          {collection.intro ? <p className="mt-6 max-w-3xl text-base font-bold leading-7 text-zinc-300">{collection.intro}</p> : null}
          {error ? <p className="mt-4 text-xs font-bold text-red-200">{error}</p> : null}
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100/70">PLAYLIST</p>
              <h2 className="mt-1 text-2xl font-black text-white">選曲</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
              <span>{collection.items.length} 首作品</span>
              <button type="button" onClick={() => setTracklistOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-zinc-200 transition hover:border-yellow-100/45" aria-label="開啟曲目清單"><ListMusic className="h-3.5 w-3.5" />曲目</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {collection.items.map((item, index) => (
              <article key={item.itemId} className="flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.025] p-2.5 transition hover:border-yellow-100/35">
                <span className="w-6 shrink-0 text-center text-xs font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-400">{item.artist}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-zinc-600">{item.genre} · {item.recognition}</p>
                </div>
                <button type="button" onClick={() => void play(item)} disabled={!item.audioUrl} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`播放 ${item.title}`}><Play className="h-4 w-4" fill="currentColor" /></button>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <Link href="/rank?lang=zh#choice-weekly" className="text-sm font-black text-cyan-100 underline decoration-cyan-100/30 underline-offset-4 hover:text-white">回到 AIPOGER Choice</Link>
        </div>
      </div>

      {tracklistOpen ? (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center">
          <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden border border-yellow-100/25 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">{collection.curatorName || "AIPOGER"} · CHOICE</p><h2 className="mt-1 text-lg font-black text-white">{title}</h2></div>
              <button type="button" onClick={() => setTracklistOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-300 hover:text-white" aria-label="關閉曲目清單"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4">
              {collection.items.map((item, index) => <button key={item.itemId} type="button" onClick={() => void play(item)} disabled={!item.audioUrl} className="grid min-w-0 grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-2 border border-white/10 bg-white/[0.025] p-2 text-left disabled:opacity-40"><span className="text-xs font-black text-zinc-600">{String(index + 1).padStart(2, "0")}</span><img src={item.coverUrl} alt="" className="h-11 w-11 rounded object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-black text-white">{item.title}</span><span className="mt-1 block truncate text-xs font-bold text-zinc-500">{item.artist}</span></span><Play className="h-4 w-4 text-orange-300" fill="currentColor" /></button>)}
            </div>
          </section>
        </div>
      ) : null}

      {player ? <ShowtimeQueuePlayer queue={player.queue} index={player.index} sourceLabel={`${collection.curatorName || "AIPOGER"} Choice`} isZh onIndexChange={(index) => setPlayer((current) => current ? { ...current, index } : current)} onClose={() => setPlayer(null)} /> : null}
    </main>
  );
}
