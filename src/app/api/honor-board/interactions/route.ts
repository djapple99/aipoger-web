import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type HonorTargetKind = "battle" | "bar";

type StoredHonorComment = {
  id: string;
  recordKey: string;
  targetKind: HonorTargetKind;
  targetId: string;
  name: string;
  text: string;
  createdAt: string;
};

type StoredHonorRecord = {
  recordKey: string;
  targetKind: HonorTargetKind;
  targetId: string;
  favoriteUserIds: string[];
  comments: StoredHonorComment[];
  updatedAt: string;
};

type StoredHonorData = {
  records: StoredHonorRecord[];
};

type HonorInteractionDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<HonorInteractionDatabase>;

const DATA_BUCKET = "listen-bar-data";
const DATA_PATH = "honor-board/interactions.json";
const COMMENT_LIMIT_PER_RECORD = 120;
const PUBLIC_COMMENT_LIMIT = 24;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<HonorInteractionDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanRecordKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  return /^[a-z0-9:_-]{1,120}$/i.test(key) ? key : "";
}

function cleanTargetKind(value: unknown): HonorTargetKind | null {
  return value === "battle" || value === "bar" ? value : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isStoredHonorComment(value: unknown): value is StoredHonorComment {
  const item = value as StoredHonorComment;
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.id === "string" &&
    typeof item.recordKey === "string" &&
    (item.targetKind === "battle" || item.targetKind === "bar") &&
    typeof item.targetId === "string" &&
    typeof item.name === "string" &&
    typeof item.text === "string" &&
    typeof item.createdAt === "string"
  );
}

function isStoredHonorRecord(value: unknown): value is StoredHonorRecord {
  const item = value as StoredHonorRecord;
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.recordKey === "string" &&
    (item.targetKind === "battle" || item.targetKind === "bar") &&
    typeof item.targetId === "string" &&
    Array.isArray(item.favoriteUserIds) &&
    Array.isArray(item.comments) &&
    typeof item.updatedAt === "string"
  );
}

async function ensureDataBucket(admin: AdminClient) {
  const { data } = await admin.storage.getBucket(DATA_BUCKET);
  if (data) return;
  await admin.storage.createBucket(DATA_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  });
}

async function readStore(admin: AdminClient): Promise<StoredHonorData> {
  await ensureDataBucket(admin);
  const { data, error } = await admin.storage.from(DATA_BUCKET).download(DATA_PATH);
  if (error) {
    if (/not found|not exist|404/i.test(error.message)) return { records: [] };
    throw error;
  }
  const parsed = JSON.parse(await data.text()) as unknown;
  const records = typeof parsed === "object" && parsed !== null && Array.isArray((parsed as StoredHonorData).records)
    ? (parsed as StoredHonorData).records.filter(isStoredHonorRecord)
    : [];
  return {
    records: records.map((record) => ({
      ...record,
      favoriteUserIds: record.favoriteUserIds.filter((id) => typeof id === "string" && id.trim()),
      comments: record.comments.filter(isStoredHonorComment).slice(-COMMENT_LIMIT_PER_RECORD),
    })),
  };
}

async function writeStore(admin: AdminClient, data: StoredHonorData) {
  await ensureDataBucket(admin);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    DATA_PATH,
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw error;
}

function publicRecord(record: StoredHonorRecord, userId: string | null) {
  return {
    recordKey: record.recordKey,
    favoriteCount: record.favoriteUserIds.length,
    myFavorited: userId ? record.favoriteUserIds.includes(userId) : false,
    comments: record.comments.slice(-PUBLIC_COMMENT_LIMIT),
  };
}

export async function GET(request: NextRequest) {
  try {
    const keys = (request.nextUrl.searchParams.get("keys") || "")
      .split(",")
      .map((key) => cleanRecordKey(key))
      .filter(Boolean)
      .slice(0, 80);
    const admin = adminClient();
    const token = tokenFromRequest(request);
    const userResult = token ? await admin.auth.getUser(token) : null;
    const userId = userResult?.data.user?.id ?? null;
    const store = await readStore(admin);
    const records = keys.length > 0
      ? store.records.filter((record) => keys.includes(record.recordKey))
      : store.records;
    return NextResponse.json(
      { records: records.map((record) => publicRecord(record, userId)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入，才能收藏或評論榮譽榜作品。", 401);

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    recordKey?: unknown;
    targetKind?: unknown;
    targetId?: unknown;
    targetTitle?: unknown;
    displayName?: unknown;
    text?: unknown;
  } | null;
  const action = body?.action === "favorite" || body?.action === "comment" ? body.action : null;
  const recordKey = cleanRecordKey(body?.recordKey);
  const targetKind = cleanTargetKind(body?.targetKind);
  const targetId = cleanText(body?.targetId, 120);
  if (!action || !recordKey || !targetKind || !targetId) return jsonError("Invalid honor board interaction.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    const userId = userData.user.id;
    const store = await readStore(admin);
    const now = new Date().toISOString();
    let record = store.records.find((item) => item.recordKey === recordKey);
    if (!record) {
      record = {
        recordKey,
        targetKind,
        targetId,
        favoriteUserIds: [],
        comments: [],
        updatedAt: now,
      };
      store.records.push(record);
    }
    record.targetKind = targetKind;
    record.targetId = targetId;
    record.updatedAt = now;

    if (action === "favorite") {
      record.favoriteUserIds = record.favoriteUserIds.includes(userId)
        ? record.favoriteUserIds.filter((id) => id !== userId)
        : [...record.favoriteUserIds, userId];
    } else {
      const text = cleanText(body?.text, 280);
      if (!text) return jsonError("請輸入評論內容。");
      const name = cleanText(body?.displayName, 48) || userData.user.email?.split("@")[0] || "AIPOGER 聽眾";
      record.comments = [
        ...record.comments,
        {
          id: crypto.randomUUID(),
          recordKey,
          targetKind,
          targetId,
          name,
          text,
          createdAt: now,
        },
      ].slice(-COMMENT_LIMIT_PER_RECORD);
    }

    await writeStore(admin, store);
    return NextResponse.json({ record: publicRecord(record, userId) });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
