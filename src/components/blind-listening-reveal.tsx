/* eslint-disable @next/next/no-img-element -- Public work covers from the existing catalog. */
"use client";
import { useState } from "react";
import Link from "next/link";
import { Disc3, Heart, Pause, Play } from "lucide-react";
import type { BlindReveal, BlindRevealedWork } from "@/lib/blind-listening";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
import { useI18n } from "@/lib/i18n";
import { useMvHearts } from "@/lib/use-mv-hearts";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import styles from "./battle-retro.module.css";

export default function BlindListeningReveal({ result, failed, loading, onRetry, onListen }: {
  result: BlindReveal | null; failed: boolean; loading: boolean;
  onRetry: () => void; onListen: (work: BlindRevealedWork) => Promise<boolean>;
}) {
  const { lang } = useI18n(), c = battleRetroCopy(lang);
  const ids = result?.works.flatMap(work => work.unavailable ? [] : [work.id]) ?? [];
  const hearts = useMvHearts(ids), player = useMusicPlayer();
  const [playFailed, setPlayFailed] = useState(false), [loginRequired, setLoginRequired] = useState(false);
  return <section className={styles.reveal} aria-labelledby="blind-reveal-title">
    <div className={styles.revealHeading}><h2 id="blind-reveal-title" aria-live="polite">{result?.choice === "tie" ? c.revealedTie : c.revealedChoice}</h2>
      <span>{c.revealHint}</span></div>
    {failed ? <div className={styles.revealError} role="alert"><p>{c.revealFailed}</p><button disabled={loading} onClick={onRetry}>{loading ? c.loading : c.retry}</button></div> : null}
    {result ? <div className={styles.revealRows} data-count={result.works.length}>
      {result.works.map(work => work.unavailable ? <p className={styles.revealedWork} key={work.side}>{work.side} · {c.unavailable}</p> : <article className={styles.revealedWork} key={work.id}>
        <div className={styles.revealCover}>{work.coverUrl ? <img src={work.coverUrl} alt="" loading="lazy" decoding="async" width={72} height={72} onError={event => { event.currentTarget.hidden = true; }} /> : null}<Disc3 aria-hidden="true" size={30}/><span>{work.side}</span></div>
        <div className={styles.revealInfo}><Link href={work.href.replace("?", "?lang=" + lang + "&")}>{work.title}</Link><p>{work.artist}</p>
          <div className={styles.revealActions}>
            <button type="button" aria-pressed={Boolean(hearts.hearts[work.id])} title={hearts.hearts[work.id] ? c.removeHeart : c.heart} disabled={!hearts.ready || hearts.busyId !== null || hearts.error === "read"}
              onClick={async () => { setLoginRequired(await hearts.toggle(work.id) === "login"); }}><Heart size={17} fill={hearts.hearts[work.id] ? "currentColor" : "none"}/>{hearts.hearts[work.id] ? c.hearted : c.heart}</button>
            <button type="button" onClick={async () => {
              setPlayFailed(false);
              if (player.session?.queue[player.session.index]?.id === work.id && player.playing) { musicPlayer?.toggle(); return; }
              setPlayFailed(!await onListen(work));
            }}>{player.session?.queue[player.session.index]?.id === work.id && player.playing ? <Pause size={17}/> : <Play size={17}/>}<span>{player.session?.queue[player.session.index]?.id === work.id && player.playing ? c.pause : c.fullSong}</span></button>
          </div>
        </div>
      </article>)}
    </div> : null}
    {hearts.error ? <p className={styles.revealError} role="alert">{c.heartFailed}{hearts.error === "read" ? <button onClick={() => void hearts.reload()}>{c.retry}</button> : null}</p> : null}
    {playFailed ? <p className={styles.revealError} role="alert">{c.fullSongFailed}</p> : null}
    {loginRequired ? <Link className={styles.revealError} href={"/auth?lang=" + lang + "&next=" + encodeURIComponent("/battle/listen?lang=" + lang)}>{c.loginNote}</Link> : null}
  </section>;
}
