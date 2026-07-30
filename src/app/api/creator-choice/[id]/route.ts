import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import type { AipogerCreatorChoiceCollection } from "@/lib/creator-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";

type ChoiceItemRow = {
  id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type ChoiceCollectionRow = {
  id: string;
  curator_name: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  published_at: string | null;
  aipoger_creator_choice_items?: ChoiceItemRow[] | null;
};

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  return /aipoger_creator_choice|schema cache|relation.*does not exist|PGRST204|42P01/i.test(text);
}

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function resolveCollection(row: ChoiceCollectionRow, catalog: AipogerChoiceCatalogItem[]): AipogerCreatorChoiceCollection {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    curatorName: row.curator_name?.trim() || "AIPOGER 創作者",
    publishedAt: row.published_at ?? null,
    items: (row.aipoger_creator_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        return source?.isPublic ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) } : null;
      })
      .filter((item): item is AipogerCreatorChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "找不到這份 Choice。" }, { status: 404 });
    const admin = adminClient();
    const { data, error } = await admin
      .from("aipoger_creator_choice_collections")
      .select("id,curator_name,week_start,title,intro,published_at,aipoger_creator_choice_items(id,source_kind,source_id,position)")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "這份 Choice 尚未發布或已撤回。" }, { status: 404 });

    const catalog = await loadChoiceSelectionCatalog(admin);
    if (!catalog.schemaReady) return NextResponse.json({ error: "Choice 選歌資料尚未準備完成。" }, { status: 409 });
    return NextResponse.json({ collection: resolveCollection(data as ChoiceCollectionRow, catalog.items) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingCreatorChoiceSchema(error)) return NextResponse.json({ error: "Creator Choice 尚未啟用。" }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choice 暫時無法讀取。" }, { status: 500 });
  }
}
