"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ShowtimeChoiceShelf, {
  type ShowtimeChoiceHeartState,
  type ShowtimeChoiceShelfEntry,
} from "@/components/showtime-choice-shelf";
import ShowtimeQueuePlayer, {
  type ShowtimePlayerTrack,
  type ShowtimeQueuePlayerHandle,
} from "@/components/showtime-queue-player";
import {
  choiceDisplayTitle,
  choiceItemRecordKey,
  choicePublicPath,
  type AipogerChoiceCollection,
  type AipogerChoiceItem,
} from "@/lib/aipoger-choice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { getChoiceCopy } from "@/lib/choice-copy";
import type { AipogerPublicCreatorChoiceCollection } from "@/lib/creator-choice";
import type { Lang } from "@/lib/locale";
import { supabase } from "@/lib/supabase";

export type PublicChoiceGalleryProps = { lang: Lang; chart?: ReactNode };

type HeartMap = Record<string, ShowtimeChoiceHeartState>;
type ChoiceInteraction = ShowtimeChoiceHeartState & { recordKey: string };
type SongInteraction = { recordKey: string; favoriteCount: number; myFavorited: boolean };
type RequestScope = {
  controller: AbortController;
  token: string | null;
  hearts: HeartMap;
  items: HeartMap;
  choiceReady: boolean;
  itemsReady: boolean;
  busy: Set<string>;
};

const GALLERY_COPY = {
  zh: { retry: "重試", signIn: "請先登入，才能收藏。", playback: "目前無法播放，請重試。" },
  en: { retry: "Retry", signIn: "Sign in to save favorites.", playback: "Playback failed. Try again." },
  ja: { retry: "再試行", signIn: "保存するにはログインしてください。", playback: "再生できません。もう一度お試しください。" },
  ko: { retry: "다시 시도", signIn: "저장하려면 로그인하세요.", playback: "재생하지 못했습니다. 다시 시도해 주세요." },
};

function collectionKey(entry: ShowtimeChoiceShelfEntry) {
  return `${entry.kind}:${entry.id}`;
}

function count(value: number) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
}

async function requestJson<T>(url: string, signal: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok) throw new Error(`Choice request failed: ${response.status}`);
  const payload = await response.json();
  if (!payload || payload.schemaReady === false) throw new Error("Choice is unavailable");
  return payload as T;
}

async function loadBatches<T>(
  endpoint: string,
  keys: string[],
  limit: number,
  field: "interactions" | "records",
  scope: RequestScope,
): Promise<T[]> {
  const records: T[] = [];
  const uniqueKeys = [...new Set(keys)];
  for (let offset = 0; offset < uniqueKeys.length; offset += limit) {
    const batch = uniqueKeys.slice(offset, offset + limit);
    const payload = await requestJson<Partial<Record<typeof field, T[]>>>(
      `${endpoint}?keys=${encodeURIComponent(batch.join(","))}`,
      scope.controller.signal,
      { headers: scope.token ? { Authorization: `Bearer ${scope.token}` } : undefined },
    );
    const result = payload[field];
    if (!Array.isArray(result)) throw new Error("Invalid Choice interactions");
    records.push(...result);
  }
  return records;
}

