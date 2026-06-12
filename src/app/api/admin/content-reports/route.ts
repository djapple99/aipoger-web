import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";

type ReportStatus = "open" | "reviewing" | "resolved" | "rejected";
type AdminAction = "set_status" | "hide_listen_bar_track" | "restore_listen_bar_track";
type StoredContentReport = {
  id: string;
  target_type: string;
  target_id: string;
  target_title: string | null;
  target_url: string | null;
  reason: string;
  description: string | null;
  evidence_url: string | null;
  contact_email: string | null;
  context: string | null;
  reporter_user_id: string | null;
  reporter_ip: string | null;
  user_agent: string | null;
  status: ReportStatus;
  priority: "low" | "normal" | "high" | "urgent";
  action_taken: string | null;
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = new Set<ReportStatus>(["open", "reviewing", "resolved", "rejected"]);
const ACTIONS = new Set<AdminAction>(["set_status", "hide_listen_bar_track", "restore_listen_bar_track"]);
const DATA_BUCKET = "listen-bar-data";
const REPORT_PATH = "moderation/content-reports.json";
const REPORT_LIMIT = 500;

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

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function isMissingColumnError(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|column.*does not exist|PGRST204|review_status|moderation_note|hidden_at|removed_at/i.test(text);
}

function isMissingReportsTable(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /content_reports|schema cache|PGRST205|does not exist/i.test(text);
}

async function ensureDataBucket(admin: ReturnType<typeof adminClient>) {
  const { data } = await admin.storage.getBucket(DATA_BUCKET);
  if (data) return;
  await admin.storage.createBucket(DATA_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  });
}

async function readStoredReports(admin: ReturnType<typeof adminClient>): Promise<StoredContentReport[]> {
  await ensureDataBucket(admin);
  const { data, error } = await admin.storage.from(DATA_BUCKET).download(REPORT_PATH);
  if (error) {
    if (/not found|not exist|404/i.test(error.message)) return [];
    throw error;
  }
  const parsed = JSON.parse(await data.text()) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is StoredContentReport => (
    typeof item === "object" &&
    item !== null &&
    typeof (item as StoredContentReport).id === "string" &&
    typeof (item as StoredContentReport).target_type === "string" &&
    typeof (item as StoredContentReport).target_id === "string" &&
    typeof (item as StoredContentReport).reason === "string" &&
    typeof (item as StoredContentReport).status === "string" &&
    typeof (item as StoredContentReport).created_at === "string"
  ));
}

async function writeStoredReports(admin: ReturnType<typeof adminClient>, reports: StoredContentReport[]) {
  await ensureDataBucket(admin);
  const rows = reports
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-REPORT_LIMIT);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    REPORT_PATH,
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw error;
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: NextResponse.json({ error: "請先登入。" }, { status: 401 }) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "登入狀態已過期。" }, { status: 401 }) };
  if (!isAdminEmail(data.user.email)) return { error: NextResponse.json({ error: "沒有後台權限。" }, { status: 403 }) };
  return { admin, userId: data.user.id };
}

async function loadTracks(admin: ReturnType<typeof adminClient>) {
  const modernSelect = "id,title,artist,source,bar_phase,is_active,review_status,moderation_note,created_by,created_at,promoted_at,hidden_at,removed_at,positive_reaction_count,audio_url";
  const legacySelect = "id,title,artist,source,bar_phase,is_active,created_by,created_at,promoted_at,positive_reaction_count,audio_url";
  const modern = await admin
    .from("listen_bar_tracks")
    .select(modernSelect)
    .eq("source", "community")
    .order("created_at", { ascending: false })
    .limit(120);

  if (!modern.error) return modern.data ?? [];
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacy = await admin
    .from("listen_bar_tracks")
    .select(legacySelect)
    .eq("source", "community")
    .order("created_at", { ascending: false })
    .limit(120);
  if (legacy.error) throw legacy.error;
  return legacy.data ?? [];
}

