"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import LangToggle from "@/components/lang-toggle";
import { getFreshSession } from "@/lib/auth-session";
import { rememberAuthReturnPath } from "@/lib/auth-urls";
import { useI18n } from "@/lib/i18n";
import { fontRighteous } from "@/lib/fonts";

function appendLang(url: string, lang: string) {
  return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}`;
}

export default function MusicAnalysisPage() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [analysisProbeCount, setAnalysisProbeCount] = useState(0);
  const configuredAnalysisUrl = process.env.NEXT_PUBLIC_MUSIC_ANALYSIS_URL?.trim() || "";

  const analysisUrl = useMemo(() => {
    if (!configuredAnalysisUrl) return null;
    return appendLang(configuredAnalysisUrl, lang);
  }, [configuredAnalysisUrl, lang]);

  useEffect(() => {
    let mounted = true;
    void getFreshSession().then((freshSession) => {
      if (!mounted) return;
      setSession(freshSession);
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const nextPath = `/music-analysis?lang=${lang}`;
  const loginHref = `/auth?next=${encodeURIComponent(nextPath)}`;
  const shouldWakeAnalysis = !checking && Boolean(session && analysisUrl);
  const embeddedAnalysisUrl = shouldWakeAnalysis && analysisReady && analysisUrl ? analysisUrl : null;

  useEffect(() => {
    if (!shouldWakeAnalysis) {
      setAnalysisReady(false);
      setAnalysisProbeCount(0);
      return;
    }

    let mounted = true;
    let timer: number | undefined;

    const probe = async () => {
      try {
        const response = await fetch("/api/music-analysis/health", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { ready?: boolean } | null;
        if (!mounted) return;
        setAnalysisProbeCount((count) => count + 1);
        if (payload?.ready) {
          setAnalysisReady(true);
          return;
        }
      } catch {
        if (!mounted) return;
        setAnalysisProbeCount((count) => count + 1);
      }
      if (mounted) timer = window.setTimeout(probe, 3000);
    };

    void probe();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [shouldWakeAnalysis]);

  if (embeddedAnalysisUrl) {
    return (
      <main className="flex min-h-screen flex-col bg-[#050505] text-white">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-black/82 px-4 backdrop-blur md:px-6">
          <Link
            href={`/?lang=${lang}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-4 text-xs font-black text-zinc-200 transition hover:border-orange-300/60 hover:text-white"
          >
            {isZh ? "回主頁" : "Home"}
          </Link>
          <div className="min-w-0 text-center">
            <p className={`${fontRighteous.className} truncate text-xs uppercase tracking-[0.24em] text-cyan-200/80`}>
              AIPOGER A&R GATE
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-zinc-400">
              {isZh ? "已連接主網站帳號入口" : "Connected through the main site"}
            </p>
          </div>
          <LangToggle variant="inline" />
        </header>
        <iframe
          src={embeddedAnalysisUrl}
          title={isZh ? "AIPOGER 音樂分析引擎" : "AIPOGER Music Analysis Engine"}
          className="min-h-[calc(100vh-4rem)] w-full flex-1 border-0 bg-[#050505]"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="clipboard-write"
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(255,106,0,0.28),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(45,212,191,0.18),transparent_32%),linear-gradient(135deg,#050505_0%,#15100c_48%,#021213_100%)]" />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Link href={`/?lang=${lang}`} className="rounded-full border border-white/12 bg-black/45 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-orange-300/60 hover:text-white">
          {isZh ? "回主頁" : "Home"}
        </Link>
        <LangToggle variant="inline" />
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center py-10">
        <div className="w-full max-w-3xl rounded-[1.7rem] border border-white/12 bg-black/62 px-6 py-9 text-center shadow-[0_30px_90px_rgba(0,0,0,0.62),0_0_48px_rgba(255,106,0,0.12)] backdrop-blur md:px-10 md:py-12">
          <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.42em] text-cyan-200/80`}>
            AIPOGER A&R GATE
          </p>
          <h1 className="mt-5 text-[clamp(2.7rem,8vw,5.5rem)] font-black leading-none text-[#fffaf1] [text-shadow:0_18px_38px_rgba(0,0,0,0.78)]">
            {isZh ? "分析你的音樂" : "Analyze Your Music"}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-bold leading-7 text-zinc-300 md:text-lg">
            {isZh
              ? "登入後上傳歌曲，讓 AI 協助判斷市場定位、商業用處與適合挑戰的戰場。"
              : "Sign in to upload a track for market positioning, commercial use, and battlefield routing."}
          </p>

          <div className="mt-8">
            {checking ? (
              <p className="text-sm font-black text-zinc-400">{isZh ? "檢查登入狀態中..." : "Checking session..."}</p>
            ) : !session ? (
              <Link
                href={loginHref}
                onClick={() => rememberAuthReturnPath(nextPath)}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-orange-500 px-8 text-base font-black text-black shadow-[0_0_34px_rgba(255,106,0,0.28)] transition hover:bg-orange-300"
              >
                {isZh ? "登入後分析歌曲" : "Sign In To Analyze"}
              </Link>
            ) : analysisUrl ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-cyan-200/22 bg-cyan-300/[0.07] px-5 py-5">
                <p className="text-base font-black text-cyan-50">
                  {analysisReady ? (isZh ? "分析引擎已連線" : "Analysis engine is ready") : isZh ? "AIPOGER 正在喚醒分析引擎…" : "AIPOGER is waking the analysis engine..."}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
                  {isZh
                    ? analysisProbeCount > 2
                      ? "Render 服務冷啟動中，請留在這裡；主站會自動接入，不會顯示 Render 等待頁。"
                      : "正在確認服務狀態，完成後會自動進入音樂分析台。"
                    : analysisProbeCount > 2
                      ? "The Render service is cold-starting. Stay here; the main site will connect automatically."
                      : "Checking service status. The music analysis console opens automatically when ready."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-orange-300/22 bg-orange-500/8 px-5 py-4 text-sm font-bold leading-6 text-orange-100">
                {isZh
                  ? "分析引擎尚未接上正式網址；入口已保護，不會再導向無效的本機位址。"
                  : "The analysis engine has no production URL yet; this entry no longer points to an invalid localhost address."}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
