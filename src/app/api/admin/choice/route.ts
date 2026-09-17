import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  choicePublicPath,
  type AipogerChoiceCatalogItem,
} from "@/lib/aipoger-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import { isFeaturedChoiceKey, readFeaturedChoice, writeFeaturedChoice } from "@/lib/server-choice-featured";

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
  cover_path: string | null;
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
  creatorId?: string;
  href: string;
};

type ChoiceAction = "delete_collection" | "delete_creator_collection" | "set_featured";

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

async function publishedRows<T>(admin: ReturnType<typeof adminClient>, table: string, select: string): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let result = await admin.from(table).select(select).eq("is_published", true)
      .order("week_start", { ascending: false }).order("id").range(offset, offset + 499);
    if (result.error && isMissingChoiceCover(result.error)) {
      result = await admin.from(table).select(select.replace("cover_path,", "")).eq("is_published", true)
        .order("week_start", { ascending: false }).order("id").range(offset, offset + 499);
    }
    if (result.error) throw result.error;
    all.push(...(result.data ?? []) as unknown as T[]);
    if ((result.data ?? []).length < 500) return all;
  }
}

async function loadCollections(admin: ReturnType<typeof adminClient>) {
  return publishedRows<ChoiceCollectionRow>(admin, "aipoger_choice_collections",
    "id,created_by,week_start,title,intro,is_published,curator_identity,cover_path,aipoger_choice_items(id,collection_id,source_kind,source_id,position)");
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
  const creatorData = await publishedRows<CreatorChoiceCollectionRow>(admin, "aipoger_creator_choice_collections",
    "id,creator_id,curator_name,week_start,title,intro,is_published,cover_path,published_at,aipoger_creator_choice_items(id,collection_id,source_kind,source_id,position)");
  const [{ data: profileData, error: profileError }] = await Promise.all([
    (() => {
      const ids = officialRows.map((row) => row.created_by).filter((value): value is string => Boolean(value));
      return ids.length > 0
        ? admin.from("fighter_profiles").select("id,display_name").in("id", ids)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);
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
    creatorId: row.creator_id,
    weekStart: row.week_start,
    title: row.title?.trim() || "",
    curatorName: row.curator_name?.trim() || "創作者",
    intro: row.intro?.trim() || "",
    isPublished: Boolean(row.is_published),
    itemCount: row.aipoger_creator_choice_items?.length ?? 0,
    coverUrl: libraryCover(admin, row.cover_path, row.aipoger_creator_choice_items, catalog),
    href: choicePublicPath(row.id, "creator"),
  }));
  return [...officialEntries, ...creatorEntries].sort(
    (left, right) => right.weekStart.localeCompare(left.weekStart) || left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id),
  );
}

async function removeChoiceEngagement(admin: ReturnType<typeof adminClient>, collectionId: string, collectionKind: "official" | "creator" = "official") {
  for (const table of ["aipoger_choice_collection_hearts", "aipoger_choice_collection_comments"] as const) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("collection_kind", collectionKind)
      .eq("collection_id", collectionId);
    if (error && !isMissingChoiceSchema(error)) throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const [catalog, rows] = await Promise.all([loadChoiceSelectionCatalog(guard.admin), loadCollections(guard.admin)]);
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, library: [] });
    const library = await loadChoiceLibrary(guard.admin, rows, catalog.items);
    return NextResponse.json({
      schemaReady: true,
      library,
      featuredKey: await readFeaturedChoice(guard.admin),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return NextResponse.json({ schemaReady: false, library: [] });
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

    if (action === "set_featured") {
      const key = body?.featuredKey;
      if (key !== null && !isFeaturedChoiceKey(key)) return jsonError("請選擇已發布的 Choice。");
      if (key !== null) {
        const [kind, id] = key.split(":");
        const table = kind === "official" ? "aipoger_choice_collections" : "aipoger_creator_choice_collections";
        const itemsTable = kind === "official" ? "aipoger_choice_items" : "aipoger_creator_choice_items";
        const { data, error } = await guard.admin.from(table).select(`id,${itemsTable}(source_kind,source_id)`).eq("id", id).eq("is_published", true).maybeSingle();
        if (error) throw error;
        const items = (data as unknown as Record<string, Array<{ source_kind: string; source_id: string }>> | null)?.[itemsTable] ?? [];
        const catalog = await loadChoiceSelectionCatalog(guard.admin);
        if (!data || !items.some((item) => catalog.items.some((source) => source.sourceKind === item.source_kind && source.id === item.source_id && source.isPublic && source.audioUrl))) return jsonError("主推歌單必須已發布，且有公開可播放的歌曲。");
      }
      await writeFeaturedChoice(guard.admin, key);
      return NextResponse.json({ message: key ? "Showtime 主推 Choice 已更新。" : "已取消主推 Choice。" });
    }

    if (action !== "delete_collection" && action !== "delete_creator_collection") {
      return jsonError("官方製作工具已停用，請從我的 Choice 製作。", 410);
    }
    const collectionId = body?.collectionId;
    if (!isUuid(collectionId) || body?.confirmed !== true) return jsonError("刪除 Choice 前需要再次確認。", 400);
    const kind = action === "delete_creator_collection" ? "creator" : "official";
    const table = kind === "creator" ? "aipoger_creator_choice_collections" : "aipoger_choice_collections";
    let current = await guard.admin.from(table).select("id,cover_path")
      .eq("id", collectionId).eq("is_published", true).maybeSingle();
    if (current.error && isMissingChoiceCover(current.error)) {
      current = await guard.admin.from(table).select("id")
        .eq("id", collectionId).eq("is_published", true).maybeSingle();
    }
    if (current.error) throw current.error;
    if (!current.data) return jsonError("找不到已發布的 Choice。", 404);
    await removeChoiceEngagement(guard.admin, collectionId, kind);
    const removed = await guard.admin.from(table).delete().eq("id", collectionId).eq("is_published", true);
    if (removed.error) throw removed.error;
    if (typeof current.data.cover_path === "string" && current.data.cover_path) {
      await guard.admin.storage.from(LISTEN_BAR_COVER_BUCKET).remove([current.data.cover_path]);
    }
    return NextResponse.json({ message: "Choice 已刪除，歌曲本身未受影響。" });

  } catch (error) {
    if (isMissingChoiceSchema(error)) return jsonError("Choice 資料表尚未準備完成。", 409);
    return jsonError(error instanceof Error ? error.message : "Choice 管理操作失敗。", 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireOwnerAdmin(request);
  if (guard.error) return guard.error;
  return jsonError("官方製作工具已停用，請從我的 Choice 製作。", 410);
}