async function updateListenBarTrack(
  admin: ReturnType<typeof adminClient>,
  trackId: string,
  mode: "hide" | "restore",
  note: string | null,
) {
  const now = new Date().toISOString();
  const modernPayload = mode === "hide"
    ? { is_active: false, review_status: "hidden", hidden_at: now, moderation_note: note }
    : { is_active: true, review_status: "approved", hidden_at: null, removed_at: null, moderation_note: note };
  const modern = await admin.from("listen_bar_tracks").update(modernPayload).eq("id", trackId).select("id").maybeSingle();
  if (!modern.error) return;
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacy = await admin
    .from("listen_bar_tracks")
    .update({ is_active: mode === "restore" })
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (legacy.error) throw legacy.error;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const { admin } = guard;

    const [reportResult, tracks] = await Promise.all([
      admin
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(160),
      loadTracks(admin),
    ]);
    const storedReports = await readStoredReports(admin).catch(() => []);
    if (reportResult.error) {
      if (!isMissingReportsTable(reportResult.error)) return NextResponse.json({ error: reportResult.error.message }, { status: 500 });
      return NextResponse.json({
        reports: storedReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 160),
        tracks,
        storageFallback: true,
      });
    }
    const mergedReports = [...(reportResult.data ?? []), ...storedReports]
      .reduce<Array<StoredContentReport | Record<string, unknown>>>((items, report) => {
        const id = typeof report.id === "string" ? report.id : "";
        if (!id || items.some((item) => item.id === id)) return items;
        return [...items, report];
      }, [])
      .sort((a, b) => new Date(String(b.created_at ?? "")).getTime() - new Date(String(a.created_at ?? "")).getTime())
      .slice(0, 160);
    return NextResponse.json({ reports: mergedReports, tracks, storageFallback: storedReports.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const { admin, userId } = guard;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "後台動作格式不正確。" }, { status: 400 });

    const action = cleanText(body.action, 80) as AdminAction | null;
    if (!action || !ACTIONS.has(action)) return NextResponse.json({ error: "未知後台動作。" }, { status: 400 });

    const reportId = cleanText(body.reportId, 160);
    const targetId = cleanText(body.targetId, 160);
    const adminNote = cleanText(body.adminNote, 1200);
    const status = cleanText(body.status, 80) as ReportStatus | null;

    if (action === "hide_listen_bar_track" || action === "restore_listen_bar_track") {
      if (!targetId) return NextResponse.json({ error: "缺少作品 ID。" }, { status: 400 });
      await updateListenBarTrack(admin, targetId, action === "hide_listen_bar_track" ? "hide" : "restore", adminNote);
    }

    if (reportId) {
      const nextStatus: ReportStatus | null = status && STATUSES.has(status)
        ? status
        : action === "set_status"
          ? null
          : "resolved";
      const update = {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus === "resolved" || nextStatus === "rejected" ? { resolved_at: new Date().toISOString(), resolved_by: userId } : {}),
        ...(adminNote ? { admin_note: adminNote } : {}),
        action_taken: action,
      };
      const { error } = await admin.from("content_reports").update(update).eq("id", reportId);
      if (error) {
        if (!isMissingReportsTable(error)) return NextResponse.json({ error: error.message }, { status: 500 });
        const storedReports = await readStoredReports(admin);
        const now = new Date().toISOString();
        const nextReports = storedReports.map((report) => report.id === reportId
          ? {
              ...report,
              ...(nextStatus ? { status: nextStatus } : {}),
              ...(nextStatus === "resolved" || nextStatus === "rejected" ? { resolved_at: now, resolved_by: userId } : {}),
              ...(adminNote ? { admin_note: adminNote } : {}),
              action_taken: action,
              updated_at: now,
            }
          : report);
        await writeStoredReports(admin, nextReports);
      }
    } else if (action === "set_status") {
      return NextResponse.json({ error: "缺少檢舉案件 ID。" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
