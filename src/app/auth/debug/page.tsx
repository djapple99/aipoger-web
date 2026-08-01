"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AUTH_RETURN_STORAGE_KEY } from "@/lib/auth-urls";
import { getFreshSession } from "@/lib/auth-session";
import { SUPABASE_AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";

type SafeAuthSnapshot = {
  checkedAt: string;
  pageUrl: string;
  storageKeyPresent: boolean;
  relatedStorageKeys: string[];
  getSession: SafeSessionStatus;
  getUser: SafeUserStatus;
  getFreshSession: SafeSessionStatus;
};

type SafeSessionStatus = {
  ok: boolean;
  email: string | null;
  expiresAt: string | null;
  error: string | null;
};

type SafeUserStatus = {
  ok: boolean;
  email: string | null;
  error: string | null;
};

const RESET_STORAGE_KEYS = [
  SUPABASE_AUTH_STORAGE_KEY,
  `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
  AUTH_RETURN_STORAGE_KEY,
];

function sessionStatus(session: Session | null | undefined, error: string | null = null): SafeSessionStatus {
  return {
    ok: Boolean(session?.user),
    email: session?.user?.email ?? null,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString("zh-TW") : null,
    error,
  };
}

function userStatus(user: User | null | undefined, error: string | null = null): SafeUserStatus {
  return {
    ok: Boolean(user),
    email: user?.email ?? null,
    error,
  };
}

function listRelatedStorageKeys() {
  if (typeof window === "undefined") return [];

  try {
    return Object.keys(window.localStorage)
      .filter((key) => key.includes("rwueinzgjaaefjvmsyem") || key.startsWith("aipoger:auth"))
      .sort();
  } catch {
    return [];
  }
}

function readStorageKeyPresent() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? "bg-emerald-400/14 text-emerald-200" : "bg-red-500/14 text-red-200"}`}>
      {ok ? "OK" : "需要處理"}
    </span>
  );
}

function StatusRow({
  label,
  value,
  ok,
  detail,
}: {
  label: string;
  value: string;
  ok: boolean;
  detail?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-zinc-100">{label}</p>
        <StatusPill ok={ok} />
      </div>
      <p className="mt-2 break-words text-sm text-zinc-300">{value}</p>
      {detail ? <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export default function AuthDebugPage() {
  const [snapshot, setSnapshot] = useState<SafeAuthSnapshot | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const supabaseUrl = useMemo(() => process.env.NEXT_PUBLIC_SUPABASE_URL || "", []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);

    const sessionResult = await supabase.auth.getSession().catch((error: unknown) => ({
      data: { session: null },
      error: error as { message?: string },
    }));
    const userResult = await supabase.auth.getUser().catch((error: unknown) => ({
      data: { user: null },
      error: error as { message?: string },
    }));
    const freshSession = await getFreshSession(2500).catch(() => null);

    setSnapshot({
      checkedAt: new Date().toLocaleString("zh-TW"),
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      storageKeyPresent: readStorageKeyPresent(),
      relatedStorageKeys: listRelatedStorageKeys(),
      getSession: sessionStatus(sessionResult.data.session, sessionResult.error?.message ?? null),
      getUser: userStatus(userResult.data.user, userResult.error?.message ?? null),
      getFreshSession: sessionStatus(freshSession),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSnapshot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setEvents((items) => [`${new Date().toLocaleTimeString("zh-TW")} ${event}${session?.user?.email ? ` · ${session.user.email}` : ""}`, ...items].slice(0, 8));
    });

    return () => subscription.unsubscribe();
  }, [loadSnapshot]);

  const resetAuthState = async () => {
    setResetting(true);
    await supabase.auth.signOut().catch(() => null);
    try {
      RESET_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Ignore storage failures; the page will still send the user to the login screen.
    }
    window.location.replace("/auth");
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white md:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-orange-300/80">AIPOGER AUTH CHECK</p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">登入診斷</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              這頁只顯示安全狀態，不顯示 token、密碼或 cookie。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadSnapshot}
              disabled={loading}
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-black text-zinc-100 transition hover:border-orange-300/60 disabled:opacity-50"
            >
              重新檢查
            </button>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-black text-zinc-100 transition hover:border-cyan-200/60"
            >
              回首頁
            </Link>
          </div>
        </div>

        {loading || !snapshot ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-sm font-bold text-zinc-400">
            檢查中…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StatusRow
                label="Supabase 專案"
                value={supabaseUrl.replace(/^https:\/\//, "") || "未設定"}
                ok={supabaseUrl.includes("rwueinzgjaaefjvmsyem")}
                detail={snapshot.pageUrl}
              />
              <StatusRow
                label="本機登入儲存"
                value={snapshot.storageKeyPresent ? "AIPOGER auth storage key 存在" : "沒有找到 AIPOGER auth storage key"}
                ok={snapshot.storageKeyPresent}
                detail={snapshot.relatedStorageKeys.length > 0 ? snapshot.relatedStorageKeys.join(", ") : "沒有相關 key"}
              />
              <StatusRow
                label="getSession"
                value={snapshot.getSession.email ?? "沒有 session user"}
                ok={snapshot.getSession.ok}
                detail={snapshot.getSession.error || snapshot.getSession.expiresAt}
              />
              <StatusRow
                label="getUser 驗證"
                value={snapshot.getUser.email ?? "沒有驗證到 user"}
                ok={snapshot.getUser.ok}
                detail={snapshot.getUser.error}
              />
              <StatusRow
                label="getFreshSession"
                value={snapshot.getFreshSession.email ?? "helper 沒拿到 session"}
                ok={snapshot.getFreshSession.ok}
                detail={snapshot.getFreshSession.expiresAt}
              />
              <StatusRow
                label="檢查時間"
                value={snapshot.checkedAt}
                ok
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-sm font-black text-zinc-100">Auth 事件</p>
              <div className="mt-3 space-y-2">
                {events.length > 0 ? (
                  events.map((event) => (
                    <p key={event} className="rounded-2xl bg-black/35 px-3 py-2 text-xs text-zinc-400">
                      {event}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">目前沒有新的 auth 事件。</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-red-300/20 bg-red-500/[0.07] p-5">
              <p className="text-sm font-black text-red-100">登入卡死時才使用</p>
              <p className="mt-2 text-sm leading-6 text-red-100/75">
                這會登出並只清除 AIPOGER 相關登入狀態，接著回到登入頁重新選帳號。
              </p>
              <button
                type="button"
                onClick={resetAuthState}
                disabled={resetting}
                className="mt-4 rounded-full bg-red-400 px-5 py-2 text-sm font-black text-black transition hover:bg-red-300 disabled:opacity-50"
              >
                {resetting ? "清除中…" : "清除 AIPOGER 登入狀態"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
