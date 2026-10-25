"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_NOTICES_CHANGED } from "@/lib/account-notifications";
import { accountNoticeRequest } from "@/lib/account-notifications-client";

export function useAccountNotices(userId: string | null, scope = "dock") {
  const [state, setState] = useState({ userId: "", count: 0 });
  useEffect(() => {
    if (!userId || userId === "auth-bypass") return;
    let active = true, revision = 0;
    const refresh = async (event?: Event) => {
      const detail = (event as CustomEvent | undefined)?.detail;
      if (event?.type === ACCOUNT_NOTICES_CHANGED && detail?.userId === userId
        && Number.isInteger(detail.unreadCount) && detail.unreadCount >= 0) {
        setState({ userId, count: detail.unreadCount });
      }
      const request = ++revision;
      if (document.visibilityState === "hidden") return;
      try {
        const payload = await accountNoticeRequest(userId, "?count=1");
        if (active && request === revision) setState({ userId, count: payload.unreadCount });
      } catch { /* Retain the last confirmed count; errors must not claim a successful zero. */ }
    };
    void refresh();
    const channel = supabase.channel(`account-notice-count-${scope}-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_notifications", filter: `user_id=eq.${userId}` }, () => void refresh()).subscribe();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener(ACCOUNT_NOTICES_CHANGED, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(ACCOUNT_NOTICES_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [userId, scope]);
  return state.userId === userId ? state.count : 0;
}
