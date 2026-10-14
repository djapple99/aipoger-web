"use client";
import { Heart, Play } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import styles from "@/app/ai-music/ai-music.module.css";
export type MusicChartTrack = { id: string; sourceId: string; recordKey: string; title: string; creator: string; coverUrl: string; poolSupporterCount: number; blindSampleCount?: number; popularityScore?: number };
export default function MusicPoolChart<T extends MusicChartTrack>({ rows, limit = 50, ready, error, heartStates, heartBusy, onPlay, onLocate, onHeart }: {
  rows: { track: T; rank: number }[]; limit?: number; ready: boolean; error: boolean;
  heartStates: Record<string, boolean>; heartBusy: Record<string, boolean>;
  onPlay: (track: T) => void; onLocate: (track: T) => void; onHeart: (track: T) => void;
}) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const text = (zh: string, en: string, ja: string, ko: string) => lang === "en" ? en : lang === "ja" ? ja : lang === "ko" ? ko : zh;
  return <section className={styles.chart} aria-label={text(`人氣 Top ${limit}`, `Popular Top ${limit}`, `人気 Top ${limit}`, `인기 Top ${limit}`)}>
    <h2>{text(`人氣 Top ${limit}`, `Popular Top ${limit}`, `人気 Top ${limit}`, `인기 Top ${limit}`)}</h2>
    <p className={styles.chartNote}>{text("目前公開曲庫", "Current public catalog", "現在の公開カタログ", "현재 공개 카탈로그")}</p>
    <p className={styles.chartScore}>{text("愛心 50%＋盲聽 50% · 樣本校正", "50% hearts + 50% blind preference · sample adjusted", "支持50%＋試聴50%・サンプル補正", "하트 50%＋블라인드 50% · 표본 보정")}</p>
    {!ready ? <p className={styles.state} role={error ? "alert" : "status"}>{error ? text("榜單暫時無法讀取", "Chart is unavailable", "ランキングを読み込めません", "차트를 불러올 수 없습니다") : text("正在讀取榜單…", "Loading chart…", "ランキングを読み込み中…", "차트 불러오는 중…")}</p> : rows.length === 0 ? <p className={styles.state}>{text("作品正在累積支持，還沒有上榜歌曲。", "Tracks are building support. No chart entries yet.", "作品への支持を集計中。ランク入りはまだありません。", "작품의 지지를 모으고 있어요. 아직 순위에 오른 곡이 없습니다.")}</p> : <ol id={listId} className={styles.chartRows} data-expanded={expanded}>
      {rows.slice(0, limit).map(({ track, rank }) => <li key={track.id} data-chart-work={track.sourceId}>
        <span className={`${styles.rank} ${rank <= 3 ? styles.leadingRank : ""}`}>{String(rank).padStart(2, "0")}</span>
        <button type="button" className={styles.chartPlay} onClick={() => onPlay(track)} aria-label={text(`播放 ${track.title}`, `Play ${track.title}`, `${track.title}を再生`, `${track.title} 재생`)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.coverUrl} alt="" /><Play fill="currentColor" aria-hidden="true" />
        </button>
        <div className={styles.chartIdentity}><button type="button" onClick={() => onLocate(track)} title={track.title} aria-label={text(`找到歌曲 ${track.title}`, `Locate ${track.title}`, `${track.title}を表示`, `${track.title} 찾기`)}>{track.title}</button><span title={track.creator}>{track.creator}</span></div>
        <button type="button" className={styles.heart} disabled={Boolean(heartBusy[track.recordKey])} aria-pressed={Boolean(heartStates[track.recordKey])} onClick={() => onHeart(track)} aria-label={text(`支持 ${track.title}`, `Support ${track.title}`, `${track.title}を支持`, `${track.title} 지지`)}><Heart fill={heartStates[track.recordKey] ? "currentColor" : "none"} aria-hidden="true" /></button>
        <span className={styles.supporters} title={text("愛心支持 " + track.poolSupporterCount + " 人 · 盲聽 " + (track.blindSampleCount ?? 0) + " 人", track.poolSupporterCount + " supporters · " + (track.blindSampleCount ?? 0) + " blind listeners", "支持 " + track.poolSupporterCount + "人・試聴 " + (track.blindSampleCount ?? 0) + "人", "하트 " + track.poolSupporterCount + "명 · 블라인드 " + (track.blindSampleCount ?? 0) + "명")}>{typeof track.popularityScore === "number" ? track.popularityScore.toFixed(1) + text("分", " pts", "pt", "점") : track.poolSupporterCount}</span>
      </li>)}
    </ol>}
    {ready && rows.length > 3 ? <button type="button" className={styles.fullChart} aria-controls={listId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? text("收起排行榜 ↑", "Collapse chart ↑", "ランキングを閉じる ↑", "차트 접기 ↑") : text("展開 Top 50 ↓", "Expand Top 50 ↓", "Top 50を展開 ↓", "Top 50 펼치기 ↓")}
    </button> : null}
  </section>;
}
