"use client";

import Link from "next/link";
import { ArrowLeft, Heart, ListMusic, MessageCircle, Play, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChoiceCommentsDialog from "@/components/choice-comments-dialog";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import ShareButton from "@/components/share-button";
import type { ShowtimeChoiceItemHeartState } from "@/components/showtime-choice-shelf";
import ShowtimeQueuePlayer, { type ShowtimePlayerTrack, type ShowtimeQueuePlayerHandle } from "@/components/showtime-queue-player";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { choiceDisplayTitle, choiceItemRecordKey, type AipogerChoiceCollection, type AipogerChoiceItem } from "@/lib/aipoger-choice";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { getChoiceCopy } from "@/lib/choice-copy";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type CollectionKind = "official" | "creator";
type ChoiceResponse = { kind?: CollectionKind; collection?: AipogerChoiceCollection; error?: string };
type HeartState = { heartCount: number; myHeart: boolean };

function displayDate(value: string, locale: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
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
  const { lang } = useI18n();
  const copy = getChoiceCopy(lang);
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
  const [itemHearts, setItemHearts] = useState<Record<string, ShowtimeChoiceItemHeartState>>({});
  const [itemHeartBusy, setItemHeartBusy] = useState<Record<string, boolean>>({});
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const playerRef = useRef<ShowtimeQueuePlayerHandle>(null);

  useEffect(() => {
    if (!choiceId) return;
    let alive = true;
    setLoading(true);
    setError("");
    void fetch(`/api/choice/${encodeURIComponent(choiceId)}?kind=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ChoiceResponse | null;
        if (!response.ok || !payload?.collection) throw new Error(copy.notFound);
        if (alive) setCollection(payload.collection);
      })
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [choiceId, copy.loadFailed, copy.notFound, kind, lang]);

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

  useEffect(() => {
    const keys = Array.from(new Set((collection?.items ?? []).map(choiceItemRecordKey)));
    if (keys.length === 0) {
      setItemHearts({});
      return;
    }
    let alive = true;
    void authHeader()
      .then((headers) => fetch(`/api/honor-board/interactions?keys=${encodeURIComponent(keys.join(","))}`, { headers, cache: "no-store" }))
      .then(async (response) => response.ok ? await response.json() as { records?: Array<{ recordKey: string; favoriteCount: number; myFavorited: boolean }> } : null)
      .then((payload) => {
        if (!alive) return;
        const next: Record<string, ShowtimeChoiceItemHeartState> = {};
        keys.forEach((key) => {
          const record = payload?.records?.find((item) => item.recordKey === key);
          next[key] = {
            heartCount: Math.max(0, Math.round(Number(record?.favoriteCount) || 0)),
            myHeart: Boolean(record?.myFavorited),
          };
        });
        setItemHearts(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authHeader, collection?.items]);

  const play = useCallback((item?: AipogerChoiceItem) => {
    if (queue.length === 0) return;
    const index = item ? Math.max(0, queue.findIndex((track) => track.id === `${item.sourceKind}:${item.id}`)) : 0;
    void playerRef.current?.start(queue, index < 0 ? 0 : index, `${collection?.curatorName || "AIPOGER"} Choice`);
    setTracklistOpen(false);
  }, [collection?.curatorName, queue]);

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
      if (!response.ok || !payload?.interaction) throw new Error(payload?.error || copy.favoriteFailed);
      setHeart(payload.interaction);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : copy.favoriteFailed);
    } finally {
      setHeartBusy(false);
    }
  }, [choiceId, copy.favoriteFailed, heart.myHeart, heartBusy, kind, router]);

  const toggleItemHeart = useCallback(async (item: AipogerChoiceItem) => {
    const key = choiceItemRecordKey(item);
    if (itemHeartBusy[key]) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const nextPath = typeof window === "undefined" ? `/choice/${choiceId}?kind=${kind}` : `${window.location.pathname}${window.location.search}`;
      rememberAuthNextPath(nextPath);
      router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setItemHeartBusy((current) => ({ ...current, [key]: true }));
    setError("");
    try {
      const targetKind = item.sourceKind === "listen_bar_track" ? "bar" : "battle";
      const response = await fetch("/api/honor-board/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: "favorite",
          recordKey: key,
          targetKind,
          targetId: item.id,
          targetTitle: `${item.artist} / ${item.title}`,
          targetArtist: item.artist,
          targetGenre: item.genre,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { record?: { favoriteCount: number; myFavorited: boolean }; error?: string } | null;
      if (!response.ok || !payload?.record) throw new Error(payload?.error || copy.trackFavoriteFailed);
      setItemHearts((current) => ({
        ...current,
        [key]: {
          heartCount: Math.max(0, Math.round(Number(payload.record?.favoriteCount) || 0)),
          myHeart: Boolean(payload.record?.myFavorited),
        },
      }));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : copy.trackFavoriteFailed);
    } finally {
      setItemHeartBusy((current) => ({ ...current, [key]: false }));
    }
  }, [choiceId, copy.trackFavoriteFailed, itemHeartBusy, kind, router]);

  if (loading) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-zinc-400">{copy.loading}</main>;
  if (!collection) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-red-100">{error || copy.notFound}</main>;

  const coverUrl = collection.coverUrl?.trim() || collection.avatarUrl?.trim() || AIPOGER_BRAND_LOGO;
  const title = choiceDisplayTitle(collection.curatorName, collection.title);
  const sharePath = `/choice/${encodeURIComponent(choiceId)}?kind=${kind}&lang=${lang}`;

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-24 text-zinc-100 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-yellow-200/20 pb-7">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:gap-10">
            <div className="flex min-w-0 items-center gap-4">
              <AipogerChoiceCover src={coverUrl} className="h-16 w-16 shrink-0 rounded-full border border-orange-200/35" logoClassName="h-3.5 w-4" />
              <div className="min-w-0">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">{title}</h1>
                <p className="mt-2 text-sm font-bold text-zinc-400">{copy.curatedBy}: {collection.curatorName || "AIPOGER"} · {displayDate(collection.weekStart, copy.dateLocale)}</p>
              </div>
            </div>
            <div className="min-w-0">
              {collection.intro ? <p className="max-w-2xl text-base font-bold leading-7 text-zinc-300">{collection.intro}</p> : null}
              <div className="mt-4 flex max-w-full flex-wrap items-center gap-2">
                <Link href={`/rank?lang=${lang}#showtime-catalog`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-100/25 bg-white/[0.025] px-4 py-2 text-sm font-black text-cyan-100 transition hover:border-cyan-100/55 hover:text-white"><ArrowLeft className="h-4 w-4" />{copy.backToShowtime}</Link>
                <button type="button" onClick={() => void play()} disabled={queue.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-200/45 bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-45" aria-label={copy.playAll}>
                  <Play className="h-4 w-4" fill="currentColor" /> {copy.playAll}
                </button>
                <button type="button" onClick={() => void toggleHeart()} disabled={heartBusy} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-45 ${heart.myHeart ? "border-pink-200/60 bg-pink-300/15 text-pink-100" : "border-white/20 bg-white/[0.03] text-zinc-200 hover:border-pink-200/45"}`} aria-label={heart.myHeart ? copy.removeChoice : copy.favoriteChoice} aria-pressed={heart.myHeart} title={heart.myHeart ? copy.removeChoice : copy.favoriteChoice}>
                  <Heart className="h-4 w-4" fill={heart.myHeart ? "currentColor" : "none"} /> {heart.heartCount}
                </button>
                <button type="button" onClick={() => setCommentsOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-sm font-black text-zinc-200 transition hover:border-cyan-100/45 hover:text-white" aria-label={copy.viewComments}><MessageCircle className="h-4 w-4" />{copy.comments}</button>
                <ShareButton title={title} text={collection.intro || copy.choiceDescription(collection.curatorName || "AIPOGER")} url={sharePath} label={copy.shareChoice} copiedLabel={copy.copied} />
              </div>
            </div>
          </div>
          {error ? <p className="mt-4 text-xs font-bold text-red-200">{error}</p> : null}
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-100/70">{copy.playlist}</p>
              <h2 className="mt-1 text-2xl font-black text-white">{copy.selection}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
              <span>{collection.items.length} {copy.works}</span>
              <button type="button" onClick={() => setTracklistOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-zinc-200 transition hover:border-yellow-100/45" aria-label={copy.openTracklist}><ListMusic className="h-3.5 w-3.5" />{copy.tracklist}</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {collection.items.map((item, index) => {
              const itemKey = choiceItemRecordKey(item);
              const itemHeart = itemHearts[itemKey] ?? { heartCount: 0, myHeart: false };
              return (
              <article key={item.itemId} className="flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.025] p-2.5 transition hover:border-yellow-100/35">
                <span className="w-6 shrink-0 text-center text-xs font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-400">{item.artist}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-zinc-600">{item.genre} · {item.recognition}</p>
                </div>
                <button type="button" onClick={() => void toggleItemHeart(item)} disabled={Boolean(itemHeartBusy[itemKey])} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-wait disabled:opacity-45 ${itemHeart.myHeart ? "border-rose-200/55 bg-rose-500/20 text-rose-200" : "border-white/15 text-zinc-400 hover:border-rose-200/45 hover:text-rose-200"}`} aria-label={itemHeart.myHeart ? copy.removeTrack(item.title) : copy.favoriteTrack(item.title)} aria-pressed={itemHeart.myHeart}><Heart className="h-4 w-4" fill={itemHeart.myHeart ? "currentColor" : "none"} /></button>
                <button type="button" onClick={() => void play(item)} disabled={!item.audioUrl} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label={copy.playTrack(item.title)}><Play className="h-4 w-4" fill="currentColor" /></button>
              </article>
              );
            })}
          </div>
        </section>

      </div>

      {tracklistOpen ? (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center">
          <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden border border-yellow-100/25 bg-[#0a0a0a] shadow-2xl">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-4 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:px-5">
              <div className="col-start-1 row-start-1 min-w-0 self-center"><h2 className="text-lg font-black text-white">{title}</h2><time dateTime={collection.weekStart} className="mt-1 block text-xs font-black tabular-nums text-zinc-500">{displayDate(collection.weekStart, copy.dateLocale)}</time></div>
              {collection.intro ? <p className="col-span-2 col-start-1 row-start-2 text-sm font-bold leading-6 text-zinc-300 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-center">{collection.intro}</p> : <span className="hidden sm:block" />}
              <button type="button" onClick={() => setTracklistOpen(false)} className="col-start-2 row-start-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-300 hover:text-white sm:col-start-3" aria-label={copy.closeTracklist}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4">
              {collection.items.map((item, index) => {
                const itemKey = choiceItemRecordKey(item);
                const itemHeart = itemHearts[itemKey] ?? { heartCount: 0, myHeart: false };
                return (
                <article key={item.itemId} className="grid min-w-0 grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-2 border border-white/10 bg-white/[0.025] p-2">
                  <span className="text-xs font-black text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
                  <span className="min-w-0"><span className="block truncate text-sm font-black text-white">{item.title}</span><span className="mt-1 block truncate text-xs font-bold text-zinc-500">{item.artist}</span></span>
                  <button type="button" onClick={() => void toggleItemHeart(item)} disabled={Boolean(itemHeartBusy[itemKey])} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-wait disabled:opacity-45 ${itemHeart.myHeart ? "border-rose-200/55 bg-rose-500/20 text-rose-200" : "border-white/15 text-zinc-400 hover:border-rose-200/45 hover:text-rose-200"}`} aria-label={itemHeart.myHeart ? copy.removeTrack(item.title) : copy.favoriteTrack(item.title)} aria-pressed={itemHeart.myHeart}><Heart className="h-4 w-4" fill={itemHeart.myHeart ? "currentColor" : "none"} /></button>
                  <button type="button" onClick={() => void play(item)} disabled={!item.audioUrl} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label={copy.playTrack(item.title)}><Play className="h-4 w-4" fill="currentColor" /></button>
                </article>
                );
              })}
            </div>
            <div className="border-t border-white/10 px-4 py-3"><button type="button" onClick={() => void play()} disabled={queue.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-35" aria-label={copy.playAll}><Play className="h-4 w-4" fill="currentColor" />{copy.playAll}</button></div>
          </section>
        </div>
      ) : null}

      <ChoiceCommentsDialog open={commentsOpen} collectionKind={kind} collectionId={choiceId} title={title} isZh={lang === "zh"} onClose={() => setCommentsOpen(false)} />
      <ShowtimeQueuePlayer ref={playerRef} isZh={lang === "zh"} />
    </main>
  );
}
