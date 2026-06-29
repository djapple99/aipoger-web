"use client";

import { supabase } from "@/lib/supabase";

export type AnalyticsEventType =
  | "page_view"
  | "session_start"
  | "song_play"
  | "song_finish"
  | "song_skip"
  | "song_pause"
  | "song_resume"
  | "like"
  | "reaction"
  | "comment"
  | "register"
  | "login"
  | "upload_song"
  | "delete_song"
  | "battle_enter"
  | "battle_vote"
  | "open_heartbreak_bar"
  | "open_honor_board"
  | "open_creator_profile"
  | "share_song";

type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  songId?: string | null;
  battleId?: string | null;
  creatorId?: string | null;
  pagePath?: string | null;
  referrer?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

const SESSION_KEY = "aipoger:analytics-session-id";
const SESSION_STARTED_KEY = "aipoger:analytics-session-started-at";
const SESSION_TTL_MS = 30 * 60 * 1000;

function browserSessionId() {
  if (typeof window === "undefined") return "server";
  const now = Date.now();
  const existing = window.localStorage.getItem(SESSION_KEY);
  const startedAt = Number(window.localStorage.getItem(SESSION_STARTED_KEY) ?? 0);
  if (existing && Number.isFinite(startedAt) && now - startedAt < SESSION_TTL_MS) {
    window.localStorage.setItem(SESSION_STARTED_KEY, String(now));
    return existing;
  }
  const next = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, next);
  window.localStorage.setItem(SESSION_STARTED_KEY, String(now));
  return next;
}

function currentPagePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function analyticsSessionId() {
  return browserSessionId();
}

export async function logAnalyticsEvent(payload: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch("/api/analytics/events", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        eventType: payload.eventType,
        sessionId: browserSessionId(),
        songId: payload.songId ?? null,
        battleId: payload.battleId ?? null,
        creatorId: payload.creatorId ?? null,
        pagePath: payload.pagePath ?? currentPagePath(),
        referrer: payload.referrer ?? document.referrer ?? "",
        source: payload.source ?? "",
        metadata: payload.metadata ?? {},
      }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] event dropped", error);
    }
  }
}
