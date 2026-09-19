import { createHash, createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SUBMISSIONS_PER_HOUR = 6;
const TABLE = "ai_music_bible_contributions";

type ContributionBody = {
  kind?: unknown;
  entryKey?: unknown;
  outcome?: unknown;
  meaning?: unknown;
  recommended?: unknown;
  sunoWriting?: unknown;
  note?: unknown;
  sourceVersion?: unknown;
  contributorName?: unknown;
  website?: unknown;
};

let adminClient: SupabaseClient | null = null;

function getAdminClient() {
  if (adminClient) return adminClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) return null;
  adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestOrigin = request.nextUrl.origin;
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).origin;
    return origin === requestOrigin || origin === siteOrigin || origin === "https://www.aipoger.com" || origin === "https://aipoger.com";
  } catch {
    return false;
  }
}

function requestFingerprint(request: NextRequest, serviceKey: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.BIBLE_SUBMISSION_HASH_SALT?.trim() || createHash("sha256").update(serviceKey).digest("hex");
  return createHmac("sha256", salt).update(`${day}:${ip}:${userAgent}`).digest("hex");
}

async function requiredUserId(request: NextRequest, admin: SupabaseClient) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "不接受跨網站投稿。" }, { status: 403 });
  }

  const admin = getAdminClient();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY)?.trim();
  if (!admin || !serviceKey) {
    return NextResponse.json({ error: "投稿服務暫時未連線，主要資料仍可正常使用。" }, { status: 503 });
  }

  const userId = await requiredUserId(request, admin);
  if (!userId) {
    return NextResponse.json({ error: "請先登入，才能補充練功聖經資料。" }, { status: 401 });
  }

  let body: ContributionBody;
  try {
    body = (await request.json()) as ContributionBody;
  } catch {
    return NextResponse.json({ error: "投稿格式不正確。" }, { status: 400 });
  }

  if (text(body.website, 120)) {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  const kind = text(body.kind, 20);
  const entryKey = text(body.entryKey, 80) || null;
  const sourceVersion = text(body.sourceVersion, 80) || null;
  const contributorName = text(body.contributorName, 50) || null;

  let payload: Record<string, string>;
  if (kind === "feedback") {
    const outcome = text(body.outcome, 20);
    if (!entryKey || !["effective", "incorrect"].includes(outcome)) {
      return NextResponse.json({ error: "請選擇有效或唱錯。" }, { status: 400 });
    }
    payload = { outcome };
  } else if (kind === "suggestion") {
    const meaning = text(body.meaning, 80);
    const recommended = text(body.recommended, 120);
    const sunoWriting = text(body.sunoWriting, 160);
    const note = text(body.note, 500);
    if (!meaning || !sunoWriting || !note) {
      return NextResponse.json({ error: "請填寫華語意思、Suno 寫法與實測說明。" }, { status: 400 });
    }
    payload = { meaning, recommended, sunoWriting, note };
  } else {
    return NextResponse.json({ error: "投稿類型不正確。" }, { status: 400 });
  }

  const fingerprint = requestFingerprint(request, serviceKey);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint", fingerprint)
    .gte("created_at", since);

  if (countError) {
    console.error("AI Music Bible contribution rate check failed", countError);
    return NextResponse.json({ error: "投稿服務尚未完成資料庫設定。" }, { status: 503 });
  }
  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) {
    return NextResponse.json({ error: "你這一小時的回報已達上限，晚一點再來補資料。" }, { status: 429 });
  }

  const { error } = await admin.from(TABLE).insert({
    user_id: userId,
    contribution_kind: kind,
    entry_key: entryKey,
    payload,
    contributor_name: contributorName,
    source_version: sourceVersion,
    request_fingerprint: fingerprint,
    review_status: "pending",
  });

  if (error) {
    console.error("AI Music Bible contribution insert failed", error);
    return NextResponse.json({ error: "這筆資料暫時送不出去，請稍後再試。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
