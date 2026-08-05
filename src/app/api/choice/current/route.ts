import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  AIPOGER_CHOICE_CURATOR_IDENTITIES,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
  type AipogerChoiceCuratorIdentity,
} from "@/lib/aipoger-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

type ChoiceItemRow = {
  id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type ChoiceCollectionRow = {
  id: string;
  created_by: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  curator_identity: string | null;
  cover_path: string | null;
  aipoger_choice_items?: ChoiceItemRow[] | null;
};

type CuratorProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
};

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function publicCoverUrl(admin: ReturnType<typeof adminClient>, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return "";
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(clean).data.publicUrl || "";
}

function curatorIdentity(value: string | null): AipogerChoiceCuratorIdentity {
  return AIPOGER_CHOICE_CURATOR_IDENTITIES.includes(value as AipogerChoiceCuratorIdentity)
    ? value as AipogerChoiceCuratorIdentity
    : "official";
}

function resolveCollection(
  admin: ReturnType<typeof adminClient>,
  row: ChoiceCollectionRow,
  catalog: AipogerChoiceCatalogItem[],
  curator: CuratorProfileRow | null,
): AipogerChoiceCollection {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  const identity = curatorIdentity(row.curator_identity);
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    curatorIdentity: identity,
    curatorName: identity === "personal" ? curator?.display_name?.trim() || "愛波哥" : "AIPOGER",
    avatarUrl: identity === "personal" ? curator?.avatar_url?.trim() || "" : "",
    coverUrl: publicCoverUrl(admin, row.cover_path),
    items: (row.aipoger_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        return source?.isPublic ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) } : null;
      })
      .filter((item): item is AipogerChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  };
}

export async function GET() {
  try {
    const admin = adminClient();
    let { data, error } = await admin
      .from("aipoger_choice_collections")
      .select("id,created_by,week_start,title,intro,curator_identity,cover_path,aipoger_choice_items(id,source_kind,source_id,position)")
      .eq("is_published", true)
      .order("week_start", { ascending: false })
      .limit(80);
    if (error && isMissingChoiceCover(error)) {
      const fallback = await admin
        .from("aipoger_choice_collections")
        .select("id,created_by,week_start,title,intro,curator_identity,aipoger_choice_items(id,source_kind,source_id,position)")
        .eq("is_published", true)
        .order("week_start", { ascending: false })
        .limit(80);
      data = (fallback.data ?? []).map((row) => ({ ...row, cover_path: null }));
      error = fallback.error;
    }
    if (error) throw error;
    const rows = (data ?? []) as ChoiceCollectionRow[];
    if (rows.length === 0) return NextResponse.json({ schemaReady: true, collection: null, collections: [] }, { headers: { "Cache-Control": "no-store" } });

    const curatorIds = rows.map((row) => row.created_by).filter((value): value is string => Boolean(value));
    const [catalog, curatorResult] = await Promise.all([
      loadChoiceSelectionCatalog(admin),
      curatorIds.length > 0
        ? admin.from("fighter_profiles").select("id,display_name,avatar_url").in("id", curatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (curatorResult.error) throw curatorResult.error;
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, collection: null });
    const profiles = new Map(
      ((curatorResult.data ?? []) as Array<CuratorProfileRow & { id: string }>).map((profile) => [profile.id, profile]),
    );
    const collections = rows.map((row) => resolveCollection(admin, row, catalog.items, row.created_by ? profiles.get(row.created_by) ?? null : null));
    return NextResponse.json({
      schemaReady: true,
      collection: collections[0] ?? null,
      collections,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[choice/current] read failed", {
      code: error && typeof error === "object" ? (error as { code?: string }).code : undefined,
      message: error instanceof Error ? error.message : String(error ?? ""),
      details: error && typeof error === "object" ? (error as { details?: string }).details : undefined,
      hint: error && typeof error === "object" ? (error as { hint?: string }).hint : undefined,
    });
    if (isMissingChoiceSchema(error)) return NextResponse.json({ schemaReady: false, collection: null });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choice 暫時無法讀取。" }, { status: 500 });
  }
}
