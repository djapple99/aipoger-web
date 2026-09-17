"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type CreatorUploadQuota = { used: number; limit: number; resetsAt: string | null; serverNow: string };

export function useCreatorUploadQuota(userId: string | null) {
  const [quota, setQuota] = useState<CreatorUploadQuota | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return null;
    const current = generation.current;
    try {
      const { data, error } = await supabase.rpc("listen_bar_my_upload_quota");
      if (error) throw error;
      const next = data as CreatorUploadQuota;
      if (!next || !Number.isInteger(next.used) || next.limit !== 3) throw new Error("Invalid upload quota");
      if (current === generation.current) setQuota(next);
      return next;
    } catch {
      if (current === generation.current) setQuota(null);
      return null;
    }
  }, [userId]);

  useEffect(() => {
    generation.current += 1;
    setQuota(null);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      generation.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { quota, refresh };
}
