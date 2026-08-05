import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ChoiceCollectionKind = "official" | "creator";

type ChoiceHeartRow = {
  collection_kind: ChoiceCollectionKind;
  collection_id: string;
  user_id: string;
};

type ChoiceInteraction = {
  recordKey: string;
  heartCount: number;
  myHeart: boolean;
};

const MAX_LOOKUPS = 48;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseRecordKey(value: unknown): { kind: ChoiceCollectionKind; id: string; recordKey: string } | null {
  if (typeof value !== "string") return null;
  const [kind, id, ...extra] = value.trim().split(":");
  if (extra.length > 0 || (kind !== "official" && kind !== "creator") || !isUuid(id || "")) return null;
  return { kind, id, recordKey: `${kind}:${id}` };
}

function isMissingChoiceHeartsSchema(error: unknown) {
  const value = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|relation.*does not exist|PGRST204|42P01/i.test(value);
}

async function publishedRecordKeys(
  admin: ReturnType<typeof adminClient>,
  records: Array<{ kind: ChoiceCollectionKind; id: string; recordKey: string }>,
) {
  const officialIds = records.filter((record) => record.kind === "official").map((record) => record.id);
  const creatorIds = records.filter((record) => record.kind === "creator").map((record) => record.id);
  const [official, creator] = await Promise.all([
    officialIds.length > 0
      ? admin.from("aipoger_choice_collections").select("id").in("id", officialIds).eq("is_published", true)
      : Promise.resolve({ data: [], error: null }),
    creatorIds.length > 0
      ? admin.from("aipoger_creator_choice_collections").select("id").in("id", creatorIds).eq("is_published", true)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (official.error) throw official.error;
  if (creator.error) throw creator.error;

  const available = new Set<string>();
  (official.data ?? []).forEach((row) => available.add(`official:${String(row.id)}`));
  (creator.data ?? []).forEach((row) => available.add(`creator:${String(row.id)}`));
  return available;
}

async function interactionRecords(
  admin: ReturnType<typeof adminClient>,
  recordKeys: string[],
  userId: string | null,
): Promise<ChoiceInteraction[]> {
  if (recordKeys.length === 0) return [];
  const parsed = recordKeys.map(parseRecordKey).filter((record): record is NonNullable<typeof record> => Boolean(record));
  const available = await publishedRecordKeys(admin, parsed);
  const active = parsed.filter((record) => available.has(record.recordKey));
  if (active.length === 0) return [];

  const ids = Array.from(new Set(active.map((record) => record.id)));
  const { data, error } = await admin
    .from("aipoger_choice_collection_hearts")
    .select("collection_kind,collection_id,user_id")
    .in("collection_id", ids);
  if (error) throw error;

  const heartsByRecord = new Map<string, ChoiceHeartRow[]>();
  ((data ?? []) as ChoiceHeartRow[]).forEach((heart) => {
    const recordKey = `${heart.collection_kind}:${heart.collection_id}`;
    if (!available.has(recordKey)) return;
    heartsByRecord.set(recordKey, [...(heartsByRecord.get(recordKey) ?? []), heart]);
  });

  return active.map((record) => {
    const hearts = heartsByRecord.get(record.recordKey) ?? [];
    return {
      recordKey: record.recordKey,
      heartCount: hearts.length,
      myHeart: Boolean(userId && hearts.some((heart) => heart.user_id === userId)),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const records = (request.nextUrl.searchParams.get("keys") || "")
      .split(",")
      .map(parseRecordKey)
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
      .slice(0, MAX_LOOKUPS);
    const admin = adminClient();
    const token = tokenFromRequest(request);
    const userResult = token ? await admin.auth.getUser(token) : null;
    const userId = userResult?.data.user?.id ?? null;
    const interactions = await interactionRecords(admin, records.map((record) => record.recordKey), userId);
    return NextResponse.json({ schemaReady: true, interactions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceHeartsSchema(error)) {
      return NextResponse.json({ schemaReady: false, interactions: [] }, { headers: { "Cache-Control": "no-store" } });
    }
    return jsonError(error instanceof Error ? error.message : "Choice 收藏暫時無法讀取。", 500);
  }
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入，才能收藏 Choice。", 401);

  const body = (await request.json().catch(() => null)) as { action?: unknown; collectionKind?: unknown; collectionId?: unknown } | null;
  const action = body?.action === "heart" || body?.action === "remove_heart" ? body.action : null;
  const kind = body?.collectionKind === "official" || body?.collectionKind === "creator" ? body.collectionKind : null;
  const collectionId = typeof body?.collectionId === "string" ? body.collectionId.trim() : "";
  if (!action || !kind || !isUuid(collectionId)) return jsonError("Choice 收藏資料不完整。");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    const recordKey = `${kind}:${collectionId}`;
    const available = await publishedRecordKeys(admin, [{ kind, id: collectionId, recordKey }]);
    if (!available.has(recordKey)) return jsonError("這份 Choice 目前未公開。", 404);

    if (action === "heart") {
      const { error } = await admin
        .from("aipoger_choice_collection_hearts")
        .upsert(
          { collection_kind: kind, collection_id: collectionId, user_id: userData.user.id },
          { onConflict: "collection_kind,collection_id,user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("aipoger_choice_collection_hearts")
        .delete()
        .eq("collection_kind", kind)
        .eq("collection_id", collectionId)
        .eq("user_id", userData.user.id);
      if (error) throw error;
    }

    const [interaction] = await interactionRecords(admin, [recordKey], userData.user.id);
    return NextResponse.json({ interaction: interaction ?? { recordKey, heartCount: 0, myHeart: false } });
  } catch (error) {
    if (isMissingChoiceHeartsSchema(error)) return jsonError("Choice 收藏服務尚未準備完成。", 503);
    return jsonError(error instanceof Error ? error.message : "Choice 收藏失敗，請稍後再試。", 500);
  }
}
