"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { FileText, X } from "lucide-react";
import styles from "./lyrics-popover.module.css";

export default function LyricsPopover({ title, artist, lyrics, lang }: {
  title: string; artist: string; lyrics: string | null; lang: string;
}) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [fallback, setFallback] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const text = (zh: string, en: string, ja: string, ko: string) => lang === "en" ? en : lang === "ja" ? ja : lang === "ko" ? ko : zh;
  const label = text("顯示歌詞", "View lyrics", "歌詞を見る", "가사 보기");
  const close = () => {
    if (panel.current?.hidePopover && !fallback) panel.current.hidePopover();
    setOpen(false);
  };
  const prepare = () => {
    const button = trigger.current, element = panel.current;
    if (!button || !element) return;
    const rect = button.getBoundingClientRect(), width = Math.min(360, window.innerWidth - 32);
    const above = rect.top > window.innerHeight - rect.bottom;
    setPosition({ width, left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
      maxHeight: Math.min(360, Math.max(140, (above ? rect.top : window.innerHeight - rect.bottom) - 24)),
      ...(above ? { top: "auto", bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8, bottom: "auto" }) });
    if (!element.showPopover) { setFallback(true); setOpen(current => !current); }
  };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && (panel.current?.contains(target) || trigger.current?.contains(target))) return;
      if (!fallback && panel.current?.matches(":popover-open")) panel.current.hidePopover();
      setOpen(false);
    };
    const resize = () => { if (panel.current?.hidePopover && !fallback) panel.current.hidePopover(); setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") resize(); };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", resize);
    if (fallback) { document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape); }
    return () => {
      window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape);
    };
  }, [open, fallback]);
  return <>
    <button type="button" ref={trigger} popoverTarget={id} aria-expanded={open} aria-controls={id}
      aria-label={`${label} ${title}`} title={label} onClick={prepare}><FileText aria-hidden="true" /></button>
    <div id={id} ref={panel} popover={fallback ? undefined : "auto"} data-fallback-open={fallback && open}
      className={styles.panel} style={position} role="dialog" aria-label={`${text("歌詞", "Lyrics", "歌詞", "가사")} · ${title}`}
      onToggle={() => { if (!fallback) setOpen(panel.current?.matches(":popover-open") === true); }}>
      {open && <>
        <div className={styles.heading}><div><span>{text("歌詞", "Lyrics", "歌詞", "가사")}</span><h2>{title}</h2><p>{artist}</p></div>
          <button type="button" onClick={() => { close(); trigger.current?.focus({ preventScroll: true }); }}
            aria-label={text("關閉歌詞", "Close lyrics", "歌詞を閉じる", "가사 닫기")}><X aria-hidden="true" /></button>
        </div>
        <div className={styles.body} tabIndex={0}><p>{lyrics?.trim() || text("歌詞未提供", "Lyrics not provided", "歌詞は未提供です", "가사가 없습니다")}</p></div>
      </>}
    </div>
  </>;
}
