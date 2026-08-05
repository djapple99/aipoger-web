import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  AIPOGER_CHOICE_MAX_ITEMS,
  AIPOGER_CHOICE_MIN_ITEMS,
  AIPOGER_CHOICE_INTRO_MAX_LENGTH,
  AIPOGER_CHOICE_CURATOR_IDENTITIES,
  choicePublicPath,
  type AipogerChoiceCuratorIdentity,
  isAipogerChoiceSourceKind,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
} from "@/lib/aipoger-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

type ChoiceCollectionRow = {
  id: string;
  created_by: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  is_published: boolean | null;
  curator_identity: string | null;
  cover_path: string | null;
  aipoger_choice_items?: ChoiceItemRow[] | null;
};

type ChoiceItemRow = {
  id: string;
  collection_id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type CreatorChoiceCollectionRow = {
  id: string;
  creator_id: string;
  curator_name: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  is_published: boolean | null;
  published_at: string | null;
  aipoger_creator_choice_items?: ChoiceItemRow[] | null;
};

type ChoiceLibraryEntry = {
  id: string;
  kind: "official" | "creator";
  weekStart: string;
  title: string;
  curatorName: string;
  intro: string;
  isPublished: boolean;
  itemCount: number;
  coverUrl: string | null;
  href: string;
};

type ChoiceAction = "save_collection" | "add_item" | "remove_item" | "move_item" | "set_published" | "clear_cover";

const MAX_COVER_BYTES = 10 * 1024 * 1024;
const ALLOWED_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function coverExtension(contentType: string) {
  return contentType === "image/png" ? "png"
    : contentType === "image/webp" ? "webp"
      : contentType === "image/gif" ? "gif"
        : "jpg";
}

function publicCoverUrl(admin: ReturnType<typeof adminClient>, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(clean).data.publicUrl || null;
}

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
  return /schema cache|relation.*does not exist|column.*does not exist|PGRST204|42P01/i.test(text);
}

