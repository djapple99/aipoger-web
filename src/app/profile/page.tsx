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

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type ListenBarTrack = {
  id: string;
  title?: string | null;
  artist?: string | null;
  ai_tool?: string | null;
  genre?: string | null;
  bar_phase?: string | null;
  is_active?: boolean | null;
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
  date?: string | null;
  favoriteRecord?: HonorFavoriteRecord;
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

function formatDate(value: string | null | undefined, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  const [favoriteRemoveBusy, setFavoriteRemoveBusy] = useState<Record<string, boolean>>({});
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>("all");
  const cropFileInputRef = useRef<HTMLInputElement>(null);
  const avatarSectionRef = useRef<HTMLDivElement>(null);

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
            manage: "整理資料",
            empty: "目前還沒有讀到上傳紀錄。",
            favoriteEmpty: "目前還沒有收藏歌曲。到 Top Drops 點愛心後，作品會收進這裡。",
            error: "部分創作資料暫時讀不到，頁面先顯示可取得的內容。",
            battle: "Drop 戰帖",
            listenBar: "傷心酒吧",
            records: "對戰場次",
            wins: "勝出封存",
            favorites: "收藏歌曲",
            favorited: "已點讚收藏",
            honorFavorite: "Top Drops 收藏",
            removeFavorite: "取消收藏",
            removingFavorite: "取消中",
            removeFavoriteFailed: "取消收藏失敗，請稍後再試。",
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
            manage: "Manage",
            empty: "No uploads found yet.",
            favoriteEmpty: "No saved songs yet. Heart tracks on Top Drops to collect them here.",
            error: "Some creator data could not be loaded, so this page is showing what is available.",
            battle: "Drop Cards",
            listenBar: "Listen Bar",
            records: "Battle Matches",
            wins: "Archived Wins",
            favorites: "Saved Songs",
            favorited: "saved from hearts",
            honorFavorite: "Top Drops Save",
            removeFavorite: "Unsave",
            removingFavorite: "Removing",
            removeFavoriteFailed: "Could not remove this save. Try again later.",
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
          .select("id,status,created_at,scheduled_start_at,original_file_name,genre,match_group_id")
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
          setBattleQueues((queuesResult.value.data ?? []) as BattleQueueRow[]);
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

  const removeFavorite = useCallback(
    async (record: HonorFavoriteRecord) => {
      const recordKey = record.recordKey.trim();
      const targetKind = record.targetKind;
      const targetId = record.targetId?.trim();
      if (!recordKey || !targetKind || !targetId) {
        setCreatorError(copy.removeFavoriteFailed);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert(t("profile_need_login"));
        router.push("/auth");
        return;
      }

      setCreatorError("");
      setFavoriteRemoveBusy((current) => ({ ...current, [recordKey]: true }));
      try {
        const response = await fetch("/api/honor-board/interactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "favorite",
            recordKey,
            targetKind,
            targetId,
            targetTitle: record.targetTitle,
            targetArtist: record.targetArtist,
            targetGenre: record.targetGenre,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          record?: HonorFavoriteRecord;
          error?: string;
        } | null;
        if (!response.ok || !payload?.record) {
          setCreatorError(payload?.error || copy.removeFavoriteFailed);
          return;
        }

        setHonorFavorites((current) => {
          if (!payload.record?.myFavorited) {
            return current.filter((item) => item.recordKey !== recordKey);
          }
          return current.map((item) => (item.recordKey === recordKey ? payload.record as HonorFavoriteRecord : item));
        });
      } catch (error) {
        console.error("[profile remove favorite]", error);
        setCreatorError(copy.removeFavoriteFailed);
      } finally {
        setFavoriteRemoveBusy((current) => {
          const next = { ...current };
          delete next[recordKey];
          return next;
        });
      }
    },
    [copy.removeFavoriteFailed, router, t],
  );

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
    }));

    const queues = battleQueues.map((queue) => ({
      id: `queue-${queue.id}`,
      category: "battle" as const,
      kind: copy.battle,
      title: queue.original_file_name?.trim() || queue.genre?.trim() || copy.battle,
      meta: [compactStatus(queue.status, lang), queue.genre?.trim()].filter(Boolean).join(" / "),
      href: queue.match_group_id ? `/battle/${queue.match_group_id}` : "/battle/setup",
      date: queue.created_at ?? queue.scheduled_start_at,
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
      return {
        id: `favorite-${record.recordKey}`,
        category: "favorites" as const,
        kind: copy.honorFavorite,
        title: record.targetTitle?.trim() || (isZh ? "收藏的 Top Drops 作品" : "Saved Top Drops Track"),
        meta: [
          kind,
          record.targetGenre?.trim(),
          `${Math.max(0, Math.round(Number(record.favoriteCount) || 0))} ${isZh ? "收藏" : "saves"}`,
        ]
          .filter(Boolean)
          .join(" / "),
        href: lang === "en" ? "/rank?lang=en" : "/rank?lang=zh",
        date: record.updatedAt,
        favoriteRecord: record,
      };
    });

    return [...tracks, ...queues, ...battleRecords, ...archivedWins, ...favorites]
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
    honorFavorites,
    isZh,
    lang,
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
    creatorFilter === "all"
      ? creatorItems
      : creatorItems.filter((item) => item.category === creatorFilter)
  ).slice(0, 16);

  const creatorListTitle = creatorFilter === "all"
    ? copy.recent
    : `${stats.find((stat) => stat.key === creatorFilter)?.label ?? copy.recent} / ${copy.manage}`;
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
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/70 group-hover:text-cyan-100">
                    {copy.manage}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-zinc-50">{creatorListTitle}</h3>
              </div>
              {filteredCreatorItems.length > 0 ? (
                <div className="space-y-2">
                  {filteredCreatorItems.map((item) => {
                    if (item.category === "favorites" && item.favoriteRecord) {
                      const removeBusy = Boolean(favoriteRemoveBusy[item.favoriteRecord.recordKey]);
                      return (
                        <div
                          key={item.id}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-orange-300/45 hover:bg-orange-300/[0.06] sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <Link
                            href={item.href}
                            className="grid min-w-0 gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-center"
                          >
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/80">{item.kind}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-base font-black text-zinc-50">{item.title}</span>
                              <span className="block truncate text-xs text-zinc-500">{item.meta}</span>
                            </span>
                            <span className="text-xs text-zinc-500">{formatDate(item.date, lang)}</span>
                          </Link>
                          <button
                            type="button"
                            disabled={removeBusy}
                            onClick={() => void removeFavorite(item.favoriteRecord as HonorFavoriteRecord)}
                            className="justify-self-start rounded-full border border-red-200/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 transition hover:border-red-200/55 hover:bg-red-500/18 disabled:cursor-wait disabled:opacity-55 sm:justify-self-end"
                            aria-label={`${copy.removeFavorite} ${item.title}`}
                            title={copy.removeFavorite}
                          >
                            {removeBusy ? copy.removingFavorite : copy.removeFavorite}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-orange-300/45 hover:bg-orange-300/[0.06] sm:grid-cols-[8rem_1fr_auto] sm:items-center"
                      >
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/80">{item.kind}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-base font-black text-zinc-50">{item.title}</span>
                          <span className="block truncate text-xs text-zinc-500">{item.meta}</span>
                        </span>
                        <span className="text-xs text-zinc-500">{formatDate(item.date, lang)}</span>
                      </Link>
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