export default function PublicChoiceGallery({ lang, chart }: PublicChoiceGalleryProps) {
  const copy = getChoiceCopy(lang);
  const messages = GALLERY_COPY[lang];
  const [token, setToken] = useState<string | null>();
  const tokenRef = useRef<string | null | undefined>(undefined);
  const [retry, setRetry] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [entries, setEntries] = useState<ShowtimeChoiceShelfEntry[]>([]);
  const [featuredKey, setFeaturedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [interactionError, setInteractionError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [hearts, setHearts] = useState<HeartMap>({});
  const [itemHearts, setItemHearts] = useState<HeartMap>({});
  const [heartBusy, setHeartBusy] = useState<Record<string, boolean>>({});
  const [itemHeartBusy, setItemHeartBusy] = useState<Record<string, boolean>>({});
  const scopeRef = useRef<RequestScope | null>(null);
  const playerRef = useRef<ShowtimeQueuePlayerHandle>(null);
  const playbackRequest = useRef(0);

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    const updateSession = (accessToken: string | null) => {
      if (!active) return;
      if (tokenRef.current !== accessToken) {
        // Invalidate writes immediately, before React runs the next loading effect.
        scopeRef.current?.controller.abort();
        tokenRef.current = accessToken;
        setToken(accessToken);
      }
      setAuthError(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      updateSession(session?.access_token ?? null);
    });
    let timer: ReturnType<typeof setTimeout>;
    const sessionTimeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Session timed out")), 15_000);
    });
    void Promise.race([supabase.auth.getSession(), sessionTimeout])
      .then(({ data, error }) => {
        if (authEventSeen || !active) return;
        if (error) throw error;
        updateSession(data.session?.access_token ?? null);
      })
      .catch(() => {
        if (!active || authEventSeen) return;
        updateSession(null);
        setAuthError(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [retry]);

  useEffect(() => {
    if (token === undefined) return;
    const scope: RequestScope = {
      controller: new AbortController(), token, hearts: {}, items: {},
      choiceReady: false, itemsReady: false, busy: new Set(),
    };
    scopeRef.current = scope;
    const current = () => !scope.controller.signal.aborted;
    setLoading(true);
    setCatalogError(false);
    setInteractionError(false);
    setActionError("");
    setEntries([]);
    setFeaturedKey(null);
    setHearts({});
    setItemHearts({});
    setHeartBusy({});
    setItemHeartBusy({});

    const load = async () => {
      const results = await Promise.allSettled([
        requestJson<{ collections?: AipogerChoiceCollection[]; collection?: AipogerChoiceCollection | null; featuredKey?: string | null }>("/api/choice/current", scope.controller.signal),
        requestJson<{ collections: AipogerPublicCreatorChoiceCollection[]; featuredKey?: string | null }>("/api/creator-choice/public", scope.controller.signal),
      ]);
      if (!current()) return;
      const [official, creators] = results;
      const officialPayload = official.status === "fulfilled" ? official.value : null;
      const officialCollections = officialPayload?.collections
        ?? (officialPayload?.collection ? [officialPayload.collection] : []);
      const creatorCollections = creators.status === "fulfilled" ? creators.value.collections : [];
      if (!Array.isArray(officialCollections) || !Array.isArray(creatorCollections)) throw new Error("Invalid Choice catalog");
      const nextEntries: ShowtimeChoiceShelfEntry[] = [
        ...officialCollections.filter((collection) => collection.items.length > 0).map((collection) => ({
          id: collection.id,
          kind: "official" as const,
          curatorName: collection.curatorName || "AIPOGER",
          coverUrl: collection.coverUrl?.trim() || (collection.curatorIdentity === "personal"
            ? collection.avatarUrl?.trim() || AIPOGER_BRAND_LOGO : AIPOGER_BRAND_LOGO),
          title: choiceDisplayTitle(collection.curatorName, collection.title),
          intro: collection.intro,
          weekStart: collection.weekStart,
          href: `${choicePublicPath(collection.id, "official")}&lang=${lang}`,
          items: collection.items,
        })),
        ...creatorCollections.map((collection) => ({
          id: collection.id,
          kind: "creator" as const,
          curatorName: collection.curatorName,
          coverUrl: collection.coverUrl?.trim() || collection.avatarUrl?.trim() || AIPOGER_BRAND_LOGO,
          title: choiceDisplayTitle(collection.curatorName, collection.title),
          intro: collection.intro,
          weekStart: collection.weekStart,
          href: `${choicePublicPath(collection.id, "creator")}&lang=${lang}`,
          items: collection.items,
        })),
      ];
      setEntries(nextEntries);
      setFeaturedKey(officialPayload?.featuredKey ?? (creators.status === "fulfilled" ? creators.value.featuredKey : null) ?? null);
      setCatalogError(results.some((result) => result.status === "rejected"));
      setLoading(false);
      const choiceKeys = nextEntries.map(collectionKey);
      const itemKeys = nextEntries.flatMap((entry) => entry.items.map(choiceItemRecordKey));
      setHeartBusy(Object.fromEntries(choiceKeys.map((key) => [key, true])));
      setItemHeartBusy(Object.fromEntries(itemKeys.map((key) => [key, true])));

      // These are separate records, with different server lookup limits and save semantics.
      await Promise.all([
        loadBatches<ChoiceInteraction>("/api/choice/interactions", choiceKeys, 48, "interactions", scope)
          .then((records) => {
            if (!current()) return;
            scope.hearts = Object.fromEntries(records.map((record) => [record.recordKey, {
              heartCount: count(record.heartCount), myHeart: Boolean(record.myHeart),
            }]));
            scope.choiceReady = true;
            setHearts(scope.hearts);
          }).catch(() => { if (current()) setInteractionError(true); })
          .finally(() => { if (current()) setHeartBusy({}); }),
        loadBatches<SongInteraction>("/api/honor-board/interactions", itemKeys, 80, "records", scope)
          .then((records) => {
            if (!current()) return;
            scope.items = Object.fromEntries(records.map((record) => [record.recordKey, {
              heartCount: count(record.favoriteCount), myHeart: Boolean(record.myFavorited),
            }]));
            scope.itemsReady = true;
            setItemHearts(scope.items);
          }).catch(() => { if (current()) setInteractionError(true); })
          .finally(() => { if (current()) setItemHeartBusy({}); }),
      ]);
    };
    void load().catch(() => { if (current()) setCatalogError(true); })
      .finally(() => { if (current()) setLoading(false); });
    return () => {
      scope.controller.abort();
      playbackRequest.current += 1;
    };
  }, [token, retry, lang]);

  const save = async (entry: ShowtimeChoiceShelfEntry | null, item?: AipogerChoiceItem) => {
    const scope = scopeRef.current;
    if (!scope || scope.controller.signal.aborted) return;
    const key = entry ? collectionKey(entry) : choiceItemRecordKey(item!);
    if (scope.busy.has(key)) return;
    setActionError("");
    if (!scope.token) { setActionError(messages.signIn); return; }
    if (!(entry ? scope.choiceReady : scope.itemsReady)) {
      setInteractionError(true);
      setActionError(copy.loadFailed);
      return;
    }
    const setBusy = entry ? setHeartBusy : setItemHeartBusy;
    scope.busy.add(key);
    setBusy((previous) => ({ ...previous, [key]: true }));
    try {
      const payload = await requestJson<{ interaction?: ChoiceInteraction; record?: SongInteraction }>(
        entry ? "/api/choice/interactions" : "/api/honor-board/interactions",
        scope.controller.signal,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${scope.token}` },
          body: JSON.stringify(entry ? {
            action: scope.hearts[key]?.myHeart ? "remove_heart" : "heart",
            collectionKind: entry.kind, collectionId: entry.id,
          } : {
            action: "favorite", recordKey: key,
            targetKind: item!.sourceKind === "listen_bar_track" ? "bar" : "battle",
            targetId: item!.id, targetTitle: `${item!.artist} / ${item!.title}`,
            targetArtist: item!.artist, targetGenre: item!.genre,
          }),
        },
      );
      if (scope.controller.signal.aborted) return;
      if (entry) {
        const record = payload.interaction;
        if (!record || record.recordKey !== key) throw new Error("Invalid Choice save");
        scope.hearts = { ...scope.hearts, [key]: { heartCount: count(record.heartCount), myHeart: Boolean(record.myHeart) } };
        setHearts(scope.hearts);
      } else {
        const record = payload.record;
        if (!record || record.recordKey !== key) throw new Error("Invalid song save");
        scope.items = { ...scope.items, [key]: { heartCount: count(record.favoriteCount), myHeart: Boolean(record.myFavorited) } };
        setItemHearts(scope.items);
      }
    } catch {
      if (!scope.controller.signal.aborted) setActionError(entry ? copy.favoriteFailed : copy.trackFavoriteFailed);
    } finally {
      scope.busy.delete(key);
      if (!scope.controller.signal.aborted) setBusy((previous) => ({ ...previous, [key]: false }));
    }
  };

  const play = async (entry: ShowtimeChoiceShelfEntry, itemId?: string) => {
    const request = ++playbackRequest.current;
    setActionError("");
    const items = entry.items.filter((item) => Boolean(item.audioUrl?.trim()));
    const tracks = items.map<ShowtimePlayerTrack>((item) => ({
      id: `${item.sourceKind}:${item.id}`, title: item.title, artist: item.artist,
      coverUrl: item.coverUrl?.trim() || AIPOGER_BRAND_LOGO, audioUrl: item.audioUrl!, genre: item.genre,
    }));
    const index = itemId ? items.findIndex((item) => item.itemId === itemId) : 0;
    if (!tracks.length || index < 0) return;
    try {
      const started = await playerRef.current?.start(tracks, index, `${entry.curatorName} Choice`);
      if (!started && request === playbackRequest.current) setActionError(messages.playback);
    } catch {
      if (request === playbackRequest.current) setActionError(messages.playback);
    }
  };

  const failed = authError || catalogError || interactionError;
  return (
    <div data-public-choice-gallery>
      <ShowtimeChoiceShelf
        entries={entries} lang={lang} loading={loading}
        featuredKey={featuredKey} chart={chart}
        loadError={catalogError ? copy.loadFailed : undefined}
        onPlay={(entry, itemId) => { void play(entry, itemId); }}
        hearts={hearts} heartBusy={heartBusy} heartError={actionError}
        onToggleHeart={(entry) => { void save(entry); }}
        itemHearts={itemHearts} itemHeartBusy={itemHeartBusy}
        onToggleItemHeart={(item) => { void save(null, item); }}
      />
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 py-3 text-sm text-rose-200">
          <span>{copy.loadFailed}</span>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex min-h-9 items-center gap-1.5 rounded border border-white/20 px-2.5 text-xs font-bold text-white hover:border-white/50">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />{messages.retry}
          </button>
        </div>
      ) : null}
      <ShowtimeQueuePlayer ref={playerRef} isZh={lang === "zh"} />
    </div>
  );
}
