import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";

type AdminClient = SupabaseClient;

type AnalyticsEventRow = {
  id?: string;
  event_type?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  song_id?: string | null;
  battle_id?: string | null;
  creator_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  source?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TrackRow = {
  id?: string;
  title?: string | null;
  artist?: string | null;
  genre?: string | null;
  duration_seconds?: number | null;
  created_by?: string | null;
  source?: string | null;
  bar_phase?: string | null;
  positive_reaction_count?: number | null;
  heart_count?: number | null;
  star_count?: number | null;
  thumb_count?: number | null;
  happy_count?: number | null;
  created_at?: string | null;
  promoted_at?: string | null;
};

type CommentRow = {
  id?: string;
  track_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
};

type ReactionRow = {
  track_id?: string | null;
  user_id?: string | null;
  reaction?: string | null;
  created_at?: string | null;
};

type BattleRow = {
  id?: string;
  status?: string | null;
  genre?: string | null;
  winner?: string | null;
  fighter_a_user_id?: string | null;
  fighter_b_user_id?: string | null;
  created_at?: string | null;
  battle_started_at?: string | null;
  battle_ended_at?: string | null;
};

type VoteRow = {
  battle_id?: string | null;
  user_id?: string | null;
  guest_id?: string | null;
  voted_for?: string | null;
  voter_role?: string | null;
  created_at?: string | null;
};

type QueueRow = {
  id?: string;
  user_id?: string | null;
  genre?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id?: string;
  created_at?: string | null;
};

type ArchiveRow = {
  battle_id?: string | null;
  winner_user_id?: string | null;
  winner_name?: string | null;
  winner_song_name?: string | null;
  final_vote_left?: number | null;
  final_vote_right?: number | null;
  archived_at?: string | null;
};

type Kpi = {
  key: string;
  label: string;
  unit: "number" | "minutes" | "percent" | "score";
  today: number;
  yesterday: number;
  change: number | null;
  last7Days: number;
  last30Days: number;
};

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAYBACK_END_EVENTS = new Set(["song_finish", "song_pause", "song_skip"]);
const LISTENING_EVENTS = new Set(["song_play", "song_finish", "song_pause", "song_resume", "open_heartbreak_bar"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin };
}

function taipeiDateParts(date: Date) {
  const taipei = new Date(date.getTime() + TAIPEI_OFFSET_MS);
  return {
    year: taipei.getUTCFullYear(),
    month: taipei.getUTCMonth() + 1,
    day: taipei.getUTCDate(),
  };
}

function taipeiStartMs(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day) - TAIPEI_OFFSET_MS;
}

function parseTaipeiDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return taipeiStartMs(Number(match[1]), Number(match[2]), Number(match[3]));
}

function rangeFor(request: NextRequest) {
  const now = new Date();
  const today = taipeiDateParts(now);
  const todayStart = taipeiStartMs(today.year, today.month, today.day);
  const preset = request.nextUrl.searchParams.get("range") ?? "today";
  const customFrom = parseTaipeiDate(request.nextUrl.searchParams.get("from"));
  const customTo = parseTaipeiDate(request.nextUrl.searchParams.get("to"));

  if (preset === "custom" && customFrom !== null && customTo !== null) {
    return {
      preset,
      start: new Date(customFrom),
      end: new Date(customTo + DAY_MS),
      label: `${request.nextUrl.searchParams.get("from")} - ${request.nextUrl.searchParams.get("to")}`,
    };
  }
  if (preset === "yesterday") {
    return { preset, start: new Date(todayStart - DAY_MS), end: new Date(todayStart), label: "Yesterday" };
  }
  if (preset === "last7") {
    return { preset, start: new Date(todayStart - 6 * DAY_MS), end: new Date(todayStart + DAY_MS), label: "Last 7 Days" };
  }
  if (preset === "last30") {
    return { preset, start: new Date(todayStart - 29 * DAY_MS), end: new Date(todayStart + DAY_MS), label: "Last 30 Days" };
  }
  if (preset === "month") {
    return { preset, start: new Date(taipeiStartMs(today.year, today.month, 1)), end: new Date(todayStart + DAY_MS), label: "This Month" };
  }
  return { preset: "today", start: new Date(todayStart), end: new Date(todayStart + DAY_MS), label: "Today" };
}

