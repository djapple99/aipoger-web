// src/app/auth/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在完成登入…");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const allParams = Object.fromEntries(searchParams.entries());

    console.log("[AuthCallback] loaded", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      hasCode: Boolean(code),
      codePreview: typeof code === "string" ? `${code.slice(0, 6)}...` : null,
      allParams,
      error,
      errorDescription,
    });

    if (error) {
      console.error("[OAuth callback error]", { error, errorDescription });
      setMessage("登入失敗，請重試");
      const t = window.setTimeout(() => router.replace("/auth?error=1"), 1600);
      return () => window.clearTimeout(t);
    }

    if (!code) {
      // 某些情況（implicit/hash 或 SDK 自動解析）可能不會有 ?code=
      // 先嘗試讀取 session，避免誤判為「資訊不完整」。
      let cancelled = false;
      void (async () => {
        console.log("[AuthCallback] no code; try getSession()");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError) {
          console.error("[AuthCallback] getSession error (no code path)", sessionError);
        }

        if (data.session) {
          console.log("[AuthCallback] session exists without code; redirect /", {
            userId: data.session.user?.id,
            email: data.session.user?.email,
          });
          router.replace("/");
          return;
        }

        console.error("[AuthCallback] missing code and session is null", {
          href: window.location.href,
          allParams,
        });
        setMessage("登入資訊不完整，請重試");
        window.setTimeout(() => router.replace("/auth?error=1"), 1600);
      })();

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    void (async () => {
      console.log("[AuthCallback] exchangeCodeForSession start");
      const { data: exchangeData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchangeError) {
        console.error("[exchangeCodeForSession]", {
          name: exchangeError.name,
          message: exchangeError.message,
          status: exchangeError.status,
          error: exchangeError,
          exchangeData,
          href: window.location.href,
          allParams,
        });
        setMessage("登入失敗，請重試");
        window.setTimeout(() => router.replace("/auth?error=1"), 1600);
        return;
      }

      console.log("[AuthCallback] exchangeCodeForSession success; getSession...");
      const {
        data: { session },
        error: getSessionError,
      } = await supabase.auth.getSession();

      if (getSessionError) {
        console.error("[AuthCallback] getSession error after exchange", getSessionError);
      }

      if (!session) {
        console.error("[Auth callback] session is null after exchange");
        setMessage("登入狀態建立失敗，請重試");
        window.setTimeout(() => router.replace("/auth?error=1"), 1600);
        return;
      }

      console.log("[AuthCallback] session ok; redirect /", {
        userId: session.user?.id,
        email: session.user?.email,
      });
      router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-200">
      <p className="text-sm tracking-wide text-zinc-400">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          正在完成登入…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}