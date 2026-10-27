"use client";
/* eslint-disable @next/next/no-img-element -- Creator covers use the existing public image URLs. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircleMore, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { getMusicPlayerState, musicPlayer, useMusicPlayer, type MusicTrack } from "@/lib/music-player-store";
import { shuffleMusicQueue } from "@/lib/music-queue";
import { useI18n } from "@/lib/i18n";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import styles from "@/app/ai-music/ai-music.module.css";

function time(value: number) { const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export default function ExploreRadio({ tracks, ready, hearted, heartBusy, onHeart, onComment }: {
  tracks: MusicTrack[]; ready: boolean; hearted: boolean; heartBusy: boolean;
  onHeart: (id: string) => void; onComment: (id: string) => void;
}) {
  const { lang, t } = useI18n();
  const text = useCallback((zh: string, en: string, ja: string, ko: string) => lang === "en" ? en : lang === "ja" ? ja : lang === "ko" ? ko : zh, [lang]);
  const player = useMusicPlayer();
  const [genre, setGenre] = useState("all");
  const radio = useRef<HTMLElement>(null);
  const entryHandled = useRef(false);
  const candidates = genre === "all" ? tracks : tracks.filter(track => track.genre === genre);
  const active = player.session?.queue[player.session.index];
  const track = active ?? candidates[0];
  const publicId = track?.heartTrackId;
  const canFeedback = Boolean(publicId && tracks.some(track => track.heartTrackId === publicId));
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("genre");
    if (requested === "all" || MUSIC_GENRE_OPTIONS.some(option => option.value === requested)) setGenre(requested!);
  }, []);
  useEffect(() => {
    const key = player.session?.sourceKey;
    if (key?.startsWith("bar:")) setGenre(key.slice(4));
  }, [player.session?.sourceKey]);
  useEffect(() => {
    const element = radio.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      window.dispatchEvent(new CustomEvent("aipoger:player-inline-visible", { detail: entries[0]?.isIntersecting && entries[0].intersectionRatio >= .25 }));
    }, { threshold: [0, .25] });
    observer.observe(element);
    return () => { observer.disconnect(); window.dispatchEvent(new CustomEvent("aipoger:player-inline-visible", { detail: false })); };
  }, []);
  const start = useCallback((choice: string, intentional = true) => {
    entryHandled.current = true;
    setGenre(choice);
    const queue = shuffleMusicQueue(choice === "all" ? tracks : tracks.filter(track => track.genre === choice));
    if (!queue.length) return;
    const label = choice === "all" ? text("全部曲風", "All genres", "すべてのジャンル", "모든 장르") : t(MUSIC_GENRE_OPTIONS.find(option => option.value === choice)?.labelKey ?? "");
    void musicPlayer?.start(queue, 0, `${text("傷心酒吧", "Bar Heartbreak", "Bar Heartbreak", "Bar Heartbreak")} · ${label}`, { sourceKey: `bar:${choice}`, repeat: true, intentional });
  }, [tracks, text, t]);
  useEffect(() => {
    const autoplay = () => {
      if (entryHandled.current || !ready || !tracks.length || !musicPlayer || document.hidden) return;
      // Preserve an existing session, including a listener's deliberate pause.
      entryHandled.current = true;
      if (getMusicPlayerState().session) return;
      const requested = new URLSearchParams(window.location.search).get("genre");
      const choice = MUSIC_GENRE_OPTIONS.some(option => option.value === requested) ? requested! : "all";
      start(choice, false);
    };
    autoplay();
    document.addEventListener("visibilitychange", autoplay);
    return () => document.removeEventListener("visibilitychange", autoplay);
  }, [ready, tracks, start]);
  const shortcuts = ["all", "Jazz / Bossa 微醺時刻", "R&B 深情瞬間", "Disco / Funk / City-Pop"];
  return <section id="explore-radio" ref={radio} className={styles.radioStation} aria-label={text("傷心酒吧電台", "Bar Heartbreak radio", "Bar Heartbreakラジオ", "Bar Heartbreak 라디오")}>
    <div className={styles.radioHeading}>
      <div className={styles.stationName}><h2>{text("傷心酒吧", "Bar Heartbreak", "Bar Heartbreak", "Bar Heartbreak")}</h2><span>{player.playing ? text("隨機播放中 · 隨時可暫停", "On shuffle · Pause anytime", "シャッフル再生中 · いつでも一時停止", "랜덤 재생 중 · 언제든 일시정지") : text("隨機連播", "Shuffle radio", "シャッフルラジオ", "랜덤 라디오")}</span></div>
      <div className={styles.radioGenres} role="group" aria-label={text("電台曲風", "Radio genre", "ラジオのジャンル", "라디오 장르")}>
        <span>{text("電台曲風", "Radio genre", "ジャンル", "라디오 장르")}</span>
        {shortcuts.map((choice, index) => <button key={choice} type="button" aria-pressed={genre === choice} disabled={!ready || !(choice === "all" ? tracks.length : tracks.some(track => track.genre === choice))} onClick={() => start(choice)}>{index === 0 ? text("全部", "All", "すべて", "전체") : index === 1 ? "Jazz / Bossa" : index === 2 ? "R&B" : "City-Pop"}</button>)}
      </div>
      <select value={genre} disabled={!ready} onChange={event => start(event.target.value)} aria-label={text("選擇電台曲風", "Choose radio genre", "ラジオジャンルを選ぶ", "라디오 장르 선택")}>
        <option value="all">{text("全部曲風", "All genres", "すべてのジャンル", "모든 장르")}</option>
        {MUSIC_GENRE_OPTIONS.map(option => <option key={option.value} value={option.value} disabled={!tracks.some(track => track.genre === option.value)}>{t(option.labelKey)}</option>)}
      </select>
    </div>
    <div className={styles.radioPlayer}>
      <div className={styles.nowPlaying}>
        {track ? <><img src={track.coverUrl} alt="" /><div><strong title={track.title}>{track.title}</strong><span>{track.artist}</span></div></> : <p>{ready ? text("選擇曲風開始聽歌", "Choose a genre to listen", "ジャンルを選んで再生", "장르를 골라 들어보세요") : text("正在準備電台…", "Preparing radio…", "ラジオを準備中…", "라디오 준비 중…")}</p>}
      </div>
      <div className={styles.transport}>
        <button type="button" disabled={!active || !player.historyDepth} onClick={() => musicPlayer?.move(-1)} aria-label={text("上一首", "Previous track", "前の曲", "이전 곡")}><SkipBack fill="currentColor" /></button>
        <button type="button" className={styles.radioPlay} disabled={!active && (!ready || !candidates.length)} onClick={() => active ? musicPlayer?.toggle() : start(genre)} aria-label={player.playing ? text("暫停電台", "Pause radio", "ラジオを一時停止", "라디오 일시정지") : text("播放電台", "Play radio", "ラジオを再生", "라디오 재생")}>
          {player.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </button>
        <button type="button" disabled={!active || (!player.session?.repeat && player.session!.index >= player.session!.queue.length - 1)} onClick={() => musicPlayer?.move(1)} aria-label={text("下一首", "Next track", "次の曲", "다음 곡")}><SkipForward fill="currentColor" /></button>
      </div>
      <div className={styles.radioSeek}><span>{time(player.currentTime)}</span><input type="range" min="0" max={Math.max(0, player.duration)} step=".1" value={Math.min(player.currentTime, Math.max(0, player.duration))} disabled={!active || !player.duration} onChange={event => musicPlayer?.seek?.(Number(event.target.value))} aria-label={text("電台播放進度", "Radio playback position", "ラジオ再生位置", "라디오 재생 위치")} /><span>{time(player.duration)}</span></div>
      <div className={styles.radioVolume}><Volume2 aria-hidden="true" /><input type="range" min="0" max="1" step=".05" value={player.volume ?? .85} onChange={event => musicPlayer?.setVolume?.(Number(event.target.value))} aria-label={text("電台音量", "Radio volume", "ラジオ音量", "라디오 볼륨")} /></div>
      <div className={styles.radioFeedback}>
        <button type="button" className={styles.heart} aria-pressed={canFeedback && hearted} disabled={!canFeedback || heartBusy} onClick={() => publicId && onHeart(publicId)} aria-label={text("電台愛心與收藏", "Radio Heart and save", "ラジオのHeartと保存", "라디오 Heart 및 저장")}><Heart fill={canFeedback && hearted ? "currentColor" : "none"} /></button>
        <button type="button" className={styles.comment} disabled={!canFeedback} onClick={() => publicId && onComment(publicId)} aria-label={text("電台歌曲評論", "Radio track comments", "ラジオの曲のコメント", "라디오 곡 댓글")}><MessageCircleMore /></button>
      </div>
    </div>
    {player.playbackError ? <p className={styles.playbackError} role="alert">{player.playbackError}</p> : null}
  </section>;
}
