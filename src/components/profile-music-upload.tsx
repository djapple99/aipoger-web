"use client";
import {audioAssetId} from "@/lib/audio-asset-ref";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { inspectMp3File, mp3UploadError } from "@/lib/mp3-upload-policy";
import { musicPlayer, getMusicPlayerState } from "@/lib/music-player-store";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { parseAudioMetadata } from "@/lib/audio-metadata";
import { sha256File } from "@/lib/file-hash";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { normalizeYouTubeUrl } from "@/lib/youtube-url";
import { creditCopy } from "@/lib/credit-copy";
import { saveCreatorSubmission, type CreatorSubmissionDb } from "@/lib/creator-submission";
import { useCreatorUploadQuota } from "@/lib/use-creator-upload-quota";
import { creatorUploadLimitReached } from "@/lib/creator-upload-quota";
import GenreSuggestion, { genreCopy } from "@/components/genre-suggestion";
import SafetyNotice from "@/components/safety-notice";
import { IMAGE_UPLOAD_ACCEPT, imageContentType, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import { LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS, limitListenBarDisplayText } from "@/lib/listen-bar-field-limits";
import { LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES, LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL, isAllowedListenBarAudioFile, isListenBarStorageSizeLimitError, listenBarAudioContentType, listenBarAudioSizeLabel, uploadListenBarAudioFile } from "@/lib/listen-bar-upload-policy";
import { LISTEN_BAR_AUDIO_BUCKET, LISTEN_BAR_COVER_BUCKET, type ListenBarTrackRow } from "@/lib/listen-bar";
type PublicUploadForm = { title: string; artist: string; aiTool: string; genre: string; album: string; description: string; youtubeUrl: string };
const initialPublicUploadForm: PublicUploadForm = { title: "", artist: "", aiTool: "", genre: "", album: "", description: "", youtubeUrl: "" };
function barText(lang: string, zh: string, en: string, ja: string, ko: string) {
  if (lang === "ja") return ja;
  if (lang === "ko") return ko;
  if (lang === "en") return en;
  return zh;
}
function isMissingListenBarSubmissionColumn(error: unknown): boolean {
  const code = error && typeof error === "object" ? (error as { code?: string }).code : "";
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return code === "PGRST204" || /schema cache|column .* does not exist|could not find .* column/i.test(text);
}

function isDuplicateAudioHashError(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /audio_sha256|duplicate key value|23505/i.test(text);
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || `listen-${Date.now()}`;
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}
function listenBarShortFieldHint(isZh: boolean) {
  return isZh ? "中文 12 字內；英文約 24 字元" : "12 CJK chars; about 24 English characters";
}

function listenBarDescriptionHint(isZh: boolean) {
  return isZh ? "中文 16 字內；英文約 32 字元" : "16 CJK chars; about 32 English characters";
}

export default function ProfileMusicUpload({ userId, creatorDefaultName, onSubmitted, workKind = "single" }: { userId: string; creatorDefaultName: string; onSubmitted: () => void; workKind?: "single" | "album" }) {
  const { lang, t } = useI18n(); const isZh = lang === "zh";
  const [publicUploadForm, setPublicUploadForm] = useState<PublicUploadForm>({ ...initialPublicUploadForm, artist: limitListenBarDisplayText(creatorDefaultName, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS) });
  const [publicAudioFile, setPublicAudioFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    setRightsConfirmed(false);
    if (!publicAudioFile) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(publicAudioFile); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [publicAudioFile]);
  const [publicCoverFile, setPublicCoverFile] = useState<File | null>(null);
  const [publicLyricsText, setPublicLyricsText] = useState("");
  const [publicUploadBusy, setPublicUploadBusy] = useState(false);
  const [publicUploadMessage, setPublicUploadMessage] = useState("");
  const [publicUploadError, setPublicUploadError] = useState("");
  const [privateReady, setPrivateReady] = useState(false);
  const publicAudioSelectionRef = useRef(0);
  const uploadLock = useRef(false);
  const pendingSubmission = useRef<Record<string,unknown>|null>(null);
  const [confirmedCredit,setConfirmedCredit] = useState(false);
  const uploadGenre = publicUploadForm.genre.trim();
  const uploadSubmissionPhase = "public" as const;
  const { quota: uploadQuota, refresh: refreshUploadQuota } = useCreatorUploadQuota(userId);
  const creatorWeeklyUploadLimitFull = creatorUploadLimitReached(uploadQuota);
  const publicUploadBlocked = !privateReady || (!pendingSubmission.current && creatorWeeklyUploadLimitFull);
  const publicUploadBlockedMessage = !privateReady ? barText(lang, "請等作品庫讀取完成後再投稿。", "Wait for your works to load before submitting.", "作品の読み込み後に投稿してください。", "작품 목록을 불러온 후 제출하세요.")
    : barText(lang, "額外投稿需60 Credit，待追回欠額補足前不能花點。", "Extra submissions need 60 Credit and no outstanding debt.", "追加投稿には60 Creditが必要です。未回収額を補うまで使用できません。", "추가 제출에는60 Credit이 필요합니다. 미회수 금액을 채우기 전에는 사용할 수 없습니다.");
  const uploadPhaseNoticeTitle = publicUploadBlocked ? publicUploadBlockedMessage : barText(lang, "投稿後直接公開", "Public immediately", "投稿後すぐ公開", "업로드 후 즉시 공개");
  const uploadPhaseNoticeBody = barText(lang, "作品公開三個月，加入電台、探索與人氣榜。", "Works appear in radio, Explore and the popularity chart for three months.", "作品は3か月間、ラジオ・Explore・人気ランキングに掲載されます。", "작품은 3개월간 라디오, Explore, 인기 차트에 공개됩니다.");
  useEffect(() => {
    let active = true; setPrivateReady(false);
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user.id !== userId) return;
        const response = await fetch("/api/listen-bar/my-tracks", { cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.tracks)) throw new Error("Could not read works");
        if (active) setPrivateReady(true);
      } catch { if (active) setPublicUploadError(barText(lang, "作品庫讀取失敗，請重新整理。", "Your works could not be loaded. Refresh this page.", "作品を読み込めません。ページを更新してください。", "작품을 불러올 수 없습니다. 페이지를 새로고침하세요.")); }
    })();
    return () => { active = false; publicAudioSelectionRef.current += 1; };
  }, [userId, lang]);
  const handlePublicAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPublicUploadError("");
    if (!file) return;
    const selection = ++publicAudioSelectionRef.current;
    if (!isAllowedListenBarAudioFile(file)) {
      setPublicAudioFile(null);
      setPublicUploadError(isZh ? "請使用 MP3（最高 320 kbps、30MB） 音檔。" : "Use MP3 (up to 320 kbps, 30MB) audio.");
      return;
    }
    if (file.size > LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES) {
      setPublicAudioFile(null);
      setPublicUploadError(
        isZh
          ? `音檔太大：${listenBarAudioSizeLabel(file)}。傷心酒吧新投稿上限是 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，請改用 MP3 · ≤320 kbps 壓縮格式。`
          : `Audio file too large: ${listenBarAudioSizeLabel(file)}. New Bar Heartbreak submissions are capped at ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}; use MP3 (up to 320 kbps, 30MB).`,
      );
      return;
    }
    try { await inspectMp3File(file); } catch (error) { if (selection === publicAudioSelectionRef.current) { setPublicAudioFile(null); setPublicUploadError(mp3UploadError(error instanceof Error ? error.message : 'INVALID_MP3',lang)); } return; }
    if (selection !== publicAudioSelectionRef.current) return;
    setPublicAudioFile(file);

    const metadata = await parseAudioMetadata(file).catch(() => null);
    if (!metadata || selection !== publicAudioSelectionRef.current) return;
    setPublicUploadForm((current) => ({
      ...current,
      title: current.title.trim() || metadata.title || metadata.fallbackTitle,
      artist: limitListenBarDisplayText(
        current.artist.trim() && current.artist !== creatorDefaultName ? current.artist : metadata.artist || current.artist,
        LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
      ),
      album: limitListenBarDisplayText(current.album.trim() || metadata.album || current.album, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
    }));

    if (metadata.cover && !publicCoverFile) {
      setPublicCoverFile(new File([metadata.cover.blob], metadata.cover.fileName, { type: metadata.cover.mimeType }));
    }
    if (metadata.lyrics && !publicLyricsText.trim()) {
      setPublicLyricsText(metadata.lyrics.slice(0, 12000));
    }
  };

  const handlePublicLyricsFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    try {
      setPublicLyricsText((await file.text()).slice(0, 12000));
    } catch (error) {
      console.warn("[listen-bar] lyric file read failed", error);
      setPublicUploadError(isZh ? "歌詞檔讀取失敗，請改用貼上文字。" : "Could not read lyric file. Paste the lyrics instead.");
    }
  };

  const handlePublicCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setPublicUploadError("");
    if (file && !isAllowedImageUploadFile(file)) {
      setPublicCoverFile(null);
      setPublicUploadError(t("avatar_invalid_type"));
      return;
    }
    setPublicCoverFile(file);
  };

  const uploadPublicAsset = async (bucket: string, file: File, contentTypeFallback: string) => {
    if (!userId) throw new Error(isZh ? "請先登入再投稿。" : "Sign in before submitting.");
    const path = `${userId}/community/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: contentTypeFallback,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const uploadPublicAudioAsset = async (file: File) => {
    if (!userId) throw new Error(isZh ? "請先登入再投稿。" : "Sign in before submitting.");
    const path = `${userId}/community/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const verifiedPath = await uploadListenBarAudioFile(
      LISTEN_BAR_AUDIO_BUCKET,
      path,
      file,
      listenBarAudioContentType(file),
      (percent) => {
        setPublicUploadMessage(isZh ? `音檔上傳中 ${percent}%` : `Uploading audio ${percent}%`);
      },
    );
    return verifiedPath;
  };

  const cleanupPublicUploadAssets = async (paths: { audioPath: string | null; coverPath: string | null }) => {
    if (!paths.audioPath && !paths.coverPath) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch("/api/listen-bar/cleanup-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(paths),
        });
        if (response.ok) return;
        console.warn("[listen-bar] server upload cleanup failed", await response.text().catch(() => response.statusText));
      }
    } catch (error) {
      console.warn("[listen-bar] server upload cleanup failed", error);
    }

    const cleanupTasks: Promise<unknown>[] = [];
    if (paths.audioPath && !audioAssetId(paths.audioPath)) cleanupTasks.push(supabase.storage.from(LISTEN_BAR_AUDIO_BUCKET).remove([paths.audioPath]));
    if (paths.coverPath) cleanupTasks.push(supabase.storage.from(LISTEN_BAR_COVER_BUCKET).remove([paths.coverPath]));
    const results = await Promise.allSettled(cleanupTasks);
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("[listen-bar] upload cleanup failed", result.reason);
      } else {
        const error = (result.value as { error?: unknown } | null)?.error;
        if (error) console.warn("[listen-bar] upload cleanup failed", error);
      }
    });
  };

  const handlePublicUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publicUploadBusy || uploadLock.current) return;
    if (!rightsConfirmed) return;
    setPublicUploadError("");
    setPublicUploadMessage("");
    if (!userId) {
      setPublicUploadError(isZh ? "請先登入後再投稿傷心酒吧 Bar Heartbreak。" : "Please sign in before submitting to Bar Heartbreak.");
      return;
    }
    if (!publicAudioFile) {
      return;
    }
    if (!publicUploadForm.title.trim()) {
      setPublicUploadError(isZh ? "請輸入歌曲名稱。" : "Enter a track title.");
      return;
    }
    if (!MUSIC_GENRE_OPTIONS.some(option => option.value === publicUploadForm.genre)) {
      setPublicUploadError(t("listen_bar_genre_required"));
      return;
    }
    if (publicUploadBlocked || (!pendingSubmission.current && !!uploadQuota && uploadQuota.used >= 3 && !uploadQuota.unlimited && !confirmedCredit)) {
      setPublicUploadError(publicUploadBlockedMessage);
      return;
    }

    let normalizedYouTubeUrl: string | null = null;
    try {
      normalizedYouTubeUrl = normalizeYouTubeUrl(publicUploadForm.youtubeUrl);
    } catch (urlError) {
      setPublicUploadError(String((urlError as { message?: string })?.message ?? urlError));
      return;
    }

    uploadLock.current = true;
    setPublicUploadBusy(true);
    let audioPath: string | null = null;
    let coverPath: string | null = null;
    let uncertain = false;
    try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session || auth.session.user.id !== userId) { setPublicUploadError(barText(lang, "登入狀態已改變，請重新整理作品庫。", "Your sign-in changed. Refresh your works.", "ログインが変わりました。作品一覧を更新してください。", "로그인이 변경되었습니다. 작품 목록을 새로고침하세요.")); return; }

      if (!pendingSubmission.current) {
      const quota = await refreshUploadQuota();
      if (!quota) {
        setPublicUploadError(barText(lang, "暫時無法確認上傳額度，請稍後再試。", "Could not check your upload allowance. Try again shortly.", "投稿枠を確認できません。しばらくして再試行してください。", "업로드 한도를 확인할 수 없습니다. 잠시 후 다시 시도하세요."));
        return;
      }
      if (creatorUploadLimitReached(quota) || (!quota.unlimited && quota.used >= 3 && !confirmedCredit)) {
        setPublicUploadError(barText(lang, "額外投稿需60 Credit，待追回欠額補足前不能花點。", "Extra submissions need 60 Credit and no outstanding debt.", "追加投稿には60 Creditと未回収額なしが必要です。", "추가 제출에는60 Credit과 미회수 금액 없음이 필요합니다."));
        return;
      }
      const audioSha256 = await sha256File(publicAudioFile);
      const duplicateCheck = await supabase
        .from("listen_bar_tracks")
        .select("id,title,artist")
        .eq("audio_sha256", audioSha256)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle<{ id: string; title: string | null; artist: string | null }>();
      if (duplicateCheck.error && !isMissingListenBarSubmissionColumn(duplicateCheck.error)) {
        throw duplicateCheck.error;
      }
      if (duplicateCheck.data?.id) {
        setPublicUploadError(
          isZh
            ? `這個音檔已經在傷心酒吧裡了：${duplicateCheck.data.title || "未命名歌曲"}。請換另一首歌上傳。`
            : `This exact audio file is already in Bar Heartbreak: ${duplicateCheck.data.title || "Untitled"}. Upload another track.`,
        );
        return;
      }

      const duration = await readAudioDuration(publicAudioFile);
      audioPath = await uploadPublicAudioAsset(publicAudioFile);
      coverPath = publicCoverFile
        ? await uploadPublicAsset(LISTEN_BAR_COVER_BUCKET, publicCoverFile, imageContentType(publicCoverFile))
        : null;

      const insertPayload = {
        id: crypto.randomUUID(),
        credit_submission_confirmed: confirmedCredit,
        work_kind: workKind,
        title: publicUploadForm.title.trim(),
        artist: limitListenBarDisplayText(
          publicUploadForm.artist.trim() || creatorDefaultName || (isZh ? "創作者" : "Creator"),
          LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
        ),
        ai_tool: limitListenBarDisplayText(publicUploadForm.aiTool.trim() || "AI Music", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
        genre: publicUploadForm.genre.trim(),
        mood: limitListenBarDisplayText(
          publicUploadForm.album.trim() || (isZh ? "創作者投稿" : "Creator Submission"),
          LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
        ),
        description: limitListenBarDisplayText(publicUploadForm.description.trim(), LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS) || null,
        youtube_url: normalizedYouTubeUrl,
        duration_seconds: duration > 0 ? duration : null,
        audio_path: audioPath,
        cover_path: coverPath,
        audio_sha256: audioSha256,
        lyrics: publicLyricsText.trim() || null,
        sort_order: 1000,
        is_active: true,
        source: "community",
        is_featured_official: false,
        bar_phase: uploadSubmissionPhase,
        created_by: userId,
      };

      pendingSubmission.current = insertPayload;
      }
      const { data: latestAuth } = await supabase.auth.getSession();
      if (latestAuth.session?.user.id !== userId) throw new Error("Sign-in changed during upload.");
      const insertResult = await saveCreatorSubmission(supabase as unknown as CreatorSubmissionDb, pendingSubmission.current!);
      uncertain = insertResult.uncertain;
      const insertedTrackRow = insertResult.data as unknown as ListenBarTrackRow | null;
      if (insertResult.error || !insertedTrackRow) throw insertResult.error ?? new Error("Submission result is unconfirmed");
      pendingSubmission.current = null; setConfirmedCredit(false);
      window.dispatchEvent(new CustomEvent("aipoger:credit"));
      void logAnalyticsEvent({ eventType: "upload_song", songId: isUuid(insertedTrackRow.id) ? insertedTrackRow.id : null,
        pagePath: "/profile", source: "creator_submission", metadata: { title: insertedTrackRow.title, genre: insertedTrackRow.genre } });
      onSubmitted();
      publicAudioSelectionRef.current += 1;
      setPublicAudioFile(null);
      setPublicCoverFile(null);
      setPublicLyricsText("");
      setPublicUploadForm({
        ...initialPublicUploadForm,
        artist: limitListenBarDisplayText(creatorDefaultName, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
      });
      setPublicUploadMessage(barText(lang,
        `上傳完成！已加入 ${publicUploadForm.genre} 輪播。`,
        `Upload complete. Your track joined ${publicUploadForm.genre} airplay.`,
        `投稿完了！${publicUploadForm.genre}の再生に加わりました。`,
        `업로드 완료! ${publicUploadForm.genre} 재생에 추가되었습니다.`));
    } catch (submitError) {
      if (!uncertain) { pendingSubmission.current = null; void cleanupPublicUploadAssets({ audioPath, coverPath }); }
      setPublicUploadError(
        uncertain ? barText(lang,"投稿結果尚待確認，請按確認投稿重試；同一件不會重複扣點。", "Submission is unconfirmed. Retry to recover the same work without another debit.", "投稿結果を確認中です。同じ作品は再送しても追加の使用はありません。", "제출 결과 확인 중입니다. 재시도해도 같은 작품에 중복 차감하지 않습니다.")
          : /CREDIT_|CREATOR_WEEKLY_UPLOAD_LIMIT/.test(String((submitError as { message?: string })?.message ?? submitError))
          ? barText(lang,
            "本期免費額度已滿。額外投稿需60 Credit、沒有待追回欠額，並確認扣點。",
            "Free allowance used. An extra submission needs 60 Credit, no outstanding debt and spending confirmation.",
            "追加投稿には60 Credit、未回収額なし、使用の同意が必要です。",
            "추가 제출에는60 Credit, 미회수 금액 없음, 사용 동의가 필요합니다.")
          : isDuplicateAudioHashError(submitError)
          ? isZh
            ? "這個音檔已經上傳過了，請換另一首歌。"
            : "This exact audio file has already been uploaded. Please choose another track."
          : isListenBarStorageSizeLimitError(submitError)
            ? isZh
              ? `音檔被雲端儲存限制擋下。請確認檔案低於 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，若仍失敗請稍後再試。`
              : `The audio was blocked by cloud storage limits. Keep it under ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL} and try again.`
          : /^(MP3_|INVALID_MP3|AUDIO_)/.test(String((submitError as {message?:string})?.message ?? "")) ? mp3UploadError(String((submitError as {message?:string}).message),lang)
          : isZh
            ? `投稿失敗：${String((submitError as { message?: string })?.message ?? submitError)}。`
            : `Submission failed: ${String((submitError as { message?: string })?.message ?? submitError)}.`,
      );
    } finally {
      uploadLock.current = false;
      setPublicUploadBusy(false);
      void refreshUploadQuota();
    }
  };
  return <div className="mt-4">
    {!uploadQuota?.unlimited ? <p className="text-sm text-zinc-300">{creditCopy(lang).allowance} · Credit {uploadQuota?.balance ?? "—"}{uploadQuota?.debt ? ` · ${creditCopy(lang).debt} ${uploadQuota.debt}` : ""}</p> : null}
    {uploadQuota && !uploadQuota.unlimited && uploadQuota.used >= 3 ? <label className="flex gap-2 my-3"><input type="checkbox" checked={confirmedCredit} onChange={e => setConfirmedCredit(e.target.checked)} />{creditCopy(lang).consent}</label> : null}
    <SafetyNotice kind="upload" compact className="mb-3" />
    {publicUploadMessage ? <p role="status" className="mb-3 text-sm text-orange-100">{publicUploadMessage}</p> : null}
    {publicUploadError ? <p role="alert" className="mb-3 text-sm text-red-200">{publicUploadError}</p> : null}
    {previewUrl ? <details className="mb-3 min-w-0 rounded border border-white/25 p-3">
      <summary className="cursor-pointer text-sm">{barText(lang,"預覽作品（選看）","Preview (optional)","プレビュー（任意）","미리 보기(선택)")}</summary>
      <audio controls preload="metadata" src={previewUrl} className="mt-2 w-full min-w-0" onPlaying={() => { if (getMusicPlayerState().playing) musicPlayer?.toggle(); }} />
    </details> : null}
              <form onSubmit={handlePublicUploadSubmit}><fieldset disabled={publicUploadBusy} className="grid gap-3">
                <label
                  className={`group relative flex min-h-[5.9rem] cursor-pointer overflow-hidden rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    publicAudioFile
                      ? "border-rose-200/68 bg-rose-500/[0.1] shadow-[0_0_42px_rgba(255,49,80,0.3),inset_0_0_26px_rgba(255,49,80,0.06)] ring-1 ring-rose-100/14 hover:border-rose-100/85 hover:shadow-[0_0_54px_rgba(255,49,80,0.42),inset_0_0_28px_rgba(255,49,80,0.08)]"
                      : "border-rose-200/68 bg-[radial-gradient(circle_at_20%_12%,rgba(255,49,80,0.38),transparent_42%),rgba(255,60,84,0.1)] shadow-[0_0_42px_rgba(255,49,80,0.3),inset_0_0_26px_rgba(255,196,92,0.055)] ring-1 ring-rose-100/14 hover:border-rose-100/90 hover:shadow-[0_0_56px_rgba(255,49,80,0.44),inset_0_0_30px_rgba(255,196,92,0.075)]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),transparent_36%,rgba(255,255,255,0.025))]" />
                  <span className="relative z-10 flex w-full items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-orange-200/75">
                        {barText(lang, "音訊檔案", "AUDIO FILE", "音声ファイル", "오디오 파일")}
                      </span>
                      <span className="mt-1 block truncate text-lg font-black leading-tight text-white">
                        {publicAudioFile?.name ?? barText(
                          lang,
                          `音檔 MP3 · ≤320 kbps，上限 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 · ≤320 kbps, max ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 · ≤320 kbps、最大 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 · ≤320 kbps, 최대 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {barText(lang, "點一下選歌，自動偵測歌名", "Tap to choose; title auto-detects", "タップして選曲すると曲名を自動検出します", "눌러서 곡을 선택하면 제목을 자동 감지합니다")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${publicAudioFile ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" : "border-orange-200/35 bg-black/30 text-orange-100"}`}>
                      {publicAudioFile
                        ? barText(lang, "已選取", "Selected", "選択済み", "선택됨")
                        : barText(lang, "必填", "Required", "必須", "필수")}
                    </span>
                  </span>
                  <input type="file" disabled={publicUploadBusy} accept={LISTEN_BAR_AUDIO_UPLOAD_ACCEPT} onChange={handlePublicAudioChange} className="hidden" />
                </label>

                <p className="text-xs leading-relaxed text-zinc-400">{genreCopy(lang).privacy}</p>
                <GenreSuggestion file={publicAudioFile} userId={userId} lang={lang} selectedGenre={publicUploadForm.genre} disabled={publicUploadBusy}
                  onAccept={(genre) => setPublicUploadForm(current => ({ ...current, genre }))} label={t} />

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={publicUploadForm.title}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder={barText(lang, "歌曲名稱", "Track Title", "曲名", "곡 제목")}
                    maxLength={80}
                    required
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.artist}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      artist: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "創作者名稱（12字內）", "Creator Name (24 chars max)", "クリエイター名（24文字以内）", "크리에이터 이름(24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.aiTool}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      aiTool: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "AI 工具（12字內）", "AI Tool (24 chars max)", "AIツール（24文字以内）", "AI 도구(24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <select
                    value={publicUploadForm.genre}
                    disabled={publicUploadBusy}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, genre: event.target.value }))}
                    required
                    aria-label={t("genre")}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  >
                    <option value="">{t("genre_placeholder")}</option>
                    {MUSIC_GENRE_OPTIONS.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {t(genre.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {uploadGenre && (
                  <div
                    className={`rounded-xl border px-3 py-3 ${
                      publicUploadBlocked
                        ? "border-red-300/30 bg-red-500/10"
                        : "border-cyan-200/24 bg-cyan-300/[0.075]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-xs font-black ${
                          publicUploadBlocked
                            ? "text-red-100"
                            : "text-cyan-50"
                        }`}
                      >
                        {uploadPhaseNoticeTitle}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-5 text-zinc-400">
                      {uploadPhaseNoticeBody}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-zinc-300">
                      {uploadQuota?.unlimited ? barText(lang, "Owner · 投稿不限數量", "Owner · Unlimited submissions", "Owner · 投稿数の制限なし", "Owner · 제출 수 제한 없음") : barText(lang,
                        `免費額度 ${uploadQuota ? `${Math.min(uploadQuota.used, 3)}/3` : userId ? "確認中" : "登入後查看"}。每期從第一首成功投稿起算168小時，三件免費，之後每件60 Credit；刪除不退額度。`,
                        `Free uploads ${uploadQuota ? `${Math.min(uploadQuota.used, 3)}/3` : userId ? "checking" : "sign in to view"}. 3 free submissions per 168 hours (one week), then 60 Credit each. Deletion does not restore the allowance.`,
                        `無料投稿枠 ${uploadQuota ? `${Math.min(uploadQuota.used, 3)}/3` : userId ? "確認中" : "ログインして確認"}。最初の投稿成功から168時間、3曲まで無料。その後は1曲60 Credit。削除しても枠は戻りません。`,
                        `무료 제출 ${uploadQuota ? `${Math.min(uploadQuota.used, 3)}/3` : userId ? "확인 중" : "로그인 후 확인"}. 첫 제출 성공부터168시간 동안3곡 무료, 이후 곡당60 Credit. 삭제해도 무료 한도는 복구되지 않습니다.`)}
                    </p>
                  </div>
                )}

                <details><summary className="cursor-pointer text-sm">{barText(lang,"封面、歌詞與更多資料（選填）","Artwork, lyrics and more (optional)","画像・歌詞・追加情報（任意）","표지, 가사, 추가 정보(선택)")}</summary><div className="mt-2"><div className="mb-2 grid gap-2 sm:grid-cols-2">                  <input
                    value={publicUploadForm.album}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      album: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "專輯名稱（12字內，選填）", "Album Name (24 chars max)", "アルバム名（任意・24文字以内）", "앨범명(선택, 24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.description}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      description: limitListenBarDisplayText(event.target.value, LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "一句歌曲介紹（16字內，選填）", "One-Line Description (32 chars max)", "曲の紹介（任意・32文字以内）", "한 줄 곡 소개(선택, 32자 이내)")}
                    maxLength={LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS}
                    title={listenBarDescriptionHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    type="url"
                    value={publicUploadForm.youtubeUrl}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, youtubeUrl: event.target.value.slice(0, 300) }))}
                    placeholder={barText(lang, "YouTube MV 連結（選填）", "YouTube MV Link (optional)", "YouTube MVリンク（任意）", "YouTube MV 링크(선택)")}
                    maxLength={300}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18 sm:col-span-2"
                  />
