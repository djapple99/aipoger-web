"use client";
import { useEffect, useRef, useState } from "react";
import { creditCopy } from "@/lib/credit-copy";
import { useCreatorUploadQuota } from "@/lib/use-creator-upload-quota";
import { creatorUploadLimitReached } from "@/lib/creator-upload-quota";
import { creatorText } from "@/lib/creator-center-copy";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import type { LinkPreview } from "@/lib/server-external-music";
import ExternalMusicPlayer from "@/components/external-music-player";
import styles from "@/components/creator-center.module.css";
export default function CreatorLinkUpload({
  userId,
  name,
  onSubmitted,
  workKind = "single",
}: {
  workKind?: "single" | "album";
  userId: string;
  name: string;
  onSubmitted: () => void;
}) {
  const { lang, t } = useI18n();
  const text = (zh: string, en: string, ja?: string, ko?: string) =>
    creatorText(lang, zh, en, ja, ko);
  const [url, setUrl] = useState(""),
    [preview, setPreview] = useState<LinkPreview | null>(null),
    [title, setTitle] = useState(""),
    [artist, setArtist] = useState(name),
    [tool, setTool] = useState(""),
    [genre, setGenre] = useState(""),
    [mv, setMv] = useState(false),
    [showPreview, setShowPreview] = useState(false),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  const [description, setDescription] = useState("");
  const [retry, setRetry] = useState(0);
  const version = useRef(0),
    lock = useRef(false);
  const [confirmedCredit, setConfirmedCredit] = useState(false);
  const submissionId = useRef<string | null>(null);
  const { quota, refresh } = useCreatorUploadQuota(userId);
  const api = async (body: object) => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id !== userId) throw new Error("AUTH_REQUIRED");
    const response = await fetch("/api/creator-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const p = await response.json();
    if (!response.ok) throw new Error(p.error ?? "LINK_FAILED");
    return p;
  };
  const humanError = (value: unknown) => {
    const code = value instanceof Error ? value.message : "";
    if (/^CREDIT_/.test(code)) return text("額外投稿需60 Credit、沒有待追回欠額，並確認扣點。", "Extra submissions need 60 Credit, no outstanding debt and spending confirmation.", "追加投稿には60 Credit、未回収額なし、使用の同意が必要です。", "추가 제출에는60 Credit, 미회수 금액 없음, 사용 동의가 필요합니다.");
    return text(
      (
        {
          AUTH_REQUIRED: "登入狀態已改變，請重新登入。",
          UNSUPPORTED_LINK:
            "請貼上 YouTube 影片、Suno 歌曲或 Spotify 單曲的完整連結。",
          SOURCE_UNAVAILABLE: "來源暫時無法讀取，請確認作品可公開開啟後重試。",
          PREVIEW_EXPIRED: "連結資料已過期，請按重新讀取。",
          LINK_ALREADY_SUBMITTED: "這個作品連結已投稿過，請從我的作品編輯。",
          UPLOAD_LIMIT: "本期 7 天三首投稿額度已滿，刪除不退額度。",
          GENRE_REQUIRED: "請選擇曲風。",
        } as Record<string, string>
      )[code] ?? "投稿未完成，輸入已保留，請稍後重試。",
      (
        {
          AUTH_REQUIRED: "Sign-in changed. Sign in again.",
          UNSUPPORTED_LINK:
            "Use a full YouTube video, Suno song or Spotify track link.",
          SOURCE_UNAVAILABLE:
            "Source unavailable. Check public access and retry.",
          PREVIEW_EXPIRED: "Link details expired. Reload the link.",
          LINK_ALREADY_SUBMITTED: "Already submitted. Edit the existing work.",
          UPLOAD_LIMIT:
            "Upload allowance is full; deletion does not refund it.",
          GENRE_REQUIRED: "Choose a genre.",
        } as Record<string, string>
      )[code] ?? "Could not submit. Your input is retained; retry shortly.",
    );
  };
  useEffect(() => {
    const v = ++version.current;
    let active = true;
    setPreview(null); setShowPreview(false); setRights(false); setMv(false);
    setError(""); if (url.trim()) setSuccess(false); submissionId.current = null;
    if (!url.trim()) { setBusy(false); return; }
    setBusy(true);
    const timer = window.setTimeout(() => {
      void api({ action: "preview", url }).then(p => {
        if (!active || v !== version.current) return;
        setPreview(p.preview); setTitle(p.preview.title); setArtist(name || p.preview.artist);
      }).catch(e => { if (active && v === version.current) setError(humanError(e)); })
        .finally(() => { if (active && v === version.current) setBusy(false); });
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
    // Request identity is tied to the source and signed-in account, not render-time helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, userId, retry]);
  const submit = async () => {
    if (lock.current || busy || !preview || !rights || !genre || !title.trim() || !artist.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api({
        action: "submit",
        workKind, description,
        requestId: submissionId.current ??= crypto.randomUUID(),
        confirmedCredit,
        previewToken: preview.token,
        title,
        artist,
        aiTool: tool,
        genre,
        isMusicVideo: mv,
        confirmedRights: rights,
      });
      submissionId.current = null; setConfirmedCredit(false);
      window.dispatchEvent(new CustomEvent("aipoger:credit"));
      setSuccess(true);
      setPreview(null);
      setUrl("");
      setShowPreview(false);
      setRights(false);
      void refresh();
      onSubmitted();
    } catch (e) {
      setError(humanError(e));
    } finally {
      lock.current = false;
      setBusy(false);
      void refresh();
    }
  };
  return (
    <div className={styles.linkForm}>
      <p className={styles.allowance}>
        {quota?.unlimited ? text("Owner · 投稿不限數量", "Owner · Unlimited submissions", "Owner · 投稿数の制限なし", "Owner · 제출 수 제한 없음") : <>{text("免費額度已用", "Free allowance used", "無料枠使用", "무료 한도 사용")}{" "}{quota ? `${Math.min(quota.used, 3)} / ${quota.limit}` : "—"} · {text("每168小時（一週）三件免費，之後每件60 Credit", "3 free per 168 hours (one week), then 60 Credit each", "168時間（1週間）に3件無料、その後は1件60 Credit", "168시간(1주일)에3건 무료, 이후 건당60 Credit")}</>}
      </p>
      {!quota?.unlimited ? <p>{creditCopy(lang).allowance} · Credit {quota?.balance ?? "—"}{quota?.debt ? ` · ${creditCopy(lang).debt} ${quota.debt}` : ""}</p> : null}
      {quota && !quota.unlimited && quota.used >= 3 ? <label><input type="checkbox" checked={confirmedCredit} onChange={e => setConfirmedCredit(e.target.checked)} /> {creditCopy(lang).consent}</label> : null}
      <label>
        <span>
          {text("作品連結", "Work link", "作品リンク", "작품 링크")}
          <small className={styles.sourceHint}>YouTube · Suno · Spotify</small>
        </span>
        <div className={styles.urlRow}>
          <input
            type="url"
            value={url}
            disabled={lock.current}
            placeholder="https://…"
            onChange={(e) => {
              version.current++;
              setUrl(e.target.value);
              setPreview(null);
              setShowPreview(false);
              setRights(false);
              setSuccess(false);
            }}
          />
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={() => setRetry(value => value + 1)}
          >
            {busy
              ? text("讀取中…", "Loading…", "読み込み中…", "불러오는 중…")
              : text("重新讀取", "Reload", "再読込", "다시 읽기")}
          </button>
        </div>
      </label>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status">
          {text(
            "投稿成功！作品已加入我的作品。",
            "Submitted. The work is now in My Works.",
            "投稿完了。「作品」に追加されました。",
            "제출 완료. 내 작품에 추가되었습니다.",
          )}
        </p>
      ) : null}
      {preview ? (
        <>
          <button type="button" className={styles.secondary} onClick={() => setShowPreview(value => !value)}>
            {showPreview ? text("收起預覽", "Hide preview", "プレビューを閉じる", "미리 보기 닫기") : text("預覽作品（選看）", "Preview (optional)", "プレビュー（任意）", "미리 보기(선택)")}
          </button>
          {showPreview ? <ExternalMusicPlayer media={preview.media} title={preview.title} /> : null}
          <div className={styles.previewIdentity}>
            <div className={styles.previewName}>
              <b title={title}>{title}</b>
              <small>
                {artist} ·{" "}
                {preview.media.provider === "youtube"
                  ? "YouTube"
                  : preview.media.provider === "suno"
                    ? "Suno"
                    : "Spotify"}
              </small>
            </div>
          </div>
          {preview.media.provider === "spotify" ? (
            <p className={styles.hint}>
              {text(
                "試聽長度由 Spotify 決定。",
                "Spotify determines playback length.",
                "再生時間はSpotifyが決定します。",
                "재생 길이는 Spotify가 결정합니다.",
              )}
            </p>
          ) : null}
          {workKind === "album" ? <label>{text("專輯介紹", "Album introduction", "アルバム紹介", "앨범 소개")}<textarea value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} disabled={busy} /></label> : null}
          <details className={styles.previewEdit}>
            <summary>
              {text(
                "編輯歌名與創作者",
                "Edit title and creator",
                "曲名と作者を編集",
                "제목과 창작자 수정",
              )}
            </summary>
            <div className={styles.fieldPair}>
              <label>
                {text("歌名", "Title", "曲名", "제목")}
                <input
                  value={title}
                  maxLength={160}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                {text("創作者", "Creator", "作者", "창작자")}
                <input
                  value={artist}
                  maxLength={24}
                  onChange={(e) => setArtist(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
          </details>
          <div className={styles.fieldPair}>
            <label>
              {text(
                "曲風（必選）",
                "Genre (required)",
                "ジャンル（必須）",
                "장르(필수)",
              )}
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                disabled={busy}
              >
                <option value="">
                  {text(
                    "請選擇曲風",
                    "Choose genre",
                    "ジャンルを選択",
                    "장르 선택",
                  )}
                </option>
                {MUSIC_GENRE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {t(g.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text("AI 工具", "AI tool", "AIツール", "AI 도구")}
              <input
                value={tool}
                maxLength={24}
                onChange={(e) => setTool(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>
          {preview.media.provider === "youtube" ? (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={mv}
                disabled={busy}
                onChange={(e) => setMv(e.target.checked)}
              />
              {text(
                "含 MV，同時顯示於 MV 頁",
                "Include in MV with the same work ID",
                "MVページにも同じ作品として掲載",
                "같은 작품으로 MV 페이지에도 표시",
              )}
            </label>
          ) : null}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={rights}
              disabled={busy}
              onChange={(e) => setRights(e.target.checked)}
            />
            {text(
              "這是我的作品，或已取得投稿授權。",
              "I own this work or have permission to submit it.",
              "自分の作品、または投稿許可を得た作品です。",
              "내 작품이거나 제출 허가를 받은 작품입니다.",
            )}
          </label>
        </>
      ) : null}
          <button
            type="button"
            className={styles.primary}
            disabled={
              busy || !preview ||
              !rights ||
              !genre ||
              !title.trim() ||
              !artist.trim() ||
              creatorUploadLimitReached(quota) || (!!quota && quota.used >= 3 && !quota.unlimited && !confirmedCredit)
            }
            onClick={() => void submit()}
          >
            {busy
              ? lock.current
                ? text("投稿中…", "Submitting…", "投稿中…", "제출 중…")
                : text("讀取連結中…", "Reading link…", "リンクを読み込み中…", "링크를 불러오는 중…")
              : text(
                  "確認投稿",
                  "Confirm submission",
                  "投稿を確定",
                  "제출 확인",
                )}
          </button>
      <p className={styles.hint}>
        {text(
          "確認投稿後才公開；預覽與試播皆為選用。",
          "Published after submission; preview and playback are optional.",
          "投稿確定後に公開。プレビューと試聴は任意です。",
          "제출 확인 후 공개됩니다. 미리 보기와 재생은 선택입니다.",
        )}
      </p>
    </div>
  );
}
