"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock3, Search, Swords, Upload, UserRoundPlus, X } from "lucide-react";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { readFighterNameFromStorage, writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { IMAGE_UPLOAD_ACCEPT, imageContentType, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import { AUDIO_UPLOAD_MAX_BYTES_100MB, AUDIO_UPLOAD_MAX_LABEL_100MB, standardAudioContentType } from "@/lib/audio-upload-policy";
import { parseAudioMetadata } from "@/lib/audio-metadata";
import { sha256File } from "@/lib/file-hash";
import { buildFullSongStoragePath } from "@/lib/storage-path";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import {
  Q_CRASH_AUDIO_UPLOAD_ACCEPT,
  Q_CRASH_MAX_DURATION_MINUTES,
  Q_CRASH_MIN_DURATION_MINUTES,
  Q_CRASH_DURATION_PRESETS,
  isValidQCrashAudioFile,
  isValidQCrashSunoUrl,
  normalizeQCrashSunoUrl,
  qCrashDurationLabel,
  qCrashDurationMinutes,
  qCrashDisplayLang,
  type QCrashSourceType,
} from "@/lib/q-crash-rules";
import { saveFighterNameToProfile } from "@/lib/user-profile-fighter-name";
import { supabase } from "@/lib/supabase";

type CreatorOption = { id: string; name: string; avatarUrl: string | null };
type JoinCardPayload = {
  card?: { id: string; status: string; durationMinutes: number };
  works?: { A?: { queueId: string; songName: string; creatorName: string; genre: string; coverUrl?: string | null } };
  viewer?: { isFounder?: boolean; canJoin?: boolean };
  error?: string;
};

const AI_TOOLS = ["Suno", "Udio", "Lyria", "Mureka", "AceStudio", "MiniMax", "ElevenLabs", "其他"];
const MAX_Q_CRASH_COVER_BYTES = 10 * 1024 * 1024;
const MAX_LYRICS_CHARS = 8000;
const DURATION_LABELS: Record<number, { zh: string; en: string }> = {
  30: { zh: "30 分鐘", en: "30 min" },
  120: { zh: "2 小時", en: "2 hours" },
  720: { zh: "12 小時", en: "12 hours" },
  1440: { zh: "自訂", en: "Custom" },
};

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => finish(null);
    audio.src = objectUrl;
  });
}

function QCrashNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = qCrashDisplayLang(searchParams.get("lang"));
  const isZh = lang === "zh";
  const joinCardId = searchParams.get("join");
  const isJoin = Boolean(joinCardId);
  const [fighterName, setFighterName] = useState("");
  const [songName, setSongName] = useState("");
  const [genre, setGenre] = useState("");
  const [aiTool, setAiTool] = useState("Suno");
  const [sourceType, setSourceType] = useState<QCrashSourceType>("suno");
  const [sunoUrl, setSunoUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [audioMetaLine, setAudioMetaLine] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioReading, setAudioReading] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savedCoverUrl, setSavedCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [joinCard, setJoinCard] = useState<JoinCardPayload | null>(null);
  const [loadingCard, setLoadingCard] = useState(Boolean(joinCardId));
  const [creatorQuery, setCreatorQuery] = useState("");
  const [creatorResults, setCreatorResults] = useState<CreatorOption[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<CreatorOption | null>(null);
  const [searchingCreators, setSearchingCreators] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCustomDuration = durationMinutes === 1440 || !Q_CRASH_DURATION_PRESETS.slice(0, 3).includes(durationMinutes as 30 | 120 | 720);

  const returnPath = useMemo(() => {
    const params = new URLSearchParams({ lang });
    if (joinCardId) params.set("join", joinCardId);
    return `/battle/q-crash/new?${params.toString()}`;
  }, [joinCardId, lang]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const session = data.session;
      const storedName = readFighterNameFromStorage();
      if (storedName) setFighterName(storedName);
      if (session?.user.id) {
        const [{ data: fighter }, { data: profile }] = await Promise.all([
          supabase.from("fighter_profiles").select("display_name,song_cover_url").eq("id", session.user.id).maybeSingle(),
          supabase.from("user_profiles").select("fighter_name").eq("id", session.user.id).maybeSingle(),
        ]);
        if (!active) return;
        setFighterName((current) => current || fighter?.display_name || profile?.fighter_name || "");
        if (fighter?.song_cover_url) setSavedCoverUrl(fighter.song_cover_url);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!joinCardId) return;
    let active = true;
    setLoadingCard(true);
    void (async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/q-crash/${encodeURIComponent(joinCardId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as JoinCardPayload | null;
      if (!active) return;
      setJoinCard(payload);
      setLoadingCard(false);
      if (!response.ok) setError(payload?.error || (isZh ? "讀不到這張 Q Crash。" : "Could not load this Q Crash."));
      if (payload?.card?.durationMinutes) setDurationMinutes(payload.card.durationMinutes);
    })();
    return () => { active = false; };
  }, [isZh, joinCardId]);

  useEffect(() => {
    if (isJoin || creatorQuery.trim().length < 2 || selectedCreator) {
      setCreatorResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        setSearchingCreators(true);
        const response = await fetch(`/api/q-crash/creators?q=${encodeURIComponent(creatorQuery.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json().catch(() => null)) as { creators?: CreatorOption[] } | null;
        setCreatorResults(response.ok ? payload?.creators ?? [] : []);
        setSearchingCreators(false);
      })();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [creatorQuery, isJoin, selectedCreator]);

  const changeSourceType = (next: QCrashSourceType) => {
    setSourceType(next);
    setError(null);
    if (next === "suno") {
      setAudioFile(null);
      setAudioFileName("");
      setAudioMetaLine("");
      setAudioDuration(null);
    } else {
      setSunoUrl("");
    }
  };

  const handleCoverUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!isAllowedImageUploadFile(file)) {
      setError(isZh ? "封面只接受 JPG、PNG、WebP 或 GIF。" : "Cover art must be JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_Q_CRASH_COVER_BYTES) {
      setError(isZh ? "封面不能超過 10MB。" : "Cover art must be 10MB or smaller.");
      return;
    }
    setError(null);
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!isValidQCrashAudioFile(file)) {
      setError(isZh ? "Q Crash 音檔只接受 MP3 或 WAV。" : "Q Crash audio must be MP3 or WAV.");
      return;
    }
    if (file.size > AUDIO_UPLOAD_MAX_BYTES_100MB) {
      setError(isZh ? `歌曲不能超過 ${AUDIO_UPLOAD_MAX_LABEL_100MB}。` : `Audio must be ${AUDIO_UPLOAD_MAX_LABEL_100MB} or smaller.`);
      return;
    }
    setAudioReading(true);
    setError(null);
    try {
      let metadata = null;
      try {
        metadata = await parseAudioMetadata(file);
      } catch (metadataError) {
        console.warn("[q-crash] audio metadata read failed", metadataError);
      }
      const detectedTitle = metadata?.title?.trim() || metadata?.fallbackTitle || file.name.replace(/\.[^.]+$/, "");
      const detectedGenre = metadata?.genre?.trim();
      setSongName((current) => current || detectedTitle.slice(0, 100));
      if (detectedGenre && MUSIC_GENRE_OPTIONS.some((option) => option.value === detectedGenre)) setGenre(detectedGenre);
      if (metadata?.lyrics?.trim() && !lyricsText.trim()) {
        setLyricsText(metadata.lyrics.slice(0, MAX_LYRICS_CHARS));
        setLyricsFileName("embedded-lyrics");
      }
      setAudioFile(file);
      setAudioFileName(file.name);
      setAudioDuration(await readAudioDuration(file));
      setAudioMetaLine([metadata?.title?.trim(), metadata?.artist?.trim(), metadata?.album?.trim()].filter(Boolean).join(" / "));
    } catch (audioError) {
      console.error("[q-crash] audio metadata read failed", audioError);
      setError(isZh ? "歌曲讀取失敗，請重新選擇音檔。" : "Could not read this audio. Please choose it again.");
    } finally {
      setAudioReading(false);
    }
  };

  const handleLyricsUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setLyricsText(text.slice(0, MAX_LYRICS_CHARS));
      setLyricsFileName(file.name);
    } catch {
      setError(isZh ? "歌詞讀取失敗，請重新選擇文字檔。" : "Could not read the lyrics file. Please choose it again.");
    }
  };

  const uploadCover = async (file: File, userId: string) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/q-crash-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("battle-audio").upload(path, file, { upsert: false, contentType: imageContentType(file) });
    if (uploadError) throw uploadError;
    const { data, error: signedError } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError || !data?.signedUrl) throw signedError ?? new Error("cover signed URL missing");
    return data.signedUrl;
  };

  const uploadAudio = async (file: File, userId: string) => {
    const { storagePath } = buildFullSongStoragePath(userId, fighterName, songName || file.name, file.name);
    const audioSha256 = await sha256File(file);
    const { error: uploadError } = await supabase.storage.from("battle-audio").upload(storagePath, file, { upsert: false, contentType: standardAudioContentType(file) });
    if (uploadError) throw uploadError;
    return { storagePath, audioSha256 };
  };

  const submitTrack = async () => {
    setError(null);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) {
      rememberAuthNextPath(returnPath);
      router.push(`/auth?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (!fighterName.trim() || !songName.trim() || !genre) {
      setError(isZh ? "請填好創作者、歌名與音樂類型。" : "Add the creator, song title, and music style.");
      return;
    }
    if (!rightsConfirmed) {
      setError(isZh ? "請先確認你創作了這首歌，或已取得權利人許可。" : "Confirm that you created this track or have permission from the rights holder.");
      return;
    }
    if (!qCrashDurationMinutes(durationMinutes)) {
      setError(isZh ? "投票時間必須介於 30 分鐘與 3 天之間。" : "Voting time must be between 30 minutes and 3 days.");
      return;
    }
    const normalizedSunoUrl = sourceType === "suno" ? normalizeQCrashSunoUrl(sunoUrl) : null;
    if (sourceType === "suno" && (!normalizedSunoUrl || !isValidQCrashSunoUrl(sunoUrl))) {
      setError(isZh ? "請貼上合法的公開 HTTPS Suno 連結。" : "Paste a valid public HTTPS Suno link.");
      return;
    }
    if (sourceType === "upload" && !audioFile) {
      setError(isZh ? "請先選擇 MP3 或 WAV 音檔。" : "Choose an MP3 or WAV audio file first.");
      return;
    }
    if (isJoin && (!joinCard?.card?.id || !joinCard.works?.A?.queueId)) {
      setError(isZh ? "這張 Q Crash 還不能加入作品 B。" : "This Q Crash cannot accept Work B yet.");
      return;
    }
    if (isJoin && !joinCard?.viewer?.canJoin) {
      setError(isZh ? "這張邀請已失效、已被接受，或只開放給指定創作者。" : "This invite expired, was accepted, or belongs to another creator.");
      return;
    }

    setSubmitting(true);
    writeFighterNameToStorage(fighterName.trim());
    void saveFighterNameToProfile(session.user.id, fighterName.trim()).catch(() => null);
    let finalCoverUrl = savedCoverUrl;
    let uploadedAudioPath: string | null = null;
    let queueId: string | null = null;
    let queueCleanupHandled = false;
    try {
      if (coverFile) {
        setCoverUploading(true);
        finalCoverUrl = await uploadCover(coverFile, session.user.id);
        setCoverUploading(false);
      }
      let audioSha256: string | null = null;
      if (sourceType === "upload" && audioFile) {
        const uploaded = await uploadAudio(audioFile, session.user.id);
        uploadedAudioPath = uploaded.storagePath;
        audioSha256 = uploaded.audioSha256;
      }

      const queueStatus = isJoin && !joinCard?.viewer?.isFounder ? "searching" : "waiting_challenge";
      const queueInsert = {
        user_id: session.user.id,
        fighter_name: fighterName.trim(),
        genre,
        ai_tool: aiTool.trim() || null,
        lyrics: lyricsText.trim().slice(0, MAX_LYRICS_CHARS) || null,
        audio_path: uploadedAudioPath,
        audio_sha256: audioSha256,
        original_file_name: sourceType === "upload" ? audioFile?.name || `${songName.trim()}.mp3` : `${songName.trim()}.suno`,
        status: queueStatus,
        cover_url: finalCoverUrl,
        source_type: sourceType,
        source_url: sourceType === "suno" ? normalizedSunoUrl : uploadedAudioPath,
        title: songName.trim(),
        creator: fighterName.trim(),
        duration_seconds: audioDuration,
      };
      const { data: queue, error: queueError } = await supabase.from("battle_queue").insert(queueInsert).select("id").single<{ id: string }>();
      if (queueError || !queue?.id) throw queueError ?? new Error("queue insert returned no id");
      queueId = queue.id;

      const endpoint = isJoin ? `/api/q-crash/${encodeURIComponent(joinCardId!)}/join` : "/api/q-crash";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(isJoin ? { queueId: queue.id, rightsConfirmed: true } : { queueId: queue.id, durationMinutes, invitedUserId: selectedCreator?.id || null, rightsConfirmed: true }),
      });
      const payload = (await response.json().catch(() => null)) as { cardId?: string; error?: string } | null;
      if (!response.ok || !payload?.cardId) {
        await supabase.from("battle_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", queue.id).eq("user_id", session.user.id);
        if (uploadedAudioPath) await supabase.storage.from("battle-audio").remove([uploadedAudioPath]);
        queueCleanupHandled = true;
        throw new Error(payload?.error || (isZh ? "Q Crash 建立失敗。" : "Could not create Q Crash."));
      }
      queueCleanupHandled = true;
      router.push(`/battle/q-crash/${payload.cardId}?lang=${lang}`);
    } catch (submitError) {
      if (!queueCleanupHandled) {
        if (queueId) await supabase.from("battle_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", queueId).eq("user_id", session.user.id);
        if (uploadedAudioPath) await supabase.storage.from("battle-audio").remove([uploadedAudioPath]);
      }
      console.error("[q-crash] submit failed", submitError);
      setCoverUploading(false);
      setError(submitError instanceof Error ? submitError.message : (isZh ? "Q Crash 建立失敗，請稍後再試。" : "Could not submit this Q Crash. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(34,211,238,0.10),transparent_30%),#050505] px-4 pb-16 pt-24 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/battle?lang=${lang}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-sm font-black text-zinc-200 transition hover:border-orange-300/50 hover:text-white"><ArrowLeft size={17} />{isZh ? "回鬥歌場" : "Battle Pool"}</Link>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-cyan-100">FULL SONG BATTLE</span>
        </div>

        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-black tracking-[0.3em] text-orange-300">AIPOGER Q CRASH</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{isJoin ? (isZh ? "放入作品 B" : "Add Work B") : (isZh ? "建立 Q Crash" : "Create Q Crash")}</h1>
          <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-zinc-300">{isJoin ? (isZh ? "放入一首完整歌曲。兩首作品鎖定後立即開始投票，聽眾可以自由播放、暫停與快轉。" : "Add one full song. Voting starts when both works lock, and listeners can play, pause, and seek freely.") : (isZh ? "參賽者決定放哪一首歌；聽眾自己決定聽多久，再投出 Q Crash 的勝者。" : "Creators choose the track. Listeners choose how long to listen before voting for the Q Crash winner.")}</p>
        </header>

        {isJoin ? <section className="mt-7 rounded-[1.75rem] border border-orange-300/25 bg-black/55 p-5 shadow-[0_0_44px_rgba(249,115,22,0.08)]">{loadingCard ? <p className="text-sm font-bold text-zinc-400">{isZh ? "讀取作品 A…" : "Loading Work A..."}</p> : joinCard?.works?.A ? <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-4">{joinCard.works.A.coverUrl ? <img src={joinCard.works.A.coverUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-orange-200/20 object-cover" /> : null}<div className="min-w-0"><p className="text-[11px] font-black tracking-[0.22em] text-orange-300">WORK A LOCKED</p><h2 className="mt-2 truncate text-2xl font-black">{joinCard.works.A.songName}</h2><p className="mt-1 text-sm font-bold text-zinc-400">{joinCard.works.A.creatorName} · {joinCard.works.A.genre}</p></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200"><Clock3 className="mr-2 inline" size={16} />{qCrashDurationLabel(durationMinutes, isZh)}</div></div> : null}</section> : null}

        <section className="mt-6 grid gap-5 rounded-[2rem] border border-white/12 bg-black/55 p-5 backdrop-blur md:grid-cols-2 md:p-7">
          <div className="md:col-span-2"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "歌曲來源" : "TRACK SOURCE"}</span><div className="mt-2 grid gap-2 sm:grid-cols-2">{(["suno", "upload"] as QCrashSourceType[]).map((value) => <button key={value} type="button" onClick={() => changeSourceType(value)} className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-black transition ${sourceType === value ? "border-cyan-200 bg-cyan-300/15 text-cyan-50" : "border-white/12 bg-white/[0.04] text-zinc-400 hover:border-cyan-300/45"}`}><span className="block">{value === "suno" ? "Paste Suno Link" : "Upload Audio File"}</span><span className="mt-1 block text-[11px] font-bold text-zinc-500">{value === "suno" ? "公開連結，站內直接播放" : "MP3 / WAV · 完整音檔"}</span></button>)}</div></div>

          {sourceType === "suno" ? <label className="md:col-span-2"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">SUNO PUBLIC LINK</span><input value={sunoUrl} onChange={(event) => setSunoUrl(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-cyan-300/70" placeholder="https://suno.com/song/..." inputMode="url" /><p className="mt-2 text-xs font-bold text-zinc-500">{isZh ? "貼上後由 AIPOGER 站內播放，不必另傳 MP3。" : "AIPOGER plays the public Suno source in-app; no MP3 upload is needed."}</p></label> : <div className="md:col-span-2 rounded-[1.5rem] border border-orange-300/30 bg-orange-500/[0.07] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><span className="text-xs font-black tracking-[0.15em] text-orange-200">{isZh ? "完整音檔" : "FULL AUDIO FILE"}</span><p className="mt-1 text-xs font-bold leading-5 text-zinc-300">{isZh ? "只接受 MP3 或 WAV；不裁切、不產生片段。" : "MP3 or WAV only. The original full song is stored without cropping."}</p></div><label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 text-sm font-black text-black transition hover:bg-orange-300"><Upload size={16} />{audioReading ? (isZh ? "讀取中…" : "Reading…") : audioFileName ? (isZh ? "更換音檔" : "Change file") : (isZh ? "選擇 MP3/WAV" : "Choose MP3/WAV")}<input type="file" accept={Q_CRASH_AUDIO_UPLOAD_ACCEPT} className="hidden" onChange={(event) => void handleAudioUpload(event)} /></label></div>{audioFileName ? <div className="mt-3 rounded-xl border border-orange-200/20 bg-black/35 px-3 py-2 text-xs font-bold text-orange-50"><span className="block truncate">{audioFileName}{audioDuration ? ` · ${Math.round(audioDuration)}s` : ""}</span>{audioMetaLine ? <span className="mt-1 block truncate text-orange-100/65">{isZh ? "讀取到：" : "Detected: "}{audioMetaLine}</span> : null}</div> : null}</div>}

          <label className="block"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "創作者" : "CREATOR"}</span><input value={fighterName} onChange={(event) => setFighterName(event.target.value.slice(0, 60))} className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70" placeholder={isZh ? "你的創作者名稱" : "Creator name"} /></label>
          <label className="block"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "作品名稱" : "TRACK TITLE"}</span><input value={songName} onChange={(event) => setSongName(event.target.value.slice(0, 100))} className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70" placeholder={isZh ? "例如：夜色版本 B" : "Example: Neon Night Version B"} /></label>
          <label className="block"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "音樂類型" : "MUSIC STYLE"}</span><select value={genre} onChange={(event) => setGenre(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70"><option value="">{isZh ? "選擇類型" : "Choose a style"}</option>{MUSIC_GENRE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}</select></label>
          <label className="block"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "AI 工具" : "AI TOOL"}</span><select value={aiTool} onChange={(event) => setAiTool(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70">{AI_TOOLS.map((tool) => <option key={tool} value={tool}>{tool}</option>)}</select></label>

          <div className="md:col-span-2 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.05] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-black tracking-[0.15em] text-cyan-100">{isZh ? "作品封面（選填）" : "WORK COVER (OPTIONAL)"}</span><p className="mt-1 max-w-xl text-xs font-bold leading-5 text-zinc-400">{isZh ? "讓 A／B 對戰卡一眼分得出來；不提供時會使用你的預設作品封面。" : "Add cover art so the A/B matchup is easy to read. Without one, your default work cover is used."}</p></div><label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-cyan-200/45 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/20">{coverPreview || savedCoverUrl ? (isZh ? "更換封面" : "Change cover") : (isZh ? "上傳封面" : "Upload cover")}<input type="file" accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={handleCoverUpload} /></label></div>{coverPreview || savedCoverUrl ? <div className="mt-4 flex items-center gap-3"><img src={coverPreview || savedCoverUrl || ""} alt={isZh ? "作品封面預覽" : "Work cover preview"} className="h-16 w-16 rounded-xl border border-cyan-200/30 object-cover" /><button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setSavedCoverUrl(null); }} className="text-xs font-bold text-zinc-500 transition hover:text-red-300">{isZh ? "移除封面" : "Remove cover"}</button></div> : null}</div>

          {!isJoin ? <><div className="md:col-span-2"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "投票時間" : "VOTING WINDOW"}</span><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{Q_CRASH_DURATION_PRESETS.map((minutes) => <button key={minutes} type="button" onClick={() => setDurationMinutes(minutes)} className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${durationMinutes === minutes ? "border-orange-300 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,0.24)]" : "border-white/12 bg-white/[0.04] text-zinc-300 hover:border-orange-300/45"}`}>{DURATION_LABELS[minutes][lang]}</button>)}</div><p className="mt-2 text-xs font-bold text-zinc-500">{isZh ? "作品 B 鎖定後才開始計時；開始後不能延長或修改。" : "The clock starts only after Work B locks and cannot be extended."}</p></div><div className="relative md:col-span-2"><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "指定朋友（選填）" : "INVITE A CREATOR (OPTIONAL)"}</span>{selectedCreator ? <div className="mt-2 flex min-h-12 items-center justify-between rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4"><span className="font-black text-cyan-50">{selectedCreator.name}</span><button type="button" aria-label={isZh ? "移除指定創作者" : "Remove creator"} onClick={() => setSelectedCreator(null)}><X size={18} /></button></div> : <div className="relative mt-2"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={17} /><input value={creatorQuery} onChange={(event) => setCreatorQuery(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 pl-11 pr-4 font-bold outline-none transition focus:border-cyan-300/60" placeholder={isZh ? "搜尋創作者名稱；不指定就用分享連結邀請" : "Search creator name, or invite by link later"} /></div>}{creatorResults.length > 0 && !selectedCreator ? <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">{creatorResults.map((creator) => <button key={creator.id} type="button" onClick={() => { setSelectedCreator(creator); setCreatorQuery(""); setCreatorResults([]); }} className="flex min-h-12 w-full items-center gap-3 border-b border-white/8 px-4 text-left font-black transition last:border-0 hover:bg-white/[0.06]"><UserRoundPlus size={17} className="text-cyan-300" />{creator.name}</button>)}</div> : null}{searchingCreators ? <p className="mt-2 text-xs font-bold text-zinc-500">{isZh ? "搜尋中…" : "Searching..."}</p> : null}</div></> : null}

          <div className="md:col-span-2 rounded-[1.5rem] border border-white/12 bg-white/[0.03] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "歌詞（選填）" : "LYRICS (OPTIONAL)"}</span><p className="mt-1 text-xs font-bold text-zinc-500">{isZh ? "可直接貼上，或上傳 .txt／.lrc；歌曲播放時可在作品卡開啟。" : "Paste lyrics or upload a .txt/.lrc file; listeners can open them from the work card."}</p></div><label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/20 px-4 text-xs font-black text-zinc-200 transition hover:border-cyan-200/60 hover:text-white">{isZh ? "選擇歌詞檔" : "Choose lyrics file"}<input type="file" accept=".txt,.lrc,text/plain" className="hidden" onChange={(event) => void handleLyricsUpload(event)} /></label></div>{lyricsFileName ? <p className="mt-3 text-xs font-bold text-cyan-200">{isZh ? `已載入：${lyricsFileName}` : `Loaded: ${lyricsFileName}`}</p> : null}<textarea value={lyricsText} maxLength={MAX_LYRICS_CHARS} onChange={(event) => { setLyricsText(event.target.value.slice(0, MAX_LYRICS_CHARS)); if (lyricsFileName) setLyricsFileName(null); }} placeholder={isZh ? "貼上歌詞，或選擇文字檔上傳…" : "Paste lyrics, or upload a text file…"} className="mt-4 min-h-32 w-full resize-y rounded-2xl border border-white/12 bg-black/55 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/60" /></div>

          <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-yellow-200/20 bg-yellow-300/[0.05] px-4 py-4 text-sm font-bold leading-6 text-yellow-50"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-yellow-300" /><span>I confirm that I created this track or have permission from the rights holder.</span></label>
          {!isJoin && isCustomDuration ? <div className="mt-[-0.75rem] rounded-2xl border border-orange-300/25 bg-orange-500/[0.06] p-4 md:col-span-2"><label className="block"><span className="text-xs font-black text-orange-100">{isZh ? "自訂投票分鐘數（30 分鐘至 3 天）" : "Custom voting minutes (30 minutes to 3 days)"}</span><input type="number" min={Q_CRASH_MIN_DURATION_MINUTES} max={Q_CRASH_MAX_DURATION_MINUTES} step={1} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-2xl border border-orange-300/40 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300" /><p className="mt-2 text-xs font-bold text-zinc-500">{isZh ? "可用整分鐘設定，最長 3 天（4320 分鐘）。" : "Set whole minutes, up to 3 days (4,320 minutes)."}</p></label></div> : null}
        </section>

        {error ? <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-bold leading-5 text-zinc-500">{isZh ? "送出後會保留整首歌曲；聽眾可以自行決定聽多久。" : "The full song is kept after submission; listeners decide how long to listen."}</p><button type="button" disabled={loadingCard || coverUploading || audioReading || submitting} onClick={() => void submitTrack()} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 text-base font-black text-white shadow-[0_0_34px_rgba(249,115,22,0.28)] transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-50"><Swords size={20} />{coverUploading ? (isZh ? "封面上傳中…" : "Uploading cover…") : submitting ? (isZh ? "送出中…" : "Submitting…") : isJoin ? (isZh ? "送出作品 B" : "Submit Work B") : (isZh ? "建立 Full Song Battle" : "Create Full Song Battle")}</button></div>
        {sourceType === "suno" && sunoUrl && isValidQCrashSunoUrl(sunoUrl) ? <p className="mt-4 text-right text-xs font-bold text-zinc-600">{isZh ? "Suno 公開連結 · 站內播放來源" : "Suno public link · in-app playback source"}</p> : null}
      </div>
    </main>
  );
}

export default function QCrashNewPage() {
  return <Suspense fallback={<main className="min-h-screen bg-black p-8 pt-28 text-white">Q Crash...</main>}><QCrashNewContent /></Suspense>;
}
