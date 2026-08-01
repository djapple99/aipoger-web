"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock3, Search, Swords, UserRoundPlus, X } from "lucide-react";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { readFighterNameFromStorage, writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { IMAGE_UPLOAD_ACCEPT, imageContentType, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { Q_CRASH_DURATION_PRESETS, qCrashDisplayLang } from "@/lib/q-crash-rules";
import { supabase } from "@/lib/supabase";

type CreatorOption = { id: string; name: string; avatarUrl: string | null };
type JoinCardPayload = {
  card?: {
    id: string;
    status: string;
    durationMinutes: number;
  };
  works?: {
    A?: {
      queueId: string;
      songName: string;
      creatorName: string;
      genre: string;
      coverUrl?: string | null;
    };
  };
  viewer?: {
    isFounder?: boolean;
    canJoin?: boolean;
  };
  error?: string;
};

const AI_TOOLS = ["Suno", "Udio", "Lyria", "Mureka", "AceStudio", "MiniMax", "ElevenLabs", "其他"];
const MAX_Q_CRASH_COVER_BYTES = 10 * 1024 * 1024;
const DURATION_LABELS: Record<number, { zh: string; en: string }> = {
  30: { zh: "30 分鐘", en: "30 min" },
  120: { zh: "2 小時", en: "2 hours" },
  360: { zh: "6 小時", en: "6 hours" },
  1440: { zh: "24 小時", en: "24 hours" },
};

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savedCoverUrl, setSavedCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [joinCard, setJoinCard] = useState<JoinCardPayload | null>(null);
  const [loadingCard, setLoadingCard] = useState(Boolean(joinCardId));
  const [creatorQuery, setCreatorQuery] = useState("");
  const [creatorResults, setCreatorResults] = useState<CreatorOption[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<CreatorOption | null>(null);
  const [searchingCreators, setSearchingCreators] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      active = false;
    };
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
      if (!response.ok) {
        setError(payload?.error || (isZh ? "讀不到這張 Q Crash。" : "Could not load this Q Crash."));
        return;
      }
      if (payload?.works?.A?.genre) setGenre(payload.works.A.genre);
      if (payload?.card?.durationMinutes) setDurationMinutes(payload.card.durationMinutes);
    })();
    return () => {
      active = false;
    };
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
        const response = await fetch(`/api/q-crash/creators?q=${encodeURIComponent(creatorQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => null)) as { creators?: CreatorOption[] } | null;
        setCreatorResults(response.ok ? payload?.creators ?? [] : []);
        setSearchingCreators(false);
      })();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [creatorQuery, isJoin, selectedCreator]);

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const uploadCover = async (file: File, userId: string) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/q-crash-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("battle-audio").upload(path, file, {
      upsert: false,
      contentType: imageContentType(file),
    });
    if (uploadError) throw uploadError;
    const { data, error: signedError } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError || !data?.signedUrl) throw signedError ?? new Error("cover signed URL missing");
    return data.signedUrl;
  };

  const continueToCut = async () => {
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
    if (isJoin && (!joinCard?.card?.id || !joinCard.works?.A?.queueId)) {
      setError(isZh ? "這張 Q Crash 還不能加入作品 B。" : "This Q Crash cannot accept Work B yet.");
      return;
    }
    if (isJoin && !joinCard?.viewer?.canJoin) {
      setError(isZh ? "這張邀請已失效、已被接受，或只開放給指定創作者。" : "This invite expired, was accepted, or belongs to another creator.");
      return;
    }

    writeFighterNameToStorage(fighterName.trim());
    let finalCoverUrl = savedCoverUrl;
    if (coverFile) {
      setCoverUploading(true);
      try {
        finalCoverUrl = await uploadCover(coverFile, session.user.id);
      } catch (coverError) {
        console.error("[q-crash] cover upload failed", coverError);
        setError(isZh ? "封面上傳失敗，請稍後再試。" : "Cover upload failed. Try again.");
        setCoverUploading(false);
        return;
      }
      setCoverUploading(false);
    }
    const params = new URLSearchParams({
      lang,
      fighterName: fighterName.trim(),
      songName: songName.trim(),
      genre,
      aiTool,
      instantPairing: "invite",
    });
    if (finalCoverUrl) params.set("coverUrl", finalCoverUrl);
    if (isJoin && joinCard?.card?.id && joinCard.works?.A?.queueId) {
      params.set("qCrashCardId", joinCard.card.id);
      params.set("challengeEntryId", joinCard.works.A.queueId);
      if (joinCard.viewer?.isFounder) params.set("qCrashSelf", "1");
    } else {
      params.set("qCrashCreate", "1");
      params.set("qCrashDurationMinutes", String(durationMinutes));
      if (selectedCreator?.id) params.set("qCrashInviteeUserId", selectedCreator.id);
    }
    router.push(`/battle/hook-cut?${params.toString()}`);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(34,211,238,0.10),transparent_30%),#050505] px-4 pb-16 pt-24 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/battle?lang=${lang}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-sm font-black text-zinc-200 transition hover:border-orange-300/50 hover:text-white"
          >
            <ArrowLeft size={17} />
            {isZh ? "回鬥歌場" : "Battle Pool"}
          </Link>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-cyan-100">
            ASYNC 60S DROP
          </span>
        </div>

        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-black tracking-[0.3em] text-orange-300">AIPOGER Q CRASH</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            {isJoin ? (isZh ? "放入作品 B" : "Lock Work B") : (isZh ? "建立 Q Crash" : "Create Q Crash")}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-zinc-300">
            {isJoin
              ? isZh
                ? "切出你的 60 秒 Drop。兩首作品鎖定後立即開始投票，雙方共用同一張卡。"
                : "Cut your 60-second Drop. Voting starts when both works lock, and both creators share one card."
              : isZh
                ? "兩首 60 秒 Drop，不用等人到齊，讓大家在自己的時間決定哪首歌勝出。"
                : "Two 60-second Drops. No synchronized meetup—listeners decide in their own time."}
          </p>
        </header>

        {isJoin ? (
          <section className="mt-7 rounded-[1.75rem] border border-orange-300/25 bg-black/55 p-5 shadow-[0_0_44px_rgba(249,115,22,0.08)]">
            {loadingCard ? (
              <p className="text-sm font-bold text-zinc-400">{isZh ? "讀取作品 A…" : "Loading Work A..."}</p>
            ) : joinCard?.works?.A ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {joinCard.works.A.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={joinCard.works.A.coverUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-orange-200/20 object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.22em] text-orange-300">WORK A LOCKED</p>
                    <h2 className="mt-2 truncate text-2xl font-black">{joinCard.works.A.songName}</h2>
                    <p className="mt-1 text-sm font-bold text-zinc-400">
                      {joinCard.works.A.creatorName} · {joinCard.works.A.genre}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200">
                  <Clock3 className="mr-2 inline" size={16} />
                  {DURATION_LABELS[durationMinutes]?.[lang]}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 grid gap-5 rounded-[2rem] border border-white/12 bg-black/55 p-5 backdrop-blur md:grid-cols-2 md:p-7">
          <label className="block">
            <span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "創作者" : "CREATOR"}</span>
            <input
              value={fighterName}
              onChange={(event) => setFighterName(event.target.value.slice(0, 60))}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70"
              placeholder={isZh ? "你的創作者名稱" : "Creator name"}
            />
          </label>

          <div className="md:col-span-2 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-black tracking-[0.15em] text-cyan-100">{isZh ? "作品封面（選填）" : "WORK COVER (OPTIONAL)"}</span>
                <p className="mt-1 max-w-xl text-xs font-bold leading-5 text-zinc-400">
                  {isZh ? "上傳一張封面，讓 A／B 對戰卡一眼分得出來；不提供時會使用你的預設作品封面。" : "Add cover art so the A/B matchup is easy to read. Without one, your default work cover is used."}
                </p>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-cyan-200/45 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/20">
                {coverPreview || savedCoverUrl ? (isZh ? "更換封面" : "Change cover") : (isZh ? "上傳封面" : "Upload cover")}
                <input type="file" accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={handleCoverUpload} />
              </label>
            </div>
            {coverPreview || savedCoverUrl ? (
              <div className="mt-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview || savedCoverUrl || ""} alt={isZh ? "作品封面預覽" : "Work cover preview"} className="h-16 w-16 rounded-xl border border-cyan-200/30 object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); setSavedCoverUrl(null); }}
                  className="text-xs font-bold text-zinc-500 transition hover:text-red-300"
                >
                  {isZh ? "移除封面" : "Remove cover"}
                </button>
              </div>
            ) : null}
          </div>
          <label className="block">
            <span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "作品名稱" : "WORK TITLE"}</span>
            <input
              value={songName}
              onChange={(event) => setSongName(event.target.value.slice(0, 100))}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70"
              placeholder={isZh ? "例如：夜色版本 B" : "Example: Neon Night Version B"}
            />
          </label>
          <label className="block">
            <span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "音樂類型" : "MUSIC STYLE"}</span>
            <select
              value={genre}
              disabled={isJoin}
              onChange={(event) => setGenre(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              <option value="">{isZh ? "選擇類型" : "Choose a style"}</option>
              {MUSIC_GENRE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.value}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "AI 工具" : "AI TOOL"}</span>
            <select
              value={aiTool}
              onChange={(event) => setAiTool(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 px-4 font-bold outline-none transition focus:border-orange-300/70"
            >
              {AI_TOOLS.map((tool) => <option key={tool} value={tool}>{tool}</option>)}
            </select>
          </label>

          {!isJoin ? (
            <>
              <div className="md:col-span-2">
                <span className="text-xs font-black tracking-[0.15em] text-zinc-400">{isZh ? "投票時間" : "VOTING WINDOW"}</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Q_CRASH_DURATION_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDurationMinutes(minutes)}
                      className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${
                        durationMinutes === minutes
                          ? "border-orange-300 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,0.24)]"
                          : "border-white/12 bg-white/[0.04] text-zinc-300 hover:border-orange-300/45"
                      }`}
                    >
                      {DURATION_LABELS[minutes][lang]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs font-bold text-zinc-500">
                  {isZh ? "作品 B 鎖定後才開始計時；開始後不能延長或修改。" : "The clock starts only after Work B locks and cannot be extended."}
                </p>
              </div>

              <div className="relative md:col-span-2">
                <span className="text-xs font-black tracking-[0.15em] text-zinc-400">
                  {isZh ? "指定朋友（選填）" : "INVITE A CREATOR (OPTIONAL)"}
                </span>
                {selectedCreator ? (
                  <div className="mt-2 flex min-h-12 items-center justify-between rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4">
                    <span className="font-black text-cyan-50">{selectedCreator.name}</span>
                    <button type="button" aria-label={isZh ? "移除指定創作者" : "Remove creator"} onClick={() => setSelectedCreator(null)}>
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />
                    <input
                      value={creatorQuery}
                      onChange={(event) => setCreatorQuery(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-white/15 bg-black/70 pl-11 pr-4 font-bold outline-none transition focus:border-cyan-300/60"
                      placeholder={isZh ? "搜尋創作者名稱；不指定就用分享連結邀請" : "Search creator name, or invite by link later"}
                    />
                  </div>
                )}
                {creatorResults.length > 0 && !selectedCreator ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
                    {creatorResults.map((creator) => (
                      <button
                        key={creator.id}
                        type="button"
                        onClick={() => {
                          setSelectedCreator(creator);
                          setCreatorQuery("");
                          setCreatorResults([]);
                        }}
                        className="flex min-h-12 w-full items-center gap-3 border-b border-white/8 px-4 text-left font-black transition last:border-0 hover:bg-white/[0.06]"
                      >
                        <UserRoundPlus size={17} className="text-cyan-300" />
                        {creator.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchingCreators ? <p className="mt-2 text-xs font-bold text-zinc-500">{isZh ? "搜尋中…" : "Searching..."}</p> : null}
              </div>
            </>
          ) : null}
        </section>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-5 text-zinc-500">
            {isZh ? "下一步會開啟 Drop 裁切器；只能使用 60 秒以內的重點段落。" : "Next: cut the key section in the Drop editor, up to 60 seconds."}
          </p>
          <button
            type="button"
            disabled={loadingCard || coverUploading}
            onClick={() => void continueToCut()}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 text-base font-black text-white shadow-[0_0_34px_rgba(249,115,22,0.28)] transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-50"
          >
            <Swords size={20} />
            {coverUploading ? (isZh ? "封面上傳中…" : "Uploading cover…") : isJoin ? (isZh ? "切出作品 B Drop" : "Cut Work B Drop") : (isZh ? "切出作品 A Drop" : "Cut Work A Drop")}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function QCrashNewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-8 pt-28 text-white">Q Crash...</main>}>
      <QCrashNewContent />
    </Suspense>
  );
}
