"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

const voteDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

/** Private daily toggle state; public weekly counts still come from discovery. */
export function useMvHearts(trackIds: string[]) {
  const idsKey = JSON.stringify([...new Set(trackIds)].sort());
  const [hearts, setHearts] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<"read" | "write" | null>(null);
  const identity = useRef({ userId: null as string | null, version: 0 });
  const readVersion = useRef({ value: 0 });
  const mounted = useRef(false);
  const locked = useRef(false);
  const day = useRef(voteDate());

  const reload = useCallback(async () => {
    const request = ++readVersion.current.value;
    setReady(false); setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!mounted.current || request !== readVersion.current.value) return;
      const userId = data.session?.user.id ?? null;
      if (identity.current.userId !== userId) {
        identity.current = { userId, version: identity.current.version + 1 };
        setHearts({});
      }
      const ids: string[] = JSON.parse(idsKey);
      const next: Record<string, boolean> = {};
      day.current = voteDate();
      if (userId) {
        for (let offset = 0; offset < ids.length; offset += 100) {
          const response = await supabase.from("listen_bar_track_reactions").select("track_id")
            .eq("user_id", userId).eq("vote_date", day.current).eq("reaction", "heart").in("track_id", ids.slice(offset, offset + 100));
          if (response.error) throw response.error;
          for (const row of response.data ?? []) next[row.track_id] = true;
        }
      }
      if (mounted.current && request === readVersion.current.value) setHearts(next);
    } catch { if (mounted.current && request === readVersion.current.value) setError("read"); }
    finally { if (mounted.current && request === readVersion.current.value) setReady(true); }
  }, [idsKey]);

  useEffect(() => {
    const readClock = readVersion.current;
    mounted.current = true;
    void reload();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (identity.current.userId !== (session?.user.id ?? null)) {
        identity.current = { userId: session?.user.id ?? null, version: identity.current.version + 1 };
        ++readVersion.current.value; setHearts({}); setReady(false); setError(null);
      }
      queueMicrotask(() => { if (mounted.current) void reload(); });
    });
    const refresh = () => { if (!document.hidden) void reload(); };
    const timer = window.setInterval(() => { if (!document.hidden && day.current !== voteDate()) void reload(); }, 60_000);
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId?: string; heartedToday?: boolean }>).detail;
      if (identity.current.userId && detail?.trackId && typeof detail.heartedToday === "boolean") {
        ++readVersion.current.value;
        setHearts(current => ({ ...current, [detail.trackId!]: detail.heartedToday! }));
        setReady(true);
      }
    };
    window.addEventListener("aipoger:music-heart", sync);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false; ++readClock.value; ++identity.current.version;
      subscription.unsubscribe(); window.clearInterval(timer);
      window.removeEventListener("aipoger:music-heart", sync); document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);

  const toggle = async (trackId: string): Promise<"login" | "done" | "ignored"> => {
    if (locked.current || !ready || error === "read" || !trackIds.includes(trackId)) return "ignored";
    locked.current = true; setBusyId(trackId); setError(null);
    const version = identity.current.version;
    try {
      const { data } = await supabase.auth.getSession();
      if (!mounted.current || identity.current.version !== version) return "ignored";
      const session = data.session;
      if (!session) return "login";
      if (identity.current.userId !== session.user.id) { void reload(); return "ignored"; }
      const response = await fetch("/api/listen-bar/reaction", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ trackId, reaction: "heart" }),
      });
      const payload = await response.json();
      if (!mounted.current || identity.current.version !== version) return "ignored";
      if (response.status === 401) return "login";
      if (!response.ok || payload.ok !== true || typeof payload.heartedToday !== "boolean") throw new Error("Heart failed");
      window.dispatchEvent(new CustomEvent("aipoger:music-heart", { detail: { trackId, ...payload } }));
      return "done";
    } catch { if (mounted.current && identity.current.version === version) setError("write"); return "ignored"; }
    finally { locked.current = false; if (mounted.current) setBusyId(null); }
  };

  return { hearts, ready, busyId, error, toggle, reload };
}
