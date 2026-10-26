"use client";

import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/locale";
import { showtimeCopy } from "@/lib/showtime-copy";
import type { ShowtimeCommunity } from "@/lib/showtime-community";
import styles from "./showtime.module.css";

export function useShowtimeCommunity() {
  const [data, setData] = useState<ShowtimeCommunity | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/showtime/community", { cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]) });
        if (!response.ok) throw new Error("Community unavailable");
        const value: ShowtimeCommunity = await response.json();
        if (!Array.isArray(value.reviewers) || !Array.isArray(value.creators) || !Array.isArray(value.listeners) || !Array.isArray(value.reviews)) throw new Error("Invalid summary");
        if (active && !request.signal.aborted) { setData(value); setError(false); }
      } catch {
        if (active && !request.signal.aborted) { setData(null); setError(true); }
      }
    };
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [retry]);
  return { data, error, retry: () => setRetry(value => value + 1) };
}

export function ShowtimeCommunityRail({ lang, data, error, retry }: {
  lang: Lang; data: ShowtimeCommunity | null; error: boolean; retry: () => void;
}) {
  const copy = showtimeCopy(lang);
  const [selected, setSelected] = useState<"reviewers" | "creators" | "listeners">("reviewers");
  const lists = [
    { key: "reviewers" as const, title: copy.reviewers, tab: copy.reviewerTab, unit: copy.works },
    { key: "creators" as const, title: copy.creators, tab: copy.creatorTab, unit: copy.uploads },
    { key: "listeners" as const, title: copy.listeners, tab: copy.listenerTab, unit: copy.rounds },
  ];
  return <aside className={styles.rail} data-showtime-community aria-label={copy.community}>
    <p className={styles.message}>{copy.message.map(line => <span key={line}>{line}</span>)}</p>
    <div className={styles.communityTabs} role="group" aria-label={copy.community}>
      {lists.map(list => <button key={list.key} type="button" onClick={() => setSelected(list.key)} aria-pressed={selected === list.key} data-community-tab={list.key}>{list.tab}</button>)}
    </div>
    {error ? <div role="alert" className={styles.communityStatus}><p>{copy.error}</p><button type="button" onClick={retry}><RotateCw size={16} />{copy.retry}</button></div> : lists.map(list => <section key={list.key} className={`${styles.board} ${selected === list.key ? styles.selectedBoard : ""}`} data-community-board={list.key} aria-labelledby={`showtime-${list.key}`}>
      <header><h2 id={`showtime-${list.key}`} className={styles.boardTitle}><span>{list.title}</span></h2><span>{copy.recent}</span></header>
      {!data ? <p role="status" className={styles.communityStatus}>{copy.loading}</p> : data[list.key].length === 0 ? <p className={styles.communityStatus}>{copy.empty}</p> : <ol>
        {data[list.key].map((person, index) => <li key={`${index}:${person.name}`}>
          <span className={styles.position}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.person} title={person.name}>{person.name}</span>
          <span className={styles.activityCount}>{person.count} <span>{list.unit}</span></span>
        </li>)}
      </ol>}
    </section>)}
  </aside>;
}

export function ShowtimeReviewExcerpts({ lang, data }: { lang: Lang; data: ShowtimeCommunity | null }) {
  const copy = showtimeCopy(lang);
  if (!data) return null;
  return <section className={styles.reviews} aria-labelledby="showtime-reviews-heading">
    <h2 id="showtime-reviews-heading">{copy.reviewsTitle}</h2>
    {data.reviews.length === 0 ? <p className={styles.noReviews}>{copy.noReviews}</p> : <div className={styles.reviewGrid}>
      {data.reviews.map(review => <article key={review.id} className={styles.review}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review.coverUrl} alt="" />
        <div><blockquote>{review.body}</blockquote><p>{review.name} <span>· {review.title}</span></p>
          <Link href={review.isMv ? `/mv?lang=${lang}&track=${review.trackId}` : `/ai-music?lang=${lang}&track=${review.trackId}#works`}>{copy.hear}<ArrowRight size={15} /></Link>
        </div>
      </article>)}
    </div>}
  </section>;
}
