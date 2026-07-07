"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
import { AvatarCropUploadModal } from "@/components/avatar-crop-upload-modal";
import { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_FORMAT_LABEL, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import { readFighterNameFromStorage, writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { loadFighterNameFromProfile, saveFighterNameToProfile } from "@/lib/user-profile-fighter-name";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { LISTEN_BAR_AUDIO_BUCKET } from "@/lib/listen-bar";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const BATTLE_AUDIO_BUCKET = "battle-audio";
const PROFILE_CHALLENGE_AUDIO_KEY = "aipoger:profile-challenge-audio";
const FAVORITE_ORDER_STORAGE_PREFIX = "aipoger:profile-favorite-order";

type ListenBarTrack = {
  id: string;
  title?: string | null;
  artist?: string | null;
  ai_tool?: string | null;
  genre?: string | null;
  bar_phase?: string | null;
  is_active?: boolean | null;
  audio_path?: string | null;
  heart_count?: number | null;
  positive_reaction_count?: number | null;
  created_at?: string | null;
};

type BattleQueueRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  scheduled_start_at?: string | null;
  original_file_name?: string | null;
  genre?: string | null;
  ai_tool?: string | null;
  audio_path?: string | null;
  previewAudioUrl?: string | null;
  match_group_id?: string | null;
};

type BattleRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  battle_ended_at?: string | null;
  song_a_name?: string | null;
  song_b_name?: string | null;
  genre?: string | null;
};

type BattleArchiveRow = {
  id: string;
  battle_id?: string | null;
  winner_song?: string | null;
  winner_name?: string | null;
  genre?: string | null;
  created_at?: string | null;
};

type HonorFavoriteRecord = {
  recordKey: string;
  targetKind?: "battle" | "bar" | null;
  targetId?: string | null;
  targetTitle?: string | null;
  targetArtist?: string | null;
  targetGenre?: string | null;
  targetOwnerId?: string | null;
  audioUrl?: string | null;
  favoriteCount?: number | null;
  myFavorited?: boolean | null;
  updatedAt?: string | null;
};

type CreatorItem = {
  id: string;
  category: CreatorFilter;
  kind: string;
  title: string;
  meta: string;
  href: string;
  canNavigate?: boolean;
  date?: string | null;
  genre?: string | null;
  aiTool?: string | null;
  audioUrl?: string | null;
  favoriteRecord?: HonorFavoriteRecord | null;
};

type CreatorFilter = "all" | "listenBar" | "battle" | "records" | "wins" | "favorites";

function authAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null | undefined): string | null {
  const meta = user?.user_metadata;
  const avatar = meta?.avatar_url;
  const picture = meta?.picture;
  if (typeof avatar === "string" && avatar.length > 0) return avatar;
  if (typeof picture === "string" && picture.length > 0) return picture;
  return null;
}

function formatDateParts(value: string | null | undefined, lang: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const locale = lang === "zh" ? "zh-TW" : "en-US";
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { date: datePart, time: timePart };
}

function favoriteOrderStorageKey(userId: string | null) {
  return `${FAVORITE_ORDER_STORAGE_PREFIX}:${userId ?? "anonymous"}`;
}

function storagePublicUrl(bucket: string, path: string | null | undefined): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}

