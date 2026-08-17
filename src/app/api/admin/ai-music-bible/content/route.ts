import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  bibleCatalogDefaults,
  findBibleItem,
  mergeBibleCatalog,
  sanitizeBiblePayload,
  type BibleContentKind,
  type BibleOverrideRow,
} from "@/lib/ai-music-bible-content";

export const runtime = "nodejs";

const TABLE = "ai_music_bible_content_overrides";
const KINDS = new Set<BibleContentKind>(["prompt_move", "lyric_move", "taiwanese_entry"]);

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

function errorText(error: unknown) {
  return error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
}

function missingTable(error: unknown) {
  return new RegExp(TABLE, "i").test(errorText(error)) || /relation.*does not exist|PGRST205|42P01/i.test(errorText(error));
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    return [request.nextUrl.origin, siteOrigin, "https://aipoger.com", "https://www.aipoger.com"].includes(origin);
  } catch {
    return false;
  }
}

async function requireOwner(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: NextResponse.json({ error: "請先登入。" }, { status: 401 }) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "登入狀態已過期。" }, { status: 401 }) };
  if (!isAdminEmail(data.user.email)) return { error: NextResponse.json({ error: "沒有後台權限。" }, { status: 403 }) };
  return { admin, userId: data.user.id };
}

function baseItems() {
  const catalog = bibleCatalogDefaults();
  return [
    ...catalog.promptMoves.map((item) => ({ kind: "prompt_move" as const, key: item.key, item })),
    ...catalog.lyricMoves.map((item) => ({ kind: "lyric_move" as const, key: item.key, item })),
    ...catalog.taiwaneseEntries.map((item) => ({ kind: "taiwanese_entry" as const, key: item.key, item })),
  ];
}

async function readRows(admin: ReturnType<typeof adminClient>) {
  const result = await admin.from(TABLE).select("content_kind,content_key,payload,updated_by,updated_at");
  if (result.error && !missingTable(result.error)) throw result.error;
  return {
    schemaReady: !result.error,
    rows: result.error ? [] : (result.data ?? []) as unknown as BibleOverrideRow[],
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwner(request);
    if (guard.error) return guard.error;
    const { admin } = guard;
    const { rows, schemaReady } = await readRows(admin);
    const overrides = new Map(rows.map((row) => [`${row.content_kind}:${row.content_key}`, row]));
    const catalog = mergeBibleCatalog(rows);
    const currentItem = (kind: BibleContentKind, key: string) => kind === "prompt_move"
      ? catalog.promptMoves.find((item) => item.key === key)
      : kind === "lyric_move"
        ? catalog.lyricMoves.find((item) => item.key === key)
        : catalog.taiwaneseEntries.find((item) => item.key === key);
    const items = baseItems().map(({ kind, key }) => {
      const row = overrides.get(`${kind}:${key}`);
      return { kind, key, item: currentItem(kind, key), hasOverride: Boolean(row), payload: row?.payload ?? null, updatedAt: row?.updated_at ?? null };
    });
    return NextResponse.json({ schemaReady, items, catalog }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin/ai-music-bible/content] GET failed", error);
    return NextResponse.json({ error: "聖經內容讀取失敗。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "來源驗證失敗。" }, { status: 403 });
    const guard = await requireOwner(request);
    if (guard.error) return guard.error;
    const { admin, userId } = guard;
    const body = await request.json().catch(() => null) as { action?: string; kind?: string; key?: string; payload?: unknown } | null;
    const kind = body?.kind as BibleContentKind;
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    if (!KINDS.has(kind) || !key || !findBibleItem(kind, key)) return NextResponse.json({ error: "找不到可編輯的聖經條目。" }, { status: 400 });

    if (body?.action === "reset") {
      const result = await admin.from(TABLE).delete().eq("content_kind", kind).eq("content_key", key);
      if (result.error) {
        if (missingTable(result.error)) return NextResponse.json({ error: "資料表尚未部署，請先套用最新 Supabase migration。" }, { status: 503 });
        throw result.error;
      }
      return NextResponse.json({ ok: true, reset: true });
    }

    const payload = sanitizeBiblePayload(body?.payload);
    if (!payload) return NextResponse.json({ error: "請至少填寫一個內容欄位。" }, { status: 400 });
    const result = await admin.from(TABLE).upsert({ content_kind: kind, content_key: key, payload, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "content_kind,content_key" }).select("content_kind,content_key,payload,updated_by,updated_at").single();
    if (result.error) {
      if (missingTable(result.error)) return NextResponse.json({ error: "資料表尚未部署，請先套用最新 Supabase migration。" }, { status: 503 });
      throw result.error;
    }
    return NextResponse.json({ ok: true, row: result.data });
  } catch (error) {
    console.error("[admin/ai-music-bible/content] PATCH failed", error);
    return NextResponse.json({ error: "聖經內容儲存失敗。" }, { status: 500 });
  }
}
