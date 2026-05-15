"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("完成登入中…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 只執行一次，不要讓 React StrictMode 造成問題
    if (done) return;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("登入失敗，請重試");
      setTimeout(() => router.replace("/auth"), 1500);
      return;
    }

    // 等待一下再跳轉，避免還沒處理完就離開
    const timer = setTimeout(async () => {
      // 嘗試拿 session（OAuth flow 會自動設定 cookie）
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // 登入成功，直接跳首頁
        setStatus("登入成功！");
        setDone(true);
        setTimeout(() => router.replace("/"), 800);
      } else if (code) {
        // 沒有 session 但有 code，嘗試 exchange
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setStatus("登入成功！");
          setDone(true);
          setTimeout(() => router.replace("/"), 800);
        } else {
          setStatus("登入失敗，請重試");
          setTimeout(() => router.replace("/auth"), 1500);
        }
      } else {
        // 既沒有 code 也沒有 session
        setStatus("登入資訊不完整，請重試");
        setTimeout(() => router.replace("/auth"), 1500);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []); // 空的 dependency，只跑一次

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="mb-4 text-4xl">🎵</div>
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