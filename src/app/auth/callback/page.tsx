// src/app/auth/callback/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Phase = "idle" | "exchanging" | "saving" | "redirecting" | "error";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const goHome = () => {
      if (cancelled) return;
      setPhase("redirecting");
      // 使用硬導向，避免 router.replace("/") 與 Suspense / session 競態造成白屏或與首頁互踢迴圈
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    };

    const goAuthError = (msg: string) => {
      if (cancelled) return;
      setErrorMsg(msg);
      setPhase("error");
      window.setTimeout(() => {
        if (!cancelled && typeof window !== "undefined") {
          window.location.replace("/auth?error=1");
        }
      }, 1600);
    };

    void (async () => {
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      console.log("[AuthCallback]", {
        hasCode: Boolean(code),
        error: oauthError,
        errorDescription,
      });

      if (oauthError) {
        console.error("[OAuth callback error]", { oauthError, errorDescription });
        goAuthError("登入失敗，請重試");
        return;
      }

      setPhase("exchanging");

      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      // 無 code：可能已由其他 tab / detectSessionInUrl 寫入 session
      if (!code) {
        if (existing) {
          console.log("[AuthCallback] no code, session present → home");
          goHome();
          return;
        }
        console.error("[AuthCallback] no code and no session");
        goAuthError("登入資訊不完整，請重試");
        return;
      }

      // 有 code 但已有 session（Strict Mode 第二次 mount 或重入）：勿重複 exchange
      if (existing?.user) {
        console.log("[AuthCallback] session already present → skip exchange, home");
        goHome();
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchangeError) {
        console.error("[exchangeCodeForSession]", exchangeError);
        const em = (exchangeError.message ?? "").toLowerCase();
        if (em.includes("code") && (em.includes("invalid") || em.includes("expired") || em.includes("used"))) {
          const { data: afterFail } = await supabase.auth.getSession();
          if (afterFail.session?.user) {
            goHome();
            return;
          }
        }
        goAuthError("登入失敗，請重試");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        goAuthError("登入狀態建立失敗，請重試");
        return;
      }

      setPhase("saving");

      try {
        const { error: upErr } = await supabase
          .from("user_profiles")
          .upsert({ id: session.user.id }, { onConflict: "id" });
        if (upErr) console.warn("[AuthCallback] user_profiles upsert", upErr);
      } catch (e) {
        console.warn("[AuthCallback] user_profiles upsert", e);
      }

      await new Promise((r) => setTimeout(r, 300));
      try {
        const { error: bonusErr } = await supabase.rpc("award_signup_bonus", { user_uuid: session.user.id });
        if (bonusErr) console.warn("[AuthCallback] award_signup_bonus", bonusErr);
      } catch (e) {
        console.warn("[AuthCallback] award_signup_bonus", e);
      }

      if (cancelled) return;
      console.log("[AuthCallback] done → home");
      goHome();
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

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
        {(phase === "idle" || phase === "exchanging" || phase === "saving" || phase === "redirecting") && (
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        )}
        <p className={`text-sm tracking-wide ${phase === "error" ? "text-red-400" : "text-zinc-400"}`}>
          {phaseText[phase]}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <p className="text-sm">正在完成登入…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
