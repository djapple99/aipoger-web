"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getFreshSession } from "@/lib/auth-session";
import { consumeFreshAuthReturnPath } from "@/lib/auth-urls";

function AuthCallbackInner() {
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
    const cleanCallbackUrl = () => {
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {
        // Ignore history errors; auth handling can still continue.
      }
    };

    cleanCallbackUrl();

    const buildAuthErrorUrl = (message: string) =>
      `/auth?error=oauth&auth_message=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`;

    if (error) {
      console.error("[auth callback]", error, errorDescription);
      const message = errorDescription || error;
      setStatus(`登入失敗：${message}`);
      setTimeout(() => window.location.replace(buildAuthErrorUrl(message)), 3500);
      return;
    }

    const finish = () => {
      setStatus("登入成功！");
      setTimeout(() => window.location.replace(nextPath), 500);
    };

    const fail = (message = "登入失敗，請重試") => {
      setStatus(message);
      setTimeout(() => window.location.replace(buildAuthErrorUrl(message)), 3500);
    };

    const finishAfterVerifiedSession = async (session: Session | null | undefined) => {
      let current = (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session;
      if (!current?.user && session?.access_token && session.refresh_token) {
        const { error: persistError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (persistError) {
          console.error("[auth callback] session persist failed", persistError);
          fail(persistError.message);
          return;
        }
        current = (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session;
      }

      const verified = current?.user ? current : await getFreshSession(3000);
      if (!verified?.user) {
        fail("登入資料沒有成功保存，請清除登入狀態後再試一次");
        return;
      }

      finish();
    };

    const handleCallback = async () => {
      // Implicit OAuth and Email Magic Links put tokens in the URL hash.
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          console.error("[auth callback] hash session failed", sessionError);
          fail(sessionError.message);
          return;
        }
        await finishAfterVerifiedSession(sessionData.session);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await finishAfterVerifiedSession(data.session);
        return;
      }

      if (code) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[auth callback] code exchange failed", exchangeError);
          fail(exchangeError.message);
          return;
        }
        await finishAfterVerifiedSession(exchangeData.session);
        return;
      }

      fail("登入資訊不完整，請重試");
    };

    void handleCallback();
  }, [searchParams]);

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
