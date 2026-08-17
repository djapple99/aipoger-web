"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { SocialPlatform, SocialPostStatus, SocialPublishMode } from "@/lib/social-posting";

type AdminState = "checking" | "login" | "denied" | "ready";
type DraftMode = "manual" | "battle";

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
  background_audio_url: string | null;
  background_audio_label: string | null;
  notes: string | null;
  error_message: string | null;
  published_at: string | null;
};

type SocialPost = {
  id: string;
  source_type: "manual" | "battle_result";
  title: string;
  status: SocialPostStatus;
  approved_at: string | null;
  created_at: string;
  social_post_targets?: SocialTarget[];
};

type RecentBattleResult = {
  id: string;
  battle_id: string;
  battle_code: string | null;
  winner_name: string | null;
  winner_song_name: string | null;
  final_vote_left: number | null;
  final_vote_right: number | null;
  total_votes: number | null;
};

type SocialAccountStatus = {
  platform: SocialPlatform;
  displayName: string;
  connectionStatus: "configured" | "not_configured" | "manual" | "draft_only";
  publishMode: SocialPublishMode;
  note: string;
};

type AdminPayload = {
  posts?: SocialPost[];
  recentBattleResults?: RecentBattleResult[];
  accountStatuses?: SocialAccountStatus[];
  error?: string;
};

const platformLabel: Partial<Record<SocialPlatform, string>> = {
  discord: "Discord",
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook_group: "Facebook 社團",
};

const statusLabel: Record<SocialPostStatus, string> = {
  draft: "草稿",
  needs_review: "待批准",
  scheduled: "已批准",
  published: "已發布",
  failed: "需處理",
};

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function visibleTargets(post: SocialPost) {
  const order: SocialPlatform[] = ["discord", "x", "instagram", "youtube", "facebook_group"];
  return [...(post.social_post_targets ?? [])]
    .filter((target) => target.platform !== "tiktok")
    .sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
}

function labelForPlatform(platform: SocialPlatform) {
  return platformLabel[platform] ?? "已封存平台";
}

function connectionLabel(status: SocialAccountStatus["connectionStatus"]) {
  if (status === "configured") return "已設定";
  if (status === "manual") return "手動發布";
  if (status === "draft_only") return "產草稿";
  return "尚未設定";
}

function connectionClass(status: SocialAccountStatus["connectionStatus"]) {
  if (status === "configured") return "border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  if (status === "manual") return "border-cyan-300/35 bg-cyan-300/10 text-cyan-100";
  if (status === "draft_only") return "border-white/15 bg-white/[0.04] text-zinc-200";
  return "border-orange-300/35 bg-orange-500/10 text-orange-100";
}

type RunAction = (action: string, body: Record<string, unknown>, busyKey: string, success: string) => Promise<boolean>;

