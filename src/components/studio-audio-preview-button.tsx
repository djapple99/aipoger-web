"use client";
import { Pause, Play } from "lucide-react";
import { musicPlayer, useMusicTrackPlayback } from "@/lib/music-player-store";

export default function StudioAudioPreviewButton({ id, title, isZh, onStart }: {
  id: string; title: string; isZh: boolean; onStart: () => void;
}) {
  const status = useMusicTrackPlayback(id);
  const playing = status === "playing";
  const action = playing ? (isZh ? "暫停" : "Pause") : status === "paused" ? (isZh ? "繼續播放" : "Resume") : (isZh ? "播放" : "Play");
  return <button type="button" onClick={() => {
    if (status === "idle") onStart();
    else musicPlayer?.toggle();
  }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-300/45 bg-orange-400/[0.1] px-4 text-sm font-black text-orange-50 transition hover:border-orange-200 hover:bg-orange-400/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
    aria-label={isZh ? `${action} ${title} 的 15 秒聲音示例` : `${action} the 15-second sound example for ${title}`}>
    {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
    {playing ? (isZh ? "暫停試聽" : "Pause preview") : status === "paused" ? (isZh ? "繼續試聽" : "Resume preview") : (isZh ? "15 秒試聽" : "15s preview")}
  </button>;
}
