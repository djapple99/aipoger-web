import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { mergeBibleCatalog, type BibleOverrideRow } from "@/lib/ai-music-bible-content";
import { SUNO_EXPRESSION_MOVES } from "@/lib/suno-expression-prompts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.requestId !== "string" || !uuid.test(body.requestId)
      || !SUNO_EXPRESSION_MOVES.some(item => item.key === body.key)
      || !["zh", "en"].includes(body.locale)) {
      return NextResponse.json({ error: "INVALID_COPY" }, { status: 400, headers });
    }
    const overrides = await auth.admin.from("ai_music_bible_content_overrides")
      .select("content_kind,content_key,payload,updated_by,updated_at")
      .eq("content_kind", "prompt_move").eq("content_key", body.key);
    if (overrides.error) throw overrides.error;
    const item = mergeBibleCatalog((overrides.data ?? []) as BibleOverrideRow[]).promptMoves.find(item => item.key === body.key);
    if (!item) throw new Error("COPY_UNAVAILABLE");
    const { data, error } = await auth.admin.rpc("bible_expression_copy", {
      p_user: auth.user.id, p_receipt: body.requestId, p_key: body.key, p_locale: body.locale,
      p_text: item.copy[body.locale as "zh" | "en"],
      // Old tabs advertised 5 Credit. Paid receipts still retry, but new copies
      // must acknowledge the current price before the database can charge them.
      p_expected_cost: Number.isInteger(body.expectedCost) ? body.expectedCost : 5,
    });
    if (error) throw error;
    if (data?.error) return NextResponse.json(data, { status: data.error === "INSUFFICIENT_CREDIT" ? 402 : 409, headers });
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: "COPY_UNAVAILABLE" }, { status: 503, headers });
  }
}
