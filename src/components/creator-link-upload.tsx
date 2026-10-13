"use client";
import { useRef, useState } from "react";
import { useCreatorUploadQuota } from "@/lib/use-creator-upload-quota";
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
}: {
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
    [played, setPlayed] = useState(false),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  const version = useRef(0),
    lock = useRef(false);
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
    return text(
      (
        {
          AUTH_REQUIRED: "登入狀態已改變，請重新登入。",
          UNSUPPORTED_LINK:
            "請貼上 YouTube 影片、Suno 歌曲或 Spotify 單曲的完整連結。",
          SOURCE_UNAVAILABLE: "來源暫時無法讀取，請確認作品可公開開啟後重試。",
          PREVIEW_EXPIRED: "預覽已過期，請重新預覽。",
          LINK_ALREADY_SUBMITTED: "這個作品連結已投稿過，請從我的作品編輯。",
          UPLOAD_LIMIT: "本期投稿或此曲風額度已滿，刪除不退額度。",
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
          PREVIEW_EXPIRED: "Preview expired. Preview again.",
          LINK_ALREADY_SUBMITTED: "Already submitted. Edit the existing work.",
          UPLOAD_LIMIT:
            "Upload allowance is full; deletion does not refund it.",
          GENRE_REQUIRED: "Choose a genre.",
        } as Record<string, string>
      )[code] ?? "Could not submit. Your input is retained; retry shortly.",
    );
  };
  const load = async () => {
    if (lock.current) return;
    const v = ++version.current;
    lock.current = true;
    setBusy(true);
    setPreview(null);
    setPlayed(false);
    setRights(false);
    setError("");
    setSuccess(false);
    try {
      const p = await api({ action: "preview", url });
      if (v !== version.current) return;
      setPreview(p.preview);
      setTitle(p.preview.title);
      setArtist(name || p.preview.artist);
      setMv(false);
    } catch (e) {
      if (v === version.current) setError(humanError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (lock.current || !preview || !played || !rights || !genre) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api({
        action: "submit",
        previewToken: preview.token,
        title,
        artist,
        aiTool: tool,
        genre,
        isMusicVideo: mv,
        confirmedPlayback: played,
        confirmedRights: rights,
      });
      setSuccess(true);
      setPreview(null);
      setUrl("");
      setPlayed(false);
      setRights(false);
      void refresh();
      onSubmitted();
    } catch (e) {
      setError(humanError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className={styles.linkForm}>
      <p className={styles.allowance}>
        {text("本期已用", "Used", "今期使用", "기간 사용")}{" "}
        {quota ? `${quota.used} / ${quota.limit}` : "—"}
      </p>
      <label>
        {text("作品連結", "Work link", "作品リンク", "작품 링크")}
        <div className={styles.urlRow}>
          <input
            type="url"
            value={url}
            disabled={busy}
            placeholder="https://…"
            onChange={(e) => {
              version.current++;
              setUrl(e.target.value);
              setPreview(null);
              setPlayed(false);
              setRights(false);
              setSuccess(false);
            }}
          />
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={() => void load()}
          >
            {busy
              ? text("讀取中…", "Loading…", "読み込み中…", "불러오는 중…")
              : text("預覽", "Preview", "プレビュー", "미리 보기")}
          </button>
        </div>
      </label>
      <p className={styles.hint}>
        YouTube · Suno · Spotify{" "}
        {text("單曲連結", "single-track links", "単曲リンク", "단일 곡 링크")}
      </p>
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
          <ExternalMusicPlayer
            media={preview.media}
            title={preview.title}
            onPlaying={() => setPlayed(true)}
            onError={() => {
              setPlayed(false);
              setError(
                text(
                  "預覽播放失敗，請檢查連結或重新預覽。",
                  "Preview failed. Check the link and retry.",
                  "再生できません。リンクを確認して再試行してください。",
                  "재생 실패. 링크를 확인하고 다시 시도하세요.",
                ),
              );
            }}
          />
          <p className={styles.hint}>
            {played
              ? text(
                  preview.media.provider === "youtube"
                    ? "已可播放"
                    : "已由你確認可播放",
                  "Playback confirmed",
                  "再生確認済み",
                  "재생 확인 완료",
                )
              : text(
                  "請先在上方預覽中試播。",
                  "Try playback in the preview above.",
                  "上のプレビューで再生を確認してください。",
                  "위 미리 보기에서 재생해 보세요.",
                )}
            {preview.media.provider === "spotify"
              ? text(
                  " · 試聽長度由 Spotify 決定。",
                  " · Spotify determines playback length.",
                  " · 再生時間はSpotifyが決定します。",
                  " · 재생 길이는 Spotify가 결정합니다.",
                )
              : null}
          </p>
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
          {preview.media.provider !== "youtube" ? (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={played}
                disabled={busy}
                onChange={(e) => setPlayed(e.target.checked)}
              />
              {text(
                "我已在預覽中確認可播放",
                "I confirmed playback in the preview",
                "プレビューで再生を確認しました",
                "미리 보기에서 재생을 확인했습니다",
              )}
            </label>
          ) : null}
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
          <button
            type="button"
            className={styles.primary}
            disabled={
              busy ||
              !played ||
              !rights ||
              !genre ||
              !title.trim() ||
              !artist.trim() ||
              (quota !== null && quota.used >= quota.limit)
            }
            onClick={() => void submit()}
          >
            {busy
              ? text("投稿中…", "Submitting…", "投稿中…", "제출 중…")
              : text(
                  "確認投稿",
                  "Confirm submission",
                  "投稿を確定",
                  "제출 확인",
                )}
          </button>
        </>
      ) : null}
      <p className={styles.hint}>
        {text(
          "確認後才公開；預覽不計投稿次數。",
          "Published only after confirmation; preview uses no allowance.",
          "確認後に公開。プレビューは投稿枠を消費しません。",
          "확인 후 공개됩니다. 미리 보기는 한도를 사용하지 않습니다.",
        )}
      </p>
    </div>
  );
}
