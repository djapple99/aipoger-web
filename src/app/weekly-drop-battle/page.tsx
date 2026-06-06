"use client";

import Image from "next/image";
import Link from "next/link";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

export default function WeeklyDropBattlePage() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const langQuery = `?lang=${lang}`;
  const steps = isZh
    ? [
        ["01", "投稿你的最強 Drop", "上傳 30 到 90 秒最能抓住聽眾的 AI 音樂片段。"],
        ["02", "AIPOGER 官方配對", "你不用自己發起 battle，官方週賽會負責主題、配對與曝光。"],
        ["03", "聽眾投票決定", "作品被公開聽見，勝出者進入 Honor Board 與 AIPOGER Select 候選。"],
      ]
    : lang === "ja"
      ? [
          ["01", "最強のDropを投稿", "聴衆を一瞬でつかむ30〜90秒のAI音楽パートをアップロード。"],
          ["02", "AIPOGERが公式マッチング", "自分で場を作らなくていい。週次イベントがテーマ、対戦、露出を担います。"],
          ["03", "聴衆が決める", "楽曲は公開で聴かれ、勝者はHonor BoardとAIPOGER Select候補へ進みます。"],
        ]
      : lang === "ko"
        ? [
            ["01", "가장 강한 Drop 제출", "관객을 바로 붙잡는 30~90초 AI 음악 구간을 업로드하세요."],
            ["02", "AIPOGER 공식 매칭", "직접 배틀을 열 필요 없습니다. 주간 이벤트가 테마, 매칭, 노출을 맡습니다."],
            ["03", "관객이 결정", "트랙은 공개적으로 들리고, 우승곡은 Honor Board와 AIPOGER Select 후보로 이동합니다."],
          ]
    : [
        ["01", "Submit your best Drop", "Upload the 30 to 90 seconds of AI music that hits hardest."],
        ["02", "AIPOGER matches the battle", "You do not need to host it yourself. The weekly event handles the theme, match, and exposure."],
        ["03", "Listeners decide", "Tracks get heard in public. Winners move toward the Honor Board and AIPOGER Select."],
      ];
  const themes = isZh
    ? ["Cyber Pop", "Sad AI Ballad", "Future Club", "Anime Opening", "Dark R&B"]
    : ["Cyber Pop", "Sad AI Ballad", "Future Club", "Anime Opening", "Dark R&B"];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_12%,rgba(255,106,0,0.28),transparent_34%),radial-gradient(circle_at_84%_16%,rgba(0,202,255,0.16),transparent_30%),linear-gradient(180deg,#070605_0%,#050505_48%,#080604_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:50px_50px]" />

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 pt-20 md:pt-24">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.38em] text-orange-300/80">
              AIPOGER Official Event
            </p>
            <h1 className="mt-4 text-[clamp(3rem,10vw,7rem)] font-black uppercase leading-[0.85] tracking-normal text-[#fff7e8] [text-shadow:0_18px_42px_rgba(0,0,0,0.8)]">
              Weekly Drop Battle
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-black leading-8 text-orange-100 md:text-2xl md:leading-9">
              {isZh
                ? "不要等別人開局。AIPOGER 每週發起 AI 音樂主題賽，創作者投稿 Drop，聽眾投票，勝出作品留下正式紀錄。"
                : lang === "ja"
                  ? "誰かが場を作るのを待たない。AIPOGERは毎週AI音楽テーマ戦を開催し、クリエイターがDropを投稿、聴衆が投票、勝者は公式記録として残ります。"
                  : lang === "ko"
                    ? "누가 판을 열 때까지 기다리지 마세요. AIPOGER는 매주 AI 음악 테마 배틀을 열고, 크리에이터는 Drop을 제출하며, 관객 투표로 우승 기록을 남깁니다."
                : "Do not wait for someone else to host the battle. AIPOGER runs official weekly AI music battles: creators submit Drops, listeners vote, and winners earn public records."}
            </p>
          </div>
          <div className="hidden justify-end md:flex">
            <Image
              src={AIPOGER_BRAND_LOGO}
              alt="AIPOGER"
              width={280}
              height={280}
              className="h-56 w-56 object-contain drop-shadow-[0_0_42px_rgba(255,106,0,0.2)]"
              priority
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(([num, title, body]) => (
            <div key={num} className="rounded-[0.45rem] border border-white/10 bg-black/58 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur">
              <p className="text-xs font-black text-cyan-200/80">{num}</p>
              <h2 className="mt-3 text-xl font-black text-white">{title}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 rounded-[0.55rem] border border-orange-300/20 bg-black/66 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.42),0_0_36px_rgba(255,106,0,0.08)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">
              {isZh ? "本週可用主題" : lang === "ja" ? "今週のテーマレーン" : lang === "ko" ? "이번 주 테마 레인" : "Theme lanes"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {themes.map((theme) => (
                <span key={theme} className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-xs font-black text-zinc-100">
                  {theme}
                </span>
              ))}
            </div>
          </div>
          <Link
            href={`/battle/setup${langQuery}`}
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-orange-500 px-6 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          >
            {isZh ? "投稿參賽" : lang === "ja" ? "Dropを投稿" : lang === "ko" ? "Drop 제출" : "Submit a Drop"}
          </Link>
        </div>
      </section>
    </main>
  );
}
