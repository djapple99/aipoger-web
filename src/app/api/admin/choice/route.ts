import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  AIPOGER_CHOICE_MAX_ITEMS,
  AIPOGER_CHOICE_MIN_ITEMS,
  AIPOGER_CHOICE_INTRO_MAX_LENGTH,
  AIPOGER_CHOICE_CURATOR_IDENTITIES,
  type AipogerChoiceCuratorIdentity,
  isAipogerChoiceSourceKind,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
} from "@/lib/aipoger-choice";
import { loadShowtimeAdminCatalog } from "@/lib/server-showtime-catalog";

type ChoiceCollectionRow = {
  id: string;
  week_start: string;
  title: string | null;
  intro: string | null;
  is_published: boolean | null;
  curator_identity: string | null;
  aipoger_choice_items?: ChoiceItemRow[] | null;
};

type ChoiceItemRow = {
  id: string;
  collection_id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type ChoiceAction = "save_collection" | "add_item" | "remove_item" | "move_item" | "set_published";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function isMonday(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.getUTCDay() === 1;
}

function curatorIdentity(value: unknown): AipogerChoiceCuratorIdentity {
  return AIPOGER_CHOICE_CURATOR_IDENTITIES.includes(value as AipogerChoiceCuratorIdentity)
    ? value as AipogerChoiceCuratorIdentity
    : "official";
}

function isMissingChoiceSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /aipoger_choice|schema cache|relation.*does not exist|PGRST204|42P01/i.test(text);
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
  return { admin, userId: data.user.id };
}

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function normalizeCollections(rows: ChoiceCollectionRow[], catalog: AipogerChoiceCatalogItem[]): AipogerChoiceCollection[] {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return rows.map((row) => ({
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: Boolean(row.is_published),
    curatorIdentity: curatorIdentity(row.curator_identity),
    items: (row.aipoger_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        if (!source) return null;
        return { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) };
      })
      .filter((item): item is AipogerChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  }));
}

