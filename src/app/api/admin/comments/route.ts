import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  SUNO_ARTIST_DNA_ENTRIES,
  SUNO_PROMPT_RECIPES,
} from "@/lib/suno-inspiration-index";

export const runtime = "nodejs";

type CommentSource = "listen_bar" | "choice" | "bible";
type ModerationStatus = "visible" | "hidden";
type AdminAction = "hide" | "restore" | "delete" | "resolve_reports";

type CommentRow = {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_url?: string | null;
  body: string;
  created_at: string;
  updated_at?: string | null;
  moderation_status?: ModerationStatus | null;
  moderation_note?: string | null;
  moderated_at?: string | null;
  track_id?: string;
  collection_kind?: "official" | "creator";
  collection_id?: string;
  entry_kind?: "artist_dna" | "prompt_recipe";
  entry_key?: string;
};

type ReportRow = {
  id: string;
  target_id: string;
  status: "open" | "reviewing" | "resolved" | "rejected";
  reason: string;
  created_at: string;
};

const TABLES: Record<CommentSource, string> = {
  listen_bar: "listen_bar_track_comments",
  choice: "aipoger_choice_collection_comments",
  bible: "ai_music_bible_entry_comments",
};

const BASE_SELECTS: Record<CommentSource, string> = {
  listen_bar: "id,track_id,user_id,display_name,body,created_at",
  choice: "id,collection_kind,collection_id,user_id,display_name,avatar_url,body,created_at",
  bible: "id,entry_kind,entry_key,user_id,display_name,avatar_url,body,created_at",
};

const MODERATION_SELECT = "moderation_status,moderation_note,moderated_at";
const SOURCES = new Set<CommentSource>(["listen_bar", "choice", "bible"]);
const ACTIONS = new Set<AdminAction>(["hide", "restore", "delete", "resolve_reports"]);

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() || null : null;
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    return [request.nextUrl.origin, siteOrigin, "https://aipoger.com", "https://www.aipoger.com"].includes(origin);
  } catch {
    return false;
  }
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorText(error: unknown) {
  return error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
}

function isMissingTable(error: unknown, table: string) {
  const value = errorText(error);
  return /relation.*does not exist|Could not find the table|PGRST205|42P01/i.test(value)
    && new RegExp(table, "i").test(value);
}

function isMissingModerationColumns(error: unknown) {
  return /moderation_status|moderation_note|moderated_at|schema cache|column.*does not exist|PGRST204/i.test(errorText(error));
}

async function requireOwner(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: NextResponse.json({ error: "請先登入。" }, { status: 401 }) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "登入狀態已過期。" }, { status: 401 }) };
  if (!isAdminEmail(data.user.email)) return { error: NextResponse.json({ error: "沒有後台權限。" }, { status: 403 }) };
  return { admin, userId: data.user.id };
}

