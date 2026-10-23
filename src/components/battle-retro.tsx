"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ParticipationGuide from "./participation-guide";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
import ShareButton from "./share-button";
import { battleModeShareCopy, battleModeSharePath, type BattleMode } from "@/lib/battle-mode-sharing";
import styles from "./battle-retro.module.css";

export function BattleModeShare({ mode }: { mode: BattleMode }) {
  const { lang } = useI18n(); const c = battleRetroCopy(lang);
  const selectedMode = useSearchParams().get("mode");
  const share = battleModeShareCopy(mode, lang);
  useEffect(() => {
    // Wait for Suspense and Next's navigation scroll restoration. The mode also
    // identifies canonical links without a hash; other explicit anchors win.
    const id = `battle-mode-${mode}`;
    if (selectedMode !== mode) return;
    const timer = window.setTimeout(() => {
      if (window.location.hash && window.location.hash !== `#${id}`) return;
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [mode, lang, selectedMode]);
  return <ShareButton title={share.title} text={share.text}
    url={`https://aipoger.com${battleModeSharePath(mode, lang)}`}
    label={`${c.share} · ${share.name}`} copiedLabel={c.shareCopied} sharedLabel={c.shared}
    manualCopyLabel={c.manualCopy} linkLabel={c.shareLink} iconOnly iconSize={20}
    className={styles.modeShare} wrapperClassName={styles.modeShareWrap} />;
}

export function BattleRetroIntro() {
  const { lang } = useI18n(); const c = battleRetroCopy(lang);
  return <>
    <div className={styles.titleRow}><div><h1>{c.title}</h1><p>{c.subtitle}</p></div>
      <nav aria-label={c.title}><ParticipationGuide surface="battle" lang={lang} /><Link href={"/battle/results?lang=" + lang}>{c.records}<ArrowRight size={17}/></Link><Link href={"/drop-guide?lang=" + lang}>{c.rules}</Link></nav></div>
    <section id="battle-mode-blind" className={styles.entry} aria-labelledby="blind-entry-title">
      <Image src="/images/battle-retro/blind-entry.webp" alt="" fill priority sizes="100vw" className={styles.backdrop}/>
      <div className={styles.entryCopy}><span className={styles.accent}/><div className={styles.modeHeading}><h2 id="blind-entry-title">{c.blind}</h2><BattleModeShare mode="blind" /></div><p>{c.blindDescription}</p>
        <span className={styles.reward}>{c.reward}</span><Link className={styles.primary} href={"/battle/listen?lang=" + lang}><Play size={24} fill="currentColor"/>{c.start}</Link>
        <p className={styles.note}>{c.rewardNote}</p></div>
      <span className={styles.entryVs} aria-hidden="true">VS</span><p className={styles.entryFooter}>{c.rankingNote}</p>
    </section>
    <section id="battle-mode-q-crash" className={styles.mode} aria-label="Q Crash">
      <Image src="/images/battle-retro/q-crash.webp" alt="" fill sizes="100vw" className={styles.backdrop}/>
      <div className={styles.modeCopy}><span className={styles.mintAccent}/><div className={styles.modeHeading}><h2>Q Crash</h2><BattleModeShare mode="q-crash" /></div><p>{c.qDescription}</p><p className={styles.note}>{c.qNote}</p></div>
      <span className={styles.modeVs} aria-hidden="true">VS</span>
      <div className={styles.modeActions}><Link className={styles.mintButton} href={"/battle/q-crash/new?lang=" + lang}><Swords size={19}/>{c.qCreate}</Link><a href="#q-crash-matchups">{c.qView}<ArrowRight size={17}/></a></div>
    </section>
  </>;
}
export function DropRetroIntro() {
  const { lang } = useI18n(); const c = battleRetroCopy(lang);
  return <section id="battle-mode-drop" className={styles.mode} aria-label="Drop Battle">
    <Image src="/images/battle-retro/drop-battle.webp" alt="" fill sizes="100vw" className={styles.backdrop}/>
    <div className={styles.modeCopy}><span className={styles.accent}/><div className={styles.modeHeading}><h2>Drop Battle</h2><BattleModeShare mode="drop" /></div><p>{c.dropDescription}</p><p className={styles.note}>{c.dropNote}</p></div>
    <div className={styles.modeActions}><Link className={styles.primary} href={"/battle/setup?lang=" + lang}><Swords size={19}/>{c.dropCreate}</Link><a href="#drop-battle-pool">{c.pool}<ArrowRight size={17}/></a></div>
  </section>;
}
