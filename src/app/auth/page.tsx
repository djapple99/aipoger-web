"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Intent = "battle" | "watch";

function resolveIntent(intentValue: string | null): Intent {
  return intentValue === "watch" ? "watch" : "battle";
}

const DISCLAIMER_ITEMS = [
  "本平台僅提供技術展示與互動功能，所有音樂著作權歸原創作者或其授權方所有。",
  "使用者上傳內容需擁有合法授權，不得上傳侵權、未授權重製或違法音檔。",
  "若接獲權利人通知，本平台有權下架內容並暫停或終止帳號使用權限。",
];

export default function AuthGatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = useMemo(() => resolveIntent(searchParams.get("intent")), [searchParams]);
  const [isAgree, setIsAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwarding, setIsAwarding] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setSessionReady(Boolean(session));
      setIsLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_IN" && session) {
        setSessionReady(true);
      }
      if (event === "SIGNED_OUT") {
        setSessionReady(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    const awardDailyPoints = async () => {
      setIsAwarding(true);
      setErrorMessage(null);

      const { error } = await supabase.rpc("award_daily_login_points");

      if (error) {
        throw error;
      }

      setIsAwarding(false);
    };

    awardDailyPoints().catch(() => {
      setErrorMessage("點數更新暫時失敗，仍可繼續進入。");
      setIsAwarding(false);
    });
  }, [sessionReady]);

  const signIn = async (provider: "google" | "discord") => {
    setErrorMessage(null);
    const redirectTo = `${window.location.origin}/auth?intent=${intent}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setErrorMessage(error.message);
    }
  };

  const handleContinue = () => {
    if (intent === "watch") {
      router.push("/battle");
      return;
    }
    router.push("/battle/setup");
  };

  return (
    <main className="min-h-screen bg-[#16181b] text-[#efebe8]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 md:py-10">
        <header className="mb-6 flex items-center justify-between border-b border-[#44494f] pb-4">
          <div>
            <p className="text-xs tracking-[0.36em] text-[#8f847e]">AIPOGER</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.14em] text-[#f4f0ed]">登入守門員</h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-[#5a6067] px-4 py-2 text-sm tracking-[0.1em] text-[#dad5d2] transition hover:border-[#ff8d40] hover:text-[#ffd5ba]"
          >
            返回首頁
          </Link>
        </header>

        <section className="rounded-3xl border border-[#4c5158] bg-[#1f2226]/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8">
          <p className="text-sm tracking-[0.16em] text-[#b3a59e]">
            你目前選擇：{intent === "battle" ? "我要鬥歌" : "觀戰聽歌"}
          </p>

          <h2 className="mt-5 text-xl font-medium tracking-[0.12em] text-[#f3efec]">登入與免責聲明</h2>
          <div className="mt-4 space-y-2 rounded-2xl border border-[#43484e] bg-[#191c1f] p-4">
            {DISCLAIMER_ITEMS.map((item) => (
              <p key={item} className="text-sm leading-6 text-[#d8d1cc]">
                {item}
              </p>
            ))}
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isAgree}
              onChange={(event) => setIsAgree(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#ff7a28]"
            />
            <span className="text-sm text-[#dbd4cf]">我已閱讀並同意上述免責聲明與上傳規範。</span>
          </label>

          {!sessionReady ? (
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => signIn("google")}
                disabled={isLoading || !isAgree}
                className="rounded-2xl border border-[#6a7077] bg-gradient-to-b from-[#5c6168] to-[#43484f] px-5 py-3 text-sm font-medium tracking-[0.1em] text-[#f3efec] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.38)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Google 登入
              </button>
              <button
                type="button"
                onClick={() => signIn("discord")}
                disabled={isLoading || !isAgree}
                className="rounded-2xl border border-[#6a7077] bg-gradient-to-b from-[#5c6168] to-[#43484f] px-5 py-3 text-sm font-medium tracking-[0.1em] text-[#f3efec] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.38)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discord 登入
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-[#c8bfba]">
                {isAwarding ? "正在檢查每日登入點數..." : "登入成功，帳號狀態已準備完成。"}
              </p>
            </div>
          )}

          {errorMessage && <p className="mt-4 text-sm text-[#ffb88f]">{errorMessage}</p>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!sessionReady || !isAgree || isAwarding}
            className="mt-8 w-full rounded-2xl border border-[#777d84] bg-gradient-to-b from-[#666c73] to-[#4a5057] px-5 py-4 text-base font-semibold tracking-[0.14em] text-[#f8f3ef] transition hover:border-[#ff8d40] hover:shadow-[0_0_18px_rgba(255,121,40,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            我同意並進入
          </button>
        </section>
      </div>
    </main>
  );
}
