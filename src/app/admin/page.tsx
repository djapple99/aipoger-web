"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, ExternalLink, LayoutDashboard, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { getActiveAuthSession, loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";

const modules = [
  { href: "/admin/ai-music-bible", title: "聖經內容工作台", label: "練功聖經", description: "直接編輯 Prompt、歌詞招式與台語調音條目。", tone: "orange" },
  { href: "/admin/comments", title: "評論管理中控台", label: "社群安全", description: "集中查看歌曲、Choice 與聖經評論及檢舉。", tone: "cyan" },
  { href: "/admin/moderation", title: "檢舉與投稿管理", label: "內容審查", description: "處理檢舉、隱藏、恢復與投稿狀態。", tone: "rose" },
  { href: "/admin/analytics", title: "Analytics", label: "數據", description: "查看會員、播放、互動與成長訊號。", tone: "yellow" },
  { href: "/admin/listen-bar", title: "傷心酒吧", label: "音樂目錄", description: "管理公播歌曲、排序、分類與展示資料。", tone: "cyan" },
  { href: "/admin/battles", title: "Battle 管理", label: "鬥歌場", description: "檢視進行中的 Drop Battle 與結果。", tone: "orange" },
  { href: "/admin/showtime", title: "Showtime", label: "認證作品", description: "維護認證作品展示與 Choice 選曲。", tone: "yellow" },
  { href: "/admin/choice", title: "Choice", label: "策展歌單", description: "建立、編輯與發布 AIPOGER Choice。", tone: "cyan" },
  { href: "/admin/social", title: "社群後台", label: "發布", description: "整理社群草稿、審核與發布節奏。", tone: "emerald" },
  { href: "/admin/quiz", title: "耳朵測驗", label: "互動內容", description: "管理 AI 音樂耳朵測驗題目。", tone: "purple" },
  { href: "/admin/gatekeeper-drops", title: "官方守門 Drop", label: "官方素材", description: "維護常駐入口使用的官方 Drop。", tone: "rose" },
] as const;

const toneClasses: Record<(typeof modules)[number]["tone"], string> = {
  orange: "border-orange-300/25 bg-orange-300/[0.07] hover:border-orange-200/55",
  cyan: "border-cyan-300/20 bg-cyan-300/[0.06] hover:border-cyan-200/55",
  rose: "border-rose-300/20 bg-rose-300/[0.06] hover:border-rose-200/55",
  yellow: "border-yellow-300/20 bg-yellow-300/[0.06] hover:border-yellow-200/55",
  emerald: "border-emerald-300/20 bg-emerald-300/[0.06] hover:border-emerald-200/55",
  purple: "border-purple-300/20 bg-purple-300/[0.06] hover:border-purple-200/55",
};

export default function AdminHomePage() {
  const [state, setState] = useState<AdminState>("checking");

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await getActiveAuthSession();
      if (!active) return;
      if (!session?.user) {
        setState("login");
        return;
      }
      const allowed = await loadIsAdmin(session.user.id);
      if (active) setState(allowed ? "ready" : "denied");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state !== "ready") {
    const checking = state === "checking";
    const authHref = state === "denied"
      ? "/auth?next=%2Fadmin&owner=1&switch=1"
      : "/auth?next=%2Fadmin&owner=1";
    return (
      <main className="aipo-stage-bg min-h-screen px-4 pb-16 pt-28 text-white sm:px-6">
        <section className="mx-auto max-w-2xl rounded-[1.6rem] border border-white/10 bg-black/45 p-8 text-center shadow-2xl">
          <ShieldCheck className="mx-auto h-11 w-11 text-orange-300" />
          <p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.34em] text-orange-300/75`}>AIPOGER OWNER DESK</p>
          <h1 className="mt-3 text-4xl font-black">{checking ? "正在確認後台權限…" : state === "login" ? "請先登入" : "沒有管理權限"}</h1>
          {!checking ? (
            <>
              <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-zinc-400">
                {state === "denied" ? "目前登入的帳號不是 owner，請切換帳號後再進入。" : "後台只開放 owner 帳號使用。"}
              </p>
              <Link href={authHref} className="aipo-primary-button mt-7 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-black">
                {state === "denied" ? "切換 owner 帳號" : "登入 owner 帳號"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pb-20 pt-24 text-zinc-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,106,0,0.18),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.1),transparent_28%),linear-gradient(180deg,#050505,#090706_55%,#030505)]" />
      <div className="relative mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-7">
          <div>
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-orange-300/75`}>AIPOGER OWNER DESK</p>
            <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-none tracking-[-0.05em] text-white">後台總覽</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-zinc-400">一個入口管理內容、社群、音樂目錄與數據。進入模組後仍會再次驗證 owner 權限。</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/profile" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200 hover:border-white/30 hover:text-white">回到 Profile</Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 hover:border-orange-100/50">回到網站 <ExternalLink className="h-3.5 w-3.5" /></Link>
          </nav>
        </header>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.3rem] border border-orange-300/25 bg-orange-400/[0.08] p-5 md:col-span-2">
            <div className="flex items-start gap-4">
              <BookOpenText className="mt-1 h-7 w-7 shrink-0 text-orange-200" />
              <div>
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.28em] text-orange-200/75`}>EDITORIAL SHORTCUT</p>
                <h2 className="mt-2 text-2xl font-black text-white">小地方自己改，不必等部署</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-orange-50/75">聖經內容工作台會保留程式預設，單筆儲存即可即時套用；需要撤回時按「恢復預設」。</p>
                <Link href="/admin/ai-music-bible" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-orange-300 px-5 text-sm font-black text-black transition hover:bg-orange-100">開啟聖經編輯 <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
            <MessageSquareText className="h-7 w-7 text-cyan-200" />
            <p className={`${fontRighteous.className} mt-4 text-[11px] uppercase tracking-[0.28em] text-cyan-200/75`}>COMMUNITY PULSE</p>
            <h2 className="mt-2 text-xl font-black text-white">先看評論與檢舉</h2>
            <Link href="/admin/comments" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-100 hover:text-white">進入評論中控台 <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3"><LayoutDashboard className="h-5 w-5 text-orange-200" /><h2 className="text-xl font-black text-white">所有管理模組</h2><span className="text-xs font-black tracking-[0.14em] text-zinc-600">{modules.length} MODULES</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((item) => (
              <Link key={item.href} href={item.href} className={`group rounded-[1.2rem] border p-5 transition hover:-translate-y-0.5 ${toneClasses[item.tone]}`}>
                <div className="flex items-start justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{item.label}</span><ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-white" /></div>
                <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
