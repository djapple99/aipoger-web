"use client";
import { Heart, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import styles from "@/app/ai-music/ai-music.module.css";
export type MusicChartTrack = { id: string; sourceId: string; recordKey: string; title: string; creator: string; coverUrl: string; poolSupporterCount: number };
export default function MusicPoolChart<T extends MusicChartTrack>({ rows, limit = 10, ready, error, heartStates, heartBusy, onPlay, onLocate, onHeart, onMore }: {
  rows: { track: T; rank: number }[]; limit?: number; ready: boolean; error: boolean;
  heartStates: Record<string, boolean>; heartBusy: Record<string, boolean>;
  onPlay: (track: T) => void; onLocate: (track: T) => void; onHeart: (track: T) => void; onMore?: () => void;
}) {
  const { lang } = useI18n();
  const text = (zh: string, en: string, ja: string, ko: string) => lang === "en" ? en : lang === "ja" ? ja : lang === "ko" ? ko : zh;
  return <section className={styles.chart} aria-label={text(`人氣 Top ${limit}`, `Popular Top ${limit}`, `人気 Top ${limit}`, `인기 Top ${limit}`)}>
    <h2>{text(`人氣 Top ${limit}`, `Popular Top ${limit}`, `人気 Top ${limit}`, `인기 Top ${limit}`)}</h2>
    <p className={styles.chartNote}>{text("目前曲庫・近三個月上架作品", "Current catalog · released within 3 months", "公開カタログ・公開から3か月以内", "현재 카탈로그 · 공개 후 3개월 이내")}</p>
    <p className={styles.chartScore}>{text("依不同會員支持人數排序", "Ranked by distinct supporters", "異なる会員の支持人数順", "서로 다른 회원의 지지 수 순")}</p>
    {!ready ? <p className={styles.state} role={error ? "alert" : "status"}>{error ? text("榜單暫時無法讀取", "Chart is unavailable", "ランキングを読み込めません", "차트를 불러올 수 없습니다") : text("正在讀取榜單…", "Loading chart…", "ランキングを読み込み中…", "차트 불러오는 중…")}</p> : rows.length === 0 ? <p className={styles.state}>{text("作品正在累積支持，還沒有上榜歌曲。", "Tracks are building support. No chart entries yet.", "作品への支持を集計中。ランク入りはまだありません。", "작품의 지지를 모으고 있어요. 아직 순위에 오른 곡이 없습니다.")}</p> : <ol className={styles.chartRows}>
      {rows.slice(0, limit).map(({ track, rank }) => <li key={track.id} data-chart-work={track.sourceId}>
        <span className={`${styles.rank} ${rank <= 3 ? styles.leadingRank : ""}`}>{String(rank).padStart(2, "0")}</span>
        <button type="button" className={styles.chartPlay} onClick={() => onPlay(track)} aria-label={text(`播放 ${track.title}`, `Play ${track.title}`, `${track.title}を再生`, `${track.title} 재생`)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.coverUrl} alt="" /><Play fill="currentColor" aria-hidden="true" />
        </button>
        <div className={styles.chartIdentity}><button type="button" onClick={() => onLocate(track)} title={track.title} aria-label={text(`找到歌曲 ${track.title}`, `Locate ${track.title}`, `${track.title}を表示`, `${track.title} 찾기`)}>{track.title}</button><span title={track.creator}>{track.creator}</span></div>
        <button type="button" className={styles.heart} disabled={Boolean(heartBusy[track.recordKey])} aria-pressed={Boolean(heartStates[track.recordKey])} onClick={() => onHeart(track)} aria-label={text(`支持 ${track.title}`, `Support ${track.title}`, `${track.title}を支持`, `${track.title} 지지`)}><Heart fill={heartStates[track.recordKey] ? "currentColor" : "none"} aria-hidden="true" /></button>
        <span className={styles.supporters} title={text("不同會員支持人數", "Distinct supporters", "異なる会員の支持人数", "서로 다른 회원의 지지 수")}>{track.poolSupporterCount}</span>
      </li>)}
    </ol>}
    {onMore ? <button type="button" className={styles.fullChart} onClick={onMore}>{text("查看 Top 50 →", "View Top 50 →", "Top 50を見る →", "Top 50 보기 →")}</button> : null}
  </section>;
}
