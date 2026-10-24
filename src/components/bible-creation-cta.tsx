import Link from "next/link";
import type { Lang } from "@/lib/locale";
import { bibleCreationCtaCopy } from "@/lib/bible-creation-cta-copy";
import styles from "./bible-home.module.css";
export default function BibleCreationCta({ lang }: { lang: Lang }) {
  const copy = bibleCreationCtaCopy(lang);
  return <section className={styles.conversionCard} aria-labelledby="bible-creation-cta">
    <div className={styles.conversionCopy}><p>AIPOGER · CREATE & SHARE</p><h2 id="bible-creation-cta">{copy.title}</h2><span>{copy.body}</span></div>
    <div className={styles.conversionActions}>
      <Link className={styles.conversionPrimary} href={`/profile?lang=${lang}&submit=1#submit-work`}>{copy.submit} ↗</Link>
      <Link className={styles.conversionSecondary} href={`/battle?lang=${lang}`}>{copy.battle} →</Link>
    </div>
  </section>;
}
