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
import { DEFAULT_LISTEN_BAR_COVER, LISTEN_BAR_AUDIO_BUCKET, LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { choicePublicPath, type AipogerChoiceCollection } from "@/lib/aipoger-choice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  aiMusicChallengeStatusLabel,
  hasPreparedAiMusicDefenderDrop,
  normalizeAiMusicChallengeStatus,
  type AiMusicChallengeStatus,
} from "@/lib/ai-music-challenge-rules";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const BATTLE_AUDIO_BUCKET = "battle-audio";
const PROFILE_CHALLENGE_AUDIO_KEY = "aipoger:profile-challenge-audio";
const FAVORITE_ORDER_STORAGE_PREFIX = "aipoger:profile-favorite-order";
const CREATOR_ITEMS_PER_PAGE = 10;
const MAX_SHOWTIME_COVER_BYTES = 10 * 1024 * 1024;

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
  ai_music_challenge_status?: string | null;
  ai_music_challenge_updated_at?: string | null;
  ai_music_defender_drop_audio_path?: string | null;
  ai_music_defender_drop_audio_sha256?: string | null;
  ai_music_defender_drop_original_name?: string | null;
  ai_music_defender_drop_duration_seconds?: number | null;
  ai_music_defender_drop_lyrics?: string | null;
  ai_music_defender_drop_prepared_at?: string | null;
};

type ShowtimeTrack = {
  id: string;
  title?: string | null;
  artist?: string | null;
  ai_tool?: string | null;
  genre?: string | null;
  mood?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  lyrics?: string | null;
  duration_seconds?: number | null;
  audio_path?: string | null;
  cover_path?: string | null;
  heart_count?: number | null;
  positive_reaction_count?: number | null;
  created_at?: string | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_certification_source?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
  support_url?: string | null;
  support_url_label?: string | null;
  support_url_status?: string | null;
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

type SavedChoiceCollection = AipogerChoiceCollection & {
  kind: "official" | "creator";
  savedAt: string;
};

type AiMusicChallengeInvite = {
  id: string;
  defender_track_id: string;
  defender_user_id: string;
  challenger_user_id: string;
  defender_queue_id?: string | null;
  challenger_queue_id?: string | null;
  battle_id?: string | null;
  status: string;
  scheduled_start_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  defender_name?: string | null;
  defender_song_name?: string | null;
  defender_audio_path?: string | null;
  defenderPreviewUrl?: string | null;
  challenger_name?: string | null;
  challenger_song_name?: string | null;
  challenger_audio_path?: string | null;
  challengerPreviewUrl?: string | null;
  listen_bar_tracks?: {
    title?: string | null;
    artist?: string | null;
    genre?: string | null;
    ai_tool?: string | null;
  } | null;
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
  trackId?: string | null;
  challengeStatus?: AiMusicChallengeStatus;
  hasDefenderDrop?: boolean;
  pendingChallengeInvite?: AiMusicChallengeInvite | null;
  showtimeTrack?: ShowtimeTrack | null;
};

type CreatorFilter = "all" | "listenBar" | "showtime" | "battle" | "records" | "wins" | "favorites";

type ShowtimeEditForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  album: string;
  description: string;
  youtubeUrl: string;
  lyrics: string;
  supportUrl: string;
  supportLabel: string;
};

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

