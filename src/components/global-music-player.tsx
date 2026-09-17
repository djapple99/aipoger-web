"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListMusic, FileText, Heart, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { clampMediaVolume, setNativeMediaVolume } from "@/lib/media-volume-control";

import AuthRequiredDialog from "@/components/auth-required-dialog";
import { supabase } from "@/lib/supabase";
import { nextMusicIndex, playableMusicQueue } from "@/lib/music-queue";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { useI18n } from "@/lib/i18n";
import { publishMusicPlayer, registerMusicPlayer, type MusicSession as ShowtimePlayerSession } from "@/lib/music-player-store";

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function GlobalMusicPlayer() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const label = useCallback((zh: string, en: string, ja: string, ko: string) => lang === "ja" ? ja : lang === "ko" ? ko : isZh ? zh : en, [isZh, lang]);
  const playbackSegmentRef = useRef<{ id: string; title: string; artist: string; source: string; pagePath: string; seconds: number; lastTime: number } | null>(null);
  const [heartBusy, setHeartBusy] = useState(false);
  const [hearted, setHearted] = useState<Record<string, boolean>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const historyRef = useRef<ShowtimePlayerSession[]>([]);
  const [historyDepth, setHistoryDepth] = useState(0);
  const lyricsDialogRef = useRef<HTMLDialogElement>(null);
  const playRequestRef = useRef(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const volumeRef = useRef(0.85);
  const sessionRef = useRef<ShowtimePlayerSession | null>(null);
  const [session, setSession] = useState<ShowtimePlayerSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [playbackError, setPlaybackError] = useState("");
  const track = session?.queue[session.index] ?? null;

  const finishSegment = useCallback((eventType: "song_pause" | "song_finish" | "song_skip") => {
    const segment = playbackSegmentRef.current;
    if (!segment) return;
    playbackSegmentRef.current = null;
    void logAnalyticsEvent({ eventType, songId: segment.id, source: segment.source, pagePath: segment.pagePath,
      metadata: { title: segment.title, artist: segment.artist, playedSeconds: Math.round(segment.seconds) } });
  }, []);
  const applyVolume = useCallback((audio: HTMLAudioElement, value: number) => {
    const normalized = clampMediaVolume(value);
    volumeRef.current = normalized;
    const nativeApplied = setNativeMediaVolume(audio, normalized);
    const context = audioContextRef.current;
    const gain = audioGainRef.current;
    if (context && gain) gain.gain.setValueAtTime(normalized, context.currentTime);
    return nativeApplied || Boolean(gain);
  }, []);

  const ensureVolumeControl = useCallback(async (audio: HTMLAudioElement) => {
    const normalized = volumeRef.current;
    if (setNativeMediaVolume(audio, normalized)) return;
    try {
      const AudioContextConstructor = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      let context = audioContextRef.current;
      let gain = audioGainRef.current;
      if (!context || !gain) {
        context = new AudioContextConstructor();
        const source = context.createMediaElementSource(audio);
        gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);
        audioContextRef.current = context;
        audioSourceRef.current = source;
        audioGainRef.current = gain;
      }
      gain.gain.setValueAtTime(normalized, context.currentTime);
      if (context.state === "suspended") await context.resume();
    } catch (error) {
      console.warn("[showtime-player] mobile volume gain unavailable", error);
    }
  }, []);

  useEffect(() => () => {
    audioSourceRef.current?.disconnect();
    audioGainRef.current?.disconnect();
    const context = audioContextRef.current;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const playTrack = useCallback(async (nextSession: ShowtimePlayerSession, autoplay = true) => {
    const audio = audioRef.current;
    const nextTrack = nextSession.queue[nextSession.index];
    if (!audio || !nextTrack) return false;

    finishSegment("song_skip");
    const request = ++playRequestRef.current;
    sessionRef.current = nextSession;
    setSession(nextSession);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
    document.querySelectorAll("audio, video").forEach(media => {
      if (media instanceof HTMLMediaElement && media !== audio) media.pause();
    });
    audio.pause();
    audio.src = nextTrack.audioUrl;
    applyVolume(audio, volumeRef.current);
    audio.load();

    if (!autoplay) { setPlaying(false); return true; }
    try {
      await ensureVolumeControl(audio);
      if (request !== playRequestRef.current) return false;
      await audio.play();
      if (request !== playRequestRef.current) return false;
      setPlaying(true);
      return true;
    } catch {
      if (request !== playRequestRef.current) return false;
      setPlaying(false);
      setPlaybackError(label("瀏覽器暫停了自動播放，請再按一次播放。", "Playback was paused by the browser. Press play again.", "ブラウザが自動再生を停止しました。再生を押してください。", "브라우저가 자동 재생을 중지했습니다. 재생을 눌러 주세요."));
      return false;
    }
  }, [applyVolume, ensureVolumeControl, finishSegment, label]);

  const close = useCallback(() => {
    ++playRequestRef.current;
    historyRef.current = [];
    setHistoryDepth(0);
    setLyricsOpen(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    sessionRef.current = null;
    setSession(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
  }, []);

  const move = useCallback((direction: -1 | 1) => {
    const current = sessionRef.current;
    if (!current) return;
    if (direction === -1) {
      const previous = historyRef.current.pop();
      setHistoryDepth(historyRef.current.length);
      if (previous) void playTrack(previous);
      return;
    }
    const index = nextMusicIndex(current.index, current.queue.length, current.repeat);
    if (index === null) return;
    historyRef.current.push(current);
    setHistoryDepth(historyRef.current.length);
    void playTrack({ ...current, index });
  }, [playTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError("");
    if (audio.paused) {
      void ensureVolumeControl(audio).then(() => audio.play()).then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
        setPlaybackError(label("目前無法播放，請稍後再試。", "Playback is unavailable. Try again shortly.", "現在再生できません。しばらくしてから再試行してください。", "현재 재생할 수 없습니다. 잠시 후 다시 시도해 주세요."));
      });
    } else {
      audio.pause();
    }
  }, [ensureVolumeControl, label]);

  useEffect(() => {
    registerMusicPlayer({
      start: async (queue, requestedIndex = 0, sourceLabel = "AIPOGER", options = {}) => {
        const { queue: playable, index } = playableMusicQueue(queue, requestedIndex);
        if (!playable.length) return false;
        historyRef.current = [];
        setHistoryDepth(0);
        return playTrack({ queue: playable, index, sourceLabel, ...options });
      },
      close, toggle: togglePlayback, move,
    });
    return () => registerMusicPlayer(null);
  }, [close, move, playTrack, togglePlayback]);
  useEffect(() => { publishMusicPlayer({ session, playing, currentTime, duration }); }, [session, playing, currentTime, duration]);
  useEffect(() => {
    if (!session) return;
    const pauseOtherMedia = (event: Event) => {
      if (event.target instanceof HTMLMediaElement && event.target !== audioRef.current) audioRef.current?.pause();
    };
    document.addEventListener("play", pauseOtherMedia, true);
    return () => document.removeEventListener("play", pauseOtherMedia, true);
  }, [session]);

  useEffect(() => {
    if (!session?.sourceKey?.startsWith("bar:")) return;
    const controller = new AbortController();
    const refreshAvailability = async () => {
      try {
        const response = await fetch("/api/listen-bar/tracks", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json();
        if (!Array.isArray(payload.tracks)) return;
        const allowed = new Set(payload.tracks.map((track: { id: string }) => track.id));
        const current = sessionRef.current;
        if (!current?.sourceKey?.startsWith("bar:")) return;
        const queue = current.queue.filter(track => allowed.has(track.id));
        if (queue.length === current.queue.length) return;
        historyRef.current = [];
        setHistoryDepth(0);
        if (!queue.length) { close(); return; }
        const index = queue.findIndex(track => track.id === current.queue[current.index].id);
        if (index >= 0) {
          const next = { ...current, queue, index };
          sessionRef.current = next;
          setSession(next);
        } else {
          const following = [...current.queue.slice(current.index + 1), ...current.queue.slice(0, current.index)].find(track => allowed.has(track.id));
          void playTrack({ ...current, queue, index: Math.max(0, queue.findIndex(track => track.id === following?.id)) }, !audioRef.current?.paused);
        }
      } catch { /* Keep the current queue on transient network failure. */ }
    };
    const timer = window.setInterval(() => void refreshAvailability(), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [session?.sourceKey, close, playTrack]);

  useEffect(() => {
    const syncHeart = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId?: string; heartedToday?: boolean }>).detail;
      if (detail?.trackId && typeof detail.heartedToday === "boolean") {
        setHearted(current => ({ ...current, [detail.trackId!]: detail.heartedToday === true }));
      }
    };
    window.addEventListener("aipoger:music-heart", syncHeart);
    return () => window.removeEventListener("aipoger:music-heart", syncHeart);
  }, []);

  const sendHeart = async () => {
    const id = track?.heartTrackId;
    if (!id || heartBusy) return;
    setHeartBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) { setAuthOpen(true); return; }
      const response = await fetch("/api/listen-bar/reaction", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ trackId: id, reaction: "heart" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Heart failed");
      setHearted(current => ({ ...current, [id]: payload.heartedToday === true }));
      window.dispatchEvent(new CustomEvent("aipoger:music-heart", { detail: { trackId: id, ...payload } }));
    } catch { setPlaybackError(label("愛心送出失敗，請稍後再試。", "Heart failed. Try again later.", "Heartを送れませんでした。", "Heart 전송에 실패했습니다.")); }
    finally { setHeartBusy(false); }
  };
  useEffect(() => {
    const dialog = lyricsDialogRef.current;
    if (lyricsOpen && track) dialog?.showModal();
    else dialog?.close();
  }, [lyricsOpen, track]);
  useEffect(() => {
    if (!session) return;
    document.body.style.paddingBottom = "150px";
    return () => { document.body.style.paddingBottom = ""; };
  }, [session]);

  return (
    <>
      <AuthRequiredDialog open={authOpen} kind="heart" lang={lang} nextPath={`/listen-bar?lang=${lang}`} onClose={() => setAuthOpen(false)} />
      <dialog ref={lyricsDialogRef} onClose={() => setLyricsOpen(false)} className="fixed inset-0 m-auto max-h-[75dvh] w-[min(92vw,36rem)] overflow-y-auto rounded-2xl border border-orange-300/25 bg-zinc-950 p-5 text-white backdrop:bg-black/70" aria-label={label("歌詞", "Lyrics", "歌詞", "가사")}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">{track?.title}</h2><button autoFocus onClick={() => setLyricsOpen(false)} aria-label={label("關閉歌詞", "Close lyrics", "歌詞を閉じる", "가사 닫기")}><X /></button></div>
        <p className="whitespace-pre-wrap text-sm leading-8">{track?.lyrics || label("歌詞未提供", "Lyrics not provided", "歌詞は未提供です", "가사가 없습니다")}</p>
      </dialog>
      {track && session ? (
        <div
          data-showtime-queue-player
          className="fixed inset-x-0 bottom-0 z-[70] border-t border-yellow-100/25 bg-[#070707]/96 px-3 py-2.5 shadow-[0_-18px_55px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:px-5"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 lg:grid-cols-[auto_minmax(9rem,0.75fr)_minmax(16rem,1.5fr)_auto] sm:gap-4">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100"
              aria-label={playing ? (label("暫停", "Pause", "一時停止", "일시정지")) : label("播放", "Play", "再生", "재생")}
            >
              {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={track.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white sm:text-sm">{track.title}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-bold text-zinc-500 sm:text-[11px]">
                  <ListMusic className="h-3 w-3 shrink-0" />
                  {session.sourceLabel} · {track.artist}
                </p>
              </div>
            </div>

            <div className="col-span-3 row-start-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
              <span className="text-[10px] font-bold tabular-nums text-zinc-500">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0)}
                step={0.1}
                value={Math.min(currentTime, Math.max(duration, 0))}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = next;
                  setCurrentTime(next);
                }}
                className="h-1.5 w-full cursor-pointer accent-orange-500"
                aria-label={label("拖曳播放進度", "Seek playback", "再生位置", "재생 위치")}
              />
              <span className="text-[10px] font-bold tabular-nums text-zinc-500">{formatTime(duration)}</span>
            </div>

            <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 lg:col-start-4">
              <button type="button" onClick={() => move(-1)} disabled={historyDepth === 0} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={label("上一首", "Previous track", "前の曲", "이전 곡")}><SkipBack className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(1)} disabled={!session.repeat && session.index >= session.queue.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={label("下一首", "Next track", "次の曲", "다음 곡")}><SkipForward className="h-4 w-4" /></button>
              <label className="hidden items-center gap-1.5 lg:flex">
                <Volume2 className="h-4 w-4 text-zinc-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setVolume(next);
                    if (audioRef.current) { applyVolume(audioRef.current, next); void ensureVolumeControl(audioRef.current); }
                  }}
                  className="w-20 accent-orange-500"
                  aria-label={label("調整音量", "Adjust volume", "音量", "볼륨")}
                />
              </label>
              {track.heartTrackId ? <button type="button" disabled={heartBusy} onClick={() => void sendHeart()} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-orange-300 disabled:opacity-40" aria-label={label("愛心與收藏", "Heart and save", "Heartと保存", "Heart 및 저장")}><Heart className="h-4 w-4" fill={hearted[track.heartTrackId] ? "currentColor" : "none"} /></button> : null}
              <button type="button" onClick={() => setLyricsOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-white" aria-label={label("看歌詞", "View lyrics", "歌詞を見る", "가사 보기")}><FileText className="h-4 w-4" /></button>
              <button type="button" onClick={close} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label={label("關閉播放器", "Close player", "プレーヤーを閉じる", "플레이어 닫기")}><X className="h-4 w-4" /></button>
            </div>

            <label className="col-span-3 row-start-3 flex items-center gap-2 lg:hidden">
              <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  if (audioRef.current) { applyVolume(audioRef.current, next); void ensureVolumeControl(audioRef.current); }
                }}
                className="w-full accent-orange-500"
                aria-label={label("調整音量", "Adjust volume", "音量", "볼륨")}
              />
            </label>
            {playbackError ? <p className="col-span-3 text-[11px] font-bold text-orange-100 sm:col-span-4">{playbackError}</p> : null}
          </div>
        </div>
      ) : null}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          const session = sessionRef.current;
          const current = session?.queue[session.index];
          const id = current?.heartTrackId || current?.id;
          if (current && id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
            const source = session?.sourceKey?.startsWith("bar:") ? "bar_heartbreak" : "music_player";
            const pagePath = session?.sourceKey?.startsWith("bar:") ? "/listen-bar" : window.location.pathname;
            playbackSegmentRef.current = { id, title: current.title, artist: current.artist, source, pagePath, seconds: 0, lastTime: audioRef.current?.currentTime || 0 };
            void logAnalyticsEvent({ eventType: "song_play", songId: id, source, pagePath, metadata: { title: current.title, artist: current.artist } });
          }
        }}
        onPause={(event) => { setPlaying(false); if (!event.currentTarget.ended) finishSegment("song_pause"); }}
        onError={() => { setPlaying(false); setPlaybackError(label("音檔載入失敗，請重試或播放下一首。", "Audio failed to load. Retry or play the next track.", "音源を読み込めません。再試行するか次の曲を再生してください。", "오디오를 불러오지 못했습니다. 다시 시도하거나 다음 곡을 재생하세요.")); }}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          const segment = playbackSegmentRef.current;
          if (segment) {
            const delta = time - segment.lastTime;
            if (delta > 0 && delta < 2) segment.seconds += delta;
            segment.lastTime = time;
          }
          setCurrentTime(time);
        }}
        onLoadedMetadata={(event) => {
          applyVolume(event.currentTarget, volumeRef.current);
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
        }}
        onEnded={() => {
          finishSegment("song_finish");
          const current = sessionRef.current;
          if (current && (current.repeat || current.index < current.queue.length - 1)) {
            move(1);
          } else {
            setPlaying(false);
          }
        }}
      />
    </>
  );
}