function fixedPeriods() {
  const now = new Date();
  const today = taipeiDateParts(now);
  const todayStart = taipeiStartMs(today.year, today.month, today.day);
  return {
    today: { start: new Date(todayStart), end: new Date(todayStart + DAY_MS) },
    yesterday: { start: new Date(todayStart - DAY_MS), end: new Date(todayStart) },
    last7Days: { start: new Date(todayStart - 6 * DAY_MS), end: new Date(todayStart + DAY_MS) },
    last30Days: { start: new Date(todayStart - 29 * DAY_MS), end: new Date(todayStart + DAY_MS) },
  };
}

function timeValue(value: string | null | undefined) {
  const ms = new Date(value ?? 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function inRange(value: string | null | undefined, start: Date, end: Date) {
  const ms = timeValue(value);
  return ms >= start.getTime() && ms < end.getTime();
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function change(today: number, yesterday: number) {
  if (yesterday === 0) return today === 0 ? 0 : null;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

function numberMeta(event: AnalyticsEventRow, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function listenerId(event: AnalyticsEventRow) {
  return event.user_id ?? event.session_id ?? null;
}

function eventsIn(events: AnalyticsEventRow[], start: Date, end: Date) {
  return events.filter((event) => inRange(event.created_at, start, end));
}

function playsMinutes(events: AnalyticsEventRow[]) {
  const seconds = events
    .filter((event) => PLAYBACK_END_EVENTS.has(event.event_type ?? ""))
    .reduce((sum, event) => sum + Math.max(0, numberMeta(event, "playedSeconds")), 0);
  return Math.round((seconds / 60) * 10) / 10;
}

function songsPlayed(events: AnalyticsEventRow[]) {
  return uniqueCount(events.filter((event) => event.event_type === "song_play").map((event) => event.song_id));
}

function sourceLabel(value: string | null | undefined) {
  const source = value?.toLowerCase().trim();
  if (!source || source === "direct") return "Direct";
  if (source === "google") return "Google";
  if (source === "youtube") return "YouTube";
  if (source === "facebook") return "Facebook";
  if (source === "instagram") return "Instagram";
  if (source === "tiktok") return "TikTok";
  if (source === "discord") return "Discord";
  if (source === "reddit") return "Reddit";
  if (source === "x" || source === "twitter") return "X / Twitter";
  return source === "internal" ? "Internal" : "Other";
}

async function readRows<T>(admin: AdminClient, table: string, select: string, warnings: string[], orderColumn = "created_at") {
  const { data, error } = await admin
    .from(table)
    .select(select)
    .order(orderColumn, { ascending: false })
    .limit(10000);
  if (error) {
    warnings.push(`${table}: ${error.message}`);
    return [] as T[];
  }
  return (data ?? []) as T[];
}

function groupCounts<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = key(item);
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function metadataText(event: AnalyticsEventRow, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function intersectSets(left: Set<string>, right: Set<string>) {
  return new Set([...left].filter((value) => right.has(value)));
}

function qCrashFunnel(events: AnalyticsEventRow[]) {
  type Bucket = {
    battleId: string;
    workA: string;
    workB: string;
    opened: Set<string>;
    playedA: Set<string>;
    playedB: Set<string>;
    listenedA: Set<string>;
    listenedB: Set<string>;
    bothListened: Set<string>;
    selected: Set<string>;
    authRequired: Set<string>;
    submitted: Set<string>;
    lineInApp: Set<string>;
    externalBrowserCta: Set<string>;
    externalBrowserFailed: Set<string>;
  };

  const buckets = new Map<string, Bucket>();
  events.forEach((event) => {
    if (event.metadata?.mode !== "q_crash" || !event.battle_id || !event.session_id) return;
    const stage = metadataText(event, "qCrashStage");
    const side = metadataText(event, "side");
    const bucket = buckets.get(event.battle_id) ?? {
      battleId: event.battle_id,
      workA: metadataText(event, "workA") || "作品 A",
      workB: metadataText(event, "workB") || "作品 B",
      opened: new Set<string>(),
      playedA: new Set<string>(),
      playedB: new Set<string>(),
      listenedA: new Set<string>(),
      listenedB: new Set<string>(),
      bothListened: new Set<string>(),
      selected: new Set<string>(),
      authRequired: new Set<string>(),
      submitted: new Set<string>(),
      lineInApp: new Set<string>(),
      externalBrowserCta: new Set<string>(),
      externalBrowserFailed: new Set<string>(),
    };
    if (metadataText(event, "workA")) bucket.workA = metadataText(event, "workA");
    if (metadataText(event, "workB")) bucket.workB = metadataText(event, "workB");
    // Any deeper event proves the session opened this Q Crash, even if the
    // first keepalive request was dropped by the browser.
    bucket.opened.add(event.session_id);
    if (stage === "play") (side === "B" ? bucket.playedB : bucket.playedA).add(event.session_id);
    if (stage === "listen_qualified") (side === "B" ? bucket.listenedB : bucket.listenedA).add(event.session_id);
    if (stage === "both_listened") bucket.bothListened.add(event.session_id);
    if (stage === "selected") bucket.selected.add(event.session_id);
    if (stage === "auth_required") bucket.authRequired.add(event.session_id);
    if (stage === "submitted") bucket.submitted.add(event.session_id);
    if (metadataText(event, "browserContext") === "line") bucket.lineInApp.add(event.session_id);
    if (stage === "external_browser_cta") bucket.externalBrowserCta.add(event.session_id);
    if (stage === "external_browser_failed") bucket.externalBrowserFailed.add(event.session_id);
    buckets.set(event.battle_id, bucket);
  });

  const cards = [...buckets.values()].map((bucket) => {
    const playedBoth = intersectSets(bucket.playedA, bucket.playedB);
    const qualifiedBySides = intersectSets(bucket.listenedA, bucket.listenedB);
    const listenedBoth = new Set([...bucket.bothListened, ...qualifiedBySides]);
    const listenedNoVote = new Set([...listenedBoth].filter((session) => !bucket.submitted.has(session)));
    const openedNoVote = new Set([...bucket.opened].filter((session) => !bucket.submitted.has(session)));
    return {
      battleId: bucket.battleId,
      title: `${bucket.workA} VS ${bucket.workB}`,
      opened: bucket.opened.size,
      playedBoth: playedBoth.size,
      listenedBoth: listenedBoth.size,
      selected: bucket.selected.size,
      authRequired: bucket.authRequired.size,
      submitted: bucket.submitted.size,
      lineInApp: bucket.lineInApp.size,
      externalBrowserCta: bucket.externalBrowserCta.size,
      externalBrowserFailed: bucket.externalBrowserFailed.size,
      listenedNoVote: listenedNoVote.size,
      openedNoVote: openedNoVote.size,
      conversionRate: pct(bucket.submitted.size, bucket.opened.size),
    };
  }).sort((left, right) => right.opened - left.opened);

  return {
    opened: cards.reduce((sum, card) => sum + card.opened, 0),
    playedBoth: cards.reduce((sum, card) => sum + card.playedBoth, 0),
    listenedBoth: cards.reduce((sum, card) => sum + card.listenedBoth, 0),
    selected: cards.reduce((sum, card) => sum + card.selected, 0),
    authRequired: cards.reduce((sum, card) => sum + card.authRequired, 0),
    submitted: cards.reduce((sum, card) => sum + card.submitted, 0),
    lineInApp: cards.reduce((sum, card) => sum + card.lineInApp, 0),
    externalBrowserCta: cards.reduce((sum, card) => sum + card.externalBrowserCta, 0),
    externalBrowserFailed: cards.reduce((sum, card) => sum + card.externalBrowserFailed, 0),
    listenedNoVote: cards.reduce((sum, card) => sum + card.listenedNoVote, 0),
    cards,
  };
}

function metricSnapshot(
  period: { start: Date; end: Date },
  events: AnalyticsEventRow[],
  tracks: TrackRow[],
  reactions: ReactionRow[],
  comments: CommentRow[],
  archives: ArchiveRow[],
  queues: QueueRow[],
) {
  const periodEvents = eventsIn(events, period.start, period.end);
  const priorListeners = new Set(
    events
      .filter((event) => timeValue(event.created_at) < period.start.getTime())
      .filter((event) => LISTENING_EVENTS.has(event.event_type ?? ""))
      .map(listenerId)
      .filter((value): value is string => Boolean(value)),
  );
  const listeners = periodEvents
    .filter((event) => LISTENING_EVENTS.has(event.event_type ?? ""))
    .map(listenerId)
    .filter((value): value is string => Boolean(value));
  const distinctListeners = new Set(listeners);
  const returningListeners = [...distinctListeners].filter((id) => priorListeners.has(id)).length;
  const playCount = periodEvents.filter((event) => event.event_type === "song_play").length;
  const reactionCount =
    periodEvents.filter((event) => event.event_type === "reaction" || event.event_type === "like").length +
    reactions.filter((reaction) => inRange(reaction.created_at, period.start, period.end)).length;
  const uploadCount =
    tracks.filter((track) => inRange(track.created_at, period.start, period.end)).length +
    queues.filter((queue) => inRange(queue.created_at, period.start, period.end)).length;
  const honorCount = archives.filter((archive) => inRange(archive.archived_at, period.start, period.end)).length;
  const commentCount =
    periodEvents.filter((event) => event.event_type === "comment").length +
    comments.filter((comment) => inRange(comment.created_at, period.start, period.end)).length;
  const minutes = playsMinutes(periodEvents);
  const activeListeners = distinctListeners.size;
  const healthScore = Math.min(
    100,
    Math.round(
      Math.min(35, minutes * 1.8) +
      Math.min(22, activeListeners * 7) +
      Math.min(15, songsPlayed(periodEvents) * 4) +
      Math.min(12, reactionCount * 3) +
      Math.min(10, uploadCount * 5) +
      Math.min(6, honorCount * 6),
    ),
  );

  return {
    minutes,
    activeListeners,
    songsPlayed: songsPlayed(periodEvents),
    reactionRate: pct(reactionCount, Math.max(1, playCount)),
    returningRate: pct(returningListeners, distinctListeners.size),
    uploads: uploadCount,
    honors: honorCount,
    healthScore,
    playCount,
    reactionCount,
    commentCount,
  };
}

function kpi(
  key: string,
  label: string,
  unit: Kpi["unit"],
  value: (snapshot: ReturnType<typeof metricSnapshot>) => number,
  snapshots: Record<"today" | "yesterday" | "last7Days" | "last30Days", ReturnType<typeof metricSnapshot>>,
): Kpi {
  const today = value(snapshots.today);
  const yesterday = value(snapshots.yesterday);
  return {
    key,
    label,
    unit,
    today,
    yesterday,
    change: change(today, yesterday),
    last7Days: value(snapshots.last7Days),
    last30Days: value(snapshots.last30Days),
  };
}

function dailySeries(events: AnalyticsEventRow[], tracks: TrackRow[], queues: QueueRow[], battles: BattleRow[], start: Date, end: Date) {
  const days: Array<{ date: string; visitors: number; minutes: number; uploads: number; battles: number; likes: number }> = [];
  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += DAY_MS) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor + DAY_MS);
    const dayEvents = eventsIn(events, dayStart, dayEnd);
    const date = new Date(cursor + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
    days.push({
      date,
      visitors: uniqueCount(dayEvents.map(listenerId)),
      minutes: playsMinutes(dayEvents),
      uploads: tracks.filter((track) => inRange(track.created_at, dayStart, dayEnd)).length + queues.filter((queue) => inRange(queue.created_at, dayStart, dayEnd)).length,
      battles: battles.filter((battle) => inRange(battle.created_at, dayStart, dayEnd)).length,
      likes: dayEvents.filter((event) => event.event_type === "like" || event.event_type === "reaction").length,
    });
  }
  return days;
}

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAdmin(request);
  if ("error" in auth) return auth.error;

  const admin = auth.admin;
  const selectedRange = rangeFor(request);
  const periods = fixedPeriods();
  const warnings: string[] = [];

  const [
    events,
    tracks,
    comments,
    reactions,
    battles,
    votes,
    guestVotes,
    queues,
    profiles,
    archives,
  ] = await Promise.all([
    readRows<AnalyticsEventRow>(admin, "analytics_events", "id,event_type,user_id,session_id,song_id,battle_id,creator_id,page_path,referrer,source,created_at,metadata", warnings),
    readRows<TrackRow>(admin, "listen_bar_tracks", "id,title,artist,genre,duration_seconds,created_by,source,bar_phase,positive_reaction_count,heart_count,star_count,thumb_count,happy_count,created_at,promoted_at", warnings),
    readRows<CommentRow>(admin, "listen_bar_track_comments", "id,track_id,user_id,created_at", warnings),
    readRows<ReactionRow>(admin, "listen_bar_track_reactions", "track_id,user_id,reaction,created_at", warnings),
    readRows<BattleRow>(admin, "battles", "id,status,genre,winner,fighter_a_user_id,fighter_b_user_id,created_at,battle_started_at,battle_ended_at", warnings),
    readRows<VoteRow>(admin, "battle_votes", "battle_id,user_id,voted_for,voter_role,created_at", warnings),
    readRows<VoteRow>(admin, "battle_guest_votes", "battle_id,guest_id,voted_for,created_at", warnings),
    readRows<QueueRow>(admin, "battle_queue", "id,user_id,genre,status,created_at", warnings),
    readRows<ProfileRow>(admin, "user_profiles", "id,created_at", warnings),
    readRows<ArchiveRow>(admin, "battle_result_archives", "battle_id,winner_user_id,winner_name,winner_song_name,final_vote_left,final_vote_right,archived_at", warnings, "archived_at"),
  ]);

  const snapshots = {
    today: metricSnapshot(periods.today, events, tracks, reactions, comments, archives, queues),
    yesterday: metricSnapshot(periods.yesterday, events, tracks, reactions, comments, archives, queues),
    last7Days: metricSnapshot(periods.last7Days, events, tracks, reactions, comments, archives, queues),
    last30Days: metricSnapshot(periods.last30Days, events, tracks, reactions, comments, archives, queues),
  };
  const selectedEvents = eventsIn(events, selectedRange.start, selectedRange.end);
  const selectedTracks = tracks.filter((track) => inRange(track.created_at, selectedRange.start, selectedRange.end));
  const selectedBattles = battles.filter((battle) => inRange(battle.created_at, selectedRange.start, selectedRange.end));
  const selectedProfiles = profiles.filter((profile) => inRange(profile.created_at, selectedRange.start, selectedRange.end));
  const selectedQueues = queues.filter((queue) => inRange(queue.created_at, selectedRange.start, selectedRange.end));
  const selectedComments = comments.filter((comment) => inRange(comment.created_at, selectedRange.start, selectedRange.end));
  const selectedReactions = reactions.filter((reaction) => inRange(reaction.created_at, selectedRange.start, selectedRange.end));
  const selectedArchives = archives.filter((archive) => inRange(archive.archived_at, selectedRange.start, selectedRange.end));
  const allVotes = [...votes.filter((vote) => vote.voter_role !== "fighter_a" && vote.voter_role !== "fighter_b"), ...guestVotes];
  const selectedVotes = allVotes.filter((vote) => inRange(vote.created_at, selectedRange.start, selectedRange.end));
  const byTrack = new Map(tracks.map((track) => [track.id, track]));

  const selectedSnapshot = metricSnapshot(selectedRange, events, tracks, reactions, comments, archives, queues);
  const pageViews = selectedEvents.filter((event) => event.event_type === "page_view");
  const sessionStarts = selectedEvents.filter((event) => event.event_type === "session_start");
  const sessions = new Set(selectedEvents.map((event) => event.session_id).filter(Boolean));
  const bounceSessions = [...sessions].filter((sessionId) => pageViews.filter((event) => event.session_id === sessionId).length <= 1).length;
  const pageSessions = sessions.size || sessionStarts.length;

  const trackEventRows = [...byTrack.keys()].map((trackId) => {
    const track = byTrack.get(trackId);
    const songEvents = selectedEvents.filter((event) => event.song_id === trackId);
    const trackComments = selectedComments.filter((comment) => comment.track_id === trackId).length;
    const trackReactions = selectedReactions.filter((reaction) => reaction.track_id === trackId).length;
    return {
      id: trackId,
      title: track?.title ?? "Untitled",
      artist: track?.artist ?? "AIPOGER",
      genre: track?.genre ?? "未標示",
      plays: songEvents.filter((event) => event.event_type === "song_play").length,
      minutes: playsMinutes(songEvents),
      likes: Math.max(0, track?.positive_reaction_count ?? track?.heart_count ?? 0) + trackReactions,
      skips: songEvents.filter((event) => event.event_type === "song_skip").length,
      finishes: songEvents.filter((event) => event.event_type === "song_finish").length,
      comments: trackComments,
    };
  });

  const battleVotesByBattle = new Map<string, number>();
  selectedVotes.forEach((vote) => {
    if (!vote.battle_id) return;
    battleVotesByBattle.set(vote.battle_id, (battleVotesByBattle.get(vote.battle_id) ?? 0) + 1);
  });
  const completedBattles = selectedBattles.filter((battle) => battle.status === "finished" || Boolean(battle.winner));
  const noContestBattles = selectedBattles.filter((battle) => battle.status === "expired" || battle.status === "cancelled_no_contest");
  const activeBattleStatuses = new Set(["pending", "waiting", "confirming", "matched", "countdown", "live", "active", "ghost_battle", "public_voting", "settling"]);
  const recentCutoff = new Date(Date.now() - 5 * 60 * 1000);
  const recentEvents = eventsIn(events, recentCutoff, new Date(Date.now() + 1000));
  const sourceCounts = groupCounts(selectedEvents.filter((event) => event.event_type === "page_view" || event.event_type === "session_start"), (event) => sourceLabel(event.source));

  return NextResponse.json({
    range: {
      preset: selectedRange.preset,
      label: selectedRange.label,
      start: selectedRange.start.toISOString(),
      end: selectedRange.end.toISOString(),
    },
    warnings,
    ceoKpis: [
      kpi("minutes", "今日播放分鐘", "minutes", (snapshot) => snapshot.minutes, snapshots),
      kpi("activeListeners", "今日活躍聽眾", "number", (snapshot) => snapshot.activeListeners, snapshots),
      kpi("songsPlayed", "今日播放歌曲數", "number", (snapshot) => snapshot.songsPlayed, snapshots),
      kpi("reactionRate", "正向反應率", "percent", (snapshot) => snapshot.reactionRate, snapshots),
      kpi("returningRate", "回訪率", "percent", (snapshot) => snapshot.returningRate, snapshots),
      kpi("uploads", "今日新投稿", "number", (snapshot) => snapshot.uploads, snapshots),
      kpi("honors", "今日新增 Showtime 作品", "number", (snapshot) => snapshot.honors, snapshots),
      kpi("healthScore", "Music Health Score", "score", (snapshot) => snapshot.healthScore, snapshots),
    ],
    platform: {
      totalUsers: profiles.length,
      dau: snapshots.today.activeListeners,
      wau: snapshots.last7Days.activeListeners,
      mau: snapshots.last30Days.activeListeners,
      newRegistrations: selectedProfiles.length,
      returningUsers: Math.round((selectedSnapshot.returningRate / 100) * selectedSnapshot.activeListeners),
      totalPlays: events.filter((event) => event.event_type === "song_play").length,
      totalMinutesPlayed: playsMinutes(events),
      totalSongUploads: tracks.length + queues.length,
      totalBattles: battles.length,
      totalComments: comments.length,
      totalPositiveReactions: reactions.length + events.filter((event) => event.event_type === "like" || event.event_type === "reaction").length,
      averageSessionDuration: selectedSnapshot.activeListeners > 0 ? Math.round((selectedSnapshot.minutes / selectedSnapshot.activeListeners) * 10) / 10 : 0,
      averageSongsPlayedPerUser: selectedSnapshot.activeListeners > 0 ? Math.round((selectedSnapshot.songsPlayed / selectedSnapshot.activeListeners) * 10) / 10 : 0,
    },
    traffic: {
      visitors: selectedEvents.filter((event) => event.event_type === "page_view" || event.event_type === "session_start").length,
      uniqueVisitors: uniqueCount(selectedEvents.map(listenerId)),
      pageViews: pageViews.length,
      sessions: pageSessions,
      bounceRate: pct(bounceSessions, pageSessions),
      averageSessionDuration: selectedSnapshot.activeListeners > 0 ? Math.round((selectedSnapshot.minutes / selectedSnapshot.activeListeners) * 10) / 10 : 0,
      pagesPerSession: pageSessions > 0 ? Math.round((pageViews.length / pageSessions) * 10) / 10 : 0,
      sourceCounts,
      dailyVisitors: dailySeries(events, tracks, queues, battles, selectedRange.start, selectedRange.end),
      returningVsNew: [
        { label: "Returning", value: Math.round((selectedSnapshot.returningRate / 100) * selectedSnapshot.activeListeners) },
        { label: "New", value: Math.max(0, selectedSnapshot.activeListeners - Math.round((selectedSnapshot.returningRate / 100) * selectedSnapshot.activeListeners)) },
      ],
    },
    heartbreak: {
      plays: selectedSnapshot.playCount,
      minutesPlayed: selectedSnapshot.minutes,
      averagePlaysPerSong: selectedSnapshot.songsPlayed > 0 ? Math.round((selectedSnapshot.playCount / selectedSnapshot.songsPlayed) * 10) / 10 : 0,
      playCompletionRate: pct(selectedEvents.filter((event) => event.event_type === "song_finish").length, selectedSnapshot.playCount),
      averageSongsPerListener: selectedSnapshot.activeListeners > 0 ? Math.round((selectedSnapshot.songsPlayed / selectedSnapshot.activeListeners) * 10) / 10 : 0,
      averageExitSongNumber: 0,
      likes: selectedReactions.length + selectedEvents.filter((event) => event.event_type === "like" || event.event_type === "reaction").length,
      comments: selectedComments.length + selectedEvents.filter((event) => event.event_type === "comment").length,
      skipCount: selectedEvents.filter((event) => event.event_type === "song_skip").length,
      skipRate: pct(selectedEvents.filter((event) => event.event_type === "song_skip").length, selectedSnapshot.playCount),
      reactionRate: selectedSnapshot.reactionRate,
      topPlayedSongs: trackEventRows.sort((a, b) => b.plays - a.plays).slice(0, 8),
      topLikedSongs: [...trackEventRows].sort((a, b) => b.likes - a.likes).slice(0, 8),
      mostSkippedSongs: [...trackEventRows].sort((a, b) => b.skips - a.skips).slice(0, 8),
      longestListeningSongs: [...trackEventRows].sort((a, b) => b.minutes - a.minutes).slice(0, 8),
      mostCommentedSongs: [...trackEventRows].sort((a, b) => b.comments - a.comments).slice(0, 8),
      hourlyHeatmap: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        minutes: playsMinutes(selectedEvents.filter((event) => new Date(timeValue(event.created_at) + TAIPEI_OFFSET_MS).getUTCHours() === hour)),
        plays: selectedEvents.filter((event) => event.event_type === "song_play" && new Date(timeValue(event.created_at) + TAIPEI_OFFSET_MS).getUTCHours() === hour).length,
      })),
      dailyPlaybackTrend: dailySeries(events, tracks, queues, battles, selectedRange.start, selectedRange.end),
    },
    battle: {
      todayBattles: selectedBattles.length,
      completedBattles: completedBattles.length,
      noContestBattles: noContestBattles.length,
      averageVotes: selectedBattles.length > 0 ? Math.round((selectedVotes.length / selectedBattles.length) * 10) / 10 : 0,
      averageViewers: uniqueCount(selectedEvents.filter((event) => event.event_type === "battle_enter").map(listenerId)),
      averageListeningTime: 0,
      mostPopularBattle: [...battleVotesByBattle.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
      battleWinRate: pct(completedBattles.length, selectedBattles.length),
      topBattleGenres: groupCounts([...selectedBattles, ...selectedQueues], (item) => item.genre).slice(0, 8),
      battleCompletionRate: pct(completedBattles.length, selectedBattles.length),
    },
    qCrash: qCrashFunnel(selectedEvents),
    creator: {
      newCreators: selectedProfiles.length,
      activeCreators: uniqueCount([...selectedTracks.map((track) => track.created_by), ...selectedQueues.map((queue) => queue.user_id)]),
      creatorsUploadedToday: uniqueCount(selectedTracks.map((track) => track.created_by)),
      averageUploadsPerCreator: selectedProfiles.length > 0 ? Math.round(((selectedTracks.length + selectedQueues.length) / selectedProfiles.length) * 10) / 10 : 0,
      topCreators: groupCounts(selectedTracks, (track) => track.artist).slice(0, 8),
      creator7DayRetention: snapshots.last7Days.activeListeners > 0 ? snapshots.today.returningRate : 0,
      creator30DayRetention: snapshots.last30Days.activeListeners > 0 ? snapshots.today.returningRate : 0,
      averageHonorBoardConversionRate: pct(selectedArchives.length, selectedTracks.length + selectedQueues.length),
    },
    honor: {
      todayNewHonorSongs: snapshots.today.honors,
      weeklyNewHonorSongs: snapshots.last7Days.honors,
      monthlyNewHonorSongs: snapshots.last30Days.honors,
      topHonorSongs: selectedArchives.slice(0, 8).map((archive) => ({
        title: archive.winner_song_name ?? "Untitled",
        creator: archive.winner_name ?? "AIPOGER",
        votes: Math.max(0, archive.final_vote_left ?? 0) + Math.max(0, archive.final_vote_right ?? 0),
      })),
      topGenres: groupCounts(tracks.filter((track) => selectedArchives.some((archive) => archive.winner_user_id === track.created_by)), (track) => track.genre).slice(0, 8),
      averageDaysToHonor: 0,
      averagePlaysToHonor: 0,
      averageReactionsToHonor: 0,
      averageCommentsToHonor: 0,
    },
    realtime: {
      onlineUsers: uniqueCount(recentEvents.map(listenerId)),
      currentPlays: recentEvents.filter((event) => event.event_type === "song_play").length,
      currentBattles: battles.filter((battle) => activeBattleStatuses.has(battle.status ?? "")).length,
      currentComments: recentEvents.filter((event) => event.event_type === "comment").length,
      currentUploadQueue: queues.filter((queue) => ["queued", "pending", "searching", "waiting_challenge", "public_voting"].includes(queue.status ?? "")).length,
      currentlyPlayingSongs: groupCounts(recentEvents.filter((event) => event.event_type === "song_play"), (event) => byTrack.get(event.song_id ?? "")?.title ?? event.song_id).slice(0, 6),
    },
    growth: dailySeries(events, tracks, queues, battles, selectedRange.start, selectedRange.end),
  });
}
