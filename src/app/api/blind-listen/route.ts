import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { blindCatalog, nextBlindQuestion, questionForUser, revealBlindQuestion } from "@/lib/server-blind-listening";
import { isBlindChoice } from "@/lib/blind-listening";
const headers = { "Cache-Control": "private, no-store" };
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function GET(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    const question = await nextBlindQuestion(auth.admin, auth.user.id);
    return NextResponse.json({ question }, { headers });
  } catch { return NextResponse.json({ error: "LOAD_FAILED" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    const p = await request.json();
    if (!uuid(p.questionId)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
    const q = await questionForUser(auth.admin, auth.user.id, p.questionId);
    if (p.action === "reveal") return NextResponse.json(await revealBlindQuestion(auth.admin, auth.user.id, q.id), { headers });
    if (p.action === "skip") {
      const { error } = await auth.admin.from("blind_listen_questions").update({ state: "skipped", active_side: null }).eq("id", q.id).eq("user_id", auth.user.id).eq("state", "pending");
      if (error) throw new Error("SAVE_FAILED");
      return NextResponse.json({ skipped: true }, { headers });
    }
    if (p.action === "tick") {
      if ((p.side !== "A" && p.side !== "B") || !["play", "progress", "pause"].includes(p.event)
        || typeof p.position !== "number" || !Number.isFinite(p.position) || p.position < 15 || p.position > 45)
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
      const { data, error } = await auth.admin.rpc("tick_blind_question", { p_user: auth.user.id, p_question: q.id, p_side: p.side, p_event: p.event, p_position: p.position });
      if (error) return NextResponse.json({ error: "LISTENING_UNAVAILABLE" }, { status: 409, headers });
      return NextResponse.json(data, { headers });
    }
    if (p.action === "vote" && isBlindChoice(p.choice)) {
      if (q.state !== "voted") {
        const catalog = await blindCatalog(auth.admin, auth.user.id, [q.track_a_id, q.track_b_id]);
        if (Date.parse(q.expires_at) <= Date.now() || !catalog.some(r => r.id === q.track_a_id) || !catalog.some(r => r.id === q.track_b_id))
          return NextResponse.json({ error: "WORK_UNAVAILABLE" }, { status: 409, headers });
      }
      const { data, error } = await auth.admin.rpc("complete_blind_question", { p_user: auth.user.id, p_question: q.id, p_choice: p.choice });
      if (error) return NextResponse.json({ error: error.message.includes("Listen to") ? "LISTEN_FIRST" : "SAVE_FAILED" }, { status: 409, headers });
      // Completion is already committed. A failed next-pair read must never look
      // like a failed vote, or prompt the user to choose/earn again.
      try {
        return NextResponse.json({ ...data, nextQuestion: await nextBlindQuestion(auth.admin, auth.user.id), nextError: false }, { headers });
      } catch {
        return NextResponse.json({ ...data, nextQuestion: null, nextError: true }, { headers });
      }
    }
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  } catch { return NextResponse.json({ error: "SAVE_FAILED" }, { status: 503, headers }); }
}
