// src/app/auth/page.tsx
"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState, Suspense, useRef, useCallback } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { buildAuthCallbackUrl, buildAuthPageUrl, safeNextPath } from "@/lib/auth-urls";

function intentToNextPath(intent: string | null, lang: string | null): string {
  const langQuery = lang === "en" ? "?lang=en" : lang === "zh" ? "?lang=zh" : "";
  switch (intent) {
    case "battle":
      return `/battle${langQuery}`;
    case "listen-bar":
    case "listen":
      return `/listen-bar${langQuery}`;
    case "rank":
      return `/rank${langQuery}`;
    default:
      return `/${langQuery}`;
  }
}

function isLikelyEmbeddedBrowser(userAgent: string): boolean {
  const ua = userAgent || "";
  const hasExplicitInAppToken =
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|Bytedance|Twitter|LinkedInApp|Pinterest|Snapchat|GSA\/|GoogleApp|Gmail/i.test(ua);
  const isAndroidWebView = /; wv\)|\bwv\b/i.test(ua);
  const isStandaloneBrowser =
    /CriOS|Chrome\/|Chromium\/|FxiOS|Firefox\/|EdgiOS|EdgA|Edg\/|OPiOS|OPR\/|SamsungBrowser/i.test(ua) ||
    (/Safari\//i.test(ua) && /Version\//i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua));

  if (isStandaloneBrowser && !hasExplicitInAppToken && !isAndroidWebView) return false;
  return hasExplicitInAppToken || isAndroidWebView;
}

function AuthLoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
      {t("common_loading")}
    </div>
  );
}

