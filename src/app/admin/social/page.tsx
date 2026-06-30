"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { SocialPlatform, SocialPostStatus, SocialPublishMode } from "@/lib/social-posting";

type AdminState = "checking" | "login" | "denied" | "ready";
type SocialPostFilter = "todo" | "needs_review" | "scheduled" | "manual" | "failed" | "published" | "all";

type SocialTarget = {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  publish_mode: SocialPublishMode;
  status: SocialPostStatus;
  title: string;
  content_text: string;
  target_url: string | null;
  manual_publish_url: string | null;
  media_url: string | null;
  background_audio_url: string | null;
  background_audio_label: string | null;
  notes: string | null;
  external_post_id: string | null;
  error_message: string | null;
  last_attempt_at: string | null;
  published_at: string | null;
};

type SocialPost = {
  id: string;
  source_type: "manual" | "battle_result" | "listen_bar_daily_spotlight";
  source_id: string | null;
  title: string;
  status: SocialPostStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  social_post_targets?: SocialTarget[];
};

type RecentBattleResult = {
  id: string;
  battle_id: string;
  battle_code: string | null;
  winner_name: string | null;
  winner_song_name: string | null;
  opponent_name: string | null;
  opponent_song_name: string | null;
  final_vote_left: number | null;
  final_vote_right: number | null;
  total_votes: number | null;
  archived_at: string | null;
};

type SocialAccountStatus = {
  platform: SocialPlatform;
  displayName: string;
  connectionStatus: "connected" | "not_connected" | "manual" | "draft_only";
  publishMode: SocialPublishMode;
  envKeys: string[];
  note: string;
};

type AdminPayload = {
  posts?: SocialPost[];
  recentBattleResults?: RecentBattleResult[];
  accountStatuses?: SocialAccountStatus[];
  error?: string;
};

const platformLabel: Record<SocialPlatform, string> = {
  discord: "Discord",
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook_group: "Facebook 社團",
};

const statusLabel: Record<SocialPostStatus, string> = {
  draft: "草稿",
  needs_review: "待審核",
  scheduled: "已批准",
  published: "已發布",
  failed: "失敗",
};

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function sourceTypeLabel(value: SocialPost["source_type"]) {
  if (value === "battle_result") return "Battle 戰報";
  if (value === "listen_bar_daily_spotlight") return "每日推薦歌";
  return "人工公告";
}

function sourceAccentClass(value: SocialPost["source_type"]) {
  if (value === "listen_bar_daily_spotlight") return "border-yellow-200/25 bg-yellow-300/10 text-yellow-100";
  if (value === "battle_result") return "border-orange-200/25 bg-orange-500/10 text-orange-100";
  return "border-cyan-200/25 bg-cyan-300/10 text-cyan-100";
}

function statusAccentClass(status: SocialPostStatus) {
  if (status === "published") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (status === "failed") return "border-red-300/30 bg-red-500/10 text-red-100";
  if (status === "scheduled") return "border-yellow-200/25 bg-yellow-300/10 text-yellow-100";
  return "border-white/10 bg-white/[0.06] text-zinc-300";
}

function sortedTargets(post: SocialPost) {
  const order: SocialPlatform[] = ["discord", "x", "instagram", "tiktok", "youtube", "facebook_group"];
  return [...(post.social_post_targets ?? [])].sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
}

function postTargetSummary(post: SocialPost) {
  const targets = post.social_post_targets ?? [];
  const pendingTargets = targets.filter((target) => target.status !== "published").length;
  const publishedTargets = targets.filter((target) => target.status === "published").length;
  const failedTargets = targets.filter((target) => target.status === "failed").length;
  const manualTargets = targets.filter((target) => target.publish_mode !== "api" && target.status !== "published").length;
  const apiTargets = targets.filter((target) => target.publish_mode === "api" && target.status !== "published").length;
  return { totalTargets: targets.length, pendingTargets, publishedTargets, failedTargets, manualTargets, apiTargets };
}

function postHasManualPending(post: SocialPost) {
  if (post.status === "needs_review" || post.status === "published") return false;
  return (post.social_post_targets ?? []).some((target) => target.publish_mode !== "api" && target.status !== "published");
}

function postMatchesFilter(post: SocialPost, filter: SocialPostFilter) {
  if (filter === "all") return true;
  if (filter === "todo") return post.status !== "published";
  if (filter === "manual") return postHasManualPending(post);
  return post.status === filter;
}

