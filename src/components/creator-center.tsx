/* eslint-disable @next/next/no-img-element -- Original creator artwork and avatars have dynamic source dimensions. */
"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Coins,
  Heart,
  MessageCircleMore,
  Music2,
  Play,
  Pencil,
  X,
} from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import { creditCopy, creditReason } from "@/lib/credit-copy";
import { creatorText } from "@/lib/creator-center-copy";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { musicPlayer, getMusicPlayerState } from "@/lib/music-player-store";
import { parseExternalMusic } from "@/lib/external-music";
import { albumCopy } from "@/lib/album-copy";
import { albumPath, type WorkKind } from "@/lib/album";
const AlbumBuilder = dynamic(() => import("@/components/album-builder"));
import type { CreatorSummary, CreatorWork } from "@/lib/creator-center";
const CreatorLinkUpload = dynamic(() => import("@/components/creator-link-upload"));
const ProfileMusicUpload = dynamic(() => import("@/components/profile-music-upload"));
const ExternalMusicPlayer = dynamic(() => import("@/components/external-music-player"));
import dynamic from "next/dynamic";
const HomeWorkFeedback = dynamic(() => import("@/components/home-work-feedback"));
const AccountNotifications = dynamic(() => import("@/components/account-notifications"));
import DeferredSection from "@/components/deferred-section";
import styles from "@/components/creator-center.module.css";
type Favorite = {
  id: string;
  title: string;
  artist?: string | null;
  genre?: string | null;
  coverUrl?: string | null;
  audioUrl?: string | null;
  externalUrl?: string | null;
};
type Props = {
  userId: string | null;
  name: string;
  avatar: string | null;
  favorites: Favorite[];
  savedChoiceCount: number;
  editingWorkId: string | null;
  privateLoading: boolean;
  privateError: string;
  legacy: ReactNode;
  onManage: (id: string) => void;
  onLegacy: (kind: string) => void;
  onSubmitted: () => void;
};
export default function CreatorCenter(props: Props) {
  const [data, setData] = useState<CreatorSummary | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const { userId } = props;
  useEffect(() => { const refreshCredit = () => setVersion(v => v + 1); window.addEventListener("aipoger:credit", refreshCredit); return () => window.removeEventListener("aipoger:credit", refreshCredit); }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    setLoading(true);
    setError("");
    if (!userId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    void (async () => {
      try {
        const { data: d } = await supabase.auth.getSession();
        if (d.session?.user.id !== userId) throw new Error("AUTH_REQUIRED");
        const r = await fetch("/api/creator-center", {
          headers: { Authorization: `Bearer ${d.session.access_token}` },
          cache: "no-store",
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "LOAD_FAILED");
        if (active) setData(p);
      } catch {
        if (active) setError("LOAD_FAILED");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, version]);
  const refresh = () => {
    setVersion((v) => v + 1);
    props.onSubmitted();
  };
  return (
    <CreatorCenterLayout
      {...props}
      data={data}
      loading={loading}
      error={error}
      onRefresh={refresh}
    />
  );
}
export function CreatorCenterLayout({
  data,
  loading,
  error,
  onRefresh,
  ...props
}: Props & {
  data: CreatorSummary | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const { lang } = useI18n();
  const tx = (zh: string, en: string, ja?: string, ko?: string) =>
    creatorText(lang, zh, en, ja, ko);
  const albums = albumCopy(lang);
  const [kind, setKind] = useState<WorkKind>("single");
  const [tab, setTab] = useState("works"),
    [source, setSource] = useState("link"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [dialog, setDialog] = useState<string | null>(null),
    [comment, setComment] = useState<CreatorWork | null>(null),
    [external, setExternal] = useState<CreatorWork | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const openChallenge = () => setDialog("works");
    const revealChallenge = () => {
      if (window.location.hash === "#pending-ai-music-challenges") openChallenge();
    };
    revealChallenge();
    window.addEventListener("hashchange", revealChallenge);
    window.addEventListener("aipoger:open-pending-challenges", openChallenge);
    return () => {
      window.removeEventListener("hashchange", revealChallenge);
      window.removeEventListener("aipoger:open-pending-challenges", openChallenge);
    };
  }, []);
  useEffect(() => {
    if (dialog || external) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog, external]);
  useEffect(() => {
    setPage(1);
  }, [query, status, tab]);
  useEffect(() => {
    if (dialog === "edit" && !props.editingWorkId) setDialog(null);
  }, [dialog, props.editingWorkId]);
  const count = data?.works.length;
  const active = data?.works.filter((w) => w.status === "public").length;
  const ended = data?.works.filter((w) => w.status === "ended").length;
  const list = useMemo(
    () =>
      data?.works.filter(
        (w) =>
          (status === "all" || w.status === status) &&
          `${w.title} ${w.artist} ${w.genre}`
            .normalize("NFKC")
            .toLowerCase()
            .includes(query.normalize("NFKC").trim().toLowerCase()),
      ) ?? [],
    [data, status, query],
  );
  const displayed = tab === "favorites" ? props.favorites : list;
  const pageSize = tab === "favorites" ? 10 : 4;
  const pages = Math.max(1, Math.ceil(displayed.length / pageSize)),
    safePage = Math.min(page, pages),
    rows = list.slice((safePage - 1) * pageSize, safePage * pageSize);
  const play = (w: CreatorWork) => {
    if (w.workKind === "album") { window.location.assign(albumPath(w.id, lang)); return; }
    if (w.external) {
      if (getMusicPlayerState().playing) musicPlayer?.toggle();
      setExternal(w);
      return;
    }
    if (!w.audioUrl) return;
    void musicPlayer?.start(
      [
        {
          id: w.id,
          heartTrackId: w.id,
          title: w.title,
          artist: w.artist,
          coverUrl: w.coverUrl,
          audioUrl: w.audioUrl,
          lyrics: w.lyrics,
          genre: w.genre,
        },
      ],
      0,
      tx("我的作品", "My Works"),
      { sourceKey: "creator-center" },
    );
  };
  const close = () => {
    setDialog(null);
    setExternal(null);
  };
  const showLegacy = (kind: string, id?: string) => {
    props.onLegacy(kind);
    if (id) props.onManage(id);
    setDialog(id ? "edit" : kind === "settings" ? "settings" : "works");
  };
  const safeFavorites =
    !props.userId || props.privateLoading || props.privateError
      ? null
      : props.favorites.length + props.savedChoiceCount;
  const fallback = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString();
  const statusLabel = (s: string) =>
    s === "public"
      ? tx("推廣中", "Promoting", "公開中", "공개 중")
      : s === "ended"
        ? tx("推廣期結束", "Promotion ended", "公開期間終了", "공개 기간 종료")
        : tx("已下架", "Hidden", "非公開", "비공개");
  return (
    <div className={styles.page}>
      <EditorialHeader active="creator" />
      <main className={styles.main}>
        <header className={styles.heading}>
          <div>
            <h1>
              {tx(
                "創作者中心",
                "Creator Center",
                "クリエイターセンター",
                "창작자 센터",
              )}
            </h1>
            <p>
              {tx(
                "作品、收藏與回饋，一次掌握。通知保留三個月，已保留的除外。",
                "Your works, saves and feedback in one place. Notices expire after three months unless kept.",
                "作品・保存・反応をひと目で。通知は3か月で自動削除。保存済みは対象外。",
                "작품, 저장, 피드백을 한눈에. 알림은 3개월 후 자동 삭제되며 보관한 알림은 유지됩니다.",
              )}
            </p>
          </div>
          <div className={styles.identity}>
            <img
              className={styles.avatar}
              src={props.avatar || AIPOGER_BRAND_LOGO}
              alt=""
            />
            <strong>{props.name || tx("我的帳號", "My Account")}</strong>
            {data?.isOwner ? <span className={styles.owner}>OWNER</span> : null}
            <button
              className={styles.secondary}
              onClick={() => showLegacy("settings")}
            >
              {tx(
                "編輯資料",
                "Edit profile",
                "プロフィール編集",
                "프로필 편집",
              )}
            </button>
            {data?.isOwner ? (
              <Link href={`/admin?lang=${lang}`} className={styles.secondary}>
                {tx("後台管理", "Owner console", "管理画面", "관리 화면")} ↗
              </Link>
            ) : null}
          </div>
        </header>
        {props.userId ? <AccountNotifications key={props.userId} userId={props.userId} /> : null}
        <div className={styles.overview}>
          <div className={styles.metrics}>
            <button className={styles.metric} onClick={() => setTab("works")}>
              <Music2 className={styles.metricIcon} />
              <div>
                <span>
                  {tx(
                    "已投稿作品",
                    "Submitted works",
                    "投稿した作品",
                    "제출 작품",
                  )}
                </span>
                <b>{fallback(count)}</b>
                <small>
                  {fallback(active)} {tx("件推廣中", "promoting")} ·{" "}
                  {fallback(ended)} {tx("件已結束", "ended")}
                </small>
              </div>
            </button>
            <button
              className={styles.metric}
              onClick={() => setTab("favorites")}
            >
              <Heart className={styles.metricIcon} />
              <div>
                <span>
                  {tx("我的收藏", "My saves", "保存した作品", "내 저장")}
                </span>
                <b>{fallback(safeFavorites)}</b>
                <small>
                  {tx(
                    "歌曲與歌單",
                    "Songs and playlists",
                    "曲とプレイリスト",
                    "곡과 플레이리스트",
                  )}
                </small>
              </div>
            </button>
            <button
              className={styles.metric}
              onClick={() => setTab("comments")}
            >
              <MessageCircleMore className={styles.metricIcon} />
              <div>
                <span>
                  {tx(
                    "評價我的人",
                    "People commenting",
                    "コメントした人数",
                    "댓글 작성자",
                  )}
                </span>
                <b>{fallback(data?.commenters)}</b>
                <small>
                  {tx("共", "Total")} {fallback(data?.commentCount)}{" "}
                  {tx("則評論", "comments")}
                </small>
              </div>
            </button>
          </div>
          <div className={styles.credit}>
            <Coins className={styles.creditIcon} />
            <div>
              {tx("我的 Credit", "My Credit")}
              <strong>
                {data?.isOwner
                  ? tx("免扣點", "No deduction", "ポイント免除", "포인트 면제")
                  : data?.credits.enabled ? String(data.credits.balance ?? "—") : tx("尚未啟用", "Not active", "準備中", "준비 중")}
              </strong>
              <small>
                {data?.isOwner
                  ? tx(
                      data?.credits.enabled ? "OWNER 免扣投稿點數 · Credit 已啟用" : "OWNER 專屬權限 · 點數尚未啟用",
                      data?.credits.enabled ? "OWNER submission exemption · Credit active" : "OWNER exemption · credits not active",
                    )
                  : tx(
                      data?.credits.enabled ? "Credit 獎勵已啟用" : "啟用後顯示實際可用積分",
                      data?.credits.enabled ? "Credit rewards active" : "Your actual balance will appear when activated",
                    )}
              </small>
              <button onClick={() => setDialog("credit")}>
                {tx(
                  "點數紀錄",
                  "Credit history",
                  "ポイント履歴",
                  "포인트 내역",
                )}{" "}
                →
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <p role="status" className={styles.hint}>
            {tx("正在讀取你的作品資料…", "Loading your works…")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={styles.error}>
            {tx(
              "資料暫時無法讀取，請重試。",
              "Could not load your data. Retry.",
            )}{" "}
            <button onClick={onRefresh}>{tx("重試", "Retry")}</button>
          </p>
        ) : null}
        {props.privateError ? (
          <p role="alert" className={styles.error}>
            {props.privateError}
          </p>
        ) : null}
        <div className={styles.workspace}>
          <section id="my-works">
            <div
              className={styles.tabs}
              role="tablist"
              aria-label={tx("創作者資料", "Creator data")}
            >
              {[
                ["works", tx("我的作品", "My works", "作品", "내 작품"), count],
                [
                  "favorites",
                  tx("我的收藏", "My saves", "保存", "내 저장"),
                  safeFavorites,
                ],
                [
                  "comments",
                  tx(
                    "收到的評論",
                    "Comments received",
                    "コメント",
                    "받은 댓글",
                  ),
                  data?.commentCount,
                ],
              ].map(([key, label, num]) => (
                <button
                  key={String(key)}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(String(key))}
                >
                  {label} {fallback(num as number | undefined)}
                </button>
              ))}
              <select
                aria-label={tx("更多紀錄", "More records")}
                value=""
                onChange={(e) => {
                  if (e.target.value) showLegacy(e.target.value);
                }}
              >
                <option value="">{tx("更多紀錄", "More records")}</option>
                <option value="battle">Drop / Q Crash</option>
                <option value="records">
                  {tx("對戰紀錄", "Battle records")}
                </option>
                <option value="wins">{tx("勝利作品", "Winning works")}</option>
                <option value="favorites">Choice</option>
              </select>
            </div>
            {tab === "works" ? (
              <>
                <div className={styles.toolbar}>
                  <input
                    type="search"
                    aria-label={tx("搜尋我的作品", "Search my works")}
                    placeholder={tx("搜尋我的作品", "Search my works")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label={tx("作品狀態", "Work status")}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">{tx("全部狀態", "All status")}</option>
                    {["public", "ended", "hidden"].map((s) => (
                      <option value={s} key={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <span>
                    {list.length} {tx("件作品", "works")}
                  </span>
                </div>
                <div className={styles.rowHeader}>
                  <span>{tx("作品", "Work")}</span>
                  <span>{tx("狀態", "Status")}</span>
                  <span>{tx("支持人數", "Supporters")}</span>
                  <span>{tx("評論", "Comments")}</span>
                  <span>{tx("操作", "Actions")}</span>
                </div>
                {rows.map((w) => (
                  <article key={w.id} className={styles.workRow}>
                    <div className={styles.workInfo}>
                      <button
                        className={styles.cover}
                        aria-label={tx(`播放 ${w.title}`, `Play ${w.title}`)}
                        onClick={() => play(w)}
                        disabled={!w.audioUrl && !w.external}
                      >
                        <img src={w.coverUrl} alt="" />
                        <Play fill="currentColor" />
                      </button>
                      <div className={styles.workName}>
                        <b title={w.title}>{w.title}</b>
                        <small title={w.genre}>
                          {w.genre} · {w.aiTool}
                          {w.workKind === "album" ? ` · ${albums.label}` : w.isMusicVideo ? " · MV" : ""}
                        </small>
                        <small className={styles.workDate}>
                          {new Date(w.createdAt).toLocaleDateString(
                            lang === "zh" ? "zh-TW" : lang,
                          )}
                        </small>
                        <small className={styles.mobileCounts}>
                          <Heart aria-hidden="true" /> {w.supporters}{" "}
                          <MessageCircleMore aria-hidden="true" /> {w.comments}
                        </small>
                      </div>
                    </div>
                    <span className={styles.status} data-status={w.status}>
                      {statusLabel(w.status)}
                    </span>
                    <span className={styles.count}>{w.supporters}</span>
                    <span className={styles.count}>{w.comments}</span>
                    <div className={styles.rowActions}>
                      <button
                        title={tx("評論", "Comments")}
                        aria-label={tx(
                          `評論 ${w.title}`,
                          `Comments on ${w.title}`,
                        )}
                        onClick={() => setComment(w)}
                      >
                        <MessageCircleMore />
                      </button>
                      <button
                        title={tx("編輯", "Edit")}
                        aria-label={tx(`編輯 ${w.title}`, `Edit ${w.title}`)}
                        disabled={!w.active}
                        onClick={() => showLegacy("listenBar", w.id)}
                      >
                        <Pencil />
                      </button>
                    </div>
                  </article>
                ))}
                {!loading && !error && data && !rows.length ? (
                  <p className={styles.empty}>
                    {query || status !== "all"
                      ? tx("沒有符合的作品。", "No matching works.")
                      : tx(
                          "還沒有投稿作品，從右側開始。",
                          "No submissions yet. Start on the right.",
                        )}
                  </p>
                ) : null}
                <div className={styles.pagination}>
                  <span>
                    {rows.length ? (safePage - 1) * pageSize + 1 : 0}–
                    {Math.min(safePage * pageSize, list.length)} / {list.length}
                  </span>
                  <div>
                    <button
                      aria-label={tx("上一頁", "Previous page")}
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹
                    </button>
                    <span>
                      {safePage} / {pages}
                    </span>
                    <button
                      aria-label={tx("下一頁", "Next page")}
                      disabled={safePage === pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            {tab === "favorites" ? (
              <>
                <p className={styles.footerNote}>
                  {tx(
                    "收藏不會改變作品的歷史支持紀錄。",
                    "Removing saves does not alter support history.",
                  )}{" "}
                  <button
                    className={styles.legacyLink}
                    onClick={() => showLegacy("favorites")}
                  >
                    {tx(
                      "管理收藏與製作 Choice",
                      "Manage saves and create Choice",
                    )}
                    {props.savedChoiceCount > 0
                      ? ` · ${props.savedChoiceCount} Choice`
                      : ""}
                  </button>
                </p>
                {props.favorites
                  .slice((safePage - 1) * 10, safePage * 10)
                  .map((f) => (
                    <article className={styles.comment} key={f.id}>
                      <strong>{f.title}</strong>
                      <p>
                        {f.artist} · {f.genre}
                      </p>
                      <button
                        className={styles.secondary}
                        disabled={!f.audioUrl && !f.externalUrl}
                        onClick={() => {
                          if (f.externalUrl) {
                            const media = parseExternalMusic(f.externalUrl);
                            if (media)
                              setExternal({
                                id: f.id,
                                title: f.title,
                                artist: f.artist || "",
                                genre: f.genre || "",
                                coverUrl: f.coverUrl || AIPOGER_BRAND_LOGO,
                                external: media,
                                audioUrl: "",
                                aiTool: "",
                                createdAt: "",
                                active: true,
                                status: "public",
                                supporters: 0,
                                comments: 0,
                                lyrics: "",
                                isMusicVideo: false,
                              });
                            return;
                          }
                          if (f.audioUrl)
                            void musicPlayer?.start(
                              [
                                {
                                  id: f.id,
                                  title: f.title,
                                  artist: f.artist || "",
                                  audioUrl: f.audioUrl,
                                  coverUrl: f.coverUrl || AIPOGER_BRAND_LOGO,
                                },
                              ],
                              0,
                              tx("我的收藏", "My saves"),
                            );
                        }}
                      >
                        {tx("播放", "Play")}
                      </button>
                    </article>
                  ))}
                {!props.privateLoading &&
                !props.privateError &&
                !props.favorites.length ? (
                  <p className={styles.empty}>
                    {tx("還沒有收藏歌曲。", "No saved songs yet.")}
                  </p>
                ) : null}
                <div className={styles.pagination}>
                  <span>
                    {props.favorites.length} {tx("首歌曲", "songs", "曲", "곡")}
                  </span>
                  <div>
                    <button
                      aria-label={tx("上一頁", "Previous page")}
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹
                    </button>
                    <span>
                      {safePage} / {pages}
                    </span>
                    <button
                      aria-label={tx("下一頁", "Next page")}
                      disabled={safePage === pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            {tab === "comments"
              ? data?.comments.map((c) => (
                  <article className={styles.comment} key={c.id}>
                    <div className={styles.commentHead}>
                      <strong>{c.name}</strong>
                      <small>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <p>{c.text}</p>
                    <button
                      className={styles.legacyLink}
                      onClick={() => {
                        const w = data.works.find((w) => w.id === c.trackId);
                        if (w) setComment(w);
                      }}
                    >
                      {c.title}
                    </button>
                  </article>
                ))
              : null}
            {tab === "comments" &&
            !loading &&
            !error &&
            data &&
            !data.comments.length ? (
              <p className={styles.empty}>
                {tx(
                  "還沒有收到其他會員的評論。",
                  "No comments from other members yet.",
                )}
              </p>
            ) : null}
            {tab === "works" ? (
              <section className={styles.recent}>
                <div className={styles.recentHead}>
                  <h2>
                    {tx(
                      "最新收到的評論",
                      "Latest comments",
                      "最近のコメント",
                      "최근 댓글",
                    )}
                  </h2>
                  <button onClick={() => setTab("comments")}>
                    {tx("查看全部", "View all")} →
                  </button>
                </div>
                <div className={styles.recentList}>
                  {data?.comments.slice(0, 2).map((c) => (
                    <div key={c.id}>
                      <div className={styles.commentHead}>
                        <b>{c.name}</b>
                        <small>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <p className={styles.hint}>{c.title}</p>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
                {!loading && !error && data && !data.comments.length ? (
                  <p className={styles.hint}>
                    {tx(
                      "作品收到評論後會出現在這裡。",
                      "Comments will appear here when received.",
                    )}
                  </p>
                ) : null}
              </section>
            ) : null}
          </section>
          <aside className={styles.uploader} id="submit-work">
            <h2>
              {tx("投稿新作品", "Submit a work", "作品を投稿", "작품 제출")}
            </h2>
            <label>{albums.kind}<select value={kind} onChange={e => { setKind(e.target.value as WorkKind); setSource("link"); }}><option value="single">{albums.single}</option><option value="album">{albums.label}</option></select></label>
            {kind === "album" ? <p>{albums.intro} {albums.note}</p> : null}
            <div
              className={styles.sourceTabs}
              role="tablist"
              aria-label={tx("投稿來源", "Submission source")}
            >
              <button
                role="tab"
                aria-selected={source === "link"}
                onClick={() => setSource("link")}
              >
                {tx("貼作品連結", "Paste link", "リンク", "링크 붙여넣기")}
              </button>
              <button
                role="tab"
                aria-selected={source === "file"}
                onClick={() => setSource("file")}
              >
                {tx(
                  "上傳音檔",
                  "Upload audio",
                  "音声アップロード",
                  "음원 업로드",
                )}
              </button>
              {kind === "album" ? <button role="tab" aria-selected={source === "collection"} onClick={() => setSource("collection")}>{albums.create}</button> : null}
            </div>
            <DeferredSection label={tx("正在準備投稿工具…", "Preparing submission tools…", "投稿ツールを準備中…", "제출 도구 준비 중…")}>
            {props.userId ? (
              source === "collection" ? <AlbumBuilder key={props.userId} userId={props.userId} name={props.name} works={data?.works ?? []} onSubmitted={onRefresh} /> : source === "link" ? (
                <CreatorLinkUpload
                  key={`${props.userId}:${kind}`}
                  workKind={kind}
                  userId={props.userId}
                  name={props.name}
                  onSubmitted={onRefresh}
                />
              ) : (
                <div className={styles.fileUpload}>
                  <ProfileMusicUpload
                    key={`${props.userId}:${kind}`}
                    workKind={kind}
                    userId={props.userId}
                    creatorDefaultName={props.name}
                    onSubmitted={onRefresh}
                  />
                </div>
              )
            ) : (
              <p>{tx("登入後即可投稿。", "Sign in to submit.")}</p>
            )}
            </DeferredSection>
            <p className={styles.footerNote}>
              {tx(
                "公開推廣三個月；作品與紀錄留在自己的資料區。",
                "Three months of public promotion; works and records stay in your account.",
              )}
            </p>
          </aside>
        </div>
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          onCancel={close}
          onClick={(e) => {
            if (e.currentTarget === e.target) close();
          }}
        >
          <div className={styles.dialogHeader}>
            <h2>
              {external?.title ||
                (dialog === "credit"
                  ? tx("我的 Credit", "My Credit")
                  : dialog === "settings"
                    ? tx("編輯資料", "Edit profile")
                    : tx("作品與更多紀錄", "Works and records"))}
            </h2>
            <button autoFocus aria-label={tx("關閉", "Close")} onClick={close}>
              <X />
            </button>
          </div>
          {external?.external ? (
            <ExternalMusicPlayer
              media={external.external}
              title={external.title}
            />
          ) : dialog === "credit" ? (
            <div>
              <p>{data?.credits.enabled
                ? creditCopy(lang).rules
                : tx("點數尚未啟用，目前沒有點數收支紀錄。", "Credits are not active yet.")}</p>
              {data?.credits.debt ? <p role="status">{creditCopy(lang).debt}：{data.credits.debt} Credit</p> : null}
              {data?.credits.entries?.length ? <ul>{data.credits.entries.map(entry => <li key={entry.id} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"12px 0",borderBottom:"1px solid #34434b"}}>
                <span>{creditReason(lang, entry.reason)} · {new Date(entry.created_at).toLocaleDateString()}</span><strong>{entry.delta > 0 ? "+" : ""}{entry.delta}</strong>
              </li>)}</ul> : data?.credits.enabled ? <p>{tx("尚無點數紀錄，回訪、愛心、有效評論與盲聽都會累積。", "No transactions yet. Visits, Hearts, qualifying reviews and blind comparisons earn Credit.")}</p> : null}
            </div>
          ) : (
            <div className={styles.legacy} data-mode={dialog ?? "works"}>
              {props.legacy}
            </div>
          )}
        </dialog>
        {comment ? (
          <HomeWorkFeedback
            key={comment.id}
            work={{
              id: comment.id,
              workKind: comment.workKind,
              title: comment.title,
              artist: comment.artist,
              genre: comment.genre,
              coverUrl: comment.coverUrl,
              audioUrl: comment.audioUrl,
              description: "",
              lyrics: comment.lyrics,
              videoId: null,
              youtubeUrl: null,
              supporterCount: comment.supporters,
              publishedAt: comment.createdAt,
            }}
            returnPath={`/profile?lang=${lang}`}
            supportNote={tx(
              "評論共用原作品；支持人數不包含作者自己。",
              "Comments belong to the original work; supporters exclude its author.",
            )}
            onClose={() => setComment(null)}
            onChange={onRefresh}
          />
        ) : null}
      </main>
    </div>
  );
}
