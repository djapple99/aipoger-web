"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PRESENCE_VISITOR_KEY = "aipoger_presence_visitor_id";

function getPresenceVisitorId() {
  if (typeof window === "undefined") return `visitor-${Math.random().toString(36).slice(2)}`;

  const existing = window.localStorage.getItem(PRESENCE_VISITOR_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `visitor-${crypto.randomUUID()}`
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(PRESENCE_VISITOR_KEY, id);
  return id;
}

export function usePresenceCount(channelName: string, enabled = true, scope = "site") {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!enabled || !channelName) return undefined;

    let mounted = true;
    const fallbackVisitorId = getPresenceVisitorId();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: fallbackVisitorId } },
    });

    const sync = () => {
      if (!mounted) return;
      const visitors = new Set<string>();
      for (const presences of Object.values(channel.presenceState())) {
        for (const presence of presences as { visitor_id?: string; user_id?: string }[]) {
          const id = presence.user_id || presence.visitor_id;
          if (id) visitors.add(id);
        }
      }
      setCount(Math.max(1, visitors.size));
    };

    channel.on("presence", { event: "sync" }, sync);

    void channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      await channel.track({
        visitor_id: fallbackVisitorId,
        user_id: session?.user?.id ?? null,
        scope,
        online_at: new Date().toISOString(),
      });
      sync();
    });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, scope]);

  return count;
}