async function loadSource(admin: ReturnType<typeof adminClient>, source: CommentSource) {
  const table = TABLES[source];
  const modern = await admin
    .from(table)
    .select(`${BASE_SELECTS[source]},${MODERATION_SELECT}`)
    .order("created_at", { ascending: false })
    .limit(180);

  if (!modern.error) return { rows: (modern.data ?? []) as unknown as CommentRow[], exists: true, moderationReady: true };
  if (isMissingTable(modern.error, table)) return { rows: [] as CommentRow[], exists: false, moderationReady: false };
  if (!isMissingModerationColumns(modern.error)) throw modern.error;

  const legacy = await admin
    .from(table)
    .select(BASE_SELECTS[source])
    .order("created_at", { ascending: false })
    .limit(180);
  if (legacy.error) {
    if (isMissingTable(legacy.error, table)) return { rows: [] as CommentRow[], exists: false, moderationReady: false };
    throw legacy.error;
  }
  return { rows: (legacy.data ?? []) as unknown as CommentRow[], exists: true, moderationReady: false };
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwner(request);
    if (guard.error) return guard.error;
    const { admin } = guard;

    const [listenBar, choice, bible] = await Promise.all([
      loadSource(admin, "listen_bar"),
      loadSource(admin, "choice"),
      loadSource(admin, "bible"),
    ]);
    const allRows = [
      ...listenBar.rows.map((row) => ({ source: "listen_bar" as const, row })),
      ...choice.rows.map((row) => ({ source: "choice" as const, row })),
      ...bible.rows.map((row) => ({ source: "bible" as const, row })),
    ];

    const trackIds = unique(listenBar.rows.map((row) => row.track_id));
    const officialChoiceIds = unique(choice.rows.filter((row) => row.collection_kind === "official").map((row) => row.collection_id));
    const creatorChoiceIds = unique(choice.rows.filter((row) => row.collection_kind === "creator").map((row) => row.collection_id));
    const commentIds = allRows.map(({ row }) => row.id);

    const [tracksResult, officialChoiceResult, creatorChoiceResult, reportsResult] = await Promise.all([
      trackIds.length
        ? admin.from("listen_bar_tracks").select("id,title,artist").in("id", trackIds)
        : Promise.resolve({ data: [], error: null }),
      officialChoiceIds.length
        ? admin.from("aipoger_choice_collections").select("id,title,week_start").in("id", officialChoiceIds)
        : Promise.resolve({ data: [], error: null }),
      creatorChoiceIds.length
        ? admin.from("aipoger_creator_choice_collections").select("id,title,curator_name,week_start").in("id", creatorChoiceIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? admin.from("content_reports").select("id,target_id,status,reason,created_at").eq("target_type", "comment").in("target_id", commentIds).order("created_at", { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const trackTitles = new Map<string, string>();
    for (const item of (tracksResult.data ?? []) as Array<{ id: string; title: string | null; artist: string | null }>) {
      trackTitles.set(item.id, item.title?.trim() || item.artist?.trim() || "傷心酒吧歌曲");
    }
    const choiceTitles = new Map<string, string>();
    for (const item of (officialChoiceResult.data ?? []) as Array<{ id: string; title: string | null; week_start: string }>) {
      choiceTitles.set(`official:${item.id}`, item.title?.trim() || `AIPOGER Choice · ${item.week_start}`);
    }
    for (const item of (creatorChoiceResult.data ?? []) as Array<{ id: string; title: string | null; curator_name: string; week_start: string }>) {
      choiceTitles.set(`creator:${item.id}`, item.title?.trim() || `${item.curator_name} Choice · ${item.week_start}`);
    }
    const artistTitles = new Map(SUNO_ARTIST_DNA_ENTRIES.map((entry) => [entry.key, entry.artist]));
    const recipeTitles = new Map(SUNO_PROMPT_RECIPES.map((entry) => [entry.key, `${entry.genreZh} · ${entry.moodZh}`]));
    const reports = reportsResult.error ? [] : (reportsResult.data ?? []) as ReportRow[];
    const reportsByComment = reports.reduce<Map<string, ReportRow[]>>((items, report) => {
      items.set(report.target_id, [...(items.get(report.target_id) ?? []), report]);
      return items;
    }, new Map());

    const comments = allRows.map(({ source, row }) => {
      const commentReports = reportsByComment.get(row.id) ?? [];
      const openReports = commentReports.filter((report) => report.status === "open" || report.status === "reviewing");
      const targetTitle = source === "listen_bar"
        ? trackTitles.get(row.track_id ?? "") || "已下架或找不到的歌曲"
        : source === "choice"
          ? choiceTitles.get(`${row.collection_kind}:${row.collection_id}`) || "Choice 歌單"
          : row.entry_kind === "artist_dna"
            ? artistTitles.get(row.entry_key ?? "") || "聲音 DNA 索引"
            : recipeTitles.get(row.entry_key ?? "") || "Prompt 配方索引";
      const targetHref = source === "listen_bar"
        ? "/listen-bar?lang=zh"
        : source === "choice"
          ? `/choice/${row.collection_id}?kind=${row.collection_kind}&lang=zh`
          : `/ai-music-bible?lang=zh#suno-inspiration-index`;
      return {
        id: row.id,
        source,
        sourceLabel: source === "listen_bar" ? "歌曲評論" : source === "choice" ? "Choice 評論" : "聖經評論",
        displayName: row.display_name,
        avatarUrl: row.avatar_url ?? null,
        body: row.body,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? null,
        moderationStatus: row.moderation_status ?? "visible",
        moderationNote: row.moderation_note ?? null,
        moderatedAt: row.moderated_at ?? null,
        targetTitle,
        targetHref,
        reportCount: commentReports.length,
        openReportCount: openReports.length,
        reportReasons: unique(openReports.map((report) => report.reason)),
      };
    }).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return NextResponse.json({
      comments,
      sourceState: {
        listen_bar: { exists: listenBar.exists, moderationReady: listenBar.moderationReady },
        choice: { exists: choice.exists, moderationReady: choice.moderationReady },
        bible: { exists: bible.exists, moderationReady: bible.moderationReady },
      },
      counts: {
        total: comments.length,
        visible: comments.filter((comment) => comment.moderationStatus === "visible").length,
        hidden: comments.filter((comment) => comment.moderationStatus === "hidden").length,
        reported: comments.filter((comment) => comment.openReportCount > 0).length,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) || "評論資料讀取失敗。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "不接受跨網站後台動作。" }, { status: 403 });
  try {
    const guard = await requireOwner(request);
    if (guard.error) return guard.error;
    const { admin, userId } = guard;
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const source = cleanText(payload?.source, 30) as CommentSource | null;
    const action = cleanText(payload?.action, 30) as AdminAction | null;
    const commentId = cleanText(payload?.commentId, 80);
    const adminNote = cleanText(payload?.adminNote, 500);
    if (!source || !SOURCES.has(source) || !action || !ACTIONS.has(action) || !isUuid(commentId)) {
      return NextResponse.json({ error: "評論管理動作格式不正確。" }, { status: 400 });
    }

    if (action === "hide" || action === "restore") {
      const { data, error } = await admin
        .from(TABLES[source])
        .update({
          moderation_status: action === "hide" ? "hidden" : "visible",
          moderation_note: adminNote,
          moderated_by: userId,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select("id")
        .maybeSingle();
      if (error) {
        if (isMissingModerationColumns(error) || isMissingTable(error, TABLES[source])) {
          return NextResponse.json({ error: "評論治理 migration 尚未套用，現在只能檢視或永久刪除。" }, { status: 409 });
        }
        throw error;
      }
      if (!data) return NextResponse.json({ error: "找不到這則評論。" }, { status: 404 });
    }

    if (action === "delete") {
      const { data, error } = await admin.from(TABLES[source]).delete().eq("id", commentId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "找不到這則評論。" }, { status: 404 });
    }

    if (action !== "restore") {
      const { error } = await admin
        .from("content_reports")
        .update({
          status: "resolved",
          action_taken: action === "resolve_reports" ? "comment_reviewed" : `${action}_comment`,
          admin_note: adminNote,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("target_type", "comment")
        .eq("target_id", commentId)
        .in("status", ["open", "reviewing"]);
      if (error && !isMissingTable(error, "content_reports")) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) || "評論管理動作失敗。" }, { status: 500 });
  }
}
