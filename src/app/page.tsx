"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import LangToggle from "@/components/lang-toggle";
import HomeBgmPlayer from "@/components/home-bgm-player";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontGlowSans, fontRighteous, fontSourceSerifTC } from "@/lib/fonts";
import { AIPOGER_PERSONAL_RANK, rankLabelForLevel } from "@/lib/battle-pool-rules";
import type { Session, User } from "@supabase/supabase-js";

const SPLASH_STEPS = {
  fadeIn: 420,
  hold: 480,
  fadeOut: 360,
};

const TOTAL_SPLASH_MS =
  SPLASH_STEPS.fadeIn + SPLASH_STEPS.hold + SPLASH_STEPS.fadeOut;

type SplashPhase = "fadeIn" | "hold" | "fadeOut";

function BattleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-current transition"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 10.5a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-current transition"
      aria-hidden="true"
    >
      <path
        d="M3.8 12.5a8.2 8.2 0 0 1 16.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="2.4" y="12.2" width="3.8" height="6.2" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17.8" y="12.2" width="3.8" height="6.2" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.8 18.4c1.7 1.8 4.7 1.8 6.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ListenBarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-current transition"
      aria-hidden="true"
    >
      <path d="M5 15.5V9a7 7 0 0 1 14 0v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3.5" y="13" width="4.2" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
      <rect x="16.3" y="13" width="4.2" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 11.5v5M12 9.5v7M14 12.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AnalyzeMusicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-current transition"
      aria-hidden="true"
    >
      <path d="M4 17V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 21h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function userAvatarUrl(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  if (!m) return null;
  const a = m.avatar_url;
  const p = m.picture;
  if (typeof a === "string" && a.length > 0) return a;
  if (typeof p === "string" && p.length > 0) return p;
  return null;
}

