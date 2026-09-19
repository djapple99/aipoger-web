import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReportReason =
  | "copyright"
  | "unauthorized_voice_or_sample"
  | "impersonation"
  | "scam_or_suspicious_payment"
  | "illegal_or_harmful"
  | "privacy_or_harassment"
  | "spam"
  | "other";

type ReportTargetType =
  | "listen_bar_track"
  | "battle"
  | "battle_result"
  | "creator"
  | "profile"
  | "support_link"
  | "comment"
  | "other";

type StoredContentReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_title: string | null;
  target_url: string | null;
  reason: ReportReason;
  description: string | null;
  evidence_url: string | null;
  contact_email: string | null;
  context: string | null;
  reporter_user_id: string | null;
  reporter_ip: string | null;
  user_agent: string | null;
  status: "open" | "reviewing" | "resolved" | "rejected";
  priority: "low" | "normal" | "high" | "urgent";
  action_taken: string | null;
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const DATA_BUCKET = "listen-bar-data";
const REPORT_PATH = "moderation/content-reports.json";
const REPORT_LIMIT = 500;

const TARGET_TYPES = new Set<ReportTargetType>([
  "listen_bar_track",
  "battle",
  "battle_result",
  "creator",
  "profile",
  "support_link",
  "comment",
  "other",
]);

const REASONS = new Set<ReportReason>([
  "copyright",
  "unauthorized_voice_or_sample",
  "impersonation",
  "scam_or_suspicious_payment",
  "illegal_or_harmful",
  "privacy_or_harassment",
  "spam",
  "other",
]);

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

function cleanUrl(value: unknown): string | null {
  const trimmed = cleanText(value, 500);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function priorityFor(reason: ReportReason): "low" | "normal" | "high" | "urgent" {
  if (reason === "illegal_or_harmful" || reason === "privacy_or_harassment") return "urgent";
  if (reason === "copyright" || reason === "unauthorized_voice_or_sample" || reason === "scam_or_suspicious_payment") return "high";
  if (reason === "spam") return "low";
  return "normal";
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

function ipFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "檢舉內容格式不正確。" }, { status: 400 });

    const targetType = cleanText(body.targetType, 80) as ReportTargetType | null;
    const reason = cleanText(body.reason, 80) as ReportReason | null;
    const targetId = cleanText(body.targetId, 160);

    if (!targetType || !TARGET_TYPES.has(targetType)) {
      return NextResponse.json({ error: "檢舉目標類型不正確。" }, { status: 400 });
    }
    if (!reason || !REASONS.has(reason)) {
      return NextResponse.json({ error: "請選擇檢舉原因。" }, { status: 400 });
    }
    if (!targetId) {
      return NextResponse.json({ error: "缺少檢舉目標。" }, { status: 400 });
    }

    const admin = adminClient();
    const token = tokenFromRequest(request);
    const userResult = token ? await admin.auth.getUser(token) : null;
    const reporterUserId = userResult?.data.user?.id ?? null;

    const now = new Date().toISOString();
    const insert = {
      target_type: targetType,
      target_id: targetId,
      target_title: cleanText(body.targetTitle, 240),
      target_url: cleanUrl(body.targetUrl),
      reason,
      description: cleanText(body.description, 1200),
      evidence_url: cleanUrl(body.evidenceUrl),
      contact_email: cleanText(body.contactEmail, 180),
      reporter_user_id: reporterUserId,
      reporter_ip: ipFromRequest(request),
      user_agent: cleanText(request.headers.get("user-agent"), 500),
      context: cleanText(body.context, 1200),
      priority: priorityFor(reason),
      status: "open",
    };

    const { data, error } = await admin.from("content_reports").insert(insert).select("id,status,priority").single();
    if (error) {
      if (!isMissingReportsTable(error)) return NextResponse.json({ error: error.message }, { status: 500 });
      const fallbackReport: StoredContentReport = {
        id: crypto.randomUUID(),
        ...insert,
        status: "open",
        action_taken: null,
        admin_note: null,
        resolved_by: null,
        resolved_at: null,
        created_at: now,
        updated_at: now,
      };
      const storedReports = await readStoredReports(admin);
      await writeStoredReports(admin, [...storedReports, fallbackReport]);
      return NextResponse.json({
        report: {
          id: fallbackReport.id,
          status: fallbackReport.status,
          priority: fallbackReport.priority,
          storageFallback: true,
        },
      });
    }
    return NextResponse.json({ report: data });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
