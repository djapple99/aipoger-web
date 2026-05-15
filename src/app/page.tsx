"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { isMissingFighterNameColumn } from "@/lib/user-profile-fighter-name";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { Session, User } from "@supabase/supabase-js";

const SPLASH_STEPS = {
  fadeIn: 700,
  hold: 1000,
  fadeOut: 700,
};

const TOTAL_SPLASH_MS =
  SPLASH_STEPS.fadeIn + SPLASH_STEPS.hold + SPLASH_STEPS.fadeOut;

type SplashPhase = "fadeIn" | "hold" | "fadeOut";

function BattleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-9 w-9 text-zinc-100 transition group-hover:text-[#ff6a00]"
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
      className="h-9 w-9 text-zinc-100 transition group-hover:text-[#ff6a00]"
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
  const { t, lang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [aipoCoins, setAipoCoins] = useState<number | null>(null);
  const [apcBalance, setApcBalance] = useState<number | null>(null);
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
        let { data, error } = await supabase
          .from("user_profiles")
          .select("aipo_coins, apc_balance, level, total_wins, avatar_url, fighter_name")
          .eq("id", userId)
          .maybeSingle();

        if (error && isMissingFighterNameColumn(error)) {
          const fallback = await supabase
            .from("user_profiles")
            .select("aipo_coins, apc_balance, level, total_wins, avatar_url")
            .eq("id", userId)
            .maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) {
          console.error(error);
          setAipoCoins(0);
          setApcBalance(null);
          setLevelLine(null);
          setProfileAvatarUrl(null);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(await loadIsAdmin(userId));
        setAipoCoins(data?.aipo_coins ?? 0);
        setApcBalance(typeof data?.apc_balance === "number" ? data.apc_balance : null);
        setProfileAvatarUrl(typeof data?.avatar_url === "string" && data.avatar_url.length > 0 ? data.avatar_url : null);

        const fn =
          data && "fighter_name" in data && typeof data.fighter_name === "string"
            ? data.fighter_name.trim()
            : "";
        if (fn) writeFighterNameToStorage(fn);

        const lv = data?.level;
        if (typeof lv !== "number" || lv < 1) {
          setLevelLine(null);
          return;
        }

        const { data: info, error: rpcErr } = await supabase.rpc("get_level_info", { lv });
        if (rpcErr || info == null) {
          setLevelLine(`Lv.${lv}`);
          return;
        }
        const row = info as { name_cn?: string; name_en?: string };
        const name = lang === "en" ? (row.name_en ?? row.name_cn) : (row.name_cn ?? row.name_en);
        setLevelLine(name ? `Lv.${lv} · ${name}` : `Lv.${lv}`);
      } finally {
        setProfileLoading(false);
      }
    },
    [lang],
  );

  const runDailyCheckIn = useCallback(async (userId: string) => {
    if (process.env.NEXT_PUBLIC_AUTH_BYPASS === "true") return;
    try {
      const { data: gained, error } = await supabase.rpc("award_daily_login_points");
      if (error) {
        console.warn("[daily login]", error);
        return;
      }
      if (gained === 50) void loadProfile(userId);
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
        setApcBalance(null);
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
        {typeof apcBalance === "number" && (
          <p className="mt-1 text-[10px] text-zinc-500">
            {t("home_apc_balance")}{" "}
            <span className="font-mono font-semibold text-zinc-300">{apcBalance.toLocaleString()}</span>
          </p>
        )}
        {isAdmin && (
          <p className="mt-1 text-[10px] font-semibold text-amber-400">{t("home_admin_badge")} · 免 APC 挑戰費</p>
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
              {typeof apcBalance === "number" && (
                <p className="mt-1 text-[10px] text-zinc-500">
                  {t("home_apc_balance")}{" "}
                  <span className="font-mono font-semibold text-zinc-300">{apcBalance.toLocaleString()}</span>
                </p>
              )}
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
            <Link
              href="/battle/setup#avatar-upload"
              role="menuitem"
              className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("home_avatar_upload_link")}
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
  const { t } = useI18n();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("fadeIn");

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
            src="/logo.png"
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-6 py-10 text-[#f5f5f5] md:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_22%_38%,_rgba(255,106,0,0.25),_transparent_50%)]" />

      <header className="pointer-events-auto fixed right-4 top-4 z-40 md:right-6 md:top-6">
        <HomeAuthBar />
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 border-b border-zinc-700/70 pb-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-[clamp(3rem,10vw,9rem)] font-black uppercase leading-[0.85] tracking-tight text-zinc-100">
            AIPOGER
          </p>
          <p className="mt-3 text-sm text-zinc-400 md:text-xl">{t("home_subtitle")}</p>

          <h1 className="mt-8 text-[clamp(3.3rem,13vw,10rem)] font-black leading-[0.88] tracking-tight text-zinc-100">
            {t("home_secondary_title")}
          </h1>
          <p className="mt-4 text-sm text-zinc-300 md:text-2xl">{t("home_tagline")}</p>
        </div>

        <div className="md:col-span-4 md:pb-4">
          <div className="flex flex-col gap-4">
            <Link
              href="/battle/setup"
              className="group flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-950/80 px-5 py-4 transition duration-300 hover:border-[#ff6a00] hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            >
              <BattleIcon />
              <span className="text-2xl font-bold tracking-[0.08em] text-red-500 transition group-hover:text-red-400">
                {t("btn_battle")}
              </span>
            </Link>

            <Link
              href="/battle"
              className="group flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-950/80 px-5 py-4 transition duration-300 hover:border-[#ff6a00] hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            >
              <WatchIcon />
              <span className="text-2xl font-bold tracking-[0.08em] text-red-500 transition group-hover:text-red-400">
                {t("btn_watch")}
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
