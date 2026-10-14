"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
export default function CreditVisit() {
  useEffect(() => {
    let alive = true; let pending = false; let paidKey = "";
    const visit = async () => {
      if (!alive || pending || document.hidden) return;
      pending = true;
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session || session.user.is_anonymous) { paidKey = ""; return; }
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        const key = session.user.id + ":" + day;
        if (paidKey === key) return;
        const r = await fetch("/api/credit", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const result = await r.json();
        if (r.ok && alive) {
          paidKey = key;
          window.dispatchEvent(new CustomEvent("aipoger:credit", { detail: result }));
        }
      } catch { /* Keep unconfirmed visits retryable; never fabricate a reward. */ }
      finally { pending = false; }
    };
    void visit();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { queueMicrotask(() => void visit()); });
    const onFocus = () => void visit();
    const timer = window.setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus);
    return () => { alive = false; subscription.unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);
  return null;
}