function HomeAuthBar() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [aipoCoins, setAipoCoins] = useState<number | null>(null);
  const [levelLine, setLevelLine] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const forceShowLogin = process.env.NEXT_PUBLIC_FORCE_SHOW_LOGIN === "true";

  const loadProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      try {
        type UserProfileRow = {
          level?: number | null;
          total_wins?: number | null;
        };
        type FighterProfileRow = {
          display_name?: string | null;
          avatar_url?: string | null;
        };

        const { data, error } = await supabase
          .from("user_profiles")
          .select("level, total_wins")
          .eq("id", userId)
          .maybeSingle<UserProfileRow>();

        if (error) {
          console.error(error);
          setAipoCoins(0);
          setLevelLine(null);
          setProfileAvatarUrl(null);
          setIsAdmin(false);
          return;
        }

        const admin = await loadIsAdmin(userId);
        setIsAdmin(admin);
        setAipoCoins(0);

        const { data: fighterProfile } = await supabase
          .from("fighter_profiles")
          .select("display_name, avatar_url")
          .eq("id", userId)
          .maybeSingle<FighterProfileRow>();

        setProfileAvatarUrl(
          typeof fighterProfile?.avatar_url === "string" && fighterProfile.avatar_url.length > 0
            ? fighterProfile.avatar_url
            : null,
        );

        const fn = typeof fighterProfile?.display_name === "string" ? fighterProfile.display_name.trim() : "";
        if (typeof data?.level === "number") {
          setLevelLine(admin ? AIPOGER_PERSONAL_RANK : rankLabelForLevel(data.level, fn));
        } else {
          setLevelLine(admin ? AIPOGER_PERSONAL_RANK : null);
        }
        if (fn) writeFighterNameToStorage(fn);
      } finally {
        setProfileLoading(false);
      }
    },
    [],
  );

  const runDailyCheckIn = useCallback(async (userId: string) => {
    if (process.env.NEXT_PUBLIC_AUTH_BYPASS === "true") return;
    try {
      if (await loadIsAdmin(userId)) return;
      const { data: gained, error } = await supabase.rpc("award_daily_login_points");
      if (error) {
        console.warn("[daily login]", error);
        return;
      }
      if (typeof gained === "number" && gained > 0) void loadProfile(userId);
    } catch (e) {
      console.warn("[daily login]", e);
    }
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        void loadProfile(s.user.id);
        void runDailyCheckIn(s.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        void loadProfile(s.user.id);
        void runDailyCheckIn(s.user.id);
      } else {
        setAipoCoins(null);
        setLevelLine(null);
        setProfileAvatarUrl(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, runDailyCheckIn]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const avatarUrl = profileAvatarUrl ?? (user ? userAvatarUrl(user) : null);

  if (forceShowLogin || !user) {
    return (
      <Link
        href="/auth"
        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-600 bg-zinc-950/90 px-4 py-2.5 text-sm font-semibold text-zinc-100 shadow-lg backdrop-blur transition hover:border-[#ff6a00] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
      >
        {t("login")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="hidden min-w-0 sm:block rounded-2xl border border-zinc-700/80 bg-zinc-950/80 px-3 py-2 text-right shadow-lg backdrop-blur"
        title={t("home_coin_tooltip")}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{t("aipo_coin")}</p>
        <p className="truncate text-sm font-bold tabular-nums text-[#ff6a00]">
          {profileLoading ? "…" : (aipoCoins ?? 0).toLocaleString()}
        </p>
        {isAdmin && (
          <p className="mt-1 text-[10px] font-semibold text-amber-400">{t("home_admin_badge")} · Battle 管理</p>
        )}
        {levelLine && (
          <p className="mt-1 truncate text-[10px] leading-tight text-zinc-400">
            <span className="text-zinc-500">{t("home_profile_level")} </span>
            <span className="font-semibold text-zinc-200">{levelLine}</span>
          </p>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-600 bg-zinc-900 shadow-lg transition hover:border-[#ff6a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={t("home_account_menu_aria")}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-lg font-bold text-zinc-400">
              {(user.email ?? user.user_metadata?.full_name ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 py-1 shadow-xl ring-1 ring-black/40"
          >
            <div className="border-b border-zinc-800 px-3 py-2 sm:hidden">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t("aipo_coin")}</p>
              <p className="font-bold tabular-nums text-[#ff6a00]">
                {profileLoading ? "…" : (aipoCoins ?? 0).toLocaleString()}
              </p>
              {levelLine && (
                <p className="mt-1 text-[10px] leading-tight text-zinc-400">
                  <span className="text-zinc-500">{t("home_profile_level")} </span>
                  <span className="font-semibold text-zinc-200">{levelLine}</span>
                </p>
              )}
            </div>
            <Link
              href="/profile"
              role="menuitem"
              className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("home_profile_link")}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="w-full px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
            >
              {t("logout")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, lang } = useI18n();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("fadeIn");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("code")) return;
    url.pathname = "/auth/callback";
    window.location.replace(url.toString());
  }, []);

  useEffect(() => {
    const fadeInTimer = window.setTimeout(() => setPhase("hold"), SPLASH_STEPS.fadeIn);
    const holdTimer = window.setTimeout(
      () => setPhase("fadeOut"),
      SPLASH_STEPS.fadeIn + SPLASH_STEPS.hold,
    );
    const endTimer = window.setTimeout(() => setIsSplashFinished(true), TOTAL_SPLASH_MS);

    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  const splashOpacity = useMemo(() => {
    if (phase === "fadeIn") return "opacity-100";
    if (phase === "hold") return "opacity-100";
    return "opacity-0";
  }, [phase]);

  if (!isSplashFinished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className={`transition-opacity duration-700 ${splashOpacity}`}>
          <Image
            src={AIPOGER_BRAND_LOGO}
            alt={t("home_logo_alt")}
            width={440}
            height={440}
            priority
            className="h-auto w-[min(88vw,440px)] max-w-[440px] min-w-[280px] object-contain"
          />
        </div>
      </main>
    );
  }

  const isZh = lang === "zh";
  const heroTitle = t("home_secondary_title");
  const heroLine = t("home_hero_line");
  const heroCopy = t("home_tagline");
  const zhDisplayClass = `${fontGlowSans.className} tracking-[-0.015em]`;
  const zhSerifClass = `${fontSourceSerifTC.className} font-black tracking-[0.012em]`;
  const heroAccentClass = "font-black text-[#f28a2f] drop-shadow-[0_0_15px_rgba(255,106,0,0.2)]";
  const heroSingleLineClass = "max-w-[min(62rem,calc(100vw-2.5rem))] overflow-hidden text-ellipsis whitespace-nowrap";
  const heroChromeShadow = "[text-shadow:0_2px_0_rgba(255,255,255,0.06),0_16px_32px_rgba(0,0,0,0.9),0_0_14px_rgba(255,106,0,0.08)]";
  const musicAnalysisHref = `/music-analysis?lang=${lang}`;
  const statItems = isZh
    ? [
        ["Weekly", "官方賽"],
        ["90s", "Drop Battle"],
        ["Bar", "傷心酒吧"],
      ]
    : [
        ["Weekly", "Official Battle"],
        ["90s", "Best Drop"],
        ["Bar", "Heartbreak"],
      ];
  const infoLinks = isZh
    ? [
        { href: "/weekly-drop-battle", title: "Weekly Drop Battle", desc: "官方每週發起主題賽，創作者投稿 Drop 參戰" },
        { href: "/hook-guide", title: "最強Drop Battle 對決抓波規則", desc: "用 Drop 上場，累積戰績與創作者認可" },
        { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: t("home_analyze_music_desc") },
        { href: "/rank", title: "AIPOGER 榮譽榜", desc: "被投票、被熱播、被封存的作品紀錄" },
        { href: "/about", title: "關於愛播歌", desc: "AI 創作者一起成長與作品認可系統" },
        { href: "/partners", title: "廣告與合作", desc: "讓勝出作品走向播放、策展與商業合作" },
      ]
    : [
        { href: "/weekly-drop-battle", title: "Weekly Drop Battle", desc: "Official theme battles for AI music creators" },
        { href: "/hook-guide", title: "Drop Battle Rules", desc: "Put your strongest Drop on stage and build recognition" },
        { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: t("home_analyze_music_desc") },
        { href: "/rank", title: "AIPOGER Honor Board", desc: "Recognized wins, hot tracks, and archived creator records" },
        { href: "/about", title: "About AIPOGER", desc: "AI creator growth and music recognition system" },
        { href: "/partners", title: "Partnerships", desc: "Move winning tracks toward airplay, curation, and commercial use" },
      ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050505] px-4 py-4 text-[#f5f5f5] md:px-7 md:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[#050505]" />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_28%,rgba(112,43,12,0.42),transparent_38%),radial-gradient(circle_at_82%_26%,rgba(0,59,66,0.24),transparent_36%),linear-gradient(90deg,rgba(8,6,5,0.96)_0%,rgba(4,4,4,0.98)_54%,rgba(0,8,10,0.94)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.026] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:46px_46px]" />
      <div className="pointer-events-none absolute left-0 top-[5.5rem] hidden h-px w-[67vw] bg-gradient-to-r from-transparent via-orange-500/75 to-transparent md:block" />
      <div className="pointer-events-none absolute left-[42%] top-[8rem] hidden h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,106,0,0.075),rgba(255,106,0,0.03)_38%,transparent_72%)] blur-3xl md:block" />
      <div className="pointer-events-none absolute right-[6vw] top-[7.5rem] hidden h-[30rem] w-[36rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(117,225,231,0.065),rgba(255,106,0,0.035)_46%,transparent_74%)] blur-3xl md:block" />

      <header className="pointer-events-auto fixed right-4 top-4 z-40 flex max-w-[min(100vw-2rem,28rem)] items-start justify-end gap-2.5 md:right-6 md:top-6 md:gap-3">
        <LangToggle variant="inline" />
        <HomeAuthBar />
      </header>

      <HomeBgmPlayer />

      <section className="relative z-10 mx-auto grid w-full max-w-[116rem] gap-6 pb-1 pt-16 md:grid-cols-[minmax(0,1fr)_minmax(21rem,25.5rem)] md:items-center md:gap-[clamp(1.8rem,3.8vw,4.8rem)] md:pt-[clamp(4rem,7vh,5.4rem)]">
        <div className="relative isolate min-w-0 overflow-visible md:min-h-[28.6rem] md:px-[clamp(1.8rem,3.5vw,4.8rem)] md:pb-3 md:pt-[clamp(1.65rem,3.6vh,2.8rem)] xl:pl-[clamp(2.5rem,4.8vw,5.5rem)] before:pointer-events-none before:absolute before:inset-[-4rem_-5rem_-3rem_-3.5rem] before:-z-10 before:bg-[radial-gradient(ellipse_at_22%_46%,rgba(255,106,0,0.078),rgba(66,25,8,0.038)_46%,transparent_76%)] before:blur-[2px] before:content-['']">
          <div className="mb-2 flex items-center gap-3">
            <Image
              src={AIPOGER_BRAND_LOGO}
              alt={t("home_logo_alt")}
              width={64}
              height={64}
              priority
              className="h-10 w-10 rounded-full border border-white/10 bg-black/75 object-contain shadow-[0_0_22px_rgba(255,106,0,0.18)] md:h-11 md:w-11"
            />
            <div className="h-px flex-1 bg-gradient-to-r from-orange-500/70 via-white/20 to-transparent" />
          </div>

          <p className={`w-full max-w-full text-[4.25rem] font-black uppercase leading-[0.82] tracking-[-0.04em] text-[#fffaf1] min-[390px]:text-[4.55rem] sm:text-[6.25rem] md:text-[clamp(8.35rem,14.15vw,16.7rem)] md:leading-[0.78] md:tracking-[-0.066em] ${heroChromeShadow}`}>
            AIPOGER
          </p>
          <p
            className={`mt-3 ${heroSingleLineClass} text-[clamp(1.45rem,2.05vw,2.38rem)] leading-[1.38] ${heroAccentClass} ${
              isZh ? zhSerifClass : `${fontRighteous.className} font-black`
            }`}
          >
            {heroLine}
          </p>

          <h1
            className={`mt-3 max-w-[min(52rem,calc(100vw-2.5rem))] overflow-visible whitespace-nowrap pb-2 pt-0 text-[clamp(4.3rem,6vw,7.15rem)] leading-[1.03] text-[#fffaf1] ${heroChromeShadow} ${
              lang === "en"
                ? `${fontRighteous.className} font-normal`
                : "aipoger-brand-wordmark"
            }`}
          >
            {heroTitle}
          </h1>

          <div className="mt-6 grid gap-3 md:hidden">
            <Link
              href="/weekly-drop-battle"
              className="group flex items-center justify-between rounded-2xl border border-orange-300/60 bg-orange-500 px-5 py-4 text-black shadow-[0_0_34px_rgba(255,106,0,0.25)] transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
            >
              <BattleIcon />
              <span className="text-xl font-black tracking-[0.08em]">{t("btn_battle")}</span>
            </Link>
            <a
              href={musicAnalysisHref}
              className="group flex items-center justify-between rounded-2xl border border-cyan-200/55 bg-cyan-300/15 px-5 py-4 text-cyan-50 shadow-[0_0_34px_rgba(117,225,231,0.16)] transition hover:border-cyan-100 hover:bg-cyan-300/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
            >
              <AnalyzeMusicIcon />
              <span className="text-xl font-black tracking-[0.08em]">{t("btn_analyze_music")}</span>
            </a>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/battle"
                className="group flex min-h-24 flex-col justify-between rounded-2xl border border-cyan-200/25 bg-white/[0.06] px-4 py-4 text-white transition hover:border-cyan-200 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <WatchIcon />
                <span className="text-base font-black tracking-[0.08em]">{t("btn_watch")}</span>
              </Link>
              <Link
                href="/listen-bar"
                className="group flex min-h-24 flex-col justify-between rounded-2xl border border-orange-200/25 bg-white/[0.06] px-4 py-4 text-white transition hover:border-orange-200 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
              >
                <ListenBarIcon />
                <span className="text-base font-black tracking-[0.08em]">{t("btn_listen_bar")}</span>
              </Link>
            </div>
          </div>

          <p
            className={`mt-3 ${heroSingleLineClass} text-[clamp(1.18rem,1.52vw,1.78rem)] leading-[1.42] ${heroAccentClass} ${
              lang === "en" ? `${fontRighteous.className} font-black` : zhSerifClass
            }`}
          >
            {heroCopy}
          </p>

          <div className="mt-4 grid max-w-[60rem] grid-cols-3 overflow-hidden rounded-[0.45rem] border border-white/14 bg-black/86 backdrop-blur">
            {statItems.map(([value, label]) => (
              <div key={value} className="border-r border-white/10 px-3 py-2 last:border-r-0 md:px-4 md:py-2.5">
                <p className="text-2xl font-black leading-none text-white md:text-[1.65rem]">{value}</p>
                <p className="mt-1 text-[10px] text-zinc-500 md:text-[0.68rem]">{label}</p>
              </div>
            ))}
          </div>

        </div>

        <div className="hidden justify-self-end md:block md:w-[min(23.4vw,25rem)] md:min-w-[21rem] md:self-center">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,17,16,0.72),rgba(4,4,4,0.88)_58%,rgba(0,18,20,0.62))] p-[clamp(1.2rem,1.52vw,1.58rem)] shadow-[0_22px_76px_rgba(0,0,0,0.66),0_0_46px_rgba(255,106,0,0.075)] backdrop-blur-[2px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,106,0,0.14),transparent_39%),radial-gradient(circle_at_86%_18%,rgba(117,225,231,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_28%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/34 to-transparent" />
            <div className="relative flex min-h-[26.8rem] flex-col justify-between gap-5">
              <div className="flex flex-1 items-center justify-center pt-2">
                <div className="relative flex h-[13.7rem] w-full max-w-[18.5rem] items-center justify-center">
                  <div className="pointer-events-none absolute inset-[-2.3rem] rounded-full bg-[radial-gradient(circle_at_50%_48%,rgba(255,106,0,0.48),rgba(255,168,82,0.18)_27%,rgba(117,225,231,0.11)_49%,transparent_70%)] blur-2xl" />
                  <div className="pointer-events-none absolute h-[11rem] w-[11rem] rounded-full bg-[radial-gradient(circle,rgba(255,244,226,0.13),rgba(255,106,0,0.09)_46%,transparent_70%)] blur-md" />
                  <Image
                    src={AIPOGER_BRAND_LOGO}
                    alt={t("home_logo_alt")}
                    width={460}
                    height={460}
                    className="relative z-10 h-[min(12.6vw,13.5rem)] w-[min(12.6vw,13.5rem)] object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.62)] [filter:drop-shadow(0_0_34px_rgba(255,255,255,0.2))]"
                  />
                </div>
              </div>

              <div className="grid gap-3.5">
                <Link
                  href="/weekly-drop-battle"
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] bg-[#ff6a00] px-5 text-white shadow-[0_12px_30px_rgba(255,106,0,0.22)] transition hover:bg-[#ff8a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <BattleIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_battle")}
                  </span>
                </Link>

                <a
                  href={musicAnalysisHref}
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] border border-cyan-200/20 bg-cyan-300/[0.075] px-5 text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                >
                  <AnalyzeMusicIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_analyze_music")}
                  </span>
                </a>

                <Link
                  href="/battle"
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] border border-white/14 bg-white/[0.055] px-5 text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition hover:border-orange-300/45 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <WatchIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_watch")}
                  </span>
                </Link>

                <Link
                  href="/listen-bar"
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] border border-white/14 bg-white/[0.055] px-5 text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition hover:border-cyan-200/45 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                >
                  <ListenBarIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_listen_bar")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[72rem] pb-5 pt-7 md:mt-6">
        <div className="border-t border-white/10 pt-5">
          <div className="grid gap-2 md:grid-cols-6">
            {infoLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-white/10 bg-black/46 px-3 py-2 backdrop-blur transition hover:border-orange-300/55 hover:bg-white/[0.06]"
              >
                <p className="text-[0.8rem] font-black text-zinc-100 group-hover:text-orange-200">{item.title}</p>
                <p className="mt-1 text-[10px] leading-3.5 text-zinc-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
