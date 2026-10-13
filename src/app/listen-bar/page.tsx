"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
// Preserve old radio/genre/song links and old upload bookmarks after the merge.
export default function ListenBarPage() {
  const router = useRouter(); const { lang } = useI18n();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("lang", lang);
    if (window.location.hash === "#play-request" || params.get("submit") === "1") {
      router.replace(`/profile?submit=1&lang=${lang}#submit-work`);
      return;
    }
    params.delete("spotlight");
    router.replace(`/ai-music?${params.toString()}${params.has("track") ? "#works" : "#explore-radio"}`);
  }, [lang, router]);
  return <p role="status" className="p-8 text-white">{lang === "zh" ? "正在前往探索音樂…" : lang === "ja" ? "音楽を探すページへ移動中…" : lang === "ko" ? "음악 탐색으로 이동 중…" : "Opening Explore Music…"}</p>;
}