function formatDateTime(value: string | null | undefined, lang: string): string {
  if (!value) return lang === "zh" ? "尚未設定" : "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === "zh" ? "尚未設定" : "Not set";
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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
  const [showtimeTracks, setShowtimeTracks] = useState<ShowtimeTrack[]>([]);
  const [battleQueues, setBattleQueues] = useState<BattleQueueRow[]>([]);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [wins, setWins] = useState<BattleArchiveRow[]>([]);
  const [honorFavorites, setHonorFavorites] = useState<HonorFavoriteRecord[]>([]);
  const [savedChoices, setSavedChoices] = useState<SavedChoiceCollection[]>([]);
  const [aiMusicInvites, setAiMusicInvites] = useState<AiMusicChallengeInvite[]>([]);
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>("all");
  const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);
  const [selectedMarqueeItemId, setSelectedMarqueeItemId] = useState<string | null>(null);
  const [favoriteOrder, setFavoriteOrder] = useState<string[]>([]);
  const [favoriteOrderReadyKey, setFavoriteOrderReadyKey] = useState<string | null>(null);
  const [favoriteRemoveBusy, setFavoriteRemoveBusy] = useState<Record<string, boolean>>({});
  const [favoriteSelectionMode, setFavoriteSelectionMode] = useState(false);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<string[]>([]);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [creatorPage, setCreatorPage] = useState(1);
  const [listenBarSelectionMode, setListenBarSelectionMode] = useState(false);
  const [selectedListenBarItemIds, setSelectedListenBarItemIds] = useState<string[]>([]);
  const [bulkListenBarBusy, setBulkListenBarBusy] = useState(false);
  const [showtimeBusy, setShowtimeBusy] = useState<Record<string, boolean>>({});
  const [editingShowtimeTrackId, setEditingShowtimeTrackId] = useState<string | null>(null);
  const [showtimeCoverFile, setShowtimeCoverFile] = useState<File | null>(null);
  const [showtimeCoverPreview, setShowtimeCoverPreview] = useState<string | null>(null);
  const [showtimeEditForm, setShowtimeEditForm] = useState<ShowtimeEditForm>({
    title: "",
    artist: "",
    aiTool: "",
    genre: "Original 自我風格",
    album: "",
    description: "",
    youtubeUrl: "",
    lyrics: "",
    supportUrl: "",
    supportLabel: "",
  });
  const [challengeBusy, setChallengeBusy] = useState<Record<string, boolean>>({});
  const cropFileInputRef = useRef<HTMLInputElement>(null);
  const avatarSectionRef = useRef<HTMLDivElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fiveSecondPreviewTimerRef = useRef<number | null>(null);
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
            nameHelp: "這個名稱會出現在 Battle、Showtime 與公播資料。",
            adminEntry: "後台入口",
            adminHelp: "管理員可快速進入營運與內容後台。",
            creations: "我的創作資料",
            creationsHelp: "整理你上傳與收藏的 AI 音樂作品。",
            all: "全部資料",
            recent: "最近資料",
            empty: "目前還沒有讀到上傳紀錄。",
            favoriteEmpty: "目前還沒有收藏歌曲。到 Showtime 點愛心後，作品會收進這裡。",
            savedChoiceTitle: "收藏的 Choice",
            savedChoiceEmpty: "目前還沒有收藏 Choice 歌單。到 Choice 點愛心後，歌單會收進這裡。",
            removeSavedChoice: "取消收藏",
            error: "部分創作資料暫時讀不到，頁面先顯示可取得的內容。",
            battle: "Drop 戰帖",
            listenBar: "傷心酒吧",
            showtime: "Showtime 展示",
            records: "對戰場次",
            wins: "勝出封存",
            favorites: "收藏歌曲",
            favorited: "已點讚收藏",
            honorFavorite: "Showtime",
            moveUp: "上移",
            moveDown: "下移",
            manageFavorites: "批次管理",
            finishManageFavorites: "完成",
            selectVisibleFavorites: "全選本頁",
            clearFavoriteSelection: "取消選取",
            removeSelectedFavorites: "刪除選取",
            selectedFavoritesPrefix: "已選",
            selectedFavoritesSuffix: "首",
            favoriteBatchHelp: "選取多首後可一次刪除收藏。",
            favoriteBatchRemoveFailed: "部分收藏刪除失敗，請稍後再試。",
            favoriteSelected: "已選取",
            favoriteTapToSelect: "點擊選取",
            manageSongs: "批次管理",
            finishManageSongs: "完成",
            selectVisibleSongs: "全選本頁",
            clearSongSelection: "取消選取",
            removeSelectedSongs: "撤下選取",
            selectedSongsPrefix: "已選",
            selectedSongsSuffix: "首",
            songBatchHelp: "選取多首自己的傷心酒吧歌曲，可一次撤下前台公播與挑戰池。",
            songBatchRemoveFailed: "部分歌曲撤下失敗，請稍後再試。",
            songSelected: "已選取",
            songTapToSelect: "點擊選取",
            songBatchConfirm: "確定撤下已選取的歌曲？撤下後會離開前台公播/挑戰池。",
            showtimeEdit: "編輯展示",
            showtimeSave: "儲存 Showtime",
            showtimeCancel: "取消",
            showtimeHide: "隱藏展示",
            showtimeHidden: "已隱藏公開展示",
            showtimeSupportPending: "支持連結待審核，審核通過才會出現在前台。",
            showtimeSupportApproved: "支持連結已核准",
            showtimeHideConfirm: "確定隱藏這首 Showtime 作品的公開展示？不會刪除底層音檔、戰績、收藏或認可紀錄。",
            showtimeSaveFailed: "Showtime 展示資料儲存失敗，請稍後再試。",
            previousPage: "上一頁",
            nextPage: "下一頁",
            perPageHint: "每頁 10 首",
            removeFavorite: "刪除",
            removingFavorite: "刪除中",
            active: "公開中",
            openBattle: "發起挑戰",
            openBar: "去傷心酒吧",
            defenderDropReady: "守擂 Drop 已準備",
            defenderDropMissing: "尚未準備守擂 Drop",
            prepareDefenderDrop: "指定守擂 Drop",
            replaceDefenderDrop: "更換守擂 Drop",
            defenderDropLocked: "待回覆邀請中",
            openNeedsDefenderDrop: "請先指定守擂 60s Drop，才能開放等人挑戰。",
            pendingChallenges: "待接戰",
            pendingChallengesHelp: "有人攻擂你的作品時會出現在這裡。回覆前守擂 Drop 已鎖定，不能更換。",
            pendingChallengesEmpty: "目前沒有待回覆攻擂邀請。",
            pendingChallengeKicker: "有人挑戰",
            challenger: "挑戰者",
            genreLabel: "類型",
            scheduledStart: "預定開打",
            defenderPreview: "聽守擂 5 秒",
            challengerPreview: "聽挑戰 5 秒",
            previewingFiveSeconds: "預播中",
            openBattleRoom: "進 Battle 場",
          }
        : {
            kicker: "AIPOGER CREATOR",
            title: "Creator Center",
            subtitle: "Manage your stage identity, avatar, and uploaded work.",
            identity: "Stage Identity",
            avatarHelp: `${IMAGE_UPLOAD_FORMAT_LABEL}, max 2MB. Use an avatar you can show publicly.`,
            changeAvatar: "Change Avatar",
            nameTitle: "Fighter Name",
            nameHelp: "This name appears in Battles, Showtime, and public play data.",
            adminEntry: "Admin Entry",
            adminHelp: "Quick access for operations and content management.",
            creations: "My Creator Data",
            creationsHelp: "Your uploaded and saved AI music records.",
            all: "All Data",
            recent: "Recent Data",
            empty: "No uploads found yet.",
            favoriteEmpty: "No saved songs yet. Heart tracks on Showtime to collect them here.",
            savedChoiceTitle: "Saved Choices",
            savedChoiceEmpty: "No saved Choice playlists yet. Heart a Choice playlist to collect it here.",
            removeSavedChoice: "Remove save",
            error: "Some creator data could not be loaded, so this page is showing what is available.",
            battle: "Drop Cards",
            listenBar: "Listen Bar",
            showtime: "Showtime Display",
            records: "Battle Matches",
            wins: "Archived Wins",
            favorites: "Saved Songs",
            favorited: "saved from hearts",
            honorFavorite: "Showtime",
            moveUp: "Move Up",
            moveDown: "Move Down",
            manageFavorites: "Manage",
            finishManageFavorites: "Done",
            selectVisibleFavorites: "Select Page",
            clearFavoriteSelection: "Clear",
            removeSelectedFavorites: "Remove Selected",
            selectedFavoritesPrefix: "Selected",
            selectedFavoritesSuffix: "songs",
            favoriteBatchHelp: "Select multiple saved songs and remove them at once.",
            favoriteBatchRemoveFailed: "Some saved songs could not be removed. Please try again.",
            favoriteSelected: "Selected",
            favoriteTapToSelect: "Tap to select",
            manageSongs: "Manage",
            finishManageSongs: "Done",
            selectVisibleSongs: "Select Page",
            clearSongSelection: "Clear",
            removeSelectedSongs: "Remove Selected",
            selectedSongsPrefix: "Selected",
            selectedSongsSuffix: "songs",
            songBatchHelp: "Select your Bar Heartbreak songs and remove them from public/battle surfaces at once.",
            songBatchRemoveFailed: "Some songs could not be removed. Please try again.",
            songSelected: "Selected",
            songTapToSelect: "Tap to select",
            songBatchConfirm: "Remove the selected songs from public/battle surfaces?",
            showtimeEdit: "Edit Display",
            showtimeSave: "Save Showtime",
            showtimeCancel: "Cancel",
            showtimeHide: "Hide Display",
            showtimeHidden: "Public display hidden",
            showtimeSupportPending: "Support link pending review. It appears publicly only after approval.",
            showtimeSupportApproved: "Support link approved",
            showtimeHideConfirm: "Hide this Showtime work from public display? Audio, records, favorites, and recognition history stay intact.",
            showtimeSaveFailed: "Could not save Showtime display data. Please try again.",
            previousPage: "Previous",
            nextPage: "Next",
            perPageHint: "10 per page",
            removeFavorite: "Remove",
            removingFavorite: "Removing",
            active: "Live",
            openBattle: "Start Battle",
            openBar: "Open Listen Bar",
            defenderDropReady: "Defender Drop ready",
            defenderDropMissing: "Defender Drop missing",
            prepareDefenderDrop: "Set Defender Drop",
            replaceDefenderDrop: "Replace Defender Drop",
            defenderDropLocked: "Invite pending",
            openNeedsDefenderDrop: "Set a defender 60s Drop before opening challenges.",
            pendingChallenges: "Pending Challenges",
            pendingChallengesHelp: "Incoming attacks appear here. The defender Drop is locked until you respond.",
            pendingChallengesEmpty: "No pending challenge invites.",
            pendingChallengeKicker: "Incoming Attack",
            challenger: "Challenger",
            genreLabel: "Genre",
            scheduledStart: "Scheduled Start",
            defenderPreview: "Defender 5s",
            challengerPreview: "Challenger 5s",
            previewingFiveSeconds: "Previewing",
            openBattleRoom: "Open Arena",
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

        const showtimeTracksPromise = fetch("/api/showtime/my-tracks", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) throw new Error(`showtime-my-tracks ${response.status}`);
          return (await response.json()) as { tracks?: ShowtimeTrack[]; schemaReady?: boolean };
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

        const challengeInvitesPromise = fetch("/api/ai-music/challenges", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) throw new Error(`ai-music-challenges ${response.status}`);
          return (await response.json()) as { incoming?: AiMusicChallengeInvite[]; outgoing?: AiMusicChallengeInvite[] };
        });

        const savedChoicesPromise = fetch("/api/choice/saved", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) throw new Error(`saved-choices ${response.status}`);
          return (await response.json()) as { collections?: SavedChoiceCollection[] };
        });

        const [tracksResult, showtimeTracksResult, queuesResult, battlesResult, winsResult, favoritesResult, challengeInvitesResult, savedChoicesResult] = await Promise.allSettled([
          tracksPromise,
          showtimeTracksPromise,
          queuesPromise,
          battlesPromise,
          winsPromise,
          favoritesPromise,
          challengeInvitesPromise,
          savedChoicesPromise,
        ]);

        if (tracksResult.status === "fulfilled") {
          setBarTracks(Array.isArray(tracksResult.value.tracks) ? tracksResult.value.tracks : []);
        } else {
          setCreatorError(copy.error);
        }

        if (showtimeTracksResult.status === "fulfilled") {
          setShowtimeTracks(Array.isArray(showtimeTracksResult.value.tracks) ? showtimeTracksResult.value.tracks : []);
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

        if (challengeInvitesResult.status === "fulfilled") {
          const incomingInvites = Array.isArray(challengeInvitesResult.value.incoming) ? challengeInvitesResult.value.incoming : [];
          const invitesWithPreviewUrls = await Promise.all(
            incomingInvites.map(async (invite) => ({
              ...invite,
              defenderPreviewUrl: await signedBattleAudioUrl(invite.defender_audio_path),
              challengerPreviewUrl: await signedBattleAudioUrl(invite.challenger_audio_path),
            })),
          );
          setAiMusicInvites(invitesWithPreviewUrls);
          void supabase
            .from("battle_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", uid)
            .eq("type", "ai_music_challenge_invite")
            .is("read_at", null)
            .then(() => {
              window.dispatchEvent(new CustomEvent("aipoger:account-notices-read"));
          });
        }

        if (savedChoicesResult.status === "fulfilled") {
          setSavedChoices(Array.isArray(savedChoicesResult.value.collections) ? savedChoicesResult.value.collections : []);
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
      setCreatorLoading(false);
      const nextPath = `/profile?lang=${lang}`;
      rememberAuthNextPath(nextPath);
      router.replace(`/auth?next=${encodeURIComponent(nextPath)}`);
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
  }, [lang, loadCreatorData, router, searchParams]);

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

  useEffect(() => {
    if (creatorFilter !== "favorites") {
      setFavoriteSelectionMode(false);
      setSelectedFavoriteIds([]);
      return;
    }
    const currentFavoriteIds = new Set(honorFavorites.map((record) => `favorite-${record.recordKey}`));
    setSelectedFavoriteIds((current) => current.filter((id) => currentFavoriteIds.has(id)));
  }, [creatorFilter, honorFavorites]);

  useEffect(() => {
    if (creatorFilter !== "listenBar") {
      setListenBarSelectionMode(false);
      setSelectedListenBarItemIds([]);
      return;
    }
    const currentListenBarIds = new Set(barTracks.map((track) => `bar-${track.id}`));
    setSelectedListenBarItemIds((current) => current.filter((id) => currentListenBarIds.has(id)));
  }, [barTracks, creatorFilter]);

  useEffect(() => {
    setCreatorPage(1);
  }, [creatorFilter]);

  const stopPreview = useCallback(() => {
    previewTokenRef.current += 1;
    if (fiveSecondPreviewTimerRef.current) {
      window.clearTimeout(fiveSecondPreviewTimerRef.current);
      fiveSecondPreviewTimerRef.current = null;
    }
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

  const playFiveSecondPreview = useCallback((audioUrl: string | null | undefined, previewKey: string) => {
    const cleanUrl = audioUrl?.trim();
    if (!cleanUrl) return;

    stopPreview();
    const token = previewTokenRef.current + 1;
    previewTokenRef.current = token;
    const audio = new Audio(cleanUrl);
    audio.preload = "auto";
    audio.onended = () => {
      if (previewTokenRef.current !== token) return;
      setPreviewingItemId(null);
    };
    audio.onerror = () => {
      if (previewTokenRef.current !== token) return;
      console.warn("[profile] ai music invite preview failed", previewKey);
      setPreviewingItemId(null);
    };
    previewAudioRef.current = audio;
    setPreviewingItemId(previewKey);
    fiveSecondPreviewTimerRef.current = window.setTimeout(() => {
      if (previewTokenRef.current === token) stopPreview();
    }, 5000);
    void audio.play().catch((error) => {
      console.warn("[profile] ai music invite preview blocked", error);
      if (previewTokenRef.current === token) setPreviewingItemId(null);
    });
  }, [stopPreview]);

  const openChallengeCut = useCallback((item: CreatorItem, mode: "custom" | "defender" = "custom") => {
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
    if (mode === "defender" && item.trackId) {
      params.set("aiMusicDefenderTrackId", item.trackId);
      params.set("defenderTrackTitle", title);
    }

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

  const toggleFavoriteSelection = useCallback((itemId: string) => {
    setSelectedFavoriteIds((current) => (
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    ));
  }, []);

  const removeFavoriteItems = useCallback(async (items: CreatorItem[]) => {
    const favoriteItems = items.filter((item) => {
      const record = item.favoriteRecord;
      return item.category === "favorites" && Boolean(record?.recordKey && record.targetKind && record.targetId);
    });
    if (favoriteItems.length === 0) return;
    if (favoriteItems.length > 1) setBulkFavoriteBusy(true);
    setFavoriteRemoveBusy((current) => {
      const next = { ...current };
      favoriteItems.forEach((item) => {
        next[item.id] = true;
      });
      return next;
    });
    const removedItemIds: string[] = [];
    const removedRecordKeys: string[] = [];
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return;
      }

      for (const item of favoriteItems) {
        const record = item.favoriteRecord;
        if (!record?.recordKey || !record.targetKind || !record.targetId) continue;
        const response = await fetch("/api/honor-board/interactions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "removeFavorite",
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
        removedItemIds.push(item.id);
        removedRecordKeys.push(record.recordKey);
      }

      if (removedItemIds.length > 0) {
        if (previewingItemId && removedItemIds.includes(previewingItemId)) stopPreview();
        setHonorFavorites((current) => current.filter((favorite) => !removedRecordKeys.includes(favorite.recordKey)));
        setFavoriteOrder((current) => current.filter((id) => !removedItemIds.includes(id)));
        setSelectedFavoriteIds((current) => current.filter((id) => !removedItemIds.includes(id)));
        if (favoriteItems.length > 1) setFavoriteSelectionMode(false);
      }
    } catch (error) {
      console.warn("[profile] remove favorite failed", error);
      if (favoriteItems.length > 1) alert(copy.favoriteBatchRemoveFailed);
    } finally {
      setFavoriteRemoveBusy((current) => {
        const next = { ...current };
        favoriteItems.forEach((item) => {
          delete next[item.id];
        });
        return next;
      });
      setBulkFavoriteBusy(false);
    }
  }, [copy.favoriteBatchRemoveFailed, previewingItemId, router, stopPreview]);

  const removeFavoriteItem = useCallback(async (item: CreatorItem) => {
    await removeFavoriteItems([item]);
  }, [removeFavoriteItems]);

  const removeSavedChoice = useCallback(async (choice: SavedChoiceCollection) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/auth");
      return;
    }
    try {
      const response = await fetch("/api/choice/interactions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "remove_heart", collectionKind: choice.kind, collectionId: choice.id }),
      });
      if (!response.ok) throw new Error("remove saved choice failed");
      setSavedChoices((current) => current.filter((item) => !(item.kind === choice.kind && item.id === choice.id)));
    } catch (error) {
      console.warn("[profile] remove saved choice failed", error);
      alert(isZh ? "取消收藏失敗，請稍後再試。" : "Could not remove this saved Choice.");
    }
  }, [isZh, router]);

  const toggleListenBarSelection = useCallback((itemId: string) => {
    setSelectedListenBarItemIds((current) => (
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    ));
  }, []);

  const removeListenBarItems = useCallback(async (items: CreatorItem[]) => {
    const listenBarItems = items.filter((item) => item.category === "listenBar" && item.trackId);
    if (listenBarItems.length === 0) return;
    const confirmMessage = listenBarItems.length > 1
      ? `${copy.songBatchConfirm} ${isZh ? `共 ${listenBarItems.length} 首。` : `${listenBarItems.length} songs selected.`}`
      : copy.songBatchConfirm;
    if (!window.confirm(confirmMessage)) return;

    setBulkListenBarBusy(true);
    const removedItemIds: string[] = [];
    const removedTrackIds: string[] = [];
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return;
      }

      for (const item of listenBarItems) {
        if (!item.trackId) continue;
        const response = await fetch("/api/listen-bar/remove-track", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ trackId: item.trackId }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "remove listen bar track failed");
        removedItemIds.push(item.id);
        removedTrackIds.push(item.trackId);
      }

      if (removedItemIds.length > 0) {
        if (previewingItemId && removedItemIds.includes(previewingItemId)) stopPreview();
        setBarTracks((current) => current.filter((track) => !removedTrackIds.includes(track.id)));
        setSelectedListenBarItemIds((current) => current.filter((id) => !removedItemIds.includes(id)));
        if (listenBarItems.length > 1) setListenBarSelectionMode(false);
      }
    } catch (error) {
      console.warn("[profile] remove listen bar tracks failed", error);
      alert(copy.songBatchRemoveFailed);
    } finally {
      setBulkListenBarBusy(false);
    }
  }, [copy.songBatchConfirm, copy.songBatchRemoveFailed, isZh, previewingItemId, router, stopPreview]);

  const updateTrackChallengeStatus = useCallback(async (trackId: string, status: AiMusicChallengeStatus) => {
    setChallengeBusy((current) => ({ ...current, [`track:${trackId}`]: true }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return;
      }
      const response = await fetch("/api/ai-music/challenges", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackId, status }),
      });
      const payload = (await response.json().catch(() => null)) as {
        track?: {
          ai_music_challenge_status?: string | null;
          ai_music_defender_drop_audio_path?: string | null;
          ai_music_defender_drop_prepared_at?: string | null;
        };
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "update challenge status failed");
      setBarTracks((current) =>
        current.map((track) =>
          track.id === trackId
            ? {
                ...track,
                ai_music_challenge_status: normalizeAiMusicChallengeStatus(payload?.track?.ai_music_challenge_status ?? status),
                ai_music_defender_drop_audio_path: payload?.track?.ai_music_defender_drop_audio_path ?? track.ai_music_defender_drop_audio_path,
                ai_music_defender_drop_prepared_at: payload?.track?.ai_music_defender_drop_prepared_at ?? track.ai_music_defender_drop_prepared_at,
              }
            : track,
        ),
      );
    } catch (error) {
      console.warn("[profile] update challenge status failed", error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setChallengeBusy((current) => {
        const next = { ...current };
        delete next[`track:${trackId}`];
        return next;
      });
    }
  }, [router]);

  const respondAiMusicInvite = useCallback(async (invite: AiMusicChallengeInvite, decision: "accept" | "reject") => {
    setChallengeBusy((current) => ({ ...current, [`invite:${invite.id}`]: true }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return;
      }
      const response = await fetch("/api/ai-music/challenges", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteId: invite.id, decision }),
      });
      const payload = (await response.json().catch(() => null)) as { battleId?: string | null; status?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "respond invite failed");
      setAiMusicInvites((current) => current.map((row) => (row.id === invite.id ? { ...row, status: payload?.status ?? decision } : row)));
      if (decision === "accept" && payload?.battleId) router.push(`/battle/${payload.battleId}?lang=${lang}`);
    } catch (error) {
      console.warn("[profile] respond ai music invite failed", error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setChallengeBusy((current) => {
        const next = { ...current };
        delete next[`invite:${invite.id}`];
        return next;
      });
    }
  }, [lang, router]);

  const openShowtimeEditor = useCallback((track: ShowtimeTrack) => {
    setEditingShowtimeTrackId(track.id);
    setShowtimeCoverFile(null);
    setShowtimeCoverPreview(null);
    setShowtimeEditForm({
      title: track.title?.trim() ?? "",
      artist: track.artist?.trim() ?? "",
      aiTool: track.ai_tool?.trim() ?? "",
      genre: track.genre?.trim() || "Original 自我風格",
      album: track.mood?.trim() ?? "",
      description: track.description?.trim() ?? "",
      youtubeUrl: track.youtube_url?.trim() ?? "",
      lyrics: track.lyrics?.trim() ?? "",
      supportUrl: track.support_url?.trim() ?? "",
      supportLabel: track.support_url_label?.trim() ?? "",
    });
  }, []);

  useEffect(() => () => {
    if (showtimeCoverPreview?.startsWith("blob:")) URL.revokeObjectURL(showtimeCoverPreview);
  }, [showtimeCoverPreview]);

  const closeShowtimeEditor = useCallback(() => {
    setEditingShowtimeTrackId(null);
    setShowtimeCoverFile(null);
    setShowtimeCoverPreview(null);
  }, []);

  const changeShowtimeCover = useCallback((file: File | null) => {
    if (!file) return;
    if (!isAllowedImageUploadFile(file) || file.size <= 0 || file.size > MAX_SHOWTIME_COVER_BYTES) {
      alert(`${IMAGE_UPLOAD_FORMAT_LABEL}，封面最大 10MB。`);
      return;
    }
    setShowtimeCoverFile(file);
    setShowtimeCoverPreview(URL.createObjectURL(file));
  }, []);

  const patchShowtimeTrack = useCallback(async (trackId: string, payload: Record<string, unknown>) => {
    setShowtimeBusy((current) => ({ ...current, [trackId]: true }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push("/auth");
        return null;
      }
      const response = await fetch("/api/showtime/my-tracks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackId, ...payload }),
      });
      const result = (await response.json().catch(() => null)) as { track?: ShowtimeTrack; error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "showtime update failed");
      if (result?.track) {
        setShowtimeTracks((current) => current.map((track) => (track.id === trackId ? result.track! : track)));
      }
      return result?.track ?? null;
    } catch (error) {
      console.warn("[profile] showtime update failed", error);
      alert(error instanceof Error ? error.message : copy.showtimeSaveFailed);
      return null;
    } finally {
      setShowtimeBusy((current) => {
        const next = { ...current };
        delete next[trackId];
        return next;
      });
    }
  }, [copy.showtimeSaveFailed, router]);

  const saveShowtimeMetadata = useCallback(async (trackId: string) => {
    let uploadedCoverPath: string | null = null;
    if (showtimeCoverFile) {
      if (!userId) {
        alert(copy.showtimeSaveFailed);
        return;
      }
      const safeName = showtimeCoverFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "cover.jpg";
      uploadedCoverPath = `${userId}/community/showtime/${trackId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(LISTEN_BAR_COVER_BUCKET)
        .upload(uploadedCoverPath, showtimeCoverFile, { contentType: showtimeCoverFile.type, upsert: false });
      if (uploadError) {
        alert(uploadError.message || copy.showtimeSaveFailed);
        return;
      }
    }
    const saved = await patchShowtimeTrack(trackId, {
      title: showtimeEditForm.title,
      artist: showtimeEditForm.artist,
      aiTool: showtimeEditForm.aiTool,
      genre: showtimeEditForm.genre,
      album: showtimeEditForm.album,
      description: showtimeEditForm.description,
      youtubeUrl: showtimeEditForm.youtubeUrl,
      lyrics: showtimeEditForm.lyrics,
      supportUrl: showtimeEditForm.supportUrl,
      supportLabel: showtimeEditForm.supportLabel,
      ...(uploadedCoverPath ? { coverPath: uploadedCoverPath } : {}),
    });
    if (saved) {
      closeShowtimeEditor();
    } else if (uploadedCoverPath) {
      await supabase.storage.from(LISTEN_BAR_COVER_BUCKET).remove([uploadedCoverPath]);
    }
  }, [closeShowtimeEditor, copy.showtimeSaveFailed, patchShowtimeTrack, showtimeCoverFile, showtimeEditForm, userId]);

  const hideShowtimeDisplay = useCallback(async (track: ShowtimeTrack) => {
    if (!window.confirm(copy.showtimeHideConfirm)) return;
    await patchShowtimeTrack(track.id, { hidePublic: true });
    setEditingShowtimeTrackId((current) => (current === track.id ? null : current));
  }, [copy.showtimeHideConfirm, patchShowtimeTrack]);

  const creatorItems = useMemo<CreatorItem[]>(() => {
    const pendingInviteByTrackId = new Map(
      aiMusicInvites
        .filter((invite) => invite.status === "pending")
        .map((invite) => [invite.defender_track_id, invite]),
    );
    const tracks = barTracks.map((track) => {
      const challengeStatus = normalizeAiMusicChallengeStatus(track.ai_music_challenge_status);
      const hasDefenderDrop = hasPreparedAiMusicDefenderDrop(track.ai_music_defender_drop_audio_path);
      return {
        id: `bar-${track.id}`,
        category: "listenBar" as const,
        kind: copy.listenBar,
        title: track.title?.trim() || (isZh ? "未命名歌曲" : "Untitled Song"),
        meta: [
          track.artist?.trim(),
          track.ai_tool?.trim(),
          track.genre?.trim(),
          aiMusicChallengeStatusLabel(challengeStatus, lang),
          hasDefenderDrop ? copy.defenderDropReady : copy.defenderDropMissing,
          `${track.heart_count ?? track.positive_reaction_count ?? 0} ${isZh ? "反應" : "reactions"}`,
        ]
          .filter(Boolean)
          .join(" / "),
        href: "/listen-bar",
        date: track.created_at,
        genre: track.genre,
        aiTool: track.ai_tool,
        audioUrl: storagePublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path),
        trackId: track.id,
        challengeStatus,
        hasDefenderDrop,
        pendingChallengeInvite: pendingInviteByTrackId.get(track.id) ?? null,
      };
    });

    const showtimeItems = showtimeTracks.map((track) => {
      const publicHidden = Boolean(track.ai_music_showtime_public_removed_at);
      const supportStatus = track.support_url?.trim()
        ? track.support_url_status === "approved"
          ? copy.showtimeSupportApproved
          : copy.showtimeSupportPending
        : "";
      return {
        id: `showtime-${track.id}`,
        category: "showtime" as const,
        kind: copy.showtime,
        title: track.title?.trim() || (isZh ? "未命名 Showtime 作品" : "Untitled Showtime Work"),
        meta: [
          track.artist?.trim(),
          track.ai_tool?.trim(),
          track.genre?.trim(),
          supportStatus,
          publicHidden ? copy.showtimeHidden : null,
          `${track.heart_count ?? track.positive_reaction_count ?? 0} ${isZh ? "愛心" : "hearts"}`,
        ]
          .filter(Boolean)
          .join(" / "),
        href: lang === "en" ? "/rank?lang=en" : "/rank?lang=zh",
        date: track.ai_music_showtime_certified_at ?? track.created_at,
        genre: track.genre,
        aiTool: track.ai_tool,
        audioUrl: storagePublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path),
        trackId: track.id,
        showtimeTrack: track,
      };
    });

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
            ? "Showtime 認證"
            : "Showtime certified"
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
        title: record.targetTitle?.trim() || (isZh ? "收藏的 Showtime 作品" : "Saved Showtime Track"),
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

    return [...showtimeItems, ...tracks, ...queues, ...battleRecords, ...archivedWins, ...orderedFavorites]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }, [
    barTracks,
    aiMusicInvites,
    battleQueues,
    battles,
    copy.battle,
    copy.defenderDropMissing,
    copy.defenderDropReady,
    copy.honorFavorite,
    copy.listenBar,
    copy.showtime,
    copy.showtimeHidden,
    copy.showtimeSupportApproved,
    copy.showtimeSupportPending,
    copy.records,
    copy.wins,
    favoriteOrder,
    honorFavorites,
    isZh,
    lang,
    showtimeTracks,
    userId,
    wins,
  ]);

  const pendingAiMusicInvites = useMemo(
    () => aiMusicInvites.filter((invite) => invite.status === "pending"),
    [aiMusicInvites],
  );

  const stats = [
    { key: "listenBar" as const, label: copy.listenBar, value: barTracks.length, sub: `${barTracks.filter((track) => track.is_active).length} ${copy.active}` },
    { key: "showtime" as const, label: copy.showtime, value: showtimeTracks.length, sub: isZh ? "認證作品" : "certified works" },
    { key: "battle" as const, label: copy.battle, value: battleQueues.length, sub: isZh ? "已上傳戰帖" : "uploaded cards" },
    { key: "records" as const, label: copy.records, value: battles.length, sub: isZh ? "已進場對戰" : "entered matches" },
    { key: "wins" as const, label: copy.wins, value: wins.length, sub: isZh ? "勝利作品" : "winning tracks" },
    { key: "favorites" as const, label: copy.favorites, value: honorFavorites.length, sub: copy.favorited },
  ];

  const filteredCreatorItemsBase = (
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
  );
  const creatorTotalPages = Math.max(1, Math.ceil(filteredCreatorItemsBase.length / CREATOR_ITEMS_PER_PAGE));
  const safeCreatorPage = Math.min(creatorPage, creatorTotalPages);
  const creatorPageStartIndex = (safeCreatorPage - 1) * CREATOR_ITEMS_PER_PAGE;
  const filteredCreatorItems = filteredCreatorItemsBase.slice(
    creatorPageStartIndex,
    creatorPageStartIndex + CREATOR_ITEMS_PER_PAGE,
  );
  const creatorPageEndIndex = Math.min(filteredCreatorItemsBase.length, creatorPageStartIndex + filteredCreatorItems.length);
  const selectedFavoriteIdSet = useMemo(() => new Set(selectedFavoriteIds), [selectedFavoriteIds]);
  const selectedListenBarItemIdSet = useMemo(() => new Set(selectedListenBarItemIds), [selectedListenBarItemIds]);
  const visibleFavoriteIds = filteredCreatorItems
    .filter((item) => item.category === "favorites")
    .map((item) => item.id);
  const visibleListenBarItemIds = filteredCreatorItems
    .filter((item) => item.category === "listenBar")
    .map((item) => item.id);
  const selectedVisibleFavoriteIds = visibleFavoriteIds.filter((id) => selectedFavoriteIdSet.has(id));
  const selectedVisibleListenBarItemIds = visibleListenBarItemIds.filter((id) => selectedListenBarItemIdSet.has(id));
  const selectedFavoriteItems = filteredCreatorItemsBase.filter((item) => item.category === "favorites" && selectedFavoriteIdSet.has(item.id));
  const selectedListenBarItems = filteredCreatorItemsBase.filter((item) => item.category === "listenBar" && selectedListenBarItemIdSet.has(item.id));
  const allVisibleFavoritesSelected = visibleFavoriteIds.length > 0 && selectedVisibleFavoriteIds.length === visibleFavoriteIds.length;
  const allVisibleListenBarItemsSelected = visibleListenBarItemIds.length > 0 && selectedVisibleListenBarItemIds.length === visibleListenBarItemIds.length;

  useEffect(() => {
    if (creatorPage > creatorTotalPages) setCreatorPage(creatorTotalPages);
  }, [creatorPage, creatorTotalPages]);

  useEffect(() => {
    playlistItemsRef.current = filteredCreatorItems;
  }, [filteredCreatorItems]);

  const creatorListTitle = creatorFilter === "all"
    ? copy.recent
    : stats.find((stat) => stat.key === creatorFilter)?.label ?? copy.recent;
  const creatorEmptyText = creatorFilter === "favorites" ? copy.favoriteEmpty : copy.empty;

  return (
    <div className="aipo-stage-bg min-h-screen px-4 pb-10 pt-24 text-white sm:py-10">
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
                  <Link href="/profile/choice" className="rounded-2xl border border-yellow-200/30 bg-yellow-300/10 px-4 py-2 text-sm font-black text-yellow-100 transition hover:border-yellow-100/65">
                    我的 Choice
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
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-yellow-300/50" href="/admin/showtime">
                    Showtime
                  </Link>
                  <Link className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-cyan-300/50" href="/admin/choice">
                    Choice
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

            <section id="pending-ai-music-challenges" className="mt-5 rounded-2xl border border-red-300/24 bg-red-500/[0.055] p-4 shadow-[0_0_34px_rgba(220,38,38,0.08)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-100/75">AI MUSIC DEFENSE</p>
                  <h3 className="mt-1 text-lg font-black text-red-50">
                    {copy.pendingChallenges}
                    {pendingAiMusicInvites.length > 0 ? <span className="ml-2 text-red-200">{pendingAiMusicInvites.length}</span> : null}
                  </h3>
                  <p className="mt-1 text-xs font-bold leading-5 text-zinc-400">{copy.pendingChallengesHelp}</p>
                </div>
              </div>
              {pendingAiMusicInvites.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {pendingAiMusicInvites.map((invite) => {
                    const track = invite.listen_bar_tracks;
                    const trackTitle = track?.title?.trim() || invite.defender_song_name?.trim() || (isZh ? "未命名作品" : "Untitled Track");
                    const challengerName = invite.challenger_name?.trim() || (isZh ? "挑戰者" : "Challenger");
                    const challengerSong = invite.challenger_song_name?.trim() || (isZh ? "挑戰 Drop" : "Challenge Drop");
                    const genre = track?.genre?.trim() || "AI Music";
                    const defenderPreviewKey = `invite:${invite.id}:defender`;
                    const challengerPreviewKey = `invite:${invite.id}:challenger`;
                    return (
                      <article key={invite.id} className="rounded-2xl border border-white/10 bg-black/42 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/75">{copy.pendingChallengeKicker}</p>
                            <h4 className="mt-1 truncate text-lg font-black text-white">《{trackTitle}》</h4>
                            <div className="mt-2 grid gap-1 text-xs font-bold leading-5 text-zinc-400 sm:grid-cols-2">
                              <span>{copy.challenger}: <span className="text-zinc-100">{challengerName}</span></span>
                              <span>{copy.genreLabel}: <span className="text-zinc-100">{genre}</span></span>
                              <span className="sm:col-span-2">{copy.scheduledStart}: <span className="text-yellow-100">{formatDateTime(invite.scheduled_start_at, lang)}</span></span>
                              <span className="sm:col-span-2">{isZh ? "挑戰 Drop" : "Challenge Drop"}: <span className="text-zinc-100">{challengerSong}</span></span>
                            </div>
                            <p className="mt-2 text-xs font-bold text-cyan-100/75">
                              {isZh ? "守擂 Drop 已鎖定，回覆前不可修改。" : "Defender Drop is locked until you respond."}
                            </p>
                          </div>
                          <div className="grid min-w-[min(100%,20rem)] gap-2 text-xs font-black sm:grid-cols-2 lg:min-w-[21rem]">
                            <button
                              type="button"
                              disabled={!invite.defenderPreviewUrl}
                              onClick={() => playFiveSecondPreview(invite.defenderPreviewUrl, defenderPreviewKey)}
                              className="rounded-xl border border-orange-200/30 bg-orange-400/10 px-3 py-2.5 text-orange-100 transition hover:border-orange-100/70 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {previewingItemId === defenderPreviewKey ? copy.previewingFiveSeconds : copy.defenderPreview}
                            </button>
                            <button
                              type="button"
                              disabled={!invite.challengerPreviewUrl}
                              onClick={() => playFiveSecondPreview(invite.challengerPreviewUrl, challengerPreviewKey)}
                              className="rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2.5 text-cyan-100 transition hover:border-cyan-100/70 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {previewingItemId === challengerPreviewKey ? copy.previewingFiveSeconds : copy.challengerPreview}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(challengeBusy[`invite:${invite.id}`])}
                              onClick={() => void respondAiMusicInvite(invite, "accept")}
                              className="rounded-xl border border-green-200/40 bg-green-400/14 px-3 py-2.5 text-green-100 transition hover:border-green-100/70 disabled:cursor-wait disabled:opacity-45"
                            >
                              {isZh ? "接受接戰" : "Accept"}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(challengeBusy[`invite:${invite.id}`])}
                              onClick={() => void respondAiMusicInvite(invite, "reject")}
                              className="rounded-xl border border-red-200/40 bg-red-500/14 px-3 py-2.5 text-red-100 transition hover:border-red-100/70 disabled:cursor-wait disabled:opacity-45"
                            >
                              {isZh ? "拒絕" : "Reject"}
                            </button>
                            {invite.battle_id ? (
                              <Link
                                href={`/battle/${invite.battle_id}?lang=${lang}`}
                                className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-center text-zinc-100 transition hover:border-white/30 sm:col-span-2"
                              >
                                {copy.openBattleRoom}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/24 px-3 py-3 text-xs font-bold text-zinc-500">
                  {copy.pendingChallengesEmpty}
                </p>
              )}
            </section>

            <section className="mt-5 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.035] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">CHOICE PLAYLISTS</p>
                  <h3 className="mt-1 text-lg font-black text-white">{copy.savedChoiceTitle}</h3>
                </div>
                <Link href="/rank?lang=zh#choice-weekly" className="text-xs font-black text-cyan-100 underline decoration-cyan-100/30 underline-offset-4 hover:text-white">{isZh ? "去找 Choice" : "Browse Choices"}</Link>
              </div>
              {savedChoices.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {savedChoices.map((choice) => (
                    <article key={`${choice.kind}:${choice.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={choice.avatarUrl || AIPOGER_BRAND_LOGO} alt="" className="h-12 w-12 shrink-0 rounded-full border border-yellow-100/20 object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link href={choicePublicPath(choice.id, choice.kind)} className="block truncate text-sm font-black text-white hover:text-yellow-100">{choice.title || `${choice.curatorName} Choice`}</Link>
                        <p className="mt-1 truncate text-xs font-bold text-zinc-500">{choice.curatorName} · {choice.items.length} {isZh ? "首" : "tracks"}</p>
                      </div>
                      <button type="button" onClick={() => void removeSavedChoice(choice)} className="shrink-0 rounded-full border border-red-200/20 px-2.5 py-1.5 text-[11px] font-black text-red-100 transition hover:border-red-200/60">{copy.removeSavedChoice}</button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-bold text-zinc-500">{copy.savedChoiceEmpty}</p>
              )}
            </section>

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

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-zinc-50">{creatorListTitle}</h3>
                {creatorFilter === "favorites" && filteredCreatorItems.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      {favoriteSelectionMode ? (
                        <>
                          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-black text-cyan-100">
                            {copy.selectedFavoritesPrefix} {selectedFavoriteIds.length} {copy.selectedFavoritesSuffix}
                          </span>
                          <button
                            type="button"
                            disabled={bulkFavoriteBusy || allVisibleFavoritesSelected}
                            onClick={() => {
                              setSelectedFavoriteIds((current) => Array.from(new Set([...current, ...visibleFavoriteIds])));
                            }}
                            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:border-cyan-200/50 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-45"
                          >
                            {copy.selectVisibleFavorites}
                          </button>
                          <button
                            type="button"
                            disabled={bulkFavoriteBusy || selectedFavoriteIds.length === 0}
                            onClick={() => setSelectedFavoriteIds([])}
                            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-400 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {copy.clearFavoriteSelection}
                          </button>
                          <button
                            type="button"
                            disabled={bulkFavoriteBusy || selectedFavoriteItems.length === 0}
                            onClick={() => void removeFavoriteItems(selectedFavoriteItems)}
                            className="rounded-full border border-red-300/30 bg-red-500/12 px-3 py-1.5 text-xs font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {bulkFavoriteBusy ? copy.removingFavorite : copy.removeSelectedFavorites}
                          </button>
                          <button
                            type="button"
                            disabled={bulkFavoriteBusy}
                            onClick={() => {
                              setFavoriteSelectionMode(false);
                              setSelectedFavoriteIds([]);
                            }}
                            className="rounded-full border border-orange-200/25 bg-orange-400/10 px-3 py-1.5 text-xs font-black text-orange-100 transition hover:border-orange-100/55 disabled:cursor-wait disabled:opacity-45"
                          >
                            {copy.finishManageFavorites}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFavoriteSelectionMode(true)}
                          className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:border-cyan-100/55"
                        >
                          {copy.manageFavorites}
                        </button>
                      )}
                    </div>
                    {favoriteSelectionMode ? <p className="text-xs font-bold text-zinc-500">{copy.favoriteBatchHelp}</p> : null}
                  </div>
                ) : null}
                {creatorFilter === "listenBar" && filteredCreatorItems.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      {listenBarSelectionMode ? (
                        <>
                          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-black text-cyan-100">
                            {copy.selectedSongsPrefix} {selectedListenBarItemIds.length} {copy.selectedSongsSuffix}
                          </span>
                          <button
                            type="button"
                            disabled={bulkListenBarBusy || allVisibleListenBarItemsSelected}
                            onClick={() => {
                              setSelectedListenBarItemIds((current) => Array.from(new Set([...current, ...visibleListenBarItemIds])));
                            }}
                            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:border-cyan-200/50 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-45"
                          >
                            {copy.selectVisibleSongs}
                          </button>
                          <button
                            type="button"
                            disabled={bulkListenBarBusy || selectedListenBarItemIds.length === 0}
                            onClick={() => setSelectedListenBarItemIds([])}
                            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-400 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {copy.clearSongSelection}
                          </button>
                          <button
                            type="button"
                            disabled={bulkListenBarBusy || selectedListenBarItems.length === 0}
                            onClick={() => void removeListenBarItems(selectedListenBarItems)}
                            className="rounded-full border border-red-300/30 bg-red-500/12 px-3 py-1.5 text-xs font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {bulkListenBarBusy ? copy.removingFavorite : copy.removeSelectedSongs}
                          </button>
                          <button
                            type="button"
                            disabled={bulkListenBarBusy}
                            onClick={() => {
                              setListenBarSelectionMode(false);
                              setSelectedListenBarItemIds([]);
                            }}
                            className="rounded-full border border-orange-200/25 bg-orange-400/10 px-3 py-1.5 text-xs font-black text-orange-100 transition hover:border-orange-100/55 disabled:cursor-wait disabled:opacity-45"
                          >
                            {copy.finishManageSongs}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setListenBarSelectionMode(true)}
                          className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:border-cyan-100/55"
                        >
                          {copy.manageSongs}
                        </button>
                      )}
                    </div>
                    {listenBarSelectionMode ? <p className="text-xs font-bold text-zinc-500">{copy.songBatchHelp}</p> : null}
                  </div>
                ) : null}
              </div>
              {filteredCreatorItems.length > 0 ? (
                <div className="space-y-2">
                  {filteredCreatorItems.map((item, index) => {
                    const itemOverallIndex = creatorPageStartIndex + index;
                    const dateParts = formatDateParts(item.date, lang);
                    const showFavoriteControls = creatorFilter === "favorites" && item.category === "favorites";
                    const isFavoriteSelected = selectedFavoriteIdSet.has(item.id);
                    const showListenBarBatchControls = creatorFilter === "listenBar" && item.category === "listenBar";
                    const isListenBarSelected = selectedListenBarItemIdSet.has(item.id);
                    const showShowtimeControls = creatorFilter === "showtime" && item.category === "showtime" && Boolean(item.showtimeTrack);
                    const showtimeTrack = item.showtimeTrack ?? null;
                    const selectionModeActive = (favoriteSelectionMode && showFavoriteControls) || (listenBarSelectionMode && showListenBarBatchControls);
                    const isSelectionSelected = isFavoriteSelected || isListenBarSelected;
                    const selectionSelectedLabel = showListenBarBatchControls ? copy.songSelected : copy.favoriteSelected;
                    const selectionTapLabel = showListenBarBatchControls ? copy.songTapToSelect : copy.favoriteTapToSelect;
                    const isMarqueeSelected = selectedMarqueeItemId === item.id;
                    const showAiMusicChallengeControls = item.category === "listenBar" && Boolean(item.trackId);
                    const challengeStatus = item.challengeStatus ?? "showcase";
                    const hasDefenderDrop = Boolean(item.hasDefenderDrop);
                    const pendingChallengeInvite = item.pendingChallengeInvite ?? null;
                    const defenderDropLocked = Boolean(pendingChallengeInvite);
                    const titleContent = (
                      <>
                        <span className="aipo-profile-marquee block overflow-hidden text-base font-black text-zinc-50">
                          <span className="aipo-profile-marquee-track">
                            <span className="pr-8">{item.title}</span>
                            <span className="aipo-profile-marquee-ghost pr-8" aria-hidden="true">{item.title}</span>
                          </span>
                        </span>
                        <span className="aipo-profile-marquee block overflow-hidden text-xs text-zinc-500">
                          <span className="aipo-profile-marquee-track">
                            <span className="pr-8">{item.meta}</span>
                            <span className="aipo-profile-marquee-ghost pr-8" aria-hidden="true">{item.meta}</span>
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <article
                        key={item.id}
                        onClick={() => {
                          setSelectedMarqueeItemId(item.id);
                          if (favoriteSelectionMode && showFavoriteControls) toggleFavoriteSelection(item.id);
                          if (listenBarSelectionMode && showListenBarBatchControls) toggleListenBarSelection(item.id);
                        }}
                        onFocusCapture={() => setSelectedMarqueeItemId(item.id)}
                        onMouseEnter={() => setSelectedMarqueeItemId(item.id)}
                        onMouseLeave={() => setSelectedMarqueeItemId((current) => (current === item.id ? null : current))}
                        className={`aipo-profile-row grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-2xl border px-4 py-3 transition sm:grid-cols-[2.5rem_4.5rem_minmax(0,1fr)_auto] sm:items-center ${
                          selectionModeActive
                            ? isSelectionSelected
                              ? "border-cyan-200/55 bg-cyan-300/[0.075] shadow-[0_0_28px_rgba(103,232,249,0.1)]"
                              : "border-white/10 bg-black/25 hover:border-cyan-200/45 hover:bg-cyan-300/[0.045]"
                            : "border-white/10 bg-black/25 hover:border-orange-300/45 hover:bg-orange-300/[0.06]"
                        } ${
                          isMarqueeSelected ? "aipo-profile-marquee-active" : ""
                        }`}
                      >
                        {selectionModeActive ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (favoriteSelectionMode && showFavoriteControls) toggleFavoriteSelection(item.id);
                              if (listenBarSelectionMode && showListenBarBatchControls) toggleListenBarSelection(item.id);
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black transition ${
                              isSelectionSelected
                                ? "border-cyan-100 bg-cyan-300 text-black shadow-[0_0_18px_rgba(103,232,249,0.35)]"
                                : "border-cyan-200/25 bg-cyan-300/[0.08] text-cyan-100 hover:border-cyan-100/70"
                            }`}
                            aria-pressed={isSelectionSelected}
                            aria-label={isSelectionSelected ? selectionSelectedLabel : selectionTapLabel}
                            title={isSelectionSelected ? selectionSelectedLabel : selectionTapLabel}
                          >
                            {isSelectionSelected ? "✓" : ""}
                          </button>
                        ) : item.audioUrl ? (
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
                        {selectionModeActive ? (
                          <span className="min-w-0 rounded-xl">{titleContent}</span>
                        ) : item.canNavigate === false || !item.href ? (
                          <span className="min-w-0 rounded-xl">{titleContent}</span>
                        ) : (
                          <Link href={item.href} className="min-w-0 rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-orange-300/70">
                            {titleContent}
                          </Link>
                        )}
                        <span className="col-span-2 flex flex-col gap-2 sm:col-span-1 sm:items-end">
                          <span className="min-w-12 text-left text-xs leading-4 tabular-nums text-zinc-500 sm:text-right">
                            <span className="block">{dateParts.date}</span>
                            <span className="block">{dateParts.time}</span>
                          </span>
                          {!selectionModeActive && showAiMusicChallengeControls ? (
                            <span className="flex max-w-full flex-wrap justify-start gap-1.5 sm:justify-end">
                              {(["showcase", "open", "custom"] as const).map((status) => {
                                const selected = challengeStatus === status;
                                const openNeedsDefenderDrop = status === "open" && !hasDefenderDrop;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={Boolean(challengeBusy[`track:${item.trackId}`])}
                                    title={openNeedsDefenderDrop ? copy.openNeedsDefenderDrop : undefined}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (!item.trackId) return;
                                      if (openNeedsDefenderDrop) {
                                        alert(copy.openNeedsDefenderDrop);
                                        if (item.audioUrl) openChallengeCut(item, "defender");
                                        return;
                                      }
                                      void updateTrackChallengeStatus(item.trackId, status);
                                    }}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition disabled:cursor-wait disabled:opacity-45 ${
                                      selected
                                        ? "border-orange-200/65 bg-orange-400/18 text-orange-50"
                                        : "border-white/10 bg-black/25 text-zinc-400 hover:border-orange-200/40 hover:text-white"
                                    }`}
                                  >
                                    {aiMusicChallengeStatusLabel(status, lang)}
                                  </button>
                                );
                              })}
                            </span>
                          ) : null}
                          {!selectionModeActive && showAiMusicChallengeControls && item.audioUrl ? (
                            <span className="flex justify-start sm:justify-end">
                              <button
                                type="button"
                                disabled={defenderDropLocked}
                                title={defenderDropLocked ? (isZh ? "有待回覆攻擂邀請時不能修改守擂 Drop。" : "You cannot change the defender Drop while an invite is pending.") : undefined}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openChallengeCut(item, "defender");
                                }}
                                className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:border-cyan-100/50 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {defenderDropLocked
                                  ? copy.defenderDropLocked
                                  : hasDefenderDrop
                                    ? copy.replaceDefenderDrop
                                    : copy.prepareDefenderDrop}
                              </button>
                            </span>
                          ) : null}
                          {!selectionModeActive && pendingChallengeInvite ? (
                            <span className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
                              <Link
                                href={pendingChallengeInvite.battle_id ? `/battle/${pendingChallengeInvite.battle_id}?lang=${lang}` : "#"}
                                className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100 transition hover:border-cyan-100/50"
                              >
                                {isZh ? "等待接戰" : "Pending"}
                              </Link>
                              <button
                                type="button"
                                disabled={Boolean(challengeBusy[`invite:${pendingChallengeInvite.id}`])}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void respondAiMusicInvite(pendingChallengeInvite, "accept");
                                }}
                                className="rounded-full border border-green-200/35 bg-green-400/10 px-2.5 py-1 text-[11px] font-black text-green-100 transition hover:border-green-100/60 disabled:cursor-wait disabled:opacity-45"
                              >
                                {isZh ? "接受" : "Accept"}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(challengeBusy[`invite:${pendingChallengeInvite.id}`])}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void respondAiMusicInvite(pendingChallengeInvite, "reject");
                                }}
                                className="rounded-full border border-red-200/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-100 transition hover:border-red-100/55 disabled:cursor-wait disabled:opacity-45"
                              >
                                {isZh ? "拒絕" : "Reject"}
                              </button>
                            </span>
                          ) : null}
                          {listenBarSelectionMode && showListenBarBatchControls ? (
                            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                              isListenBarSelected
                                ? "border-cyan-200/45 bg-cyan-300/10 text-cyan-100"
                                : "border-white/10 bg-black/25 text-zinc-500"
                            }`}>
                              {isListenBarSelected ? copy.songSelected : copy.songTapToSelect}
                            </span>
                          ) : showFavoriteControls ? (
                            favoriteSelectionMode ? (
                              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                                isFavoriteSelected
                                  ? "border-cyan-200/45 bg-cyan-300/10 text-cyan-100"
                                  : "border-white/10 bg-black/25 text-zinc-500"
                              }`}>
                                {isFavoriteSelected ? copy.favoriteSelected : copy.favoriteTapToSelect}
                              </span>
                            ) : (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={itemOverallIndex === 0}
                                onClick={() => moveFavoriteItem(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={copy.moveUp}
                                title={copy.moveUp}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={itemOverallIndex === filteredCreatorItemsBase.length - 1}
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
                            )
                          ) : showShowtimeControls && showtimeTrack ? (
                            <span className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
                              <button
                                type="button"
                                disabled={Boolean(showtimeBusy[showtimeTrack.id])}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openShowtimeEditor(showtimeTrack);
                                }}
                                className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-3 py-1.5 text-xs font-black text-yellow-100 transition hover:border-yellow-100/60 disabled:cursor-wait disabled:opacity-45"
                              >
                                {copy.showtimeEdit}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(showtimeBusy[showtimeTrack.id]) || Boolean(showtimeTrack.ai_music_showtime_public_removed_at)}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void hideShowtimeDisplay(showtimeTrack);
                                }}
                                className="rounded-full border border-red-300/25 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-100 transition hover:border-red-200/65 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {showtimeTrack.ai_music_showtime_public_removed_at ? copy.showtimeHidden : copy.showtimeHide}
                              </button>
                            </span>
                          ) : !selectionModeActive && item.audioUrl && item.category !== "favorites" && item.category !== "showtime" && (item.category !== "listenBar" || challengeStatus === "custom") ? (
                            <button
                              type="button"
                              onClick={() => openChallengeCut(item)}
                              className="rounded-full border border-orange-300/35 bg-orange-400/10 px-3 py-1.5 text-xs font-black text-orange-100 transition hover:border-orange-200 hover:bg-orange-400/18"
                            >
                              {item.category === "listenBar" ? (isZh ? "自定開戰" : "Custom Battle") : isZh ? "挑戰" : "Challenge"}
                            </button>
                          ) : null}
                        </span>
                        {showShowtimeControls && showtimeTrack && editingShowtimeTrackId === showtimeTrack.id ? (
                          <div
                            className="col-span-2 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.045] p-3 sm:col-span-4"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-2.5 sm:col-span-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={showtimeCoverPreview || storagePublicUrl(LISTEN_BAR_COVER_BUCKET, showtimeTrack.cover_path) || DEFAULT_LISTEN_BAR_COVER}
                                alt=""
                                className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-zinc-200">{isZh ? "作品封面" : "Cover Art"}</p>
                                <p className="mt-1 text-[11px] font-bold text-zinc-500">{isZh ? "可更換展示封面，不會更動音檔或認可紀錄。" : "Updates display art only. Audio and recognition stay locked."}</p>
                              </div>
                              <label className="cursor-pointer rounded-full border border-yellow-200/30 bg-yellow-300/10 px-3 py-1.5 text-xs font-black text-yellow-100 transition hover:border-yellow-100/60">
                                {isZh ? "更換封面" : "Replace Cover"}
                                <input type="file" accept={IMAGE_UPLOAD_ACCEPT} className="sr-only" onChange={(event) => changeShowtimeCover(event.target.files?.[0] ?? null)} />
                              </label>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "歌名" : "Title"}
                                <input
                                  value={showtimeEditForm.title}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, title: event.target.value }))}
                                  maxLength={500}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "創作者顯示名" : "Creator Name"}
                                <input
                                  value={showtimeEditForm.artist}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, artist: event.target.value }))}
                                  maxLength={80}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "AI 工具" : "AI Tool"}
                                <input
                                  value={showtimeEditForm.aiTool}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, aiTool: event.target.value }))}
                                  maxLength={80}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "類型" : "Genre"}
                                <select
                                  value={showtimeEditForm.genre}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, genre: event.target.value }))}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                >
                                  {MUSIC_GENRE_OPTIONS.map((genre) => (
                                    <option key={genre.value} value={genre.value}>{genre.value}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "作品資訊" : "Production Info"}
                                <input
                                  value={showtimeEditForm.album}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, album: event.target.value }))}
                                  maxLength={80}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "外部支持連結" : "External Support URL"}
                                <input
                                  value={showtimeEditForm.supportUrl}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, supportUrl: event.target.value }))}
                                  placeholder="https://"
                                  maxLength={500}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300">
                                {isZh ? "連結用途" : "Link Label"}
                                <input
                                  value={showtimeEditForm.supportLabel}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, supportLabel: event.target.value }))}
                                  placeholder={isZh ? "例如：前往 YouTube 頻道" : "For example: Visit my YouTube channel"}
                                  maxLength={80}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">
                                {isZh ? "一句介紹" : "Description"}
                                <input
                                  value={showtimeEditForm.description}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, description: event.target.value }))}
                                  maxLength={120}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">
                                YouTube / MV
                                <input
                                  value={showtimeEditForm.youtubeUrl}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
                                  maxLength={300}
                                  className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">
                                {isZh ? "歌詞" : "Lyrics"}
                                <textarea
                                  value={showtimeEditForm.lyrics}
                                  onChange={(event) => setShowtimeEditForm((current) => ({ ...current, lyrics: event.target.value }))}
                                  rows={4}
                                  className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-yellow-100/55"
                                />
                              </label>
                            </div>
                            <p className="mt-3 text-xs font-bold leading-5 text-zinc-500">
                              {showtimeEditForm.supportUrl ? `${copy.showtimeSupportPending}${isZh ? " 可寫明 YouTube、MV 或支持／打賞頁用途；AIPOGER 不處理付款或金額。" : " Add a label for YouTube, an MV, or a tip page. AIPOGER does not process payments or amounts."}` : isZh ? "連結只接受 HTTPS；可寫明 YouTube、MV 或支持／打賞頁用途。AIPOGER 不處理付款或金額。" : "Links must use HTTPS. Label YouTube, an MV, or a tip page. AIPOGER does not process payments or amounts."}
                            </p>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                disabled={Boolean(showtimeBusy[showtimeTrack.id])}
                                onClick={closeShowtimeEditor}
                                className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-white/30 disabled:cursor-wait disabled:opacity-45"
                              >
                                {copy.showtimeCancel}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(showtimeBusy[showtimeTrack.id])}
                                onClick={() => void saveShowtimeMetadata(showtimeTrack.id)}
                                className="rounded-full border border-yellow-200/45 bg-yellow-300 px-5 py-2 text-xs font-black text-black transition hover:bg-yellow-100 disabled:cursor-wait disabled:opacity-55"
                              >
                                {copy.showtimeSave}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                  {filteredCreatorItemsBase.length > CREATOR_ITEMS_PER_PAGE ? (
                    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/22 px-3 py-3 text-xs font-bold text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {filteredCreatorItemsBase.length === 0 ? 0 : creatorPageStartIndex + 1}-{creatorPageEndIndex} / {filteredCreatorItemsBase.length}
                        <span className="ml-2 text-zinc-600">{copy.perPageHint}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={safeCreatorPage <= 1}
                          onClick={() => setCreatorPage((page) => Math.max(1, page - 1))}
                          className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:border-cyan-200/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {copy.previousPage}
                        </button>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                          {safeCreatorPage} / {creatorTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={safeCreatorPage >= creatorTotalPages}
                          onClick={() => setCreatorPage((page) => Math.min(creatorTotalPages, page + 1))}
                          className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:border-cyan-200/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {copy.nextPage}
                        </button>
                      </span>
                    </div>
                  ) : null}
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