function AuthPageInner() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmbeddedBrowser, setIsEmbeddedBrowser] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next")
    ? safeNextPath(searchParams.get("next"))
    : intentToNextPath(searchParams.get("intent"), searchParams.get("lang"));
  const redirectingRef = useRef(false);

  const goHomeOnce = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    router.replace(nextPath);
  }, [router, nextPath]);

  useEffect(() => {
    setLoginUrl(buildAuthPageUrl(nextPath));
    const ua = navigator.userAgent || "";
    setIsEmbeddedBrowser(isLikelyEmbeddedBrowser(ua));
  }, [nextPath]);

  useEffect(() => {
    const authMessage = searchParams.get("auth_message");
    if (searchParams.get("error")) {
      setError(authMessage ? `${t("auth_error")} ${authMessage}` : t("auth_error"));
    }
  }, [searchParams, t]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        goHomeOnce();
      }
    };
    void checkUser();
  }, [goHomeOnce]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        goHomeOnce();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [goHomeOnce]);

  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    if (isEmbeddedBrowser) {
      setNotice("你目前在 App 內建瀏覽器中。Google / Facebook 登入容易被這類瀏覽器擋掉，請用 Email 登入連結，或改用 Safari / Chrome 開啟。");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);

    const redirectTo = buildAuthCallbackUrl(nextPath);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });

    if (oauthError) {
      console.error(oauthError);
      setError(`${t("auth_error")} ${oauthError.message}`);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t("login_email_invalid"));
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setEmailSent(false);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(nextPath),
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (otpError) {
      console.error(otpError);
      setError(`${t("login_email_failed")} ${otpError.message}`);
      return;
    }

    setEmailSent(true);
    setError(null);
  };

  const copyLoginUrl = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl || buildAuthPageUrl(nextPath));
      setNotice("已複製登入連結，請貼到 Safari 或 Chrome 開啟。");
    } catch {
      setNotice("請複製目前網址，改用 Safari 或 Chrome 開啟後再登入。");
    }
  };

  const openExternalBrowser = () => {
    window.open(loginUrl || buildAuthPageUrl(nextPath), "_blank", "noopener,noreferrer");
    setNotice("如果仍停在 App 內，請點右上角選單或分享按鈕，選擇「在 Safari / Chrome 開啟」。");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex max-w-[240px] justify-center sm:max-w-[280px]">
            <Image
              src={AIPOGER_BRAND_LOGO}
              alt={t("home_logo_alt")}
              width={280}
              height={280}
              priority
              className="h-auto w-full max-h-[min(88vw,280px)] max-w-[min(88vw,280px)] object-contain sm:max-h-[280px] sm:max-w-[280px]"
            />
          </div>
          <p className="mt-5 text-xl text-zinc-400 sm:mt-6">{t("login_subtitle")}</p>
        </div>

        <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-8 text-sm leading-relaxed">
          <h2 className="mb-5 text-lg font-semibold text-yellow-400">{t("disclaimer_title")}</h2>
          <ul className="space-y-4 text-[15px] text-zinc-300">
            <li className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 font-medium leading-relaxed text-red-300">
              • {t("disclaimer_1")}
            </li>
            <li>• {t("disclaimer_2")}</li>
            <li>• {t("disclaimer_3")}</li>
            <li>• {t("disclaimer_4")}</li>
            <li>• {t("disclaimer_5")}</li>
            <li>• {t("disclaimer_6")}</li>
            <li className="text-red-400">• {t("disclaimer_7")}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-center text-xs text-zinc-500">{t("login_methods")}</p>
          {isEmbeddedBrowser ? (
            <div className="rounded-3xl border border-orange-300/40 bg-orange-500/10 p-5 text-sm leading-7 text-orange-50">
              <p className="text-base font-black text-orange-200">App 內建瀏覽器會限制社群登入</p>
              <p className="mt-2 text-zinc-200">
                你目前可能在 Gmail、IG、LINE、Facebook、TikTok 或 Google App 的內建瀏覽器中。這類環境常會封鎖 Google / Facebook 登入，不是 AIPOGER 帳號壞掉。
              </p>
              <p className="mt-2 text-zinc-100">
                最穩方式：直接輸入 Email 收登入連結；如果要用 Google / Facebook，請點右上角分享 / 選單，改用 Safari 或 Chrome 開啟後再登入。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void copyLoginUrl()}
                  className="rounded-2xl border border-orange-200/35 px-4 py-3 text-sm font-black text-orange-100 transition hover:border-orange-100 hover:bg-orange-200 hover:text-black"
                >
                  複製網址到 Safari
                </button>
                <button
                  type="button"
                  onClick={openExternalBrowser}
                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black transition hover:bg-orange-300"
                >
                  嘗試開 Safari / Chrome
                </button>
              </div>
            </div>
          ) : null}
          <form
            onSubmit={(event) => void handleEmailLogin(event)}
            className="rounded-3xl border border-cyan-300/25 bg-cyan-300/10 p-5 shadow-[0_0_32px_rgba(103,232,249,0.08)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">{t("login_email_title")}</p>
              {isEmbeddedBrowser ? (
                <span className="rounded-full border border-cyan-200/35 px-3 py-1 text-xs font-black text-cyan-100">手機推薦</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t("login_email_body")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailSent(false);
                }}
                placeholder={t("login_email_placeholder")}
                className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black px-4 text-base font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-300/30"
              />
              <button
                type="submit"
                disabled={loading}
                className="min-h-14 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-black transition hover:bg-cyan-100 disabled:opacity-60"
              >
                {t("login_email_send")}
              </button>
            </div>
            {emailSent ? (
              <p className="mt-3 rounded-2xl border border-cyan-200/25 bg-black/40 p-3 text-sm font-semibold text-cyan-100">
                {t("login_email_sent")}
              </p>
            ) : null}
          </form>
          {isEmbeddedBrowser ? (
            <p className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-center text-sm leading-relaxed text-zinc-300">
              目前在 App 內建瀏覽器中，Google / Facebook 按鈕會先暫停，避免跳轉失敗。Email 登入可直接使用。
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleOAuthLogin("google")}
            disabled={loading || isEmbeddedBrowser}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 ${isEmbeddedBrowser ? "grayscale" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{t("login_google")}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleOAuthLogin("facebook")}
            disabled={loading || isEmbeddedBrowser}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-6 py-4 font-medium text-white transition hover:bg-[#1666d6] disabled:cursor-not-allowed disabled:opacity-45 ${isEmbeddedBrowser ? "grayscale" : ""}`}
          >
            <span className="text-2xl" aria-hidden>f</span>
            <span>{t("login_fb")}</span>
          </button>
        </div>

        {notice && (
          <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4 text-center text-sm leading-relaxed text-cyan-100">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <p className="pt-4 text-center text-xs text-zinc-500">{t("login_agree")}</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<AuthLoadingFallback />}
    >
      <AuthPageInner />
    </Suspense>
  );
}
