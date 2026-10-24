"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
/** Reserve space and mount secondary tools shortly before they enter the viewport. */
export default function DeferredSection({ children, label }: { children: ReactNode; label: string }) {
  const host = useRef<HTMLDivElement>(null); const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === "undefined") { setReady(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setReady(true); observer.disconnect(); } }, { rootMargin: "300px" });
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  return <div ref={host} style={{ minHeight: ready ? undefined : 240 }}>{ready ? children : <p role="status">{label}</p>}</div>;
}
