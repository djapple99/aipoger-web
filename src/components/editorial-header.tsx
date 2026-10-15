"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { supabase } from "@/lib/supabase";
import LangToggle from "@/components/lang-toggle";
import styles from "./home-editorial.module.css";

export default function EditorialHeader({ active, returnPath }: { active: "home" | "mv" | "explore" | "creator" | "battle" | "showtime"; returnPath?: string }) {
  const { lang } = useI18n(); const copy = homeCopy(lang);
  const [signedIn, setSignedIn] = useState(false);
  const withLang = (path: string) => { const [url, hash] = path.split("#"); return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}${hash ? `#${hash}` : ""}`; };
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(Boolean(data.session)); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href={withLang("/")} className={styles.brand} aria-label="AIPOGER">
          <Image src={AIPOGER_BRAND_LOGO} alt="" width={52} height={52} priority />
          <span>AIPOGER</span>
        </Link>
        <nav className={styles.navigation} aria-label={copy.explore}>
          <Link href={withLang("/")} className={active === "home" ? styles.active : undefined} aria-current={active === "home" ? "page" : undefined}>{copy.featured}</Link>
          <Link href={withLang("/ai-music")} className={active === "explore" ? styles.active : undefined} aria-current={active === "explore" ? "page" : undefined}>{copy.explore}</Link>
          <Link href={withLang("/mv")} className={active === "mv" ? styles.active : undefined} aria-current={active === "mv" ? "page" : undefined}>{copy.mv}</Link>
          <Link href={withLang("/rank")} className={active === "showtime" ? styles.active : undefined} aria-current={active === "showtime" ? "page" : undefined}>Showtime</Link>
          <Link href={withLang("/battle")} className={active === "battle" ? styles.active : undefined} aria-current={active === "battle" ? "page" : undefined}>Battle</Link>
          <Link href={withLang("/ai-music-bible")}>{copy.bible}</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link href={withLang("/profile?submit=1#submit-work")} className={styles.submit}><span className={styles.submitLabel}>{copy.submit}</span><span className={styles.mobileSubmitLabel}>{lang === "zh" || lang === "ja" ? "投稿" : lang === "ko" ? "제출" : "Submit"}</span></Link>
          <LangToggle variant="inline" />
          {signedIn ? <span className={styles.accountSpace} /> : <Link href={active !== "home" ? `/auth?lang=${lang}&next=${encodeURIComponent((returnPath ?? `/${active === "mv" ? "mv" : active === "creator" ? "profile" : active === "battle" ? "battle" : "ai-music"}`) + `?lang=${lang}`)}` : withLang("/auth")} className={styles.signIn}>{copy.signIn}</Link>}
        </div>
      </div>
    </header>;
}
