"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./bible-home.module.css";

export default function BibleChapter({ name, title, description, targets, children }: {
  name: string; title: string; description: string; targets: readonly string[]; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const targetKey = targets.join("|");
  useEffect(() => {
    const reveal = () => {
      const id = window.location.hash.slice(1);
      if (targetKey.split("|").some(target => target.endsWith("*") ? id.startsWith(target.slice(0, -1)) : id === target)) {
        setOpen(true);
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 60);
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [targetKey]);
  return <section className={styles.chapter}>
    <button className={styles.chapterToggle} type="button" aria-expanded={open} aria-controls={`chapter-${name}`} onClick={() => setOpen(value => !value)}>
      <span><strong>{title}</strong><span>{description}</span></span>
      {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    <div id={`chapter-${name}`} hidden={!open} className={styles.chapterContent}>{children}</div>
  </section>;
}
