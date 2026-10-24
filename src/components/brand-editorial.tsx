"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, Plus } from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import { AIPOGER_BRAND_LOGO, AIPOGER_CONTACT_EMAIL, AIPOGER_SOCIAL_LINKS } from "@/lib/brand";
import { aboutPolicyCopy } from "@/lib/about-policy-copy";
import { brandEditorialCopy } from "@/lib/brand-editorial-copy";
import { useI18n } from "@/lib/i18n";
import styles from "./brand-editorial.module.css";

type PolicySection = { title: string; body: string; items?: string[]; links?: { title: string; href: string; note: string }[] };

function PolicyText({ section }: { section: PolicySection }) {
  return <div className={styles.policyText}>
    <h3>{section.title}</h3><p>{section.body}</p>
    {section.items ? <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul> : null}
    {section.links ? <div className={styles.policyLinks}>{section.links.map(link => <a key={link.href} href={link.href} target={link.href.startsWith("https:") ? "_blank" : undefined} rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}>{link.title}<ArrowRight size={16} aria-hidden="true" /><small>{link.note}</small></a>)}</div> : null}
  </div>;
}

export default function BrandEditorial({ kind }: { kind: "about" | "partners" }) {
  const { lang } = useI18n();
  const copy = brandEditorialCopy(lang);
  const withLang = (path: string) => `${path}${path.includes("?") ? "&" : "?"}lang=${lang}`;
  const mail = `mailto:${AIPOGER_CONTACT_EMAIL}`;
  const inquiry = (topic?: string) => `${mail}?subject=${encodeURIComponent(`${copy.emailTopic}${topic ? ` · ${topic}` : ""}`)}`;
  const about = kind === "about";
  const policies = aboutPolicyCopy[lang === "zh" ? "zh" : "en"];
  const policyGroups = [[policies[0]], [policies[1], policies[3]], [policies[2]]];

  return <div className={styles.page} data-brand-page={kind}>
    <EditorialHeader active={kind} returnPath={`/${kind}`} />
    <main className={styles.main}>
      <nav aria-label={lang === "zh" ? "頁面路徑" : "Breadcrumb"} className={styles.breadcrumb}>
        <Link href={withLang("/")}>{copy.home}</Link><span aria-hidden="true">/</span><span aria-current="page">{about ? copy.about : copy.partners}</span>
      </nav>
      {about ? <>
        <section className={styles.aboutHero} aria-labelledby="brand-title">
          <div className={styles.aboutImage}><Image src="/images/brand/about-turntable.webp" alt="" fill priority sizes="(max-width: 760px) 100vw, 67vw" /></div>
          <div className={styles.aboutCopy}>
            <p className={styles.eyebrow}>{lang !== "en" ? <>{copy.aboutLabel}<span aria-hidden="true"> / </span></> : null}<span lang="en">ABOUT AIPOGER</span></p>
            <h1 id="brand-title">{copy.aboutTitle.map(line => <span key={line}>{line}{" "}</span>)}</h1>
            <p className={styles.lead}>{copy.aboutLead}</p>
            <div className={styles.heroActions}><Link className={styles.primary} href={withLang("/ai-music")}>{copy.explore}<ArrowRight size={22} aria-hidden="true" /></Link><Link className={styles.textLink} href={withLang("/rank")}>{copy.community}</Link></div>
          </div>
        </section>
        <section className={styles.mission} aria-labelledby="brand-mission">
          <div className={styles.missionInner}>
            <h2 id="brand-mission">{copy.mission.map(line => <span key={line}>{line}{" "}</span>)}</h2>
            {copy.pillars.map(([title, body], index) => <article key={title} className={styles.pillar}><span className={styles.number}>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>
        <section className={styles.policies} aria-label={copy.about}>
          {policyGroups.map((sections, index) => <details key={copy.policies[index]} className={styles.policy}>
            <summary>{copy.policies[index]}<Plus size={26} aria-hidden="true" /></summary>
            <div className={styles.policyBody}>{sections.map(section => <PolicyText key={section.title} section={section} />)}
              {index === 2 ? <div className={styles.socials}>{AIPOGER_SOCIAL_LINKS.map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ArrowRight size={16} aria-hidden="true" /></a>)}</div> : null}
            </div>
          </details>)}
        </section>
      </> : <>
        <section className={styles.partnersHero} aria-labelledby="brand-title">
          <Image src="/images/brand/partners-listening.webp" alt={copy.imageAlt} fill priority sizes="100vw" className={styles.partnersImage} />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.partnersCopy}>
            <p className={styles.eyebrow}>{lang !== "en" ? <>{copy.partnersLabel}<span aria-hidden="true"> / </span></> : null}<span lang="en">PARTNERSHIPS</span></p>
            <h1 id="brand-title">{copy.partnersTitle.map(line => <span key={line}>{line}{" "}</span>)}</h1>
            <p className={styles.lead}>{copy.partnersLead}</p>
            <a className={styles.primary} href={inquiry()}>{copy.discuss}<ArrowRight size={22} aria-hidden="true" /></a>
            <p className={styles.contactSmall}><span>{copy.partnership}</span><a href={mail}>{AIPOGER_CONTACT_EMAIL}</a></p>
          </div>
        </section>
        <section className={styles.formats} aria-labelledby="brand-formats">
          <h2 id="brand-formats">{copy.formats}</h2>
          {copy.rows.map(([title, short, body], index) => <details className={styles.format} key={title}>
            <summary><span className={styles.formatNumber}>0{index + 1}</span><h3>{title}</h3><p>{short}</p><ArrowRight size={28} aria-hidden="true" /></summary>
            <div className={styles.formatBody}><p>{body}</p><a href={inquiry(title)}>{copy.discuss}<ArrowRight size={18} aria-hidden="true" /></a></div>
          </details>)}
        </section>
        <section className={styles.contactBanner} aria-labelledby="brand-contact">
          <Image src="/images/brand/contact-mixer.webp" alt="" fill sizes="100vw" />
          <div className={styles.bannerShade} aria-hidden="true" />
          <div className={styles.contactCopy}><h2 id="brand-contact">{copy.contactTitle}</h2><a href={inquiry()}>{AIPOGER_CONTACT_EMAIL}<ArrowRight size={24} aria-hidden="true" /></a><p>{copy.contactLead}</p></div>
        </section>
      </>}
    </main>
    <footer className={styles.footer}>
      <Link href={withLang("/")} className={styles.footerBrand} aria-label="AIPOGER"><Image src={AIPOGER_BRAND_LOGO} alt="" width={46} height={50} /><span>AIPOGER</span></Link>
      <a className={styles.footerMail} href={mail}><Mail size={18} aria-hidden="true" />{AIPOGER_CONTACT_EMAIL}</a>
      <nav aria-label={lang === "zh" ? "網站資訊" : "Site information"}><Link href={withLang("/about")} aria-current={about ? "page" : undefined}>{copy.about}</Link><Link href={withLang("/partners")} aria-current={!about ? "page" : undefined}>{copy.partners}</Link></nav>
    </footer>
  </div>;
}
