import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  AIPOGER_CHOICE_CURATOR_IDENTITIES,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
  type AipogerChoiceCuratorIdentity,
} from "@/lib/aipoger-choice";
import { loadShowtimeAdminCatalog } from "@/lib/server-showtime-catalog";

type Kind = "official" | "creator";
type HeartRow = { collection_kind: Kind; collection_id: string; created_at: string };
type ItemRow = { id: string; collection_id: string; source_kind: string; source_id: string; position: number };
type ProfileRow = { display_name?: string | null; avatar_url?: string | null };
type CollectionRow = {
  id: string; week_start: string; title: string | null; intro: string | null; created_by?: string | null;
  curator_identity?: string | null; curator_name?: string | null; creator_id?: string;
  published_at?: string | null; aipoger_choice_items?: ItemRow[] | null; aipoger_creator_choice_items?: ItemRow[] | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function tokenFromRequest(request: NextRequest) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

function isMissingChoiceSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
  return /aipoger_(creator_)?choice|schema cache|relation.*does not exist|PGRST204|42P01/i.test(text);
}

function recordKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function identity(value: string | null): AipogerChoiceCuratorIdentity {
  return AIPOGER_CHOICE_CURATOR_IDENTITIES.includes(value as AipogerChoiceCuratorIdentity)
    ? value as AipogerChoiceCuratorIdentity
    : "official";
}

function resolveItems(rows: ItemRow[] | null | undefined, catalog: AipogerChoiceCatalogItem[]) {
  const byKey = new Map(catalog.map((item) => [recordKey(item.sourceKind, item.id), item]));
  return (rows ?? []).map((row) => {
    const source = byKey.get(recordKey(row.source_kind, row.source_id));
    return source?.isPublic && source.selectable ? { ...source, itemId: row.id, position: Math.max(1, Math.round(row.position)) } : null;
  }).filter((item): item is AipogerChoiceCollection["items"][number] => Boolean(item)).sort((a, b) => a.position - b.position);
}

function resolve(row: CollectionRow, kind: Kind, catalog: AipogerChoiceCatalogItem[], profile: ProfileRow | null): AipogerChoiceCollection {
  if (kind === "official") {
    const curatorIdentity = identity(row.curator_identity ?? null);
    return {
      id: row.id, weekStart: row.week_start, title: row.title?.trim() ?? "", intro: row.intro?.trim() ?? "", isPublished: true,
      curatorIdentity, curatorName: curatorIdentity === "personal" ? profile?.display_name?.trim() || "愛波哥" : "AIPOGER",
      avatarUrl: curatorIdentity === "personal" ? profile?.avatar_url?.trim() || "" : "", items: resolveItems(row.aipoger_choice_items, catalog),
    };
  }
  return {
    id: row.id, weekStart: row.week_start, title: row.title?.trim() ?? "", intro: row.intro?.trim() ?? "", isPublished: true,
    curatorIdentity: "personal", curatorName: row.curator_name?.trim() || profile?.display_name?.trim() || "AIPOGER 創作者",
    avatarUrl: profile?.avatar_url?.trim() || "", items: resolveItems(row.aipoger_creator_choice_items, catalog),
  };
}

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "請先登入，才能查看收藏的 Choice。" }, { status: 401 });
  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });
    const { data: hearts, error: heartsError } = await admin
      .from("aipoger_choice_collection_hearts")
      .select("collection_kind,collection_id,created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (heartsError) throw heartsError;
    const rows = (hearts ?? []) as HeartRow[];
    if (rows.length === 0) return NextResponse.json({ collections: [] }, { headers: { "Cache-Control": "no-store" } });
    const officialIds = rows.filter((row) => row.collection_kind === "official").map((row) => row.collection_id);
    const creatorIds = rows.filter((row) => row.collection_kind === "creator").map((row) => row.collection_id);
    const [official, creator, officialItems, creatorItems] = await Promise.all([
      officialIds.length ? admin.from("aipoger_choice_collections").select("id,created_by,week_start,title,intro,curator_identity").in("id", officialIds).eq("is_published", true) : Promise.resolve({ data: [], error: null }),
      creatorIds.length ? admin.from("aipoger_creator_choice_collections").select("id,creator_id,curator_name,week_start,title,intro,published_at").in("id", creatorIds).eq("is_published", true) : Promise.resolve({ data: [], error: null }),
      officialIds.length ? admin.from("aipoger_choice_items").select("id,collection_id,source_kind,source_id,position").in("collection_id", officialIds).order("position", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      creatorIds.length ? admin.from("aipoger_creator_choice_items").select("id,collection_id,source_kind,source_id,position").in("collection_id", creatorIds).order("position", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (official.error) throw official.error;
    if (creator.error) throw creator.error;
    if (officialItems.error) throw officialItems.error;
    if (creatorItems.error) throw creatorItems.error;
    const catalog = await loadShowtimeAdminCatalog(admin);
    const officialItemsByCollection = new Map<string, ItemRow[]>();
    const creatorItemsByCollection = new Map<string, ItemRow[]>();
    ((officialItems.data ?? []) as ItemRow[]).forEach((item) => officialItemsByCollection.set(item.collection_id, [...(officialItemsByCollection.get(item.collection_id) ?? []), item]));
    ((creatorItems.data ?? []) as ItemRow[]).forEach((item) => creatorItemsByCollection.set(item.collection_id, [...(creatorItemsByCollection.get(item.collection_id) ?? []), item]));
    const officialRows = ((official.data ?? []) as CollectionRow[]).map((row) => ({ ...row, aipoger_choice_items: officialItemsByCollection.get(row.id) ?? [] }));
    const creatorRows = ((creator.data ?? []) as CollectionRow[]).map((row) => ({ ...row, aipoger_creator_choice_items: creatorItemsByCollection.get(row.id) ?? [] }));
    const ownerIds = [...officialRows.map((row) => row.created_by).filter((id): id is string => Boolean(id)), ...creatorRows.map((row) => row.creator_id).filter((id): id is string => Boolean(id))];
    const [fighter, profiles] = ownerIds.length ? await Promise.all([
      admin.from("fighter_profiles").select("id,display_name,avatar_url").in("id", ownerIds),
      admin.from("user_profiles").select("id,avatar_url").in("id", ownerIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (fighter.error) throw fighter.error;
    if (profiles.error) throw profiles.error;
    const fighterById = new Map((fighter.data ?? []).map((row) => [String(row.id), row as ProfileRow]));
    const profileById = new Map((profiles.data ?? []).map((row) => [String(row.id), row as ProfileRow]));
    const profileFor = (id: string | null | undefined) => id ? { ...profileById.get(id), ...fighterById.get(id) } : null;
    const officialById = new Map(officialRows.map((row) => [row.id, row]));
    const creatorById = new Map(creatorRows.map((row) => [row.id, row]));
    const collections = rows.map((saved) => {
      const row = saved.collection_kind === "official" ? officialById.get(saved.collection_id) : creatorById.get(saved.collection_id);
      if (!row) return null;
      const collection = resolve(row, saved.collection_kind, catalog.schemaReady ? catalog.items : [], profileFor(row.created_by ?? row.creator_id));
      return { ...collection, kind: saved.collection_kind, savedAt: saved.created_at };
    }).filter(Boolean);
    return NextResponse.json({ collections, schemaReady: catalog.schemaReady }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return NextResponse.json({ collections: [], schemaReady: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "收藏的 Choice 暫時無法讀取。" }, { status: 500 });
  }
}
