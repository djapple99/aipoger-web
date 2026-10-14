"use client";

import { useEffect, useId, useRef, useState } from "react";
import { participationGuideCopy, type GuideSurface } from "@/lib/participation-guide-copy";
import styles from "./participation-guide.module.css";

// Extracted from Explore's existing guide: same icon, black/orange panel and
// click-to-open behavior. Native modal supplies inert background + focus trap.
export default function ParticipationGuide({ surface, lang, className = "" }: {
  surface: GuideSurface; lang: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const copy = participationGuideCopy(surface, lang);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const trigger = button.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return <>
    <button ref={button} type="button" className={`${styles.trigger} ${className}`}
      aria-label={copy.trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId}
      onClick={() => setOpen(true)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/guide.png" alt="" /><span>{copy.trigger}</span>
    </button>
    <dialog ref={dialog} id={dialogId} className={styles.dialog} aria-labelledby={titleId}
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        const first = targets[0]; const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setOpen(false);
      }}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/guide.png" alt="" /><span>GUIDE</span>
        <button ref={close} type="button" aria-label={copy.close} onClick={() => setOpen(false)}>×</button>
      </header>
      <div className={styles.body}>
        <h2 id={titleId}>{copy.title}</h2>
        {copy.sections.map(section => <section key={section.title}>
          <h3>{section.title}</h3><p>{section.body}</p>
        </section>)}
        <section className={styles.credit}><h3>{copy.creditTitle}</h3><p>{copy.creditBody}</p></section>
        <p className={styles.note}>{copy.note}</p>
      </div>
    </dialog>
  </>;
}
