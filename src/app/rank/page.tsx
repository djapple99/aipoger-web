"use client";

import ParticipationGuide from "@/components/participation-guide";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import PublicChoiceGallery from "@/components/public-choice-gallery";
import { ShowtimeCommunityRail, ShowtimeReviewExcerpts, useShowtimeCommunity } from "@/components/showtime-community";
import { useI18n } from "@/lib/i18n";
import { showtimeCopy } from "@/lib/showtime-copy";
import styles from "@/components/showtime.module.css";

export default function RankPage() {
  const { lang } = useI18n();
  const copy = showtimeCopy(lang);
  const community = useShowtimeCommunity();

  return (
    <div className={styles.page}>
      <EditorialHeader active="showtime" returnPath="/rank" />
      <main className={styles.main}>
        <div className={styles.layout} data-showtime-editorial>
          <header className={styles.heading}>
            <div><h1>SHOWTIME</h1><p>{copy.subtitle}</p></div>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1"><ParticipationGuide surface="showtime" lang={lang} /><Link href={`/profile/choice?lang=${lang}`} className={styles.make}>{copy.make}<ArrowRight size={18} /></Link></div>
          </header>
          <div className={styles.content}>
            <div id="monthly-charts" className="scroll-mt-24" aria-hidden="true" />
            <PublicChoiceGallery lang={lang} commentCounts={community.data?.choiceCommentCounts} />
            <ShowtimeReviewExcerpts lang={lang} data={community.data} />
          </div>
          <ShowtimeCommunityRail lang={lang} {...community} />
        </div>
      </main>
    </div>
  );
}
