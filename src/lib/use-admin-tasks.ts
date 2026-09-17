"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";
import { ADMIN_TASKS, mergeAdminTasks, type AdminTasks } from "@/lib/admin-tasks";

export function useAdminTasks() {
  const [data, setData] = useState<AdminTasks | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pathname = usePathname();
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true, generation = 0, request = 0;
    let session: Session | null = null;
    let controller: AbortController | null = null;
    const update = async () => {
      if (!session || !isAdminEmail(session.user.email) || document.visibilityState === "hidden") return;
      controller?.abort(); controller = new AbortController();
      const signal = controller.signal, version = generation, revision = ++request;
      const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), 15000);
      try {
        const response = await fetch("/api/admin/tasks", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal });
        if (!alive || version !== generation || revision !== request) return;
        if (response.status === 401 || response.status === 403) { setData(null); setUnavailable(false); return; }
        if (!response.ok) throw new Error("Unavailable");
        const next = await response.json() as AdminTasks;
        if (!alive || version !== generation || revision !== request) return;
        if (!next.counts || !ADMIN_TASKS.every(({ id }) => next.counts[id] === null || (Number.isSafeInteger(next.counts[id]) && next.counts[id]! >= 0))) throw new Error("Invalid task summary");
        setData((previous) => mergeAdminTasks(previous, next));
        setUnavailable(Object.values(next.counts).some((n) => n === null));
      } catch { if (alive && version === generation && revision === request) setUnavailable(true); }
      finally { clearTimeout(timeout); }
    };
    const accept = (next: Session | null) => {
      generation += 1; controller?.abort();
      if (session?.user.id !== next?.user.id || !isAdminEmail(next?.user.email)) { setData(null); setUnavailable(false); }
      session = next;
      void update();
    };
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => { if (alive) accept(next); });
    const initial = generation;
    void supabase.auth.getSession().then(({ data: result }) => { if (alive && initial === generation) accept(result.session); }).catch(() => { if (alive) setUnavailable(true); });
    const tick = () => { void update(); };
    refresh.current = tick;
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("admin-tasks-changed", tick);
    return () => {
      alive = false; generation += 1; controller?.abort(); clearInterval(timer); auth.subscription.unsubscribe();
      window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); window.removeEventListener("admin-tasks-changed", tick); refresh.current = () => {};
    };
  }, []);
  useEffect(() => { refresh.current(); }, [pathname]);
  return { data, unavailable };
}