async function loadCollections(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin
    .from("aipoger_choice_collections")
    .select("id,week_start,title,intro,is_published,curator_identity,aipoger_choice_items(id,collection_id,source_kind,source_id,position)")
    .order("week_start", { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data ?? []) as ChoiceCollectionRow[];
}

async function collectionItems(admin: ReturnType<typeof adminClient>, collectionId: string) {
  const { data, error } = await admin
    .from("aipoger_choice_items")
    .select("id,collection_id,source_kind,source_id,position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChoiceItemRow[];
}

async function collectionExists(admin: ReturnType<typeof adminClient>, collectionId: string) {
  const { data, error } = await admin
    .from("aipoger_choice_collections")
    .select("id")
    .eq("id", collectionId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

async function assertSelectableSource(admin: ReturnType<typeof adminClient>, sourceKind: unknown, sourceId: unknown) {
  if (!isAipogerChoiceSourceKind(sourceKind) || !isUuid(sourceId)) throw new Error("Choice 作品資料不完整。" );
  const catalog = await loadShowtimeAdminCatalog(admin);
  if (!catalog.schemaReady) throw new Error("Showtime 資料尚未準備完成。" );
  const source = catalog.items.find((item) => item.sourceKind === sourceKind && item.id === sourceId);
  if (!source?.isPublic || !source.selectable) throw new Error("只能加入目前公開展示中的 Showtime 認證作品。" );
  return source;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const [catalog, rows] = await Promise.all([loadShowtimeAdminCatalog(guard.admin), loadCollections(guard.admin)]);
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, catalog: [], collections: [] });
    return NextResponse.json({
      schemaReady: true,
      catalog: catalog.items,
      collections: normalizeCollections(rows, catalog.items),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return NextResponse.json({ schemaReady: false, catalog: [], collections: [] });
    return jsonError(error instanceof Error ? error.message : "Choice 後台資料讀取失敗。", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action as ChoiceAction | undefined;
    if (!action) return jsonError("請指定 Choice 管理操作。" );

    if (action === "save_collection") {
      const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";
      if (!isMonday(weekStart)) return jsonError("Choice 週期必須選擇星期一。" );
      const payload = {
        week_start: weekStart,
        title: cleanText(body?.title, 120),
        intro: cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH),
        curator_identity: curatorIdentity(body?.curatorIdentity),
        updated_at: new Date().toISOString(),
      };
      if (isUuid(body?.collectionId)) {
        const { data, error } = await guard.admin
          .from("aipoger_choice_collections")
          .update(payload)
          .eq("id", body.collectionId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return jsonError("找不到 Choice 週期。", 404);
        return NextResponse.json({ message: "Choice 草稿已儲存。", collectionId: data.id });
      }
      const { data, error } = await guard.admin
        .from("aipoger_choice_collections")
        .insert({ ...payload, created_by: guard.userId })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ message: "已建立 Choice 草稿。", collectionId: data.id });
    }

    const collectionId = body?.collectionId;
    if (!isUuid(collectionId) || !(await collectionExists(guard.admin, collectionId))) {
      return jsonError("找不到 Choice 週期。", 404);
    }

    if (action === "add_item") {
      const source = await assertSelectableSource(guard.admin, body?.sourceKind, body?.sourceId);
      const existing = await collectionItems(guard.admin, collectionId);
      if (existing.length >= AIPOGER_CHOICE_MAX_ITEMS) return jsonError("Choice 每週最多 10 首作品。" );
      if (existing.some((item) => item.source_kind === source.sourceKind && item.source_id === source.id)) {
        return jsonError("這首 Showtime 作品已經在本週 Choice。" );
      }
      const { error } = await guard.admin.from("aipoger_choice_items").insert({
        collection_id: collectionId,
        source_kind: source.sourceKind,
        source_id: source.id,
        position: existing.length + 1,
      });
      if (error) throw error;
      return NextResponse.json({ message: "已加入本週 Choice。" });
    }

    if (action === "remove_item") {
      if (!isUuid(body?.itemId)) return jsonError("找不到 Choice 項目。" );
      const { error } = await guard.admin
        .from("aipoger_choice_items")
        .delete()
        .eq("id", body.itemId)
        .eq("collection_id", collectionId);
      if (error) throw error;
      const remaining = await collectionItems(guard.admin, collectionId);
      for (let index = 0; index < remaining.length; index += 1) {
        const { error: updateError } = await guard.admin
          .from("aipoger_choice_items")
          .update({ position: index + 1 })
          .eq("id", remaining[index].id);
        if (updateError) throw updateError;
      }
      return NextResponse.json({ message: "已從本週 Choice 移除作品。" });
    }

    if (action === "move_item") {
      if (!isUuid(body?.itemId) || (body?.direction !== "up" && body?.direction !== "down")) {
        return jsonError("Choice 排序資料不完整。" );
      }
      const items = await collectionItems(guard.admin, collectionId);
      const currentIndex = items.findIndex((item) => item.id === body.itemId);
      const targetIndex = body.direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return NextResponse.json({ message: "Choice 順序未改變。" });
      const current = items[currentIndex];
      const target = items[targetIndex];
      const { error: temporaryError } = await guard.admin
        .from("aipoger_choice_items")
        .update({ position: 99 })
        .eq("id", current.id);
      if (temporaryError) throw temporaryError;
      const { error: targetError } = await guard.admin
        .from("aipoger_choice_items")
        .update({ position: current.position })
        .eq("id", target.id);
      if (targetError) throw targetError;
      const { error: currentError } = await guard.admin
          .from("aipoger_choice_items")
          .update({ position: target.position })
          .eq("id", current.id);
      if (currentError) throw currentError;
      return NextResponse.json({ message: "Choice 順序已更新。" });
    }

    if (action === "set_published") {
      const publish = body?.isPublished === true;
      if (publish) {
        const items = await collectionItems(guard.admin, collectionId);
        if (items.length < AIPOGER_CHOICE_MIN_ITEMS || items.length > AIPOGER_CHOICE_MAX_ITEMS) {
          return jsonError(`Choice 發布需要 ${AIPOGER_CHOICE_MIN_ITEMS}-${AIPOGER_CHOICE_MAX_ITEMS} 首 Showtime 作品。`);
        }
        for (const item of items) await assertSelectableSource(guard.admin, item.source_kind, item.source_id);
      }
      const { error } = await guard.admin
        .from("aipoger_choice_collections")
        .update({ is_published: publish, updated_at: new Date().toISOString() })
        .eq("id", collectionId);
      if (error) throw error;
      return NextResponse.json({ message: publish ? "Choice 已發布到 Showtime。" : "Choice 已從 Showtime 撤回。" });
    }

    return jsonError("不支援的 Choice 管理操作。" );
  } catch (error) {
    if (isMissingChoiceSchema(error)) return jsonError("Choice 資料表尚未準備完成。", 409);
    return jsonError(error instanceof Error ? error.message : "Choice 管理操作失敗。", 500);
  }
}