function connectionLabel(status: SocialAccountStatus["connectionStatus"]) {
  if (status === "connected") return "可直發";
  if (status === "manual") return "手動";
  if (status === "draft_only") return "產草稿";
  return "待設定";
}

function connectionClass(status: SocialAccountStatus["connectionStatus"]) {
  if (status === "connected") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (status === "manual") return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
  if (status === "draft_only") return "border-white/10 bg-white/[0.04] text-zinc-300";
  return "border-orange-300/30 bg-orange-500/10 text-orange-100";
}

type RunAction = (action: string, body: Record<string, unknown>, busyKey: string, success: string) => Promise<boolean>;

function SocialTargetPanel({
  post,
  target,
  busyId,
  runAction,
  copyText,
  accountStatus,
}: {
  post: SocialPost;
  target: SocialTarget;
  busyId: string | null;
  runAction: RunAction;
  copyText: (text: string) => Promise<void>;
  accountStatus?: SocialAccountStatus;
}) {
  const [title, setTitle] = useState(target.title);
  const [content, setContent] = useState(target.content_text);
  const [targetUrl, setTargetUrl] = useState(target.target_url ?? "");
  const [mediaUrl, setMediaUrl] = useState(target.media_url ?? "");
  const [backgroundAudioUrl, setBackgroundAudioUrl] = useState(target.background_audio_url ?? "");
  const [backgroundAudioLabel, setBackgroundAudioLabel] = useState(target.background_audio_label ?? "");

  useEffect(() => {
    setTitle(target.title);
    setContent(target.content_text);
    setTargetUrl(target.target_url ?? "");
    setMediaUrl(target.media_url ?? "");
    setBackgroundAudioUrl(target.background_audio_url ?? "");
    setBackgroundAudioLabel(target.background_audio_label ?? "");
  }, [target]);

  async function saveTarget() {
    await runAction(
      "update_target",
      {
        targetId: target.id,
        title,
        content,
        targetUrl,
        mediaUrl,
        backgroundAudioUrl,
        backgroundAudioLabel,
      },
      `save-${target.id}`,
      `${platformLabel[target.platform]} 草稿已更新。`,
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-black/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{platformLabel[target.platform]}</p>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#050505] px-2 py-2 text-lg font-black text-white outline-none"
          />
        </div>
        <span className={`rounded-md px-2 py-1 text-[0.65rem] font-black ${target.status === "published" ? "bg-emerald-300/15 text-emerald-100" : target.status === "failed" ? "bg-red-400/15 text-red-100" : "bg-white/10 text-zinc-300"}`}>
          {statusLabel[target.status]}
        </span>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={8}
        className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-[#050505] px-3 py-3 text-sm font-bold leading-6 text-zinc-100 outline-none"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
          目標連結
          <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none" />
        </label>
        <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
          配樂名稱
          <input value={backgroundAudioLabel} onChange={(event) => setBackgroundAudioLabel(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none" />
        </label>
        <label className="sm:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
          影像素材 URL
          <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none" />
        </label>
        <label className="sm:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
          背景配樂 URL
          <input value={backgroundAudioUrl} onChange={(event) => setBackgroundAudioUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#050505] px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none" />
        </label>
      </div>

      <div className="mt-3 space-y-2 text-xs font-bold leading-6 text-zinc-400">
        <p>模式：{target.publish_mode === "api" ? "API 可發布" : target.publish_mode === "manual" ? "手動發布" : "草稿素材"}</p>
        {post.status === "needs_review" ? (
          <p className="text-yellow-100">這篇還沒批准。先按上方「批准草稿」後，才會開放平台發布；批准本身不會自動送出。</p>
        ) : null}
        {mediaUrl ? (
          <p className="break-all text-yellow-100">影像素材：{mediaUrl}</p>
        ) : (
          <p className="text-zinc-500">影像素材：尚未指定。</p>
        )}
        {backgroundAudioUrl ? (
          <p className="break-all text-orange-100">背景配樂：{backgroundAudioLabel || "勝出音樂"}｜{backgroundAudioUrl}</p>
        ) : (
          <p className="text-zinc-500">背景配樂：尚無音檔連結；發布前需手動補勝出音樂。</p>
        )}
        {target.notes && <p>{target.notes}</p>}
        {target.error_message && <p className="text-red-200">錯誤：{target.error_message}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={saveTarget} disabled={busyId === `save-${target.id}`} className="rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-black text-emerald-100 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
          儲存
        </button>
        <button type="button" onClick={() => copyText(content)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
          複製文案
        </button>
        {backgroundAudioUrl && (
          <a href={backgroundAudioUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-orange-300/30 px-3 py-2 text-xs font-black text-orange-100 hover:border-orange-200">
            開啟配樂
          </a>
        )}
        {mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100">
            開啟素材
          </a>
        )}
        {target.manual_publish_url && (
          <a href={target.manual_publish_url} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-black text-cyan-100 hover:border-cyan-200">
            開啟發布頁
          </a>
        )}
        {target.publish_mode === "api" ? (
          <button
            type="button"
            disabled={busyId === target.id || post.status === "needs_review" || accountStatus?.connectionStatus !== "connected"}
            onClick={() => runAction("publish_target", { targetId: target.id }, target.id, `${platformLabel[target.platform]} 發布完成。`)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accountStatus?.connectionStatus === "connected" ? `發布到 ${platformLabel[target.platform]}` : "待連線"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busyId === target.id || post.status === "needs_review"}
            onClick={() => runAction("mark_manual_published", { targetId: target.id }, target.id, `${platformLabel[target.platform]} 已標記為已處理。`)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            標記已處理
          </button>
        )}
      </div>
    </section>
  );
}

export default function AdminSocialPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [recentBattleResults, setRecentBattleResults] = useState<RecentBattleResult[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<SocialAccountStatus[]>([]);
  const [selectedBattleId, setSelectedBattleId] = useState("");
  const [manualTopic, setManualTopic] = useState("Creator Wanted");
  const [manualBody, setManualBody] = useState("徵求第一批 AI 音樂創作者。帶你的作品進 AIPOGER，讓 30-60 秒抓波上場被聽見。");
  const [manualCta, setManualCta] = useState("加入 AIPOGER，帶你的 30-60 秒抓波進場 battle。");
  const [manualLinkUrl, setManualLinkUrl] = useState("https://aipoger.com/battle?lang=zh");
  const [manualAudioUrl, setManualAudioUrl] = useState("");
  const [manualAudioLabel, setManualAudioLabel] = useState("");
  const [postFilter, setPostFilter] = useState<SocialPostFilter>("todo");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const targets = posts.flatMap((post) => post.social_post_targets ?? []);
    return {
      posts: posts.length,
      needsReview: posts.filter((post) => post.status === "needs_review").length,
      ready: posts.filter((post) => post.status === "scheduled").length,
      manualPending: posts.filter(postHasManualPending).length,
      publishedTargets: targets.filter((target) => target.status === "published").length,
      failedPosts: posts.filter((post) => post.status === "failed").length,
      failedTargets: targets.filter((target) => target.status === "failed").length,
    };
  }, [posts]);
  const spotlightPosts = useMemo(
    () => posts.filter((post) => post.source_type === "listen_bar_daily_spotlight"),
    [posts],
  );
  const visiblePosts = useMemo(
    () => posts.filter((post) => postMatchesFilter(post, postFilter)),
    [postFilter, posts],
  );
  const latestSpotlightPost = spotlightPosts[0] ?? null;

  const loadData = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/social", {
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as AdminPayload | null;
    if (!response.ok) {
      setError(payload?.error || "社群後台讀取失敗。");
      return;
    }
    setPosts(payload?.posts ?? []);
    setRecentBattleResults(payload?.recentBattleResults ?? []);
    setAccountStatuses(payload?.accountStatuses ?? []);
    setSelectedBattleId((current) => current || payload?.recentBattleResults?.[0]?.battle_id || "");
  }, []);

  const accountStatusByPlatform = useMemo(() => {
    return new Map(accountStatuses.map((account) => [account.platform, account]));
  }, [accountStatuses]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setAdminState("login");
        return;
      }
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadData();
    }
    void check();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  async function runAction(action: string, body: Record<string, unknown>, busyKey: string, success: string) {
    setBusyId(busyKey);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action, ...body }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "社群後台操作失敗。");
      return false;
    }
    setMessage(success);
    await loadData();
    return true;
  }

  async function createBattleDraft() {
    if (!selectedBattleId) {
      setError("請先選擇一場 battle 戰報。");
      return;
    }
    await runAction("create_battle_draft", { battleId: selectedBattleId }, "create-battle", "已產生 Battle 戰報草稿。");
  }

  async function createManualDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      "create_manual_draft",
      {
        topic: manualTopic,
        body: manualBody,
        cta: manualCta,
        linkUrl: manualLinkUrl,
        backgroundAudioUrl: manualAudioUrl,
        backgroundAudioLabel: manualAudioLabel,
      },
      "create-manual",
      "已建立人工排程草稿。",
    );
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("文案已複製。");
  }

  async function deletePost(post: SocialPost) {
    const ok = window.confirm(`確定取消「${post.title}」這筆社群草稿？取消後各平台文案也會一起移除。`);
    if (!ok) return;
    await runAction("delete_post", { postId: post.id }, `delete-${post.id}`, "社群草稿已取消。");
  }

  if (adminState === "checking") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <p className="text-sm font-black text-zinc-400">檢查社群後台權限中...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.2rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">社群發文後台只允許 owner 帳號進入。</p>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
            前往登入
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-200/80">AIPOGER SOCIAL DESK</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">社群發文中控台</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-400">
              這裡只做審核、發布、複製與追蹤。每日推薦歌在酒吧後台建立；Battle 戰報與人工公告可以在下方建立第一版草稿。
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <nav className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <Link href="/admin/quiz" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
                測驗後台
              </Link>
              <Link href="/admin/battles" className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">
                Battle 管理
              </Link>
              <Link href="/admin/listen-bar" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200">
                酒吧後台
              </Link>
            </nav>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["待審核", stats.needsReview],
                ["已批准", stats.ready],
                ["手動待處理", stats.manualPending],
                ["失敗", stats.failedPosts + stats.failedTargets],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`mt-5 rounded-lg border px-4 py-3 text-sm font-black ${error ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"}`}>
            {error || message}
          </div>
        )}

        <section className="mt-6 rounded-lg border border-yellow-200/25 bg-yellow-300/[0.06] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/80">今日待辦</p>
              <h2 className="mt-2 text-xl font-black">先處理會真的發出去的事</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-zinc-400">
                批准只是解鎖發布；Discord / X 還要按平台發布，IG / TikTok / YouTube / Facebook 仍以複製文案和手動處理為主。
              </p>
            </div>
            <Link href="/admin/listen-bar" className="rounded-lg border border-yellow-200/30 bg-black/25 px-4 py-3 text-sm font-black text-yellow-100 hover:border-yellow-100">
              建立每日推薦歌
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => setPostFilter("needs_review")} className="rounded-lg border border-white/10 bg-black/35 p-4 text-left hover:border-yellow-200/45">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500">REVIEW</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.needsReview}</p>
              <p className="mt-1 text-xs font-bold text-zinc-400">待審核草稿</p>
            </button>
            <button type="button" onClick={() => setPostFilter("scheduled")} className="rounded-lg border border-white/10 bg-black/35 p-4 text-left hover:border-yellow-200/45">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500">READY</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.ready}</p>
              <p className="mt-1 text-xs font-bold text-zinc-400">已批准，待平台發布</p>
            </button>
            <button type="button" onClick={() => setPostFilter("manual")} className="rounded-lg border border-white/10 bg-black/35 p-4 text-left hover:border-yellow-200/45">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500">MANUAL</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.manualPending}</p>
              <p className="mt-1 text-xs font-bold text-zinc-400">需要複製 / 手動貼文</p>
            </button>
            <button type="button" onClick={() => setPostFilter("failed")} className="rounded-lg border border-red-300/20 bg-red-500/[0.07] p-4 text-left hover:border-red-200/55">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-red-100/70">FAILED</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.failedPosts + stats.failedTargets}</p>
              <p className="mt-1 text-xs font-bold text-red-100/70">需要回頭修正</p>
            </button>
          </div>

          {latestSpotlightPost ? (
            <div className="mt-4 rounded-lg border border-yellow-200/18 bg-black/35 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-100/70">LATEST DAILY SPOTLIGHT</p>
                  <h3 className="mt-2 truncate text-lg font-black text-white">{latestSpotlightPost.title}</h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">
                    {statusLabel[latestSpotlightPost.status]} / {formatTime(latestSpotlightPost.created_at)} / 平台草稿 {latestSpotlightPost.social_post_targets?.length ?? 0} 個
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setPostFilter("all"); setExpandedPostId(latestSpotlightPost.id); }} className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100">
                    打開草稿
                  </button>
                  <Link href="/admin/listen-bar" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
                    回酒吧後台
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-lg border border-white/10 bg-black/45 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">發布設定</p>
              <h2 className="mt-2 text-xl font-black">平台連線狀態</h2>
            </div>
            <p className="max-w-2xl text-xs font-bold leading-6 text-zinc-500">
              不在 repo 保存密碼或 token。Discord/X 需要 Vercel env；IG/TikTok/YT 先產草稿；FB 社團採手動發布。
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {accountStatuses.map((account) => (
              <div key={account.platform} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{account.displayName}</p>
                  <span className={`rounded-md border px-2 py-1 text-[0.65rem] font-black ${connectionClass(account.connectionStatus)}`}>
                    {connectionLabel(account.connectionStatus)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-bold leading-6 text-zinc-400">{account.note}</p>
                {account.envKeys.length > 0 && (
                  <p className="mt-2 break-all text-[0.65rem] font-bold leading-5 text-zinc-600">
                    Env：{account.envKeys.join(" / ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">建立來源草稿</p>
              <h2 className="mt-2 text-xl font-black">來源後台先產內容，這裡只接手發布</h2>
            </div>
            <p className="max-w-2xl text-xs font-bold leading-6 text-zinc-500">
              每日推薦歌回酒吧後台選歌與上傳素材；Battle 戰報可先在這裡從已結算結果產生；臨時公告用人工草稿。
            </p>
          </div>
        </section>

        <div className="mt-4 grid gap-5 xl:grid-cols-3">
          <section className="rounded-lg border border-yellow-200/20 bg-yellow-300/[0.06] p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/80">每日推薦歌</p>
              <h2 className="mt-2 text-xl font-black">到酒吧後台建立</h2>
              <p className="mt-3 text-xs font-bold leading-6 text-yellow-100/70">
                選歌、推薦文、Shorts caption、素材上傳與 /today QR 都在酒吧後台完成；建立後會回到這裡審核與發布。
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/listen-bar" className="rounded-lg bg-yellow-300 px-4 py-3 text-sm font-black text-black">
                去建立每日推薦
              </Link>
              <a href="https://aipoger.com/today" target="_blank" rel="noreferrer" className="rounded-lg border border-yellow-200/30 px-4 py-3 text-sm font-black text-yellow-100 hover:border-yellow-100">
                開啟 /today
              </a>
            </div>
          </section>

          <section className="rounded-lg border border-orange-300/20 bg-orange-500/[0.06] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200/80">Battle 戰報草稿</p>
                <h2 className="mt-2 text-xl font-black">從勝出 battle 產戰報</h2>
              </div>
              <button
                type="button"
                disabled={busyId === "create-battle" || !selectedBattleId}
                onClick={createBattleDraft}
                className="rounded-lg bg-orange-400 px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                產生戰報草稿
              </button>
            </div>
            <select
              value={selectedBattleId}
              onChange={(event) => setSelectedBattleId(event.target.value)}
              className="mt-4 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold text-white outline-none"
            >
              {recentBattleResults.length === 0 ? (
                <option value="">尚無可用戰報</option>
              ) : (
                recentBattleResults.map((result) => (
                  <option key={result.id} value={result.battle_id}>
                    {result.battle_code || shortId(result.battle_id)}｜{result.winner_name}《{result.winner_song_name}》勝出｜{result.final_vote_left}:{result.final_vote_right}｜{result.total_votes} 票
                  </option>
                ))
              )}
            </select>
            <p className="mt-3 text-xs font-bold leading-6 text-orange-100/70">
              只列出有觀眾票的 battle result；0:0 no contest 不會生成 Winner Circle 社群戰報。
            </p>
          </section>

          <form onSubmit={createManualDraft} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">人工排程草稿</p>
            <h2 className="mt-2 text-xl font-black">手動建立跨平台公告</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                主題
                <input value={manualTopic} onChange={(event) => setManualTopic(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                連結
                <input value={manualLinkUrl} onChange={(event) => setManualLinkUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
              <label className="sm:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                內文
                <textarea value={manualBody} onChange={(event) => setManualBody(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
              <label className="sm:col-span-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                CTA
                <input value={manualCta} onChange={(event) => setManualCta(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                背景配樂 URL
                <input value={manualAudioUrl} onChange={(event) => setManualAudioUrl(event.target.value)} placeholder="選填" className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                配樂名稱
                <input value={manualAudioLabel} onChange={(event) => setManualAudioLabel(event.target.value)} placeholder="選填" className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none" />
              </label>
            </div>
            <button type="submit" disabled={busyId === "create-manual"} className="mt-4 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50">
              建立人工草稿
            </button>
          </form>
        </div>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">草稿箱 / 發布台</p>
              <h2 className="mt-2 text-2xl font-black text-white">一篇內容一張卡，點開才處理平台</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-zinc-500">
                預設只顯示待辦。已發布紀錄留在「已發布」，避免跟今天要處理的草稿混在一起。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-lg border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:border-white/30"
            >
              重新整理
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["todo", `待辦 ${posts.filter((post) => post.status !== "published").length}`],
              ["needs_review", `待審核 ${stats.needsReview}`],
              ["scheduled", `已批准 ${stats.ready}`],
              ["manual", `手動待處理 ${stats.manualPending}`],
              ["failed", `失敗 ${stats.failedPosts + stats.failedTargets}`],
              ["published", `已發布 ${posts.filter((post) => post.status === "published").length}`],
              ["all", `全部 ${posts.length}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPostFilter(key as SocialPostFilter)}
                className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                  postFilter === key
                    ? "border-yellow-200/60 bg-yellow-300/12 text-yellow-100"
                    : "border-white/10 bg-black/25 text-zinc-300 hover:border-white/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-sm font-bold text-zinc-400">
              尚未建立社群草稿。先從 Battle 戰報、每日推薦歌或人工公告產生第一批內容。
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-sm font-bold text-zinc-400">
              這個分類目前沒有內容。
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePosts.map((post) => {
                const targets = sortedTargets(post);
                const firstTarget = targets[0] ?? null;
                const summary = postTargetSummary(post);
                const expanded = expandedPostId === post.id;
                return (
                  <article key={post.id} className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-2 py-1 text-[0.65rem] font-black ${sourceAccentClass(post.source_type)}`}>
                            {sourceTypeLabel(post.source_type)}
                          </span>
                          <span className={`rounded-md border px-2 py-1 text-[0.65rem] font-black ${statusAccentClass(post.status)}`}>
                            {statusLabel[post.status]}
                          </span>
                          <span className="text-xs font-bold text-zinc-500">{formatTime(post.created_at)}</span>
                        </div>
                        <h3 className="mt-3 text-xl font-black leading-tight text-white">{post.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc-400">
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">平台 {summary.totalTargets}</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">待處理 {summary.pendingTargets}</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">已發 {summary.publishedTargets}</span>
                          {summary.manualTargets > 0 && <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-cyan-100">手動 {summary.manualTargets}</span>}
                          {summary.apiTargets > 0 && <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-3 py-1 text-yellow-100">API {summary.apiTargets}</span>}
                          {summary.failedTargets > 0 && <span className="rounded-full border border-red-300/25 bg-red-500/10 px-3 py-1 text-red-100">失敗 {summary.failedTargets}</span>}
                        </div>
                        {firstTarget?.target_url && (
                          <p className="mt-3 break-all text-xs font-bold leading-6 text-zinc-500">
                            主連結：{firstTarget.target_url}
                          </p>
                        )}
                        {post.approved_at && <p className="mt-2 text-xs font-bold text-emerald-200/80">已批准：{formatTime(post.approved_at)}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {firstTarget?.target_url && (
                          <a href={firstTarget.target_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
                            開啟連結
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedPostId((current) => (current === post.id ? null : post.id))}
                          className="rounded-lg border border-yellow-200/30 bg-yellow-300/10 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100"
                        >
                          {expanded ? "收起平台" : "預覽 / 發布"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === post.id || post.status === "published" || post.status === "scheduled"}
                          onClick={() => runAction("approve_post", { postId: post.id }, post.id, "已批准社群草稿，可開始發布或手動處理。")}
                          className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          批准
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `delete-${post.id}` || post.status === "published"}
                          onClick={() => deletePost(post)}
                          className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          取消草稿
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        {targets.map((target) => (
                          <SocialTargetPanel
                            key={target.id}
                            post={post}
                            target={target}
                            busyId={busyId}
                            runAction={runAction}
                            copyText={copyText}
                            accountStatus={accountStatusByPlatform.get(target.platform)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
