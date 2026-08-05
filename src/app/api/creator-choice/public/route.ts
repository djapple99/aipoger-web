import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import type { AipogerPublicCreatorChoiceCollection } from "@/lib/creator-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";

type ChoiceItemRow = {
  id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type ChoiceCollectionRow = {
  id: string;
  creator_id: string;
  curator_name: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  published_at: string | null;
  aipoger_creator_choice_items?: ChoiceItemRow[] | null;
};

type ProfileRow = {
  id: string;
  avatar_url?: string | null;
};

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingCreatorChoiceSchema(error: unknown) {
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

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function resolveCollection(
  row: ChoiceCollectionRow,
  catalog: AipogerChoiceCatalogItem[],
  avatarUrl: string,
): AipogerPublicCreatorChoiceCollection {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return {
    id: row.id,
    creatorId: row.creator_id,
    curatorName: row.curator_name?.trim() || "AIPOGER 創作者",
    avatarUrl,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    publishedAt: row.published_at ?? null,
    items: (row.aipoger_creator_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        return source?.isPublic
          ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) }
          : null;
      })
      .filter((item): item is AipogerPublicCreatorChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  };
}

export async function GET() {
  try {
    const admin = adminClient();
    const { data, error } = await admin
      .from("aipoger_creator_choice_collections")
      .select("id,creator_id,curator_name,week_start,title,intro,published_at,aipoger_creator_choice_items(id,source_kind,source_id,position)")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(48);
    if (error) throw error;

    const rows = (data ?? []) as ChoiceCollectionRow[];
    const latestByCreator = new Map<string, ChoiceCollectionRow>();
    rows.forEach((row) => {
      if (!latestByCreator.has(row.creator_id)) latestByCreator.set(row.creator_id, row);
    });
    const currentRows = Array.from(latestByCreator.values());
    if (currentRows.length === 0) {
      return NextResponse.json({ schemaReady: true, collections: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const creatorIds = currentRows.map((row) => row.creator_id);
    const [catalog, fighterProfiles, userProfiles] = await Promise.all([
      loadChoiceSelectionCatalog(admin),
      admin.from("fighter_profiles").select("id,avatar_url").in("id", creatorIds),
      admin.from("user_profiles").select("id,avatar_url").in("id", creatorIds),
    ]);
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, collections: [] });

    const fighterById = new Map(
      ((fighterProfiles.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.avatar_url?.trim() || ""]),
    );
    const userById = new Map(
      ((userProfiles.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.avatar_url?.trim() || ""]),
    );
    const collections = currentRows
      .map((row) => resolveCollection(row, catalog.items, fighterById.get(row.creator_id) || userById.get(row.creator_id) || ""))
      .filter((collection) => collection.items.length > 0);

    return NextResponse.json({ schemaReady: true, collections }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[creator-choice/public] read failed", {
      code: error && typeof error === "object" ? (error as { code?: string }).code : undefined,
      message: error instanceof Error ? error.message : String(error ?? ""),
      details: error && typeof error === "object" ? (error as { details?: string }).details : undefined,
      hint: error && typeof error === "object" ? (error as { hint?: string }).hint : undefined,
    });
    if (isMissingCreatorChoiceSchema(error)) {
      return NextResponse.json({ schemaReady: false, collections: [] }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Creator Choice 暫時無法讀取。" }, { status: 500 });
  }
}
