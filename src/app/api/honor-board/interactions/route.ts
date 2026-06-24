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
  targetTitle?: string;
  targetArtist?: string;
  targetGenre?: string;
  favoriteUserIds: string[];
  comments: StoredHonorComment[];
  updatedAt: string;
};

type HonorTargetMeta = {
  title: string;
  artist: string;
  genre: string;
  createdAt: string | null;
};

type StoredHonorData = {
  records: StoredHonorRecord[];
};

type HonorInteractionDatabase = {
  public: {
    Tables: {
      battle_result_archives: {
        Row: {
          battle_id: string | null;
          battle_code: string | null;
          winner_name: string | null;
          winner_song_name: string | null;
          result_payload: Record<string, unknown> | null;
          archived_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      listen_bar_tracks: {
        Row: {
          id: string;
          title: string | null;
          artist: string | null;
          genre: string | null;
          mood: string | null;
          created_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
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

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function recordKeyTarget(recordKey: string) {
  return recordKey.split(":").slice(1).join(":").trim();
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
    targetKind: record.targetKind,
    targetId: record.targetId,
    targetTitle: record.targetTitle ?? null,
    targetArtist: record.targetArtist ?? null,
    targetGenre: record.targetGenre ?? null,
    updatedAt: record.updatedAt,
    favoriteCount: record.favoriteUserIds.length,
    myFavorited: userId ? record.favoriteUserIds.includes(userId) : false,
    comments: record.comments.slice(-PUBLIC_COMMENT_LIMIT),
  };
}

async function fetchTargetMetadata(admin: AdminClient, records: StoredHonorRecord[]) {
  const metadata = new Map<string, HonorTargetMeta>();
  const battleTargets = Array.from(
    new Set(
      records
        .filter((record) => record.targetKind === "battle")
        .flatMap((record) => [record.targetId, recordKeyTarget(record.recordKey)])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  const barTargets = Array.from(
    new Set(
      records
        .filter((record) => record.targetKind === "bar")
        .flatMap((record) => [record.targetId, recordKeyTarget(record.recordKey)])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const archiveRows: HonorInteractionDatabase["public"]["Tables"]["battle_result_archives"]["Row"][] = [];
  if (battleTargets.length > 0) {
    const readByCode = await admin
      .from("battle_result_archives")
      .select("battle_id,battle_code,winner_name,winner_song_name,result_payload,archived_at")
      .in("battle_code", battleTargets);
    if (!readByCode.error) archiveRows.push(...(readByCode.data ?? []));

    const uuidTargets = battleTargets.filter(isUuidLike);
    if (uuidTargets.length > 0) {
      const readByBattleId = await admin
        .from("battle_result_archives")
        .select("battle_id,battle_code,winner_name,winner_song_name,result_payload,archived_at")
        .in("battle_id", uuidTargets);
      if (!readByBattleId.error) archiveRows.push(...(readByBattleId.data ?? []));
    }
  }

  for (const row of archiveRows) {
    const payload = typeof row.result_payload === "object" && row.result_payload !== null ? row.result_payload : {};
    const title = cleanText(row.winner_song_name, 160);
    const artist = cleanText(row.winner_name, 80);
    const genre = cleanText(payload.genre, 80);
    const meta = {
      title,
      artist,
      genre,
      createdAt: row.archived_at ?? null,
    };
    [row.battle_id, row.battle_code]
      .filter((value): value is string => Boolean(value))
      .forEach((value) => metadata.set(`battle:${value}`, meta));
  }

  const uuidBarTargets = barTargets.filter(isUuidLike);
  if (uuidBarTargets.length > 0) {
    const readBars = await admin
      .from("listen_bar_tracks")
      .select("id,title,artist,genre,mood,created_at")
      .in("id", uuidBarTargets);
    if (!readBars.error) {
      for (const row of readBars.data ?? []) {
        metadata.set(`bar:${row.id}`, {
          title: cleanText(row.title, 160),
          artist: cleanText(row.artist, 80),
          genre: cleanText(row.genre, 80) || cleanText(row.mood, 80),
          createdAt: row.created_at ?? null,
        });
      }
    }
  }

  return metadata;
}

function withTargetMetadata(record: StoredHonorRecord, metadata: Map<string, HonorTargetMeta>) {
  const meta =
    metadata.get(`${record.targetKind}:${record.targetId}`) ??
    metadata.get(`${record.targetKind}:${recordKeyTarget(record.recordKey)}`);
  if (!meta) return record;
  return {
    ...record,
    targetTitle: record.targetTitle || [meta.artist, meta.title].filter(Boolean).join(" / ") || undefined,
    targetArtist: record.targetArtist || meta.artist || undefined,
    targetGenre: record.targetGenre || meta.genre || undefined,
    updatedAt: record.updatedAt || meta.createdAt || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const favoritesOnly = request.nextUrl.searchParams.get("favorites") === "me";
    const keys = (request.nextUrl.searchParams.get("keys") || "")
      .split(",")
      .map((key) => cleanRecordKey(key))
      .filter(Boolean)
      .slice(0, 80);
    const admin = adminClient();
    const token = tokenFromRequest(request);
    const userResult = token ? await admin.auth.getUser(token) : null;
    const userId = userResult?.data.user?.id ?? null;
    if (favoritesOnly && !userId) return jsonError("請先登入後再查看收藏歌曲。", 401);
    const store = await readStore(admin);
    let records = keys.length > 0
      ? store.records.filter((record) => keys.includes(record.recordKey))
      : store.records;
    if (favoritesOnly && userId) {
      records = records.filter((record) => record.favoriteUserIds.includes(userId));
    }
    const metadata = favoritesOnly ? await fetchTargetMetadata(admin, records) : new Map<string, HonorTargetMeta>();
    return NextResponse.json(
      { records: records.map((record) => publicRecord(withTargetMetadata(record, metadata), userId)) },
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
    targetArtist?: unknown;
    targetGenre?: unknown;
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
    const targetTitle = cleanText(body?.targetTitle, 180);
    const targetArtist = cleanText(body?.targetArtist, 80);
    const targetGenre = cleanText(body?.targetGenre, 80);
    if (targetTitle) record.targetTitle = targetTitle;
    if (targetArtist) record.targetArtist = targetArtist;
    if (targetGenre) record.targetGenre = targetGenre;
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