</div><div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/[0.055] px-3 text-xs font-black text-cyan-100 transition hover:border-cyan-100/50">
                    {publicCoverFile?.name ?? barText(lang, "封面可選", "Optional Cover", "カバー画像（任意）", "커버 이미지(선택)")}
                    <input
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      onChange={handlePublicCoverChange}
                      className="hidden"
                    />
                  </label>
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-orange-300/24 bg-orange-500/10 px-3 text-xs font-black text-orange-100 transition hover:border-orange-200/70">
                    {barText(lang, "歌詞 .txt/.lrc", "Lyrics .txt/.lrc", "歌詞 .txt/.lrc", "가사 .txt/.lrc")}
                    <input type="file" accept=".txt,.lrc,text/plain" onChange={handlePublicLyricsFileChange} className="hidden" />
                  </label>
                </div>

                <textarea
                  value={publicLyricsText}
                  onChange={(event) => setPublicLyricsText(event.target.value.slice(0, 12000))}
                  rows={3}
                  placeholder={barText(lang, "貼上歌詞，LRC 時間碼可同步播放...", "Paste lyrics; LRC timestamps can sync...", "歌詞を貼り付け。LRCタイムコードで同期できます…", "가사를 붙여 넣으세요. LRC 타임코드로 동기화할 수 있습니다…")}
                  className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/62 px-3 py-2 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                />
</div></details>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} />{barText(lang,"這是我的作品，或已取得投稿授權。","I own the work or have permission to submit it.","自作または投稿の許可を得た作品です。","직접 만든 작품이거나 제출 허가를 받았습니다.")}</label>
                <button
                  type="submit"
                  disabled={publicUploadBusy || publicUploadBlocked || (!pendingSubmission.current && !!uploadQuota && uploadQuota.used >= 3 && !uploadQuota.unlimited && !confirmedCredit) || !publicAudioFile || !rightsConfirmed}
                  className="h-12 rounded-xl bg-orange-500 px-5 text-sm font-black tracking-[0.12em] text-black shadow-[0_0_28px_rgba(255,106,0,0.24)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/[0.045] disabled:text-zinc-500 disabled:shadow-none"
                >
                  {publicUploadBusy
                    ? barText(lang, "上傳中...", "Uploading...", "投稿中…", "업로드 중…")
                    : creatorWeeklyUploadLimitFull
                        ? barText(lang, "本期額度已滿", "Allowance used", "今期の上限に到達", "이번 기간 한도 소진")
                        : barText(lang, "確認投稿", "Confirm submission", "投稿を確定", "제출 확인")}
                </button>
              </fieldset></form>
  </div>;
}
