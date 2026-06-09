"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import LangToggle from "@/components/lang-toggle";
import { supabase } from "@/lib/supabase";
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
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
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
  const previewCards = useMemo(
    () => isZh
      ? [
          ["市場定位", "判斷作品最適合短影音、劇情、廣告、情緒歌單或 AIPOGER 戰場。"],
          ["最強 Drop", "找出最能被聽眾記住的段落，讓作品先用一段聲音被驗證。"],
          ["投放建議", "判斷作品適合先進 Drop Battle，還是放進傷心酒吧測聽眾反應。"],
        ]
      : [
          ["Market Lane", "Find whether the track fits shorts, drama, ads, mood playlists, or an AIPOGER arena."],
          ["Strongest Drop", "Locate the section listeners are most likely to remember and vote on."],
          ["Route Fit", "Recommend whether the track should test first in Drop Battle or Bar Heartbreak."],
        ],
    [isZh],
  );
  const sampleRows = useMemo(
    () => isZh
      ? [
          ["市場用途", "城市夜景 / 情緒短片 / AI MV"],
          ["記憶點", "副歌前 12 秒最容易留下畫面"],
          ["下一步", "先丟 Drop Battle 測投票，再進傷心酒吧聽感"],
        ]
      : [
          ["Use Case", "City night / emotional shorts / AI MV"],
          ["Memory Point", "The 12 seconds before the chorus carry the strongest image."],
          ["Next Step", "Test as a Drop Battle first, then check listening retention in Bar Heartbreak."],
        ],
    [isZh],
  );

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
      <main className="aipo-stage-bg flex min-h-screen flex-col text-white">
        <header className="aipo-control-panel relative z-10 m-3 flex min-h-16 items-center justify-between gap-3 rounded-[1.15rem] px-4 md:px-6">
          <div className="h-10 w-14" aria-hidden="true" />
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
    <main className="aipo-stage-bg relative min-h-screen overflow-hidden px-4 py-6 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(255,106,0,0.28),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(45,212,191,0.18),transparent_32%),linear-gradient(135deg,#050505_0%,#15100c_48%,#021213_100%)]" />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="h-10 w-14" aria-hidden="true" />
        <LangToggle variant="inline" />
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center py-10">
        <div className="aipo-control-panel aipo-panel-line w-full rounded-[1.35rem] px-5 py-7 md:px-8 md:py-10">
          <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.42em] text-cyan-200/80`}>
            AIPOGER A&R GATE
          </p>
          <h1 className="mt-5 text-[clamp(2.45rem,8vw,5.5rem)] font-black leading-none text-[#fffaf1] [text-shadow:0_18px_38px_rgba(0,0,0,0.78)]">
            {isZh ? "分析你的音樂" : "Analyze Your Music"}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-zinc-300 md:text-lg">
            {isZh
              ? "登入後上傳歌曲，找出市場定位、最強 Drop、適合挑戰的戰場，以及未來播放與商業化的可能路線。"
              : "Sign in to upload a track, find its market lane, strongest Drop, best battle fit, and possible path toward airplay or commercial use."}
          </p>

          <div className="mt-7">
            {checking ? (
              <p className="text-sm font-black text-zinc-400">{isZh ? "檢查登入狀態中..." : "Checking session..."}</p>
            ) : !session ? (
              <Link
                href={loginHref}
                className="aipo-primary-button inline-flex min-h-14 items-center justify-center rounded-2xl px-8 text-base font-black transition"
              >
                {isZh ? "登入後分析歌曲" : "Sign In and Analyze"}
              </Link>
            ) : analysisUrl ? (
              <div className="max-w-xl rounded-2xl border border-cyan-200/22 bg-cyan-300/[0.07] px-5 py-5">
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

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {previewCards.map(([title, body]) => (
              <div key={title} className="aipo-control-panel rounded-2xl p-4">
                <p className="text-sm font-black text-orange-200">{title}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="aipo-control-panel mt-5 rounded-2xl p-4 md:p-5">
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.26em] text-cyan-200/80`}>
              {isZh ? "分析結果會像這樣" : "Preview of the output"}
            </p>
            <div className="mt-4 grid gap-3">
              {sampleRows.map(([label, value]) => (
                <div key={label} className="grid gap-1 rounded-xl border border-white/8 bg-black/36 px-4 py-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-center">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
                  <span className="text-sm font-black leading-6 text-cyan-50">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
