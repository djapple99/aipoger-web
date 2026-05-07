// src/app/auth/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function AuthPageInner() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  /** 登入成功後一律回首頁 */
  const nextPath = "/";

  useEffect(() => {
    if (searchParams.get("error")) {
      setError("登入發生錯誤，請再試一次");
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace(nextPath);
      }
    };
    void checkUser();
  }, [router, nextPath]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace(nextPath);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, nextPath]);

  const handleOAuthLogin = async () => {
    const provider = "facebook" as const;
    setLoading(true);
    setError(null);

    // 用固定的 site url，避免使用 192.168.x.x 造成 redirect URL 不在 Supabase allow list
    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/$/, "");
    const redirectTo = `${siteOrigin}/auth/callback`;

    console.log("[Auth] signInWithOAuth start", {
      provider,
      siteOrigin,
      redirectTo,
      href: window.location.href,
    });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: "public_profile,email",
        redirectTo,
      },
    });

    console.log("[Auth] signInWithOAuth returned", {
      provider,
      oauthError: oauthError ? { name: oauthError.name, message: oauthError.message, status: oauthError.status } : null,
    });

    if (oauthError) {
      console.error(oauthError);
      setError("登入發生錯誤，請再試一次");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex max-w-[240px] justify-center sm:max-w-[280px]">
            <Image
              src="/logo.png"
              alt="AIPOGER 愛播歌"
              width={280}
              height={280}
              priority
              className="h-auto w-full max-h-[min(88vw,280px)] max-w-[min(88vw,280px)] object-contain sm:max-h-[280px] sm:max-w-[280px]"
            />
          </div>
          <p className="mt-5 text-xl text-zinc-400 sm:mt-6">Where AI Beats Bleed.</p>
        </div>

        <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-8 text-sm leading-relaxed">
          <h2 className="mb-5 text-lg font-semibold text-yellow-400">免則聲明（請務必閱讀）</h2>
          <ul className="space-y-4 text-[15px] text-zinc-300">
            <li className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 font-medium leading-relaxed text-red-300">
              • 不得上傳任何受版權保護的歌曲，您必須確保上傳的所有歌曲都是使用 AI 工具生成的
              <strong className="text-red-200">原創作品</strong>
              ，版權完全屬於您本人。若違反將立即下架並可能封鎖帳號。
            </li>
            <li>• 無論點擊鬥歌還是聽眾，都會進入免則聲明與登入帳號</li>
            <li>• 建議使用 Google 或社群 FB / Discord 認證，避免信箱註冊產生水軍</li>
            <li>• 選擇鬥歌者勝利的一方，系統會詢問是否願意提供歌曲作為首頁輪播歌單之一</li>
            <li>• 版權仍完全屬於您本人，我們僅取得首頁輪播使用權</li>
            <li>• 您可隨時寫信要求下架，我們會立即處理</li>
            <li className="text-red-400">• 鬥歌場上傳的歌曲，我們會協助記錄上傳時間作為原創證明</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-center text-xs text-zinc-500">僅支援以下方式登入</p>
          <button
            type="button"
            onClick={() => void handleOAuthLogin()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-6 py-4 font-medium text-white transition hover:bg-[#1666d6] disabled:opacity-70"
          >
            <span className="text-2xl" aria-hidden>
              f
            </span>
            <span>使用 Facebook 登入</span>
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <p className="pt-4 text-center text-xs text-zinc-500">登入即代表您已閱讀並同意上述免則聲明</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          載入中…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}


