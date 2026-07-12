import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem, AipogerChoiceCollection } from "@/lib/aipoger-choice";
import { loadShowtimeAdminCatalog } from "@/lib/server-showtime-catalog";

type ChoiceItemRow = {
  id: string;
  source_kind: string;
  source_id: string;
  position: number;
};

type ChoiceCollectionRow = {
  id: string;
  week_start: string;
  title: string | null;
  intro: string | null;
  aipoger_choice_items?: ChoiceItemRow[] | null;
};

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
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
  return /aipoger_choice|schema cache|relation.*does not exist|PGRST204|42P01/i.test(text);
}

function catalogKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function resolveCollection(row: ChoiceCollectionRow, catalog: AipogerChoiceCatalogItem[]): AipogerChoiceCollection {
  const byKey = new Map(catalog.map((item) => [catalogKey(item.sourceKind, item.id), item]));
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    items: (row.aipoger_choice_items ?? [])
      .map((item) => {
        const source = byKey.get(catalogKey(item.source_kind, item.source_id));
        return source?.selectable ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) } : null;
      })
      .filter((item): item is AipogerChoiceCollection["items"][number] => Boolean(item))
      .sort((a, b) => a.position - b.position),
  };
}

export async function GET() {
  try {
    const admin = adminClient();
    const { data, error } = await admin
      .from("aipoger_choice_collections")
      .select("id,week_start,title,intro,aipoger_choice_items(id,source_kind,source_id,position)")
      .eq("is_published", true)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ schemaReady: true, collection: null }, { headers: { "Cache-Control": "no-store" } });

    const catalog = await loadShowtimeAdminCatalog(admin);
    if (!catalog.schemaReady) return NextResponse.json({ schemaReady: false, collection: null });
    return NextResponse.json({
      schemaReady: true,
      collection: resolveCollection(data as ChoiceCollectionRow, catalog.items),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return NextResponse.json({ schemaReady: false, collection: null });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choice 暫時無法讀取。" }, { status: 500 });
  }
}
