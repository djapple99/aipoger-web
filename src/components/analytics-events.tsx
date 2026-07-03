"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { logAnalyticsEvent } from "@/lib/analytics-client";

const SESSION_START_MARK_KEY = "aipoger:analytics-session-start-event";
const SESSION_START_TTL_MS = 30 * 60 * 1000;

function shouldLogSessionStart() {
  const now = Date.now();
  const previous = Number(window.localStorage.getItem(SESSION_START_MARK_KEY) ?? 0);
  window.localStorage.setItem(SESSION_START_MARK_KEY, String(now));
  return !Number.isFinite(previous) || now - previous > SESSION_START_TTL_MS;
}

export default function AnalyticsEvents() {
  const pathname = usePathname();
  const lastPathRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pagePath = `${window.location.pathname}${window.location.search}`;
    if (lastPathRef.current === pagePath) return;
    lastPathRef.current = pagePath;

    if (shouldLogSessionStart()) {
      void logAnalyticsEvent({
        eventType: "session_start",
        pagePath,
        metadata: {
          language: navigator.language,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      });
    }

    void logAnalyticsEvent({
      eventType: "page_view",
      pagePath,
      metadata: {
        title: document.title,
        language: navigator.language,
      },
    });
  }, [pathname]);

  return null;
}
