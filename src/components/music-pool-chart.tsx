"use client";
import { Heart, Play } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import styles from "@/app/ai-music/ai-music.module.css";
export type MusicChartTrack = { id: string; sourceId: string; recordKey: string; title: string; creator: string; coverUrl: string; poolSupporterCount: number; blindSampleCount?: number; ratingCount?: number; ratingAverage?: number | null; favoriteCount?: number | null; popularityScore?: number };
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
    <p className={styles.chartNote}>{text("依人氣排序 · 評分與收藏分開顯示", "Ranked by popularity · ratings and saves shown separately", "人気順・評価と保存数を別々に表示", "인기순 · 평점과 저장 수는 별도 표시")}</p>
    {!ready ? <p className={styles.state} role={error ? "alert" : "status"}>{error ? text("榜單暫時無法讀取", "Chart is unavailable", "ランキングを読み込めません", "차트를 불러올 수 없습니다") : text("正在讀取榜單…", "Loading chart…", "ランキングを読み込み中…", "차트 불러오는 중…")}</p> : rows.length === 0 ? <p className={styles.state}>{text("作品正在累積支持，還沒有上榜歌曲。", "Tracks are building support. No chart entries yet.", "作品への支持を集計中。ランク入りはまだありません。", "작품의 지지를 모으고 있어요. 아직 순위에 오른 곡이 없습니다.")}</p> : <ol id={listId} className={styles.chartRows} data-expanded={expanded}>
      {rows.slice(0, limit).map(({ track, rank }) => <li key={track.id} data-chart-work={track.sourceId}>
        <span className={`${styles.rank} ${rank <= 3 ? styles.leadingRank : ""}`}>{String(rank).padStart(2, "0")}</span>
        <button type="button" className={styles.chartPlay} onClick={() => onPlay(track)} aria-label={text(`播放 ${track.title}`, `Play ${track.title}`, `${track.title}を再生`, `${track.title} 재생`)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.coverUrl} alt="" /><Play fill="currentColor" aria-hidden="true" />
        </button>
        <div className={styles.chartIdentity}>
          <button type="button" onClick={() => onLocate(track)} title={track.title} aria-label={text(`找到歌曲 ${track.title}`, `Locate ${track.title}`, `${track.title}を表示`, `${track.title} 찾기`)}>{track.title}</button>
          <span title={track.creator}>{track.creator}</span>
          <div className={styles.workStats}>
            <span className={styles.trackRating}>{track.ratingCount && track.ratingAverage != null
              ? `${track.ratingAverage.toFixed(1)} / 10 · ` + text(`${track.ratingCount} 人評分`, `${track.ratingCount} ${track.ratingCount === 1 ? "rating" : "ratings"}`, `${track.ratingCount}人が評価`, `${track.ratingCount}명 평가`)
              : text("尚未評分", "Not rated yet", "評価はまだありません", "아직 평가 없음")}</span>
            <span>{track.favoriteCount == null ? text("收藏暫不可用", "Saves unavailable", "保存数を取得できません", "저장 수 확인 불가")
              : text(`${track.favoriteCount} 人收藏`, `${track.favoriteCount} ${track.favoriteCount === 1 ? "save" : "saves"}`, `${track.favoriteCount}人が保存`, `${track.favoriteCount}명 저장`)}</span>
          </div>
        </div>
        <button type="button" className={styles.heart} disabled={Boolean(heartBusy[track.recordKey])} aria-pressed={Boolean(heartStates[track.recordKey])} onClick={() => onHeart(track)} aria-label={text(`支持 ${track.title}`, `Support ${track.title}`, `${track.title}を支持`, `${track.title} 지지`)}><Heart fill={heartStates[track.recordKey] ? "currentColor" : "none"} aria-hidden="true" /></button>
      </li>)}
    </ol>}
    {ready && rows.length > 3 ? <button type="button" className={styles.fullChart} aria-controls={listId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? text("收起排行榜 ↑", "Collapse chart ↑", "ランキングを閉じる ↑", "차트 접기 ↑") : text("展開 Top 50 ↓", "Expand Top 50 ↓", "Top 50を展開 ↓", "Top 50 펼치기 ↓")}
    </button> : null}
  </section>;
}
