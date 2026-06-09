// src/app/auth/page.tsx
"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState, Suspense, useRef, useCallback } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  buildAuthCallbackUrl,
  buildChromeOpenUrl,
  buildAuthPageUrl,
  readRememberedAuthNextCookie,
  readRememberedAuthNextPath,
  rememberAuthNextPath,
  safeNextPath,
} from "@/lib/auth-urls";

function intentToNextPath(intent: string | null, lang: string | null): string {
  const langQuery = lang && ["zh", "en", "ja", "ko"].includes(lang) ? `?lang=${lang}` : "";
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
  const { t, lang } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmbeddedBrowser, setIsEmbeddedBrowser] = useState(false);
  const [chromeOpenUrl, setChromeOpenUrl] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");
  const rememberedNext = !explicitNext && !searchParams.get("intent")
    ? readRememberedAuthNextPath() ?? readRememberedAuthNextCookie()
    : null;
  const nextPath = explicitNext
    ? safeNextPath(explicitNext)
    : rememberedNext
      ? safeNextPath(rememberedNext)
      : intentToNextPath(searchParams.get("intent"), searchParams.get("lang"));
  const embeddedCopy = lang === "zh"
    ? {
        title: "App 內建瀏覽器會限制社群登入",
        body: "你目前可能在 Gmail、IG、LINE、Facebook、TikTok 或 Google App 的內建瀏覽器中。這類環境常會封鎖 Google / Facebook 登入，不是 AIPOGER 帳號壞掉。",
        best: "最穩方式：直接輸入 Email 收登入連結；如果要用 Google / Facebook，請複製本頁網址，到 Chrome 貼上開啟後再登入。",
        lineHint: "LINE 裡如果「用 Chrome 開啟」沒有反應，請按「複製網址去 Chrome 開啟」，再手動打開 Chrome 貼上網址。",
        openChrome: "嘗試用 Chrome 開啟",
        copyChrome: "複製網址去 Chrome 開啟",
        openExternal: "嘗試開 Safari / Chrome",
        mobileRecommended: "手機推薦",
        socialHint: "手機目前建議使用 Email 登入。Google / Facebook 社群登入請改用 Safari 或 Chrome 開啟本頁。",
        oauthNotice: "你目前在 App 內建瀏覽器中。Google / Facebook 登入容易被這類瀏覽器擋掉，請用 Email 登入連結，或改用 Safari / Chrome 開啟。",
        copied: "已複製登入連結，請貼到 Safari 或 Chrome 開啟。",
        copyFailed: "請複製目前網址，改用 Safari 或 Chrome 開啟後再登入。",
        external: "如果仍停在 App 內，請點右上角選單或分享按鈕，選擇「在 Safari / Chrome 開啟」。",
        chromeBlocked: "如果 Chrome 沒有被打開，代表 LINE / App 內建瀏覽器擋住了外部瀏覽器跳轉；請改用 Email 登入連結，或用右上角選單選「在瀏覽器開啟」。",
      }
    : lang === "ja"
      ? {
          title: "アプリ内ブラウザはSNSログインを制限することがあります",
          body: "Gmail、Instagram、LINE、Facebook、TikTok、Google App内のブラウザでは、Google / Facebookログインが止まることがあります。AIPOGERアカウントの問題ではありません。",
          best: "一番安定する方法はEmailログインリンクです。Google / Facebookを使う場合は、このページのURLをコピーしてChromeで開いてからログインしてください。",
          lineHint: "LINEで「Chromeで開く」が反応しない場合は、「Chromeで開くURLをコピー」を押し、Chromeを手動で開いて貼り付けてください。",
          openChrome: "Chromeで開く",
          copyChrome: "Chrome用URLをコピー",
          openExternal: "Safari / Chromeで開く",
          mobileRecommended: "スマホ推奨",
          socialHint: "スマホではEmailログイン推奨です。Google / FacebookログインはSafariまたはChromeでこのページを開いてください。",
          oauthNotice: "アプリ内ブラウザではGoogle / Facebookログインが止まることがあります。Emailログインリンク、またはSafari / Chromeで開いてください。",
          copied: "ログインURLをコピーしました。SafariまたはChromeに貼り付けて開いてください。",
          copyFailed: "現在のURLをコピーし、SafariまたはChromeで開いてからログインしてください。",
          external: "まだアプリ内にいる場合は、右上メニューまたは共有ボタンから「ブラウザで開く」を選んでください。",
          chromeBlocked: "Chromeが開かない場合、LINE / アプリ内ブラウザが外部ブラウザ起動を止めています。Emailログインリンク、またはメニューからブラウザで開いてください。",
        }
      : lang === "ko"
        ? {
            title: "앱 내 브라우저는 소셜 로그인을 제한할 수 있습니다",
            body: "Gmail, Instagram, LINE, Facebook, TikTok, Google App 안의 브라우저에서는 Google / Facebook 로그인이 막힐 수 있습니다. AIPOGER 계정 문제가 아닙니다.",
            best: "가장 안정적인 방법은 Email 로그인 링크입니다. Google / Facebook을 쓰려면 이 페이지 URL을 복사해 Chrome에서 연 뒤 로그인하세요.",
            lineHint: "LINE에서 Chrome 열기가 반응하지 않으면, 'Chrome용 URL 복사'를 누른 뒤 Chrome을 직접 열어 붙여넣으세요.",
            openChrome: "Chrome으로 열기",
            copyChrome: "Chrome용 URL 복사",
            openExternal: "Safari / Chrome 열기",
            mobileRecommended: "모바일 추천",
            socialHint: "모바일에서는 Email 로그인을 권장합니다. Google / Facebook 로그인은 Safari 또는 Chrome에서 이 페이지를 열어 주세요.",
            oauthNotice: "앱 내 브라우저에서는 Google / Facebook 로그인이 막힐 수 있습니다. Email 로그인 링크를 쓰거나 Safari / Chrome에서 열어 주세요.",
            copied: "로그인 URL을 복사했습니다. Safari 또는 Chrome에 붙여넣어 열어 주세요.",
            copyFailed: "현재 URL을 복사해 Safari 또는 Chrome에서 연 뒤 로그인해 주세요.",
            external: "아직 앱 안에 머무르면 오른쪽 위 메뉴나 공유 버튼에서 '브라우저에서 열기'를 선택하세요.",
            chromeBlocked: "Chrome이 열리지 않으면 LINE / 앱 내 브라우저가 외부 브라우저 이동을 막은 것입니다. Email 로그인 링크를 쓰거나 메뉴에서 브라우저로 열어 주세요.",
          }
        : {
            title: "In-app browsers can block social login",
            body: "You may be inside Gmail, Instagram, LINE, Facebook, TikTok, or Google App. These browsers often block Google / Facebook login. Your AIPOGER account is not broken.",
            best: "Most reliable path: use Email login. If you want Google / Facebook, copy this page URL and open it in Chrome first.",
            lineHint: "If LINE does not open Chrome, tap Copy URL for Chrome, then open Chrome manually and paste the link.",
            openChrome: "Open in Chrome",
            copyChrome: "Copy URL for Chrome",
            openExternal: "Open Safari / Chrome",
            mobileRecommended: "Recommended",
            socialHint: "On mobile, Email login is recommended. For Google / Facebook, open this page in Safari or Chrome.",
            oauthNotice: "You are inside an app browser. Google / Facebook login is often blocked here. Use Email login, or open Safari / Chrome.",
            copied: "Login URL copied. Paste it into Safari or Chrome.",
            copyFailed: "Copy the current URL and open it in Safari or Chrome before logging in.",
            external: "If you are still inside the app, use the top-right menu or share button and choose Open in Browser.",
            chromeBlocked: "If Chrome did not open, LINE / the app browser blocked the external-browser jump. Use Email login or open this page from the browser menu.",
          };
  const redirectingRef = useRef(false);

  const goHomeOnce = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    router.replace(nextPath);
  }, [router, nextPath]);

  useEffect(() => {
    rememberAuthNextPath(nextPath);
    const publicLoginUrl = buildAuthPageUrl(nextPath);
    setLoginUrl(publicLoginUrl);
    const ua = navigator.userAgent || "";
    setIsEmbeddedBrowser(isLikelyEmbeddedBrowser(ua));
    setChromeOpenUrl(buildChromeOpenUrl(publicLoginUrl, ua));
  }, [nextPath]);

  useEffect(() => {
    if (searchParams.get("error")) {
      setError(t("auth_error"));
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
      setNotice(embeddedCopy.oauthNotice);
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);

    const redirectTo = buildAuthCallbackUrl(nextPath);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (oauthError) {
      console.error(oauthError);
      setError(t("auth_error"));
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
      setNotice(embeddedCopy.copied);
    } catch {
      setNotice(embeddedCopy.copyFailed);
    }
  };

  const openExternalBrowser = () => {
    window.open(loginUrl || buildAuthPageUrl(nextPath), "_blank", "noopener,noreferrer");
    setNotice(embeddedCopy.external);
  };

  const openChrome = () => {
    if (!chromeOpenUrl) return;
    window.location.href = chromeOpenUrl;
    window.setTimeout(() => {
      setNotice(embeddedCopy.chromeBlocked);
    }, 900);
  };

  return (
    <div className="aipo-stage-bg flex min-h-screen items-center justify-center p-5 text-white sm:p-6">
      <div className="relative z-10 w-full max-w-lg space-y-5">
        <div className="text-center">
          <div className="mx-auto flex max-w-[150px] justify-center sm:max-w-[190px]">
            <Image
              src={AIPOGER_BRAND_LOGO}
              alt={t("home_logo_alt")}
              width={190}
              height={190}
              priority
              className="h-auto w-full max-h-[min(42vw,190px)] max-w-[min(42vw,190px)] object-contain sm:max-h-[190px] sm:max-w-[190px]"
            />
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[0.08em] text-white">{t("login_title")}</h1>
          <p className="mt-2 text-base text-zinc-400">{t("login_subtitle")}</p>
        </div>

        <div className="space-y-3">
          <div className="aipo-control-panel rounded-[1.35rem] p-4 sm:p-5">
            <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-zinc-500">{t("login_methods")}</p>
            <p className="mx-auto mt-3 max-w-md rounded-2xl border border-orange-300/24 bg-orange-500/10 px-4 py-3 text-sm font-bold leading-6 text-orange-100">
              {t("login_creator_guard")}
            </p>
          </div>
          {isEmbeddedBrowser ? (
            <div className="aipo-control-panel rounded-[1.35rem] p-5 text-sm leading-7 text-orange-50">
              <p className="text-base font-black text-orange-200">{embeddedCopy.title}</p>
              <p className="mt-2 text-zinc-200">
                {embeddedCopy.body}
              </p>
              <p className="mt-2 text-zinc-100">
                {embeddedCopy.best}
              </p>
              <p className="mt-2 rounded-2xl border border-cyan-200/25 bg-black/35 px-3 py-2 text-cyan-100">
                {embeddedCopy.lineHint}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={openChrome}
                  className="rounded-2xl border border-cyan-100/45 bg-cyan-300 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-100"
                >
                  {embeddedCopy.openChrome}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLoginUrl()}
                  className="aipo-ghost-button rounded-2xl px-4 py-3 text-sm font-black text-orange-100 transition hover:text-white"
                >
                  {embeddedCopy.copyChrome}
                </button>
                <button
                  type="button"
                  onClick={openExternalBrowser}
                  className="aipo-primary-button rounded-2xl px-4 py-3 text-sm font-black transition"
                >
                  {embeddedCopy.openExternal}
                </button>
              </div>
            </div>
          ) : null}
          <form
            onSubmit={(event) => void handleEmailLogin(event)}
            className="aipo-control-panel rounded-[1.35rem] p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">{t("login_email_title")}</p>
              {isEmbeddedBrowser ? (
                <span className="rounded-full border border-cyan-200/35 px-3 py-1 text-xs font-black text-cyan-100">{embeddedCopy.mobileRecommended}</span>
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
                className="aipo-input min-h-14 flex-1 rounded-2xl px-4 text-base font-semibold transition placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="min-h-14 rounded-2xl border border-cyan-100/45 bg-cyan-300 px-5 text-sm font-black text-black transition hover:bg-cyan-100 disabled:opacity-60"
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
            <p className="aipo-control-panel rounded-2xl p-4 text-center text-sm leading-relaxed text-zinc-300">
              {embeddedCopy.socialHint}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleOAuthLogin("google")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/30 bg-white px-6 py-4 font-black text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
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
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-6 py-4 font-medium text-white transition hover:bg-[#1666d6] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="text-2xl" aria-hidden>f</span>
                <span>{t("login_fb")}</span>
              </button>
            </>
          )}
        </div>

        <details className="aipo-control-panel group rounded-[1.35rem] p-5 text-sm leading-relaxed text-zinc-300">
          <summary className="cursor-pointer list-none text-base font-black text-yellow-300 transition group-open:text-yellow-200">
            {t("disclaimer_title")}
          </summary>
          <ul className="mt-4 space-y-3 text-[14px] leading-6 text-zinc-400">
            <li className="text-orange-100">• {t("disclaimer_1")}</li>
            <li>• {t("disclaimer_2")}</li>
            <li>• {t("disclaimer_3")}</li>
            <li>• {t("disclaimer_4")}</li>
            <li>• {t("disclaimer_5")}</li>
            <li>• {t("disclaimer_6")}</li>
            <li className="text-orange-200">• {t("disclaimer_7")}</li>
          </ul>
        </details>

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
