"use client";
import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { musicPlayer, getMusicPlayerState, type MusicTrack } from "@/lib/music-player-store";
import { parseExternalMusic } from "@/lib/external-music";
import { useI18n } from "@/lib/i18n";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
const ExternalMusicPlayer = dynamic(() => import("@/components/external-music-player"));
export type ShowtimePlayerTrack = MusicTrack & { externalUrl?: string | null };
export type ShowtimeQueuePlayerHandle = {
  start: (queue: ShowtimePlayerTrack[], index?: number, label?: string) => Promise<boolean>;
  close: () => void;
};
const labels = {
  zh: { close: "關閉播放器", previous: "上一首", next: "下一首", manual: "外站播放器請按播放；Suno／Spotify 播畢後按下一首。" },
  en: { close: "Close player", previous: "Previous track", next: "Next track", manual: "Press play in the embedded player; use Next after Suno / Spotify finishes." },
  ja: { close: "プレーヤーを閉じる", previous: "前の曲", next: "次の曲", manual: "埋め込みの再生を押してください。Suno／Spotify の終了後は「次の曲」へ。" },
  ko: { close: "플레이어 닫기", previous: "이전 곡", next: "다음 곡", manual: "외부 플레이어에서 재생하세요. Suno / Spotify 재생 후 다음 곡을 누르세요." },
};
const ShowtimeQueuePlayer = forwardRef<ShowtimeQueuePlayerHandle, { isZh: boolean }>(function ShowtimeQueuePlayer(_props, ref) {
  const { lang } = useI18n();
  const copy = labels[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState<{ queue: ShowtimePlayerTrack[]; index: number } | null>(null);
  useEffect(() => { if (session && !dialog.current?.open) dialog.current?.showModal(); }, [session]);
  useImperativeHandle(ref, () => ({
    start: async (queue, index = 0, label) => {
      if (!queue.length || index < 0 || index >= queue.length) return false;
      // Audio and YouTube retain the existing continuous global player. Other
      // providers use their official embeds, preserving every song and its order.
      const embedded = queue.some(track => !track.audioUrl && parseExternalMusic(track.externalUrl)?.provider !== "youtube");
      if (embedded) {
        if (getMusicPlayerState().playing) musicPlayer?.toggle();
        setSession({ queue, index });
        return true;
      }
      setSession(null);
      return musicPlayer?.start(queue.map(track => ({ ...track,
        youtubeId: !track.audioUrl ? parseExternalMusic(track.externalUrl)?.mediaId : track.youtubeId,
      })), index, label) ?? false;
    },
    close: () => { setSession(null); musicPlayer?.close(); },
  }), []);
  if (!session) return null;
  const track = session.queue[session.index];
  const media = !track.audioUrl ? parseExternalMusic(track.externalUrl) : null;
  const next = () => setSession(current => current && current.index + 1 < current.queue.length ? { ...current, index: current.index + 1 } : current);
  return <dialog ref={dialog} aria-label={track.title} onCancel={() => setSession(null)} onClick={event => { if (event.target === event.currentTarget) setSession(null); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(92vw,720px)] overflow-auto border border-white/20 bg-[#101010] p-4 text-white backdrop:bg-black/80">
    <div className="mb-3 flex items-center gap-3"><h2 className="min-w-0 flex-1 break-words font-bold">{track.title}</h2><button type="button" autoFocus aria-label={copy.close} onClick={() => setSession(null)} className="flex h-11 w-11 shrink-0 items-center justify-center"><X /></button></div>
    {media ? <ExternalMusicPlayer key={track.id} media={media} title={track.title} onEnded={next} /> : <audio key={track.id} src={track.audioUrl} controls autoPlay onEnded={next} className="w-full" />}
    <p className="mt-3 text-xs text-zinc-400">{copy.manual}</p>
    <div className="mt-3 flex items-center justify-between gap-3"><button type="button" disabled={session.index === 0} onClick={() => setSession(current => current ? { ...current, index: Math.max(0, current.index - 1) } : current)} aria-label={copy.previous} className="flex h-11 w-11 items-center justify-center border border-white/20 disabled:opacity-30"><ChevronLeft /></button><span>{session.index + 1} / {session.queue.length}</span><button type="button" disabled={session.index + 1 === session.queue.length} onClick={next} aria-label={copy.next} className="flex h-11 w-11 items-center justify-center border border-white/20 disabled:opacity-30"><ChevronRight /></button></div>
  </dialog>;
});
export default ShowtimeQueuePlayer;
