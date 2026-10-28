import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { type BibleOverrideRow } from "@/lib/ai-music-bible-content";
import { resolveBibleFormalPrompt, bibleFormalPromptText } from "@/lib/bible-formal-prompts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    const body = await request.json().catch(() => null);
    const entry = resolveBibleFormalPrompt(body?.key);
    if (!body || typeof body.requestId !== "string" || !uuid.test(body.requestId)
      || !entry
      || !["zh", "en"].includes(body.locale)) {
      return NextResponse.json({ error: "INVALID_COPY" }, { status: 400, headers });
    }
    let rows: BibleOverrideRow[] = [];
    if (entry.kind === "prompt_move" || entry.kind === "lyric_move") {
      const overrides = await auth.admin.from("ai_music_bible_content_overrides")
        .select("content_kind,content_key,payload,updated_by,updated_at")
        .eq("content_kind", entry.kind).eq("content_key", entry.sourceKey);
      if (overrides.error) throw overrides.error;
      rows = (overrides.data ?? []) as BibleOverrideRow[];
    }
    const text = bibleFormalPromptText(entry, body.locale, rows);
    if (!text) throw new Error("COPY_UNAVAILABLE");
    const { data, error } = await auth.admin.rpc("bible_prompt_copy", {
      p_user: auth.user.id, p_receipt: body.requestId, p_key: entry.key, p_locale: body.locale,
      p_text: text,
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
