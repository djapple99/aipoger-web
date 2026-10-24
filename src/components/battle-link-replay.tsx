"use client";
import { useRef, useState } from "react";
import BattleMediaPlayer, { type BattlePlayerHandle } from "@/components/battle-media-player";
import type { BattleLinkPlayback } from "@/lib/battle-link-rules";
export default function BattleLinkReplay({ playback, title, isZh }: { playback: BattleLinkPlayback; title: string; isZh: boolean }) {
  const player = useRef<BattlePlayerHandle>(null); const [playing, setPlaying] = useState(false); const [error, setError] = useState(false);
  return <div className="mt-3 rounded-xl border border-white/15 bg-black/50 p-3">
    <BattleMediaPlayer ref={player} playback={playback} title={title} onPlaying={setPlaying} onEnded={() => setPlaying(false)} onError={() => setError(true)} />
    <button type="button" onClick={() => { setError(false); if (player.current?.paused) { player.current.currentTime = 0; void player.current.play().catch(() => setError(true)); } else player.current?.pause(); }} className="min-h-11 rounded-lg border border-orange-300/35 px-4 py-2 text-xs font-bold text-orange-200">{playing ? isZh ? "暫停" : "Pause" : isZh ? "重播參戰作品" : "Replay battle entry"}</button>
    {error && <p className="mt-2 text-xs text-zinc-400">{isZh ? "作品來源暫時無法播放。" : "Source temporarily unavailable."}</p>}
  </div>;
}