function SocialTargetEditor({
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
  const [backgroundAudioUrl, setBackgroundAudioUrl] = useState(target.background_audio_url ?? "");
  const [backgroundAudioLabel, setBackgroundAudioLabel] = useState(target.background_audio_label ?? "");

  useEffect(() => {
    setTitle(target.title);
    setContent(target.content_text);
    setTargetUrl(target.target_url ?? "");
    setBackgroundAudioUrl(target.background_audio_url ?? "");
    setBackgroundAudioLabel(target.background_audio_label ?? "");
  }, [target]);

  const platform = labelForPlatform(target.platform);
  const readyToSend = target.publish_mode === "api" && accountStatus?.connectionStatus === "configured";
  const canAct = post.status === "scheduled";

  async function saveTarget() {
    await runAction(
      "update_target",
      { targetId: target.id, title, content, targetUrl, backgroundAudioUrl, backgroundAudioLabel },
      `save-${target.id}`,
      `${platform} 草稿已儲存。`,
    );
  }

  async function confirmPublish() {
    const message = target.publish_mode === "api"
      ? `確定要把這篇文案發送到 ${platform} 嗎？`
      : `確定已在 ${platform} 完成手動發布嗎？`;
    if (!window.confirm(message)) return;
    await runAction(
      target.publish_mode === "api" ? "publish_target" : "mark_manual_published",
      { targetId: target.id },
      target.id,
      target.publish_mode === "api" ? `${platform} 已發送。` : `${platform} 已標記完成。`,
    );
  }

  return (
    <section className="border-t border-white/10 py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-white">{platform}</p>
          <span className={`rounded-full border px-2 py-1 text-[0.65rem] font-black ${target.status === "published" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : target.status === "failed" ? "border-red-300/30 bg-red-500/10 text-red-100" : "border-white/10 bg-white/[0.04] text-zinc-300"}`}>
            {statusLabel[target.status]}
          </span>
          <span className="text-xs font-bold text-zinc-500">{target.publish_mode === "api" ? "可直接發送" : target.publish_mode === "manual" ? "手動完成" : "複製後發布"}</span>
        </div>
        {target.published_at ? <span className="text-xs font-bold text-zinc-500">{formatTime(target.published_at)}</span> : null}
      </div>

      <label className="mt-4 block text-xs font-black text-zinc-500">
        標題
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-white/10 bg-black px-3 text-sm font-black text-white outline-none focus:border-orange-300/60" />
      </label>
      <label className="mt-3 block text-xs font-black text-zinc-500">
        文案
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} className="mt-2 w-full resize-y rounded-md border border-white/10 bg-black px-3 py-3 text-sm font-bold leading-6 text-zinc-100 outline-none focus:border-orange-300/60" />
      </label>
      <label className="mt-3 block text-xs font-black text-zinc-500">
        連結
        <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-orange-300/60" />
      </label>

      <details className="mt-3 border-t border-white/10 pt-3 text-xs font-bold text-zinc-500">
        <summary className="cursor-pointer text-zinc-300">配樂與發布備註</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>配樂名稱<input value={backgroundAudioLabel} onChange={(event) => setBackgroundAudioLabel(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black px-3 text-xs font-bold text-white outline-none" /></label>
          <label>配樂 URL<input value={backgroundAudioUrl} onChange={(event) => setBackgroundAudioUrl(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black px-3 text-xs font-bold text-white outline-none" /></label>
        </div>
        {target.notes ? <p className="mt-3 leading-6">{target.notes}</p> : null}
      </details>

      {target.error_message ? <p className="mt-3 text-xs font-bold text-red-200">錯誤：{target.error_message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveTarget()} disabled={busyId === `save-${target.id}`} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black text-white disabled:opacity-40">儲存</button>
        <button type="button" onClick={() => void copyText(content)} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black text-white">複製文案</button>
        {target.manual_publish_url ? <a href={target.manual_publish_url} target="_blank" rel="noreferrer" className="rounded-md border border-cyan-300/35 px-3 py-2 text-xs font-black text-cyan-100">開啟發布頁</a> : null}
        {target.publish_mode === "api" ? (
          <button type="button" onClick={() => void confirmPublish()} disabled={!canAct || !readyToSend || busyId === target.id} className="rounded-md bg-orange-400 px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40">
            {readyToSend ? `發送到 ${platform}` : "尚未設定"}
          </button>
        ) : (
          <button type="button" onClick={() => void confirmPublish()} disabled={!canAct || busyId === target.id} className="rounded-md bg-white px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40">完成手動發布</button>
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
  const [draftMode, setDraftMode] = useState<DraftMode>("manual");
  const [selectedBattleId, setSelectedBattleId] = useState("");
  const [manualTopic, setManualTopic] = useState("Creator Wanted");
  const [manualBody, setManualBody] = useState("徵求第一批 AI 音樂創作者。帶你的作品進 AIPOGER，讓 30-60 秒抓波上場被聽見。");
  const [manualCta, setManualCta] = useState("加入 AIPOGER，帶你的 30-60 秒抓波進場 battle。");
  const [manualLinkUrl, setManualLinkUrl] = useState("https://aipoger.com/battle?lang=zh");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visiblePosts = useMemo(() => posts.filter((post) => visibleTargets(post).length > 0), [posts]);
  const stats = useMemo(() => {
    const targets = visiblePosts.flatMap(visibleTargets);
    return {
      drafts: visiblePosts.filter((post) => post.status === "needs_review").length,
      approved: visiblePosts.filter((post) => post.status === "scheduled").length,
      published: targets.filter((target) => target.status === "published").length,
    };
  }, [visiblePosts]);

  const loadData = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/social", { headers: await authHeader() });
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

  const accountStatusByPlatform = useMemo(() => new Map(accountStatuses.map((account) => [account.platform, account])), [accountStatuses]);

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
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
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
      setError("目前沒有可建立草稿的正式戰報。");
      return;
    }
    const created = await runAction("create_battle_draft", { battleId: selectedBattleId }, "create-battle", "已建立 Battle 戰報草稿。");
    if (created) setDraftMode("manual");
  }

  async function createManualDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await runAction(
      "create_manual_draft",
      { topic: manualTopic, body: manualBody, cta: manualCta, linkUrl: manualLinkUrl },
      "create-manual",
      "已建立公告草稿。",
    );
    if (created) setDraftMode("manual");
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("文案已複製。");
    } catch {
      setError("無法存取剪貼簿，請直接選取文案複製。");
    }
  }

  async function deletePost(post: SocialPost) {
    if (!window.confirm(`確定刪除「${post.title}」這筆草稿？`)) return;
    await runAction("delete_post", { postId: post.id }, `delete-${post.id}`, "草稿已刪除。");
  }

  if (adminState === "checking") {
    return <main className="min-h-screen bg-[#050505] px-5 py-10 text-sm font-black text-zinc-400">檢查社群後台權限中...</main>;
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-3xl font-black">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <Link href="/auth" className="mt-5 inline-flex rounded-md bg-orange-500 px-4 py-3 text-sm font-black text-black">前往登入</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-orange-200/80">AIPOGER SOCIAL</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">社群發文</h1>
            <p className="mt-2 text-sm font-bold text-zinc-400">建立草稿，確認內容，批准後才發送。</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-black">
            <Link href="/admin/choice" className="rounded-full border border-white/15 px-3 py-2 text-zinc-200">Choice 管理</Link>
            <Link href="/admin/showtime" className="rounded-full border border-white/15 px-3 py-2 text-zinc-200">Showtime 管理</Link>
            <Link href="/admin/analytics" className="rounded-full border border-white/15 px-3 py-2 text-zinc-200">數據</Link>
          </nav>
        </header>

        {(message || error) ? <div className={`mt-4 border px-4 py-3 text-sm font-black ${error ? "border-red-400/35 bg-red-500/10 text-red-100" : "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"}`}>{error || message}</div> : null}

        <section className="mt-5 border-y border-white/10 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">PUBLISH ROUTES</p><h2 className="mt-1 text-lg font-black">平台狀態</h2></div>
            <p className="text-xs font-bold text-zinc-500">Webhook／token 只會顯示是否已設定，不會自動送測試訊息。</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-5">
            {accountStatuses.map((account) => (
              <div key={account.platform} className="min-w-0 border-l border-white/10 pl-3 first:border-l-0 first:pl-0 lg:first:border-l lg:first:pl-3">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black">{account.displayName}</p><span className={`rounded-full border px-2 py-1 text-[0.62rem] font-black ${connectionClass(account.connectionStatus)}`}>{connectionLabel(account.connectionStatus)}</span></div>
                <p className="mt-2 text-xs font-bold leading-5 text-zinc-500">{account.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.65fr]">
          <div className="border border-white/10 bg-black/35 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">NEW DRAFT</p><h2 className="mt-1 text-xl font-black">建立草稿</h2></div><div className="inline-flex border border-white/10 p-1"><button type="button" onClick={() => setDraftMode("manual")} className={`px-3 py-2 text-xs font-black ${draftMode === "manual" ? "bg-white text-black" : "text-zinc-400"}`}>手動公告</button><button type="button" onClick={() => setDraftMode("battle")} className={`px-3 py-2 text-xs font-black ${draftMode === "battle" ? "bg-white text-black" : "text-zinc-400"}`}>Battle 戰報</button></div></div>

            {draftMode === "battle" ? (
              <div className="mt-5">
                <label className="text-xs font-black text-zinc-500">選擇正式 Battle 戰報</label>
                <select value={selectedBattleId} onChange={(event) => setSelectedBattleId(event.target.value)} className="mt-2 h-11 w-full border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none">
                  {recentBattleResults.length === 0 ? <option value="">目前沒有可用戰報</option> : recentBattleResults.map((result) => <option key={result.id} value={result.battle_id}>{result.battle_code || shortId(result.battle_id)}｜{result.winner_name}《{result.winner_song_name}》｜{result.final_vote_left}:{result.final_vote_right}</option>)}
                </select>
                <button type="button" disabled={!selectedBattleId || busyId === "create-battle"} onClick={() => void createBattleDraft()} className="mt-4 rounded-md bg-orange-400 px-4 py-3 text-sm font-black text-black disabled:opacity-40">建立戰報草稿</button>
              </div>
            ) : (
              <form onSubmit={createManualDraft} className="mt-5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black text-zinc-500">主題<input value={manualTopic} onChange={(event) => setManualTopic(event.target.value)} className="mt-2 h-11 w-full border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none" /></label><label className="text-xs font-black text-zinc-500">連結<span className="ml-2 text-zinc-700">選填</span><input value={manualLinkUrl} onChange={(event) => setManualLinkUrl(event.target.value)} className="mt-2 h-11 w-full border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none" /></label></div>
                <label className="text-xs font-black text-zinc-500">內文<textarea value={manualBody} onChange={(event) => setManualBody(event.target.value)} rows={4} className="mt-2 w-full resize-y border border-white/10 bg-black px-3 py-3 text-sm font-bold leading-6 text-white outline-none" /></label>
                <label className="text-xs font-black text-zinc-500">行動句<input value={manualCta} onChange={(event) => setManualCta(event.target.value)} className="mt-2 h-11 w-full border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none" /></label>
                <button type="submit" disabled={busyId === "create-manual"} className="justify-self-start rounded-md bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:opacity-40">建立草稿</button>
              </form>
            )}
          </div>

          <aside className="border border-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">WORK QUEUE</p>
            <dl className="mt-4 grid grid-cols-3 gap-3"><div><dt className="text-xs font-bold text-zinc-500">待批准</dt><dd className="mt-1 text-2xl font-black">{stats.drafts}</dd></div><div><dt className="text-xs font-bold text-zinc-500">已批准</dt><dd className="mt-1 text-2xl font-black">{stats.approved}</dd></div><div><dt className="text-xs font-bold text-zinc-500">已發布</dt><dd className="mt-1 text-2xl font-black">{stats.published}</dd></div></dl>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs font-bold leading-6 text-zinc-500">Discord 與 X 需先批准再明確發送；Instagram、YouTube 與 Facebook 只提供可複製的文案與手動交接。</p>
          </aside>
        </section>

        <section className="mt-8 border-t border-white/10 pt-5">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">DRAFTS</p><h2 className="mt-1 text-xl font-black">草稿與發布紀錄</h2></div><span className="text-sm font-bold text-zinc-500">{visiblePosts.length} 筆</span></div>
          {visiblePosts.length === 0 ? <p className="mt-4 border border-dashed border-white/15 px-4 py-8 text-center text-sm font-bold text-zinc-500">目前沒有草稿。從上方建立第一篇即可。</p> : <div className="mt-4 divide-y divide-white/10 border-y border-white/10">{visiblePosts.map((post) => { const targets = visibleTargets(post); const expanded = expandedPostId === post.id; return <article key={post.id} className="py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-orange-100">{post.source_type === "battle_result" ? "BATTLE 戰報" : "人工公告"}</span><span className="rounded-full border border-white/10 px-2 py-1 text-[0.65rem] font-black text-zinc-300">{statusLabel[post.status]}</span><span className="text-xs font-bold text-zinc-600">{formatTime(post.created_at)}</span></div><h3 className="mt-2 truncate text-lg font-black">{post.title}</h3><p className="mt-2 flex flex-wrap gap-1.5">{targets.map((target) => <span key={target.id} className="rounded-full bg-white/[0.05] px-2 py-1 text-[0.65rem] font-black text-zinc-400">{labelForPlatform(target.platform)} · {statusLabel[target.status]}</span>)}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExpandedPostId(expanded ? null : post.id)} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black">{expanded ? "收合" : "管理"}</button><button type="button" disabled={post.status !== "needs_review" || busyId === post.id} onClick={() => void runAction("approve_post", { postId: post.id }, post.id, "草稿已批准，可依平台處理。")} className="rounded-md bg-emerald-300 px-3 py-2 text-xs font-black text-black disabled:opacity-40">{post.status === "scheduled" ? "已批准" : "批准"}</button><button type="button" disabled={post.status === "published" || busyId === `delete-${post.id}`} onClick={() => void deletePost(post)} className="rounded-md border border-red-300/35 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-40">刪除</button></div></div>{expanded ? <div className="mt-5 border border-white/10 bg-black/35 p-4">{targets.map((target) => <SocialTargetEditor key={target.id} post={post} target={target} busyId={busyId} runAction={runAction} copyText={copyText} accountStatus={accountStatusByPlatform.get(target.platform)} />)}</div> : null}</article>; })}</div>}
        </section>
      </section>
    </main>
  );
}
