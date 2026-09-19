import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  AIPOGER_CHOICE_CURATOR_IDENTITIES,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
  type AipogerChoiceCuratorIdentity,
} from "@/lib/aipoger-choice";
import { loadChoiceSelectionCatalog } from "@/lib/server-choice-catalog";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

type CollectionKind = "official" | "creator";
type ChoiceItemRow = { id: string; source_kind: string; source_id: string; position: number };
type OfficialRow = {
  id: string;
  created_by: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  curator_identity: string | null;
  cover_path: string | null;
  aipoger_choice_items?: ChoiceItemRow[] | null;
};
type CreatorRow = {
  id: string;
  creator_id: string;
  curator_name: string | null;
  week_start: string;
  title: string | null;
  intro: string | null;
  cover_path: string | null;
  published_at: string | null;
  aipoger_creator_choice_items?: ChoiceItemRow[] | null;
};
type ProfileRow = { display_name?: string | null; avatar_url?: string | null };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingChoiceSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|relation.*does not exist|column.*does not exist|PGRST204|42P01/i.test(text);
}

function isMissingChoiceCover(error: unknown) {
  const text = error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
  return /cover_path.*does not exist|column.*cover_path/i.test(text);
}

function key(kind: string, id: string) {
  return `${kind}:${id}`;
}

function publicCoverUrl(admin: ReturnType<typeof adminClient>, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return "";
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(clean).data.publicUrl || "";
}

function identity(value: string | null): AipogerChoiceCuratorIdentity {
  return AIPOGER_CHOICE_CURATOR_IDENTITIES.includes(value as AipogerChoiceCuratorIdentity)
    ? value as AipogerChoiceCuratorIdentity
    : "official";
}

function resolveItems(rows: ChoiceItemRow[] | null | undefined, catalog: AipogerChoiceCatalogItem[]) {
  const byKey = new Map(catalog.map((item) => [key(item.sourceKind, item.id), item]));
  return (rows ?? [])
    .map((item) => {
      const source = byKey.get(key(item.source_kind, item.source_id));
      return source?.isPublic
        ? { ...source, itemId: item.id, position: Math.max(1, Math.round(item.position)) }
        : null;
    })
    .filter((item): item is AipogerChoiceCollection["items"][number] => Boolean(item))
    .sort((a, b) => a.position - b.position);
}

function resolveOfficial(admin: ReturnType<typeof adminClient>, row: OfficialRow, catalog: AipogerChoiceCatalogItem[], profile: ProfileRow | null): AipogerChoiceCollection {
  const curatorIdentity = identity(row.curator_identity);
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    curatorIdentity,
    curatorName: curatorIdentity === "personal" ? profile?.display_name?.trim() || "愛波哥" : "AIPOGER",
    avatarUrl: curatorIdentity === "personal" ? profile?.avatar_url?.trim() || "" : "",
    coverUrl: publicCoverUrl(admin, row.cover_path),
    items: resolveItems(row.aipoger_choice_items, catalog),
  };
}

function resolveCreator(admin: ReturnType<typeof adminClient>, row: CreatorRow, catalog: AipogerChoiceCatalogItem[], profile: ProfileRow | null): AipogerChoiceCollection {
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title?.trim() ?? "",
    intro: row.intro?.trim() ?? "",
    isPublished: true,
    curatorIdentity: "personal",
    curatorName: row.curator_name?.trim() || profile?.display_name?.trim() || "AIPOGER 創作者",
    avatarUrl: profile?.avatar_url?.trim() || "",
    coverUrl: publicCoverUrl(admin, row.cover_path),
    items: resolveItems(row.aipoger_creator_choice_items, catalog),
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const kind: CollectionKind = request.nextUrl.searchParams.get("kind") === "official" ? "official" : "creator";
    if (!isUuid(id)) return NextResponse.json({ error: "找不到這份 Choice。" }, { status: 404 });
    const admin = adminClient();
    const catalog = await loadChoiceSelectionCatalog(admin);
    if (!catalog.schemaReady) return NextResponse.json({ error: "Showtime 資料尚未準備完成。" }, { status: 409 });

    if (kind === "official") {
      let { data, error } = await admin
        .from("aipoger_choice_collections")
        .select("id,created_by,week_start,title,intro,curator_identity,cover_path,aipoger_choice_items(id,source_kind,source_id,position)")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      if (error && isMissingChoiceCover(error)) {
        const fallback = await admin
          .from("aipoger_choice_collections")
          .select("id,created_by,week_start,title,intro,curator_identity,aipoger_choice_items(id,source_kind,source_id,position)")
          .eq("id", id)
          .eq("is_published", true)
          .maybeSingle();
        data = fallback.data ? { ...fallback.data, cover_path: null } : null;
        error = fallback.error;
      }
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "這份 Choice 尚未發布或已撤回。" }, { status: 404 });
      const profile = (data.created_by
        ? (await admin.from("fighter_profiles").select("display_name,avatar_url").eq("id", data.created_by).maybeSingle()).data
        : null) as ProfileRow | null;
      return NextResponse.json({ kind, collection: resolveOfficial(admin, data as OfficialRow, catalog.items, profile) }, { headers: { "Cache-Control": "no-store" } });
    }

    let { data, error } = await admin
      .from("aipoger_creator_choice_collections")
      .select("id,creator_id,curator_name,week_start,title,intro,cover_path,published_at,aipoger_creator_choice_items(id,source_kind,source_id,position)")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (error && isMissingChoiceCover(error)) {
      const fallback = await admin
        .from("aipoger_creator_choice_collections")
        .select("id,creator_id,curator_name,week_start,title,intro,published_at,aipoger_creator_choice_items(id,source_kind,source_id,position)")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      data = fallback.data ? { ...fallback.data, cover_path: null } : null;
      error = fallback.error;
    }
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "這份 Choice 尚未發布或已撤回。" }, { status: 404 });
    const [fighter, user] = await Promise.all([
      admin.from("fighter_profiles").select("display_name,avatar_url").eq("id", data.creator_id).maybeSingle(),
      admin.from("user_profiles").select("avatar_url").eq("id", data.creator_id).maybeSingle(),
    ]);
    const profile = {
      display_name: fighter.data?.display_name ?? null,
      avatar_url: fighter.data?.avatar_url ?? user.data?.avatar_url ?? null,
    };
    return NextResponse.json({ kind, collection: resolveCreator(admin, data as CreatorRow, catalog.items, profile) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceSchema(error)) return NextResponse.json({ error: "Choice 尚未啟用。" }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choice 暫時無法讀取。" }, { status: 500 });
  }
}
