// src/app/auth/callback/page.tsx
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Phase = "idle" | "exchanging" | "saving" | "redirecting" | "error";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // 防止 useEffect 重複執行（尤其 searchParams 改變時）
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("[AuthCallback] loaded", {
      hasCode: Boolean(code),
      error,
      errorDescription,
    });

    if (error) {
      console.error("[OAuth callback error]", { error, errorDescription });
      setPhase("error");
      setErrorMsg("登入失敗，請重試");
      const t = window.setTimeout(() => router.replace("/auth?error=1"), 1800);
      return () => window.clearTimeout(t);
    }

    if (!code) {
      // 無 code，先檢查 session 是否已經存在（OAuth 流程可能已處理完）
      let cancelled = false;
      void (async () => {
        console.log("[AuthCallback] no code; try getSession()");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) console.error("[AuthCallback] getSession error", sessionError);
        if (data.session) {
          console.log("[AuthCallback] session exists; redirect /");
          if (!cancelled) {
            setPhase("redirecting");
            router.replace("/");
          }
        } else {
          console.error("[AuthCallback] no code and no session");
          if (!cancelled) {
            setPhase("error");
            setErrorMsg("登入資訊不完整，請重試");
            window.setTimeout(() => router.replace("/auth?error=1"), 1800);
          }
        }
      })();
      return () => { cancelled = true; };
    }

    // 有 code， exchange
    processedRef.current = true;
    let cancelled = false;

    void (async () => {
      setPhase("exchanging");
      console.log("[AuthCallback] exchangeCodeForSession start");

      const { data: exchangeData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchangeError) {
        console.error("[exchangeCodeForSession]", exchangeError);
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("登入失敗，請重試");
          window.setTimeout(() => router.replace("/auth?error=1"), 1800);
        }
        return;
      }

      const {
        data: { session },
        error: getSessionError,
      } = await supabase.auth.getSession();
      if (getSessionError) console.error("[AuthCallback] getSession error", getSessionError);
      if (!session) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("登入狀態建立失敗，請重試");
          window.setTimeout(() => router.replace("/auth?error=1"), 1800);
        }
        return;
      }

      // 寫入 user_profiles（第一次登入時建立）
      setPhase("saving");
      await supabase.from("user_profiles").upsert({ id: session.user.id }, { onConflict: "id" });

      // 發新手 bonus
      await supabase.rpc("award_signup_bonus", { user_uuid: session.user.id });

      if (cancelled) return;
      console.log("[AuthCallback] done; redirect /");
      setPhase("redirecting");
      router.replace("/");
    })();

    return () => { cancelled = true; };
  }, [router, searchParams]);

  const phaseText: Record<Phase, string> = {
    idle: "正在完成登入…",
    exchanging: "驗證中…",
    saving: "設定帳號…",
    redirecting: "即將進入…",
    error: errorMsg || "發生錯誤",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-200">
      <div className="text-center">
        {phase === "redirecting" && (
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        )}
        <p className="text-sm tracking-wide text-zinc-400">{phaseText[phase]}</p>
      </div>
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