"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListMusic, FileText, Heart, MessageCircleMore, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import YouTubeRadioPlayer from "@/components/youtube-radio-player";
import type { YouTubePlayer } from "@/lib/youtube-player-api";
import dynamic from "next/dynamic";
const HomeWorkFeedback = dynamic(() => import("@/components/home-work-feedback"));
import { clampMediaVolume, setNativeMediaVolume } from "@/lib/media-volume-control";

import AuthRequiredDialog from "@/components/auth-required-dialog";
import { supabase } from "@/lib/supabase";
import { nextMusicIndex, playableMusicQueue } from "@/lib/music-queue";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { createListeningMeasurement, listeningTrackId } from "@/lib/music-listening-measurement";
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
  const listeningRef = useRef<ReturnType<typeof createListeningMeasurement> | null>(null);
  const [heartBusy, setHeartBusy] = useState(false);
  const [hearted, setHearted] = useState<Record<string, boolean>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  const [commentTrack, setCommentTrack] = useState<ShowtimePlayerSession["queue"][number] | null>(null);
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
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const [youtubeRequest, setYoutubeRequest] = useState({ id: 0, autoplay: true });
  const [youtubeMount, setYoutubeMount] = useState(0);
  const isYouTube = Boolean(track?.youtubeId && !track.audioUrl);
  const currentIsYouTube = useCallback(() => {
    const current = sessionRef.current;
    const song = current?.queue[current.index];
    return Boolean(song?.youtubeId && !song.audioUrl);
  }, []);

  useEffect(() => {
    const sync = (event: Event) => setInlineVisible((event as CustomEvent).detail === true);
    window.addEventListener("aipoger:player-inline-visible", sync);
    return () => window.removeEventListener("aipoger:player-inline-visible", sync);
  }, []);

  const finishSegment = useCallback((eventType: "song_pause" | "song_finish" | "song_skip") => {
    const segment = playbackSegmentRef.current;
    if (!segment) return;
    playbackSegmentRef.current = null;
    void logAnalyticsEvent({ eventType, songId: segment.id, source: segment.source, pagePath: segment.pagePath,
      metadata: { title: segment.title, artist: segment.artist, playedSeconds: Math.round(segment.seconds), ...listeningRef.current?.snapshot(audioRef.current?.duration ?? 0) } });
    listeningRef.current?.reset();
  }, []);
  useEffect(() => {
    let user: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (user !== undefined && user !== next) listeningRef.current = null;
      user = next;
    });
    const flush = () => finishSegment("song_pause");
    window.addEventListener("pagehide", flush);
    return () => { subscription.unsubscribe(); window.removeEventListener("pagehide", flush); };
  }, [finishSegment]);
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

  const playTrack = useCallback(async (nextSession: ShowtimePlayerSession, autoplay = true, intentional = true) => {
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
    youtubeRef.current?.pauseVideo();
    setPlaying(false);
    if (nextTrack.youtubeId && !nextTrack.audioUrl) {
      audio.removeAttribute("src"); audio.load(); listeningRef.current = null;
      if (!youtubeRef.current) setYoutubeMount(value => value + 1);
      setYoutubeRequest({ id: request, autoplay });
      return true;
    }
    listeningRef.current = createListeningMeasurement(crypto.randomUUID(), intentional, new Date().toISOString());
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
    youtubeRef.current?.pauseVideo();
    sessionRef.current = null;
    listeningRef.current = null;
    setSession(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
  }, []);

  const move = useCallback((direction: -1 | 1, intentional = true) => {
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
    void playTrack({ ...current, index }, true, intentional);
  }, [playTrack]);

  const resumeAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !sessionRef.current || currentIsYouTube()) return;
    if (!audio.paused) return;
    const request = ++playRequestRef.current;
    setPlaybackError("");
    try {
      await ensureVolumeControl(audio);
      if (request !== playRequestRef.current) return;
      await audio.play();
      if (request === playRequestRef.current) setPlaying(true);
    } catch {
      if (request !== playRequestRef.current) return;
      setPlaying(false);
      setPlaybackError(label("目前無法播放，請稍後再試。", "Playback is unavailable. Try again shortly.", "現在再生できません。しばらくしてから再試行してください。", "현재 재생할 수 없습니다. 잠시 후 다시 시도해 주세요."));
    }
  }, [currentIsYouTube, ensureVolumeControl, label]);
  const pauseAudio = useCallback(() => {
    ++playRequestRef.current;
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (currentIsYouTube()) {
      setPlaybackError("");
      const player = youtubeRef.current;
      if (player?.getPlayerState() === 1) player.pauseVideo();
      else if (player) player.playVideo();
      else { setYoutubeMount(value => value + 1); setYoutubeRequest(value => ({ ...value, autoplay: true })); }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void resumeAudio();
    } else {
      pauseAudio();
    }
  }, [currentIsYouTube, pauseAudio, resumeAudio]);

  useEffect(() => {
    registerMusicPlayer({
      start: async (queue, requestedIndex = 0, sourceLabel = "AIPOGER", options = {}) => {
        const { queue: playable, index } = playableMusicQueue(queue, requestedIndex);
        if (!playable.length) return false;
        historyRef.current = [];
        setHistoryDepth(0);
        const { intentional = true, ...sessionOptions } = options;
        return playTrack({ queue: playable, index, sourceLabel, ...sessionOptions }, true, intentional);
      },
      close, toggle: togglePlayback, move,
      seek: (seconds) => {
        if (currentIsYouTube()) {
          const player = youtubeRef.current;
          if (player && Number.isFinite(seconds)) player.seekTo(Math.max(0, Math.min(player.getDuration(), seconds)), true);
          return;
        }
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || !Number.isFinite(seconds)) return;
        const next = Math.min(audio.duration, Math.max(0, seconds));
        audio.currentTime = next; setCurrentTime(next);
      },
      setVolume: (value) => {
        const next = clampMediaVolume(value); setVolume(next); volumeRef.current = next;
        youtubeRef.current?.setVolume(next * 100);
        if (audioRef.current) { applyVolume(audioRef.current, next); void ensureVolumeControl(audioRef.current); }
      },
    });
    return () => registerMusicPlayer(null);
  }, [applyVolume, close, ensureVolumeControl, move, playTrack, togglePlayback, currentIsYouTube]);
  useEffect(() => { publishMusicPlayer({ session, playing, currentTime, duration, volume, historyDepth, playbackError }); }, [session, playing, currentTime, duration, volume, historyDepth, playbackError]);
  useEffect(() => {
    if (!session) return;
    const pauseOtherMedia = (event: Event) => {
      if (event.target instanceof HTMLMediaElement && event.target !== audioRef.current) { audioRef.current?.pause(); youtubeRef.current?.pauseVideo(); }
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
          void playTrack({ ...current, queue, index: Math.max(0, queue.findIndex(track => track.id === following?.id)) }, currentIsYouTube() ? youtubeRef.current?.getPlayerState() === 1 : !audioRef.current?.paused, false);
        }
      } catch { /* Keep the current queue on transient network failure. */ }
    };
    const timer = window.setInterval(() => void refreshAvailability(), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [session?.sourceKey, close, playTrack, currentIsYouTube]);

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
    if (lyricsOpen && track?.lyrics?.trim()) dialog?.showModal();
    else dialog?.close();
  }, [lyricsOpen, track]);
  useEffect(() => {
    if (!session || (inlineVisible && !isYouTube)) return;
    document.body.style.paddingBottom = isYouTube ? "310px" : "150px";
    return () => { document.body.style.paddingBottom = ""; };
  }, [session, inlineVisible, isYouTube]);

  return (
    <>
      {commentTrack?.heartTrackId ? <HomeWorkFeedback key={commentTrack.heartTrackId}
        work={{ id: commentTrack.heartTrackId, title: commentTrack.title, artist: commentTrack.artist, genre: commentTrack.genre ?? "", coverUrl: commentTrack.coverUrl, audioUrl: commentTrack.audioUrl, lyrics: commentTrack.lyrics ?? "", description: "", videoId: null, youtubeUrl: null, supporterCount: 0, publishedAt: "" }}
        supportNote={label("愛心會同步收藏；歌曲評論共用同一作品。", "Hearts also save the track. Comments belong to the same work.", "Heartを送ると保存されます。コメントは同じ作品に集まります。", "Heart는 곡을 저장합니다. 댓글은 같은 작품에 연결됩니다.")}
        returnPath={typeof window === "undefined" ? "/ai-music" : window.location.pathname + window.location.search + window.location.hash}
        onClose={() => setCommentTrack(null)} onChange={() => {}} /> : null}
      <AuthRequiredDialog open={authOpen} kind="heart" lang={lang} nextPath={`/ai-music?lang=${lang}${track?.heartTrackId ? `&track=${track.heartTrackId}#works` : ""}`} onClose={() => setAuthOpen(false)} />
      {track?.lyrics?.trim() ? <dialog ref={lyricsDialogRef} onClose={() => setLyricsOpen(false)} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setLyricsOpen(false);
      }} className="fixed inset-0 m-auto max-h-[75dvh] w-[min(92vw,36rem)] overflow-y-auto rounded-2xl border border-orange-300/25 bg-zinc-950 p-5 text-white backdrop:bg-black/70" aria-label={label("歌詞", "Lyrics", "歌詞", "가사")}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">{track?.title}</h2><button autoFocus onClick={() => setLyricsOpen(false)} aria-label={label("關閉歌詞", "Close lyrics", "歌詞を閉じる", "가사 닫기")}><X /></button></div>
        <p className="whitespace-pre-wrap text-sm leading-8">{track.lyrics.trim()}</p>
      </dialog> : null}
      {isYouTube && track && session ? <section aria-label={label("YouTube 電台播放器", "YouTube radio player", "YouTubeラジオ", "YouTube 라디오")}
        className="fixed bottom-3 right-3 z-[70] w-[min(356px,calc(100vw-24px))] overflow-hidden rounded-md border border-orange-400/40 bg-[#080808] text-white shadow-xl">
        <div className="flex min-h-10 items-center justify-between gap-2 px-2">
          <span className="min-w-0 truncate text-xs" title={track.title}>{track.title}</span>
          <button type="button" onClick={close} className="h-10 w-10 shrink-0" aria-label={label("關閉播放器", "Close player", "プレーヤーを閉じる", "플레이어 닫기")}><X className="mx-auto h-5 w-5" /></button>
        </div>
        <YouTubeRadioPlayer key={youtubeMount} videoId={track.youtubeId!} requestId={youtubeRequest.id} autoplay={youtubeRequest.autoplay} volume={volume} title={track.title} playerRef={youtubeRef}
          onPlaying={value => { setPlaying(value); if (value) setPlaybackError(""); }}
          onProgress={(time, length) => { setCurrentTime(time); setDuration(length); }}
          onEnded={() => move(1, false)}
          onError={blocked => { setPlaying(false); setPlaybackError(blocked
            ? label("點一下播放器繼續聽。", "Tap the player to continue.", "プレーヤーを押して再生。", "플레이어를 눌러 계속 들으세요.")
            : label("這支影片暫時無法播放，可按下一首。", "Video unavailable. Try the next track.", "再生できません。次の曲へ進めます。", "재생할 수 없습니다. 다음 곡을 선택하세요.")); }} />
        <div className="flex items-center justify-between gap-1 px-2">
          <a className="min-w-0 truncate text-xs text-zinc-300" href={`https://www.youtube.com/watch?v=${track.youtubeId}`} target="_blank" rel="noopener noreferrer">YouTube ↗</a>
          <div className="flex">
            <button type="button" className="h-11 w-11 disabled:opacity-30" onClick={() => move(-1)} disabled={!historyDepth} aria-label={label("上一首", "Previous track", "前の曲", "이전 곡")}><SkipBack className="mx-auto h-4 w-4" /></button>
            <button type="button" className="h-11 w-11" onClick={() => move(1)} aria-label={label("下一首", "Next track", "次の曲", "다음 곡")}><SkipForward className="mx-auto h-4 w-4" /></button>
            <button type="button" className="h-11 w-11 text-orange-400 disabled:opacity-30" disabled={heartBusy || !track.heartTrackId} onClick={() => void sendHeart()} aria-label={label("愛心與收藏", "Heart and save", "Heartと保存", "Heart 및 저장")}><Heart className="mx-auto h-5 w-5" fill={track.heartTrackId && hearted[track.heartTrackId] ? "currentColor" : "none"} /></button>
            <button type="button" className="h-11 w-11" onClick={() => { youtubeRef.current?.pauseVideo(); setCommentTrack(track); }} aria-label={label("歌曲評論", "Track comments", "曲のコメント", "곡 댓글")}><MessageCircleMore className="mx-auto h-5 w-5" /></button>
          </div>
        </div>
        {playbackError ? <p role="status" className="px-3 pb-2 text-xs text-orange-200">{playbackError}</p> : null}
      </section> : null}
      {track && session && !isYouTube ? (
        <div
          data-showtime-queue-player
          hidden={inlineVisible}
          className="fixed inset-x-0 bottom-0 z-[70] border-t border-yellow-100/25 bg-[#070707]/96 px-3 py-2.5 shadow-[0_-18px_55px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:px-5"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 lg:grid-cols-[auto_minmax(9rem,0.75fr)_minmax(16rem,1.5fr)_auto] sm:gap-4">
            <div role="group" aria-label={label("播放控制", "Playback controls", "再生コントロール", "재생 컨트롤")} className="col-start-1 row-start-2 flex items-center gap-1.5 lg:row-start-1">
              <button type="button" onClick={() => void resumeAudio()} aria-label={label("播放", "Play", "再生", "재생")}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-2.5 text-xs font-bold text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100 sm:px-3">
                <Play className="h-4 w-4" fill="currentColor" /><span>{label("播放", "Play", "再生", "재생")}</span>
              </button>
              <button type="button" onClick={pauseAudio} aria-label={label("暫停", "Pause", "一時停止", "일시정지")}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-orange-300/50 px-2.5 text-xs font-bold text-orange-100 transition hover:bg-orange-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100 sm:px-3">
                <Pause className="h-4 w-4" fill="currentColor" /><span>{label("暫停", "Pause", "一時停止", "일시정지")}</span>
              </button>
            </div>

            <div className="col-span-2 col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 lg:col-span-1 lg:col-start-2">
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

            <div className="col-span-2 col-start-2 row-start-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
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
              {track.heartTrackId ? <button type="button" onClick={() => setCommentTrack(track)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white" aria-label={label("歌曲評論", "Track comments", "曲のコメント", "곡 댓글")}><MessageCircleMore className="h-5 w-5" /></button> : null}
              {track.lyrics?.trim() ? <button type="button" onClick={() => setLyricsOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-white" aria-label={label("看歌詞", "View lyrics", "歌詞を見る", "가사 보기")}><FileText className="h-4 w-4" /></button> : null}
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
          if (currentIsYouTube()) return;
          setPlaying(true);
          const session = sessionRef.current;
          const current = session?.queue[session.index];
          const id = current ? listeningTrackId(current) : null;
          if (current && id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
            const source = session?.sourceKey?.startsWith("bar:") ? "bar_heartbreak" : "music_player";
            const pagePath = session?.sourceKey?.startsWith("bar:") ? "/listen-bar" : window.location.pathname;
            playbackSegmentRef.current = { id, title: current.title, artist: current.artist, source, pagePath, seconds: 0, lastTime: audioRef.current?.currentTime || 0 };
            listeningRef.current?.sample(audioRef.current?.currentTime ?? 0, performance.now());
            void logAnalyticsEvent({ eventType: "song_play", songId: id, source, pagePath, metadata: { title: current.title, artist: current.artist, ...listeningRef.current?.snapshot(audioRef.current?.duration ?? 0) } });
          }
        }}
        onPause={(event) => { if (currentIsYouTube()) return; setPlaying(false); if (!event.currentTarget.ended) finishSegment("song_pause"); }}
        onSeeking={() => listeningRef.current?.reset()}
        onSeeked={(event) => { listeningRef.current?.reset(); if (!event.currentTarget.paused) listeningRef.current?.sample(event.currentTarget.currentTime, performance.now()); }}
        onError={() => { if (currentIsYouTube()) return; setPlaying(false); setPlaybackError(label("音檔載入失敗，請重試或播放下一首。", "Audio failed to load. Retry or play the next track.", "音源を読み込めません。再試行するか次の曲を再生してください。", "오디오를 불러오지 못했습니다. 다시 시도하거나 다음 곡을 재생하세요.")); }}
        onTimeUpdate={(event) => {
          if (currentIsYouTube()) return;
          const time = event.currentTarget.currentTime;
          const segment = playbackSegmentRef.current;
          if (!event.currentTarget.paused && !event.currentTarget.seeking) {
            listeningRef.current?.sample(time, performance.now(), event.currentTarget.playbackRate);
            if (segment && listeningRef.current?.due()) {
              void logAnalyticsEvent({ eventType: "song_resume", songId: segment.id, source: segment.source, pagePath: segment.pagePath,
                metadata: listeningRef.current.snapshot(event.currentTarget.duration) });
            }
          }
          if (segment) {
            const delta = time - segment.lastTime;
            if (delta > 0 && delta < 2) segment.seconds += delta;
            segment.lastTime = time;
          }
          setCurrentTime(time);
        }}
        onLoadedMetadata={(event) => {
          if (currentIsYouTube()) return;
          applyVolume(event.currentTarget, volumeRef.current);
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
        }}
        onEnded={() => {
          if (currentIsYouTube()) return;
          finishSegment("song_finish");
          const current = sessionRef.current;
          if (current && (current.repeat || current.index < current.queue.length - 1)) {
            move(1, false);
          } else {
            setPlaying(false);
          }
        }}
      />
    </>
  );
}