async function signedBattleAudioUrl(path: string | null | undefined): Promise<string | null> {
  const value = path?.trim();
  if (!value) return null;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  const { data, error } = await supabase.storage.from(BATTLE_AUDIO_BUCKET).createSignedUrl(value, 60 * 60);
  if (error) {
    console.warn("[profile] battle audio signed url failed", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

function compactStatus(status: string | null | undefined, lang: string): string {
  if (!status) return lang === "zh" ? "已建立" : "Created";
  const zh: Record<string, string> = {
    waiting: "等待中",
    matched: "已配對",
    active: "進行中",
    completed: "已完成",
    expired: "已過期",
    cancelled: "已取消",
  };
  return lang === "zh" ? (zh[status] ?? status) : status.replaceAll("_", " ");
}

function ProfileInner() {
  const { t, lang } = useI18n();
  const isZh = lang === "zh";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [fighterName, setFighterName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [fighterSaved, setFighterSaved] = useState(false);
  const [fighterBusy, setFighterBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState("");
  const [barTracks, setBarTracks] = useState<ListenBarTrack[]>([]);
  const [battleQueues, setBattleQueues] = useState<BattleQueueRow[]>([]);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [wins, setWins] = useState<BattleArchiveRow[]>([]);
  const [honorFavorites, setHonorFavorites] = useState<HonorFavoriteRecord[]>([]);
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>("all");
  const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);
  const [favoriteOrder, setFavoriteOrder] = useState<string[]>([]);
  const [favoriteOrderReadyKey, setFavoriteOrderReadyKey] = useState<string | null>(null);
  const [favoriteRemoveBusy, setFavoriteRemoveBusy] = useState<Record<string, boolean>>({});
  const cropFileInputRef = useRef<HTMLInputElement>(null);
  const avatarSectionRef = useRef<HTMLDivElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const playlistItemsRef = useRef<CreatorItem[]>([]);
  const previewTokenRef = useRef(0);
  const playPreviewItemRef = useRef<((item: CreatorItem) => void) | null>(null);

  const copy = useMemo(
    () =>
      isZh
        ? {
            kicker: "AIPOGER CREATOR",
            title: "創作者中心",
            subtitle: "管理你的舞台身份、頭像與已上傳作品。",
            identity: "舞台身份",
            avatarHelp: `${IMAGE_UPLOAD_FORMAT_LABEL}，單檔最大 2MB。請使用可公開展示的本人或品牌頭像。`,
            changeAvatar: "更換頭像",
            nameTitle: "鬥士名稱",
            nameHelp: "這個名稱會出現在 Battle、榮譽榜與公播資料。",
            adminEntry: "後台入口",
            adminHelp: "管理員可快速進入營運與內容後台。",
            creations: "我的創作資料",
            creationsHelp: "整理你上傳與收藏的 AI 音樂作品。",
            all: "全部資料",
            recent: "最近資料",
            empty: "目前還沒有讀到上傳紀錄。",
            favoriteEmpty: "目前還沒有收藏歌曲。到 Top Drops 點愛心後，作品會收進這裡。",
            error: "部分創作資料暫時讀不到，頁面先顯示可取得的內容。",
            battle: "Drop 戰帖",
            listenBar: "傷心酒吧",
            records: "對戰場次",
            wins: "勝出封存",
            favorites: "收藏歌曲",
            favorited: "已點讚收藏",
            honorFavorite: "Top Drops",
            moveUp: "上移",
            moveDown: "下移",
            removeFavorite: "刪除",
            removingFavorite: "刪除中",
            active: "公開中",
            openBattle: "發起挑戰",
            openBar: "去傷心酒吧",
          }
        : {
            kicker: "AIPOGER CREATOR",
            title: "Creator Center",
            subtitle: "Manage your stage identity, avatar, and uploaded work.",
            identity: "Stage Identity",
            avatarHelp: `${IMAGE_UPLOAD_FORMAT_LABEL}, max 2MB. Use an avatar you can show publicly.`,
            changeAvatar: "Change Avatar",
            nameTitle: "Fighter Name",
            nameHelp: "This name appears in Battles, rankings, and public play data.",
            adminEntry: "Admin Entry",
            adminHelp: "Quick access for operations and content management.",
            creations: "My Creator Data",
            creationsHelp: "Your uploaded and saved AI music records.",
            all: "All Data",
            recent: "Recent Data",
            empty: "No uploads found yet.",
            favoriteEmpty: "No saved songs yet. Heart tracks on Top Drops to collect them here.",
            error: "Some creator data could not be loaded, so this page is showing what is available.",
            battle: "Drop Cards",
            listenBar: "Listen Bar",
            records: "Battle Matches",
            wins: "Archived Wins",
            favorites: "Saved Songs",
            favorited: "saved from hearts",
            honorFavorite: "Top Drops",
            moveUp: "Move Up",
            moveDown: "Move Down",
            removeFavorite: "Remove",
            removingFavorite: "Removing",
            active: "Live",
            openBattle: "Start Battle",
            openBar: "Open Listen Bar",
          },
    [isZh],
  );

  const loadCreatorData = useCallback(
    async (uid: string, accessToken: string) => {
      setCreatorLoading(true);
      setCreatorError("");
      try {
        const tracksPromise = fetch("/api/listen-bar/my-tracks", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(async (response) => {
          if (!response.ok) throw new Error(`my-tracks ${response.status}`);
          return (await response.json()) as { tracks?: ListenBarTrack[] };
        });

        const queuesPromise = supabase
          .from("battle_queue")
          .select("id,status,created_at,scheduled_start_at,original_file_name,genre,ai_tool,audio_path,match_group_id")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(12);

        const battlesPromise = supabase
          .from("battles")
          .select("id,status,created_at,battle_ended_at,song_a_name,song_b_name,genre")
          .or(`fighter_a_user_id.eq.${uid},fighter_b_user_id.eq.${uid}`)
          .order("created_at", { ascending: false })
          .limit(12);

        const winsPromise = supabase
          .from("battle_result_archives")
          .select("id,battle_id,winner_song,winner_name,genre,created_at")
          .eq("winner_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(12);

        const favoritesPromise = fetch("/api/honor-board/interactions?favorites=me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) throw new Error(`honor-favorites ${response.status}`);
          return (await response.json()) as { records?: HonorFavoriteRecord[] };
        });

        const [tracksResult, queuesResult, battlesResult, winsResult, favoritesResult] = await Promise.allSettled([
          tracksPromise,
          queuesPromise,
          battlesPromise,
          winsPromise,
          favoritesPromise,
        ]);

        if (tracksResult.status === "fulfilled") {
          setBarTracks(Array.isArray(tracksResult.value.tracks) ? tracksResult.value.tracks : []);
        } else {
          setCreatorError(copy.error);
        }

        if (queuesResult.status === "fulfilled" && !queuesResult.value.error) {
          const queueRows = ((queuesResult.value.data ?? []) as BattleQueueRow[]);
          const queuesWithAudio = await Promise.all(
            queueRows.map(async (queue) => ({
              ...queue,
              previewAudioUrl: await signedBattleAudioUrl(queue.audio_path),
            })),
          );
          setBattleQueues(queuesWithAudio);
        } else {
          setCreatorError(copy.error);
        }

        if (battlesResult.status === "fulfilled" && !battlesResult.value.error) {
          setBattles((battlesResult.value.data ?? []) as BattleRow[]);
        } else {
          setCreatorError(copy.error);
        }

        if (winsResult.status === "fulfilled" && !winsResult.value.error) {
          setWins((winsResult.value.data ?? []) as BattleArchiveRow[]);
        }

        if (favoritesResult.status === "fulfilled") {
          setHonorFavorites(
            Array.isArray(favoritesResult.value.records)
              ? favoritesResult.value.records.filter((record) => record.myFavorited)
              : [],
          );
        } else {
          setCreatorError(copy.error);
        }
      } catch (error) {
        console.error("[profile creator data]", error);
        setCreatorError(copy.error);
      } finally {
        setCreatorLoading(false);
      }
    },
    [copy.error],
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    if (isAuthBypassEnabled) {
      setUserId(null);
      setFighterName(readFighterNameFromStorage() ?? "");
      setProfileLoading(false);
      setCreatorLoading(false);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setUserId(null);
      setProfileLoading(false);
      setCreatorLoading(false);
      return;
    }
    const uid = session.user.id;
    setUserId(uid);
    setEmail(session.user.email ?? "");

    const urlFighter = searchParams.get("fighterName")?.trim();
    const [fromProfile, admin, userProfile, fighterProfile] = await Promise.all([
      urlFighter ? Promise.resolve(urlFighter) : loadFighterNameFromProfile(uid),
      loadIsAdmin(uid),
      supabase.from("user_profiles").select("avatar_url").eq("id", uid).maybeSingle<{ avatar_url?: string | null }>(),
      supabase
        .from("fighter_profiles")
        .select("display_name, avatar_url")
        .eq("id", uid)
        .maybeSingle<{ display_name?: string | null; avatar_url?: string | null }>(),
    ]);

    const nextName = urlFighter || fromProfile || fighterProfile.data?.display_name?.trim() || "";
    setFighterName(nextName);
    if (nextName) writeFighterNameToStorage(nextName);
    setIsAdmin(admin);
    setAvatarPreview(
      (typeof fighterProfile.data?.avatar_url === "string" && fighterProfile.data.avatar_url.trim()) ||
        (typeof userProfile.data?.avatar_url === "string" && userProfile.data.avatar_url.trim()) ||
        authAvatarUrl(session.user) ||
        null,
    );
    setProfileLoading(false);
    void loadCreatorData(uid, session.access_token);
  }, [loadCreatorData, searchParams]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = favoriteOrderStorageKey(userId);
    setFavoriteOrderReadyKey(null);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setFavoriteOrder([]);
      setFavoriteOrderReadyKey(key);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setFavoriteOrder(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
    } catch {
      setFavoriteOrder([]);
    }
    setFavoriteOrderReadyKey(key);
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = favoriteOrderStorageKey(userId);
    if (favoriteOrderReadyKey !== key) return;
    window.localStorage.setItem(key, JSON.stringify(favoriteOrder));
  }, [favoriteOrder, favoriteOrderReadyKey, userId]);

  const stopPreview = useCallback(() => {
    previewTokenRef.current += 1;
    const audio = previewAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
      previewAudioRef.current = null;
    }
    setPreviewingItemId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#avatar-upload") return;
    const tmr = window.setTimeout(() => {
      avatarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(tmr);
  }, []);

  const openCropPicker = () => {
    if (isAuthBypassEnabled) {
      alert("開發模式（AUTH_BYPASS）無法上傳至 Storage。");
      return;
    }
    if (!userId) {
      alert(t("profile_need_login"));
      router.push("/auth");
      return;
    }
    cropFileInputRef.current?.click();
  };

  const onCropFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedImageUploadFile(file)) {
      alert(t("avatar_invalid_type"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      alert(t("avatar_max_2mb"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const saveFighterName = async () => {
    const name = fighterName.trim();
    if (!name) {
      alert(t("profile_fighter_empty"));
      return;
    }
    writeFighterNameToStorage(name);
    if (isAuthBypassEnabled) {
      setFighterSaved(true);
      window.setTimeout(() => setFighterSaved(false), 2000);
      return;
    }
    if (!userId) {
      alert(t("profile_need_login"));
      router.push("/auth");
      return;
    }
    setFighterBusy(true);
    setFighterSaved(false);
    try {
      try {
        await saveFighterNameToProfile(userId, name);
        const { error } = await supabase
          .from("fighter_profiles")
          .upsert({ id: userId, display_name: name }, { onConflict: "id" });
        if (error) throw error;
      } catch (error) {
        console.error(error);
        alert(t("profile_fighter_save_fail"));
        return;
      }
      setFighterSaved(true);
      window.setTimeout(() => setFighterSaved(false), 2500);
    } finally {
      setFighterBusy(false);
    }
  };

  const playPreviewItem = useCallback((item: CreatorItem) => {
    const audioUrl = item.audioUrl?.trim();
    if (!audioUrl) return;

    stopPreview();
    const token = previewTokenRef.current + 1;
    previewTokenRef.current = token;
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.onended = () => {
      if (previewTokenRef.current !== token) return;
      const playlist = playlistItemsRef.current.filter((candidate) => candidate.audioUrl?.trim());
      const index = playlist.findIndex((candidate) => candidate.id === item.id);
      const next = index >= 0 ? playlist[index + 1] : null;
      if (item.category === "favorites" && next) {
        playPreviewItemRef.current?.(next);
        return;
      }
      setPreviewingItemId(null);
    };
    audio.onerror = () => {
      if (previewTokenRef.current !== token) return;
      console.warn("[profile] preview audio failed", item.id);
      setPreviewingItemId(null);
    };
    previewAudioRef.current = audio;
    setPreviewingItemId(item.id);
    void audio.play().catch((error) => {
      console.warn("[profile] preview play blocked", error);
      if (previewTokenRef.current === token) setPreviewingItemId(null);
    });
  }, [stopPreview]);
  playPreviewItemRef.current = playPreviewItem;

  const togglePreview = useCallback((item: CreatorItem) => {
    const current = previewAudioRef.current;
    if (previewingItemId === item.id && current && !current.paused) {
      stopPreview();
      return;
    }
    playPreviewItem(item);
  }, [playPreviewItem, previewingItemId, stopPreview]);

  const openChallengeCut = useCallback((item: CreatorItem) => {
    stopPreview();
    const params = new URLSearchParams({
      flow: "upload-first",
      lang,
    });
    const title = item.title.trim();
    const genre = item.genre?.trim();
    const aiTool = item.aiTool?.trim();
    if (title) params.set("songName", title);
    if (genre) params.set("genre", genre);
    if (aiTool) params.set("aiTool", aiTool);

    const audioUrl = item.audioUrl?.trim();
    if (typeof window !== "undefined" && audioUrl) {
      window.sessionStorage.setItem(
        PROFILE_CHALLENGE_AUDIO_KEY,
        JSON.stringify({
          audioUrl,
          title,
          genre: genre ?? "",
          aiTool: aiTool ?? "",
          fileName: `${title || "aipoger-track"}.mp3`,
        }),
      );
      params.set("profileAudio", "1");
    }

    router.push(`/battle/hook-cut?${params.toString()}`);
  }, [lang, router, stopPreview]);

  const moveFavoriteItem = useCallback((itemId: string, direction: -1 | 1) => {
    setFavoriteOrder((current) => {
      const favoriteIds = honorFavorites.map((record) => `favorite-${record.recordKey}`);
      const ordered = [
        ...current.filter((id) => favoriteIds.includes(id)),
        ...favoriteIds.filter((id) => !current.includes(id)),
      ];
      const index = ordered.indexOf(itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return ordered;
      const next = [...ordered];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, [honorFavorites]);

  const removeFavoriteItem = useCallback(async (item: CreatorItem) => {
    const record = item.favoriteRecord;
    if (!record?.recordKey || !record.targetKind || !record.targetId) return;
    setFavoriteRemoveBusy((current) => ({ ...current, [item.id]: true }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return;
      }
      const response = await fetch("/api/honor-board/interactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "favorite",
          recordKey: record.recordKey,
          targetKind: record.targetKind,
          targetId: record.targetId,
          targetTitle: record.targetTitle,
          targetArtist: record.targetArtist,
          targetGenre: record.targetGenre,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { record?: HonorFavoriteRecord; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "remove favorite failed");
      if (previewingItemId === item.id) stopPreview();
      setHonorFavorites((current) => current.filter((favorite) => favorite.recordKey !== record.recordKey));
      setFavoriteOrder((current) => current.filter((id) => id !== item.id));
    } catch (error) {
      console.warn("[profile] remove favorite failed", error);
    } finally {
      setFavoriteRemoveBusy((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    }
  }, [previewingItemId, router, stopPreview]);

  const creatorItems = useMemo<CreatorItem[]>(() => {
    const tracks = barTracks.map((track) => ({
      id: `bar-${track.id}`,
      category: "listenBar" as const,
      kind: copy.listenBar,
      title: track.title?.trim() || (isZh ? "未命名歌曲" : "Untitled Song"),
      meta: [
        track.artist?.trim(),
        track.ai_tool?.trim(),
        track.genre?.trim(),
        `${track.heart_count ?? track.positive_reaction_count ?? 0} ${isZh ? "反應" : "reactions"}`,
      ]
        .filter(Boolean)
        .join(" / "),
      href: "/listen-bar",
      date: track.created_at,
      genre: track.genre,
      aiTool: track.ai_tool,
      audioUrl: storagePublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path),
    }));

    const queues = battleQueues.map((queue) => ({
      id: `queue-${queue.id}`,
      category: "battle" as const,
      kind: copy.battle,
      title: queue.original_file_name?.trim() || queue.genre?.trim() || copy.battle,
      meta: [compactStatus(queue.status, lang), queue.ai_tool?.trim(), queue.genre?.trim()].filter(Boolean).join(" / "),
      href: queue.match_group_id ? `/battle/${queue.match_group_id}` : "/battle/setup",
      date: queue.created_at ?? queue.scheduled_start_at,
      genre: queue.genre,
      aiTool: queue.ai_tool,
      audioUrl: queue.previewAudioUrl,
    }));

    const battleRecords = battles.map((battle) => ({
      id: `battle-${battle.id}`,
      category: "records" as const,
      kind: copy.records,
      title: [battle.song_a_name?.trim(), battle.song_b_name?.trim()].filter(Boolean).join(" vs ") || copy.records,
      meta: [compactStatus(battle.status, lang), battle.genre?.trim()].filter(Boolean).join(" / "),
      href: `/battle/${battle.id}`,
      date: battle.battle_ended_at ?? battle.created_at,
    }));

    const archivedWins = wins.map((win) => ({
      id: `win-${win.id}`,
      category: "wins" as const,
      kind: copy.wins,
      title: win.winner_song?.trim() || win.winner_name?.trim() || copy.wins,
      meta: win.genre?.trim() || copy.battle,
      href: win.battle_id ? `/battle/results?battleId=${win.battle_id}` : "/rank",
      date: win.created_at,
    }));

    const favorites = honorFavorites.map((record) => {
      const kind =
        record.targetKind === "bar"
          ? isZh
            ? "傷心酒吧熱播"
            : "Bar Heartbreak"
          : isZh
            ? "Drop 勝利作品"
            : "Drop Winner";
      const isOwnBarTrack = record.targetKind === "bar" && Boolean(userId && record.targetOwnerId === userId);
      const isHonorBoardFavorite = record.targetKind === "battle";
      const href = isOwnBarTrack ? "/listen-bar" : isHonorBoardFavorite ? (lang === "en" ? "/rank?lang=en" : "/rank?lang=zh") : "";
      return {
        id: `favorite-${record.recordKey}`,
        category: "favorites" as const,
        kind: copy.honorFavorite,
        title: record.targetTitle?.trim() || (isZh ? "收藏的 Top Drops 作品" : "Saved Top Drops Track"),
        meta: [
          kind,
          record.targetGenre?.trim(),
          `${Math.max(0, Math.round(Number(record.favoriteCount) || 0))} ${isZh ? "愛心" : "hearts"}`,
        ]
          .filter(Boolean)
          .join(" / "),
        href,
        canNavigate: Boolean(href),
        date: record.updatedAt,
        genre: record.targetGenre,
        audioUrl: record.audioUrl,
        favoriteRecord: record,
      };
    });

    const orderedFavoriteIds = [
      ...favoriteOrder.filter((id) => favorites.some((favorite) => favorite.id === id)),
      ...favorites.map((favorite) => favorite.id).filter((id) => !favoriteOrder.includes(id)),
    ];
    const favoriteRank = new Map(orderedFavoriteIds.map((id, index) => [id, index]));
    const orderedFavorites = [...favorites].sort((a, b) => (favoriteRank.get(a.id) ?? 9999) - (favoriteRank.get(b.id) ?? 9999));

    return [...tracks, ...queues, ...battleRecords, ...archivedWins, ...orderedFavorites]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }, [
    barTracks,
    battleQueues,
    battles,
    copy.battle,
    copy.honorFavorite,
    copy.listenBar,
    copy.records,
    copy.wins,
    favoriteOrder,
    honorFavorites,
    isZh,
    lang,
    userId,
    wins,
  ]);

  const stats = [
    { key: "listenBar" as const, label: copy.listenBar, value: barTracks.length, sub: `${barTracks.filter((track) => track.is_active).length} ${copy.active}` },
    { key: "battle" as const, label: copy.battle, value: battleQueues.length, sub: isZh ? "已上傳戰帖" : "uploaded cards" },
    { key: "records" as const, label: copy.records, value: battles.length, sub: isZh ? "已進場對戰" : "entered matches" },
    { key: "wins" as const, label: copy.wins, value: wins.length, sub: isZh ? "勝利作品" : "winning tracks" },
    { key: "favorites" as const, label: copy.favorites, value: honorFavorites.length, sub: copy.favorited },
  ];

  const filteredCreatorItems = (
    creatorFilter === "favorites"
      ? [...creatorItems]
          .filter((item) => item.category === "favorites")
          .sort((a, b) => {
            const aIndex = favoriteOrder.indexOf(a.id);
            const bIndex = favoriteOrder.indexOf(b.id);
            return (aIndex < 0 ? 9999 : aIndex) - (bIndex < 0 ? 9999 : bIndex);
          })
      : creatorFilter === "all"
        ? creatorItems
        : creatorItems.filter((item) => item.category === creatorFilter)
  ).slice(0, 16);

  useEffect(() => {
    playlistItemsRef.current = filteredCreatorItems;
  }, [filteredCreatorItems]);

  const creatorListTitle = creatorFilter === "all"
    ? copy.recent
    : stats.find((stat) => stat.key === creatorFilter)?.label ?? copy.recent;
  const creatorEmptyText = creatorFilter === "favorites" ? copy.favoriteEmpty : copy.empty;

  return (
    <div className="aipo-stage-bg min-h-screen px-4 py-10 text-white">
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6">
        <header className="max-w-3xl">
          <p className="aipo-section-kicker">{copy.kicker}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-orange-100 sm:text-5xl">{copy.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">{copy.subtitle}</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section ref={avatarSectionRef} id="avatar-upload" className="aipo-control-panel rounded-[1.35rem] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-zinc-50">{copy.identity}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{copy.avatarHelp}</p>
              </div>
              {isAdmin && (
                <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">
                  管理員
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <button type="button" onClick={openCropPicker} className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-full border-2 border-orange-200/35 bg-black/45 shadow-[0_0_38px_rgba(255,106,0,0.12)] transition hover:border-orange-300">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-5xl font-black text-orange-100">
                    {(fighterName || email || "A").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="absolute bottom-2 right-2 rounded-full border border-orange-200/45 bg-orange-500 px-3 py-1 text-[11px] font-black text-black shadow-lg">
                  {copy.changeAvatar}
                </span>
              </button>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">{copy.nameTitle}</p>
                  <p className="mt-1 truncate text-2xl font-black text-orange-100">
                    {profileLoading ? t("common_loading") : fighterName || (isZh ? "尚未設定" : "Not Set")}
                  </p>
                  {email && <p className="mt-1 truncate text-xs text-zinc-500">{email}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/battle/setup" className="aipo-primary-button rounded-2xl px-4 py-2 text-sm font-black">
                    {copy.openBattle}
                  </Link>
                  <Link href="/listen-bar" className="aipo-ghost-button rounded-2xl px-4 py-2 text-sm font-black text-orange-100">
                    {copy.openBar}
                  </Link>
                </div>
              </div>
            </div>

            <input ref={cropFileInputRef} type="file" accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={onCropFileChange} />

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/28 p-4">
              <label className="text-sm font-semibold text-zinc-300">{copy.nameTitle}</label>
              <p className="mt-1 text-xs text-zinc-500">{copy.nameHelp}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={fighterName}
                  onChange={(e) => {
                    setFighterName(e.target.value);
                    setFighterSaved(false);
                  }}
                  maxLength={30}
                  placeholder={t("fighter_name")}
                  className="aipo-input min-w-0 flex-1 rounded-2xl px-4 py-3 text-base transition"
                />
                <button
                  type="button"
                  disabled={fighterBusy}
                  onClick={() => void saveFighterName()}
                  className="aipo-primary-button rounded-2xl px-5 py-3 text-sm font-black transition disabled:opacity-50"
                >
                  {fighterBusy ? t("common_loading") : t("profile_save_fighter")}
                </button>
              </div>
              {fighterSaved && <p className="mt-2 text-xs text-green-400">{t("profile_fighter_saved")}</p>}
            </div>

            {isAdmin && (
              <div className="mt-5 rounded-2xl border border-amber-300/18 bg-amber-300/[0.05] p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-amber-100">{copy.adminEntry}</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{copy.adminHelp}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link className="rounded-xl border border-yellow-300/20 bg-yellow-300/[0.08] px-3 py-2 text-sm font-bold text-yellow-100 transition hover:border-yellow-300/50" href="/admin/analytics">
                    Analytics
                  </Link>
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-orange-300/50" href="/admin/listen-bar">
                    傷心酒吧
                  </Link>
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-orange-300/50" href="/admin/battles">
                    Battle
                  </Link>
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-orange-300/50" href="/admin/social">
                    社群
                  </Link>
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-orange-300/50" href="/admin/quiz">
                    Quiz
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="aipo-control-panel rounded-[1.35rem] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-zinc-50">{copy.creations}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{copy.creationsHelp}</p>
              </div>
              {creatorLoading && <span className="text-xs font-bold text-orange-200">{t("common_loading")}</span>}
            </div>

            {creatorError && <p className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-xs text-orange-100">{creatorError}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreatorFilter("all")}
                className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                  creatorFilter === "all"
                    ? "border-orange-300 bg-orange-400/18 text-orange-100 shadow-[0_0_20px_rgba(255,106,0,0.16)]"
                    : "border-white/10 bg-black/25 text-zinc-400 hover:border-orange-300/45 hover:text-orange-100"
                }`}
              >
                {copy.all}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setCreatorFilter(stat.key)}
                  className={`group rounded-2xl border p-4 text-left transition ${
                    creatorFilter === stat.key
                      ? "border-orange-300/65 bg-orange-400/[0.12] shadow-[0_0_30px_rgba(255,106,0,0.12)]"
                      : "border-white/10 bg-black/30 hover:border-orange-300/45 hover:bg-orange-300/[0.06]"
                  }`}
                >
                  <p className="text-3xl font-black tabular-nums text-orange-100">{stat.value}</p>
                  <p className="mt-1 text-sm font-black text-zinc-100">{stat.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{stat.sub}</p>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-zinc-50">{creatorListTitle}</h3>
              </div>
              {filteredCreatorItems.length > 0 ? (
                <div className="space-y-2">
                  {filteredCreatorItems.map((item, index) => {
                    const dateParts = formatDateParts(item.date, lang);
                    const showFavoriteControls = creatorFilter === "favorites" && item.category === "favorites";
                    const titleContent = (
                      <>
                        <span className="aipo-marquee block overflow-hidden text-base font-black text-zinc-50">
                          <span className="aipo-marquee-track">
                            <span className="pr-8">{item.title}</span>
                            <span className="pr-8" aria-hidden="true">{item.title}</span>
                          </span>
                        </span>
                        <span className="aipo-marquee block overflow-hidden text-xs text-zinc-500">
                          <span className="aipo-marquee-track">
                            <span className="pr-8">{item.meta}</span>
                            <span className="pr-8" aria-hidden="true">{item.meta}</span>
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <article
                        key={item.id}
                        className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-orange-300/45 hover:bg-orange-300/[0.06] sm:grid-cols-[2.5rem_4.5rem_minmax(0,1fr)_auto] sm:items-center"
                      >
                        {item.audioUrl ? (
                          <button
                            type="button"
                            onClick={() => togglePreview(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/[0.08] text-sm font-black text-cyan-100 transition hover:border-cyan-100 hover:bg-cyan-300/15"
                            aria-label={previewingItemId === item.id ? (isZh ? "暫停預覽" : "Pause preview") : (isZh ? "預覽歌曲" : "Preview track")}
                          >
                            {previewingItemId === item.id ? "Ⅱ" : "▶"}
                          </button>
                        ) : (
                          <span className="h-10 w-10" aria-hidden="true" />
                        )}
                        <span className="hidden text-[11px] font-black uppercase leading-4 tracking-[0.2em] text-cyan-100/80 sm:block">
                          {item.kind === copy.honorFavorite ? (
                            <>
                              <span className="block">TOP</span>
                              <span className="block">DROPS</span>
                            </>
                          ) : (
                            item.kind
                          )}
                        </span>
                        {item.canNavigate === false || !item.href ? (
                          <span className="min-w-0 rounded-xl">{titleContent}</span>
                        ) : (
                          <Link href={item.href} className="min-w-0 rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-orange-300/70">
                            {titleContent}
                          </Link>
                        )}
                        <span className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                          <span className="min-w-12 text-right text-xs leading-4 tabular-nums text-zinc-500">
                            <span className="block">{dateParts.date}</span>
                            <span className="block">{dateParts.time}</span>
                          </span>
                          {showFavoriteControls ? (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveFavoriteItem(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={copy.moveUp}
                                title={copy.moveUp}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={index === filteredCreatorItems.length - 1}
                                onClick={() => moveFavoriteItem(item.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={copy.moveDown}
                                title={copy.moveDown}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                disabled={favoriteRemoveBusy[item.id]}
                                onClick={() => void removeFavoriteItem(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-red-300/20 bg-red-500/10 text-sm font-black text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={favoriteRemoveBusy[item.id] ? copy.removingFavorite : copy.removeFavorite}
                                title={favoriteRemoveBusy[item.id] ? copy.removingFavorite : copy.removeFavorite}
                              >
                                ×
                              </button>
                            </span>
                          ) : item.audioUrl && item.category !== "favorites" ? (
                            <button
                              type="button"
                              onClick={() => openChallengeCut(item)}
                              className="rounded-full border border-orange-300/35 bg-orange-400/10 px-3 py-1.5 text-xs font-black text-orange-100 transition hover:border-orange-200 hover:bg-orange-400/18"
                            >
                              {isZh ? "挑戰" : "Challenge"}
                            </button>
                          ) : null}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-6 text-sm text-zinc-500">
                  {creatorLoading ? t("common_loading") : creatorEmptyText}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {userId ? (
        <AvatarCropUploadModal
          open={cropModalOpen}
          imageDataUrl={cropImageSrc}
          userId={userId}
          onClose={() => {
            setCropModalOpen(false);
            setCropImageSrc(null);
          }}
          onUploaded={(url) => {
            setAvatarPreview(url);
            alert(t("avatar_crop_success"));
          }}
        />
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-orange-400">
          {t("common_loading")}
        </div>
      }
    >
      <ProfileInner />
    </Suspense>
  );
}
