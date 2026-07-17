import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  bibleCatalogDefaults,
  mergeBibleCatalog,
  type BibleOverrideRow,
} from "@/lib/ai-music-bible-content";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function tokenFromRequest(request: NextRequest) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

function missingTable(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /ai_music_bible_content_overrides|relation.*does not exist|PGRST205|42P01/i.test(text);
}

export async function GET(request: NextRequest) {
  try {
    const token = tokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    const admin = serviceClient();
    const { data, error: authError } = await admin.auth.getUser(token);
    if (authError || !data.user) return NextResponse.json({ error: "登入狀態已過期。" }, { status: 401 });

    const result = await admin
      .from("ai_music_bible_content_overrides")
      .select("content_kind,content_key,payload,updated_by,updated_at");
    if (result.error && !missingTable(result.error)) throw result.error;
    const rows = result.error ? [] : (result.data ?? []) as unknown as BibleOverrideRow[];
    return NextResponse.json({
      schemaReady: !result.error,
      ...mergeBibleCatalog(rows),
      defaultsAvailable: Boolean(bibleCatalogDefaults()),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[ai-music-bible/content] GET failed", error);
    return NextResponse.json({ error: "聖經內容暫時讀取失敗。" }, { status: 500 });
  }
}