function isMissingChoiceCover(error: unknown) {
  const text = error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
  return /cover_path.*does not exist|column.*cover_path/i.test(text);
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
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

function normalizeCollections(
  admin: ReturnType<typeof adminClient>,
  rows: ChoiceCollectionRow[],
  catalog: AipogerChoiceCatalogItem[],
): AipogerChoiceCollection[] {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return rows.map((row) => ({
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: Boolean(row.is_published),
    curatorIdentity: curatorIdentity(row.curator_identity),
    coverUrl: publicCoverUrl(admin, row.cover_path) || undefined,
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
  let { data, error } = await admin
    .from("aipoger_choice_collections")
    .select("id,created_by,week_start,title,intro,is_published,curator_identity,cover_path,aipoger_choice_items(id,collection_id,source_kind,source_id,position)")
    .order("week_start", { ascending: false })
    .limit(80);
  if (error && isMissingChoiceCover(error)) {
    const fallback = await admin
      .from("aipoger_choice_collections")
      .select("id,created_by,week_start,title,intro,is_published,curator_identity,aipoger_choice_items(id,collection_id,source_kind,source_id,position)")
      .order("week_start", { ascending: false })
      .limit(80);
    data = (fallback.data ?? []).map((row) => ({ ...row, cover_path: null }));
    error = fallback.error;
  }
  if (error) throw error;
  return (data ?? []) as ChoiceCollectionRow[];
}

function libraryCover(
  admin: ReturnType<typeof adminClient>,
  coverPath: string | null | undefined,
  items: ChoiceItemRow[] | null | undefined,
  catalog: AipogerChoiceCatalogItem[],
) {
  const custom = publicCoverUrl(admin, coverPath);
  if (custom) return custom;
  const first = (items ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((item) => catalog.find((candidate) => candidate.sourceKind === item.source_kind && candidate.id === item.source_id))
    .find(Boolean);
  return first?.coverUrl?.trim() || null;
}

async function loadChoiceLibrary(
  admin: ReturnType<typeof adminClient>,
  officialRows: ChoiceCollectionRow[],
  catalog: AipogerChoiceCatalogItem[],
) {
  const [{ data: creatorData, error: creatorError }, { data: profileData, error: profileError }] = await Promise.all([
    admin
      .from("aipoger_creator_choice_collections")
      .select("id,creator_id,curator_name,week_start,title,intro,is_published,published_at,aipoger_creator_choice_items(id,collection_id,source_kind,source_id,position)")
      .order("week_start", { ascending: false })
      .limit(80),
    (() => {
      const ids = officialRows.map((row) => row.created_by).filter((value): value is string => Boolean(value));
      return ids.length > 0
        ? admin.from("fighter_profiles").select("id,display_name").in("id", ids)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);
  if (creatorError && !isMissingChoiceSchema(creatorError)) throw creatorError;
  if (profileError) throw profileError;

  const profiles = new Map(
    ((profileData ?? []) as Array<{ id: string; display_name: string | null }>).map((profile) => [profile.id, profile.display_name?.trim() || "愛波哥"]),
  );
  const officialEntries: ChoiceLibraryEntry[] = officialRows.map((row) => {
    const curatorName = row.curator_identity === "personal" ? profiles.get(row.created_by ?? "") || "愛波哥" : "AIPOGER";
    return {
      id: row.id,
      kind: "official",
      weekStart: row.week_start,
      title: row.title?.trim() || "",
      curatorName,
      intro: row.intro?.trim() || "",
      isPublished: Boolean(row.is_published),
      itemCount: row.aipoger_choice_items?.length ?? 0,
      coverUrl: libraryCover(admin, row.cover_path, row.aipoger_choice_items, catalog),
      href: choicePublicPath(row.id, "official"),
    };
  });
  const creatorEntries: ChoiceLibraryEntry[] = ((creatorData ?? []) as CreatorChoiceCollectionRow[]).map((row) => ({
    id: row.id,
    kind: "creator",
    weekStart: row.week_start,
    title: row.title?.trim() || "",
    curatorName: row.curator_name?.trim() || "創作者",
    intro: row.intro?.trim() || "",
    isPublished: Boolean(row.is_published),
    itemCount: row.aipoger_creator_choice_items?.length ?? 0,
    coverUrl: libraryCover(admin, null, row.aipoger_creator_choice_items, catalog),
    href: choicePublicPath(row.id, "creator"),
  }));
  return [...officialEntries, ...creatorEntries].sort(
    (left, right) => right.weekStart.localeCompare(left.weekStart) || (left.kind === "official" ? -1 : 1),
  );
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

async function saveItemOrder(admin: ReturnType<typeof adminClient>, items: ChoiceItemRow[]) {
  for (let index = 0; index < items.length; index += 1) {
    const { error } = await admin
      .from("aipoger_choice_items")
      .update({ position: 90 + index })
      .eq("id", items[index].id);
    if (error) throw error;
  }
  for (let index = 0; index < items.length; index += 1) {
    const { error } = await admin
      .from("aipoger_choice_items")
      .update({ position: index + 1 })
      .eq("id", items[index].id);
    if (error) throw error;
  }
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
  const catalog = await loadChoiceSelectionCatalog(admin);
  if (!catalog.schemaReady) throw new Error("Choice 選歌資料尚未準備完成。" );
  const source = catalog.items.find((item) => item.sourceKind === sourceKind && item.id === sourceId);
  if (!source?.isPublic || !source.selectable) throw new Error("只能加入目前公開的 Showtime 認證作品或 30 天內新歌。" );
  return source;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const [catalog, rows] = await Promise.all([loadChoiceSelectionCatalog(guard.admin), loadCollections(guard.admin)]);
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, catalog: [], collections: [] });
    const library = await loadChoiceLibrary(guard.admin, rows, catalog.items);
    return NextResponse.json({
      schemaReady: true,
      catalog: catalog.items,
      collections: normalizeCollections(guard.admin, rows, catalog.items),
      library,
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
        return jsonError("這首作品已經在本週 Choice。" );
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
      const direction = body?.direction === "up" || body?.direction === "down" ? body.direction : null;
      const requestedPosition = typeof body?.position === "number" && Number.isInteger(body.position) ? body.position : null;
      if (!isUuid(body?.itemId) || (!direction && requestedPosition === null)) {
        return jsonError("Choice 排序資料不完整。" );
      }
      const items = await collectionItems(guard.admin, collectionId);
      const currentIndex = items.findIndex((item) => item.id === body.itemId);
      if (requestedPosition !== null && (requestedPosition < 1 || requestedPosition > items.length)) {
        return jsonError(`Choice 播放順序必須介於 1-${items.length}。`);
      }
      const targetIndex = requestedPosition !== null
        ? requestedPosition - 1
        : direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return NextResponse.json({ message: "Choice 順序未改變。" });
      if (currentIndex === targetIndex) return NextResponse.json({ message: "Choice 順序未改變。" });
      const [moved] = items.splice(currentIndex, 1);
      items.splice(targetIndex, 0, moved);
      await saveItemOrder(guard.admin, items);
      return NextResponse.json({ message: "Choice 順序已更新。" });
    }

    if (action === "set_published") {
      const publish = body?.isPublished === true;
      const hasDraftFields = body && ("weekStart" in body || "title" in body || "intro" in body || "curatorIdentity" in body);
      const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";
      if (hasDraftFields && !isMonday(weekStart)) return jsonError("Choice 週期必須選擇星期一。");
      if (publish) {
        const items = await collectionItems(guard.admin, collectionId);
        if (items.length < AIPOGER_CHOICE_MIN_ITEMS || items.length > AIPOGER_CHOICE_MAX_ITEMS) {
          return jsonError(`Choice 發布需要 ${AIPOGER_CHOICE_MIN_ITEMS}-${AIPOGER_CHOICE_MAX_ITEMS} 首作品。`);
        }
        for (const item of items) await assertSelectableSource(guard.admin, item.source_kind, item.source_id);
      }
      const now = new Date().toISOString();
      const update = {
        is_published: publish,
        updated_at: now,
        ...(hasDraftFields
          ? {
              week_start: weekStart,
              title: cleanText(body?.title, 120),
              intro: cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH),
              curator_identity: curatorIdentity(body?.curatorIdentity),
            }
          : {}),
      };
      const { error } = await guard.admin
        .from("aipoger_choice_collections")
        .update(update)
        .eq("id", collectionId);
      if (error) throw error;
      return NextResponse.json({ message: publish ? "Choice 已發布到 Showtime。" : "Choice 已從 Showtime 撤回。" });
    }

    if (action === "clear_cover") {
      const { error } = await guard.admin
        .from("aipoger_choice_collections")
        .update({ cover_path: null, updated_at: new Date().toISOString() })
        .eq("id", collectionId);
      if (error) throw error;
      return NextResponse.json({ message: "已移除本期 Choice 封面，將改用第一首作品封面。", collectionId });
    }

    return jsonError("不支援的 Choice 管理操作。" );
  } catch (error) {
    if (isMissingChoiceSchema(error)) return jsonError("Choice 資料表尚未準備完成。", 409);
    return jsonError(error instanceof Error ? error.message : "Choice 管理操作失敗。", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const form = await request.formData();
    const collectionId = form.get("collectionId");
    const file = form.get("file");
    if (!isUuid(collectionId) || !(file instanceof File)) return jsonError("Choice 封面上傳資料不完整。");
    if (!ALLOWED_COVER_TYPES.has(file.type)) return jsonError("封面只接受 JPG、PNG、WebP 或 GIF。");
    if (file.size <= 0 || file.size > MAX_COVER_BYTES) return jsonError("封面檔案需小於 10MB。");

    const path = `choice/admin/${collectionId}/${Date.now()}-${crypto.randomUUID()}.${coverExtension(file.type)}`;
    const upload = await guard.admin.storage
      .from(LISTEN_BAR_COVER_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;

    const { data, error } = await guard.admin
      .from("aipoger_choice_collections")
      .update({ cover_path: path, updated_at: new Date().toISOString() })
      .eq("id", collectionId)
      .select("id,cover_path")
      .maybeSingle();
    if (error || !data) {
      await guard.admin.storage.from(LISTEN_BAR_COVER_BUCKET).remove([path]);
      if (error) throw error;
      return jsonError("找不到 Choice 週期。", 404);
    }
    return NextResponse.json({ message: "本期 Choice 封面已更新。", collectionId: data.id, coverUrl: publicCoverUrl(guard.admin, data.cover_path) });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return jsonError("Choice 封面欄位尚未準備完成，請先套用最新資料庫 migration。", 409);
    return jsonError(error instanceof Error ? error.message : "Choice 封面上傳失敗。", 500);
  }
}
