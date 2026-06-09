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

type HomeInfoLink = {
  href: string;
  title: string;
  desc: string;
};

type HomeStatItem = [string, string];

const DESKTOP_CARD_ICON_ASSETS = [
  "/home-art/card-turntable.webp",
  "/home-art/card-eq-bolt.webp",
  "/home-art/card-waveform.webp",
  "/home-art/card-crown.webp",
  "/home-art/card-headphones.webp",
  "/home-art/card-handshake.webp",
];

function DesktopWaveLine({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute h-8 overflow-hidden ${className}`} aria-hidden="true">
      <div className="flex h-full items-center gap-[3px]">
        {Array.from({ length: 38 }).map((_, index) => (
          <span
            key={index}
            className="w-[2px] rounded-full bg-current opacity-80"
            style={{ height: `${7 + ((index * 17) % 26)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopCardIcon({ index }: { index: number }) {
  const src = DESKTOP_CARD_ICON_ASSETS[index] ?? DESKTOP_CARD_ICON_ASSETS[0];
  return (
    <Image
      src={src}
      alt=""
      width={720}
      height={400}
      sizes="128px"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[2px] left-1/2 h-[62px] w-[132px] -translate-x-1/2 object-contain opacity-95 mix-blend-screen saturate-[1.08]"
    />
  );
}

function DesktopReferenceHome({
  t,
  withLang,
  heroTitle,
  heroLine,
  heroCopy,
  statItems,
  infoLinks,
  isZh,
  lang,
  zhDisplayClass,
  heroChromeShadow,
}: {
  t: (key: string) => string;
  withLang: (href: string) => string;
  heroTitle: string;
  heroLine: string;
  heroCopy: string;
  statItems: HomeStatItem[];
  infoLinks: HomeInfoLink[];
  isZh: boolean;
  lang: string;
  zhDisplayClass: string;
  heroChromeShadow: string;
}) {
  return (
    <section className="relative z-10 hidden min-h-screen w-full justify-center overflow-hidden md:flex">
      <div className="relative h-[720px] w-[1280px] shrink-0 origin-top overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[#050505]" />
        <Image
          src="/home-art/aipoger-hero-depth.png"
          alt=""
          fill
          priority
          sizes="1280px"
          className="pointer-events-none absolute inset-0 object-cover opacity-[0.82]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.12)_42%,rgba(0,0,0,0.2)_100%),radial-gradient(circle_at_20%_54%,rgba(0,0,0,0.08),rgba(0,0,0,0.55)_48%,transparent_76%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_27%,rgba(95,34,10,0.28),transparent_34%),radial-gradient(circle_at_88%_30%,rgba(0,55,58,0.14),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute left-[235px] top-0 h-[118px] w-[570px] border-b border-r border-orange-300/10" />
        <div className="pointer-events-none absolute left-0 top-[118px] h-px w-[615px] bg-gradient-to-r from-transparent via-orange-300/58 to-transparent" />
        <div className="pointer-events-none absolute left-[26px] top-[148px] h-[382px] w-px rounded-full bg-gradient-to-b from-transparent via-orange-300/60 to-transparent" />
        <div className="pointer-events-none absolute left-[943px] top-[70px] h-[484px] w-[316px] rounded-[28px] border border-orange-300/20" />
        <div className="pointer-events-none absolute right-[28px] top-[88px] h-[440px] w-px bg-gradient-to-b from-transparent via-orange-300/42 to-transparent" />
        <Image
          src={AIPOGER_BRAND_LOGO}
          alt={t("home_logo_alt")}
          width={70}
          height={70}
          priority
          className="absolute left-[47px] top-[89px] h-[58px] w-[58px] rounded-full bg-black object-contain shadow-[0_0_22px_rgba(255,106,0,0.16)]"
        />
        <div className="pointer-events-none absolute left-[104px] top-[117px] h-px w-[383px] bg-gradient-to-r from-orange-300/62 via-white/18 to-transparent" />

        <div className="absolute left-[55px] top-[135px] z-10 w-[760px]">
          <p
            className={`origin-left skew-x-[-8deg] text-[150px] font-black uppercase leading-[0.82] text-[#fff8ed] ${heroChromeShadow}`}
          >
            AIPOGER
          </p>
          <p
            className={`mt-5 text-[28px] font-black leading-none text-[#f28a2f] drop-shadow-[0_0_12px_rgba(255,106,0,0.2)] ${
              isZh ? "font-serif" : fontGlowSans.className
            }`}
          >
            {heroLine}
          </p>
          <h1
            className={`mt-6 text-[72px] font-black leading-[0.9] text-[#fff8ed] ${heroChromeShadow} ${
              lang === "en" ? fontRighteous.className : fontGlowSans.className
            }`}
          >
            {heroTitle}
          </h1>
          <p
            className={`mt-5 text-[22px] font-black leading-none text-[#f28a2f] drop-shadow-[0_0_12px_rgba(255,106,0,0.18)] ${
              lang === "en" ? fontRighteous.className : fontGlowSans.className
            }`}
          >
            {heroCopy}
          </p>

          <div className="mt-6 grid h-[60px] w-[690px] grid-cols-3 overflow-hidden rounded-[12px] border border-orange-300/28 bg-black/72 shadow-[0_0_20px_rgba(255,106,0,0.08)]">
            {statItems.map(([value, label], index) => (
              <div key={value} className="relative border-r border-white/16 px-[27px] py-[10px] last:border-r-0">
                <span className="absolute right-6 top-[26px] h-[7px] w-[7px] rounded-full bg-orange-300 shadow-[0_0_12px_rgba(255,166,74,0.85)]" />
                <p className="text-[22px] font-black leading-none text-white">{value}</p>
                <p className="mt-2 text-[11px] leading-none text-zinc-500">{label}</p>
                {index > 0 && <span className="absolute left-0 top-[12px] h-9 w-px bg-white/28" />}
              </div>
            ))}
          </div>
        </div>

        <DesktopWaveLine className="left-[87px] top-[532px] w-[150px] text-white/55" />
        <DesktopWaveLine className="left-[367px] top-[537px] w-[190px] text-orange-300/62" />
        <DesktopWaveLine className="left-[746px] top-[539px] w-[120px] text-orange-300/62" />
        <div className="pointer-events-none absolute left-[26px] top-[555px] h-px w-[1205px] bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

        <div className="absolute right-[50px] top-[78px] z-20 h-[478px] w-[286px] rounded-[27px] border border-orange-300/42 bg-[linear-gradient(145deg,rgba(9,12,12,0.86),rgba(0,0,0,0.98)_55%,rgba(1,21,23,0.86))] p-[14px] shadow-[0_18px_56px_rgba(0,0,0,0.72),0_0_38px_rgba(255,106,0,0.15)]">
          <div className="absolute inset-[14px] rounded-[22px] border border-orange-300/58" />
          <div className="absolute inset-[23px] rounded-[18px] border border-orange-300/22" />
          <div className="relative flex h-full flex-col px-[18px] pb-[19px] pt-[37px]">
            <div className="relative flex h-[195px] items-center justify-center">
              <div className="absolute h-[183px] w-[183px] rounded-full border border-orange-300/14 bg-[repeating-radial-gradient(circle,rgba(255,255,255,0.1)_0_1px,transparent_1px_10px)]" />
              <div className="absolute h-[138px] w-[138px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,106,0,0.1)_42%,transparent_70%)] blur-md" />
              <Image
                src={AIPOGER_BRAND_LOGO}
                alt={t("home_logo_alt")}
                width={188}
                height={188}
                className="relative h-[142px] w-[142px] object-contain [filter:drop-shadow(0_0_28px_rgba(255,255,255,0.25))]"
              />
            </div>
            <div className="mt-[10px] grid gap-[12px]">
              <Link
                href={withLang("/weekly-drop-battle")}
                className="group flex h-[52px] items-center justify-between rounded-[10px] border border-orange-200/18 bg-[#ff6a00] px-[18px] text-white shadow-[0_12px_26px_rgba(255,106,0,0.28),inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:bg-[#ff8422] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
              >
                <BattleIcon />
                <span className={`text-[16px] font-black ${isZh ? zhDisplayClass : ""}`}>{t("btn_battle")}</span>
              </Link>
              <Link
                href={withLang("/battle")}
                className="group flex h-[49px] items-center justify-between rounded-[9px] border border-white/18 bg-white/[0.055] px-[18px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-orange-300/52 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
              >
                <WatchIcon />
                <span className={`text-[16px] font-black ${isZh ? zhDisplayClass : ""}`}>{t("btn_watch")}</span>
              </Link>
              <Link
                href={withLang("/listen-bar")}
                className="group flex h-[49px] items-center justify-between rounded-[9px] border border-white/18 bg-white/[0.055] px-[18px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200/52 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
              >
                <ListenBarIcon />
                <span className={`text-[16px] font-black ${isZh ? zhDisplayClass : ""}`}>{t("btn_listen_bar")}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute left-[27px] top-[575px] z-10 grid h-[132px] w-[1205px] grid-cols-6 gap-[8px]">
          {infoLinks.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-[10px] border border-orange-300/20 bg-black/72 px-[20px] pb-[10px] pt-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-orange-300/62 hover:bg-orange-500/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <p className="h-[34px] text-[14px] font-black leading-[17px] text-zinc-100 group-hover:text-orange-100">
                {item.title}
              </p>
              <p className="mt-[4px] h-[24px] overflow-hidden text-[10px] leading-[12px] text-zinc-500">{item.desc}</p>
              <DesktopCardIcon index={index} />
            </Link>
          ))}
        </div>
      </div>
    </section>
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
  const withLang = (href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
  const heroTitle = t("home_secondary_title");
  const heroLine = t("home_hero_line");
  const heroCopy = t("home_tagline");
  const zhDisplayClass = `${fontGlowSans.className} tracking-[-0.015em]`;
  const zhSerifClass = `${fontSourceSerifTC.className} font-black tracking-[0.012em]`;
  const heroAccentClass = "font-black text-[#f28a2f] drop-shadow-[0_0_15px_rgba(255,106,0,0.2)]";
  const heroTextClass = "max-w-[min(62rem,calc(100vw-2.5rem))] whitespace-normal break-words md:overflow-hidden md:text-ellipsis md:whitespace-nowrap";
  const heroChromeShadow = "[text-shadow:0_2px_0_rgba(255,255,255,0.06),0_16px_32px_rgba(0,0,0,0.9),0_0_14px_rgba(255,106,0,0.08)]";
  const musicAnalysisHref = `/music-analysis?lang=${lang}`;
  const statItems: HomeStatItem[] = isZh
    ? [
        ["Weekly", "官方賽"],
        ["90s", "Drop Battle"],
        ["Bar", "傷心酒吧"],
      ]
    : lang === "ja"
      ? [
          ["Weekly", "公式戦"],
          ["90s", "Best Drop"],
          ["Bar", "Heartbreak"],
        ]
      : lang === "ko"
        ? [
            ["Weekly", "공식전"],
            ["90s", "Best Drop"],
            ["Bar", "Heartbreak"],
          ]
    : [
        ["Weekly", "Official Battle"],
        ["90s", "Best Drop"],
        ["Bar", "Heartbreak"],
      ];
  const infoLinks = isZh
    ? [
        { href: withLang("/weekly-drop-battle"), title: "Weekly Drop Battle", desc: "官方主題賽，投稿 Drop 參戰" },
        { href: withLang("/hook-guide"), title: "最強Drop Battle 對決抓波規則", desc: "Drop 上場，累積戰績認可" },
        { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: "作品定位、Drop 與參戰路線" },
        { href: withLang("/rank"), title: "AIPOGER 榮譽榜", desc: "投票、熱播、封存作品紀錄" },
        { href: withLang("/about"), title: "關於愛播歌", desc: "AI 創作者作品認可系統" },
        { href: withLang("/partners"), title: "廣告與合作", desc: "播放、策展與商業合作" },
      ]
    : lang === "ja"
      ? [
          { href: withLang("/weekly-drop-battle"), title: "Weekly Drop Battle", desc: "AI音楽クリエイター向けの公式テーマ戦" },
          { href: withLang("/hook-guide"), title: "Drop Battle Rules", desc: "最強のDropをステージに出し、認知を積み上げる" },
          { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: t("home_analyze_music_desc") },
          { href: withLang("/rank"), title: "AIPOGER Honor Board", desc: "認められた勝利、熱播曲、記録されたクリエイター実績" },
          { href: withLang("/about"), title: "About AIPOGER", desc: "AIクリエイターが成長し、作品が認められるシステム" },
          { href: withLang("/partners"), title: "Partnerships", desc: "勝ち残った楽曲を放送、キュレーション、商業展開へ" },
        ]
      : lang === "ko"
        ? [
            { href: withLang("/weekly-drop-battle"), title: "Weekly Drop Battle", desc: "AI 음악 크리에이터를 위한 공식 테마 배틀" },
            { href: withLang("/hook-guide"), title: "Drop Battle Rules", desc: "가장 강한 Drop으로 무대에 올라 인정을 쌓기" },
            { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: t("home_analyze_music_desc") },
            { href: withLang("/rank"), title: "AIPOGER Honor Board", desc: "인정받은 승리, 인기 트랙, 기록된 크리에이터 성과" },
            { href: withLang("/about"), title: "About AIPOGER", desc: "AI 크리에이터가 성장하고 작품이 인정받는 시스템" },
            { href: withLang("/partners"), title: "Partnerships", desc: "우승곡을 방송, 큐레이션, 상업 협업으로 연결" },
          ]
    : [
        { href: withLang("/weekly-drop-battle"), title: "Weekly Drop Battle", desc: "Official theme battles for AI music creators" },
        { href: withLang("/hook-guide"), title: "Drop Battle Rules", desc: "Put your strongest Drop on stage and build recognition" },
        { href: musicAnalysisHref, title: t("home_analyze_music_title"), desc: t("home_analyze_music_desc") },
        { href: withLang("/rank"), title: "AIPOGER Honor Board", desc: "Recognized wins, hot tracks, and archived creator records" },
        { href: withLang("/about"), title: "About AIPOGER", desc: "AI creator growth and music recognition system" },
        { href: withLang("/partners"), title: "Partnerships", desc: "Move winning tracks toward airplay, curation, and commercial use" },
      ];
  const mobileActionLabels = isZh
    ? { arena: "鬥歌場", weekly: "本週賽", bar: "酒吧" }
    : lang === "ja"
      ? { arena: "バトル", weekly: "今週戦", bar: "Bar" }
      : lang === "ko"
        ? { arena: "배틀장", weekly: "주간전", bar: "Bar" }
        : { arena: "Arena", weekly: "Weekly", bar: "Bar" };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050505] px-4 py-4 text-[#f5f5f5] md:px-0 md:py-0">
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

      <DesktopReferenceHome
        t={t}
        withLang={withLang}
        heroTitle={heroTitle}
        heroLine={heroLine}
        heroCopy={heroCopy}
        statItems={statItems}
        infoLinks={infoLinks}
        isZh={isZh}
        lang={lang}
        zhDisplayClass={zhDisplayClass}
        heroChromeShadow={heroChromeShadow}
      />

      <section className="relative z-10 mx-auto grid w-full max-w-[116rem] gap-6 pb-1 pt-16 md:hidden">
        <div className="relative z-10 isolate min-w-0 overflow-visible md:min-h-[28.6rem] md:px-[clamp(1.8rem,3.5vw,4.8rem)] md:pb-3 md:pt-[clamp(1.65rem,3.6vh,2.8rem)] xl:pl-[clamp(2.5rem,4.8vw,5.5rem)] before:pointer-events-none before:absolute before:inset-[-4rem_-5rem_-3rem_-3.5rem] before:-z-10 before:bg-[radial-gradient(ellipse_at_22%_46%,rgba(255,106,0,0.078),rgba(66,25,8,0.038)_46%,transparent_76%)] before:blur-[2px] before:content-['']">
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
            className={`mt-3 ${heroTextClass} text-[clamp(1.25rem,6vw,1.55rem)] leading-[1.26] md:text-[clamp(1.45rem,2.05vw,2.38rem)] md:leading-[1.38] ${heroAccentClass} ${
              isZh ? zhSerifClass : `${fontGlowSans.className} font-black`
            }`}
          >
            {heroLine}
          </p>

          <h1
            className={`mt-3 max-w-[min(52rem,calc(100vw-2.5rem))] overflow-visible whitespace-normal break-words pb-2 pt-0 text-[clamp(3.05rem,15vw,4.35rem)] leading-[0.98] text-[#fffaf1] md:whitespace-nowrap md:text-[clamp(4.3rem,6vw,7.15rem)] md:leading-[1.03] ${heroChromeShadow} ${
              lang === "en"
                ? `${fontRighteous.className} font-normal`
                : isZh
                  ? "aipoger-brand-wordmark"
                  : `${fontGlowSans.className} font-black`
            }`}
          >
            {heroTitle}
          </h1>

          <div className="mt-5 grid grid-cols-3 gap-2 md:hidden">
            <Link
              href={withLang("/battle")}
              aria-label={t("btn_watch")}
              className="group flex min-w-0 flex-col items-center gap-2 text-center text-white focus-visible:outline-none"
            >
              <span className="flex h-[4.85rem] w-[4.85rem] items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/12 shadow-[0_0_30px_rgba(103,232,249,0.12)] transition group-hover:border-cyan-100 group-hover:bg-cyan-300/18 group-focus-visible:ring-2 group-focus-visible:ring-cyan-100">
                <WatchIcon />
              </span>
              <span className="text-[0.78rem] font-black leading-tight tracking-[0.04em]">{mobileActionLabels.arena}</span>
            </Link>
            <Link
              href={withLang("/weekly-drop-battle")}
              aria-label={t("btn_battle")}
              className="group flex min-w-0 flex-col items-center gap-2 text-center text-white focus-visible:outline-none"
            >
              <span className="flex h-[4.85rem] w-[4.85rem] items-center justify-center rounded-full border border-orange-300/60 bg-orange-500 text-black shadow-[0_0_32px_rgba(255,106,0,0.24)] transition group-hover:bg-orange-300 group-focus-visible:ring-2 group-focus-visible:ring-orange-200">
                <BattleIcon />
              </span>
              <span className="text-[0.78rem] font-black leading-tight tracking-[0.04em]">{mobileActionLabels.weekly}</span>
            </Link>
            <Link
              href={withLang("/listen-bar")}
              aria-label={t("btn_listen_bar")}
              className="group flex min-w-0 flex-col items-center gap-2 text-center text-white focus-visible:outline-none"
            >
              <span className="flex h-[4.85rem] w-[4.85rem] items-center justify-center rounded-full border border-cyan-200/24 bg-white/[0.055] shadow-[0_0_28px_rgba(255,255,255,0.05)] transition group-hover:border-cyan-200 group-hover:bg-white/[0.1] group-focus-visible:ring-2 group-focus-visible:ring-cyan-100">
                <ListenBarIcon />
              </span>
              <span className="text-[0.78rem] font-black leading-tight tracking-[0.04em]">{mobileActionLabels.bar}</span>
            </Link>
          </div>

          <p
            className={`mt-3 hidden ${heroTextClass} text-[clamp(1.05rem,5vw,1.32rem)] leading-[1.34] md:block md:text-[clamp(1.18rem,1.52vw,1.78rem)] md:leading-[1.42] ${heroAccentClass} ${
              lang === "en" ? `${fontRighteous.className} font-black` : `${fontGlowSans.className} font-black`
            }`}
          >
            {heroCopy}
          </p>

          <div className="mt-4 hidden max-w-[60rem] grid-cols-3 overflow-hidden rounded-[0.45rem] border border-white/14 bg-black/86 backdrop-blur md:grid">
            {statItems.map(([value, label]) => (
              <div key={value} className="border-r border-white/10 px-3 py-2 last:border-r-0 md:px-4 md:py-2.5">
                <p className="text-2xl font-black leading-none text-white md:text-[1.65rem]">{value}</p>
                <p className="mt-1 text-[10px] text-zinc-500 md:text-[0.68rem]">{label}</p>
              </div>
            ))}
          </div>

        </div>

        <div className="relative z-10 hidden justify-self-end md:block md:w-[min(23.4vw,25rem)] md:min-w-[21rem] md:self-center">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-orange-300/38 bg-[linear-gradient(145deg,rgba(17,17,16,0.74),rgba(4,4,4,0.92)_58%,rgba(0,18,20,0.68))] p-[clamp(1.2rem,1.52vw,1.58rem)] shadow-[0_22px_76px_rgba(0,0,0,0.66),0_0_46px_rgba(255,106,0,0.13),inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-[2px] before:pointer-events-none before:absolute before:inset-[0.55rem] before:rounded-[1.05rem] before:border before:border-orange-300/52 before:content-['']">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,106,0,0.14),transparent_39%),radial-gradient(circle_at_86%_18%,rgba(117,225,231,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_28%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/34 to-transparent" />
            <div className="relative flex min-h-[26.8rem] flex-col justify-between gap-5">
              <div className="flex flex-1 items-center justify-center pt-2">
                <div className="relative flex h-[13.7rem] w-full max-w-[18.5rem] items-center justify-center">
                  <div className="pointer-events-none absolute inset-[-2.3rem] rounded-full bg-[radial-gradient(circle_at_50%_48%,rgba(255,106,0,0.52),rgba(255,168,82,0.19)_27%,rgba(117,225,231,0.12)_49%,transparent_70%)] blur-2xl" />
                  <div className="pointer-events-none absolute inset-[-0.8rem] rounded-full border border-orange-300/18 bg-[repeating-radial-gradient(circle,rgba(255,255,255,0.1)_0_1px,transparent_1px_11px)]" />
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
                  href={withLang("/weekly-drop-battle")}
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] bg-[#ff6a00] px-5 text-white shadow-[0_12px_30px_rgba(255,106,0,0.22)] transition hover:bg-[#ff8a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <BattleIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_battle")}
                  </span>
                </Link>

                <Link
                  href={withLang("/battle")}
                  className="group flex min-h-[3.85rem] items-center justify-between rounded-[0.95rem] border border-white/14 bg-white/[0.055] px-5 text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition hover:border-orange-300/45 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <WatchIcon />
                  <span className={`text-lg tracking-[0.08em] ${isZh ? `${zhDisplayClass} font-black` : "font-black"}`}>
                    {t("btn_watch")}
                  </span>
                </Link>

                <Link
                  href={withLang("/listen-bar")}
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

      <section className="relative z-10 mx-auto w-full max-w-[96rem] pb-5 pt-7 md:hidden">
        <div className="border-t border-white/10 pt-5">
          <div className="grid gap-2 md:grid-cols-6">
            {infoLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group min-h-[5.9rem] rounded-[0.72rem] border border-orange-300/18 bg-black/62 px-4 py-3 shadow-[0_18px_46px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur transition hover:border-orange-300/62 hover:bg-orange-500/[0.075]"
              >
                <p className="text-[0.86rem] font-black text-zinc-100 group-hover:text-orange-200">{item.title}</p>
                <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">{item.desc}</p>
                <div className="mt-2 h-[1.35rem] w-full opacity-55 [background:linear-gradient(90deg,transparent,rgba(255,106,0,0.55),transparent)] [mask-image:repeating-linear-gradient(90deg,black_0_2px,transparent_2px_7px)]" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
