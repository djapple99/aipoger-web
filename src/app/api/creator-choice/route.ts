import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  AIPOGER_CHOICE_MAX_ITEMS,
  AIPOGER_CHOICE_MIN_ITEMS,
  AIPOGER_CHOICE_INTRO_MAX_LENGTH,
  isAipogerChoiceSourceKind,
  type AipogerChoiceCatalogItem,
} from "@/lib/aipoger-choice";
import type { AipogerCreatorChoiceCollection, CreatorChoiceEligibility } from "@/lib/creator-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";

type CreatorChoiceItemRow = {
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
  aipoger_creator_choice_items?: CreatorChoiceItemRow[] | null;
};

type OwnedShowtimeTrack = {
  id: string;
  title: string | null;
  artist: string | null;
  genre: string | null;
  cover_path: string | null;
  support_url: string | null;
  support_url_label: string | null;
  support_url_status: string | null;
  ai_music_showtime_certified_at: string | null;
  ai_music_showtime_public_removed_at: string | null;
};

type ChoiceAction = "save_collection" | "add_item" | "remove_item" | "move_item" | "set_published";

const OWN_SHOWTIME_SELECT = [
  "id",
  "title",
  "artist",
  "genre",
  "cover_path",
  "support_url",
  "support_url_label",
  "support_url_status",
  "ai_music_showtime_certified_at",
  "ai_music_showtime_public_removed_at",
].join(",");

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

function isMissingCreatorChoiceSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /aipoger_creator_choice|support_url_label|schema cache|relation.*does not exist|column.*does not exist|PGRST204|42P01/i.test(text);
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入後再管理自己的 Choice。", 401) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期，請重新登入。", 401) };
  return { admin, user: data.user };
}

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

async function loadOwnedShowtimeTracks(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await admin
    .from("listen_bar_tracks")
    .select(OWN_SHOWTIME_SELECT)
    .eq("created_by", userId)
    .eq("source", "community")
    .eq("ai_music_showtime_certified", true)
    .order("ai_music_showtime_certified_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OwnedShowtimeTrack[];
}

async function loadCreatorName(admin: ReturnType<typeof adminClient>, user: { id: string; email?: string | null }) {
  const [fighterResult, profileResult] = await Promise.all([
    admin.from("fighter_profiles").select("display_name").eq("id", user.id).maybeSingle(),
    admin.from("user_profiles").select("fighter_name,display_name").eq("id", user.id).maybeSingle(),
  ]);
  const fighterName = typeof fighterResult.data?.display_name === "string" ? fighterResult.data.display_name.trim() : "";
  const profile = profileResult.data as { fighter_name?: string | null; display_name?: string | null } | null;
  const profileName = typeof profile?.fighter_name === "string" && profile.fighter_name.trim()
    ? profile.fighter_name.trim()
    : typeof profile?.display_name === "string"
      ? profile.display_name.trim()
      : "";
  return fighterName || profileName || user.email?.split("@")[0] || "AIPOGER 創作者";
}

async function creatorEligibility(admin: ReturnType<typeof adminClient>, userId: string): Promise<{ eligibility: CreatorChoiceEligibility; ownTracks: OwnedShowtimeTrack[] }> {
  const ownTracks = await loadOwnedShowtimeTracks(admin, userId);
  return {
    eligibility: {
      eligible: ownTracks.length > 0,
      showtimeWorkCount: ownTracks.length,
    },
    ownTracks,
  };
}

function normalizeCollections(rows: CreatorChoiceCollectionRow[], catalog: AipogerChoiceCatalogItem[]): AipogerCreatorChoiceCollection[] {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return rows.map((row) => ({
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: Boolean(row.is_published),
    curatorName: row.curator_name?.trim() || "AIPOGER 創作者",
    publishedAt: row.published_at ?? null,
    items: (row.aipoger_creator_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        return source ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) } : null;
      })
      .filter((item): item is AipogerCreatorChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  }));
}

async function loadCollections(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data, error } = await admin
    .from("aipoger_creator_choice_collections")
    .select("id,creator_id,curator_name,week_start,title,intro,is_published,published_at,aipoger_creator_choice_items(id,collection_id,source_kind,source_id,position)")
    .eq("creator_id", userId)
    .order("week_start", { ascending: false })
    .limit(52);
  if (error) throw error;
  return (data ?? []) as CreatorChoiceCollectionRow[];
}

