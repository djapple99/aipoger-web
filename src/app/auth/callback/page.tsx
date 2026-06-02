"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { consumeFreshAuthReturnPath } from "@/lib/auth-urls";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("完成登入中…");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = searchParams.get("code");
    const error = searchParams.get("error") ?? hashParams.get("error");
    const errorDescription =
      searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      searchParams.get("error_code") ??
      hashParams.get("error_code") ??
      "";
    const nextPath = consumeFreshAuthReturnPath(searchParams.get("next"));

    const buildAuthErrorUrl = (message: string) =>
      `/auth?error=oauth&auth_message=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`;

    if (error) {
      console.error("[auth callback]", error, errorDescription);
      const message = errorDescription || error;
      setStatus(`登入失敗：${message}`);
      setTimeout(() => router.replace(buildAuthErrorUrl(message)), 3500);
      return;
    }

    const finish = () => {
      setStatus("登入成功！");
      setTimeout(() => router.replace(nextPath), 500);
    };

    const fail = (message = "登入失敗，請重試") => {
      setStatus(message);
      setTimeout(() => router.replace(buildAuthErrorUrl(message)), 3500);
    };

    const handleCallback = async () => {
      // Implicit OAuth and Email Magic Links put tokens in the URL hash.
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          console.error("[auth callback] hash session failed", sessionError);
          fail(sessionError.message);
          return;
        }
        finish();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish();
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[auth callback] code exchange failed", exchangeError);
          fail(exchangeError.message);
          return;
        }
        finish();
        return;
      }

      fail("登入資訊不完整，請重試");
    };

    void handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="mb-4 text-4xl">AIPOGER</div>
        <p className="text-zinc-400">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        載入中…
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
