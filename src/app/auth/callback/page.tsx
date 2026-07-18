"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearRememberedAuthNextPath, readRememberedAuthNextCookie, readRememberedAuthNextPath, safeNextPath } from "@/lib/auth-urls";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("完成登入中…");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription =
      searchParams.get("error_description") ??
      searchParams.get("error_code") ??
      "";
    const nextPath = safeNextPath(searchParams.get("next") ?? readRememberedAuthNextPath() ?? readRememberedAuthNextCookie());

    if (error) {
      console.error("[auth callback]", error, errorDescription);
      setStatus("登入失敗，請重試");
      setTimeout(() => router.replace(`/auth?error=oauth&next=${encodeURIComponent(nextPath)}`), 1500);
      return;
    }

    const finish = () => {
      setStatus("登入成功！");
      clearRememberedAuthNextPath();
      setTimeout(() => router.replace(nextPath), 500);
    };

    const fail = (message = "登入失敗，請重試") => {
      setStatus(message);
      setTimeout(() => router.replace(`/auth?error=oauth&next=${encodeURIComponent(nextPath)}`), 1500);
    };

    const handleCallback = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish();
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[auth callback] code exchange failed", exchangeError);
          fail();
          return;
        }
        finish();
        return;
      }

      // The app uses PKCE. Never adopt access/refresh tokens from the URL hash:
      // doing so would allow login CSRF/session fixation with an attacker-owned
      // token pair. A callback without a session or PKCE code is incomplete.
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