async function collectionItems(admin: ReturnType<typeof adminClient>, collectionId: string) {
  const { data, error } = await admin
    .from("aipoger_creator_choice_items")
    .select("id,collection_id,source_kind,source_id,position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CreatorChoiceItemRow[];
}

async function saveItemOrder(admin: ReturnType<typeof adminClient>, items: CreatorChoiceItemRow[]) {
  for (let index = 0; index < items.length; index += 1) {
    const { error } = await admin
      .from("aipoger_creator_choice_items")
      .update({ position: 90 + index })
      .eq("id", items[index].id);
    if (error) throw error;
  }
  for (let index = 0; index < items.length; index += 1) {
    const { error } = await admin
      .from("aipoger_creator_choice_items")
      .update({ position: index + 1 })
      .eq("id", items[index].id);
    if (error) throw error;
  }
}

async function collectionOwnedBy(admin: ReturnType<typeof adminClient>, collectionId: string, userId: string) {
  const { data, error } = await admin
    .from("aipoger_creator_choice_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("creator_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

async function assertSelectableSource(admin: ReturnType<typeof adminClient>, sourceKind: unknown, sourceId: unknown) {
  if (!isAipogerChoiceSourceKind(sourceKind) || !isUuid(sourceId)) throw new Error("Choice 作品資料不完整。");
  const catalog = await loadChoiceSelectionCatalog(admin);
  if (!catalog.schemaReady) throw new Error("Choice 選歌資料尚未準備完成。");
  const source = catalog.items.find((item) => item.sourceKind === sourceKind && item.id === sourceId);
  if (!source?.isPublic || !source.selectable) throw new Error("只能加入目前公開的 Showtime 認證作品或 30 天內新歌。");
  return source;
}

async function assertEligibleCreator(admin: ReturnType<typeof adminClient>, userId: string) {
  const { eligibility, ownTracks } = await creatorEligibility(admin, userId);
  if (!eligibility.eligible) throw new Error("需要至少一首已認證 Showtime 的作品，才能建立自己的 Choice。");
  return { eligibility, ownTracks };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.error) return guard.error;
    const [eligibilityState, catalog] = await Promise.all([
      creatorEligibility(guard.admin, guard.user.id),
      loadChoiceSelectionCatalog(guard.admin),
    ]);
    if (!catalog.schemaReady) {
      return NextResponse.json({ schemaReady: false, eligibility: eligibilityState.eligibility, ownShowtimeWorks: eligibilityState.ownTracks, catalog: [], collections: [] });
    }
    const collections = eligibilityState.eligibility.eligible
      ? await loadCollections(guard.admin, guard.user.id)
      : [];
    return NextResponse.json({
      schemaReady: true,
      eligibility: eligibilityState.eligibility,
      ownShowtimeWorks: eligibilityState.ownTracks,
      catalog: catalog.items.filter((item) => item.isPublic && item.selectable),
      collections: normalizeCollections(collections, catalog.items),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingCreatorChoiceSchema(error)) {
      return NextResponse.json({ schemaReady: false, eligibility: { eligible: false, showtimeWorkCount: 0 }, ownShowtimeWorks: [], catalog: [], collections: [] });
    }
    return jsonError(error instanceof Error ? error.message : "自己的 Choice 暫時無法讀取。", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.error) return guard.error;
    await assertEligibleCreator(guard.admin, guard.user.id);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action as ChoiceAction | undefined;
    if (!action) return jsonError("請指定 Choice 管理操作。");

    if (action === "save_collection") {
      const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";
      if (!isMonday(weekStart)) return jsonError("Choice 週期必須選擇星期一。");
      const curatorName = await loadCreatorName(guard.admin, guard.user);
      const payload = {
        week_start: weekStart,
        curator_name: curatorName.slice(0, 80),
        title: cleanText(body?.title, 120),
        intro: cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH),
        updated_at: new Date().toISOString(),
      };
      if (isUuid(body?.collectionId)) {
        const { data, error } = await guard.admin
          .from("aipoger_creator_choice_collections")
          .update(payload)
          .eq("id", body.collectionId)
          .eq("creator_id", guard.user.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return jsonError("找不到自己的 Choice。", 404);
        return NextResponse.json({ message: "Choice 草稿已儲存。", collectionId: data.id });
      }
      const { data, error } = await guard.admin
        .from("aipoger_creator_choice_collections")
        .insert({ ...payload, creator_id: guard.user.id })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return jsonError("這週的 Choice 草稿已存在，請從清單開啟。", 409);
        throw error;
      }
      return NextResponse.json({ message: "已建立自己的 Choice 草稿。", collectionId: data.id });
    }

    const collectionId = body?.collectionId;
    if (!isUuid(collectionId) || !(await collectionOwnedBy(guard.admin, collectionId, guard.user.id))) {
      return jsonError("找不到自己的 Choice。", 404);
    }

    if (action === "add_item") {
      const source = await assertSelectableSource(guard.admin, body?.sourceKind, body?.sourceId);
      const existing = await collectionItems(guard.admin, collectionId);
      if (existing.length >= AIPOGER_CHOICE_MAX_ITEMS) return jsonError("Choice 每期最多 10 首作品。");
      if (existing.some((item) => item.source_kind === source.sourceKind && item.source_id === source.id)) {
        return jsonError("這首作品已經在你的 Choice。", 409);
      }
      const { error } = await guard.admin.from("aipoger_creator_choice_items").insert({
        collection_id: collectionId,
        source_kind: source.sourceKind,
        source_id: source.id,
        position: existing.length + 1,
      });
      if (error) throw error;
      return NextResponse.json({ message: "已加入你的 Choice。" });
    }

    if (action === "remove_item") {
      if (!isUuid(body?.itemId)) return jsonError("找不到 Choice 項目。");
      const { error } = await guard.admin
        .from("aipoger_creator_choice_items")
        .delete()
        .eq("id", body.itemId)
        .eq("collection_id", collectionId);
      if (error) throw error;
      const remaining = await collectionItems(guard.admin, collectionId);
      for (let index = 0; index < remaining.length; index += 1) {
        const { error: updateError } = await guard.admin
          .from("aipoger_creator_choice_items")
          .update({ position: index + 1 })
          .eq("id", remaining[index].id);
        if (updateError) throw updateError;
      }
      return NextResponse.json({ message: "已從你的 Choice 移除作品。" });
    }

    if (action === "move_item") {
      const direction = body?.direction === "up" || body?.direction === "down" ? body.direction : null;
      const requestedPosition = typeof body?.position === "number" && Number.isInteger(body.position) ? body.position : null;
      if (!isUuid(body?.itemId) || (!direction && requestedPosition === null)) {
        return jsonError("Choice 排序資料不完整。");
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
      const hasDraftFields = body && ("weekStart" in body || "title" in body || "intro" in body);
      const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";
      if (hasDraftFields && !isMonday(weekStart)) return jsonError("Choice 週期必須選擇星期一。");
      if (publish) {
        const items = await collectionItems(guard.admin, collectionId);
        if (items.length < AIPOGER_CHOICE_MIN_ITEMS || items.length > AIPOGER_CHOICE_MAX_ITEMS) {
          return jsonError(`發布 Choice 需要 ${AIPOGER_CHOICE_MIN_ITEMS}-${AIPOGER_CHOICE_MAX_ITEMS} 首作品。`);
        }
        for (const item of items) await assertSelectableSource(guard.admin, item.source_kind, item.source_id);
      }
      const now = new Date().toISOString();
      const update = {
        is_published: publish,
        published_at: publish ? now : null,
        updated_at: now,
        ...(hasDraftFields
          ? {
              week_start: weekStart,
              title: cleanText(body?.title, 120),
              intro: cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH),
            }
          : {}),
      };
      const { error } = await guard.admin
        .from("aipoger_creator_choice_collections")
        .update(update)
        .eq("id", collectionId)
        .eq("creator_id", guard.user.id);
      if (error) throw error;
      return NextResponse.json({ message: publish ? "你的 Choice 已發布。" : "你的 Choice 已撤回。" });
    }

    return jsonError("不支援的 Choice 管理操作。");
  } catch (error) {
    if (isMissingCreatorChoiceSchema(error)) return jsonError("Creator Choice 資料表尚未準備完成。", 409);
    if (error instanceof Error && error.message.includes("Showtime")) return jsonError(error.message, 403);
    return jsonError(error instanceof Error ? error.message : "自己的 Choice 操作失敗。", 500);
  }
}
