"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { parseCreatorUploadQuota, type CreatorUploadQuota } from "./creator-upload-quota";
export type { CreatorUploadQuota } from "./creator-upload-quota";

export function useCreatorUploadQuota(userId: string | null) {
  const [quota, setQuota] = useState<CreatorUploadQuota | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return null;
    const current = generation.current;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== userId) throw new Error("AUTH_REQUIRED");
      const response = await fetch("/api/credit", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error("Credit unavailable");
      const next = parseCreatorUploadQuota(payload.quota);
      if (!next) throw new Error("Invalid upload quota");
      if (current !== generation.current) return null;
      setQuota(next);
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
